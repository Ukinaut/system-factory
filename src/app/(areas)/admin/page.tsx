import { getUsers, getAuditLogs } from "@/actions/users";
import { getAllCountriesAdmin } from "@/actions/countries";
import { getDashboardStats } from "@/actions/dashboard";
import AdminDashboardClient from "./AdminDashboardClient";
import ActivityLogSection from "./ActivityLogSection";

export default async function AdminDashboard() {
  const [usersResult, countriesResult, statsResult, logsResult] = await Promise.all([
    getUsers(),
    getAllCountriesAdmin(),
    getDashboardStats(),
    getAuditLogs(),
  ]);

  const initialUsers = usersResult.success ? usersResult.users : [];
  const initialCountries = countriesResult.success ? countriesResult.countries : [];
  const initialLogs = logsResult.success ? logsResult.logs : [];
  
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
      />
      
      <ActivityLogSection initialLogs={initialLogs as any} />
    </div>
  );
}


