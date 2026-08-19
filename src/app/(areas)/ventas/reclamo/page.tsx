"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Save, AlertTriangle, Search } from "lucide-react";
import Link from "next/link";
import { getClients } from "@/actions/clients";
import { createClaim } from "@/actions/claims";

export default function NuevoReclamo() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    clienteBusqueda: "",
    tipoReclamo: "ARTICULO",
    prioridad: "MEDIA",
    observaciones: "",
  });

  const [clientes, setClientes] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const clientSuggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadClients = async () => {
      const res = await getClients();
      if (res.success) {
        setClientes(res.clients || []);
      }
    };
    loadClients();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (clientSuggestionsRef.current && !clientSuggestionsRef.current.contains(event.target as Node)) {
        setShowClientSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      alert("Por favor seleccione un cliente de la lista de sugerencias.");
      return;
    }
    setLoading(true);

    const res = await createClaim({
      clientId: selectedClientId,
      tipo: formData.tipoReclamo,
      prioridad: formData.prioridad,
      observacion: formData.observaciones,
    });

    setLoading(false);
    if (res.success) {
      alert("Reclamo registrado exitosamente.");
      window.location.href = "/ventas";
    } else {
      alert("Error al registrar reclamo: " + res.error);
    }
  };

  const filteredClients = clientes.filter(c =>
    c.razonSocial.toLowerCase().includes(formData.clienteBusqueda.toLowerCase()) ||
    c.cuit.includes(formData.clienteBusqueda)
  );

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/ventas" className="p-2 bg-bg-card border border-border-custom rounded hover:bg-bg-subtle transition-colors">
          <ArrowLeft className="w-5 h-5 text-text-muted" />
        </Link>
        <h1 className="text-3xl font-bold text-text-primary tracking-wide flex items-center gap-3">
          <AlertTriangle className="text-red-500 w-8 h-8" />
          Registrar Reclamo
        </h1>
      </div>

      <div className="bg-bg-card rounded-xl border border-border-custom shadow-xl p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="relative" ref={clientSuggestionsRef}>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Buscar Cliente</label>
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-3 text-gray-500" />
              <input
                type="text"
                value={formData.clienteBusqueda}
                onChange={e => {
                  setFormData({...formData, clienteBusqueda: e.target.value});
                  setShowClientSuggestions(true);
                  setSelectedClientId(null);
                }}
                onFocus={() => setShowClientSuggestions(true)}
                className="w-full bg-bg-subtle border border-border-custom rounded-md pl-10 pr-4 py-3 text-text-primary focus:border-[#0078D7] transition-colors outline-none"
                placeholder="Razón Social o CUIT..."
                required
                autoComplete="off"
              />
            </div>

            {showClientSuggestions && formData.clienteBusqueda && filteredClients.length > 0 && (
              <ul className="absolute z-50 w-full bg-bg-card border border-border-custom rounded-md mt-1 max-h-60 overflow-y-auto shadow-2xl">
                {filteredClients.map(c => (
                  <li
                    key={c.id}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setFormData({ ...formData, clienteBusqueda: `${c.razonSocial} (${c.cuit})` });
                      setSelectedClientId(c.id);
                      setShowClientSuggestions(false);
                    }}
                    className="px-4 py-2.5 hover:bg-[#0078D7] hover:text-white cursor-pointer text-sm text-text-secondary border-b border-border-custom last:border-b-0"
                  >
                    <div className="font-bold">{c.razonSocial}</div>
                    <div className="text-xs text-text-muted font-mono">CUIT: {c.cuit}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Tipo de Problema</label>
              <select
                value={formData.tipoReclamo}
                onChange={e => setFormData({...formData, tipoReclamo: e.target.value})}
                className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-3 text-text-primary focus:border-[#0078D7] outline-none appearance-none"
              >
                <option value="ARTICULO">Problema con Artículo / Producto</option>
                <option value="SERVICIO">Problema con Servicio</option>
                <option value="FACTURACION">Error de Facturación / Cobros</option>
                <option value="OTRO">Otro / Múltiples motivos</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Nivel de Prioridad</label>
              <select
                value={formData.prioridad}
                onChange={e => setFormData({...formData, prioridad: e.target.value})}
                className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-3 text-text-primary focus:border-[#0078D7] outline-none appearance-none"
              >
                <option value="LEVE">Leve - Puede esperar</option>
                <option value="MEDIO">Medio - Estándar</option>
                <option value="URGENTE">Urgente - Alta prioridad</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Detalle del Reclamo / Observaciones</label>
            <textarea
              value={formData.observaciones}
              onChange={e => setFormData({...formData, observaciones: e.target.value})}
              className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-3 text-text-primary focus:border-[#0078D7] outline-none min-h-[150px]"
              placeholder="Describa el inconveniente reportado por el cliente..."
              required
            />
          </div>

          <div className="pt-6 flex justify-end border-t border-border-custom">
            <button
              type="submit"
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-8 rounded-md transition-colors flex items-center gap-2 disabled:opacity-50 tracking-wide cursor-pointer"
            >
              <Save className="w-5 h-5" />
              {loading ? "REGISTRANDO..." : "REGISTRAR RECLAMO"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
