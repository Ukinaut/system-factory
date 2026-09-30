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
  montoCobrado: number;
  montoRetenciones?: number;
  detallesRetencion?: string;
  metodoPago: string;
  tasaCambio?: number;
  tarjetaCuotas?: number;
  tarjetaRecargo?: number;
  numeroCupon?: string;
  observaciones?: string;
  comprobanteUrl?: string;
  comprobanteRetencionUrl?: string;
  fechaPago?: string;
}) {
  try {
    const fs = require("fs");
    const path = require("path");

    // Helper para guardar archivo base64
    const saveBase64File = (base64Str: string, prefix: string) => {
      if (!base64Str || !base64Str.startsWith("data:")) return base64Str;
      try {
        const parts = base64Str.split(";base64,");
        const mime = parts[0].split(":")[1];
        const base64Data = parts[1];

        let ext = "png";
        if (mime.includes("application/pdf")) ext = "pdf";
        else if (mime.includes("image/jpeg") || mime.includes("image/jpg")) ext = "jpg";

        const fileName = `${prefix}-${data.invoiceId}-${Date.now()}.${ext}`;
        const uploadDir = path.join(process.cwd(), "public", "uploads");

        fs.mkdirSync(uploadDir, { recursive: true });
        const filePath = path.join(uploadDir, fileName);
        fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));

        return `/uploads/${fileName}`;
      } catch (e) {
        console.error(`Error saving ${prefix}:`, e);
        return null;
      }
    };

    let finalComprobanteUrl = saveBase64File(data.comprobanteUrl || "", "comprobante") || (data.comprobanteUrl || null);
    let finalRetencionUrl = saveBase64File(data.comprobanteRetencionUrl || "", "retencion") || (data.comprobanteRetencionUrl || null);

    const result = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.findUnique({
        where: { id: data.invoiceId },
        include: {
          sale: true,
          payments: true,
        },
      });

      if (!inv) throw new Error("Factura no encontrada.");

      const montoCobradoNum = Number(data.montoCobrado) || 0;
      const montoRetencionesNum = Number(data.montoRetenciones) || 0;
      const cobroTotalEstaTransaccion = montoCobradoNum + montoRetencionesNum;

      // Crear registro de pago
      const pay = await tx.payment.create({
        data: {
          invoiceId: data.invoiceId,
          montoCobrado: montoCobradoNum,
          montoRetenciones: montoRetencionesNum,
          detallesRetencion: data.detallesRetencion || null,
          metodoPago: data.metodoPago,
          tasaCambio: data.tasaCambio ? Number(data.tasaCambio) : null,
          tarjetaCuotas: data.tarjetaCuotas ? Number(data.tarjetaCuotas) : null,
          tarjetaRecargo: data.tarjetaRecargo ? Number(data.tarjetaRecargo) : null,
          numeroCupon: data.numeroCupon || null,
          observaciones: data.observaciones || null,
          comprobanteUrl: finalComprobanteUrl,
          comprobanteRetencionUrl: finalRetencionUrl,
          fechaPago: data.fechaPago ? new Date(data.fechaPago) : new Date(),
        },
      });

      // Calcular acumulado pagado
      const acumuladoPrevio = inv.payments.reduce(
        (acc, p) => acc + (p.montoCobrado || 0) + (p.montoRetenciones || 0),
        0
      );

      const totalAcumulado = acumuladoPrevio + cobroTotalEstaTransaccion;
      const totalFactura = inv.sale.total;
      const nuevoSaldo = Math.max(0, totalFactura - totalAcumulado);
      const nuevoEstado = nuevoSaldo <= 0.05 ? "PAGADO" : "PARCIAL";

      // Actualizar Factura
      await tx.invoice.update({
        where: { id: data.invoiceId },
        data: {
          saldoPendiente: nuevoSaldo,
          estadoCobro: nuevoEstado,
        },
      });

      // Registrar Auditoría
      await tx.auditLog.create({
        data: {
          userId: inv.sale.vendedorId,
          accion: `Pago de $${montoCobradoNum} registrado (Retenciones: $${montoRetencionesNum}) para Orden ${inv.sale.numeroOrden}. Método: ${data.metodoPago}. Estado resultante: ${nuevoEstado}`,
        },
      });

      return pay;
    });

    revalidatePath("/cobranzas");
    revalidatePath("/estado-pedidos");
    return { success: true, payment: result };
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

