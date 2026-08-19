"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";

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

async function getActiveCountry() {
  const cookieStore = await cookies();
  const selectedCountryCode = cookieStore.get("selectedCountry")?.value || "AR";
  const country = await prisma.country.findUnique({
    where: { code: selectedCountryCode }
  });
  return country;
}

// -------------------------------------------------------------
// 1. IMPORT INVOICES
// -------------------------------------------------------------

export async function getImportInvoices() {
  try {
    const country = await getActiveCountry();
    if (!country) return { success: false, error: "Región no seleccionada." };

    const invoices = await prisma.importInvoice.findMany({
      where: { countryId: country.id },
      include: { items: true },
      orderBy: { createdAt: "desc" }
    });

    return { success: true, invoices };
  } catch (error: any) {
    console.error("Error fetching import invoices:", error);
    return { success: false, error: "Error al obtener facturas de importación." };
  }
}

export async function createImportInvoice(data: {
  nroFactura: string;
  proveedor: string;
  montoFinal: number;
  moneda: string;
  fileBase64?: string;
  fileName?: string;
  items: {
    nombreProduct: string;
    cantidad: number;
    tipoProduct: string;
  }[];
}) {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: "Usuario no autenticado." };

    const country = await getActiveCountry();
    if (!country) return { success: false, error: "Región no seleccionada." };

    let finalArchivoUrl: string | null = null;

    if (data.fileBase64 && data.fileName) {
      const uploadsDir = path.join(process.cwd(), "public", "uploads", "imports");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const fileExtension = path.extname(data.fileName);
      const uniqueFileName = `import_${Date.now()}${fileExtension}`;
      const filePath = path.join(uploadsDir, uniqueFileName);

      const base64Data = data.fileBase64.replace(/^data:.*?;base64,/, "");
      fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));
      finalArchivoUrl = `/uploads/imports/${uniqueFileName}`;
    }

    // Start Transaction to register invoice and update Stock
    const invoice = await prisma.$transaction(async (tx) => {
      // 1. Create Import Invoice
      const inv = await tx.importInvoice.create({
        data: {
          nroFactura: data.nroFactura,
          proveedor: data.proveedor,
          montoFinal: data.montoFinal,
          moneda: data.moneda,
          archivoUrl: finalArchivoUrl,
          countryId: country.id,
          items: {
            create: data.items.map(item => ({
              nombreProduct: item.nombreProduct,
              cantidad: item.cantidad,
              tipoProduct: item.tipoProduct
            }))
          }
        }
      });

      // 2. Loop and update Stock (Products)
      for (const item of data.items) {
        let prod = await tx.product.findFirst({
          where: {
            nombre: item.nombreProduct,
            countryId: country.id
          }
        });

        if (prod) {
          await tx.product.update({
            where: { id: prod.id },
            data: { cantidad: prod.cantidad + item.cantidad }
          });
        } else {
          await tx.product.create({
            data: {
              nombre: item.nombreProduct,
              tipo: item.tipoProduct,
              cantidad: item.cantidad,
              alertaMinima: 5,
              alertaCritica: 2,
              countryId: country.id
            }
          });
        }
      }

      // Log in audit trail
      await tx.auditLog.create({
        data: {
          userId: session.id,
          accion: `Cargada Factura de Importación N° ${data.nroFactura} de ${data.proveedor}. Se incrementó stock.`,
        }
      });

      return inv;
    });

    revalidatePath("/compras");
    revalidatePath("/stock");
    return { success: true, invoice };
  } catch (error: any) {
    console.error("Error creating import invoice:", error);
    return { success: false, error: error.message || "Error al crear factura de importación." };
  }
}

// -------------------------------------------------------------
// 2. FOREIGN ORDERS (OC EXTERIOR)
// -------------------------------------------------------------

