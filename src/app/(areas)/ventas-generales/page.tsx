"use client";

import { useState, useEffect, useTransition } from "react";
import { 
  Search, 
  ShoppingBag, 
  RefreshCw, 
  User, 
  Package, 
  ChevronRight, 
  X, 
  ClipboardList,
  Trash2
} from "lucide-react";
import { getSales, updateSaleGeneralInfo, createSaleObservation, deleteSale } from "@/actions/sales";
import { getCurrentUserSession } from "@/actions/users";

export default function VentasGeneralesPage() {
  const [busqueda, setBusqueda] = useState("");
  const [canalFiltro, setCanalFiltro] = useState("TODOS");
  const [entregaFiltro, setEntregaFiltro] = useState("TODOS");
  const [estadoFiltro, setEstadoFiltro] = useState("TODOS");
  const [demoraFiltro, setDemoraFiltro] = useState("TODAS");

  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [isPending, startTransition] = useTransition();

  // Modal Details
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  
  // New Obs Input
  const [nuevaObservacion, setNuevaObservacion] = useState("");
  
  // Edit Form Fields
  const [editCanal, setEditCanal] = useState("TIENDA");
  const [editEntrega, setEditEntrega] = useState("ENVIO");
  const [editEstado, setEditEstado] = useState("PENDIENTE");

  const loadData = async () => {
    setLoading(true);
    const res = await getSales();
    if (res.success) {
      setSales(res.sales || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    getCurrentUserSession().then(res => {
      if (res.success && res.session) {
        setSession(res.session);
      }
    });
  }, []);

  const getElapsedDays = (createdAt: Date | string) => {
    if (!createdAt) return 1;
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getAlertColorClasses = (days: number, estado: string) => {
    if (estado === "ENTREGADO" || estado === "COMPLETO") {
      return {
        cardBorder: "border-l-indigo-500/20",
        badge: "bg-indigo-950 text-indigo-400 border-indigo-900/50",
        bgLight: "bg-indigo-950/20",
        label: "Entregado"
      };
    }
    if (days >= 7) {
      return {
        cardBorder: "border-l-rose-500 border-l-4",
        badge: "bg-rose-950 text-rose-400 border-rose-900/50 animate-pulse",
        bgLight: "bg-rose-950/20",
        label: "Crítico"
      };
    } else if (days >= 5) {
      return {
        cardBorder: "border-l-amber-500 border-l-4",
        badge: "bg-amber-950 text-amber-400 border-amber-900/50 animate-pulse",
        bgLight: "bg-amber-950/20",
        label: "Demorado"
      };
    } else {
      return {
        cardBorder: "border-l-emerald-500 border-l-4",
        badge: "bg-emerald-950 text-emerald-400 border-emerald-900/50",
        bgLight: "bg-emerald-950/20",
        label: "Al día"
      };
    }
  };

  const abrirModal = (sale: any) => {
    setSelectedSale(sale);
    setEditCanal(sale.puntoVenta || "TIENDA");
    setEditEntrega(sale.tipoEntrega || "ENVIO");
    setEditEstado(sale.estado || "PENDIENTE");
    setIsModalOpen(true);
  };

  const handleUpdateGeneralInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSale) return;

    setLoading(true);
    const res = await updateSaleGeneralInfo(selectedSale.id, {
      puntoVenta: editCanal,
      tipoEntrega: editEntrega,
      estado: editEstado
    });
    setLoading(false);

    if (res.success) {
      alert("Información general de la venta actualizada correctamente.");
      setIsModalOpen(false);
      loadData();
    } else {
      alert("Error al actualizar la información: " + res.error);
    }
  };

  const handleSaveObservation = async () => {
    if (!nuevaObservacion.trim() || !selectedSale) {
      alert("Por favor escribe una observación antes de guardar.");
      return;
    }

    setLoading(true);
    const res = await createSaleObservation({ 
      saleId: selectedSale.id, 
      texto: nuevaObservacion 
    });
    setLoading(false);

    if (res.success) {
      alert("Observación registrada con éxito.");
      setNuevaObservacion("");
      
      const updatedObs = [res.observation, ...(selectedSale.observations || [])];
      setSelectedSale({ ...selectedSale, observations: updatedObs });
      
      loadData();
    } else {
      alert("Error al registrar la observación: " + res.error);
    }
  };

  // Filtering Logic
  const filteredSales = sales.filter(s => {
    const elapsedDays = getElapsedDays(s.createdAt);

    const matchesSearch = 
      s.client.razonSocial.toLowerCase().includes(busqueda.toLowerCase()) ||
      s.numeroOrden.toLowerCase().includes(busqueda.toLowerCase()) ||
      (s.details && s.details.some((d: any) => d.producto.nombre.toLowerCase().includes(busqueda.toLowerCase())));

    const matchesCanal = canalFiltro === "TODOS" || s.puntoVenta === canalFiltro;
    const matchesEntrega = entregaFiltro === "TODOS" || s.tipoEntrega === entregaFiltro;
    const matchesEstado = estadoFiltro === "TODOS" || s.estado === estadoFiltro;
    
    let matchesDemora = true;
    if (demoraFiltro === "NORMAL") {
      matchesDemora = elapsedDays < 5 && s.estado !== "ENTREGADO";
    } else if (demoraFiltro === "ADVERTENCIA") {
      matchesDemora = elapsedDays >= 5 && elapsedDays < 7 && s.estado !== "ENTREGADO";
    } else if (demoraFiltro === "CRITICO") {
      matchesDemora = elapsedDays >= 7 && s.estado !== "ENTREGADO";
    } else if (demoraFiltro === "ENTREGADO") {
      matchesDemora = s.estado === "ENTREGADO";
    }

    return matchesSearch && matchesCanal && matchesEntrega && matchesEstado && matchesDemora;
  });

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex justify-between items-end mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-wide flex items-center gap-3 mb-2">
            <ShoppingBag className="text-[#0078D7] w-8 h-8" />
            Ventas Generales
          </h1>
          <p className="text-text-muted">Directorio unificado de facturación, canales de venta, logística de entrega e historial de observaciones auditadas.</p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 bg-bg-card hover:bg-bg-subtle text-text-secondary px-4 py-2.5 rounded-md font-bold transition-all border border-border-custom shadow-sm cursor-pointer text-xs"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Sincronizar
        </button>
      </div>

      {/* Filtros y Buscador */}
      <div className="bg-bg-card border border-border-custom rounded-xl p-5 shadow-lg space-y-4 mb-8">
        <div className="flex flex-col lg:flex-row gap-4">
          
          {/* Texto */}
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3 top-3 text-gray-500" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full bg-bg-sidebar border border-border-custom rounded-md pl-10 pr-4 py-2.5 text-text-primary placeholder-gray-500 focus:border-[#0078D7] outline-none transition-colors text-sm"
              placeholder="Buscar por cliente, nro de pedido o producto..."
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
            {/* Canal */}
            <div className="flex flex-col">
              <label className="text-[10px] text-text-muted uppercase font-bold tracking-wider mb-1">Canal de Venta</label>
              <select
                value={canalFiltro}
                onChange={(e) => setCanalFiltro(e.target.value)}
                className="bg-bg-sidebar border border-border-custom rounded px-3 py-2 text-xs text-text-primary focus:border-[#0078D7] outline-none"
              >
                <option value="TODOS">Todos</option>
                <option value="MERCADO_LIBRE">Mercado Libre</option>
                <option value="TIENDA">Tienda</option>
                <option value="MAIL">Mail</option>
              </select>
            </div>

            {/* Entrega */}
            <div className="flex flex-col">
              <label className="text-[10px] text-text-muted uppercase font-bold tracking-wider mb-1">Entrega</label>
              <select
                value={entregaFiltro}
                onChange={(e) => setEntregaFiltro(e.target.value)}
                className="bg-bg-sidebar border border-border-custom rounded px-3 py-2 text-xs text-text-primary focus:border-[#0078D7] outline-none"
              >
                <option value="TODOS">Todos</option>
                <option value="ENVIO">Envío</option>
                <option value="RETIRO">Retiro</option>
              </select>
            </div>

            {/* Estado */}
            <div className="flex flex-col">
              <label className="text-[10px] text-text-muted uppercase font-bold tracking-wider mb-1">Estado</label>
              <select
                value={estadoFiltro}
                onChange={(e) => setEstadoFiltro(e.target.value)}
                className="bg-bg-sidebar border border-border-custom rounded px-3 py-2 text-xs text-text-primary focus:border-[#0078D7] outline-none"
              >
                <option value="TODOS">Todos</option>
                <option value="PENDIENTE">Pendiente</option>
                <option value="FACTURADO">Facturado</option>
                <option value="PAGADO">Cobrado/Pagado</option>
                <option value="ENVIADO">Enviado</option>
                <option value="ENTREGADO">Entregado</option>
              </select>
            </div>

            {/* Demora */}
            <div className="flex flex-col">
              <label className="text-[10px] text-text-muted uppercase font-bold tracking-wider mb-1">Semáforo / Alertas</label>
              <select
                value={demoraFiltro}
                onChange={(e) => setDemoraFiltro(e.target.value)}
                className="bg-bg-sidebar border border-border-custom rounded px-3 py-2 text-xs text-text-primary focus:border-[#0078D7] outline-none"
              >
                <option value="TODAS">Todas</option>
                <option value="NORMAL">Al día (1-4 días)</option>
                <option value="ADVERTENCIA">Advertencia (5-6 días)</option>
                <option value="CRITICO">Demorado (7-8+ días)</option>
                <option value="ENTREGADO">Entregados</option>
              </select>
            </div>

          </div>
        </div>
      </div>

      {/* Ventas Table */}
      <div className="bg-bg-card border border-border-custom rounded-xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-text-muted">Cargando ventas generales...</div>
          ) : filteredSales.length === 0 ? (
            <div className="p-12 text-center text-text-muted">No se encontraron ventas cargadas en el sistema.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-bg-subtle border-b border-border-custom text-xs uppercase tracking-wider text-text-muted font-bold">
                  <th className="p-4 pl-6">Alerta</th>
                  <th className="p-4">Cliente</th>
                  <th className="p-4">Fecha Compra</th>
                  <th className="p-4">Productos</th>
                  <th className="p-4 text-center">Punto de Venta</th>
                  <th className="p-4 text-center">Entrega</th>
                  <th className="p-4 text-center">Nro Pedido</th>
                  <th className="p-4 text-center">Estado</th>
                  <th className="p-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom text-sm text-text-secondary">
                {filteredSales.map((sale) => {
                  const elapsedDays = getElapsedDays(sale.createdAt);
                  const alertStyle = getAlertColorClasses(elapsedDays, sale.estado);

                  return (
                    <tr key={sale.id} className={`hover:bg-bg-subtle/40 transition-colors border-l-4 ${alertStyle.cardBorder}`}>
                      
                      {/* Alerta */}
                      <td className="p-4 pl-6">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${alertStyle.badge}`}>
                          {sale.estado === "ENTREGADO" ? "Completado" : `${elapsedDays} ${elapsedDays === 1 ? 'Día' : 'Días'}`}
                        </span>
                      </td>

                      {/* Cliente */}
                      <td className="p-4 font-semibold text-text-primary">
                        {sale.client.razonSocial}
                      </td>

                      {/* Fecha Compra */}
                      <td className="p-4 font-mono text-xs">
                        {new Date(sale.createdAt).toLocaleDateString("es-AR")}
                      </td>

                      {/* Productos */}
                      <td className="p-4 max-w-[220px]">
                        <div className="space-y-1">
                          {sale.details && sale.details.map((d: any, idx: number) => (
                            <p key={idx} className="text-xs text-text-secondary truncate flex items-center gap-1.5">
                              <Package className="w-3.5 h-3.5 text-[#0078D7] shrink-0" />
                              <span className="font-bold text-text-primary">{d.cantidad}x</span> {d.producto.nombre}
                            </p>
                          ))}
                        </div>
                      </td>

                      {/* Punto de Venta */}
                      <td className="p-4 text-center">
                        {sale.puntoVenta === "MERCADO_LIBRE" ? (
                          <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2.5 py-1 rounded font-bold uppercase tracking-wider">Mercado Libre</span>
                        ) : sale.puntoVenta === "TIENDA" ? (
                          <span className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/30 px-2.5 py-1 rounded font-bold uppercase tracking-wider">Tienda</span>
                        ) : (
                          <span className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/30 px-2.5 py-1 rounded font-bold uppercase tracking-wider">Mail</span>
                        )}
                      </td>

                      {/* Entrega */}
                      <td className="p-4 text-center">
                        {sale.tipoEntrega === "RETIRO" ? (
                          <span className="text-[10px] bg-rose-500/10 text-rose-500 border border-rose-500/30 px-2.5 py-1 rounded font-bold uppercase tracking-wider">Retiro</span>
                        ) : (
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 px-2.5 py-1 rounded font-bold uppercase tracking-wider">Envío</span>
                        )}
                      </td>

                      {/* Nro Pedido */}
                      <td className="p-4 text-center font-mono font-bold text-xs text-text-primary">
                        {sale.numeroOrden}
                      </td>

                      {/* Estado */}
                      <td className="p-4 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                          sale.estado === "ENTREGADO" ? "bg-indigo-950 text-indigo-400 border-indigo-900/50" :
                          sale.estado === "ENVIADO" ? "bg-blue-950 text-blue-400 border-blue-900/50" :
                          sale.estado === "PAGADO" ? "bg-emerald-950 text-emerald-400 border-emerald-900/50" :
                          "bg-yellow-950 text-yellow-400 border-yellow-900/50"
                        }`}>
                          {sale.estado}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => abrirModal(sale)}
                            className="inline-flex items-center gap-1 bg-[#0078D7]/10 hover:bg-[#0078D7] text-[#0078D7] hover:text-white px-3 py-1.5 rounded transition-all border border-[#0078D7]/30 hover:border-transparent text-xs font-bold cursor-pointer"
                          >
                            Detalle
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                          {session?.rol === "ADMIN" && (
                            <button
                              onClick={async () => {
                                if (confirm(`¿Está seguro de eliminar la venta ${sale.numeroOrden}? Esta acción no se puede deshacer y eliminará de forma permanente todos los cobros, facturas y envíos asociados.`)) {
                                  setLoading(true);
                                  const res = await deleteSale(sale.id);
                                  setLoading(false);
                                  if (res.success) {
                                    alert("Venta eliminada con éxito.");
                                    loadData();
                                  } else {
                                    alert("Error: " + res.error);
                                  }
                                }
                              }}
                              className="inline-flex items-center justify-center p-1.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded transition-all border border-red-500/30 hover:border-transparent cursor-pointer"
                              title="Eliminar venta"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Detalle */}
      {isModalOpen && selectedSale && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-card border border-border-custom rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-border-custom bg-bg-subtle shrink-0">
              <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-[#0078D7]" />
                Orden General: {selectedSale.numeroOrden}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Panel Info & Edición */}
                <form onSubmit={handleUpdateGeneralInfo} className="bg-bg-sidebar border border-border-custom rounded-lg p-5 space-y-4 text-left">
                  <h3 className="text-sm font-bold text-text-primary uppercase tracking-wide border-b border-border-custom pb-2">Información del Pedido</h3>
                  
                  <div className="space-y-1">
                    <p className="text-xs text-text-muted uppercase font-bold tracking-wider">Cliente</p>
                    <p className="text-sm font-bold text-text-primary flex items-center gap-1.5"><User className="w-4 h-4 text-[#0078D7]" /> {selectedSale.client.razonSocial}</p>
                    <p className="text-xs text-text-muted">CUIT: {selectedSale.client.cuit}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs text-text-muted uppercase font-bold tracking-wider">Punto de Venta</label>
                      <select
                        value={editCanal}
                        onChange={(e) => setEditCanal(e.target.value)}
                        className="w-full bg-bg-card border border-border-custom rounded px-3 py-2 text-xs text-text-primary focus:border-[#0078D7] outline-none"
                      >
                        <option value="MERCADO_LIBRE">Mercado Libre</option>
                        <option value="TIENDA">Tienda</option>
                        <option value="MAIL">Mail</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-text-muted uppercase font-bold tracking-wider">Tipo de Entrega</label>
                      <select
                        value={editEntrega}
                        onChange={(e) => setEditEntrega(e.target.value)}
                        className="w-full bg-bg-card border border-border-custom rounded px-3 py-2 text-xs text-text-primary focus:border-[#0078D7] outline-none"
                      >
                        <option value="ENVIO">Envío</option>
                        <option value="RETIRO">Retiro</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-text-muted uppercase font-bold tracking-wider">Estado de la Venta</label>
                    <select
                      value={editEstado}
                      onChange={(e) => setEditEstado(e.target.value)}
                      className="w-full bg-bg-card border border-border-custom rounded px-3 py-2 text-xs text-text-primary focus:border-[#0078D7] outline-none"
                    >
                      <option value="PENDIENTE">PENDIENTE</option>
                      <option value="FACTURADO">FACTURADO</option>
                      <option value="PAGADO">COBRADO / PAGADO</option>
                      <option value="ENVIADO">ENVIADO</option>
                      <option value="ENTREGADO">ENTREGADO</option>
                    </select>
                  </div>

                  <div className="flex justify-end pt-3">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition-all shadow-md cursor-pointer"
                    >
                      Guardar Cambios
                    </button>
                  </div>
                </form>

                {/* Lista de Productos y Costos */}
                <div className="bg-bg-sidebar border border-border-custom rounded-lg p-5 space-y-4 text-left">
                  <h3 className="text-sm font-bold text-text-primary uppercase tracking-wide border-b border-border-custom pb-2">Artículos & Total</h3>
                  
                  <div className="divide-y divide-border-custom space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {selectedSale.details && selectedSale.details.map((d: any, idx: number) => (
                      <div key={idx} className="py-3 flex flex-col gap-2 text-xs">
                        <div className="flex justify-between items-center w-full">
                          <div className="flex items-center gap-2">
                            <span className="bg-bg-card text-text-primary border border-border-custom px-2 py-0.5 rounded text-[10px] font-bold font-mono">{d.cantidad}x</span>
                            <span className="text-text-secondary font-semibold">{d.producto.nombre}</span>
                          </div>
                          <span className="text-text-primary font-bold">{selectedSale.moneda === "USD" ? "US$" : "$"} {(d.cantidad * d.precioUnitario).toLocaleString()}</span>
                        </div>
                        {d.componentesSeleccionados && (
                          <div className="pl-4 mt-1 border-l-2 border-teal-500 text-[10px] text-text-muted space-y-1 bg-teal-500/5 p-2 rounded-r-md">
                            <p className="font-bold text-teal-600 dark:text-teal-400">Componentes incluidos en la solución:</p>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                              {JSON.parse(d.componentesSeleccionados).map((comp: any, cIdx: number) => (
                                <p key={cIdx}>• {comp.nombre} (x{comp.cantidad})</p>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-border-custom pt-4 flex justify-between items-center font-bold">
                    <span className="text-text-muted text-xs">Total Facturado</span>
                    <span className="text-emerald-500 text-lg">{selectedSale.moneda === "USD" ? "US$" : "$"} {selectedSale.total.toLocaleString()}</span>
                  </div>
                </div>

              </div>

              {/* Bitácora de Observaciones */}
              <div className="bg-bg-sidebar border border-border-custom rounded-lg p-5 space-y-4 text-left">
                <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest border-b border-border-custom pb-2">Bitácora de Observaciones</h3>
                
                {/* Agregar observación */}
                <div className="space-y-2">
                  <textarea
                    value={nuevaObservacion}
                    onChange={(e) => setNuevaObservacion(e.target.value)}
                    placeholder="Escribe una observación para este pedido..."
                    className="w-full bg-bg-card border border-border-custom rounded-lg p-3 text-sm text-text-primary outline-none focus:border-[#0078D7] min-h-[70px]"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveObservation}
                      className="px-4 py-1.5 bg-[#0078D7] hover:bg-[#005a9e] text-white rounded text-xs font-bold transition-colors cursor-pointer"
                    >
                      Registrar Observación
                    </button>
                  </div>
                </div>

                {/* Historial */}
                <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
                  {selectedSale.observations && selectedSale.observations.length > 0 ? (
                    selectedSale.observations.map((obs: any) => (
                      <div key={obs.id} className="p-3 bg-bg-card rounded border border-border-custom/50 space-y-1 text-xs">
                        <div className="flex justify-between items-center text-text-muted">
                          <span className="font-bold text-text-secondary">
                            {obs.user?.nombre || "Usuario"} 
                            <span className="font-normal text-[9px] bg-bg-subtle border border-border-custom px-1 py-0.5 rounded ml-1.5 uppercase font-mono">
                              {obs.user?.rol || "Operador"}
                            </span>
                          </span>
                          <span>{new Date(obs.createdAt).toLocaleString("es-AR")}</span>
                        </div>
                        <p className="text-text-primary leading-relaxed">{obs.texto}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-text-muted italic text-center py-2">No se han registrado observaciones en este pedido.</p>
                  )}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="flex justify-end p-6 border-t border-border-custom bg-bg-subtle shrink-0">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2 bg-bg-card hover:bg-bg-subtle text-text-primary border border-border-custom rounded font-bold transition-colors cursor-pointer text-xs"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
