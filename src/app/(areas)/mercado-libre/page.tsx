import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import MercadoLibreDashboardClient from "./MercadoLibreDashboardClient";
import { ShieldAlert } from "lucide-react";
import Link from "next/link";

export default async function MercadoLibrePage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("sessionToken")?.value;

  if (!sessionToken) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
        <ShieldAlert className="w-16 h-16 text-rose-500" />
        <h2 className="text-2xl font-bold text-text-primary">Sesión Expirada</h2>
        <p className="text-text-muted text-sm">Por favor, inicie sesión nuevamente.</p>
        <Link href="/login" className="bg-[#0078D7] text-white px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider">
          Iniciar Sesión
        </Link>
      </div>
    );
  }

  let sessionData = null;
  try {
    const decodedStr = Buffer.from(sessionToken, "base64").toString("utf-8");
    sessionData = JSON.parse(decodedStr);
  } catch (e) {
    sessionData = null;
  }

  let hasAccess = false;
  if (sessionData && sessionData.id) {
    try {
      const liveUser = await prisma.user.findUnique({
        where: { id: sessionData.id },
        include: { permissions: true }
      });
      if (liveUser) {
        const userPermissions = liveUser.permissions.map(p => p.areaPermitida);
        if (liveUser.rol === "ADMIN" || userPermissions.includes("MERCADO_LIBRE")) {
          hasAccess = true;
        }
      }
    } catch (dbErr) {
      console.error("Error verifying page permission:", dbErr);
    }
  }

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-full text-rose-500 animate-bounce">
          <ShieldAlert className="w-12 h-12" />
        </div>
        <h2 className="text-2xl font-bold text-text-primary">Acceso Denegado</h2>
        <p className="text-text-muted text-sm max-w-md leading-relaxed">
          Usted no cuenta con los permisos necesarios para ingresar al área de <strong>Mercado Libre</strong>. Solicite acceso al administrador del sistema.
        </p>
        <Link href="/ventas" className="bg-bg-card hover:bg-bg-subtle text-text-primary border border-border-custom px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow">
          Volver a Ventas
        </Link>
      </div>
    );
  }

  return <MercadoLibreDashboardClient />;
}
