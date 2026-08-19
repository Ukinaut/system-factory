"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import fs from "fs";
import path from "path";

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("sessionToken")?.value;
  if (!token) return null;
  try {
    const decodedStr = Buffer.from(token, "base64").toString("utf-8");
    const session = JSON.parse(decodedStr);
    const liveUser = await prisma.user.findUnique({
      where: { id: session.id }
    });
    if (liveUser) {
      session.rol = liveUser.rol;
    }
    return session;
  } catch {
    return null;
  }
}

export async function createPurchaseRequest(data: {
  tipoArticulo: string; // CONSUMIBLES, VARIOS, EQUIPOS, OTROS
  articulo: string;
  montoAprox: number;
  referenciaBase64?: string; // Archivo opcional cargado en base64
  referenciaFileName?: string;
  referenciaUrl?: string; // Link web alternativo
  areaDestino: string; // LABORATORIO, OPERATIVA, DESPACHOS, COCINA, BANOS, LIMPIEZA, OTROS
  proveedor?: string;
  formaPago?: string;
}) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Usuario no autenticado." };
    }

    let finalReferenciaUrl = data.referenciaUrl || null;

    // Procesar archivo base64 si existe
    if (data.referenciaBase64 && data.referenciaFileName) {
      const uploadsDir = path.join(process.cwd(), "public", "uploads");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const fileExtension = path.extname(data.referenciaFileName);
      const uniqueFileName = `compra_${Date.now()}${fileExtension}`;
      const filePath = path.join(uploadsDir, uniqueFileName);

      // Limpiar prefijo base64
      const base64Data = data.referenciaBase64.replace(/^data:.*?;base64,/, "");
      fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));
      finalReferenciaUrl = `/uploads/${uniqueFileName}`;
    }

    const request = await prisma.purchaseRequest.create({
      data: {
        userId: session.id,
        tipoArticulo: data.tipoArticulo,
        articulo: data.articulo,
        montoAprox: data.montoAprox,
        referenciaUrl: finalReferenciaUrl,
        areaDestino: data.areaDestino,
        proveedor: data.proveedor || null,
        formaPago: data.formaPago || null,
        estado: "PENDIENTE"
      }
    });

    // Notificar a administradores y personal de compras por sistema y correo electrónico
    const admins = await prisma.user.findMany({
      where: {
        OR: [
          { rol: "ADMIN" },
          { permissions: { some: { areaPermitida: "STOCK" } } }
        ]
      }
    });

    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map(admin => ({
          userId: admin.id,
          titulo: "Nueva Solicitud de Compra",
          mensaje: `${session.nombre} solicita "${data.articulo}" ($${data.montoAprox}) para ${data.areaDestino}.`,
          area: "SISTEMA",
          leida: false
        }))
      });

      // Enviar correos electrónicos a administradores
      const adminEmails = admins.map(a => a.correo).filter(Boolean);
      if (adminEmails.length > 0) {
        const { sendEmail, buildEmailTemplate } = await import("@/lib/email");
        const html = buildEmailTemplate({
          title: "🛒 Nueva Solicitud de Compra Pendiente",
          preheader: `${session.nombre} solicita ${data.articulo} por $${data.montoAprox}`,
          contentHtml: `
            <p>El usuario <strong>${session.nombre}</strong> ha generado una nueva solicitud de compra en el sistema.</p>
            
            <div style="background-color: #0f172a; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #334155;">
              <p style="margin: 4px 0;"><strong>Artículo / Insumo:</strong> ${data.articulo}</p>
              <p style="margin: 4px 0;"><strong>Monto Aprox:</strong> $${data.montoAprox.toLocaleString("es-AR")}</p>
              <p style="margin: 4px 0;"><strong>Área Destino:</strong> ${data.areaDestino}</p>
              <p style="margin: 4px 0;"><strong>Categoría:</strong> ${data.tipoArticulo}</p>
              ${data.proveedor ? `<p style="margin: 4px 0;"><strong>Proveedor Sugerido:</strong> ${data.proveedor}</p>` : ""}
            </div>
            
            <p style="font-size: 13px; color: #94a3b8;">Por favor ingresa al panel de Compras para aprobar o rechazar esta solicitud.</p>
          `,
          senderInfo: { nombre: session.nombre, area: "Solicitante" }
        });

        sendEmail({
          to: adminEmails,
          subject: `[SYSTEM FACTORY] Nueva Solicitud de Compra: ${data.articulo}`,
          html,
          fromName: `${session.nombre} - Solicitudes System Factory`,
          fromEmail: session.correo
        }).catch(err => console.error("Error al enviar email a admins de compras:", err));
      }
    }

    revalidatePath("/orden-compra");
    revalidatePath("/compras");
    return { success: true, request };
  } catch (error: any) {
    console.error("Error creating purchase request:", error);
    return { success: false, error: "Error de servidor al registrar la solicitud." };
  }
}

