"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import OpenAI from "openai";

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("sessionToken")?.value;
  if (!token) return null;
  try {
    const decodedStr = Buffer.from(token, "base64").toString("utf-8");
    const session = JSON.parse(decodedStr);
    const liveUser = await prisma.user.findUnique({
      where: { id: session.id },
      include: { permissions: true }
    });
    if (liveUser) {
      session.rol = liveUser.rol;
      session.nombre = liveUser.nombre;
      session.correo = liveUser.correo;
      session.permissions = liveUser.permissions.map(p => p.areaPermitida);
    }
    return session;
  } catch {
    return null;
  }
}

function getOpenAIClass(imported: any): any {
  if (typeof imported === "function") return imported;
  if (imported && typeof imported.OpenAI === "function") return imported.OpenAI;
  if (imported && typeof imported.default === "function") return imported.default;
  if (imported && imported.default && typeof imported.default.OpenAI === "function") return imported.default.OpenAI;
  return imported;
}

async function getOpenAIClient() {
  let apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    const config = await prisma.botConfig.findFirst();
    if (config?.openaiApiKey) {
      apiKey = config.openaiApiKey;
    }
  }

  if (!apiKey) {
    return { openai: null, error: "API Key de OpenAI no configurada. Agregue OPENAI_API_KEY en .env o configure la clave en la sección BotConfig." };
  }

  try {
    const TargetClass = getOpenAIClass(OpenAI);
    const client = new TargetClass({ apiKey });

    if (!client || !client.chat || !client.chat.completions || typeof client.chat.completions.create !== "function") {
      console.error("OpenAI Client initialization failed. Resolved target class:", TargetClass);
      return { openai: null, error: "Error al instanciar el cliente de OpenAI. Verifique las dependencias." };
    }

    return { openai: client, error: null };
  } catch (err: any) {
    console.error("Error creating OpenAI client:", err);
    return { openai: null, error: `Error al inicializar cliente OpenAI: ${err.message}` };
  }
}

// Determinar áreas permitidas para el usuario según su ROL y PERMISOS
function getUserAllowedAreas(session: any): { isFullAdmin: boolean; allowedAreas: string[] } {
  const rol = (session.rol || "").toUpperCase();
  const permissions: string[] = session.permissions || [];

  if (rol === "ADMIN" || rol === "SUPERVISOR") {
    return {
      isFullAdmin: true,
      allowedAreas: ["VENTAS", "FACTURACION", "COBRANZAS", "STOCK", "LOGISTICA", "RECLAMOS", "CLIENTES", "ADMIN"]
    };
  }

  const areas = new Set<string>();

  // Permisos por Rol
  if (rol === "VENTAS") {
    areas.add("VENTAS");
    areas.add("CLIENTES");
    areas.add("RECLAMOS");
  } else if (rol === "TECNICO" || rol === "OPERATOR") {
    areas.add("RECLAMOS");
    areas.add("CLIENTES");
    areas.add("STOCK");
  } else if (rol === "COBRANZAS" || rol === "FACTURACION") {
    areas.add("FACTURACION");
    areas.add("COBRANZAS");
    areas.add("VENTAS");
    areas.add("CLIENTES");
  } else if (rol === "STOCK" || rol === "DESPACHOS") {
    areas.add("STOCK");
    areas.add("LOGISTICA");
  }

  // Permisos explícitos asignados individualmente
  permissions.forEach(p => areas.add(p.toUpperCase()));

  return {
    isFullAdmin: false,
    allowedAreas: Array.from(areas)
  };
}

