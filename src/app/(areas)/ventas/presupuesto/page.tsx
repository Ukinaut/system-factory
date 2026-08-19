"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Save, FileText, Plus, Trash2, Search } from "lucide-react";
import Link from "next/link";
import { getClients } from "@/actions/clients";
import { createQuote } from "@/actions/sales";

export default function NuevoPresupuesto() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    clienteBusqueda: "",
    validezDias: 15,
    observaciones: "",
    tipo: "SERVICIO",
    moneda: "ARS",
  });

  const [clientes, setClientes] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const clientSuggestionsRef = useRef<HTMLDivElement>(null);

  const [articulos, setArticulos] = useState([
    { id: 1, nombre: "", cantidad: 1, precio: 0 }
  ]);

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

  const addArticulo = () => {
    setArticulos([...articulos, { id: Date.now(), nombre: "", cantidad: 1, precio: 0 }]);
  };

  const removeArticulo = (id: number) => {
    setArticulos(articulos.filter(a => a.id !== id));
  };

  const updateArticulo = (id: number, field: string, value: any) => {
    setArticulos(articulos.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  const total = articulos.reduce((acc, curr) => acc + (curr.cantidad * curr.precio), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      alert("Por favor seleccione un cliente de la lista de sugerencias.");
      return;
    }
    setLoading(true);

    const res = await createQuote({
      clientId: selectedClientId,
      tipo: formData.tipo,
      costoEnvio: 0,
      descuento: 0,
      observaciones: `Validez: ${formData.validezDias} días. ${formData.observaciones}`,
      moneda: formData.moneda,
      total: total,
    });

    setLoading(false);
    if (res.success) {
      alert("Presupuesto generado correctamente.");
      window.location.href = "/ventas";
    } else {
      alert("Error al guardar presupuesto: " + res.error);
    }
  };

  const filteredClients = clientes.filter(c =>
    c.razonSocial.toLowerCase().includes(formData.clienteBusqueda.toLowerCase()) ||
    c.cuit.includes(formData.clienteBusqueda)
  );

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/ventas" className="p-2 bg-bg-card border border-border-custom rounded hover:bg-bg-subtle transition-colors">
          <ArrowLeft className="w-5 h-5 text-text-muted" />
        </Link>
        <h1 className="text-3xl font-bold text-text-primary tracking-wide flex items-center gap-3">
          <FileText className="text-amber-500 w-8 h-8" />
          Generar Presupuesto
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-bg-card rounded-xl border border-border-custom shadow-xl p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4 border-b border-border-custom pb-2">1. Cliente y Condiciones</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
                  placeholder="Ej: Consumidor Final..."
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
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Validez (Días)</label>
              <input
                type="number"
                min="1"
                value={formData.validezDias}
                onChange={e => setFormData({...formData, validezDias: Number(e.target.value)})}
                className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-3 text-text-primary focus:border-[#0078D7] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Tipo de Cotización</label>
              <select
                value={formData.tipo}
                onChange={e => setFormData({...formData, tipo: e.target.value})}
                className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-3 text-text-primary focus:border-[#0078D7] outline-none"
              >
                <option value="ARTICULO">Solo Artículo</option>
                <option value="SERVICIO">Solo Servicio</option>
                <option value="MIXTO">Mixto</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Moneda</label>
              <select
                value={formData.moneda}
                onChange={e => setFormData({...formData, moneda: e.target.value})}
                className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-3 text-text-primary focus:border-[#0078D7] outline-none"
              >
                <option value="ARS">ARS ($)</option>
                <option value="USD">USD (US$)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-bg-card rounded-xl border border-border-custom shadow-xl p-6">
          <div className="flex justify-between items-center mb-4 border-b border-border-custom pb-2">
            <h2 className="text-lg font-semibold text-text-primary">2. Artículos a Cotizar</h2>
            <button type="button" onClick={addArticulo} className="flex items-center gap-2 text-sm text-[#0078D7] hover:text-blue-400 transition-colors cursor-pointer">
              <Plus className="w-4 h-4" /> Agregar Artículo
            </button>
          </div>
          <div className="space-y-4">
            {articulos.map((art) => (
              <div key={art.id} className="flex flex-col md:flex-row gap-4 items-end bg-bg-subtle p-4 rounded border border-border-custom">
                <div className="flex-1 w-full">
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Producto / Detalle</label>
                  <input
                    type="text"
                    value={art.nombre}
                    onChange={e => updateArticulo(art.id, "nombre", e.target.value)}
                    className="w-full bg-bg-card border border-border-custom rounded-md px-3 py-2 text-text-primary focus:border-[#0078D7] outline-none"
                    placeholder="Detalle del producto..."
                    required
                  />
                </div>
                <div className="w-full md:w-24">
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Cant.</label>
                  <input
                    type="number"
                    min="1"
                    value={art.cantidad}
                    onChange={e => updateArticulo(art.id, "cantidad", Number(e.target.value))}
                    onFocus={e => e.target.select()}
                    className="w-full bg-bg-card border border-border-custom rounded-md px-3 py-2 text-text-primary focus:border-[#0078D7] outline-none"
                  />
                </div>
                <div className="w-full md:w-32">
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Precio Un.</label>
                  <input
                    type="number"
                    min="0"
                    value={art.precio}
                    onChange={e => updateArticulo(art.id, "precio", Number(e.target.value))}
                    onFocus={e => e.target.select()}
                    className="w-full bg-bg-card border border-border-custom rounded-md px-3 py-2 text-text-primary focus:border-[#0078D7] outline-none"
                  />
                </div>
                <button 
                  type="button" 
                  onClick={() => removeArticulo(art.id)}
                  disabled={articulos.length === 1}
                  className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded transition-colors disabled:opacity-30 cursor-pointer"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-bg-card rounded-xl border border-border-custom shadow-xl p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4 border-b border-border-custom pb-2">3. Observaciones</h2>
          <textarea
            value={formData.observaciones}
            onChange={e => setFormData({...formData, observaciones: e.target.value})}
            className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-3 text-text-primary focus:border-[#0078D7] outline-none min-h-[100px]"
            placeholder="Términos y condiciones, detalles de entrega..."
          />

          <div className="mt-8 bg-bg-subtle border border-border-custom rounded-lg p-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-xl text-text-secondary">
              Total Cotizado: <span className="text-3xl font-bold text-amber-500 ml-2">{formData.moneda === "USD" ? "US$" : "$"} {total.toFixed(2)}</span>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-8 rounded-md transition-colors flex items-center gap-3 disabled:opacity-50 tracking-wide w-full md:w-auto justify-center cursor-pointer"
            >
              <Save className="w-5 h-5" />
              {loading ? "GENERANDO..." : "GENERAR PRESUPUESTO"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