export async function getForeignOrders() {
  try {
    const country = await getActiveCountry();
    if (!country) return { success: false, error: "Región no seleccionada." };

    const orders = await prisma.foreignOrder.findMany({
      where: { countryId: country.id },
      include: { items: true },
      orderBy: { createdAt: "desc" }
    });

    return { success: true, orders };
  } catch (error: any) {
    console.error("Error fetching foreign orders:", error);
    return { success: false, error: "Error al obtener órdenes de compra del exterior." };
  }
}

export async function createForeignOrder(data: {
  nroOrden: string;
  proveedor: string;
  paisOrigen?: string;
  fechaLlegadaAprox?: string;
  montoFinal?: number;
  moneda?: string;
  items: {
    nombreProduct: string;
    cantidad: number;
    tipoProduct: string;
  }[];
}) {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: "Usuario no autenticado." };

    const country = await getActiveCountry();
    if (!country) return { success: false, error: "Región no seleccionada." };

    const order = await prisma.foreignOrder.create({
      data: {
        nroOrden: data.nroOrden,
        proveedor: data.proveedor,
        paisOrigen: data.paisOrigen || null,
        montoFinal: data.montoFinal || 0,
        moneda: data.moneda || "USD",
        fechaLlegadaAprox: data.fechaLlegadaAprox ? new Date(data.fechaLlegadaAprox) : null,
        countryId: country.id,
        items: {
          create: data.items.map(item => ({
            nombreProduct: item.nombreProduct,
            cantidad: item.cantidad,
            tipoProduct: item.tipoProduct,
            verificado: false
          }))
        }
      }
    });

    // Log action
    await prisma.auditLog.create({
      data: {
        userId: session.id,
        accion: `Generada OC Exterior N° ${data.nroOrden} a ${data.proveedor} con ${data.items.length} ítems.`,
      }
    });

    revalidatePath("/oc-exterior");
    revalidatePath("/compras");
    return { success: true, order };
  } catch (error: any) {
    console.error("Error creating foreign order:", error);
    return { success: false, error: "Error al registrar la orden exterior." };
  }
}

export async function updateOrderItemVerification(itemId: string, verificado: boolean) {
  try {
    const updated = await prisma.foreignOrderItem.update({
      where: { id: itemId },
      data: { verificado }
    });
    return { success: true, item: updated };
  } catch (error: any) {
    console.error("Error updating item verification:", error);
    return { success: false, error: "Error al actualizar checklist de ítem." };
  }
}

