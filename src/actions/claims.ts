"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createClaim(data: {
  clientId: string;
  tipo: string;
  prioridad: string;
  observacion: string;
}) {
  try {
    const claim = await prisma.claim.create({
      data: {
        clientId: data.clientId,
        tipo: data.tipo,
        prioridad: data.prioridad,
        observacion: data.observacion,
        estado: "Ingresado",
        tecnico: "Sin asignar",
        diagnostico: "",
        repuestos: "[]",
      },
    });

    revalidatePath("/laboratorio");

    // Enviar correo de notificación al cliente al ingresar un reclamo
    if (claim) {
      try {
        const fullClaim = await prisma.claim.findUnique({
          where: { id: claim.id },
          include: { client: true }
        });

        if (fullClaim?.client?.correo) {
          const { sendEmail, buildEmailTemplate } = await import("@/lib/email");
          const subject = `[SYSTEM FACTORY] Registro de Reclamo / Servicio Técnico`;
          
          const contentHtml = `
            <p>Hola <strong>${fullClaim.client.razonSocial}</strong>,</p>
            <p>Hemos registrado tu reclamo / solicitud de soporte técnico en nuestro departamento de Laboratorio.</p>

            <div style="background-color: #0f172a; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #334155;">
              <p style="margin: 4px 0;"><strong>Tipo de Reclamo:</strong> ${fullClaim.tipo}</p>
              <p style="margin: 4px 0;"><strong>Prioridad:</strong> ${fullClaim.prioridad}</p>
              <p style="margin: 4px 0;"><strong>Estado Inicial:</strong> ${fullClaim.estado}</p>
              <p style="margin: 4px 0;"><strong>Observación:</strong> "${fullClaim.observacion}"</p>
            </div>

            <p style="font-size: 13px; color: #94a3b8;">Te notificaremos por este medio a medida que nuestro equipo técnico avance en la revisión del equipo.</p>
          `;

          const html = buildEmailTemplate({
            title: "🛠️ Solicitud de Soporte Registrada",
            preheader: `Reclamo: ${fullClaim.tipo} | Prioridad: ${fullClaim.prioridad}`,
            contentHtml,
            senderInfo: { nombre: "Laboratorio y Servicio Técnico", area: "Soporte Técnico" }
          });

          sendEmail({
            to: fullClaim.client.correo,
            subject,
            html,
            fromName: "Soporte Técnico - SYSTEM FACTORY"
          }).catch(err => console.error("Error enviando email de reclamo:", err));
        }
      } catch (err) {
        console.error("Error al procesar email de reclamo:", err);
      }
    }

    return { success: true, claim };
  } catch (error: any) {
    console.error("Error creating claim:", error);
    return { success: false, error: error.message || "Error al registrar el reclamo." };
  }
}

export async function getClaims() {
  try {
    const claims = await prisma.claim.findMany({
      include: {
        client: true,
      },
      orderBy: {
        fecha: "desc",
      },
    });
    return { success: true, claims };
  } catch (error: any) {
    console.error("Error fetching claims:", error);
    return { success: false, error: "Error al obtener reclamos." };
  }
}

export async function updateClaimRMA(data: {
  id: string;
  estado: string;
  tecnico: string;
  diagnostico: string;
  repuestos: string[];
}) {
  try {
    // 1. Obtener el reclamo actual para comparar repuestos consumidos
    const currentClaim = await prisma.claim.findUnique({
      where: { id: data.id },
    });

    if (!currentClaim) {
      return { success: false, error: "Orden de trabajo no encontrada." };
    }

    const currentRepuestos: string[] = JSON.parse(currentClaim.repuestos || "[]");
    
    // Identificar repuestos agregados en este paso para descontarlos del stock
    const nuevosRepuestos = data.repuestos.filter(r => !currentRepuestos.includes(r));

    // Ejecutar transacción
    await prisma.$transaction(async (tx) => {
      // Actualizar el reclamo
      await tx.claim.update({
        where: { id: data.id },
        data: {
          estado: data.estado,
          tecnico: data.tecnico,
          diagnostico: data.diagnostico,
          repuestos: JSON.stringify(data.repuestos),
        },
      });

      // Descontar del stock los productos que coincidan con los nombres de repuestos añadidos
      for (const nombreRepuesto of nuevosRepuestos) {
        const prod = await tx.product.findFirst({
          where: {
            nombre: {
              equals: nombreRepuesto.trim(),
            },
          },
        });

        if (prod) {
          const nuevaCantidad = Math.max(0, prod.cantidad - 1);
          await tx.product.update({
            where: { id: prod.id },
            data: { cantidad: nuevaCantidad },
          });
        }
      }
    });

    revalidatePath("/laboratorio");
    revalidatePath("/stock");
    return { success: true };
  } catch (error: any) {
    console.error("Error updating claim RMA:", error);
    return { success: false, error: error.message || "Error al actualizar la orden de trabajo." };
  }
}
