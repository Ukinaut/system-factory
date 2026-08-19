"use client";

import { useState, useEffect } from "react";
import { FileCheck, Plus, Link as LinkIcon, Image as ImageIcon, DollarSign, Tag, Archive, CheckCircle2, Clock, AlertTriangle, XCircle } from "lucide-react";
import { createPurchaseRequest, getMyPurchaseRequests } from "@/actions/purchases";

export default function OrdenCompraPage() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);

  // Form State
  const [form, setForm] = useState({
    tipoArticulo: "CONSUMIBLES",
    articulo: "",
    montoAprox: "",
    areaDestino: "LABORATORIO",
    referenciaUrl: "",
    referenciaBase64: "",
    referenciaFileName: "",
  });

  const loadRequests = async () => {
    setLoading(true);
    const res = await getMyPurchaseRequests();
    if (res.success && res.requests) {
      setRequests(res.requests);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setForm((f) => ({ ...f, referenciaFileName: file.name }));

    const reader = new FileReader();
    reader.onloadend = () => {
      setForm((f) => ({ ...f, referenciaBase64: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.articulo || !form.montoAprox) {
      alert("Por favor complete los campos obligatorios.");
      return;
    }

    setLoading(true);
    const res = await createPurchaseRequest({
      tipoArticulo: form.tipoArticulo,
      articulo: form.articulo,
      montoAprox: parseFloat(form.montoAprox),
      areaDestino: form.areaDestino,
      referenciaUrl: form.referenciaUrl || undefined,
      referenciaBase64: form.referenciaBase64 || undefined,
      referenciaFileName: form.referenciaFileName || undefined,
    });
    setLoading(false);

    if (res.success) {
      alert("Solicitud de compra registrada correctamente.");
      setForm({
        tipoArticulo: "CONSUMIBLES",
        articulo: "",
        montoAprox: "",
        areaDestino: "LABORATORIO",
        referenciaUrl: "",
        referenciaBase64: "",
        referenciaFileName: "",
      });
      loadRequests();
    } else {
      alert("Error al registrar solicitud: " + res.error);
    }
  };

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case "APROBADA":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
            <CheckCircle2 className="w-3 h-3" /> APROBADA
          </span>
        );
      case "RECHAZADA":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/25">
            <XCircle className="w-3 h-3" /> RECHAZADA
          </span>
        );
      case "PROCESADA":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/25">
            <CheckCircle2 className="w-3 h-3" /> PROCESADA
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/25">
            <Clock className="w-3 h-3" /> PENDIENTE
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary tracking-wide flex items-center gap-3">
          <FileCheck className="text-[#0078D7] w-8 h-8" />
          Solicitud de Compras (OC)
        </h1>
        <p className="text-text-muted mt-1">
          Cargue nuevas solicitudes de artículos, consumibles o insumos para su posterior aprobación por el área de Compras.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Column */}
        <div className="lg:col-span-1">
          <div className="bg-bg-card rounded-xl border border-border-custom shadow-xl p-6">
            <h2 className="text-lg font-bold text-text-primary mb-6 flex items-center gap-2 border-b border-border-custom pb-3">
              <Plus className="w-5 h-5 text-[#0078D7]" /> Nueva Solicitud
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Tipo de Artículo</label>
                <select
                  value={form.tipoArticulo}
                  onChange={(e) => setForm({ ...form, tipoArticulo: e.target.value })}
                  className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-3 text-text-primary focus:border-[#0078D7] outline-none font-medium"
                >
                  <option value="SUPERMERCADO">Supermercado</option>
                  <option value="LABORATORIO">Laboratorio</option>
                  <option value="MUEBLES_UTILES">Muebles / Útiles</option>
                  <option value="HERRAMIENTAS">Herramientas</option>
                  <option value="CONSUMIBLES">Consumibles</option>
                  <option value="GASTOS_FIJOS_SERVICIO">Gastos Fijos / Servicio</option>
                  <option value="GASTOS_IMPORTACION_ARG">Gastos importacion Argentina</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Nombre / Descripción del Artículo</label>
                <input
                  type="text"
                  value={form.articulo}
                  onChange={(e) => setForm({ ...form, articulo: e.target.value })}
                  placeholder="Ej: Resmas de hojas A4 x 5"
                  className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-3 text-text-primary focus:border-[#0078D7] outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Monto Aproximado (AR$ / US$)</label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-text-muted absolute left-3.5 top-3.5" />
                  <input
                    type="number"
                    step="0.01"
                    value={form.montoAprox}
                    onChange={(e) => setForm({ ...form, montoAprox: e.target.value })}
                    placeholder="0.00"
                    className="w-full bg-bg-subtle border border-border-custom rounded-md pl-9 pr-4 py-3 text-text-primary focus:border-[#0078D7] outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Área Destino</label>
                <select
                  value={form.areaDestino}
                  onChange={(e) => setForm({ ...form, areaDestino: e.target.value })}
                  className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-3 text-text-primary focus:border-[#0078D7] outline-none font-medium"
                >
                  <option value="LABORATORIO">Laboratorio</option>
                  <option value="LOGISTICA_DESPACHOS">Logística/despachos</option>
                  <option value="OPERATIVA">Operativa</option>
                  <option value="AREAS_COMUN">Areas Comun</option>
                </select>
              </div>

              <div className="pt-2 border-t border-border-custom space-y-4">
                <h4 className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[#0078D7]" /> Referencia o Foto (Opcional)
                </h4>

                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Enlace / Link Web</label>
                  <div className="relative">
                    <LinkIcon className="w-4 h-4 text-text-muted absolute left-3.5 top-3.5" />
                    <input
                      type="url"
                      value={form.referenciaUrl}
                      onChange={(e) => setForm({ ...form, referenciaUrl: e.target.value })}
                      placeholder="https://ejemplo.com/producto"
                      className="w-full bg-bg-subtle border border-border-custom rounded-md pl-9 pr-4 py-3 text-text-primary focus:border-[#0078D7] outline-none text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Foto / Archivo</label>
                  <div className="flex items-center gap-3">
                    <label className="flex-1 flex flex-col items-center justify-center p-4 border border-dashed border-border-custom hover:border-[#0078D7] rounded-lg bg-bg-subtle/50 cursor-pointer transition-colors text-center">
                      <ImageIcon className="w-6 h-6 text-text-muted mb-1" />
                      <span className="text-[10px] text-text-muted">
                        {form.referenciaFileName ? form.referenciaFileName : "Cargar imagen de referencia"}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                    {form.referenciaBase64 && (
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, referenciaBase64: "", referenciaFileName: "" }))}
                        className="text-red-500 hover:text-red-600 text-xs font-bold shrink-0"
                      >
                        Quitar
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-[#0078D7] hover:bg-[#005a9e] text-white py-3 rounded-md font-medium transition-colors mt-6 cursor-pointer"
                disabled={loading}
              >
                {loading ? "Registrando..." : "Enviar a Compras"}
              </button>
            </form>
          </div>
        </div>

        {/* History Column */}
        <div className="lg:col-span-2">
          <div className="bg-bg-card rounded-xl border border-border-custom shadow-xl p-6">
            <h2 className="text-lg font-bold text-text-primary mb-6 flex items-center gap-2 border-b border-border-custom pb-3">
              <Archive className="w-5 h-5 text-[#0078D7]" /> Mis Solicitudes Recientes
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border-custom text-xs font-bold uppercase tracking-wider text-text-muted bg-bg-subtle/30">
                    <th className="py-3 px-4">Artículo</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4 text-right">Monto</th>
                    <th className="py-3 px-4">Área Destino</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4">Observaciones / Enlace</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-custom text-xs">
                  {requests.length > 0 ? (
                    requests.map((r) => (
                      <tr key={r.id} className="hover:bg-bg-subtle/30 transition-colors">
                        <td className="py-4 px-4 font-bold text-text-primary">{r.articulo}</td>
                        <td className="py-4 px-4 text-text-muted">{r.tipoArticulo}</td>
                        <td className="py-4 px-4 text-right font-semibold text-text-primary">$ {r.montoAprox.toLocaleString()}</td>
                        <td className="py-4 px-4 font-semibold text-text-secondary">{r.areaDestino}</td>
                        <td className="py-4 px-4">{getStatusBadge(r.estado)}</td>
                        <td className="py-4 px-4 max-w-xs">
                          <div className="space-y-1">
                            {r.referenciaUrl && (
                              <a
                                href={r.referenciaUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#0078D7] hover:underline block font-semibold"
                              >
                                Ver Referencia
                              </a>
                            )}
                            {r.comentario && (
                              <p className="text-red-400 bg-red-500/10 p-1.5 rounded border border-red-500/20 leading-relaxed">
                                {r.comentario}
                              </p>
                            )}
                            {!r.referenciaUrl && !r.comentario && <span className="text-text-muted italic">-</span>}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-text-muted italic">
                        No has registrado solicitudes de compras aún.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
