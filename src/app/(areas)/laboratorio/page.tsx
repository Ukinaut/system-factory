"use client";

import { useState, useEffect } from "react";
import { Wrench, Search, Plus, User, AlertCircle, CheckCircle2, Clock, PenTool, X, Save } from "lucide-react";
import { getClaims, updateClaimRMA } from "@/actions/claims";
import Link from "next/link";

export default function LaboratorioDashboard() {
  const [busqueda, setBusqueda] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ordenSeleccionada, setOrdenSeleccionada] = useState<any>(null);
  const [ordenes, setOrdenes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [formDiagnostico, setFormDiagnostico] = useState("");
  const [formEstado, setFormEstado] = useState("");
  const [formTecnico, setFormTecnico] = useState("");
  const [nuevoRepuesto, setNuevoRepuesto] = useState("");
  const [listaRepuestos, setListaRepuestos] = useState<string[]>([]);

  const estados = ["Ingresado", "En Reparación", "Esperando Repuesto", "Terminado"];

  const loadData = async () => {
    setLoading(true);
    const res = await getClaims();
    if (res.success) {
      // Mapear los campos de la base de datos a los que espera el componente
      const formatted = (res.claims || []).map((c: any) => ({
        id: c.id,
        cliente: c.client?.razonSocial || "Cliente Desconocido",
        equipo: c.tipo === "ARTICULO" ? "Artículo / Hardware" : "Servicio Satelital",
        falla: c.observacion,
        estado: c.estado || "Ingresado",
        tecnico: c.tecnico || "Sin asignar",
        diagnostico: c.diagnostico || "",
        repuestos: JSON.parse(c.repuestos || "[]"),
        fecha: new Date(c.fecha).toLocaleDateString(),
      }));
      setOrdenes(formatted);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const abrirModal = (orden: any) => {
    setOrdenSeleccionada(orden);
    setFormDiagnostico(orden.diagnostico);
    setFormEstado(orden.estado);
    setFormTecnico(orden.tecnico);
    setListaRepuestos([...orden.repuestos]);
    setIsModalOpen(true);
  };

  const guardarCambios = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await updateClaimRMA({
      id: ordenSeleccionada.id,
      estado: formEstado,
      tecnico: formTecnico,
      diagnostico: formDiagnostico,
      repuestos: listaRepuestos,
    });
    setLoading(false);
    if (res.success) {
      alert("Orden de trabajo actualizada correctamente.");
      setIsModalOpen(false);
      loadData();
    } else {
      alert("Error al actualizar la orden: " + res.error);
    }
  };

  const agregarRepuesto = () => {
    if (nuevoRepuesto.trim() !== "") {
      setListaRepuestos([...listaRepuestos, nuevoRepuesto.trim()]);
      setNuevoRepuesto("");
    }
  };

  const quitarRepuesto = (idx: number) => {
    setListaRepuestos(listaRepuestos.filter((_, i) => i !== idx));
  };

  const getColumna = (estadoNombre: string) => {
    return ordenes.filter(o => 
      o.estado === estadoNombre && 
      (o.cliente.toLowerCase().includes(busqueda.toLowerCase()) || o.id.toLowerCase().includes(busqueda.toLowerCase()))
    );
  };

  if (loading && ordenes.length === 0) {
    return (
      <div className="p-8 text-center text-text-muted">
        Cargando órdenes de trabajo de Laboratorio...
      </div>
    );
  }

  return (
    <div className="max-w-screen-2xl mx-auto pb-12 overflow-x-hidden">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-wide flex items-center gap-3 mb-2">
            <Wrench className="text-orange-500 w-8 h-8" />
            I. Laboratorio Técnico
          </h1>
          <p className="text-text-muted">Gestión de reparaciones (RMA), diagnósticos y uso de repuestos.</p>
        </div>
        <div className="flex gap-4">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-2.5 text-gray-500" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="bg-bg-card border border-border-custom rounded-md pl-10 pr-4 py-2 text-text-primary focus:border-orange-500 outline-none transition-colors w-64"
              placeholder="Buscar OT o Cliente..."
            />
          </div>
          <Link href="/ventas/reclamo" className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2 rounded-md font-medium transition-colors flex items-center gap-2 cursor-pointer">
            <Plus className="w-5 h-5" /> Nueva Orden (OT)
          </Link>
        </div>
      </div>

      {/* KANBAN BOARD */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        
        {/* Columna: INGRESADO */}
        <div className="bg-bg-sidebar rounded-xl border border-border-custom p-4 flex flex-col h-[calc(100vh-220px)]">
          <div className="flex justify-between items-center mb-4 border-b border-border-custom pb-3">
            <h3 className="font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4 text-gray-500" /> Ingresados
            </h3>
            <span className="bg-bg-subtle text-text-muted text-xs px-2 py-0.5 rounded-full font-bold">{getColumna("Ingresado").length}</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
            {getColumna("Ingresado").map(ot => (
              <div key={ot.id} onClick={() => abrirModal(ot)} className="bg-bg-card border border-border-custom hover:border-orange-500/50 p-4 rounded-lg cursor-pointer transition-all shadow-lg hover:shadow-orange-950/25 group">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-mono bg-bg-subtle text-text-muted px-2 py-1 rounded border border-border-custom">{ot.id.substring(0, 8)}</span>
                  <span className="text-[10px] text-text-muted flex items-center gap-1"><Clock className="w-3 h-3" /> {ot.fecha}</span>
                </div>
                <h4 className="font-bold text-text-primary text-sm mb-1">{ot.cliente}</h4>
                <p className="text-xs text-orange-500 font-medium mb-2">{ot.equipo}</p>
                <p className="text-xs text-text-muted line-clamp-2 leading-relaxed mb-3">{ot.falla}</p>
                <div className="flex items-center gap-2 text-xs text-text-muted border-t border-border-custom pt-3">
                  <User className="w-3.5 h-3.5" /> {ot.tecnico}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Columna: EN REPARACIÓN */}
        <div className="bg-bg-sidebar rounded-xl border border-border-custom p-4 flex flex-col h-[calc(100vh-220px)]">
          <div className="flex justify-between items-center mb-4 border-b border-blue-500/30 pb-3">
            <h3 className="font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2 text-sm">
              <PenTool className="w-4 h-4" /> En Reparación
            </h3>
            <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded-full font-bold">{getColumna("En Reparación").length}</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
            {getColumna("En Reparación").map(ot => (
              <div key={ot.id} onClick={() => abrirModal(ot)} className="bg-bg-card border border-border-custom border-l-4 border-l-blue-500 hover:border-blue-500/50 p-4 rounded-lg cursor-pointer transition-all shadow-lg hover:shadow-blue-950/25">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-mono bg-bg-subtle text-text-muted px-2 py-1 rounded border border-border-custom">{ot.id.substring(0, 8)}</span>
                </div>
                <h4 className="font-bold text-text-primary text-sm mb-1">{ot.cliente}</h4>
                <p className="text-xs text-orange-500 font-medium mb-2">{ot.equipo}</p>
                <div className="flex items-center gap-2 text-xs text-blue-400 border-t border-border-custom pt-3 mt-3">
                  <User className="w-3.5 h-3.5" /> {ot.tecnico}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Columna: ESPERANDO REPUESTO */}
        <div className="bg-bg-sidebar rounded-xl border border-border-custom p-4 flex flex-col h-[calc(100vh-220px)]">
          <div className="flex justify-between items-center mb-4 border-b border-amber-500/30 pb-3">
            <h3 className="font-bold text-amber-500 uppercase tracking-wider flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4" /> Esperando Repuesto
            </h3>
            <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-0.5 rounded-full font-bold">{getColumna("Esperando Repuesto").length}</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
            {getColumna("Esperando Repuesto").map(ot => (
              <div key={ot.id} onClick={() => abrirModal(ot)} className="bg-bg-card border border-border-custom border-l-4 border-l-amber-500 hover:border-amber-500/50 p-4 rounded-lg cursor-pointer transition-all shadow-lg hover:shadow-amber-950/25">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-mono bg-bg-subtle text-text-muted px-2 py-1 rounded border border-border-custom">{ot.id.substring(0, 8)}</span>
                </div>
                <h4 className="font-bold text-text-primary text-sm mb-1">{ot.cliente}</h4>
                <p className="text-xs text-orange-500 font-medium mb-2">{ot.equipo}</p>
                <div className="bg-amber-500/10 text-amber-500 text-[10px] px-2 py-1.5 rounded mt-2 uppercase font-bold tracking-wider">Faltan Repuestos</div>
              </div>
            ))}
          </div>
        </div>

        {/* Columna: TERMINADO */}
        <div className="bg-bg-sidebar rounded-xl border border-border-custom p-4 flex flex-col h-[calc(100vh-220px)]">
          <div className="flex justify-between items-center mb-4 border-b border-emerald-500/30 pb-3">
            <h3 className="font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4" /> Terminados
            </h3>
            <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded-full font-bold">{getColumna("Terminado").length}</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
            {getColumna("Terminado").map(ot => (
              <div key={ot.id} onClick={() => abrirModal(ot)} className="bg-bg-card border border-border-custom border-l-4 border-l-emerald-500 hover:border-emerald-500/50 p-4 rounded-lg cursor-pointer transition-all shadow-lg hover:shadow-emerald-950/25 opacity-70">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-mono bg-bg-subtle text-text-muted px-2 py-1 rounded border border-border-custom">{ot.id.substring(0, 8)}</span>
                </div>
                <h4 className="font-bold text-text-primary text-sm mb-1">{ot.cliente}</h4>
                <p className="text-xs text-orange-500 font-medium mb-2">{ot.equipo}</p>
                <p className="text-xs text-text-muted line-clamp-2 italic mb-3">"{ot.diagnostico}"</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* MODAL: DIAGNOSTICO Y REPARACION */}
      {isModalOpen && ordenSeleccionada && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-card border border-border-custom rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-border-custom bg-bg-subtle shrink-0">
              <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                <Wrench className="w-5 h-5 text-orange-500" />
                Gestión de Orden: {ordenSeleccionada.id.substring(0, 8)}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-text-muted hover:text-text-primary transition-colors cursor-pointer">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
              {/* Resumen del Ingreso */}
              <div className="bg-bg-subtle p-4 rounded-lg border border-border-custom mb-6 flex items-start gap-4">
                <div className="p-3 bg-bg-card rounded-lg border border-border-custom"><AlertCircle className="w-6 h-6 text-text-muted" /></div>
                <div>
                  <p className="text-xs text-text-muted uppercase font-bold mb-1">Motivo del Reporte ({ordenSeleccionada.cliente})</p>
                  <p className="text-text-primary font-bold mb-1">{ordenSeleccionada.equipo}</p>
                  <p className="text-sm text-text-muted italic">"{ordenSeleccionada.falla}"</p>
                </div>
              </div>

              <form id="form-reparacion" onSubmit={guardarCambios} className="space-y-6">
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Estado del Equipo</label>
                    <select 
                      value={formEstado} 
                      onChange={e => setFormEstado(e.target.value)} 
                      className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-3 text-text-primary outline-none focus:border-orange-500"
                    >
                      {estados.map(est => <option key={est} value={est}>{est}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Técnico Asignado</label>
                    <select 
                      value={formTecnico} 
                      onChange={e => setFormTecnico(e.target.value)} 
                      className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-3 text-text-primary outline-none focus:border-orange-500"
                    >
                      <option value="Sin asignar">Sin asignar</option>
                      <option value="Carlos Ruiz">Carlos Ruiz</option>
                      <option value="Ana Gómez">Ana Gómez</option>
                      <option value="Juan Pérez">Juan Pérez</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Diagnóstico Técnico y Acciones</label>
                  <textarea 
                    value={formDiagnostico} 
                    onChange={e => setFormDiagnostico(e.target.value)} 
                    className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-3 text-text-primary focus:border-orange-500 outline-none h-32" 
                    placeholder="Escriba el diagnóstico y los pasos realizados para la reparación..."
                  ></textarea>
                </div>

                {/* Repuestos Usados */}
                <div className="bg-bg-sidebar border border-border-custom rounded-lg p-4">
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Repuestos Insumidos</label>
                  
                  {listaRepuestos.length > 0 ? (
                    <ul className="mb-4 space-y-2">
                      {listaRepuestos.map((repuesto, idx) => (
                        <li key={idx} className="flex justify-between items-center bg-bg-subtle border border-border-custom px-3 py-2 rounded text-sm text-text-secondary">
                          {repuesto}
                          <button type="button" onClick={() => quitarRepuesto(idx)} className="text-red-500 hover:text-red-400 text-xs cursor-pointer">Quitar</button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-text-muted italic mb-4">No se han utilizado repuestos aún.</p>
                  )}

                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={nuevoRepuesto} 
                      onChange={e => setNuevoRepuesto(e.target.value)} 
                      onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), agregarRepuesto())}
                      className="flex-1 bg-bg-subtle border border-border-custom rounded-md px-3 py-2 text-sm text-text-primary focus:border-orange-500 outline-none" 
                      placeholder="Ej: Antena de Repuesto, Cable de Red..." 
                    />
                    <button type="button" onClick={agregarRepuesto} className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer">
                      Añadir
                    </button>
                  </div>
                </div>

              </form>
            </div>

            <div className="flex justify-end gap-4 p-6 border-t border-border-custom bg-bg-subtle shrink-0">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 rounded-md text-text-secondary hover:bg-bg-card border border-border-custom transition-colors cursor-pointer" disabled={loading}>Cancelar</button>
              <button form="form-reparacion" type="submit" className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-md font-medium flex items-center gap-2 cursor-pointer" disabled={loading}>
                <Save className="w-4 h-4" /> 
                {loading ? "Guardando..." : "Guardar Orden"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
