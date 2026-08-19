"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

export async function getClients() {
  try {
    const cookieStore = await cookies();
    const selectedCountry = cookieStore.get("selectedCountry")?.value || "AR";

    const whereCondition: any = { parentId: null };

    if (selectedCountry) {
      whereCondition.OR = [
        { countryCode: selectedCountry },
        selectedCountry === "AR" ? { pais: "Argentina" } : undefined,
      ].filter(Boolean);
    }

    const clients = await prisma.client.findMany({
      where: whereCondition,
      include: {
        equipos: true,
        services: true,
        subClients: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    // Calcular las métricas agregadas requeridas para la UI
    const formattedClients = clients.map(client => {
      const equiposActivos = client.equipos.filter(e => e.estado === "Activo").length;
      
      // Sumar los gigas de los equipos
      let gigasTotales = 0;
      let gigasUsados = 0;

      client.equipos.forEach(e => {
        gigasTotales += e.gigasAsignados || 0;
        gigasUsados += e.gigasConsumidos || 0;
      });

      return {
        id: client.id,
        razonSocial: client.razonSocial,
        cuit: client.cuit,
        tipoIdentificacion: client.tipoIdentificacion || "CUIT",
        condicionIva: client.condicionIva || "",
        telefono: client.telefono || "",
        correo: client.correo || "",
        emailsAdicionales: client.emailsAdicionales || "",
        pais: client.pais || "Argentina",
        countryCode: client.countryCode || "AR",
        provincia: client.provincia || "",
        localidad: client.localidad || "",
        codigoPostal: client.codigoPostal || "",
        direccion: client.direccion || "",
        codigoCliente: client.codigoCliente || "",
        cuentaContable: client.cuentaContable || "",
        origen: client.origen || "",
        gastoTotal: client.gastoTotal || 0,
        pedidosCount: client.pedidosCount || 0,
        activo: client.activo,
        prioridad: client.prioridad,
        equiposActivos,
        gigasTotales,
        gigasUsados,
        subClients: client.subClients || []
      };
    });

    return { success: true, clients: formattedClients };
  } catch (error) {
    console.error("Error fetching clients:", error);
    return { success: false, clients: [], error: "Error de servidor al obtener clientes." };
  }
}

export async function createClient(data: {
  razonSocial: string;
  cuit: string;
  telefono?: string;
  correo?: string;
  direccion?: string;
  parentId?: string;
  countryCode?: string;
}) {
  try {
    const cookieStore = await cookies();
    const activeCountry = data.countryCode || cookieStore.get("selectedCountry")?.value || "AR";
    const countryNameMap: Record<string, string> = {
      AR: "Argentina",
      ES: "España",
      CO: "Colombia",
    };

    // Si es cliente principal (parentId es nulo), validar que el CUIT no esté registrado ya en la misma región
    if (!data.parentId) {
      const existing = await prisma.client.findFirst({
        where: { cuit: data.cuit, parentId: null, countryCode: activeCountry }
      });
      if (existing) {
        return { success: false, error: "El CUIT ya se encuentra registrado para una empresa principal en esta región." };
      }
    }

    const client = await prisma.client.create({
      data: {
        razonSocial: data.razonSocial,
        cuit: data.cuit,
        telefono: data.telefono || null,
        correo: data.correo || null,
        direccion: data.direccion || null,
        parentId: data.parentId || null,
        countryCode: activeCountry,
        pais: countryNameMap[activeCountry] || "Argentina",
      }
    });
    revalidatePath("/clientes");
    if (data.parentId) {
      revalidatePath(`/clientes/${data.parentId}`);
    }
    return { success: true, client };
  } catch (error: any) {
    console.error("Error creating client:", error);
    return { success: false, error: "Error de servidor al crear el cliente." };
  }
}

export async function deleteClient(id: string) {
  try {
    // 1. Encontrar todas las ventas del cliente para eliminar sus facturas y pagos
    const sales = await prisma.sale.findMany({
      where: { clientId: id },
      select: { id: true }
    });
    const saleIds = sales.map(s => s.id);

    // 2. Encontrar facturas para eliminar pagos
    const invoices = await prisma.invoice.findMany({
      where: { saleId: { in: saleIds } },
      select: { id: true }
    });
    const invoiceIds = invoices.map(i => i.id);

    await prisma.$transaction([
      // Eliminar pagos asociados a las facturas
      prisma.payment.deleteMany({
        where: { invoiceId: { in: invoiceIds } }
      }),
      // Eliminar facturas asociadas a las ventas
      prisma.invoice.deleteMany({
        where: { saleId: { in: saleIds } }
      }),
      // Eliminar envíos asociados a las ventas
      prisma.shipping.deleteMany({
        where: { saleId: { in: saleIds } }
      }),
      // Eliminar las ventas asociadas (las SaleDetail se borran en cascada según el schema)
      prisma.sale.deleteMany({
        where: { clientId: id }
      }),
      // Eliminar presupuestos del cliente
      prisma.quote.deleteMany({
        where: { clientId: id }
      }),
      // Eliminar reclamos del cliente
      prisma.claim.deleteMany({
        where: { clientId: id }
      }),
      // Eliminar servicios asignados
      prisma.service.deleteMany({
        where: { clientId: id }
      }),
      // Eliminar equipos asociados (la tabla EquipoCliente usa clienteId)
      prisma.equipoCliente.deleteMany({
        where: { clienteId: id }
      }),
      // Finalmente, eliminar el cliente
      prisma.client.delete({
        where: { id }
      })
    ]);

    revalidatePath("/clientes");
    return { success: true };
  } catch (error) {
    console.error("Error deleting client:", error);
    return { success: false, error: "Error de servidor al eliminar el cliente." };
  }
}

export async function getClientById(id: string) {
  try {
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        equipos: true,
        services: true,
        parent: true,
        subClients: {
          include: {
            equipos: true,
            services: true,
            sales: {
              include: {
                details: {
                  include: {
                    producto: true
                  }
                },
                invoices: true
              }
            }
          }
        },
        sales: {
          include: {
            details: {
              include: {
                producto: true
              }
            },
            invoices: true
          },
          orderBy: {
            createdAt: "desc"
          }
        },
        events: {
          orderBy: {
            fecha: "desc"
          }
        }
      }
    });

    if (!client) {
      return { success: false, error: "Cliente no encontrado." };
    }

    return { success: true, client };
  } catch (error) {
    console.error("Error fetching client by id:", error);
    return { success: false, error: "Error de servidor al obtener detalles del cliente." };
  }
}

