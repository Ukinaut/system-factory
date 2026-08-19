import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get("sessionToken")?.value;

  if (!token) {
    redirect("/login");
  }

  let targetUrl = "/login";
  try {
    const decodedStr = Buffer.from(token, "base64").toString("utf-8");
    const session = JSON.parse(decodedStr);
    
    const rol = session.rol;
    const permissions = session.permissions || [];

    // 1. Redirecciones por rol por defecto
    if (rol === "ADMIN") {
      targetUrl = "/admin";
    } else if (rol === "VENTAS") {
      targetUrl = "/ventas";
    } else if (rol === "TECNICO") {
      targetUrl = "/operativa";
    } else if (rol === "COBRANZAS") {
      targetUrl = "/cobranzas";
    } else if (rol === "STOCK") {
      targetUrl = "/stock";
    } else {
      // 2. Para nuevos roles (SUPERVISOR, OPERATOR, VIEWER) o personalizados,
      // redirigir al primer módulo al que tengan acceso según sus permisos.
      if (permissions.includes("VENTAS")) {
        targetUrl = "/ventas";
      } else if (permissions.includes("OPERATIVA")) {
        targetUrl = "/operativa";
      } else if (permissions.includes("STOCK")) {
        targetUrl = "/stock";
      } else if (permissions.includes("FACTURACION")) {
        targetUrl = "/facturacion";
      } else if (permissions.includes("COBRANZAS")) {
        targetUrl = "/cobranzas";
      } else if (permissions.includes("LABORATORIO")) {
        targetUrl = "/laboratorio";
      } else if (permissions.includes("CLIENTES")) {
        targetUrl = "/clientes";
      } else if (permissions.includes("BOT")) {
        targetUrl = "/bot";
      } else if (permissions.includes("ADMIN")) {
        targetUrl = "/admin";
      }
    }
  } catch (error) {
    targetUrl = "/login";
  }

  redirect(targetUrl);
}
