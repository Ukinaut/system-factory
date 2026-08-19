"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
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

export async function getShippings() {
  try {
    const shippings = await prisma.shipping.findMany({
      include: {
        sale: {
          include: {
            client: true,
            details: {
              include: {
                producto: true,
              },
            },
          },
        },
      },
      orderBy: {
        id: "desc",
      },
    });
    return { success: true, shippings };
  } catch (error: any) {
    console.error("Error fetching shippings:", error);
    return { success: false, shippings: [], error: "Error al obtener la lista de envíos." };
  }
}

export async function updateShipping(data: {
  id: string;
  tracking?: string;
  logistica?: string;
  estado: string; // "PARA_EMPACAR" | "EMPACADO" | "DESPACHADO" | "ENTREGADO"
  subEstado?: string; // "RECIBIDO" | "TRANSITO" | "DISTRIBUCION" | "INCIDENCIA" | "ENTREGADO"
  cajasUtilizadas?: { id: string; nombre: string; cantidad: number }[];
}) {
  try {
    const shipping = await prisma.$transaction(async (tx) => {
      const existingShip = await tx.shipping.findUnique({
        where: { id: data.id },
        include: {
          sale: {
            include: {
              details: true,
            },
          },
        },
      });

      if (!existingShip) {
        throw new Error("Envío no encontrado.");
      }

      const isTransitioningToEmpacado = data.estado === "EMPACADO";
      const isTransitioningToDespachado = data.estado === "DESPACHADO" && existingShip.estado !== "DESPACHADO";
      const isTransitioningToEntregado = data.estado === "ENTREGADO" && existingShip.estado !== "ENTREGADO";

      // Determinar sub-estado por defecto al cambiar el estado principal
      let finalSubEstado = data.subEstado || existingShip.subEstado;
      if (isTransitioningToDespachado && !data.subEstado) {
        finalSubEstado = "RECIBIDO";
      } else if (isTransitioningToEntregado) {
        finalSubEstado = "ENTREGADO";
      }

      const cajasJson = data.cajasUtilizadas !== undefined 
        ? JSON.stringify(data.cajasUtilizadas) 
        : existingShip.cajasUtilizadas;

      const ship = await tx.shipping.update({
        where: { id: data.id },
        data: {
          tracking: data.tracking !== undefined ? data.tracking : existingShip.tracking,
          logistica: data.logistica !== undefined ? data.logistica : existingShip.logistica,
          estado: data.estado,
          subEstado: finalSubEstado,
          cajasUtilizadas: cajasJson,
        },
      });

      // Si se especificaron cajas al empacar, descontar su stock y generar logs
      if (data.cajasUtilizadas && data.cajasUtilizadas.length > 0) {
        const session = await getSession();
        const userId = session?.id || existingShip.sale.vendedorId || "sistema";

        for (const caja of data.cajasUtilizadas) {
          if (caja.id && caja.cantidad > 0) {
            const prod = await tx.product.findUnique({ where: { id: caja.id } });
            if (prod) {
              const nuevaCantidad = Math.max(0, prod.cantidad - Number(caja.cantidad));
              await tx.product.update({
                where: { id: caja.id },
                data: { cantidad: nuevaCantidad },
              });

              await tx.auditLog.create({
                data: {
                  userId,
                  accion: `Descuento automático de stock de caja ${prod.nombre} (Cantidad: ${caja.cantidad}) por embalaje de envío ${existingShip.sale.numeroOrden}`,
                },
              });
            }
          }
        }
      }

      if (isTransitioningToDespachado) {
        // 1. Actualizar la venta asociada a ENVIADO
        await tx.sale.update({
          where: { id: existingShip.saleId },
          data: {
            estado: "ENVIADO",
          },
        });

        // 2. Descontar Stock y registrar logs para cada artículo
        const session = await getSession();
        const userId = session?.id || existingShip.sale.vendedorId || "sistema";

        for (const art of existingShip.sale.details) {
          // Si es un Kit con componentes personalizados seleccionados
          if (art.componentesSeleccionados) {
            try {
              const componentes = JSON.parse(art.componentesSeleccionados);
              for (const comp of componentes) {
                if (comp.id) {
                  const prod = await tx.product.findUnique({ where: { id: comp.id } });
                  if (prod) {
                    const totalADescontar = Number(art.cantidad) * Number(comp.cantidad);
                    const nuevaCantidad = Math.max(0, prod.cantidad - totalADescontar);
                    await tx.product.update({
                      where: { id: comp.id },
                      data: { cantidad: nuevaCantidad },
                    });

                    await tx.auditLog.create({
                      data: {
                        userId,
                        accion: `Descuento automático de stock de componente ${prod.nombre} (Cantidad: ${totalADescontar}) por despacho de solución en venta ${existingShip.sale.numeroOrden}`,
                      },
                    });
                  }
                }
              }
              continue; // Omitir el descuento del artículo base de la venta (el Kit virtual)
            } catch (err) {
              console.error("Error al procesar componentes del kit:", err);
            }
          }

          const prod = await tx.product.findUnique({ where: { id: art.productoId } });
          if (prod) {
            if (prod.nombre === "Otros" || prod.tipo === "SERVICIO" || prod.tipo === "SERVICIO_GPS" || prod.tipo === "SERVICIO_RED" || prod.tipo === "PACK_INTERNET") {
              continue;
            }
            const nuevaCantidad = Math.max(0, prod.cantidad - art.cantidad);
            await tx.product.update({
              where: { id: art.productoId },
              data: { cantidad: nuevaCantidad },
            });

            await tx.auditLog.create({
              data: {
                userId,
                accion: `Descuento automático de stock por despacho de venta ${existingShip.sale.numeroOrden}: ${prod.nombre} (Cantidad: ${art.cantidad})`,
              },
            });
          }
        }
      }

      if (isTransitioningToEntregado) {
        // Actualizar la venta asociada a ENTREGADO
        await tx.sale.update({
          where: { id: existingShip.saleId },
          data: {
            estado: "ENTREGADO",
          },
        });
      }

      return ship;
    });

    revalidatePath("/envios");
    revalidatePath("/stock");
    revalidatePath("/estado-pedidos");

    // Enviar notificación automática por correo si el estado cambia a DESPACHADO o ENTREGADO
    if (shipping && (data.estado === "DESPACHADO" || data.estado === "ENTREGADO")) {
      try {
        const session = await getSession();
        const fullShip = await prisma.shipping.findUnique({
          where: { id: shipping.id },
          include: {
            sale: {
              include: { client: true, vendedor: true }
            }
          }
        });

        if (fullShip) {
          const { sendEmail, buildEmailTemplate, getAreaRecipients } = await import("@/lib/email");
          const isDespachado = data.estado === "DESPACHADO";
          const subject = isDespachado
            ? `[RESPALDO SISTEMA] Orden ${fullShip.sale.numeroOrden} despachada`
            : `[RESPALDO SISTEMA] Orden ${fullShip.sale.numeroOrden} entregada a destino`;

          const contentHtml = `
            <p>Hola,</p>
            <p>Se ha registrado un movimiento de logística en <strong>SYSTEM FACTORY</strong> para la orden <strong>${fullShip.sale.numeroOrden}</strong>.</p>
            
            <div style="background-color: #0f172a; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #334155;">
              <p style="margin: 4px 0;"><strong>Número de Orden:</strong> ${fullShip.sale.numeroOrden}</p>
              <p style="margin: 4px 0;"><strong>Cliente:</strong> ${fullShip.sale.client?.razonSocial || "N/A"}</p>
              <p style="margin: 4px 0;"><strong>Empresa de Transporte:</strong> ${fullShip.logistica || "Asignada"}</p>
              <p style="margin: 4px 0;"><strong>Código de Tracking:</strong> <span style="color: #c084fc; font-family: monospace; font-weight: bold;">${fullShip.tracking || "N/A"}</span></p>
              <p style="margin: 4px 0;"><strong>Estado del Envío:</strong> ${data.estado}</p>
              <p style="margin: 4px 0;"><strong>Dirección de Entrega:</strong> ${fullShip.sale.client?.direccion || "N/A"}</p>
            </div>

            <p style="font-size: 13px; color: #94a3b8;">Movimiento ejecutado por: <strong>${session?.nombre || "Operador de Logística"}</strong> (${session?.correo || "N/A"}).</p>
          `;

          const html = buildEmailTemplate({
            title: isDespachado ? "📦 Respaldo de Envío Despachado" : "✅ Respaldo de Entrega Finalizada",
            preheader: `Tracking: ${fullShip.tracking || ""} | ${fullShip.logistica || ""}`,
            contentHtml,
            senderInfo: session ? { nombre: session.nombre, area: "Logística y Despachos" } : undefined
          });

          // Obtener miembros del área de Envíos + el operador + el cliente
          const areaRecipients = await getAreaRecipients("Envíos", session?.correo);
          const allRecipients = Array.from(new Set([
            ...areaRecipients,
            fullShip.sale.client?.correo
          ].filter(Boolean) as string[]));

          sendEmail({
            to: allRecipients,
            subject,
            html,
            fromName: session?.nombre ? `${session.nombre} - Logística System Factory` : "Logística SYSTEM FACTORY",
            fromEmail: session?.correo
          }).catch(err => console.error("Error al enviar email de logística:", err));
        }
      } catch (err) {
        console.error("Error intentando enviar notificación por correo de despacho:", err);
      }
    }

    return { success: true, shipping };
  } catch (error: any) {
    console.error("Error updating shipping:", error);
    return { success: false, error: error.message || "Error al actualizar el despacho de envío." };
  }
}

export async function deleteShipping(id: string) {
  try {
    const session = await getSession();
    if (session?.rol !== "ADMIN") {
      return { success: false, error: "No autorizado. Solo los administradores pueden eliminar envíos." };
    }

    await prisma.shipping.delete({
      where: { id }
    });

    revalidatePath("/envios");
    revalidatePath("/estado-pedidos");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting shipping:", error);
    return { success: false, error: error.message || "Error al eliminar el envío de la base de datos." };
  }
}