export async function confirmForeignOrderArrival(
  orderId: string,
  invoiceData?: {
    montoFinal?: number;
    moneda?: string;
    fileBase64?: string;
    fileName?: string;
  }
) {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: "Usuario no autenticado." };

    const country = await getActiveCountry();
    if (!country) return { success: false, error: "Región no seleccionada." };

    const order = await prisma.foreignOrder.findUnique({
      where: { id: orderId },
      include: { items: true }
    });

    if (!order) return { success: false, error: "Orden exterior no encontrada." };
    if (order.estado === "VERIFICADO") return { success: false, error: "Esta orden ya fue arribada y controlada." };

    // Process file if present in invoiceData
    let finalArchivoUrl: string | null = null;
    if (invoiceData?.fileBase64 && invoiceData?.fileName) {
      const uploadsDir = path.join(process.cwd(), "public", "uploads", "imports");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const fileExtension = path.extname(invoiceData.fileName);
      const uniqueFileName = `import_${Date.now()}${fileExtension}`;
      const filePath = path.join(uploadsDir, uniqueFileName);

      const base64Data = invoiceData.fileBase64.replace(/^data:.*?;base64,/, "");
      fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));
      finalArchivoUrl = `/uploads/imports/${uniqueFileName}`;
    }

    const finalMonto = invoiceData?.montoFinal !== undefined ? Number(invoiceData.montoFinal) : order.montoFinal;
    const finalMoneda = invoiceData?.moneda || order.moneda;

    // Start Transaction to set order as verified, add items to stock, and record ImportInvoice
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // 1. Update Foreign Order status
      const updated = await tx.foreignOrder.update({
        where: { id: orderId },
        data: { estado: "VERIFICADO" }
      });

      // 2. Loop through only VERIFIED items and update Stock (Products)
      const verifiedItems = order.items.filter(i => i.verificado && i.cantidad > 0);
      for (const item of verifiedItems) {
        let prod = await tx.product.findFirst({
          where: {
            nombre: item.nombreProduct,
            countryId: country.id
          }
        });

        if (prod) {
          await tx.product.update({
            where: { id: prod.id },
            data: { cantidad: prod.cantidad + item.cantidad }
          });
        } else {
          await tx.product.create({
            data: {
              nombre: item.nombreProduct,
              tipo: item.tipoProduct,
              cantidad: item.cantidad,
              alertaMinima: 5,
              alertaCritica: 2,
              countryId: country.id
            }
          });
        }
      }

      // 3. Create ImportInvoice and its items automatically to track expense
      await tx.importInvoice.create({
        data: {
          nroFactura: order.nroOrden,
          proveedor: order.proveedor,
          montoFinal: finalMonto,
          moneda: finalMoneda,
          archivoUrl: finalArchivoUrl,
          countryId: country.id,
          items: {
            create: verifiedItems.map(item => ({
              nombreProduct: item.nombreProduct,
              cantidad: item.cantidad,
              tipoProduct: item.tipoProduct
            }))
          }
        }
      });

      // Log in audit trail
      await tx.auditLog.create({
        data: {
          userId: session.id,
          accion: `Confirmado arribo de OC Exterior N° ${order.nroOrden} y generada Factura de Importación vinculada por ${finalMoneda} ${finalMonto}.`,
        }
      });

      return updated;
    });

    revalidatePath("/oc-exterior");
    revalidatePath("/compras");
    revalidatePath("/stock");
    return { success: true, order: updatedOrder };
  } catch (error: any) {
    console.error("Error confirming foreign order arrival:", error);
    return { success: false, error: error.message || "Error al procesar el arribo de importación." };
  }
}

export async function deleteForeignOrder(orderId: string) {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: "Usuario no autenticado." };
    if (session.rol !== "ADMIN") {
      return { success: false, error: "No autorizado. Solo los administradores pueden eliminar registros del historial." };
    }

    const order = await prisma.foreignOrder.findUnique({
      where: { id: orderId }
    });

    if (!order) return { success: false, error: "Orden exterior no encontrada." };

    await prisma.$transaction(async (tx) => {
      await tx.foreignOrder.delete({
        where: { id: orderId }
      });

      await tx.auditLog.create({
        data: {
          userId: session.id,
          accion: `Eliminada la Orden de Compra Exterior N° ${order.nroOrden} del proveedor ${order.proveedor} del historial.`
        }
      });
    });

    revalidatePath("/oc-exterior");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting foreign order:", error);
    return { success: false, error: error.message || "Error al eliminar la orden de compra exterior." };
  }
}

export async function deleteImportInvoice(id: string) {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: "Usuario no autenticado." };
    if (session.rol !== "ADMIN") {
      return { success: false, error: "No autorizado. Solo los administradores pueden borrar facturas de importación del historial." };
    }

    const invoice = await prisma.importInvoice.findUnique({
      where: { id }
    });

    if (!invoice) return { success: false, error: "Factura de importación no encontrada." };

    await prisma.$transaction(async (tx) => {
      await tx.importInvoice.delete({
        where: { id }
      });

      await tx.auditLog.create({
        data: {
          userId: session.id,
          accion: `Eliminada del historial la Factura de Importación N° ${invoice.nroFactura} de ${invoice.proveedor} por ${invoice.moneda} ${invoice.montoFinal}.`
        }
      });
    });

    revalidatePath("/compras");
    revalidatePath("/oc-exterior");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting import invoice:", error);
    return { success: false, error: error.message || "Error al eliminar la factura de importación." };
  }
}