export async function updateClient(
  id: string,
  data: {
    razonSocial: string;
    cuit: string;
    telefono?: string;
    correo?: string;
    direccion?: string;
  }
) {
  try {
    const client = await prisma.client.update({
      where: { id },
      data: {
        razonSocial: data.razonSocial,
        cuit: data.cuit,
        telefono: data.telefono || null,
        correo: data.correo || null,
        direccion: data.direccion || null
      }
    });
    revalidatePath(`/clientes/${id}`);
    revalidatePath("/clientes");
    return { success: true, client };
  } catch (error: any) {
    console.error("Error updating client:", error);
    return { success: false, error: error.message || "Error al actualizar el cliente." };
  }
}

export async function getClientHistory() {
  try {
    const [clients, sales, quotes, invoices, payments] = await Promise.all([
      prisma.client.findMany({
        orderBy: { createdAt: "desc" }
      }),
      prisma.sale.findMany({
        include: { client: true },
        orderBy: { createdAt: "desc" }
      }),
      prisma.quote.findMany({
        include: { client: true },
        orderBy: { createdAt: "desc" }
      }),
      prisma.invoice.findMany({
        include: { sale: { include: { client: true } } },
        orderBy: { fecha: "desc" }
      }),
      prisma.payment.findMany({
        include: { invoice: { include: { sale: { include: { client: true } } } } },
        orderBy: { fechaPago: "desc" }
      })
    ]);

    const history: any[] = [];

    // Client creations
    clients.forEach(c => {
      history.push({
        id: `client-${c.id}`,
        tipo: "CLIENTE_CREADO",
        fecha: c.createdAt,
        clienteNombre: c.razonSocial,
        clienteCuit: c.cuit,
        descripcion: `Registrado nuevo cliente: ${c.razonSocial}`
      });
    });

    // Sales
    sales.forEach(s => {
      history.push({
        id: `sale-${s.id}`,
        tipo: "COMPRA",
        fecha: s.createdAt,
        clienteNombre: s.client?.razonSocial || "Desconocido",
        clienteCuit: s.client?.cuit || "N/A",
        descripcion: `Registrada venta de tipo ${s.tipo} (${s.numeroOrden})`,
        monto: s.total,
        moneda: s.moneda || "ARS"
      });
    });

    // Quotes
    quotes.forEach(q => {
      history.push({
        id: `quote-${q.id}`,
        tipo: "PRESUPUESTO",
        fecha: q.createdAt,
        clienteNombre: q.client?.razonSocial || "Desconocido",
        clienteCuit: q.client?.cuit || "N/A",
        descripcion: `Generado presupuesto de tipo ${q.tipo} (${q.numeroOrden})`,
        monto: q.total,
        moneda: q.moneda || "ARS"
      });
    });

    // Invoices
    invoices.forEach(i => {
      history.push({
        id: `invoice-${i.id}`,
        tipo: "FACTURA",
        fecha: i.fecha,
        clienteNombre: i.sale?.client?.razonSocial || "Desconocido",
        clienteCuit: i.sale?.client?.cuit || "N/A",
        descripcion: `Emitida factura para la orden ${i.sale?.numeroOrden || ""}`,
        monto: i.sale?.total || 0,
        moneda: i.sale?.moneda || "ARS"
      });
    });

    // Payments
    payments.forEach(p => {
      const sale = p.invoice?.sale;
      history.push({
        id: `payment-${p.id}`,
        tipo: "PAGO",
        fecha: p.fechaPago,
        clienteNombre: sale?.client?.razonSocial || "Desconocido",
        clienteCuit: sale?.client?.cuit || "N/A",
        descripcion: `Cobrado pago para la orden ${sale?.numeroOrden || ""}`,
        monto: sale?.total || 0,
        moneda: sale?.moneda || "ARS"
      });
    });

    // Sort by date descending
    history.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    return { success: true, history };
  } catch (error) {
    console.error("Error fetching client history:", error);
    return { success: false, history: [], error: "Error de servidor al obtener historial." };
  }
}