export async function getPurchaseRequests() {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Usuario no autenticado." };
    }

    const requests = await prisma.purchaseRequest.findMany({
      include: {
        user: {
          select: {
            nombre: true,
            rol: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return { success: true, requests };
  } catch (error: any) {
    console.error("Error fetching purchase requests:", error);
    return { success: false, error: "Error al obtener solicitudes." };
  }
}

export async function getMyPurchaseRequests() {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Usuario no autenticado." };
    }

    const requests = await prisma.purchaseRequest.findMany({
      where: {
        userId: session.id
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return { success: true, requests };
  } catch (error: any) {
    console.error("Error fetching my purchase requests:", error);
    return { success: false, error: "Error al obtener tus solicitudes." };
  }
}

export async function updatePurchaseRequestStatus(
  id: string,
  estado: string, // APROBADA, RECHAZADA, PROCESADA
  comentario?: string
) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Usuario no autenticado." };
    }

    const request = await prisma.purchaseRequest.findUnique({
      where: { id }
    });

    if (!request) {
      return { success: false, error: "Solicitud no encontrada." };
    }

    const updated = await prisma.purchaseRequest.update({
      where: { id },
      data: {
        estado,
        comentario: comentario || null
      }
    });

    // Notificar al usuario creador sobre el cambio de estado por sistema y por correo
    await prisma.notification.create({
      data: {
        userId: request.userId,
        titulo: `Solicitud de Compra: ${estado}`,
        mensaje: `Tu solicitud para "${request.articulo}" fue ${estado.toLowerCase()}${
          comentario ? `: "${comentario}"` : "."
        }`,
        area: "SISTEMA",
        leida: false
      }
    });

    try {
      const requester = await prisma.user.findUnique({
        where: { id: request.userId }
      });

      if (requester?.correo) {
        const { sendEmail, buildEmailTemplate } = await import("@/lib/email");
        const isApproved = estado === "APROBADA";
        const html = buildEmailTemplate({
          title: isApproved ? "✅ Solicitud de Compra Aprobada" : "❌ Solicitud de Compra Rechazada",
          preheader: `Tu solicitud para ${request.articulo} ha sido ${estado.toLowerCase()}`,
          contentHtml: `
            <p>Hola <strong>${requester.nombre}</strong>,</p>
            <p>Tu solicitud de compra para <strong>"${request.articulo}"</strong> por un monto aproximado de <strong>$${request.montoAprox.toLocaleString("es-AR")}</strong> ha sido marcada como <strong>${estado}</strong>.</p>
            
            ${comentario ? `<div style="background-color:#0f172a; padding:12px; border-radius:8px; border:1px solid #334155; margin:16px 0;"><strong>Comentario de Administración:</strong> "${comentario}"</div>` : ""}
          `,
          senderInfo: { nombre: session.nombre, area: "Administración" }
        });

        sendEmail({
          to: requester.correo,
          subject: `[SYSTEM FACTORY] Solicitud de Compra ${estado}: ${request.articulo}`,
          html,
          fromName: `${session.nombre} - Administración System Factory`,
          fromEmail: session.correo
        }).catch(err => console.error("Error enviando correo a solicitante de compra:", err));
      }
    } catch (err) {
      console.error("Error al procesar correo de estado de compra:", err);
    }

    revalidatePath("/orden-compra");
    revalidatePath("/compras");
    return { success: true, request: updated };
  } catch (error: any) {
    console.error("Error updating purchase request:", error);
    return { success: false, error: "Error al actualizar estado de la solicitud." };
  }
}

export async function deletePurchaseRequest(id: string) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Usuario no autenticado." };
    }

    if (session.rol !== "ADMIN") {
      return { success: false, error: "Permiso denegado. Solo administradores pueden eliminar solicitudes de compra." };
    }

    const request = await prisma.purchaseRequest.findUnique({
      where: { id }
    });

    if (!request) {
      return { success: false, error: "Solicitud no encontrada." };
    }

    await prisma.purchaseRequest.delete({
      where: { id }
    });

    revalidatePath("/orden-compra");
    revalidatePath("/compras");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting purchase request:", error);
    return { success: false, error: "Error de servidor al eliminar la solicitud." };
  }
}

