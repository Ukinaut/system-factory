import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/v1/tienda/sales -> Consultar estado de la API o listar ventas de la Tienda
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const tiendaSales = await prisma.sale.findMany({
      where: {
        OR: [
          { puntoVenta: "TIENDA" },
          { puntoVenta: "TIENDA_ONLINE" }
        ]
      },
      include: {
        client: {
          select: { razonSocial: true, correo: true, cuit: true, telefono: true }
        },
        details: {
          include: {
            producto: { select: { nombre: true, tipo: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: limit
    });

    return NextResponse.json({
      success: true,
      status: "ONLINE",
      version: "v1.0",
      totalVentas: tiendaSales.length,
      sales: tiendaSales
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/v1/tienda/sales -> Recibir Webhook o venta entrante desde la Tienda
export async function POST(request: Request) {
  try {
    // 1. Validar Bearer token o x-api-key en cabecera
    const apiKey = request.headers.get("x-api-key") || request.headers.get("authorization")?.replace("Bearer ", "");
    
    if (apiKey && apiKey !== "sk_tienda_live_aitue_factory_2026") {
      return NextResponse.json({ success: false, error: "API Key o Token inválido." }, { status: 401 });
    }

    const body = await request.json();

    const {
      clienteNombre,
      clienteEmail,
      clienteTelefono,
      clienteCuitDni,
      items,
      montoTotal,
      moneda = "ARS",
      costoEnvio = 0,
      observaciones,
      tipoFactura = "B"
    } = body;

    if (!clienteNombre || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Faltan campos obligatorios: clienteNombre e items."
      }, { status: 400 });
    }

    // 2. Buscar o crear el cliente
    let client = await prisma.client.findFirst({
      where: {
        OR: [
          clienteEmail ? { correo: clienteEmail } : {},
          clienteCuitDni ? { cuit: clienteCuitDni } : {},
          { razonSocial: clienteNombre }
        ].filter(cond => Object.keys(cond).length > 0)
      }
    });

    if (!client) {
      client = await prisma.client.create({
        data: {
          razonSocial: clienteNombre,
          correo: clienteEmail || `tienda_${Date.now()}@tienda.com`,
          telefono: clienteTelefono || "Sin registrar",
          cuit: clienteCuitDni || "20-00000000-0",
          condicionIva: "Consumidor Final",
          origen: "TIENDA_ONLINE",
          countryCode: "AR"
        }
      });
    }

    // 3. Buscar vendedor del sistema (ADMIN)
    const adminUser = await prisma.user.findFirst({
      where: { rol: "ADMIN" }
    });

    if (!adminUser) {
      return NextResponse.json({ success: false, error: "No se encontró usuario admin en el sistema." }, { status: 500 });
    }

    // 4. Buscar producto por defecto en caso de no proveer productoId válido
    const defaultProduct = await prisma.product.findFirst();
    if (!defaultProduct) {
      return NextResponse.json({ success: false, error: "No hay productos registrados en el sistema." }, { status: 400 });
    }

    // 5. Generar número de orden automático
    const countSales = await prisma.sale.count();
    const numeroOrden = `TND-${(countSales + 1).toString().padStart(6, "0")}`;

    const calculatedTotal = montoTotal || items.reduce((acc: number, item: any) => acc + ((item.precioUnitario || 0) * (item.cantidad || 1)), 0) + costoEnvio;

    const sale = await prisma.sale.create({
      data: {
        numeroOrden,
        clientId: client.id,
        vendedorId: adminUser.id,
        tipo: "ARTICULO",
        costoEnvio,
        descuento: 0,
        observaciones: observaciones || "Venta automática importada vía API Tienda",
        tipoFactura,
        estado: "PENDIENTE",
        moneda,
        total: calculatedTotal,
        puntoVenta: "TIENDA",
        tipoEntrega: "ENVIO",
        details: {
          create: items.map((item: any) => ({
            productoId: item.productoId || defaultProduct.id,
            cantidad: item.cantidad || 1,
            precioUnitario: item.precioUnitario || 0,
          }))
        }
      },
      include: {
        client: true,
        details: {
          include: {
            producto: true
          }
        }
      }
    });

    // 6. Registrar Log de Auditoría
    await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        accion: `CREAR_VENTA_TIENDA_API: ${numeroOrden} por $${calculatedTotal}`
      }
    });

    return NextResponse.json({
      success: true,
      mensaje: "Venta importada exitosamente desde Tienda Online",
      data: {
        saleId: sale.id,
        numeroOrden: sale.numeroOrden,
        cliente: client.razonSocial,
        total: sale.total,
        estado: sale.estado
      }
    }, { status: 201 });
  } catch (error: any) {
    console.error("Error al procesar webhook de venta Tienda:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
