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
      },
    });

    revalidatePath("/bot");
    return { success: true, config };
  } catch (error: any) {
    console.error("Error saving bot config:", error);
    return { success: false, error: "Error al guardar la configuración del bot." };
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
