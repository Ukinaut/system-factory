"use server";

import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/hash";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

export async function getUsers() {
  try {
    const users = await prisma.user.findMany({
      include: {
        permissions: true,
        countries: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return { success: true, users };
  } catch (error) {
    console.error("Error fetching users:", error);
    return { success: false, users: [], error: "Error de servidor al obtener usuarios." };
  }
}

export async function createUser(data: {
  nombre: string;
  correo: string;
  cuit_dni: string;
  contrasena: string;
  rol: string;
  permissions: string[];
  countries?: string[];
}) {
  try {
    const contrasenaHash = hashPassword(data.contrasena);
    const user = await prisma.user.create({
      data: {
        nombre: data.nombre,
        correo: data.correo,
        cuit_dni: data.cuit_dni,
        contrasenaHash,
        rol: data.rol,
        permissions: {
          create: data.permissions.map((p) => ({
            areaPermitida: p,
          })),
        },
        countries: data.countries && data.countries.length > 0 ? {
          create: data.countries.map((c) => ({
            countryCode: c,
          })),
        } : undefined,
      },
      include: {
        permissions: true,
        countries: true,
      }
    });
    revalidatePath("/admin");
    return { success: true, user };
  } catch (error: any) {
    console.error("Error creating user:", error);
    if (error.code === "P2002") {
      return { success: false, error: "El correo o CUIT/DNI ya se encuentra registrado." };
    }
    return { success: false, error: "Error de servidor al crear usuario." };
  }
}

export async function updateUser(
  id: string,
  data: {
    nombre: string;
    correo: string;
    cuit_dni: string;
    contrasena?: string;
    rol: string;
    permissions: string[];
    countries?: string[];
  }
) {
  try {
    const updateData: any = {
      nombre: data.nombre,
      correo: data.correo,
      cuit_dni: data.cuit_dni,
      rol: data.rol,
    };

    if (data.contrasena && data.contrasena.trim() !== "") {
      updateData.contrasenaHash = hashPassword(data.contrasena);
    }

    await prisma.$transaction([
      prisma.operatorPermission.deleteMany({
        where: { userId: id },
      }),
      prisma.userCountry.deleteMany({
        where: { userId: id },
      }),
      prisma.user.update({
        where: { id },
        data: {
          ...updateData,
          permissions: {
            create: data.permissions.map((p) => ({
              areaPermitida: p,
            })),
          },
          countries: data.countries && data.countries.length > 0 ? {
            create: data.countries.map((c) => ({
              countryCode: c,
            })),
          } : undefined,
        },
      }),
    ]);

    revalidatePath("/admin");
    return { success: true };
  } catch (error: any) {
    console.error("Error updating user:", error);
    if (error.code === "P2002") {
      return { success: false, error: "El correo o CUIT/DNI ya se encuentra registrado." };
    }
    return { success: false, error: "Error de servidor al actualizar usuario." };
  }
}

export async function deleteUser(id: string) {
  try {
    await prisma.user.delete({
      where: { id },
    });
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("Error deleting user:", error);
    return { success: false, error: "Error de servidor al eliminar usuario." };
  }
}

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

export async function getUsersDirectory() {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Usuario no autenticado." };
    }

    const users = await prisma.user.findMany({
      include: {
        permissions: true,
        countries: true,
      },
      orderBy: {
        nombre: "asc",
      },
    });

    return { success: true, users };
  } catch (error: any) {
    console.error("Error fetching users directory:", error);
    return { success: false, error: "Error de servidor al obtener el directorio de usuarios." };
  }
}

export async function updateProfile(data: {
  nombre: string;
  correo: string;
  contrasena?: string;
}) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Usuario no autenticado." };
    }

    const updateData: any = {
      nombre: data.nombre,
      correo: data.correo,
    };

    if (data.contrasena && data.contrasena.trim() !== "") {
      updateData.contrasenaHash = hashPassword(data.contrasena);
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.id },
      data: updateData,
    });

    // Actualizar cookie de sesión con los nuevos datos
    const cookieStore = await cookies();
    const updatedSession = {
      ...session,
      nombre: updatedUser.nombre,
      correo: updatedUser.correo,
    };
    const sessionToken = Buffer.from(JSON.stringify(updatedSession)).toString("base64");
    cookieStore.set("sessionToken", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 semana
      path: "/",
    });

    revalidatePath("/perfil");
    return { success: true, user: updatedUser };
  } catch (error: any) {
    console.error("Error updating profile:", error);
    return { success: false, error: error.message || "Error al actualizar perfil." };
  }
}

export async function getCurrentUserSession() {
  try {
    const session = await getSession();
    return { success: true, session };
  } catch (error) {
    return { success: false, error: "Error al obtener la sesión." };
  }
}

export async function getAuditLogs() {
  try {
    const session = await getSession();
    if (!session || session.rol !== "ADMIN") {
      return { success: false, error: "No autorizado." };
    }

    const logs = await prisma.auditLog.findMany({
      include: {
        user: {
          select: {
            nombre: true,
            correo: true,
            rol: true,
          },
        },
      },
      orderBy: {
        fechaHora: "desc",
      },
    });

    return { success: true, logs };
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return { success: false, error: "Error de servidor al obtener historial de actividades." };
  }
}

export async function clearAuditLogs() {
  try {
    const session = await getSession();
    if (!session || session.rol !== "ADMIN") {
      return { success: false, error: "No autorizado." };
    }

    await prisma.auditLog.deleteMany();
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("Error clearing audit logs:", error);
    return { success: false, error: "Error de servidor al borrar historial de actividades." };
  }
}
