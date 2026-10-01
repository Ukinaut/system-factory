import { getUsers, getAuditLogs } from "@/actions/users";
import { getAllCountriesAdmin } from "@/actions/countries";
import { getDashboardStats } from "@/actions/dashboard";
import { getRecycleBinItems } from "@/actions/recycleBin";
import AdminDashboardClient from "./AdminDashboardClient";
import ActivityLogSection from "./ActivityLogSection";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboard() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("sessionToken")?.value;
  if (!sessionToken) {
    redirect("/login");
  }

  let session: any = null;
  try {
    const decodedStr = Buffer.from(sessionToken, "base64").toString("utf-8");
    session = JSON.parse(decodedStr);
  } catch {
    redirect("/login");
  }

  // Verificar en vivo si el usuario tiene rol de ADMIN o permiso de ADMIN
  let isAdmin = session?.rol === "ADMIN" || (Array.isArray(session?.permissions) && session.permissions.includes("ADMIN"));
  
  if (session?.id || session?.correo) {
    try {
      const dbUser = await prisma.user.findFirst({
        where: {
          OR: [
            session.id ? { id: session.id } : undefined,
            session.correo ? { correo: session.correo } : undefined,
          ].filter(Boolean) as any,
        },
        include: { permissions: true },
      });
      if (dbUser) {
        isAdmin = dbUser.rol === "ADMIN" || dbUser.permissions.some(p => p.areaPermitida === "ADMIN");
      }
    } catch (err) {
      console.error("Error validating admin permissions:", err);
    }
  }

  if (!isAdmin) {
    redirect("/");
  }

  const [usersResult, countriesResult, statsResult, logsResult, recycleResult] = await Promise.all([
    getUsers(),
    getAllCountriesAdmin(),
    getDashboardStats(),
    getAuditLogs(),
    getRecycleBinItems(),
  ]);

  const initialUsers = usersResult.success ? usersResult.users : [];
  const initialCountries = countriesResult.success ? countriesResult.countries : [];
  const initialLogs = logsResult.success ? logsResult.logs : [];
  const initialRecycleItems = recycleResult.success ? recycleResult.items : [];
  
  // Estructura por defecto en caso de error o falte información
  const defaultStats = {
    pendingSalesCount: 0,
    pendingSalesTotal: 0,
    shippingStats: { paraEmpacar: 0, despachado: 0, otros: 0 },
    expensesByCategory: [],
    expensesByStatus: { PENDIENTE: 0, APROBADA: 0, RECHAZADA: 0, PROCESADA: 0 },
    totalInvoiceARS: 0,
    totalInvoiceUSD: 0,
    monthlyTrend: [],
  };
  const initialStats = statsResult.success ? statsResult.data : defaultStats;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-text-primary tracking-wide">A. Administrador</h1>
      
      <AdminDashboardClient 
        initialUsers={initialUsers as any} 
        initialCountries={initialCountries as any} 
        initialStats={initialStats as any}
        initialRecycleItems={initialRecycleItems as any}
      />
      
      <ActivityLogSection initialLogs={initialLogs as any} />
    </div>
  );
}