export async function getIssuedInvoices() {
  try {
    const invoices = await prisma.invoice.findMany({
      include: {
        sale: {
          include: {
            client: true,
            vendedor: { select: { id: true, nombre: true } },
            details: { include: { producto: true } }
          }
        },
        payments: true
      },
      orderBy: { fecha: "desc" }
    });
    return { success: true, invoices };
  } catch (error: any) {
    console.error("Error fetching issued invoices:", error);
    return { success: false, invoices: [], error: "Error al obtener historial de facturas emitidas." };
  }
}

export async function createDirectInvoice(data: {
  clientId: string;
  tipoFactura: string;
  moneda: string;
  montoTotal: number;
  observaciones: string;
  archivoUrl?: string;
  items: { descripcion: string; cantidad: number; precioUnitario: number }[];
}) {
  try {
    const adminUser = await prisma.user.findFirst({ where: { rol: "ADMIN" } });
    if (!adminUser) return { success: false, error: "No se encontró usuario admin registrado." };

    const defaultProduct = await prisma.product.findFirst();
    if (!defaultProduct) return { success: false, error: "No hay productos en el catálogo para asociar." };

    const countSales = await prisma.sale.count();
    const numeroOrden = `FDIR-${(countSales + 1).toString().padStart(6, "0")}`;

    const invoice = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          numeroOrden,
          clientId: data.clientId,
          vendedorId: adminUser.id,
          tipo: "SERVICIO",
          tipoFactura: data.tipoFactura,
          estado: "FACTURADO",
          moneda: data.moneda || "ARS",
          total: data.montoTotal,
          puntoVenta: "DIRECTO",
          tipoEntrega: "DIGITAL",
          observaciones: data.observaciones || "Factura emitida directamente desde el panel de Facturación",
          details: {
            create: data.items.map((item) => ({
              productoId: defaultProduct.id,
              cantidad: item.cantidad || 1,
              precioUnitario: item.precioUnitario || 0
            }))
          }
        }
      });

      const inv = await tx.invoice.create({
        data: {
          saleId: sale.id,
          archivoUrl: data.archivoUrl || "/facturas/factura-mock.pdf",
          observacionesFacturador: `Emisión directa. ${data.observaciones}`
        }
      });

      await tx.auditLog.create({
        data: {
          userId: adminUser.id,
          accion: `EMISION_DIRECTA_FACTURA: ${numeroOrden} a cliente ${data.clientId} por $${data.montoTotal}`
        }
      });

      return inv;
    });

    revalidatePath("/facturacion");
    revalidatePath("/cobranzas");
    return { success: true, invoice };
  } catch (error: any) {
    console.error("Error creating direct invoice:", error);
    return { success: false, error: error.message };
  }
}

export async function generateRecurringInvoicesForMonth() {
  try {
    const adminUser = await prisma.user.findFirst({ where: { rol: "ADMIN" } });
    if (!adminUser) return { success: false, error: "No hay usuario admin." };

    const defaultProduct = await prisma.product.findFirst();
    if (!defaultProduct) return { success: false, error: "No hay productos en catálogo." };

    const clientsWithServices = await prisma.client.findMany({
      where: {
        services: {
          some: { status: "ACTIVO" }
        }
      },
      include: { services: { where: { status: "ACTIVO" } } }
    });

    let generatedCount = 0;

    for (const client of clientsWithServices) {
      const countSales = await prisma.sale.count();
      const numeroOrden = `ABN-${(countSales + 1).toString().padStart(6, "0")}`;
      
      const totalServices = client.services.reduce((acc, s) => acc + (s.gigasAsignados * 150), 45000);

      const sale = await prisma.sale.create({
        data: {
          numeroOrden,
          clientId: client.id,
          vendedorId: adminUser.id,
          tipo: "SERVICIO",
          tipoFactura: "A",
          estado: "PENDIENTE",
          moneda: "ARS",
          total: totalServices,
          puntoVenta: "RECURRENTE",
          tipoEntrega: "DIGITAL",
          observaciones: `Factura mensual por abono recurrente de servicios activos (${client.services.length} servicio/s)`,
          details: {
            create: client.services.map((s) => ({
              productoId: defaultProduct.id,
              cantidad: 1,
              precioUnitario: s.gigasAsignados * 150 || 45000
            }))
          }
        }
      });

      generatedCount++;
    }

    revalidatePath("/facturacion");
    return { success: true, generatedCount };
  } catch (error: any) {
    console.error("Error generating recurring invoices:", error);
    return { success: false, error: error.message };
  }
}