// Definición de Herramientas (Function Calling) para OpenAI
const AI_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_clients",
      description: "Busca clientes registrados en el sistema por CUIT o Razón Social. Retorna datos de contacto, equipos satelitales asignados y consumos.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "CUIT o Razón social a buscar" }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_sales_list",
      description: "Consulta ordenes de venta y presupuestos recientes.",
      parameters: {
        type: "object",
        properties: {
          estado: { type: "string", description: "Estado opcional: PENDIENTE, FACTURADO, ENVIADO" },
          query: { type: "string", description: "Filtro opcional por cliente o número de orden" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "check_inventory",
      description: "Consulta el stock de productos, materias primas y repuestos en el inventario físico.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Nombre o SKU del artículo" },
          categoria: { type: "string", description: "Categoría opcional: Producto Final, Materia Prima, Repuestos" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "adjust_product_stock",
      description: "Realiza una entrada o salida manual de stock para un producto con motivo justificado.",
      parameters: {
        type: "object",
        properties: {
          productId: { type: "string", description: "ID del producto a modificar" },
          tipo: { type: "string", enum: ["Entrada", "Salida"], description: "Tipo de movimiento" },
          cantidad: { type: "number", description: "Cantidad a ajustar" },
          justificacion: { type: "string", description: "Motivo del ajuste" }
        },
        required: ["productId", "tipo", "cantidad", "justificacion"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "check_invoices_and_cobranzas",
      description: "Consulta facturas emitidas, saldos pendientes y estado de cobranzas de clientes.",
      parameters: {
        type: "object",
        properties: {
          cuitCliente: { type: "string", description: "CUIT del cliente opcional" },
          estadoCobro: { type: "string", description: "PENDIENTE, PARCIAL, PAGADO" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "check_shippings_status",
      description: "Consulta el estado de despachos y envíos de kits de hardware.",
      parameters: {
        type: "object",
        properties: {
          estado: { type: "string", description: "PARA_EMPACAR, DESPACHADO, ENTREGADO" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "check_technical_claims",
      description: "Consulta tickets de reclamos e incidentes de soporte o RMA.",
      parameters: {
        type: "object",
        properties: {
          prioridad: { type: "string", description: "URGENTE, MEDIO, LEVE" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_technical_claim",
      description: "Registra un nuevo reclamo técnico / soporte para un cliente.",
      parameters: {
        type: "object",
        properties: {
          clientId: { type: "string", description: "ID del cliente" },
          prioridad: { type: "string", enum: ["URGENTE", "MEDIO", "LEVE"], description: "Prioridad del incidente" },
          observacion: { type: "string", description: "Detalle de la falla reportada" },
          tipo: { type: "string", description: "ARTICULO, SERVICIO, EQUIPO" }
        },
        required: ["clientId", "prioridad", "observacion"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_system_audit_summary",
      description: "Solo Administradores: Consulta las últimas acciones de auditoría del personal.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Cantidad de registros a obtener (default: 10)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_users_list",
      description: "Solo Administradores: Consulta el directorio completo de usuarios, roles y datos de contacto.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_purchases_list",
      description: "Consulta el historial de solicitudes de compra, insumos y facturas asociadas.",
      parameters: {
        type: "object",
        properties: {
          estado: { type: "string", description: "Estado opcional: PENDIENTE, APROBADA, RECHAZADA, PROCESADA" }
        }
      }
    }
  }
];

// Ejecutor de Herramientas validando Permisos de Usuario
async function executeToolWithPermissions(
  toolName: string,
  args: any,
  session: any,
  allowedAreasInfo: { isFullAdmin: boolean; allowedAreas: string[] }
) {
  const { isFullAdmin, allowedAreas } = allowedAreasInfo;

  const checkPerm = (requiredArea: string) => {
    if (isFullAdmin) return true;
    return allowedAreas.includes(requiredArea.toUpperCase());
  };

  try {
    switch (toolName) {
      case "search_clients": {
        if (!checkPerm("CLIENTES") && !checkPerm("VENTAS") && !checkPerm("RECLAMOS")) {
          return { error: "Acceso Denegado: Tu usuario no posee permisos para consultar la sección de Clientes." };
        }
        const clients = await prisma.client.findMany({
          where: {
            OR: [
              { razonSocial: { contains: args.query } },
              { cuit: { contains: args.query } }
            ]
          },
          include: {
            equipos: true
          },
          take: 5
        });
        return { count: clients.length, clients };
      }

      case "get_sales_list": {
        if (!checkPerm("VENTAS") && !checkPerm("FACTURACION")) {
          return { error: "Acceso Denegado: Tu usuario no posee permisos para ver Ventas." };
        }
        const where: any = {};
        if (args.estado) where.estado = args.estado;
        if (args.query) {
          where.OR = [
            { numeroOrden: { contains: args.query } },
            { client: { razonSocial: { contains: args.query } } }
          ];
        }
        const sales = await prisma.sale.findMany({
          where,
          include: {
            client: { select: { razonSocial: true, cuit: true } },
            details: { include: { producto: true } }
          },
          orderBy: { createdAt: "desc" },
          take: 10
        });
        return { count: sales.length, sales };
      }

      case "check_inventory": {
        if (!checkPerm("STOCK") && !checkPerm("VENTAS") && !checkPerm("LOGISTICA")) {
          return { error: "Acceso Denegado: Tu usuario no posee permisos para consultar Inventario/Stock." };
        }
        const where: any = {};
        if (args.query) {
          where.nombre = { contains: args.query };
        }
        const products = await prisma.product.findMany({
          where,
          take: 15
        });
        return { count: products.length, products };
      }

      case "adjust_product_stock": {
        if (!checkPerm("STOCK")) {
          return { error: "Acceso Denegado: Se requiere permiso del área de STOCK o Administración para modificar cantidades de inventario." };
        }
        const { adjustProductStock } = await import("@/actions/products");
        const res = await adjustProductStock({
          id: args.productId,
          tipo: args.tipo,
          cantidad: args.cantidad,
          justificacion: args.justificacion,
          usuario: `${session.nombre} (vía Asistente IA)`
        });
        return res;
      }

      case "check_invoices_and_cobranzas": {
        if (!checkPerm("FACTURACION") && !checkPerm("COBRANZAS")) {
          return { error: "Acceso Denegado: Tu usuario no posee permisos para acceder al módulo de Facturación y Cobranzas." };
        }
        const where: any = {};
        if (args.estadoCobro) where.estadoCobro = args.estadoCobro;
        if (args.cuitCliente) {
          where.sale = { client: { cuit: { contains: args.cuitCliente } } };
        }
        const invoices = await prisma.invoice.findMany({
          where,
          include: {
            sale: { include: { client: { select: { razonSocial: true, cuit: true } } } },
            payments: true
          },
          take: 10,
          orderBy: { fecha: "desc" }
        });
        return { count: invoices.length, invoices };
      }

      case "check_shippings_status": {
        if (!checkPerm("LOGISTICA") && !checkPerm("DESPACHOS") && !checkPerm("VENTAS")) {
          return { error: "Acceso Denegado: Tu usuario no posee permisos para revisar Logística y Despachos." };
        }
        const where: any = {};
        if (args.estado) where.estado = args.estado;
        const shippings = await prisma.shipping.findMany({
          where,
          include: {
            sale: { include: { client: { select: { razonSocial: true } } } }
          },
          take: 10
        });
        return { count: shippings.length, shippings };
      }

      case "check_technical_claims": {
        if (!checkPerm("RECLAMOS") && !checkPerm("TECNICO")) {
          return { error: "Acceso Denegado: Tu usuario no posee permisos para ver el historial de Reclamos y Soporte." };
        }
        const where: any = {};
        if (args.prioridad) where.prioridad = args.prioridad;
        const claims = await prisma.claim.findMany({
          where,
          include: {
            client: { select: { razonSocial: true, cuit: true } }
          },
          take: 10,
          orderBy: { fecha: "desc" }
        });
        return { count: claims.length, claims };
      }

      case "create_technical_claim": {
        if (!checkPerm("RECLAMOS") && !checkPerm("VENTAS") && !checkPerm("TECNICO")) {
          return { error: "Acceso Denegado: No cuentas con autorización para registrar Reclamos." };
        }
        const claim = await prisma.claim.create({
          data: {
            clientId: args.clientId,
            prioridad: args.prioridad,
            observacion: `${args.observacion} (Registrado vía Asistente IA por ${session.nombre})`,
            tipo: args.tipo || "ARTICULO",
            estado: "Ingresado"
          }
        });
        return { success: true, claim };
      }

      case "get_system_audit_summary": {
        if (!isFullAdmin) {
          return { error: "Acceso Denegado: El historial de Auditoría de Sistema está reservado exclusivamente para Administradores." };
        }
        const logs = await prisma.auditLog.findMany({
          include: { user: { select: { nombre: true, rol: true } } },
          orderBy: { fechaHora: "desc" },
          take: args.limit || 10
        });
        return { count: logs.length, logs };
      }

      case "get_users_list": {
        if (!isFullAdmin && !checkPerm("ADMIN")) {
          return { error: "Acceso Denegado: El directorio de usuarios está reservado para Administradores." };
        }
        const users = await prisma.user.findMany({
          select: {
            id: true,
            nombre: true,
            correo: true,
            rol: true,
            telefono: true,
            cargo: true,
            createdAt: true,
            permissions: { select: { areaPermitida: true } }
          },
          orderBy: { nombre: "asc" }
        });
        return { count: users.length, users };
      }

      case "get_purchases_list": {
        if (!checkPerm("STOCK") && !checkPerm("ADMIN") && !checkPerm("VENTAS") && !isFullAdmin) {
          return { error: "Acceso Denegado: Tu usuario no posee permisos para consultar Compras." };
        }
        const where: any = {};
        if (args.estado) where.estado = args.estado;
        const requests = await prisma.purchaseRequest.findMany({
          where,
          include: {
            user: { select: { nombre: true, rol: true } }
          },
          orderBy: { createdAt: "desc" },
          take: 15
        });
        return { count: requests.length, requests };
      }

      default:
        return { error: `Herramienta desconocida: ${toolName}` };
    }
  } catch (err: any) {
    console.error(`Error executing tool ${toolName}:`, err);
    return { error: `Error durante la ejecución de ${toolName}: ${err.message}` };
  }
}

// 1. Obtener lista de conversaciones del usuario conectado
export async function getUserAiConversations() {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: "Usuario no autenticado." };

    const conversations = await prisma.aiConversation.findMany({
      where: { userId: session.id },
      include: {
        _count: { select: { messages: true } }
      },
      orderBy: { updatedAt: "desc" }
    });

    return { success: true, conversations };
  } catch (error: any) {
    console.error("Error fetching AI conversations:", error);
    return { success: false, error: "Error al obtener conversaciones." };
  }
}

// 2. Obtener mensajes de una conversación
export async function getAiConversationMessages(conversationId: string) {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: "Usuario no autenticado." };

    const conversation = await prisma.aiConversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" }
        }
      }
    });

    if (!conversation) {
      return { success: false, error: "Conversación no encontrada." };
    }

    // Permitir ver solo si es dueño o Administrador
    if (conversation.userId !== session.id && session.rol !== "ADMIN") {
      return { success: false, error: "No tienes permiso para ver esta conversación." };
    }

    return { success: true, conversation, messages: conversation.messages };
  } catch (error: any) {
    console.error("Error fetching conversation messages:", error);
    return { success: false, error: "Error al obtener mensajes." };
  }
}

// 3. Crear nueva conversación
export async function createAiConversation(title?: string) {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: "Usuario no autenticado." };

    const conversation = await prisma.aiConversation.create({
      data: {
        userId: session.id,
        title: title || "Nueva Consulta"
      }
    });

    return { success: true, conversation };
  } catch (error: any) {
    console.error("Error creating AI conversation:", error);
    return { success: false, error: "Error al crear la conversación." };
  }
}

// 4. Eliminar conversación del usuario
export async function deleteAiConversation(conversationId: string) {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: "Usuario no autenticado." };

    const conversation = await prisma.aiConversation.findUnique({
      where: { id: conversationId }
    });

    if (!conversation) return { success: false, error: "Conversación no encontrada." };

    if (conversation.userId !== session.id && session.rol !== "ADMIN") {
      return { success: false, error: "No autorizado." };
    }

    await prisma.aiConversation.delete({ where: { id: conversationId } });
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting conversation:", error);
    return { success: false, error: "Error al eliminar conversación." };
  }
}

// 4.b Limpiar todas las conversaciones del usuario (o todas si es Admin)
export async function clearAllUserAiConversations() {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: "Usuario no autenticado." };

    const where = session.rol === "ADMIN" ? {} : { userId: session.id };
    
    const userConvs = await prisma.aiConversation.findMany({
      where,
      select: { id: true }
    });

    const convIds = userConvs.map(c => c.id);

    if (convIds.length > 0) {
      await prisma.aiMessage.deleteMany({
        where: { conversationId: { in: convIds } }
      });

      await prisma.aiConversation.deleteMany({
        where: { id: { in: convIds } }
      });
    }

    revalidatePath("/admin");
    return { success: true };
  } catch (error: any) {
    console.error("Error clearing conversations:", error);
    return { success: false, error: "Error al limpiar el historial del chat." };
  }
}

