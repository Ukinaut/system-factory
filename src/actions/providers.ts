"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getProviders() {
  try {
    const providers = await prisma.provider.findMany({
      orderBy: {
        nombre: "asc",
      },
    });
    return { success: true, providers };
  } catch (error) {
    console.error("Error fetching providers:", error);
    return { success: false, providers: [], error: "Error de servidor al obtener proveedores." };
  }
}

export async function createProvider(data: {
  nombre: string;
  servicioBrindado: string;
}) {
  try {
    const provider = await prisma.provider.create({
      data: {
        nombre: data.nombre.trim(),
        servicioBrindado: data.servicioBrindado.trim(),
      },
    });

    revalidatePath("/operativa");
    return { success: true, provider };
  } catch (error: any) {
    console.error("Error creating provider:", error);
    return { success: false, error: error.message || "Error al crear proveedor." };
  }
}

export async function updateProvider(data: {
  id: string;
  nombre: string;
  servicioBrindado: string;
}) {
  try {
    const provider = await prisma.provider.update({
      where: { id: data.id },
      data: {
        nombre: data.nombre.trim(),
        servicioBrindado: data.servicioBrindado.trim(),
      },
    });

    revalidatePath("/operativa");
    return { success: true, provider };
  } catch (error: any) {
    console.error("Error updating provider:", error);
    return { success: false, error: error.message || "Error al actualizar proveedor." };
  }
}

export async function deleteProvider(id: string) {
  try {
    const provider = await prisma.provider.delete({
      where: { id },
    });

    revalidatePath("/operativa");
    return { success: true, provider };
  } catch (error: any) {
    console.error("Error deleting provider:", error);
    return { success: false, error: error.message || "Error al eliminar proveedor." };
  }
}