export async function updatePurchaseRequestFields(
  id: string,
  data: {
    formaPago?: string;
    proveedor?: string;
  }
) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Usuario no autenticado." };
    }

    const updated = await prisma.purchaseRequest.update({
      where: { id },
      data: {
        formaPago: data.formaPago,
        proveedor: data.proveedor
      }
    });

    revalidatePath("/orden-compra");
    revalidatePath("/compras");
    return { success: true, request: updated };
  } catch (error: any) {
    console.error("Error updating purchase request fields:", error);
    return { success: false, error: "Error al actualizar campos de la solicitud." };
  }
}

export async function createPurchaseInvoice(data: {
  requestIds: string[];
  montoFinal: number;
  moneda?: string;
  proveedor?: string;
  nroFactura?: string;
  formaPago?: string;
  fileBase64?: string;
  fileName?: string;
}) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Usuario no autenticado." };
    }

    let finalArchivoUrl: string | null = null;

    // Process file if present
    if (data.fileBase64 && data.fileName) {
      const uploadsDir = path.join(process.cwd(), "public", "uploads", "invoices");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const fileExtension = path.extname(data.fileName);
      const uniqueFileName = `factura_${Date.now()}${fileExtension}`;
      const filePath = path.join(uploadsDir, uniqueFileName);

      const base64Data = data.fileBase64.replace(/^data:.*?;base64,/, "");
      fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));
      finalArchivoUrl = `/uploads/invoices/${uniqueFileName}`;
    }

    const invoice = await prisma.purchaseInvoice.create({
      data: {
        nroFactura: data.nroFactura || null,
        proveedor: data.proveedor || null,
        formaPago: data.formaPago || null,
        montoFinal: data.montoFinal,
        moneda: data.moneda || "ARS",
        archivoUrl: finalArchivoUrl,
        requests: {
          connect: data.requestIds.map(id => ({ id }))
        }
      }
    });

    // Mark associated purchase requests as PROCESADA
    await prisma.purchaseRequest.updateMany({
      where: {
        id: { in: data.requestIds }
      },
      data: {
        estado: "PROCESADA"
      }
    });

    revalidatePath("/orden-compra");
    revalidatePath("/compras");
    return { success: true, invoice };
  } catch (error: any) {
    console.error("Error creating purchase invoice:", error);
    return { success: false, error: "Error de servidor al registrar la factura." };
  }
}

export async function getPurchaseInvoices() {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Usuario no autenticado." };
    }

    const invoices = await prisma.purchaseInvoice.findMany({
      include: {
        requests: {
          include: {
            user: {
              select: {
                nombre: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return { success: true, invoices };
  } catch (error: any) {
    console.error("Error fetching purchase invoices:", error);
    return { success: false, error: "Error de servidor al obtener las facturas." };
  }
}

export async function deletePurchaseInvoice(id: string) {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: "Usuario no autenticado." };
    if (session.rol !== "ADMIN") {
      return { success: false, error: "No autorizado. Solo los administradores pueden borrar facturas." };
    }

    const invoice = await prisma.purchaseInvoice.findUnique({
      where: { id }
    });

    if (!invoice) return { success: false, error: "Factura no encontrada." };

    await prisma.$transaction(async (tx) => {
      await tx.purchaseInvoice.delete({
        where: { id }
      });

      await tx.auditLog.create({
        data: {
          userId: session.id,
          accion: `Eliminada del historial la Factura de Compra N° ${invoice.nroFactura || "S/N"} de ${invoice.proveedor || "S/N"} por ${invoice.moneda} ${invoice.montoFinal}.`
        }
      });
    });

    revalidatePath("/compras");
    revalidatePath("/orden-compra");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting purchase invoice:", error);
    return { success: false, error: error.message || "Error al eliminar la factura de compra." };
  }
}