// 5. Enviar mensaje a la IA y procesar respuesta con Function Calling y RBAC
export async function sendAiMessage(data: { conversationId?: string; prompt: string }) {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: "Usuario no autenticado." };

    const { openai, error: apiError } = await getOpenAIClient();
    if (!openai || apiError) {
      return { success: false, error: apiError || "Error al inicializar cliente OpenAI." };
    }

    // Obtener o crear conversación
    let conversationId = data.conversationId;
    if (!conversationId) {
      const newConv = await prisma.aiConversation.create({
        data: {
          userId: session.id,
          title: data.prompt.slice(0, 35) + (data.prompt.length > 35 ? "..." : "")
        }
      });
      conversationId = newConv.id;
    } else {
      // Verificar pertenencia
      const conv = await prisma.aiConversation.findUnique({ where: { id: conversationId } });
      if (!conv || (conv.userId !== session.id && session.rol !== "ADMIN")) {
        return { success: false, error: "Conversación no válida." };
      }
    }

    // Guardar mensaje del usuario
    await prisma.aiMessage.create({
      data: {
        conversationId,
        sender: "user",
        content: data.prompt
      }
    });

    // Obtener historial previo de la conversación
    const history = await prisma.aiMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      take: 20
    });

    // Determinar permisos y contexto del usuario
    const allowedInfo = getUserAllowedAreas(session);

    // Obtener base de conocimiento RAG (pautas e historiales importados de ChatGPT)
    let ragContext = "";
    try {
      const knowledgeItems = await prisma.botKnowledge.findMany({
        orderBy: { createdAt: "desc" },
        take: 15
      });
      if (knowledgeItems.length > 0) {
        ragContext = `\n\nCONOCIMIENTO ADICIONAL Y PAUTAS RAG (ARCHIVOS Y CONVERSACIONES DE CHATGPT APRENDIDAS):\n` +
          knowledgeItems.map(k => `- [Categoría: ${k.categoria}] **${k.titulo}**: ${k.contenido}`).join("\n");
      }
    } catch (err) {
      console.warn("No se pudo cargar la base de conocimiento RAG:", err);
    }

    const userContextPrompt = `
Eres Aitue AI, el asistente operativo inteligente de la empresa Aitue Cominca S.A. (proveedora de soluciones satelitales y telecomunicaciones).
Tu objetivo es ayudar al usuario a responder preguntas corporativas, consultar datos del sistema y ejecutar acciones automáticas de forma eficiente y profesional.

INFORMACIÓN DEL USUARIO CONECTADO:
- Nombre: ${session.nombre}
- Correo: ${session.correo}
- Rol Principal: ${session.rol}
- Áreas Permitidas: ${allowedInfo.allowedAreas.join(", ")}
- Es Administrador Total: ${allowedInfo.isFullAdmin ? "SÍ" : "NO"}

REGLAS DE SEGURIDAD Y PERMISOS DE USUARIO (MANDATORIO):
1. ACCESO TOTAL PARA EL ADMINISTRADOR: El usuario Administrador (Rol: ${session.rol}, Administrador Total: ${allowedInfo.isFullAdmin ? "SÍ" : "NO"}) TIENE PERMISOS ABSOLUTOS Y TOTALES para pedirle y ejecutar cualquier acción, consulta, modificación, informe o gestión en el sistema. Debes responder y ejecutar todas sus solicitudes sin restricciones.
2. RESTRICCIÓN DE SEGURIDAD PARA OTROS ROLES: Si el usuario NO es Administrador, solamente puedes consultar o ejecutar acciones en las áreas asignadas explicitamente (${allowedInfo.allowedAreas.join(", ")}). Si un usuario sin rol Administrador solicita información o acciones fuera de sus áreas permitidas, deniega la solicitud cortésmente.
3. FORMATO DE RESPUESTA: Formatea tus respuestas en formato Markdown claro, profesional y estructurado con viñetas, negritas y tablas cuando corresponda.
4. USO DE HERRAMIENTAS: Si utilizas herramientas (Function Calling), explica de manera clara y directa el resultado o la acción ejecutada.
${ragContext}
`;

    // Armar mensajes para la API de OpenAI
    const openAiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: userContextPrompt }
    ];

    history.forEach(msg => {
      if (msg.sender === "user") {
        openAiMessages.push({ role: "user", content: msg.content });
      } else if (msg.sender === "assistant") {
        openAiMessages.push({ role: "assistant", content: msg.content });
      }
    });

    // Obtener modelo configurado (default: gpt-5.6-terra con fallback automático si no existe en la API)
    const config = await prisma.botConfig.findFirst();
    let selectedModel = process.env.OPENAI_MODEL || config?.aiModel || "gpt-5.6-terra";

    let completion;
    try {
      // Primera llamada a OpenAI
      completion = await openai.chat.completions.create({
        model: selectedModel,
        messages: openAiMessages,
        tools: AI_TOOLS,
        tool_choice: "auto"
      });
    } catch (modelErr: any) {
      console.warn(`Modelo ${selectedModel} no disponible o no compatible (${modelErr.message}), usando fallback a gpt-4o-mini.`);
      selectedModel = "gpt-4o-mini";
      completion = await openai.chat.completions.create({
        model: selectedModel,
        messages: openAiMessages,
        tools: AI_TOOLS,
        tool_choice: "auto"
      });
    }

    const firstChoice = completion.choices[0].message;
    let toolCallsExecuted: any[] = [];
    let finalAssistantReply = firstChoice.content || "";

    // Si la IA decide llamar a herramientas (Function Calling)
    if (firstChoice.tool_calls && firstChoice.tool_calls.length > 0) {
      openAiMessages.push(firstChoice);

      for (const toolCall of firstChoice.tool_calls) {
        const fnName = toolCall.function.name;
        let fnArgs = {};
        try {
          fnArgs = JSON.parse(toolCall.function.arguments);
        } catch {}

        // Ejecutar herramienta validando permisos
        const toolResult = await executeToolWithPermissions(fnName, fnArgs, session, allowedInfo);
        
        toolCallsExecuted.push({
          toolName: fnName,
          args: fnArgs,
          result: toolResult
        });

        openAiMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult)
        });
      }

      // Segunda llamada a OpenAI para sintetizar la respuesta con los datos obtenidos
      let secondCompletion;
      try {
        secondCompletion = await openai.chat.completions.create({
          model: selectedModel,
          messages: openAiMessages
        });
      } catch {
        secondCompletion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: openAiMessages
        });
      }

      finalAssistantReply = secondCompletion.choices[0].message.content || "Se completó la consulta de datos.";
    }

    // Guardar respuesta del asistente en DB
    await prisma.aiMessage.create({
      data: {
        conversationId,
        sender: "assistant",
        content: finalAssistantReply,
        toolCalls: toolCallsExecuted.length > 0 ? JSON.stringify(toolCallsExecuted) : null
      }
    });

    // Actualizar fecha de modificación de la conversación
    await prisma.aiConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() }
    });

    revalidatePath("/admin");
    return {
      success: true,
      conversationId,
      reply: finalAssistantReply,
      toolCallsExecuted
    };
  } catch (error: any) {
    console.error("Error in sendAiMessage:", error);
    return { success: false, error: error.message || "Error al comunicarse con la IA." };
  }
}

