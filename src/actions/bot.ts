"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const DEFAULT_WELCOME = "¡Hola! Bienvenido al soporte técnico de Aitue Cominca S.A. ¿En qué podemos ayudarte hoy?\n\n1. Contratar Nuevo Servicio\n2. Soporte Técnico / Reportar Falla\n3. Estado de mi cuenta / Facturación";
const DEFAULT_SUPPORT = "Entendido. Tu solicitud ha sido derivada a un operador de guardia en el Laboratorio Técnico. Por favor aguarda un instante.";
const DEFAULT_OUT_HOURS = "Nuestro horario de atención administrativa es de Lunes a Viernes de 9 a 18 hs. Para emergencias satelitales corporativas, por favor presione 9.";

export async function getBotConfig() {
  try {
    let config = await prisma.botConfig.findUnique({
      where: { id: "global" },
    });

    if (!config) {
      config = await prisma.botConfig.create({
        data: {
          id: "global",
          activo: true,
          mensajeBienvenida: DEFAULT_WELCOME,
          mensajeSoporte: DEFAULT_SUPPORT,
          mensajeFueraHorario: DEFAULT_OUT_HOURS,
          apiUrl: "",
          apiToken: "",
          webhookSecret: "",
          aiModel: "meta/llama-3.1-8b-instruct",
          openaiApiKey: "",
          temperature: 0.7,
          systemPrompt: "Eres AITUE AI, el asistente virtual inteligente de Aitue Cominca S.A. Atiendes consultas comerciales, técnicas y de facturación.",
          operadoresEstado: "DISPONIBLES"
        },
      });
    }

    return { success: true, config };
  } catch (error: any) {
    console.error("Error getting bot config:", error);
    return { success: false, error: "Error al obtener la configuración del bot." };
  }
}

export async function saveBotConfig(data: {
  activo: boolean;
  mensajeBienvenida: string;
  mensajeSoporte: string;
  mensajeFueraHorario: string;
  apiUrl?: string;
  apiToken?: string;
  webhookSecret?: string;
  aiModel?: string;
  openaiApiKey?: string;
  temperature?: number;
  systemPrompt?: string;
  operadoresEstado?: string;
}) {
  try {
    const config = await prisma.botConfig.upsert({
      where: { id: "global" },
      update: {
        activo: data.activo,
        mensajeBienvenida: data.mensajeBienvenida,
        mensajeSoporte: data.mensajeSoporte,
        mensajeFueraHorario: data.mensajeFueraHorario,
        apiUrl: data.apiUrl || null,
        apiToken: data.apiToken || null,
        webhookSecret: data.webhookSecret || null,
        aiModel: data.aiModel || "meta/llama-3.1-8b-instruct",
        openaiApiKey: data.openaiApiKey || null,
        temperature: data.temperature ?? 0.7,
        systemPrompt: data.systemPrompt || null,
        operadoresEstado: data.operadoresEstado || "DISPONIBLES",
      },
      create: {
        id: "global",
        activo: data.activo,
        mensajeBienvenida: data.mensajeBienvenida,
        mensajeSoporte: data.mensajeSoporte,
        mensajeFueraHorario: data.mensajeFueraHorario,
        apiUrl: data.apiUrl || null,
        apiToken: data.apiToken || null,
        webhookSecret: data.webhookSecret || null,
        aiModel: data.aiModel || "meta/llama-3.1-8b-instruct",
        openaiApiKey: data.openaiApiKey || null,
        temperature: data.temperature ?? 0.7,
        systemPrompt: data.systemPrompt || null,
        operadoresEstado: data.operadoresEstado || "DISPONIBLES",
      },
    });

    revalidatePath("/bot");
    return { success: true, config };
  } catch (error: any) {
    console.error("Error saving bot config:", error);
    return { success: false, error: "Error al guardar la configuración del bot." };
  }
}

export async function getKnowledgeItems() {
  try {
    const items = await prisma.botKnowledge.findMany({
      orderBy: { createdAt: "desc" }
    });
    return { success: true, items };
  } catch (error: any) {
    console.error("Error getting knowledge items:", error);
    return { success: false, items: [], error: "Error al obtener pautas RAG." };
  }
}

export async function saveKnowledgeItem(data: {
  id?: string;
  titulo: string;
  categoria: string;
  contenido: string;
}) {
  try {
    let item;
    if (data.id) {
      item = await prisma.botKnowledge.update({
        where: { id: data.id },
        data: {
          titulo: data.titulo,
          categoria: data.categoria,
          contenido: data.contenido
        }
      });
    } else {
      item = await prisma.botKnowledge.create({
        data: {
          titulo: data.titulo,
          categoria: data.categoria,
          contenido: data.contenido
        }
      });
    }
    revalidatePath("/bot");
    return { success: true, item };
  } catch (error: any) {
    console.error("Error saving knowledge item:", error);
    return { success: false, error: "Error al guardar la pauta RAG." };
  }
}

export async function deleteKnowledgeItem(id: string) {
  try {
    await prisma.botKnowledge.delete({
      where: { id }
    });
    revalidatePath("/bot");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting knowledge item:", error);
    return { success: false, error: "Error al eliminar la pauta RAG." };
  }
}

export async function clearAllKnowledgeItems() {
  try {
    await prisma.botKnowledge.deleteMany();
    revalidatePath("/bot");
    return { success: true };
  } catch (error: any) {
    console.error("Error clearing knowledge items:", error);
    return { success: false, error: "Error al vaciar la base de conocimiento." };
  }
}

