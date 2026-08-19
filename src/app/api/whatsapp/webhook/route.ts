import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Verificar token opcional si está configurado
    const authHeader = request.headers.get("authorization");
    const config = await prisma.botConfig.findUnique({ where: { id: "global" } });
    
    if (config?.webhookSecret && authHeader !== `Bearer ${config.webhookSecret}`) {
      return NextResponse.json({ error: "No autorizado. Token de webhook inválido." }, { status: 401 });
    }

    const remitente = body.remitente || body.from || body.phone || body.numero || "Desconocido";
    const nombre = body.nombre || body.contactName || body.name || null;
    const contenido = body.contenido || body.text || body.body || body.mensaje || "";
    const mensajeId = body.id || body.mensajeId || body.message_id || null;

    if (!contenido) {
      return NextResponse.json({ error: "El campo de contenido del mensaje es requerido." }, { status: 400 });
    }

    const savedMessage = await prisma.whatsAppMessage.create({
      data: {
        mensajeId: mensajeId ? String(mensajeId) : null,
        remitente: String(remitente),
        nombre: nombre ? String(nombre) : null,
        contenido: String(contenido),
        direccion: body.direccion || "ENTRANTE",
        estado: body.estado || "RECIBIDO",
      }
    });

    return NextResponse.json({
      success: true,
      message: "Mensaje de WhatsApp recibido e importado correctamente.",
      data: savedMessage
    });
  } catch (error: any) {
    console.error("Error en Webhook WhatsApp:", error);
    return NextResponse.json({ error: error.message || "Error procesando el webhook." }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "online",
    service: "SYSTEM FACTORY WhatsApp Webhook API",
    endpoint: "/api/whatsapp/webhook"
  });
}
