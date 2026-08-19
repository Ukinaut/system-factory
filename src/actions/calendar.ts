"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("sessionToken")?.value;
  if (!token) return null;
  try {
    const decodedStr = Buffer.from(token, "base64").toString("utf-8");
    return JSON.parse(decodedStr);
  } catch {
    return null;
  }
}

export async function getCalendarEvents() {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Usuario no autenticado." };
    }

    const events = await prisma.calendarEvent.findMany({
      where: {
        OR: [
          { scope: "GLOBAL" },
          { scope: "INDIVIDUAL", userId: session.id }
        ]
      },
      include: {
        client: true,
        user: {
          select: {
            nombre: true
          }
        }
      },
      orderBy: {
        start: "asc"
      }
    });

    return { success: true, events };
  } catch (error: any) {
    console.error("Error fetching calendar events:", error);
    return { success: false, error: "Error al obtener eventos de calendario." };
  }
}

export async function createCalendarEvent(data: {
  title: string;
  description?: string;
  start: Date;
  end?: Date;
  type: string; // ACTIVIDAD, REUNION, ALERTA_CONTRATO, CAMBIO_SERVICIO
  scope: string; // INDIVIDUAL, GLOBAL
  clientId?: string;
}) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Usuario no autenticado." };
    }

    const event = await prisma.calendarEvent.create({
      data: {
        title: data.title,
        description: data.description || null,
        start: data.start,
        end: data.end || null,
        type: data.type,
        scope: data.scope,
        userId: session.id,
        clientId: data.clientId || null
      }
    });

    revalidatePath("/calendario");
    return { success: true, event };
  } catch (error: any) {
    console.error("Error creating calendar event:", error);
    return { success: false, error: "Error al crear evento de calendario." };
  }
}

export async function deleteCalendarEvent(id: string) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Usuario no autenticado." };
    }

    // El evento debe ser global o pertenecer al usuario
    const event = await prisma.calendarEvent.findUnique({
      where: { id }
    });

    if (!event) {
      return { success: false, error: "Evento no encontrado." };
    }

    if (event.userId !== session.id) {
      return { success: false, error: "No tiene permisos para eliminar este evento." };
    }

    await prisma.calendarEvent.delete({
      where: { id }
    });

    revalidatePath("/calendario");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting calendar event:", error);
    return { success: false, error: "Error al eliminar evento de calendario." };
  }
}
