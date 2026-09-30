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

    // 1. Fetch user & global manual events
    const manualEvents = await prisma.calendarEvent.findMany({
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

    // 2. Fetch automatic system events (Client billing days & Foreign orders expected arrivals)
    const [clients, foreignOrders] = await Promise.all([
      prisma.client.findMany({
        where: { activo: true },
        select: { id: true, razonSocial: true, diaFacturacion: true, cuit: true }
      }),
      prisma.foreignOrder.findMany({
        where: { estado: "PENDIENTE" },
        select: { id: true, nroOrden: true, proveedor: true, fechaLlegadaAprox: true }
      })
    ]);

    const systemEvents: any[] = [];
    const now = new Date();

    // Generate client billing alert for current & next month
    clients.forEach(c => {
      if (c.diaFacturacion && c.diaFacturacion >= 1 && c.diaFacturacion <= 31) {
        const billingDateThisMonth = new Date(now.getFullYear(), now.getMonth(), c.diaFacturacion, 9, 0, 0);
        systemEvents.push({
          id: `sys-billing-${c.id}-${now.getMonth()}`,
          title: `Facturación: ${c.razonSocial}`,
          description: `Día habitual de facturación mensual para ${c.razonSocial} (CUIT: ${c.cuit}).`,
          start: billingDateThisMonth,
          end: null,
          type: "FACTURACION_AUTOMATICA",
          scope: "GLOBAL",
          isSystem: true,
          client: c,
          user: { nombre: "Sistema Auto" }
        });
      }
    });

    // Generate foreign order arrival alerts
    foreignOrders.forEach(fo => {
      if (fo.fechaLlegadaAprox) {
        systemEvents.push({
          id: `sys-[#fo]-${fo.id}`,
          title: `Llegada Importación: ${fo.nroOrden}`,
          description: `Fecha estimada de arribo de pedido internacional (${fo.proveedor}).`,
          start: new Date(fo.fechaLlegadaAprox),
          end: null,
          type: "IMPORTACION",
          scope: "GLOBAL",
          isSystem: true,
          user: { nombre: "Logística Int." }
        });
      }
    });

    const allEvents = [...manualEvents, ...systemEvents].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    return { success: true, events: allEvents };
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

export async function updateCalendarEvent(id: string, data: {
  title: string;
  description?: string;
  start: Date;
  end?: Date;
  type: string;
  scope: string;
  clientId?: string;
}) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Usuario no autenticado." };
    }

    const existing = await prisma.calendarEvent.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "Evento no encontrado." };
    }

    if (existing.userId !== session.id && session.rol !== "ADMIN") {
      return { success: false, error: "No tiene permisos para modificar este evento." };
    }

    const updated = await prisma.calendarEvent.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description || null,
        start: data.start,
        end: data.end || null,
        type: data.type,
        scope: data.scope,
        clientId: data.clientId || null
      }
    });

    revalidatePath("/calendario");
    return { success: true, event: updated };
  } catch (error: any) {
    console.error("Error updating calendar event:", error);
    return { success: false, error: "Error al actualizar evento de calendario." };
  }
}

export async function deleteCalendarEvent(id: string) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Usuario no autenticado." };
    }

    const event = await prisma.calendarEvent.findUnique({
      where: { id }
    });

    if (!event) {
      return { success: false, error: "Evento no encontrado." };
    }

    if (event.userId !== session.id && session.rol !== "ADMIN") {
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
