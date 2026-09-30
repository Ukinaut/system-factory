import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getTiendaSales } from "@/actions/tienda";
import TiendaDashboardClient from "./TiendaDashboardClient";

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

export default async function TiendaPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  // Verificar permiso de área
  const hasAccess = 
    session.rol === "ADMIN" || 
    session.rol === "VENTAS" || 
    (session.permissions && (session.permissions.includes("TIENDA") || session.permissions.includes("ADMIN")));

  if (!hasAccess) {
    return (
      <div className="p-8 text-center bg-bg-card border border-border-custom rounded-xl space-y-4">
        <h1 className="text-xl font-bold text-red-500">Acceso Restringido</h1>
        <p className="text-text-secondary text-sm">
          No tienes permisos suficientes para ingresar a la gestión de <strong>Tienda (API)</strong>.
        </p>
      </div>
    );
  }

  const result = await getTiendaSales();
  const salesData = (result.success && result.data) ? result.data : { sales: [], totalVentas: 0, totalImportadoARS: 0, totalImportadoUSD: 0, ventasHoyCount: 0 };

  return (
    <TiendaDashboardClient />
  );
}
