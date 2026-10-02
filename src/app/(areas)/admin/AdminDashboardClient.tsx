"use client";

import { useState, startTransition } from "react";
import { Users, Globe, LayoutDashboard, Bot } from "lucide-react";
import AdminPanelClient from "./AdminPanelClient";
import CountryManager from "./CountryManager";
import AdminDashboardOverview from "./AdminDashboardOverview";
import AiAssistantManager from "./AiAssistantManager";
import { getDashboardStats } from "@/actions/dashboard";

export default function AdminDashboardClient({
  initialUsers,
  initialCountries,
  initialStats,
  initialRecycleItems = [],
}: {
  initialUsers: any[];
  initialCountries: any[];
  initialStats: any;
  initialRecycleItems?: any[];
}) {
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "countries" | "ai">("overview");
  const [stats, setStats] = useState(initialStats);

  const handleRefreshStats = async () => {
    const res = await getDashboardStats();
    if (res.success && res.data) {
      setStats(res.data);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-header navigation tabs for Admin Section */}
      <div className="flex border-b border-border-custom gap-2 pb-px overflow-x-auto">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm transition-all duration-200 cursor-pointer whitespace-nowrap ${
            activeTab === "overview"
              ? "border-[#0078D7] text-text-primary bg-white/2"
              : "border-transparent text-text-muted hover:text-text-primary"
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          Resumen General
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm transition-all duration-200 cursor-pointer whitespace-nowrap ${
            activeTab === "users"
              ? "border-[#0078D7] text-text-primary bg-white/2"
              : "border-transparent text-text-muted hover:text-text-primary"
          }`}
        >
          <Users className="w-4 h-4" />
          Gestión de Usuarios
        </button>
        <button
          onClick={() => setActiveTab("countries")}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm transition-all duration-200 cursor-pointer whitespace-nowrap ${
            activeTab === "countries"
              ? "border-[#0078D7] text-text-primary bg-white/2"
              : "border-transparent text-text-muted hover:text-text-primary"
          }`}
        >
          <Globe className="w-4 h-4" />
          Gestión de Países / Regiones
        </button>
        <button
          onClick={() => setActiveTab("ai")}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm transition-all duration-200 cursor-pointer whitespace-nowrap ${
            activeTab === "ai"
              ? "border-[#0078D7] text-text-primary bg-white/2"
              : "border-transparent text-text-muted hover:text-text-primary"
          }`}
        >
          <Bot className="w-4 h-4 text-[#0078D7]" />
          Asistentes
        </button>
      </div>

      <div className="transition-all duration-300">
        {activeTab === "overview" && (
          <AdminDashboardOverview stats={stats} onRefresh={handleRefreshStats} />
        )}
        {activeTab === "users" && (
          <AdminPanelClient initialUsers={initialUsers} />
        )}
        {activeTab === "countries" && (
          <CountryManager initialCountries={initialCountries} />
        )}
        {activeTab === "ai" && (
          <AiAssistantManager />
        )}
      </div>
    </div>
  );
}

