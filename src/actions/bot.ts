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
}) {
  try {
    const config = await prisma.botConfig.upsert({
      where: { id: "global" },
      update: {
        activo: data.activo,
        mensajeBienvenida: data.mensajeBienvenida,
        mensajeSoporte: data.mensajeSoporte,
        mensajeFueraHorario: data.mensajeFueraHorario,
      },
      create: {
        id: "global",
        activo: data.activo,
        mensajeBienvenida: data.mensajeBienvenida,
        mensajeSoporte: data.mensajeSoporte,
        mensajeFueraHorario: data.mensajeFueraHorario,
      },
    });

    revalidatePath("/bot");
    return { success: true, config };
  } catch (error: any) {
    console.error("Error saving bot config:", error);
    return { success: false, error: "Error al guardar la configuración del bot." };
  }
}
