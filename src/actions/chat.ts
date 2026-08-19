"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

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

export async function getMessages(otherUserId: string) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Usuario no autenticado." };
    }

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: session.id, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: session.id }
        ]
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    return { success: true, messages };
  } catch (error: any) {
    console.error("Error fetching messages:", error);
    return { success: false, error: "Error al obtener mensajes." };
  }
}

export async function sendMessage(receiverId: string, content: string) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Usuario no autenticado." };
    }

    const message = await prisma.message.create({
      data: {
        senderId: session.id,
        receiverId,
        content
      }
    });

    return { success: true, message };
  } catch (error: any) {
    console.error("Error sending message:", error);
    return { success: false, error: "Error al enviar el mensaje." };
  }
}
