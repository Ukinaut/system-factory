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

export async function createSale(data: {
  clientId: string;
  tipo: string;
  costoEnvio: number;
  descuento: number;
  autorizaDescuento?: string;
  observaciones?: string;
  tipoFactura: string;
  moneda?: string;
  articulos: { productoId: string; cantidad: number; precio: number; componentesSeleccionados?: string }[];
  puntoVenta?: string;
  tipoEntrega?: string;
}) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Usuario no autenticado." };
    }

    const vendedorId = session.id;
    const numeroOrden = "ORD-" + Date.now().toString().slice(-8);

    const subtotal = data.articulos.reduce((acc, curr) => acc + curr.cantidad * curr.precio, 0);
    const total = subtotal + Number(data.costoEnvio) - Number(data.descuento);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Crear Venta
      const sale = await tx.sale.create({
        data: {
          numeroOrden,
          clientId: data.clientId,
          vendedorId,
          tipo: data.tipo,
          costoEnvio: Number(data.costoEnvio),
          descuento: Number(data.descuento),
          autorizaDescuento: data.autorizaDescuento || null,
          observaciones: data.observaciones || null,
          tipoFactura: data.tipoFactura,
          estado: "PENDIENTE",
          moneda: data.moneda || "ARS",
          total,
          puntoVenta: data.puntoVenta || "TIENDA",
          tipoEntrega: data.tipoEntrega || "ENVIO",
          details: {
            create: data.articulos.map((art) => ({
              productoId: art.productoId,
              cantidad: art.cantidad,
              precioUnitario: art.precio,
              componentesSeleccionados: art.componentesSeleccionados || null,
            })),
          },
        },
      });

      // 3. Crear Registro de Envío si incluye artículos físicos
      if (data.tipo === "ARTICULO" || data.tipo === "MIXTO") {
        await tx.shipping.create({
          data: {
            saleId: sale.id,
            estado: "PARA_EMPACAR",
          },
        });
      }

      // 4. Crear Audit Log
      await tx.auditLog.create({
        data: {
          userId: vendedorId,
          accion: `Creada venta ${numeroOrden} para cliente ID ${data.clientId} por total ${data.moneda || "ARS"} ${total}`,
        },
      });

      return sale;
    });

    revalidatePath("/ventas");
    revalidatePath("/stock");
    revalidatePath("/estado-pedidos");

    // Enviar notificación automática por correo al cliente
    if (result) {
      try {
        const fullSale = await prisma.sale.findUnique({
          where: { id: result.id },
          include: { client: true, vendedor: true, details: { include: { producto: true } } }
        });

        if (fullSale) {
          const { sendEmail, buildEmailTemplate, getAreaRecipients } = await import("@/lib/email");
          const subject = `[RESPALDO SISTEMA] Nueva Venta ${fullSale.numeroOrden} por ${fullSale.vendedor?.nombre || session.nombre}`;
          
          const itemsList = fullSale.details.map(d => 
            `<li style="margin-bottom:6px;"><strong>${d.cantidad}x</strong> ${d.producto?.nombre || "Producto"} - $${d.precioUnitario.toLocaleString("es-AR")}</li>`
          ).join("");

          const contentHtml = `
            <p>Hola,</p>
            <p>Se ha registrado un nuevo movimiento de venta en <strong>SYSTEM FACTORY</strong>.</p>
            
            <div style="background-color: #0f172a; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #334155;">
              <p style="margin: 4px 0;"><strong>Número de Orden:</strong> ${fullSale.numeroOrden}</p>
              <p style="margin: 4px 0;"><strong>Cliente:</strong> ${fullSale.client?.razonSocial || "Venta Rápida"}</p>
              <p style="margin: 4px 0;"><strong>Total Venta:</strong> ${fullSale.moneda} $${fullSale.total.toLocaleString("es-AR")}</p>
              <p style="margin: 4px 0;"><strong>Punto de Venta:</strong> ${fullSale.puntoVenta}</p>
            </div>

            <p><strong>Detalle de artículos:</strong></p>
            <ul>${itemsList}</ul>

            <p style="font-size: 13px; color: #94a3b8;">Vendedor que registró la operación: <strong>${fullSale.vendedor?.nombre || session.nombre}</strong> (${fullSale.vendedor?.correo || session.correo}).</p>
          `;

          const html = buildEmailTemplate({
            title: "🛒 Respaldo de Movimiento de Venta",
            preheader: `Orden ${fullSale.numeroOrden} por ${fullSale.moneda} $${fullSale.total.toLocaleString("es-AR")}`,
            contentHtml,
            senderInfo: { nombre: fullSale.vendedor?.nombre || session.nombre, area: "Ventas" }
          });

          // Obtener miembros del área de Ventas + el vendedor + el cliente si posee correo
          const areaRecipients = await getAreaRecipients("Ventas", fullSale.vendedor?.correo || session.correo);
          const allRecipients = Array.from(new Set([
            ...areaRecipients,
            fullSale.client?.correo
          ].filter(Boolean) as string[]));

          sendEmail({
            to: allRecipients,
            subject,
            html,
            fromName: `${fullSale.vendedor?.nombre || session.nombre} - Ventas System Factory`,
            fromEmail: fullSale.vendedor?.correo || session.correo
          }).catch(err => console.error("Error al enviar email de venta:", err));
        }
      } catch (err) {
        console.error("Error al procesar envío de correo de venta:", err);
      }
    }

    return { success: true, sale: result };
  } catch (error: any) {
    console.error("Error creating sale:", error);
    return { success: false, error: error.message || "Error al procesar la venta." };
  }
}

