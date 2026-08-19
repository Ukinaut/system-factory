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

export async function getDashboardStats() {
  try {
    const session = await getSession();
    if (!session || (session.rol !== "ADMIN" && session.rol !== "SUPERVISOR")) {
      return { success: false, error: "No autorizado." };
    }

    // 1. Ventas en proceso (estado PENDIENTE)
    const salesInProcess = await prisma.sale.findMany({
      where: { estado: "PENDIENTE" },
      select: { total: true },
    });
    const pendingSalesCount = salesInProcess.length;
    const pendingSalesTotal = salesInProcess.reduce((sum, s) => sum + s.total, 0);

    // 2. Estado de despachos
    const shippings = await prisma.shipping.groupBy({
      by: ["estado"],
      _count: {
        id: true,
      },
    });

    const shippingStats = {
      paraEmpacar: 0,
      despachado: 0,
      otros: 0,
    };

    shippings.forEach((group) => {
      if (group.estado === "PARA_EMPACAR") {
        shippingStats.paraEmpacar = group._count.id;
      } else if (group.estado === "DESPACHADO") {
        shippingStats.despachado = group._count.id;
      } else {
        shippingStats.otros += group._count.id;
      }
    });

    // 3. Gastos - Solicitudes de compra
    const purchaseRequests = await prisma.purchaseRequest.findMany({
      select: {
        montoAprox: true,
        tipoArticulo: true,
        estado: true,
        createdAt: true,
      },
    });

    // Agregación de gastos por categoría
    const expensesByCategory: Record<string, number> = {};
    // Agregación de gastos por estado
    const expensesByStatus = {
      PENDIENTE: 0,
      APROBADA: 0,
      RECHAZADA: 0,
      PROCESADA: 0,
    };

    purchaseRequests.forEach((req) => {
      const cat = req.tipoArticulo || "OTROS";
      expensesByCategory[cat] = (expensesByCategory[cat] || 0) + req.montoAprox;
      
      const status = req.estado as keyof typeof expensesByStatus;
      if (status in expensesByStatus) {
        expensesByStatus[status] += req.montoAprox;
      }
    });

    // 4. Invoices (facturas de compra finalizadas)
    const [purchaseInvoices, importInvoices] = await Promise.all([
      prisma.purchaseInvoice.findMany({
        select: {
          montoFinal: true,
          moneda: true,
          createdAt: true,
        },
      }),
      prisma.importInvoice.findMany({
        select: {
          montoFinal: true,
          moneda: true,
          createdAt: true,
        },
      }),
    ]);

    let totalInvoiceARS = 0;
    let totalInvoiceUSD = 0;
    let totalImportARS = 0;
    let totalImportUSD = 0;

    purchaseInvoices.forEach((inv) => {
      if (inv.moneda === "USD") {
        totalInvoiceUSD += inv.montoFinal;
      } else {
        totalInvoiceARS += inv.montoFinal;
      }
    });

    importInvoices.forEach((inv) => {
      if (inv.moneda === "USD") {
        totalImportUSD += inv.montoFinal;
      } else if (inv.moneda === "EUR") {
        totalImportUSD += inv.montoFinal * 1.1; // Convert to USD roughly for dashboard stats
      } else {
        totalImportARS += inv.montoFinal;
      }

      // Add to expensesByCategory as IMPORTACIONES
      const amountInARS = inv.moneda === "USD" ? inv.montoFinal * 1000 : inv.moneda === "EUR" ? inv.montoFinal * 1100 : inv.montoFinal;
      expensesByCategory["IMPORTACIONES"] = (expensesByCategory["IMPORTACIONES"] || 0) + amountInARS;
    });

    // 5. Historial de gastos por mes (últimos 6 meses de solicitudes aprobadas/procesadas/pendientes)
    // Para simplificar, agruparemos por mes de creación
    const monthlyExpenses: Record<string, number> = {};
    const monthsName = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    
    // Obtener los últimos 6 meses cronológicos
    const last6Months: string[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = `${monthsName[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
      last6Months.push(label);
      monthlyExpenses[label] = 0;
    }

    purchaseRequests.forEach((req) => {
      // Solo contar gastos que no estén rechazados
      if (req.estado !== "RECHAZADA") {
        const date = new Date(req.createdAt);
        const label = `${monthsName[date.getMonth()]} ${date.getFullYear().toString().slice(-2)}`;
        if (label in monthlyExpenses) {
          monthlyExpenses[label] += req.montoAprox;
        }
      }
    });

    // Add import invoices to trend
    importInvoices.forEach((inv) => {
      const date = new Date(inv.createdAt);
      const label = `${monthsName[date.getMonth()]} ${date.getFullYear().toString().slice(-2)}`;
      if (label in monthlyExpenses) {
        const amountInARS = inv.moneda === "USD" ? inv.montoFinal * 1000 : inv.moneda === "EUR" ? inv.montoFinal * 1100 : inv.montoFinal;
        monthlyExpenses[label] += amountInARS;
      }
    });

    const monthlyTrend = last6Months.map((month) => ({
      month,
      amount: monthlyExpenses[month],
    }));

    return {
      success: true,
      data: {
        pendingSalesCount,
        pendingSalesTotal,
        shippingStats,
        expensesByCategory: Object.entries(expensesByCategory).map(([category, amount]) => ({
          category,
          amount,
        })),
        expensesByStatus,
        totalInvoiceARS,
        totalInvoiceUSD,
        totalImportARS,
        totalImportUSD,
        monthlyTrend,
      },
    };
  } catch (error: any) {
    console.error("Error generating dashboard stats:", error);
    return { success: false, error: "Error al obtener estadísticas del dashboard." };
  }
}
