"use client";

import { useState, useEffect } from "react";
import { 
  ClipboardList, 
  Search, 
  User, 
  Receipt, 
  Banknote, 
  Truck, 
  Clock, 
  X, 
  Package 
} from "lucide-react";
import { getSales, skipBillingAndCollection, createSaleObservation } from "@/actions/sales";
import { getInvoicesWithPayments } from "@/actions/billing";
import { getCurrentUserSession } from "@/actions/users";

export default function EstadoPedidosPage() {
  const [busqueda, setBusqueda] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<any>(null);
  const [sales, setSales] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [nuevaObservacion, setNuevaObservacion] = useState("");
  const [session, setSession] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    const salesRes = await getSales();
    const invRes = await getInvoicesWithPayments();
    
    if (salesRes.success) {
      setSales(salesRes.sales || []);
    }
    if (invRes.success) {
      setInvoices(invRes.invoices || []);
    }
    const sessionRes = await getCurrentUserSession();
    if (sessionRes.success) {
      setSession(sessionRes.session);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const getStageAndDetails = (sale: any) => {
    // Buscar facturas asociadas a esta venta
    const associatedInvoices = invoices.filter(inv => inv.saleId === sale.id);
    const hasInvoice = associatedInvoices.length > 0;
    const hasPayment = associatedInvoices.some(inv => inv.payments.length > 0);

    let stage: "facturacion" | "cobranzas" | "envio" = "facturacion";
    
    if (sale.estado === "PENDIENTE") {
      stage = "facturacion";
    } else if (sale.estado === "FACTURADO" && !hasPayment) {
      stage = "cobranzas";
    } else {
      stage = "envio";
    }

    return {
      stage,
      hasInvoice,
      hasPayment,
      invoiceDate: hasInvoice ? new Date(associatedInvoices[0].fecha).toLocaleDateString() : undefined,
      paymentDate: hasPayment ? new Date(associatedInvoices[0].payments[0].fechaPago).toLocaleDateString() : undefined,
    };
  };

  const pedidos = sales.map(sale => {
    const details = getStageAndDetails(sale);
    return {
      id: sale.id,
      numeroOrden: sale.numeroOrden,
      cliente: {
        razonSocial: sale.client?.razonSocial || "Desconocido",
        cuit: sale.client?.cuit || "N/A",
        correo: sale.client?.correo || "N/A",
        telefono: sale.client?.telefono || "N/A",
        direccion: sale.client?.direccion || "N/A",
      },
      productos: (sale.details || []).map((d: any) => ({
        nombre: d.producto?.nombre || "Producto Desconocido",
        cantidad: d.cantidad,
        precioUnitario: d.precioUnitario,
        componentesSeleccionados: d.componentesSeleccionados || null,
      })),
      moneda: sale.moneda || "ARS",
      total: sale.total,
      stage: details.stage,
      estadoText: sale.estado,
      facturacionText: details.hasInvoice ? "Facturado" : "No Facturado",
      cobranzasText: details.hasPayment ? "Cobrado" : "No Cobrado",
      enviosText: sale.estado === "ENVIADO" ? "Despachado" : "En preparación",
      invoiceDate: details.invoiceDate,
      paymentDate: details.paymentDate,
      createdAt: sale.createdAt,
      observations: sale.observations || [],
    };
  });

  const pedidosFiltrados = pedidos.filter(p => 
    p.cliente.razonSocial.toLowerCase().includes(busqueda.toLowerCase()) || 
    p.numeroOrden.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.productos.some((prod: any) => prod.nombre.toLowerCase().includes(busqueda.toLowerCase()))
  );

  const abrirModal = (pedido: any) => {
    setPedidoSeleccionado(pedido);
    setIsModalOpen(true);
  };

  const handleSkipSteps = async (saleId: string) => {
    if (!confirm("¿Estás seguro de que deseas omitir los pasos de facturación y cobranza para este pedido? Esto enviará el pedido directamente a Logística.")) {
      return;
    }
    setLoading(true);
    const res = await skipBillingAndCollection(saleId);
    setLoading(false);
    if (res.success) {
      alert("Pasos de facturación y cobranza omitidos. El pedido ya está en etapa de envío.");
      setIsModalOpen(false);
      loadData();
    } else {
      alert("Error al omitir pasos: " + res.error);
    }
  };

  const handleSaveObservation = async (saleId: string) => {
    if (!nuevaObservacion.trim()) {
      alert("Por favor escribe una observación antes de guardar.");
      return;
    }
    setLoading(true);
    const res = await createSaleObservation({ saleId, texto: nuevaObservacion });
    setLoading(false);
    if (res.success) {
      alert("Observación guardada con éxito.");
      setNuevaObservacion("");
      // Update selected pedido in-place to avoid closing the modal
      const updatedObs = [res.observation, ...(pedidoSeleccionado.observations || [])];
      setPedidoSeleccionado({ ...pedidoSeleccionado, observations: updatedObs });
      loadData();
    } else {
      alert("Error al guardar la observación: " + res.error);
    }
  };

  const getElapsedDays = (createdAt: Date | string) => {
    if (!createdAt) return 1;
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getAlertColorClasses = (days: number) => {
    if (days <= 4) {
      return {
        badge: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
        cardBorder: "border-emerald-500/30 hover:border-emerald-500/60 shadow-emerald-950/10 bg-emerald-500/[0.02]",
        label: "Normal"
      };
    } else if (days <= 6) {
      return {
        badge: "bg-amber-500/10 text-amber-500 border-amber-500/30 animate-pulse",
        cardBorder: "border-amber-500/30 hover:border-amber-500/60 shadow-amber-950/10 bg-amber-500/[0.02]",
        label: "Advertencia"
      };
    } else {
      return {
        badge: "bg-rose-500/10 text-rose-500 border-rose-500/30 animate-pulse",
        cardBorder: "border-rose-500/30 hover:border-rose-500/60 shadow-rose-950/10 bg-rose-500/[0.02]",
        label: "Demorado"
      };
    }
  };

  if (loading && sales.length === 0) {
    return (
      <div className="p-8 text-center text-text-muted">
        Cargando estados de pedidos...
      </div>
    );
  }

  return (
    <div className="max-w-screen-2xl mx-auto pb-12 overflow-x-hidden">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-wide flex items-center gap-3 mb-2">
            <ClipboardList className="text-[#0078D7] w-8 h-8" />
            K. Estados de Pedidos
          </h1>
          <p className="text-text-muted">Control visual de facturación, cobranza y despacho de ventas de productos.</p>
        </div>
        <div className="flex flex-wrap gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none">
            <Search className="w-5 h-5 absolute left-3 top-2.5 text-gray-500" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="bg-bg-card border border-border-custom rounded-md pl-10 pr-4 py-2 text-text-primary focus:border-[#0078D7] outline-none transition-colors w-full md:w-64"
              placeholder="Buscar por Pedido, Cliente..."
            />
          </div>
        </div>
      </div>

      {/* Kanban Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Etapa 1: FACTURACIÓN */}
        <div className="bg-bg-sidebar rounded-xl border border-border-custom p-4 flex flex-col h-[calc(100vh-220px)]">
          <div className="flex justify-between items-center mb-4 border-b border-border-custom pb-3">
            <h3 className="font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2 text-sm">
              <Receipt className="w-4 h-4 text-orange-500" /> 1. Facturación
            </h3>
            <span className="bg-bg-subtle text-text-muted text-xs px-2 py-0.5 rounded-full font-bold font-mono border border-border-custom">
              {pedidosFiltrados.filter(p => p.stage === "facturacion").length}
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
            {pedidosFiltrados.filter(p => p.stage === "facturacion").map(p => {
              const days = getElapsedDays(p.createdAt);
              const alertStyle = getAlertColorClasses(days);
              return (
                <div 
                  key={p.id} 
                  onClick={() => abrirModal(p)} 
                  className={`bg-bg-card border ${alertStyle.cardBorder} p-4 rounded-lg cursor-pointer transition-all shadow-lg`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-mono bg-bg-subtle text-text-muted px-2 py-0.5 rounded border border-border-custom">{p.numeroOrden}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${alertStyle.badge}`}>
                      {days} {days === 1 ? 'Día' : 'Días'} ({alertStyle.label})
                    </span>
                  </div>
                  <h4 className="font-bold text-text-primary text-sm mb-1">{p.cliente.razonSocial}</h4>
                  <div className="space-y-1 mb-3">
                    {p.productos.map((prod: any, i: number) => (
                      <p key={i} className="text-xs text-text-muted flex items-center gap-1">
                        <Package className="w-3 h-3 text-[#0078D7]" /> {prod.cantidad}x {prod.nombre}
                      </p>
                    ))}
                  </div>
                  <div className="flex justify-between items-center border-t border-border-custom pt-3 text-xs">
                    <span className="text-text-muted font-mono">CUIT: {p.cliente.cuit}</span>
                    <span className="font-bold text-emerald-500">{p.moneda === "USD" ? "US$" : "$"} {p.total.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Etapa 2: COBRANZAS */}
        <div className="bg-bg-sidebar rounded-xl border border-border-custom p-4 flex flex-col h-[calc(100vh-220px)]">
          <div className="flex justify-between items-center mb-4 border-b border-border-custom pb-3">
            <h3 className="font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2 text-sm">
              <Banknote className="w-4 h-4 text-amber-500" /> 2. Cobranzas
            </h3>
            <span className="bg-bg-subtle text-text-muted text-xs px-2 py-0.5 rounded-full font-bold font-mono border border-border-custom">
              {pedidosFiltrados.filter(p => p.stage === "cobranzas").length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
            {pedidosFiltrados.filter(p => p.stage === "cobranzas").map(p => {
              const days = getElapsedDays(p.createdAt);
              const alertStyle = getAlertColorClasses(days);
              return (
                <div 
                  key={p.id} 
                  onClick={() => abrirModal(p)} 
                  className={`bg-bg-card border ${alertStyle.cardBorder} p-4 rounded-lg cursor-pointer transition-all shadow-lg`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-mono bg-bg-subtle text-text-muted px-2 py-0.5 rounded border border-border-custom">{p.numeroOrden}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${alertStyle.badge}`}>
                      {days} {days === 1 ? 'Día' : 'Días'} ({alertStyle.label})
                    </span>
                  </div>
                  <h4 className="font-bold text-text-primary text-sm mb-1">{p.cliente.razonSocial}</h4>
                  <div className="space-y-1 mb-3">
                    {p.productos.map((prod: any, i: number) => (
                      <p key={i} className="text-xs text-text-muted flex items-center gap-1">
                        <Package className="w-3 h-3 text-[#0078D7]" /> {prod.cantidad}x {prod.nombre}
                      </p>
                    ))}
                  </div>
                  <div className="flex justify-between items-center border-t border-border-custom pt-3 text-xs">
                    <span className="text-text-muted font-mono">Factura: {p.invoiceDate}</span>
                    <span className="font-bold text-emerald-500">{p.moneda === "USD" ? "US$" : "$"} {p.total.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Etapa 3: ENVÍOS */}
        <div className="bg-bg-sidebar rounded-xl border border-border-custom p-4 flex flex-col h-[calc(100vh-220px)]">
          <div className="flex justify-between items-center mb-4 border-b border-border-custom pb-3">
            <h3 className="font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2 text-sm">
              <Truck className="w-4 h-4 text-emerald-500" /> 3. Envíos y Logística
            </h3>
            <span className="bg-bg-subtle text-text-muted text-xs px-2 py-0.5 rounded-full font-bold font-mono border border-border-custom">
              {pedidosFiltrados.filter(p => p.stage === "envio").length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
            {pedidosFiltrados.filter(p => p.stage === "envio").map(p => {
              const days = getElapsedDays(p.createdAt);
              const alertStyle = getAlertColorClasses(days);
              return (
                <div 
                  key={p.id} 
                  onClick={() => abrirModal(p)} 
                  className={`bg-bg-card border ${alertStyle.cardBorder} p-4 rounded-lg cursor-pointer transition-all shadow-lg`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-mono bg-bg-subtle text-text-muted px-2 py-0.5 rounded border border-border-custom">{p.numeroOrden}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${alertStyle.badge}`}>
                      {days} {days === 1 ? 'Día' : 'Días'} ({alertStyle.label})
                    </span>
                  </div>
                  
                  <h4 className="font-bold text-text-primary text-sm mb-1">{p.cliente.razonSocial}</h4>
                  
                  <div className="space-y-1 mb-2">
                    {p.productos.map((prod: any, i: number) => (
                      <p key={i} className="text-xs text-text-muted flex items-center gap-1">
                        <Package className="w-3 h-3 text-[#0078D7]" /> {prod.cantidad}x {prod.nombre}
                      </p>
                    ))}
                  </div>

                  <div className="flex justify-between items-center border-t border-border-custom pt-3 text-xs text-text-muted">
                    <span>Pago: {p.paymentDate || "Registrado"}</span>
                    <span className="font-bold text-emerald-500">{p.moneda === "USD" ? "US$" : "$"} {p.total.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Modal: DETALLE */}
      {isModalOpen && pedidoSeleccionado && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-card border border-border-custom rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[95vh] animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-border-custom bg-bg-subtle shrink-0">
              <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-[#0078D7]" />
                Detalle del Pedido: {pedidoSeleccionado.numeroOrden}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-text-muted hover:text-text-primary transition-colors cursor-pointer">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
              
              {/* Info Cliente */}
              <div className="bg-bg-subtle border border-border-custom p-5 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold">Datos del Cliente</p>
                  <p className="text-text-primary font-bold text-lg flex items-center gap-1.5"><User className="w-4 h-4 text-[#0078D7]" /> {pedidoSeleccionado.cliente.razonSocial}</p>
                  <p className="text-sm text-text-muted">CUIT: <span className="font-mono text-text-secondary">{pedidoSeleccionado.cliente.cuit}</span></p>
                </div>
                <div className="space-y-1 md:text-right">
                  <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold">Contacto y Dirección</p>
                  <p className="text-sm text-text-secondary">{pedidoSeleccionado.cliente.correo}</p>
                  <p className="text-sm text-text-secondary">{pedidoSeleccionado.cliente.telefono}</p>
                  <p className="text-xs text-text-muted italic">{pedidoSeleccionado.cliente.direccion}</p>
                </div>
              </div>

              {/* Detalle Productos */}
              <div className="bg-bg-sidebar border border-border-custom rounded-lg p-5">
                <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-3">Productos Vendidos</h3>
                <div className="divide-y divide-border-custom">
                  {pedidoSeleccionado.productos.map((prod: any, idx: number) => (
                    <div key={idx} className="py-3 flex flex-col gap-2 border-b border-border-custom last:border-b-0 text-sm">
                      <div className="flex justify-between items-center w-full">
                        <div className="flex items-center gap-2">
                          <span className="bg-bg-subtle text-text-primary border border-border-custom px-2 py-0.5 rounded text-xs font-bold font-mono">{prod.cantidad}x</span>
                          <span className="text-text-secondary font-semibold">{prod.nombre}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-text-muted text-xs block">{pedidoSeleccionado.moneda === "USD" ? "US$" : "$"} {prod.precioUnitario.toLocaleString()} c/u</span>
                          <span className="text-text-primary font-bold block">{pedidoSeleccionado.moneda === "USD" ? "US$" : "$"} {(prod.cantidad * prod.precioUnitario).toLocaleString()}</span>
                        </div>
                      </div>
                      {prod.componentesSeleccionados && (
                        <div className="pl-4 mt-1 border-l-2 border-teal-500 text-[10px] text-text-muted space-y-1 bg-teal-500/5 p-2 rounded-r-md">
                          <p className="font-bold text-teal-600 dark:text-teal-400">Componentes incluidos en la solución:</p>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                            {JSON.parse(prod.componentesSeleccionados).map((comp: any, cIdx: number) => (
                              <p key={cIdx}>• {comp.nombre} (x{comp.cantidad})</p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="border-t border-border-custom pt-4 mt-3 flex justify-between items-center font-bold">
                  <span className="text-text-muted">Total Pedido</span>
                  <span className="text-emerald-500 text-xl">{pedidoSeleccionado.moneda === "USD" ? "US$" : "$"} {pedidoSeleccionado.total.toLocaleString()}</span>
                </div>
              </div>

              {/* Estados actuales */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-bg-subtle border border-border-custom p-4 rounded text-center">
                  <p className="text-xs text-text-muted uppercase font-bold">Facturación</p>
                  <p className="text-lg font-bold text-text-primary mt-1">{pedidoSeleccionado.facturacionText}</p>
                </div>
                <div className="bg-bg-subtle border border-border-custom p-4 rounded text-center">
                  <p className="text-xs text-text-muted uppercase font-bold">Cobranza</p>
                  <p className="text-lg font-bold text-text-primary mt-1">{pedidoSeleccionado.cobranzasText}</p>
                </div>
                <div className="bg-bg-subtle border border-border-custom p-4 rounded text-center">
                  <p className="text-xs text-text-muted uppercase font-bold">Logística</p>
                  <p className="text-lg font-bold text-text-primary mt-1">{pedidoSeleccionado.enviosText}</p>
                </div>
              </div>

              {/* Bitácora de Observaciones */}
              <div className="bg-bg-sidebar border border-border-custom rounded-lg p-5 space-y-4 text-left">
                <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest">Bitácora de Observaciones / Comentarios</h3>
                
                {/* Escribir Nueva Observación */}
                <div className="space-y-2">
                  <textarea
                    value={nuevaObservacion}
                    onChange={(e) => setNuevaObservacion(e.target.value)}
                    placeholder="Escribe una observación interna sobre el estado de este pedido..."
                    className="w-full bg-bg-card border border-border-custom rounded-lg p-3 text-sm text-text-primary outline-none focus:border-[#0078D7] min-h-[80px]"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleSaveObservation(pedidoSeleccionado.id)}
                      className="px-4 py-1.5 bg-[#0078D7] hover:bg-[#005a9e] text-white rounded text-xs font-bold transition-colors cursor-pointer"
                    >
                      Guardar Observación
                    </button>
                  </div>
                </div>

                {/* Listado de Observaciones */}
                <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
                  {pedidoSeleccionado.observations && pedidoSeleccionado.observations.length > 0 ? (
                    pedidoSeleccionado.observations.map((obs: any) => (
                      <div key={obs.id} className="p-3 bg-bg-card rounded border border-border-custom/50 space-y-1 text-xs">
                        <div className="flex justify-between items-center text-text-muted">
                          <span className="font-bold text-text-secondary">
                            {obs.user?.nombre || "Usuario"} <span className="font-normal text-[10px] bg-bg-subtle border border-border-custom px-1.5 py-0.5 rounded ml-1 uppercase">{obs.user?.rol || "Operador"}</span>
                          </span>
                          <span>{new Date(obs.createdAt).toLocaleString("es-AR")}</span>
                        </div>
                        <p className="text-text-primary leading-relaxed">{obs.texto}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-text-muted italic text-center py-2">No se han registrado observaciones para este pedido.</p>
                  )}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="flex justify-end gap-4 p-6 border-t border-border-custom bg-bg-subtle shrink-0">
              {session?.rol === "ADMIN" && (pedidoSeleccionado.stage === "facturacion" || pedidoSeleccionado.stage === "cobranzas") && (
                <button
                  type="button"
                  onClick={() => handleSkipSteps(pedidoSeleccionado.id)}
                  className="px-6 py-2 rounded-md bg-amber-500 hover:bg-amber-600 text-bg-card font-bold transition-colors cursor-pointer"
                >
                  Omitir Facturación y Cobranza
                </button>
              )}
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)} 
                className="px-6 py-2 rounded-md bg-bg-sidebar border border-border-custom text-text-primary hover:bg-bg-subtle transition-colors cursor-pointer"
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
