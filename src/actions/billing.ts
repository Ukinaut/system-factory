"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getPendingInvoices() {
  try {
    const sales = await prisma.sale.findMany({
      where: {
        estado: "PENDIENTE",
      },
      include: {
        client: true,
        vendedor: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return { success: true, sales };
  } catch (error: any) {
    console.error("Error fetching pending invoices:", error);
    return { success: false, sales: [], error: "Error al obtener ventas pendientes de facturar." };
  }
}

export async function createInvoice(data: {
  saleId: string;
  archivoUrl?: string;
  observacionesFacturador?: string;
}) {
  try {
    const fs = require("fs");
    const path = require("path");

    let finalArchivoUrl = "/facturas/factura-mock.pdf";

    if (data.archivoUrl) {
      if (data.archivoUrl.startsWith("data:")) {
        try {
          const parts = data.archivoUrl.split(";base64,");
          const mime = parts[0].split(":")[1];
          const base64Data = parts[1];
          
          let ext = "pdf";
          if (mime.includes("image/png")) ext = "png";
          else if (mime.includes("image/jpeg") || mime.includes("image/jpg")) ext = "jpg";
          
          const fileName = `factura-${data.saleId}-${Date.now()}.${ext}`;
          const uploadDir = path.join(process.cwd(), "public", "uploads");
          
          // Asegurar que exista el directorio de subidas
          fs.mkdirSync(uploadDir, { recursive: true });
          
          const filePath = path.join(uploadDir, fileName);
          fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));
          
          finalArchivoUrl = `/uploads/${fileName}`;
        } catch (fileError) {
          console.error("Error saving uploaded invoice file:", fileError);
          return { success: false, error: "Error al guardar el archivo de la factura." };
        }
      } else {
        finalArchivoUrl = data.archivoUrl;
      }
    }

    const invoice = await prisma.$transaction(async (tx) => {
      // 1. Crear Factura
      const inv = await tx.invoice.create({
        data: {
          saleId: data.saleId,
          archivoUrl: finalArchivoUrl,
          observacionesFacturador: data.observacionesFacturador || null,
        },
      });

      // 2. Actualizar estado de la venta
      await tx.sale.update({
        where: { id: data.saleId },
        data: {
          estado: "FACTURADO",
        },
      });

      return inv;
    });

    revalidatePath("/facturacion");
    revalidatePath("/cobranzas");
    revalidatePath("/estado-pedidos");
    return { success: true, invoice };
  } catch (error: any) {
    console.error("Error creating invoice:", error);
    return { success: false, error: error.message || "Error al emitir factura." };
  }
}

export async function getInvoicesWithPayments() {
  try {
    const invoices = await prisma.invoice.findMany({
      include: {
        sale: {
          include: {
            client: true,
            vendedor: true,
          },
        },
        payments: true,
      },
      orderBy: {
        fecha: "desc",
      },
    });
    return { success: true, invoices };
  } catch (error: any) {
    console.error("Error fetching invoices:", error);
    return { success: false, invoices: [], error: "Error al obtener facturas." };
  }
}

export async function registerPayment(data: {
  invoiceId: string;
  metodoPago: string;
  comprobanteUrl?: string;
}) {
  try {
    const fs = require("fs");
    const path = require("path");

    let finalComprobanteUrl = "/comprobantes/comprobante-mock.png";

    if (data.comprobanteUrl) {
      if (data.comprobanteUrl.startsWith("data:")) {
        try {
          const parts = data.comprobanteUrl.split(";base64,");
          const mime = parts[0].split(":")[1];
          const base64Data = parts[1];
          
          let ext = "png";
          if (mime.includes("application/pdf")) ext = "pdf";
          else if (mime.includes("image/jpeg") || mime.includes("image/jpg")) ext = "jpg";
          
          const fileName = `comprobante-${data.invoiceId}-${Date.now()}.${ext}`;
          const uploadDir = path.join(process.cwd(), "public", "uploads");
          
          // Asegurar que exista el directorio de subidas
          fs.mkdirSync(uploadDir, { recursive: true });
          
          const filePath = path.join(uploadDir, fileName);
          fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));
          
          finalComprobanteUrl = `/uploads/${fileName}`;
        } catch (fileError) {
          console.error("Error saving uploaded payment file:", fileError);
          return { success: false, error: "Error al guardar el archivo del comprobante." };
        }
      } else {
        finalComprobanteUrl = data.comprobanteUrl;
      }
    }

    const payment = await prisma.$transaction(async (tx) => {
      const pay = await tx.payment.create({
        data: {
          invoiceId: data.invoiceId,
          comprobanteUrl: finalComprobanteUrl,
          fechaPago: new Date(),
        },
      });

      // Si queremos, podemos también actualizar el log de auditoría
      // Buscamos la factura y la venta
      const inv = await tx.invoice.findUnique({
        where: { id: data.invoiceId },
        include: { sale: true },
      });

      if (inv) {
        // Registrar acción en logs
        await tx.auditLog.create({
          data: {
            userId: inv.sale.vendedorId, // Fallback al creador de la orden
            accion: `Registrado pago para factura ID ${data.invoiceId} de la venta ${inv.sale.numeroOrden}. Método: ${data.metodoPago}`,
          },
        });
      }

      return pay;
    });

    revalidatePath("/cobranzas");
    revalidatePath("/estado-pedidos");
    return { success: true, payment };
  } catch (error: any) {
    console.error("Error registering payment:", error);
    return { success: false, error: error.message || "Error al registrar el pago." };
  }
}

async function seedServicesIfEmpty() {
  try {
    const count = await prisma.service.count();
    if (count === 0) {
      const clients = await prisma.client.findMany();
      if (clients.length > 0) {
        await prisma.client.update({
          where: { id: clients[0].id },
          data: { diaFacturacion: 10 }
        });
        await prisma.service.create({
          data: {
            clientId: clients[0].id,
            tipo: "POOL",
            operador: "Telespazio",
            gigasAsignados: 500,
            status: "ACTIVO"
          }
        });
      }
      if (clients.length > 1) {
        await prisma.client.update({
          where: { id: clients[1].id },
          data: { diaFacturacion: 22 }
        });
        await prisma.service.create({
          data: {
            clientId: clients[1].id,
            tipo: "CORPORATIVO",
            operador: "Telefonica",
            gigasAsignados: 1000,
            status: "ACTIVO"
          }
        });
      }
    }
  } catch (e) {
    console.error("Error seeding services:", e);
  }
}

export async function getClientsWithServices() {
  try {
    await seedServicesIfEmpty();
    const clients = await prisma.client.findMany({
      where: {
        services: {
          some: {
            status: "ACTIVO"
          }
        }
      },
      include: {
        services: true
      }
    });
    return { success: true, clients };
  } catch (error: any) {
    console.error("Error fetching clients with services:", error);
    return { success: false, clients: [], error: "Error al obtener clientes con servicios." };
  }
}

