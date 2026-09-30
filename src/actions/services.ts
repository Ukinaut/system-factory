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

/**
 * Obtener todos los servicios y abonos mensuales de un cliente específico
 */
export async function getClientServices(clientId: string) {
  try {
    const services = await prisma.service.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, services };
  } catch (error: any) {
    console.error("Error fetching client services:", error);
    return { success: false, error: error.message || "Error al obtener servicios del cliente." };
  }
}

/**
 * Obtener todos los servicios mensuales activos de la empresa para cálculo masivo y facturación
 */
export async function getAllMonthlyServices() {
  try {
    const services = await prisma.service.findMany({
      where: { status: "ACTIVO" },
      include: {
        client: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, services };
  } catch (error: any) {
    console.error("Error fetching all monthly services:", error);
    return { success: false, error: error.message || "Error al obtener servicios de la base de datos." };
  }
}

/**
 * Crear un nuevo servicio o abono mensual para un cliente
 */
export async function createClientService(
  clientId: string,
  data: {
    nombreService: string;
    tipo?: string;
    operador?: string;
    gigasAsignados?: number;
    montoMensual: number;
    moneda?: string;
    diaCobro?: number;
    categoria?: string;
  }
) {
  try {
    const service = await prisma.service.create({
      data: {
        clientId,
        nombreService: data.nombreService.trim(),
        tipo: data.tipo || "ABONO",
        operador: data.operador || "Generico",
        gigasAsignados: data.gigasAsignados || 0,
        montoMensual: data.montoMensual,
        moneda: data.moneda || "ARS",
        diaCobro: data.diaCobro || 5,
        categoria: data.categoria || "SATELITAL",
        status: "ACTIVO",
      },
    });

    revalidatePath(`/clientes/${clientId}`);
    revalidatePath("/facturacion");
    return { success: true, service };
  } catch (error: any) {
    console.error("Error creating client service:", error);
    return { success: false, error: error.message || "Error al crear el servicio mensual." };
  }
}

/**
 * Actualizar un servicio mensual existente
 */
export async function updateClientService(
  serviceId: string,
  data: {
    nombreService?: string;
    tipo?: string;
    operador?: string;
    gigasAsignados?: number;
    montoMensual?: number;
    moneda?: string;
    diaCobro?: number;
    categoria?: string;
    status?: string;
  }
) {
  try {
    const service = await prisma.service.update({
      where: { id: serviceId },
      data: {
        ...(data.nombreService && { nombreService: data.nombreService.trim() }),
        ...(data.tipo && { tipo: data.tipo }),
        ...(data.operador && { operador: data.operador }),
        ...(data.gigasAsignados !== undefined && { gigasAsignados: data.gigasAsignados }),
        ...(data.montoMensual !== undefined && { montoMensual: data.montoMensual }),
        ...(data.moneda && { moneda: data.moneda }),
        ...(data.diaCobro !== undefined && { diaCobro: data.diaCobro }),
        ...(data.categoria && { categoria: data.categoria }),
        ...(data.status && { status: data.status }),
      },
    });

    revalidatePath(`/clientes/${service.clientId}`);
    revalidatePath("/facturacion");
    return { success: true, service };
  } catch (error: any) {
    console.error("Error updating client service:", error);
    return { success: false, error: error.message || "Error al actualizar el servicio." };
  }
}

/**
 * Eliminar / dar de baja un servicio mensual
 */
export async function deleteClientService(serviceId: string) {
  try {
    const service = await prisma.service.delete({
      where: { id: serviceId },
    });

    revalidatePath(`/clientes/${service.clientId}`);
    revalidatePath("/facturacion");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting client service:", error);
    return { success: false, error: error.message || "Error al eliminar el servicio." };
  }
}

/**
 * AUMENTO MASIVO DE TARIFAS
 * Aplica un cálculo de suba porcentual o monto fijo a todos los servicios activos
 */
export async function applyMassPriceIncrease(params: {
  porcentaje?: number;
  montoFijo?: number;
  moneda?: string;
  categoria?: string;
}) {
  try {
    const session = await getSession();
    if (!session || session.rol !== "ADMIN") {
      return { success: false, error: "Permiso denegado. Solo administradores pueden aplicar aumentos masivos." };
    }

    const whereCondition: any = { status: "ACTIVO" };
    if (params.moneda && params.moneda !== "TODAS") {
      whereCondition.moneda = params.moneda;
    }
    if (params.categoria && params.categoria !== "TODAS") {
      whereCondition.categoria = params.categoria;
    }

    const services = await prisma.service.findMany({
      where: whereCondition,
    });

    let updatedCount = 0;
    for (const s of services) {
      let nuevoMonto = s.montoMensual;
      if (params.porcentaje && params.porcentaje > 0) {
        nuevoMonto = Math.round((nuevoMonto * (1 + params.porcentaje / 100)) * 100) / 100;
      }
      if (params.montoFijo && params.montoFijo > 0) {
        nuevoMonto = Math.round((nuevoMonto + params.montoFijo) * 100) / 100;
      }

      if (nuevoMonto !== s.montoMensual) {
        await prisma.service.update({
          where: { id: s.id },
          data: { montoMensual: nuevoMonto },
        });
        updatedCount++;
      }
    }

    revalidatePath("/facturacion");
    revalidatePath("/clientes");
    return { success: true, updatedCount, totalEvaluated: services.length };
  } catch (error: any) {
    console.error("Error applying mass price increase:", error);
    return { success: false, error: error.message || "Error al aplicar el aumento masivo." };
  }
}

/**
 * FACTURACIÓN MASIVA DE ABONOS MENSUALES
 * Genera ventas y facturas para todos los clientes con abonos activos en el período especificado
 */
export async function generateBatchMonthlyInvoices(periodoKey: string) {
  try {
    const session = await getSession();
    const vendedorId = session?.id || "admin";

    // 1. Obtener servicios activos que no hayan sido facturados en este periodo
    const services = await prisma.service.findMany({
      where: {
        status: "ACTIVO",
        montoMensual: { gt: 0 },
        OR: [
          { ultimoMesFacturado: null },
          { ultimoMesFacturado: { not: periodoKey } },
        ],
      },
      include: {
        client: true,
      },
    });

    if (services.length === 0) {
      return { success: true, generatedCount: 0, message: "Todos los abonos del período ya han sido facturados." };
    }

    // Agrupar por cliente para generar 1 orden mensual por cliente con sus abonos
    const servicesByClient: Record<string, typeof services> = {};
    services.forEach(s => {
      if (!servicesByClient[s.clientId]) {
        servicesByClient[s.clientId] = [];
      }
      servicesByClient[s.clientId].push(s);
    });

    let generatedCount = 0;
    const now = new Date();

    for (const [clientId, clientServices] of Object.entries(servicesByClient)) {
      const client = clientServices[0].client;
      const totalOrden = clientServices.reduce((sum, s) => sum + s.montoMensual, 0);
      const moneda = clientServices[0].moneda || "ARS";
      const ordenNum = `ABO-${periodoKey.replace("-", "")}-${client.cuit.slice(-4)}-${Math.floor(1000 + Math.random() * 9000)}`;

      // Buscar un producto comodín para la orden o crear la orden de venta directa
      let defaultProduct = await prisma.product.findFirst({
        where: { nombre: { contains: "Abono" } },
      });
      if (!defaultProduct) {
        defaultProduct = await prisma.product.findFirst();
      }

      // Crear orden de venta
      const sale = await prisma.sale.create({
        data: {
          numeroOrden: ordenNum,
          clientId: clientId,
          vendedorId: vendedorId,
          tipo: "SERVICIO",
          tipoFactura: client.condicionIva?.toLowerCase().includes("inscripto") ? "A" : "B",
          estado: "PENDIENTE",
          moneda: moneda,
          total: totalOrden,
          puntoVenta: "TIENDA",
          observaciones: `Facturación masiva de abonos mensuales correspondiente al período ${periodoKey}`,
          details: {
            create: clientServices.map(s => ({
              productoId: defaultProduct ? defaultProduct.id : "default",
              cantidad: 1,
              precioUnitario: s.montoMensual,
              componentesSeleccionados: s.nombreService,
            })),
          },
          invoices: {
            create: {
              observacionesFacturador: `N° Factura: FAC-${ordenNum}. Facturación masiva de abonos ${periodoKey}`,
              saldoPendiente: totalOrden,
              estadoCobro: "PENDIENTE",
            },
          },
        },
      });

      // Actualizar ultimoMesFacturado en los servicios correspondientes
      for (const s of clientServices) {
        await prisma.service.update({
          where: { id: s.id },
          data: { ultimoMesFacturado: periodoKey },
        });
      }

      generatedCount++;
    }

    revalidatePath("/facturacion");
    revalidatePath("/cobranzas");
    revalidatePath("/clientes");
    return { success: true, generatedCount, totalClients: Object.keys(servicesByClient).length };
  } catch (error: any) {
    console.error("Error generating batch monthly invoices:", error);
    return { success: false, error: error.message || "Error al facturar abonos del mes." };
  }
}
