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

export async function getNotifications() {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Usuario no autenticado." };
    }

    const notifications = await prisma.notification.findMany({
      where: {
        userId: session.id
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 20
    });

    return { success: true, notifications };
  } catch (error: any) {
    console.error("Error fetching notifications:", error);
    return { success: false, error: "Error al obtener notificaciones." };
  }
}

export async function markNotificationAsRead(id: string) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Usuario no autenticado." };
    }

    await prisma.notification.update({
      where: { id, userId: session.id },
      data: { leida: true }
    });

    revalidatePath("/layout"); // Revalida layouts generales
    return { success: true };
  } catch (error: any) {
    console.error("Error marking notification as read:", error);
    return { success: false, error: "Error al marcar notificación." };
  }
}

export async function createNotificationForArea(area: string, title: string, message: string) {
  try {
    // 1. Obtener todos los administradores
    const admins = await prisma.user.findMany({
      where: { rol: "ADMIN" }
    });

    // 2. Obtener operadores con permiso en esta área
    const operators = await prisma.user.findMany({
      where: {
        permissions: {
          some: {
            areaPermitida: area
          }
        }
      }
    });

    // Unir IDs de usuarios destinatarios
    const targetUserIds = Array.from(
      new Set([
        ...admins.map(a => a.id),
        ...operators.map(o => o.id)
      ])
    );

    // 3. Crear notificaciones en lote
    if (targetUserIds.length > 0) {
      await prisma.notification.createMany({
        data: targetUserIds.map(userId => ({
          userId,
          titulo: title,
          mensaje: message,
          area,
          leida: false
        }))
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error creating notifications for area:", error);
    return { success: false, error: error.message };
  }
}
