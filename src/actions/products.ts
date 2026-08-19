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

export async function getProducts(filterCountryId?: string) {
  try {
    const cookieStore = await cookies();
    const selectedCountryCode = cookieStore.get("selectedCountry")?.value || "AR";
    
    // Auto-migrar productos sin país asignado al país principal (AR)
    const arCountry = await prisma.country.findFirst({ where: { code: "AR" } });
    if (arCountry) {
      await prisma.product.updateMany({
        where: { countryId: null },
        data: { countryId: arCountry.id }
      });
    }

    // Asegurar que exista el producto "Otros" y las 5 Soluciones de Exportación en todos los países registrados
    const countriesList = await prisma.country.findMany();
    
    // Eliminar los productos obsoletos con prefijos anteriores "KIT " o "SOLUCION "
    await prisma.product.deleteMany({
      where: {
        OR: [
          { nombre: { startsWith: "KIT " } },
          { nombre: { startsWith: "SOLUCION " } }
        ]
      }
    });

    const kitsList = [
      "EXPORTACION SOLUCION BLUK BASICO",
      "EXPORTACION SOLUCION STANDARD",
      "EXPORTACION SOLUCION PLUS",
      "EXPORTACION SOLUCION PRO",
      "EXPORTACION SOLUCION ULTRA+",
      "NACIONAL STANDARD",
      "NACIONAL PRO",
      "NACIONAL ULTRA+"
    ];
    for (const country of countriesList) {
      const existingOtros = await prisma.product.findFirst({
        where: {
          nombre: "Otros",
          countryId: country.id
        }
      });
      if (!existingOtros) {
        await prisma.product.create({
          data: {
            nombre: "Otros",
            tipo: "PRODUCTO_FINAL",
            cantidad: 0,
            alertaMinima: 0,
            alertaCritica: 0,
            countryId: country.id
          }
        });
      }

      for (const kitName of kitsList) {
        const existingKit = await prisma.product.findFirst({
          where: {
            nombre: kitName,
            countryId: country.id
          }
        });
        if (!existingKit) {
          const isExport = kitName.startsWith("EXPORTACION");
          await prisma.product.create({
            data: {
              nombre: kitName,
              tipo: "PRODUCTO_FINAL",
              cantidad: 0,
              alertaMinima: 0,
              alertaCritica: 0,
              countryId: country.id,
              caracteristicas: isExport
                ? "Solución de exportación ensamblada bajo demanda a partir de componentes del stock."
                : "Solución nacional ensamblada bajo demanda a partir de componentes del stock."
            }
          });
        }
      }
    }

    let whereClause: any = {};

    if (filterCountryId === "Todos") {
      // "Todos" retorna la totalidad de productos de todos los países
      whereClause = {};
    } else if (selectedCountryCode === "AR") {
      if (filterCountryId) {
        whereClause.countryId = filterCountryId;
      } else {
        const userCountry = await prisma.country.findUnique({
          where: { code: "AR" }
        });
        whereClause.countryId = userCountry?.id || "not-found";
      }
    } else {
      const userCountry = await prisma.country.findUnique({
        where: { code: selectedCountryCode }
      });
      whereClause.countryId = userCountry?.id || "not-found";
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        country: true
      },
      orderBy: {
        nombre: "asc",
      },
    });
    return { success: true, products };
  } catch (error) {
    console.error("Error fetching products:", error);
    return { success: false, products: [], error: "Error de servidor al obtener productos." };
  }
}

export async function searchProducts(query: string) {
  try {
    const cookieStore = await cookies();
    const selectedCountryCode = cookieStore.get("selectedCountry")?.value || "AR";

    const userCountry = await prisma.country.findUnique({
      where: { code: selectedCountryCode }
    });

    let whereClause: any = {
      nombre: {
        contains: query,
      },
      countryId: userCountry?.id || "not-found",
    };

    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        country: true
      },
      orderBy: {
        nombre: "asc",
      },
      take: 10,
    });
    return { success: true, products };
  } catch (error) {
    console.error("Error searching products:", error);
    return { success: false, products: [], error: "Error al buscar productos." };
  }
}