// 6. Obtener todas las conversaciones de todos los usuarios para la pestaña "Asistentes" en el Panel de Administrador
export async function getAllAiConversationsForAdmin(searchQuery?: string, filterUserId?: string) {
  try {
    const session = await getSession();
    if (!session || (session.rol !== "ADMIN" && session.rol !== "SUPERVISOR")) {
      return { success: false, error: "No autorizado. Solo administradores pueden ver el historial general de asistentes." };
    }

    const where: any = {};
    if (filterUserId && filterUserId !== "ALL") {
      where.userId = filterUserId;
    }
    if (searchQuery) {
      where.OR = [
        { title: { contains: searchQuery } },
        { user: { nombre: { contains: searchQuery } } },
        { user: { correo: { contains: searchQuery } } }
      ];
    }

    const conversations = await prisma.aiConversation.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            nombre: true,
            correo: true,
            rol: true,
            fotoUrl: true
          }
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1
        },
        _count: { select: { messages: true } }
      },
      orderBy: { updatedAt: "desc" }
    });

    // Estadísticas generales para el admin
    const [totalConversations, totalMessages, usersWithAi] = await Promise.all([
      prisma.aiConversation.count(),
      prisma.aiMessage.count(),
      prisma.aiConversation.groupBy({
        by: ["userId"]
      })
    ]);

    return {
      success: true,
      conversations,
      stats: {
        totalConversations,
        totalMessages,
        activeUsersCount: usersWithAi.length
      }
    };
  } catch (error: any) {
    console.error("Error fetching admin AI conversations:", error);
    return { success: false, error: "Error al obtener conversaciones globales." };
  }
}
