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

export async function getEquiposYServicios() {
  try {
    const clientes = await prisma.client.findMany({
      include: {
        equipos: true,
        services: true,
      },
      orderBy: {
        razonSocial: "asc",
      },
    });
    return { success: true, clientes };
  } catch (error: any) {
    console.error("Error getting network devices:", error);
    return { success: false, clientes: [], error: "Error al obtener equipos de telecomunicaciones." };
  }
}

export async function toggleEquipoEstado(id: string, nuevoEstado: string) {
  try {
    const session = await getSession();
    const userId = session?.id || "unknown";

    const equipo = await prisma.equipoCliente.update({
      where: { id },
      data: {
        estado: nuevoEstado,
      },
      include: {
        cliente: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        accion: `Cambiado estado del equipo ${equipo.marca} (${equipo.identificadorServicio}) del cliente ${equipo.cliente.razonSocial} a ${nuevoEstado}`,
      },
    });

    revalidatePath("/operativa");
    revalidatePath("/clientes");
    return { success: true, equipo };
  } catch (error: any) {
    console.error("Error toggling device state:", error);
    return { success: false, error: "Error al modificar estado del equipo." };
  }
}