export async function createProduct(data: {
  tipo: string;
  nombre: string;
  cantidad: number;
  alertaMinima: number;
  alertaCritica: number;
  caracteristicas?: string;
  countryId?: string;
}) {
  try {
    const cookieStore = await cookies();
    const selectedCountryCode = cookieStore.get("selectedCountry")?.value || "AR";

    let finalCountryId = data.countryId;
    if (!finalCountryId || finalCountryId === "Todos") {
      const currentCountry = await prisma.country.findFirst({
        where: { code: selectedCountryCode }
      });
      finalCountryId = currentCountry?.id;
    }

    const product = await prisma.product.create({
      data: {
        tipo: data.tipo,
        nombre: data.nombre,
        cantidad: Number(data.cantidad),
        alertaMinima: Number(data.alertaMinima),
        alertaCritica: Number(data.alertaCritica),
        caracteristicas: data.caracteristicas || null,
        countryId: finalCountryId || null,
      },
    });

    revalidatePath("/stock");
    return { success: true, product };
  } catch (error: any) {
    console.error("Error creating product:", error);
    return { success: false, error: error.message || "Error al crear el producto." };
  }
}

export async function updateProduct(data: {
  id: string;
  nombre: string;
  tipo: string;
  alertaMinima: number;
  alertaCritica: number;
  caracteristicas?: string;
  countryId?: string;
}) {
  try {
    const updateData: any = {
      nombre: data.nombre,
      tipo: data.tipo,
      alertaMinima: Number(data.alertaMinima),
      alertaCritica: Number(data.alertaCritica),
      caracteristicas: data.caracteristicas || null,
    };

    if (data.countryId && data.countryId !== "Todos") {
      updateData.countryId = data.countryId;
    }

    const product = await prisma.product.update({
      where: { id: data.id },
      data: updateData,
    });

    revalidatePath("/stock");
    return { success: true, product };
  } catch (error: any) {
    console.error("Error updating product:", error);
    return { success: false, error: error.message || "Error al actualizar el producto." };
  }
}

export async function deleteProduct(id: string) {
  try {
    const product = await prisma.product.delete({
      where: { id },
    });

    revalidatePath("/stock");
    return { success: true, product };
  } catch (error: any) {
    console.error("Error deleting product:", error);
    return { success: false, error: error.message || "Error al eliminar el producto. Asegúrese de que no esté vinculado a ventas o reparaciones." };
  }
}

export async function adjustProductStock(data: {
  id: string;
  tipo: string; // "Entrada" | "Salida"
  cantidad: number;
  justificacion: string;
  usuario: string;
}) {
  try {
    const prod = await prisma.product.findUnique({
      where: { id: data.id },
    });

    if (!prod) {
      return { success: false, error: "Producto no encontrado." };
    }

    const session = await getSession();
    let validUserId = session?.id;
    if (!validUserId) {
      const fallbackUser = await prisma.user.findFirst();
      validUserId = fallbackUser?.id;
    }

    if (!validUserId) {
      return { success: false, error: "No hay usuarios registrados en el sistema para asociar la auditoría." };
    }

    const modificador = data.tipo === "Entrada" ? Number(data.cantidad) : -Number(data.cantidad);
    const nuevaCantidad = Math.max(0, prod.cantidad + modificador);

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id: data.id },
        data: { cantidad: nuevaCantidad },
      });

      // Crear log en AuditLog usando un ID de usuario válido
      await tx.auditLog.create({
        data: {
          userId: validUserId,
          accion: `Ajuste manual de stock para ${prod.nombre} (${data.tipo}): Cantidad ${data.cantidad}. Motivo: ${data.justificacion} (Por ${data.usuario})`,
        },
      });

      return updated;
    });

    revalidatePath("/stock");
    revalidatePath("/ventas");
    return { success: true, product: result };
  } catch (error: any) {
    console.error("Error adjusting stock:", error);
    return { success: false, error: error.message || "Error al ajustar el stock." };
  }
}

export async function getStockLogs() {
  try {
    // Retorna los logs de stock filtrando de AuditLogs los que tengan que ver con stock o ventas
    const logs = await prisma.auditLog.findMany({
      where: {
        accion: {
          contains: "stock",
        },
      },
      orderBy: {
        fechaHora: "desc",
      },
      include: {
        user: true,
      },
      take: 50,
    });
    return { success: true, logs };
  } catch (error) {
    console.error("Error getting stock logs:", error);
    return { success: false, logs: [], error: "Error al obtener historial de stock." };
  }
}
