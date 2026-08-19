"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  TrendingUp, 
  DollarSign, 
  Truck, 
  TrendingDown, 
  PieChart, 
  BarChart3, 
  Package, 
  Activity,
  ArrowUpRight,
  RefreshCw,
  Globe
} from "lucide-react";

interface DashboardStats {
  pendingSalesCount: number;
  pendingSalesTotal: number;
  shippingStats: {
    paraEmpacar: number;
    despachado: number;
    otros: number;
  };
  expensesByCategory: {
    category: string;
    amount: number;
  }[];
  expensesByStatus: {
    PENDIENTE: number;
    APROBADA: number;
    RECHAZADA: number;
    PROCESADA: number;
  };
  totalInvoiceARS: number;
  totalInvoiceUSD: number;
  totalImportARS: number;
  totalImportUSD: number;
  monthlyTrend: {
    month: string;
    amount: number;
  }[];
}

export default function AdminDashboardOverview({
  stats,
  onRefresh,
}: {
  stats: DashboardStats;
  onRefresh?: () => void;
}) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  // Cálculos para gráfico de tendencia mensual (SVG)
  const maxTrendAmount = Math.max(...stats.monthlyTrend.map(t => t.amount), 1000);
  const chartHeight = 160;
  const chartWidth = 500;
  const padding = 25;

  const points = stats.monthlyTrend.map((t, index) => {
    const x = padding + (index * (chartWidth - padding * 2)) / (stats.monthlyTrend.length - 1);
    // Y invertida en SVG
    const y = chartHeight - padding - (t.amount / maxTrendAmount) * (chartHeight - padding * 2);
    return { x, y, label: t.month, value: t.amount };
  });

  const pathD = points.length > 0 
    ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(" ")
    : "";

  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${chartHeight - padding} L ${points[0].x} ${chartHeight - padding} Z`
    : "";

  // Desglose de Gastos
  const totalExpenses = stats.expensesByCategory.reduce((sum, item) => sum + item.amount, 0);

  // Colores para categorías de gasto
  const categoryColors: Record<string, string> = {
    CONSUMIBLES: "bg-blue-500",
    VARIOS: "bg-purple-500",
    EQUIPOS: "bg-amber-500",
    OTROS: "bg-emerald-500",
    IMPORTACIONES: "bg-rose-500",
  };

  const categoryTextColors: Record<string, string> = {
    CONSUMIBLES: "text-blue-400",
    VARIOS: "text-purple-400",
    EQUIPOS: "text-amber-400",
    OTROS: "text-emerald-400",
    IMPORTACIONES: "text-rose-400",
  };

  const totalShippings = stats.shippingStats.paraEmpacar + stats.shippingStats.despachado + stats.shippingStats.otros;
  const empacarPercentage = totalShippings > 0 ? (stats.shippingStats.paraEmpacar / totalShippings) * 100 : 0;
  const despachadoPercentage = totalShippings > 0 ? (stats.shippingStats.despachado / totalShippings) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Botón de actualizar en tiempo real */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#0078D7] animate-pulse" />
            Indicadores y Métricas en Tiempo Real
          </h2>
          <p className="text-text-muted text-xs">Resumen general de facturación, despachos y egresos.</p>
        </div>
        {onRefresh && (
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border-custom bg-bg-card text-text-secondary hover:text-text-primary text-xs font-medium cursor-pointer transition-all duration-200"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#0078D7]" : ""}`} />
            Actualizar Datos
          </button>
        )}
      </div>

      {/* Tarjetas de Métricas Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Ventas en Proceso */}
        <div className="group relative bg-bg-card rounded-xl p-6 border border-border-custom shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500 group-hover:w-2 transition-all"></div>
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-text-muted text-xs font-semibold uppercase tracking-wider">Ventas en Proceso</span>
              <div className="text-2xl font-bold text-text-primary tracking-tight">
                {stats.pendingSalesCount} <span className="text-sm font-normal text-text-muted">activas</span>
              </div>
              <p className="text-text-secondary text-sm font-medium">
                Total: <span className="text-blue-500 font-semibold">${stats.pendingSalesTotal.toLocaleString("es-AR")}</span>
              </p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-lg text-blue-500">
              <TrendingUp className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-border-custom/50 flex justify-between items-center text-xs text-text-muted">
            <span>Estado: PENDIENTE</span>
            <Link href="/ventas" className="flex items-center gap-0.5 text-blue-500 hover:text-blue-600 font-medium transition-colors">
              Ver ventas <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Egresos Aprobados / Facturas de Compra */}
        <div className="group relative bg-bg-card rounded-xl p-6 border border-border-custom shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500 group-hover:w-2 transition-all"></div>
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-text-muted text-xs font-semibold uppercase tracking-wider">Compras Nacionales</span>
              <div className="space-y-0.5">
                <div className="text-xl font-bold text-text-primary">
                  ${stats.totalInvoiceARS.toLocaleString("es-AR")}{" "}
                  <span className="text-xs text-text-muted font-normal">ARS</span>
                </div>
                <div className="text-lg font-bold text-amber-500">
                  {stats.totalInvoiceUSD.toLocaleString("en-US", { style: "currency", currency: "USD" })}{" "}
                  <span className="text-xs text-text-muted font-normal">USD</span>
                </div>
              </div>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-lg text-amber-500">
              <DollarSign className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-border-custom/50 flex justify-between items-center text-xs text-text-muted">
            <span>Facturas Locales</span>
            <Link href="/compras" className="flex items-center gap-0.5 text-amber-500 hover:text-amber-600 font-medium transition-colors">
              Ver compras <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Compras Exterior */}
        <div className="group relative bg-bg-card rounded-xl p-6 border border-border-custom shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500 group-hover:w-2 transition-all"></div>
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-text-muted text-xs font-semibold uppercase tracking-wider">Compras Exterior</span>
              <div className="space-y-0.5">
                <div className="text-xl font-bold text-text-primary">
                  {stats.totalImportUSD.toLocaleString("en-US", { style: "currency", currency: "USD" })}{" "}
                  <span className="text-xs text-text-muted font-normal">USD</span>
                </div>
                <div className="text-lg font-bold text-rose-500">
                  ${stats.totalImportARS.toLocaleString("es-AR")}{" "}
                  <span className="text-xs text-text-muted font-normal">ARS</span>
                </div>
              </div>
            </div>
            <div className="p-3 bg-rose-500/10 rounded-lg text-rose-500">
              <Globe className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-border-custom/50 flex justify-between items-center text-xs text-text-muted">
            <span>Facturas Importación</span>
            <Link href="/compras" className="flex items-center gap-0.5 text-rose-500 hover:text-rose-600 font-medium transition-colors">
              Ver importaciones <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Despachos en Logística */}
        <div className="group relative bg-bg-card rounded-xl p-6 border border-border-custom shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-purple-500 group-hover:w-2 transition-all"></div>
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-text-muted text-xs font-semibold uppercase tracking-wider">Logística y Despachos</span>
              <div className="text-2xl font-bold text-text-primary tracking-tight">
                {stats.shippingStats.paraEmpacar}{" "}
                <span className="text-sm font-normal text-text-muted">para empacar</span>
              </div>
              <p className="text-text-secondary text-sm font-medium">
                Despachados: <span className="text-purple-500 font-semibold">{stats.shippingStats.despachado}</span>
              </p>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-lg text-purple-500">
              <Truck className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-border-custom/50 flex justify-between items-center text-xs text-text-muted">
            <span>Envíos Activos</span>
            <Link href="/envios" className="flex items-center gap-0.5 text-purple-500 hover:text-purple-600 font-medium transition-colors">
              Gestionar envíos <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>


      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Historial de Gastos (SVG Line Chart) */}
        <div className="bg-bg-card border border-border-custom rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#0078D7]" />
              Tendencia de Egresos Estimados (Últimos 6 meses)
            </h3>
            <span className="text-[10px] text-text-muted font-medium bg-bg-subtle px-2 py-0.5 rounded border border-border-custom">ARS</span>
          </div>

          <div className="relative w-full flex justify-center items-center">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto overflow-visible">
              {/* Gradients */}
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0078D7" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#0078D7" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                const y = padding + ratio * (chartHeight - padding * 2);
                return (
                  <line
                    key={i}
                    x1={padding}
                    y1={y}
                    x2={chartWidth - padding}
                    y2={y}
                    stroke="var(--border-color)"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                    opacity="0.5"
                  />
                );
              })}

              {/* Area path */}
              {areaD && (
                <path d={areaD} fill="url(#areaGradient)" />
              )}

              {/* Line path */}
              {pathD && (
                <path
                  d={pathD}
                  fill="none"
                  stroke="#0078D7"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Points & Labels */}
              {points.map((p, i) => (
                <g key={i}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="4"
                    fill="var(--bg-card)"
                    stroke="#0078D7"
                    strokeWidth="2.5"
                    className="hover:r-6 hover:stroke-blue-600 transition-all cursor-pointer"
                  />
                  {/* Tooltip / Value on Top */}
                  <text
                    x={p.x}
                    y={p.y - 8}
                    textAnchor="middle"
                    className="text-[9px] fill-text-primary font-bold"
                  >
                    ${p.value >= 1000 ? `${(p.value / 1000).toFixed(0)}k` : p.value}
                  </text>
                  {/* X Axis Label */}
                  <text
                    x={p.x}
                    y={chartHeight - 6}
                    textAnchor="middle"
                    className="text-[9px] fill-text-muted font-medium"
                  >
                    {p.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Desglose de Gastos por Categoría */}
        <div className="bg-bg-card border border-border-custom rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2 mb-6">
              <PieChart className="w-4 h-4 text-purple-500" />
              Egresos por Categoría
            </h3>

            {totalExpenses === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-text-muted">
                <Package className="w-10 h-10 stroke-1 mb-2" />
                <p className="text-xs">No hay egresos registrados en las solicitudes.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {stats.expensesByCategory.map((item) => {
                  const pct = totalExpenses > 0 ? (item.amount / totalExpenses) * 100 : 0;
                  const colorClass = categoryColors[item.category] || "bg-gray-500";
                  const textClass = categoryTextColors[item.category] || "text-gray-400";
                  return (
                    <div key={item.category} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-text-secondary uppercase">{item.category}</span>
                        <span className="text-text-primary font-semibold">
                          ${item.amount.toLocaleString("es-AR")}{" "}
                          <span className={`text-[10px] ${textClass} font-normal`}>
                            ({pct.toFixed(1)}%)
                          </span>
                        </span>
                      </div>
                      <div className="w-full bg-border-custom/55 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${colorClass} rounded-full transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Estado de Despachos / Distribución */}
          <div className="border-t border-border-custom/50 pt-4 mt-6">
            <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Distribución de Despachos</h4>
            {totalShippings === 0 ? (
              <p className="text-[11px] text-text-muted">No hay registros de despachos/envíos.</p>
            ) : (
              <div className="flex items-center gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-text-secondary flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                      Para Empacar
                    </span>
                    <span className="font-semibold text-text-primary">{stats.shippingStats.paraEmpacar} ({empacarPercentage.toFixed(0)}%)</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-text-secondary flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Despachado
                    </span>
                    <span className="font-semibold text-text-primary">{stats.shippingStats.despachado} ({despachadoPercentage.toFixed(0)}%)</span>
                  </div>
                </div>
                {/* Mini SVG Progress Stacked Bar */}
                <div className="w-24 h-4 bg-border-custom/55 rounded-full overflow-hidden flex">
                  <div className="bg-purple-500 h-full" style={{ width: `${empacarPercentage}%` }}></div>
                  <div className="bg-emerald-500 h-full" style={{ width: `${despachadoPercentage}%` }}></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gráfico de distribución de Gastos por Estado */}
      <div className="bg-bg-card border border-border-custom rounded-xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2 mb-4">
          <TrendingDown className="w-4 h-4 text-red-500" />
          Gastos por Estado de Solicitudes (Aprobación)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(stats.expensesByStatus).map(([status, amount]) => {
            const statusColors: Record<string, string> = {
              PENDIENTE: "border-blue-500/20 bg-blue-500/5 text-blue-500",
              APROBADA: "border-purple-500/20 bg-purple-500/5 text-purple-500",
              RECHAZADA: "border-red-500/20 bg-red-500/5 text-red-500",
              PROCESADA: "border-emerald-500/20 bg-emerald-500/5 text-emerald-500",
            };
            const c = statusColors[status] || "border-gray-500/20 bg-gray-500/5 text-gray-500";
            return (
              <div key={status} className={`p-4 rounded-xl border ${c} flex flex-col justify-between space-y-1.5`}>
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-85">{status}</span>
                <span className="text-lg font-bold">${amount.toLocaleString("es-AR")}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
