import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const token = request.cookies.get("sessionToken")?.value;
  const selectedCountry = request.cookies.get("selectedCountry")?.value;
  const path = request.nextUrl.pathname;

  // Redireccionar a selección de país si no está seleccionada la subdivisión
  if (!selectedCountry && path !== "/select-country" && !path.includes(".")) {
    return NextResponse.redirect(new URL("/select-country", request.url));
  }

  // Rutas públicas
  if (
    path.startsWith("/login") || 
    path.startsWith("/select-country") || 
    path.startsWith("/api/public") || 
    path.includes(".")
  ) {
    if (token && path.startsWith("/login")) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // Si no hay token, enviar al login
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    // Usar atob() en lugar de Buffer para compatibilidad con Edge Runtime
    const decodedStr = typeof Buffer !== "undefined" ? Buffer.from(token, "base64").toString("utf-8") : atob(token);
    const session = JSON.parse(decodedStr);
    const { rol } = session;

    // Matriz de permisos RBAC
    // admin puede ver todo.
    if (rol === "ADMIN") {
      return NextResponse.next();
    }

    // Reglas específicas por rol
    if (rol === "VENTAS") {
      const allowedPaths = ["/ventas", "/clientes", "/facturacion"];
      const isAllowed = allowedPaths.some(p => path.startsWith(p)) || path === "/";
      if (!isAllowed) return NextResponse.redirect(new URL("/", request.url));
    }

    if (rol === "TECNICO") {
      const allowedPaths = ["/operativa", "/laboratorio", "/envios"];
      const isAllowed = allowedPaths.some(p => path.startsWith(p)) || path === "/";
      if (!isAllowed) return NextResponse.redirect(new URL("/", request.url));
    }

    if (rol === "COBRANZAS") {
      const allowedPaths = ["/cobranzas", "/facturacion"];
      const isAllowed = allowedPaths.some(p => path.startsWith(p)) || path === "/";
      if (!isAllowed) return NextResponse.redirect(new URL("/", request.url));
    }

    if (rol === "STOCK") {
      const allowedPaths = ["/stock", "/envios"];
      const isAllowed = allowedPaths.some(p => path.startsWith(p)) || path === "/";
      if (!isAllowed) return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
  } catch (error) {
    // Si la cookie es inválida o throwea (ej: Buffer not defined), forzar login
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("sessionToken");
    return response;
  }
}

// Configurar en qué rutas se ejecuta el proxy
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
