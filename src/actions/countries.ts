"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

const DEFAULT_COUNTRIES = [
  { code: "AR", nombre: "Argentina", isPrincipal: true, activo: true },
  { code: "ES", nombre: "España", isPrincipal: false, activo: true },
  { code: "CO", nombre: "Colombia", isPrincipal: false, activo: true },
];

async function checkAndSeedCountries() {
  const count = await prisma.country.count();
  if (count === 0) {
    for (const c of DEFAULT_COUNTRIES) {
      await prisma.country.create({
        data: c,
      });
    }
  }
}

export async function getCountries() {
  try {
    await checkAndSeedCountries();
    const countries = await prisma.country.findMany({
      where: { activo: true },
      orderBy: [
        { isPrincipal: "desc" },
        { nombre: "asc" }
      ]
    });
    return { success: true, countries };
  } catch (error) {
    console.error("Error fetching countries:", error);
    return { success: false, countries: [], error: "Error al obtener países." };
  }
}

export async function getAllCountriesAdmin() {
  try {
    await checkAndSeedCountries();
    const countries = await prisma.country.findMany({
      orderBy: [
        { isPrincipal: "desc" },
        { nombre: "asc" }
      ]
    });
    return { success: true, countries };
  } catch (error) {
    console.error("Error fetching all countries for admin:", error);
    return { success: false, countries: [], error: "Error al obtener países de administración." };
  }
}

export async function createCountry(data: {
  code: string;
  nombre: string;
  isPrincipal: boolean;
  activo: boolean;
}) {
  try {
    // Si se marca como principal, desmarcar otros principales
    if (data.isPrincipal) {
      await prisma.country.updateMany({
        where: { isPrincipal: true },
        data: { isPrincipal: false }
      });
    }

    const country = await prisma.country.create({
      data: {
        code: data.code.toUpperCase().trim(),
        nombre: data.nombre.trim(),
        isPrincipal: data.isPrincipal,
        activo: data.activo,
      }
    });

    revalidatePath("/admin");
    return { success: true, country };
  } catch (error: any) {
    console.error("Error creating country:", error);
    if (error.code === "P2002") {
      return { success: false, error: "Ya existe un país con ese código." };
    }
    return { success: false, error: "Error de servidor al crear país." };
  }
}

export async function updateCountry(
  id: string,
  data: {
    code: string;
    nombre: string;
    isPrincipal: boolean;
    activo: boolean;
  }
) {
  try {
    // Si se marca como principal, desmarcar otros principales
    if (data.isPrincipal) {
      await prisma.country.updateMany({
        where: { isPrincipal: true, id: { not: id } },
        data: { isPrincipal: false }
      });
    }

    await prisma.country.update({
      where: { id },
      data: {
        code: data.code.toUpperCase().trim(),
        nombre: data.nombre.trim(),
        isPrincipal: data.isPrincipal,
        activo: data.activo,
      }
    });

    revalidatePath("/admin");
    return { success: true };
  } catch (error: any) {
    console.error("Error updating country:", error);
    if (error.code === "P2002") {
      return { success: false, error: "Ya existe un país con ese código." };
    }
    return { success: false, error: "Error de servidor al actualizar país." };
  }
}

export async function deleteCountry(id: string) {
  try {
    await prisma.country.delete({
      where: { id }
    });
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("Error deleting country:", error);
    return { success: false, error: "Error de servidor al eliminar país." };
  }
}

export async function selectCountryAction(code: string) {
  try {
    const cookieStore = await cookies();
    cookieStore.set("selectedCountry", code, {
      httpOnly: false, // Permitir acceso en cliente si se necesita
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365, // 1 año
      path: "/"
    });
    return { success: true };
  } catch (error) {
    console.error("Error setting country cookie:", error);
    return { success: false, error: "Error al guardar el país." };
  }
}

export async function clearSelectedCountryAction() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("selectedCountry");
    return { success: true };
  } catch (error) {
    console.error("Error clearing country cookie:", error);
    return { success: false, error: "Error al limpiar la selección de país." };
  }
}

export async function getSelectedCountry() {
  try {
    const cookieStore = await cookies();
    return cookieStore.get("selectedCountry")?.value || null;
  } catch (error) {
    console.error("Error getting country cookie:", error);
    return null;
  }
}