export async function importXubioClients(clientId: string, secretId: string) {
  try {
    console.log("Iniciando importación desde Xubio para clientId:", clientId);

    let token = "";
    const basicAuth = Buffer.from(`${clientId}:${secretId}`).toString("base64");
    
    // Probar con Basic Auth
    let tokenRes = await fetch("https://xubio.com/API/1.1/TokenEndpoint", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials"
    });

    if (tokenRes.ok) {
      const data = await tokenRes.json();
      token = data.access_token;
    } else {
      // Probar con parámetros directos
      const params = new URLSearchParams();
      params.append("grant_type", "client_credentials");
      params.append("CLIENT_ID", clientId);
      params.append("SECRET_ID", secretId);

      const tokenRes2 = await fetch("https://xubio.com/API/1.1/TokenEndpoint", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: params.toString()
      });

      if (!tokenRes2.ok) {
        const errText2 = await tokenRes2.text();
        return { success: false, error: `Autenticación fallida en Xubio: ${errText2}` };
      }
      const data2 = await tokenRes2.json();
      token = data2.access_token;
    }

    if (!token) {
      return { success: false, error: "No se pudo obtener el token de acceso de Xubio." };
    }

    // Consultar el endpoint de clienteBean
    const clientesRes = await fetch("https://xubio.com/API/1.1/clienteBean", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json"
      }
    });

    if (!clientesRes.ok) {
      const errText = await clientesRes.text();
      return { success: false, error: `Error al obtener clientes desde Xubio: ${errText}` };
    }

    const xubioClients = await clientesRes.json();
    if (!Array.isArray(xubioClients)) {
      return { success: false, error: "La API de Xubio no devolvió una lista válida de clientes." };
    }

    let count = 0;
    for (const xc of xubioClients) {
      const razonSocial = xc.nombre || xc.razonSocial || xc.nombreCompleto || "Cliente Xubio";
      const cuit = xc.cuit || xc.nroIdentificacion || xc.identificacion || xc.nroDoc || xc.cuitCuil || "";
      
      if (!cuit) continue;

      const telefono = xc.telefono || xc.tel || "";
      const correo = xc.email || xc.mail || xc.correo || "";
      const direccion = xc.direccion || xc.domicilio || "";

      // Upsert client by CUIT
      const existing = await prisma.client.findFirst({
        where: { cuit }
      });

      if (existing) {
        await prisma.client.update({
          where: { id: existing.id },
          data: {
            razonSocial,
            telefono: telefono || null,
            correo: correo || null,
            direccion: direccion || null
          }
        });
      } else {
        await prisma.client.create({
          data: {
            razonSocial,
            cuit,
            telefono: telefono || null,
            correo: correo || null,
            direccion: direccion || null
          }
        });
      }
      count++;
    }

    revalidatePath("/clientes");
    return { success: true, count };
  } catch (error: any) {
    console.error("Error importing from Xubio:", error);
    return { success: false, error: error.message || "Error inesperado al conectar con Xubio." };
  }
}

