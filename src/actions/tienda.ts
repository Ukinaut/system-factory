"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getTiendaSales() {
  try {
    const sales = await prisma.sale.findMany({
      where: {
        OR: [
          { puntoVenta: "TIENDA" },
          { puntoVenta: "TIENDA_ONLINE" }
        ]
      },
      include: {
        client: true,
        vendedor: { select: { id: true, nombre: true } },
        details: {
          include: {
            producto: true
          }
        },
        invoices: true
      },
      orderBy: { createdAt: "desc" }
    });

    const totalImportadoARS = sales
      .filter((s) => s.moneda === "ARS")
      .reduce((sum, s) => sum + s.total, 0);

    const totalImportadoUSD = sales
      .filter((s) => s.moneda === "USD")
      .reduce((sum, s) => sum + s.total, 0);

    return {
      success: true,
      data: {
        sales,
        totalVentas: sales.length,
        totalImportadoARS,
        totalImportadoUSD,
        ventasHoyCount: sales.filter(s => new Date(s.createdAt).toDateString() === new Date().toDateString()).length
      }
    };
  } catch (error: any) {
    console.error("Error fetching Tienda sales:", error);
    return { success: false, error: "Error al obtener las ventas de la tienda." };
  }
}

export async function createDemoTiendaSale() {
  try {
    const adminUser = await prisma.user.findFirst({
      where: { rol: "ADMIN" }
    });

    if (!adminUser) {
      return { success: false, error: "No hay un usuario admin registrado." };
    }

    const defaultProduct = await prisma.product.findFirst();
    if (!defaultProduct) {
      return { success: false, error: "No hay productos en el catálogo." };
    }

    let client = await prisma.client.findFirst({
      where: { correo: "cliente.demo@tienda-online.com" }
    });

    if (!client) {
      client = await prisma.client.create({
        data: {
          razonSocial: "Cliente E-Commerce Demo",
          correo: "cliente.demo@tienda-online.com",
          telefono: "+54 11 5555 4321",
          cuit: "20-38999888-9",
          condicionIva: "Consumidor Final",
          origen: "TIENDA_ONLINE",
          countryCode: "AR"
        }
      });
    }

    const countSales = await prisma.sale.count();
    const numeroOrden = `TND-${(countSales + 1).toString().padStart(6, "0")}`;

    const randomTotal = Math.floor(Math.random() * 80000) + 40000;

    const sale = await prisma.sale.create({
      data: {
        numeroOrden,
        clientId: client.id,
        vendedorId: adminUser.id,
        tipo: "ARTICULO",
        costoEnvio: 3500,
        descuento: 0,
        observaciones: "Venta de prueba simulada desde API Tienda Webhook",
        tipoFactura: "B",
        estado: "PENDIENTE",
        moneda: "ARS",
        total: randomTotal,
        puntoVenta: "TIENDA",
        tipoEntrega: "ENVIO",
        details: {
          create: [
            {
              productoId: defaultProduct.id,
              cantidad: 1,
              precioUnitario: randomTotal - 3500,
            }
          ]
        }
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        accion: `SIMULAR_VENTA_TIENDA: ${numeroOrden} por $${randomTotal}`
      }
    });

    revalidatePath("/tienda");
    revalidatePath("/ventas-generales");

    return { success: true, sale };
  } catch (error: any) {
    console.error("Error al simular venta de tienda:", error);
    return { success: false, error: error.message };
  }
}