export async function createQuote(data: {
  clientId: string;
  tipo: string;
  costoEnvio: number;
  descuento: number;
  autorizaDescuento?: string;
  observaciones?: string;
  moneda?: string;
  total: number;
}) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Usuario no autenticado." };
    }

    const vendedorId = session.id;
    const numeroOrden = "COT-" + Date.now().toString().slice(-8);

    const quote = await prisma.quote.create({
      data: {
        numeroOrden,
        clientId: data.clientId,
        vendedorId,
        tipo: data.tipo,
        costoEnvio: Number(data.costoEnvio),
        descuento: Number(data.descuento),
        autorizaDescuento: data.autorizaDescuento || null,
        observaciones: data.observaciones || null,
        moneda: data.moneda || "ARS",
        total: Number(data.total),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: vendedorId,
        accion: `Creado presupuesto ${numeroOrden} para cliente ID ${data.clientId} por total ${data.moneda || "ARS"} ${data.total}`,
      },
    });

    return { success: true, quote };
  } catch (error: any) {
    console.error("Error creating quote:", error);
    return { success: false, error: error.message || "Error al procesar el presupuesto." };
  }
}

export async function getSales() {
  try {
    const sales = await prisma.sale.findMany({
      include: {
        client: true,
        vendedor: true,
        details: {
          include: {
            producto: true,
          },
        },
        observations: {
          include: {
            user: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return { success: true, sales };
  } catch (error: any) {
    console.error("Error fetching sales:", error);
    return { success: false, error: "Error al obtener las ventas." };
  }
}

export async function createQuickSale(data: {
  clientName: string;
  articulos: { productoId: string; cantidad: number; precio: number }[];
  moneda?: string;
  puntoVenta?: string;
  tipoEntrega?: string;
}) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Usuario no autenticado." };
    }

    const vendedorId = session.id;

    // Find or create Client
    let client = await prisma.client.findFirst({
      where: { razonSocial: data.clientName }
    });
    if (!client) {
      // Create a temporary client with a generic unique CUIT
      client = await prisma.client.create({
        data: {
          razonSocial: data.clientName,
          cuit: "VR-" + Date.now().toString().slice(-6),
          telefono: "N/A",
          correo: "N/A",
          direccion: "N/A",
          diaFacturacion: 5
        }
      });
    }

    return await createSale({
      clientId: client.id,
      tipo: "VENTA_RAPIDA",
      costoEnvio: 0,
      descuento: 0,
      tipoFactura: "C",
      moneda: data.moneda || "ARS",
      articulos: data.articulos,
      puntoVenta: data.puntoVenta || "TIENDA",
      tipoEntrega: data.tipoEntrega || "ENVIO",
    });
  } catch (error: any) {
    console.error("Error creating quick sale:", error);
    return { success: false, error: error.message || "Error al procesar la venta rápida." };
  }
}

export async function skipBillingAndCollection(saleId: string) {
  try {
    const session = await getSession();
    if (session?.rol !== "ADMIN") {
      return { success: false, error: "No autorizado. Solo los administradores pueden omitir facturación y cobranza." };
    }

    const sale = await prisma.sale.update({
      where: { id: saleId },
      data: {
        estado: "PAGADO"
      }
    });

    revalidatePath("/estado-pedidos");
    revalidatePath("/envios");
    return { success: true, sale };
  } catch (error: any) {
    console.error("Error skipping billing and collection:", error);
    return { success: false, error: error.message || "Error al omitir pasos de facturación y cobranza." };
  }
}

export async function createSaleObservation(data: { saleId: string; texto: string }) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Usuario no autenticado." };
    }

    const obs = await prisma.saleObservation.create({
      data: {
        saleId: data.saleId,
        userId: session.id,
        texto: data.texto,
      },
      include: {
        user: true
      }
    });

    revalidatePath("/estado-pedidos");
    return { success: true, observation: obs };
  } catch (error: any) {
    console.error("Error creating sale observation:", error);
    return { success: false, error: error.message || "Error al registrar la observación." };
  }
}

