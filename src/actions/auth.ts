"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/hash";

// Cuentas por defecto para el prototipo (auto-seed al base de datos)
const DEFAULT_ACCOUNTS: Record<string, {
  nombre: string;
  pass: string;
  rol: string;
  cuit: string;
  permissions: string[];
}> = {
  "admin@systemfactory.com": {
    nombre: "Administrador",
    pass: "admin123",
    rol: "ADMIN",
    cuit: "20111111112",
    permissions: ["VENTAS", "CLIENTES", "FACTURACION", "COBRANZAS", "OPERATIVA", "ENVIOS", "STOCK", "LABORATORIO", "BOT", "ADMIN"]
  },
  "ventas@systemfactory.com": {
    nombre: "Ejecutivo Ventas",
    pass: "ventas123",
    rol: "VENTAS",
    cuit: "20111111113",
    permissions: ["VENTAS", "CLIENTES", "FACTURACION"]
  },
  "tecnico@systemfactory.com": {
    nombre: "Soporte Técnico",
    pass: "tecnico123",
    rol: "TECNICO",
    cuit: "20111111114",
    permissions: ["OPERATIVA", "ENVIOS", "LABORATORIO"]
  },
  "cobranzas@systemfactory.com": {
    nombre: "Agente Cobranzas",
    pass: "cobranzas123",
    rol: "COBRANZAS",
    cuit: "20111111115",
    permissions: ["FACTURACION", "COBRANZAS"]
  },
  "stock@systemfactory.com": {
    nombre: "Jefe Depósito",
    pass: "stock123",
    rol: "STOCK",
    cuit: "20111111116",
    permissions: ["ENVIOS", "STOCK"]
  }
};

export async function loginAction(prevState: any, formData: FormData) {
  const correoInput = (formData.get("correo") as string)?.toLowerCase().trim();
  const password = formData.get("password") as string;

  if (!correoInput || !password) {
    return { error: "Por favor complete todos los campos." };
  }

  let dbUser = await prisma.user.findUnique({
    where: { correo: correoInput },
    include: { permissions: true }
  });

  // Si el usuario no existe en la base de datos, ver si es una cuenta de prueba para auto-seeding
  if (!dbUser) {
    const defaultAcc = DEFAULT_ACCOUNTS[correoInput];
    if (defaultAcc && defaultAcc.pass === password) {
      try {
        dbUser = await prisma.user.create({
          data: {
            nombre: defaultAcc.nombre,
            correo: correoInput,
            cuit_dni: defaultAcc.cuit,
            contrasenaHash: hashPassword(defaultAcc.pass),
            rol: defaultAcc.rol,
            permissions: {
              create: defaultAcc.permissions.map(p => ({
                areaPermitida: p
              }))
            }
          },
          include: { permissions: true }
        });
      } catch (err) {
        console.error("Error al crear cuenta por defecto en DB:", err);
        // Fallback a sesión simulada si falla la base de datos
        dbUser = {
          id: Math.random().toString(36).substring(7),
          nombre: defaultAcc.nombre,
          correo: correoInput,
          cuit_dni: defaultAcc.cuit,
          contrasenaHash: "",
          rol: defaultAcc.rol,
          createdAt: new Date(),
          updatedAt: new Date(),
          permissions: defaultAcc.permissions.map(p => ({ id: "", userId: "", areaPermitida: p }))
        } as any;
      }
    }
  }

  // Si existe en la base de datos, validar la contraseña hasheada
  if (dbUser) {
    const inputHash = hashPassword(password);
    // Para el fallback simulado sin contraseña en hash, permitimos acceso directo si coincide el default
    const isMockMatch = DEFAULT_ACCOUNTS[correoInput] && DEFAULT_ACCOUNTS[correoInput].pass === password;
    
    if (dbUser.contrasenaHash === inputHash || isMockMatch) {
      // Codificar la sesión como Base64
      const sessionData = {
        id: dbUser.id,
        nombre: dbUser.nombre,
        correo: dbUser.correo,
        rol: dbUser.rol,
        permissions: dbUser.permissions.map(p => p.areaPermitida)
      };

      const sessionString = Buffer.from(JSON.stringify(sessionData)).toString("base64");

      const cookieStore = await cookies();
      cookieStore.set("sessionToken", sessionString, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7, // 1 semana
        path: "/"
      });

      redirect("/");
    }
  }

  return { error: "Credenciales inválidas. Por favor intente de nuevo." };
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("sessionToken");
  redirect("/login");
}
