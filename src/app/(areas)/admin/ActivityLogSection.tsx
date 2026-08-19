"use client";

import { useState, useTransition } from "react";
import { Trash2, RefreshCw, Clock, User, Activity } from "lucide-react";
import { getAuditLogs, clearAuditLogs } from "@/actions/users";

interface AuditLog {
  id: string;
  accion: string;
  fechaHora: any; // Date or ISO string
  user: {
    nombre: string;
    correo: string;
    rol: string;
  };
}

export default function ActivityLogSection({
  initialLogs,
}: {
  initialLogs: AuditLog[];
}) {
  const [logs, setLogs] = useState<AuditLog[]>(initialLogs);
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);

  const handleRefresh = async () => {
    setLoading(true);
    const res = await getAuditLogs();
    setLoading(false);
    if (res.success && res.logs) {
      setLogs(res.logs);
    }
  };

  const handleClear = () => {
    if (!window.confirm("¿Está seguro de que desea borrar todo el historial de actividades? Esta acción no se puede deshacer.")) {
      return;
    }

    startTransition(async () => {
      const res = await clearAuditLogs();
      if (res.success) {
        setLogs([]);
        alert("Historial de actividades borrado con éxito.");
      } else {
        alert("Error al borrar el historial: " + res.error);
      }
    });
  };

  return (
    <div className="bg-bg-card rounded-xl shadow-lg border border-border-custom p-6 max-w-7xl mx-auto mt-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-border-custom pb-4">
        <div>
          <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <Activity className="text-[#0078D7] w-5 h-5" />
            Historial General de Actividades
          </h2>
          <p className="text-text-muted text-xs mt-1">
            Registro de acciones y movimientos realizados por Supervisores y Operadores.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            onClick={handleRefresh}
            disabled={loading || isPending}
            className="p-2.5 bg-bg-subtle hover:bg-bg-card border border-border-custom rounded-lg text-text-secondary hover:text-text-primary transition-all duration-200 disabled:opacity-50 flex items-center justify-center cursor-pointer"
            title="Actualizar historial"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={handleClear}
            disabled={isPending || logs.length === 0}
            className="px-4 py-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 disabled:opacity-40 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            Borrar Historial
          </button>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-text-muted text-sm">No se registran actividades recientes en el sistema.</p>
        </div>
      ) : (
        <div className="overflow-x-auto max-h-96 overflow-y-auto pr-1">
          <div className="divide-y divide-border-custom">
            {logs.map((log) => {
              const dateObj = new Date(log.fechaHora);
              const formattedDate = dateObj.toLocaleDateString("es-AR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              });
              const formattedTime = dateObj.toLocaleTimeString("es-AR", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              });

              return (
                <div key={log.id} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-2 text-sm hover:bg-bg-subtle/30 px-2 rounded-lg transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-500/5 rounded-full border border-blue-500/10 mt-0.5">
                      <User className="w-4 h-4 text-[#0078D7]" />
                    </div>
                    <div>
                      <p className="text-text-primary font-medium">{log.accion}</p>
                      <p className="text-xs text-text-muted mt-0.5">
                        Realizado por: <span className="text-text-secondary font-semibold">{log.user?.nombre || "Usuario eliminado"}</span> ({log.user?.correo || "-"}) • Rol: <span className="text-text-secondary font-semibold">{log.user?.rol || "-"}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-text-muted md:self-center self-end bg-bg-subtle px-2.5 py-1 rounded-md border border-border-custom">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formattedDate} {formattedTime}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
