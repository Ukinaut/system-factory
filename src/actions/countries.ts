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
    const cookieStore = await cookies();
    const token = cookieStore.get("sessionToken")?.value;

    let userRole = "OPERATOR";
    let allowedCountryCodes: string[] = [];

    if (token) {
      try {
        const decodedStr = Buffer.from(token, "base64").toString("utf-8");
        const session = JSON.parse(decodedStr);
        if (session && (session.id || session.correo)) {
          const user = await prisma.user.findFirst({
            where: {
              OR: [
                session.id ? { id: session.id } : undefined,
                session.correo ? { correo: session.correo } : undefined,
              ].filter(Boolean) as any,
            },
            include: { countries: true },
          });
          if (user) {
            userRole = user.rol;
            allowedCountryCodes = user.countries.map((c) => c.countryCode);
          }
        }
      } catch (err) {
        console.error("Error decoding session in getCountries:", err);
      }
    }

    const allActive = await prisma.country.findMany({
      where: { activo: true },
      orderBy: [
        { isPrincipal: "desc" },
        { nombre: "asc" }
      ]
    });

    // Si es ADMIN o no tiene restricciones explícitas de país, mostrar todos los países activos
    if (userRole === "ADMIN" || allowedCountryCodes.length === 0) {
      return { success: true, countries: allActive };
    }

    // De lo contrario, filtrar estrictamente los países asignados al usuario en UserCountry
    const filtered = allActive.filter((c) => allowedCountryCodes.includes(c.code));
    return { success: true, countries: filtered };
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
    const token = cookieStore.get("sessionToken")?.value;

    if (token) {
      try {
        const decodedStr = Buffer.from(token, "base64").toString("utf-8");
        const session = JSON.parse(decodedStr);
        if (session && (session.id || session.correo)) {
          const user = await prisma.user.findFirst({
            where: {
              OR: [
                session.id ? { id: session.id } : undefined,
                session.correo ? { correo: session.correo } : undefined,
              ].filter(Boolean) as any,
            },
            include: { countries: true },
          });

          if (user && user.rol !== "ADMIN") {
            const allowedCodes = user.countries.map((c) => c.countryCode);
            if (allowedCodes.length > 0 && !allowedCodes.includes(code)) {
              return {
                success: false,
                error: `Acceso Denegado: Su usuario solo tiene permiso para acceder a las regiones: [${allowedCodes.join(", ")}].`,
              };
            }
          }
        }
      } catch (err) {
        console.error("Error validating user country permissions in selectCountryAction:", err);
      }
    }

    cookieStore.set("selectedCountry", code, {
      httpOnly: false,
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