export async function createClientEvent(
  clientId: string,
  data: {
    fecha: string | Date;
    tipo: string;
    observaciones: string;
    adjuntoBase64?: string;
    adjuntoNombre?: string;
  }
) {
  try {
    let adjuntoUrl: string | null = null;
    let adjuntoNombre: string | null = null;

    if (data.adjuntoBase64 && data.adjuntoNombre) {
      const fs = require("fs");
      const path = require("path");

      const parts = data.adjuntoBase64.split(";base64,");
      const base64Data = parts[1] || parts[0];
      
      // Obtener extensión del archivo
      const ext = path.extname(data.adjuntoNombre) || ".bin";
      const cleanFileName = `evento-${clientId}-${Date.now()}${ext}`;
      const uploadDir = path.join(process.cwd(), "public", "uploads");

      // Asegurar que exista el directorio de subidas
      fs.mkdirSync(uploadDir, { recursive: true });

      const filePath = path.join(uploadDir, cleanFileName);
      fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));

      adjuntoUrl = `/uploads/${cleanFileName}`;
      adjuntoNombre = data.adjuntoNombre;
    }

    const event = await prisma.clientEvent.create({
      data: {
        clientId,
        fecha: new Date(data.fecha),
        tipo: data.tipo,
        observaciones: data.observaciones,
        adjuntoUrl,
        adjuntoNombre,
      },
    });

    revalidatePath(`/clientes/${clientId}`);
    return { success: true, event };
  } catch (error: any) {
    console.error("Error creating client event:", error);
    return { success: false, error: error.message || "Error al registrar el evento." };
  }
}

export async function deleteClientEvent(eventId: string, clientId: string) {
  try {
    const event = await prisma.clientEvent.findUnique({
      where: { id: eventId }
    });

    if (event && event.adjuntoUrl) {
      const fs = require("fs");
      const path = require("path");
      const filePath = path.join(process.cwd(), "public", event.adjuntoUrl);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (unlinkError) {
          console.error("Error deleting physical attachment:", unlinkError);
        }
      }
    }

    await prisma.clientEvent.delete({
      where: { id: eventId }
    });

    revalidatePath(`/clientes/${clientId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting client event:", error);
    return { success: false, error: error.message || "Error al eliminar el evento." };
  }
}

export async function updateClientEvent(
  eventId: string,
  clientId: string,
  data: {
    fecha: string | Date;
    tipo: string;
    observaciones: string;
    adjuntoBase64?: string;
    adjuntoNombre?: string;
    eliminarAdjunto?: boolean;
  }
) {
  try {
    const existing = await prisma.clientEvent.findUnique({
      where: { id: eventId }
    });

    if (!existing) {
      return { success: false, error: "Evento no encontrado." };
    }

    let adjuntoUrl = existing.adjuntoUrl;
    let adjuntoNombre = existing.adjuntoNombre;

    if (data.eliminarAdjunto || (data.adjuntoBase64 && data.adjuntoNombre)) {
      if (existing.adjuntoUrl) {
        const fs = require("fs");
        const path = require("path");
        const filePath = path.join(process.cwd(), "public", existing.adjuntoUrl);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (err) {
            console.error("Error deleting old file:", err);
          }
        }
      }
      adjuntoUrl = null;
      adjuntoNombre = null;
    }

    if (data.adjuntoBase64 && data.adjuntoNombre) {
      const fs = require("fs");
      const path = require("path");

      const parts = data.adjuntoBase64.split(";base64,");
      const base64Data = parts[1] || parts[0];
      
      const ext = path.extname(data.adjuntoNombre) || ".bin";
      const cleanFileName = `evento-${clientId}-${Date.now()}${ext}`;
      const uploadDir = path.join(process.cwd(), "public", "uploads");

      fs.mkdirSync(uploadDir, { recursive: true });

      const filePath = path.join(uploadDir, cleanFileName);
      fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));

      adjuntoUrl = `/uploads/${cleanFileName}`;
      adjuntoNombre = data.adjuntoNombre;
    }

    const updatedEvent = await prisma.clientEvent.update({
      where: { id: eventId },
      data: {
        fecha: new Date(data.fecha),
        tipo: data.tipo,
        observaciones: data.observaciones,
        adjuntoUrl,
        adjuntoNombre,
      }
    });

    revalidatePath(`/clientes/${clientId}`);
    return { success: true, event: updatedEvent };
  } catch (error: any) {
    console.error("Error updating client event:", error);
    return { success: false, error: error.message || "Error al actualizar el evento." };
  }
}

export async function updateClientPriority(clientId: string, prioridad: string) {
  try {
    const client = await prisma.client.update({
      where: { id: clientId },
      data: {
        prioridad
      }
    });

    revalidatePath("/clientes");
    revalidatePath(`/clientes/${clientId}`);
    return { success: true, client };
  } catch (error: any) {
    console.error("Error updating client priority:", error);
    return { success: false, error: error.message || "Error al actualizar la prioridad del cliente." };
  }
}


