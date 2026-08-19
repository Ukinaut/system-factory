"use server";

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function createClient(data: {
  cuit: string;
  razonSocial: string;
  telefono: string;
  correo: string;
  direccion: string;
}) {
  try {
    const client = await prisma.client.create({
      data: {
        cuit: data.cuit,
        razonSocial: data.razonSocial,
        telefono: data.telefono,
        correo: data.correo,
        direccion: data.direccion,
      }
    });
    return { success: true, client };
  } catch (error: any) {
    console.error("Error creating client:", error);
    if (error.code === 'P2002') {
      return { success: false, error: "El CUIT o el Correo ya se encuentra registrado." };
    }
    // Devolver el error real para justificar por qué falló
    const detailedError = error instanceof Error ? error.message : String(error);
    return { success: false, error: "Error de sistema: " + detailedError.substring(0, 150) + "..." };
  }
}