export async function updateSaleGeneralInfo(saleId: string, data: { puntoVenta: string; tipoEntrega: string; estado: string }) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Usuario no autenticado." };
    }

    const sale = await prisma.sale.update({
      where: { id: saleId },
      data: {
        puntoVenta: data.puntoVenta,
        tipoEntrega: data.tipoEntrega,
        estado: data.estado,
      }
    });

    revalidatePath("/ventas-generales");
    revalidatePath("/estado-pedidos");
    return { success: true, sale };
  } catch (error: any) {
    console.error("Error updating sale general info:", error);
    return { success: false, error: error.message || "Error al actualizar la información general de la venta." };
  }
}

export async function deleteSale(saleId: string) {
  try {
    const session = await getSession();
    if (session?.rol !== "ADMIN") {
      return { success: false, error: "No autorizado. Solo los administradores pueden eliminar ventas." };
    }

    const sale = await prisma.sale.findUnique({
      where: { id: saleId }
    });

    if (!sale) {
      return { success: false, error: "Venta no encontrada." };
    }

    await prisma.$transaction(async (tx) => {
      // 1. Obtener facturas asociadas
      const invoices = await tx.invoice.findMany({
        where: { saleId }
      });
      const invoiceIds = invoices.map(i => i.id);

      // 2. Eliminar cobros/pagos de esas facturas
      if (invoiceIds.length > 0) {
        await tx.payment.deleteMany({
          where: { invoiceId: { in: invoiceIds } }
        });
      }

      // 3. Eliminar facturas
      await tx.invoice.deleteMany({
        where: { saleId }
      });

      // 4. Eliminar envíos (Shipping)
      await tx.shipping.deleteMany({
        where: { saleId }
      });

      // 5. Eliminar observaciones de venta
      await tx.saleObservation.deleteMany({
        where: { saleId }
      });

      // 6. Eliminar detalles de venta
      await tx.saleDetail.deleteMany({
        where: { saleId }
      });

      // 7. Eliminar la venta
      await tx.sale.delete({
        where: { id: saleId }
      });
    });

    await prisma.auditLog.create({
      data: {
        userId: session.id,
        accion: `Eliminada venta ${sale.numeroOrden} del sistema`
      }
    });

    revalidatePath("/ventas-generales");
    revalidatePath("/estado-pedidos");
    revalidatePath("/stock");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting sale:", error);
    return { success: false, error: error.message || "Error al eliminar la venta." };
  }
}