export async function importChatGPTFile(data: {
  fileBase64: string;
  fileName: string;
  categoria?: string;
}) {
  try {
    const base64Content = data.fileBase64.replace(/^data:.*?;base64,/, "");
    const decodedText = Buffer.from(base64Content, "base64").toString("utf-8");
    const category = data.categoria || "CHATGPT_EXPORT";
    let createdCount = 0;

    // 1. Intentar parsear como JSON (Formato nativo de exportación de ChatGPT OpenAI)
    if (data.fileName.toLowerCase().endsWith(".json") || decodedText.trim().startsWith("[") || decodedText.trim().startsWith("{")) {
      try {
        const jsonData = JSON.parse(decodedText);
        const conversations = Array.isArray(jsonData) ? jsonData : [jsonData];

        for (const conv of conversations) {
          const title = conv.title || conv.name || `Conversación ChatGPT ${Date.now()}`;
          let messagesText = "";

          // Formato estándar de exportación de OpenAI ChatGPT: conv.mapping
          if (conv.mapping && typeof conv.mapping === "object") {
            const nodes = Object.values(conv.mapping) as any[];
            for (const node of nodes) {
              const msg = node.message;
              if (msg && msg.content && msg.content.parts) {
                const role = msg.author?.role === "user" ? "Usuario" : "ChatGPT";
                const text = msg.content.parts.filter((p: any) => typeof p === "string").join("\n");
                if (text.trim()) {
                  messagesText += `${role}: ${text.trim()}\n`;
                }
              }
            }
          } else if (Array.isArray(conv.messages)) {
            // Formato estructurado simple de lista de mensajes
            for (const msg of conv.messages) {
              const role = msg.role || msg.sender || "Participante";
              const text = msg.content || msg.text || "";
              if (text) {
                messagesText += `${role}: ${text.trim()}\n`;
              }
            }
          } else if (typeof conv === "object") {
            messagesText = JSON.stringify(conv, null, 2);
          }

          if (messagesText.trim()) {
            // Recortar si supera 3000 caracteres para evitar saturación de prompt por ítem
            const truncatedText = messagesText.length > 3000 ? messagesText.slice(0, 3000) + "...\n(Contenido resumido)" : messagesText;
            await prisma.botKnowledge.create({
              data: {
                titulo: title.slice(0, 100),
                categoria: category,
                contenido: truncatedText
              }
            });
            createdCount++;
          }
        }
      } catch (jsonErr) {
        // Fallback a texto si falla el parseo de JSON
        console.warn("Fallo el parseo JSON, procesando como texto plano:", jsonErr);
        await prisma.botKnowledge.create({
          data: {
            titulo: `Documento ${data.fileName}`,
            categoria: category,
            contenido: decodedText.slice(0, 3500)
          }
        });
        createdCount = 1;
      }
    } else {
      // 2. Procesar como texto plano / Markdown / CSV
      const blocks = decodedText.split(/\n\s*\n/).filter(b => b.trim().length > 20);

      if (blocks.length > 1 && blocks.length <= 15) {
        for (let i = 0; i < blocks.length; i++) {
          const block = blocks[i].trim();
          await prisma.botKnowledge.create({
            data: {
              titulo: `${data.fileName} (Sección ${i + 1})`,
              categoria: category,
              contenido: block.slice(0, 3000)
            }
          });
          createdCount++;
        }
      } else {
        await prisma.botKnowledge.create({
          data: {
            titulo: data.fileName,
            categoria: category,
            contenido: decodedText.slice(0, 3500)
          }
        });
        createdCount = 1;
      }
    }

    revalidatePath("/bot");
    return { success: true, count: createdCount };
  } catch (error: any) {
    console.error("Error importing ChatGPT file:", error);
    return { success: false, error: error.message || "Error al procesar e integrar el archivo." };
  }
}

export async function getWhatsAppMessages() {
  try {
    const messages = await prisma.whatsAppMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return { success: true, messages };
  } catch (error: any) {
    console.error("Error getting WhatsApp messages:", error);
    return { success: false, messages: [], error: "Error al obtener mensajes de WhatsApp." };
  }
}

export async function syncExternalWhatsAppApi() {
  try {
    const config = await prisma.botConfig.findUnique({
      where: { id: "global" }
    });

    if (!config || !config.apiUrl) {
      return { success: false, error: "No se ha configurado la URL de la API externa de WhatsApp." };
    }

    const headers: Record<string, string> = {
      "Accept": "application/json",
    };

    if (config.apiToken) {
      headers["Authorization"] = `Bearer ${config.apiToken}`;
    }

    const response = await fetch(config.apiUrl, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (!response.ok) {
      const errText = await response.text();
      return { success: false, error: `Error HTTP ${response.status} de la API externa: ${errText}` };
    }

    const data = await response.json();
    const rawMessages = Array.isArray(data) ? data : (data.messages || data.data || []);

    let importedCount = 0;
    for (const msg of rawMessages) {
      const remitente = msg.remitente || msg.from || msg.phone || msg.numero || "Desconocido";
      const nombre = msg.nombre || msg.contactName || msg.name || null;
      const contenido = msg.contenido || msg.text || msg.body || msg.mensaje || "";
      const mensajeId = msg.id || msg.mensajeId || msg.message_id || null;

      if (!contenido) continue;

      // Upsert o create mensaje
      await prisma.whatsAppMessage.create({
        data: {
          mensajeId: mensajeId ? String(mensajeId) : null,
          remitente: String(remitente),
          nombre: nombre ? String(nombre) : null,
          contenido: String(contenido),
          direccion: msg.direccion || (msg.isIncoming ? "ENTRANTE" : "SALIENTE"),
          estado: msg.estado || "RECIBIDO",
        }
      });
      importedCount++;
    }

    revalidatePath("/bot");
    return { success: true, count: importedCount };
  } catch (error: any) {
    console.error("Error syncing external WhatsApp API:", error);
    return { success: false, error: error.message || "Error al conectar con la API externa de WhatsApp." };
  }
}
