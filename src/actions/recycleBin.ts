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

export async function getRecycleBinItems() {
  try {
    const items = await prisma.recycleBinItem.findMany({
      orderBy: {
        deletedAt: "desc",
      },
    });
    return { success: true, items };
  } catch (error: any) {
    console.error("Error fetching recycle bin items:", error);
    return { success: false, items: [], error: "Error al cargar la papelera de reciclaje." };
  }
}

export async function addToRecycleBin(data: {
  entityType: string;
  entityId: string;
  title: string;
  subtitle?: string;
  payload: any;
}) {
  try {
    const session = await getSession();
    const item = await prisma.recycleBinItem.create({
      data: {
        entityType: data.entityType,
        entityId: data.entityId,
        title: data.title,
        subtitle: data.subtitle || null,
        deletedByUserId: session?.id || null,
        deletedByName: session?.nombre ? `${session.nombre} (${session.rol || "USUARIO"})` : "Sistema",
        payload: JSON.stringify(data.payload),
      },
    });
    revalidatePath("/admin");
    return { success: true, item };
  } catch (error: any) {
    console.error("Error adding to recycle bin:", error);
    return { success: false, error: "Error al archivar en papelera." };
  }
}

export async function restoreRecycleBinItem(id: string) {
  try {
    const session = await getSession();
    if (session?.rol !== "ADMIN") {
      return { success: false, error: "No autorizado. Solo administradores pueden restaurar elementos." };
    }

    const item = await prisma.recycleBinItem.findUnique({
      where: { id },
    });

    if (!item) {
      return { success: false, error: "Elemento no encontrado en la papelera." };
    }

    const payload = JSON.parse(item.payload);

    await prisma.$transaction(async (tx) => {
      switch (item.entityType) {
        case "CLIENT": {
          const { sales, quotes, claims, services, equipos, events, calendarEvents, subClients, ...clientData } = payload;
          await tx.client.create({
            data: clientData,
          });
          break;
        }

        case "SALE": {
          const { details, invoices, shipping, observations, client, vendedor, ...saleData } = payload;
          await tx.sale.create({
            data: saleData,
          });

          if (details && Array.isArray(details)) {
            for (const d of details) {
              const { producto, sale, ...detailData } = d;
              await tx.saleDetail.create({ data: detailData });
            }
          }
          break;
        }

        case "SHIPPING": {
          const { sale, ...shipData } = payload;
          await tx.shipping.create({
            data: shipData,
          });
          break;
        }

        case "PRODUCT": {
          const { saleDetails, country, ...prodData } = payload;
          await tx.product.create({
            data: prodData,
          });
          break;
        }

        case "CLAIM": {
          const { client, ...claimData } = payload;
          await tx.claim.create({
            data: claimData,
          });
          break;
        }

        case "QUOTE": {
          const { client, vendedor, ...quoteData } = payload;
          await tx.quote.create({
            data: quoteData,
          });
          break;
        }

        case "INVOICE": {
          const { sale, ...invoiceData } = payload;
          await tx.invoice.create({
            data: invoiceData,
          });
          break;
        }

        default: {
          throw new Error(`Tipo de entidad no soportada para restauración: ${item.entityType}`);
        }
      }

      await tx.recycleBinItem.delete({
        where: { id },
      });
    });

    revalidatePath("/admin");
    revalidatePath("/clientes");
    revalidatePath("/ventas");
    revalidatePath("/facturacion");
    revalidatePath("/cobranzas");
    revalidatePath("/envios");
    revalidatePath("/stock");
    revalidatePath("/laboratorio");

    return { success: true };
  } catch (error: any) {
    console.error("Error restoring recycle bin item:", error);
    return { success: false, error: error.message || "Error al restaurar el elemento." };
  }
}

export async function permanentlyDeleteRecycleBinItem(id: string) {
  try {
    const session = await getSession();
    if (session?.rol !== "ADMIN") {
      return { success: false, error: "No autorizado." };
    }

    await prisma.recycleBinItem.delete({
      where: { id },
    });

    revalidatePath("/admin");
    return { success: true };
  } catch (error: any) {
    console.error("Error purging recycle bin item:", error);
    return { success: false, error: error.message || "Error al eliminar definitivamente." };
  }
}

export async function emptyRecycleBin() {
  try {
    const session = await getSession();
    if (session?.rol !== "ADMIN") {
      return { success: false, error: "No autorizado." };
    }

    await prisma.recycleBinItem.deleteMany({});
    revalidatePath("/admin");
    return { success: true };
  } catch (error: any) {
    console.error("Error emptying recycle bin:", error);
    return { success: false, error: "Error al vaciar la papelera." };
  }
}
