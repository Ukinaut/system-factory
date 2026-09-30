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
  Package,
  FileText,
  Boxes,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  Tag
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
    const associatedInvoices = sale.invoices || invoices.filter(inv => inv.saleId === sale.id);
    const hasInvoice = associatedInvoices.length > 0;
    const hasPayment = associatedInvoices.some((inv: any) => inv.payments && inv.payments.length > 0);

    const shipping = sale.shipping;
    const shippingStatus = shipping?.estado; // "PARA_EMPACAR" | "EMPACADO" | "DESPACHADO" | "ENTREGADO"
    const tracking = shipping?.tracking;
    const logistica = shipping?.logistica;

    let stage: "ingreso" | "facturacion" | "cobranzas" | "preparacion" | "despachado" | "entregado" = "ingreso";

    if (shippingStatus === "ENTREGADO" || sale.estado === "ENTREGADO") {
      stage = "entregado";
    } else if (shippingStatus === "DESPACHADO" || sale.estado === "ENVIADO") {
      stage = "despachado";
    } else if (hasPayment || sale.estado === "PAGADO") {
      if (shippingStatus === "EMPACADO" || shippingStatus === "PARA_EMPACAR" || sale.tipo === "ARTICULO" || sale.tipo === "MIXTO") {
        stage = "preparacion";
      } else {
        stage = "cobranzas";
      }
    } else if (hasInvoice || sale.estado === "FACTURADO") {
      stage = "facturacion";
    } else {
      stage = "ingreso";
    }

    return {
      stage,
      hasInvoice,
      hasPayment,
      shippingStatus,
      tracking,
      logistica,
      invoiceDate: hasInvoice && associatedInvoices[0]?.fecha ? new Date(associatedInvoices[0].fecha).toLocaleDateString("es-AR") : undefined,
      paymentDate: hasPayment && associatedInvoices[0]?.payments?.[0]?.fechaPago ? new Date(associatedInvoices[0].payments[0].fechaPago).toLocaleDateString("es-AR") : undefined,
    };
  };

  const pedidos = sales.map(sale => {
    const details = getStageAndDetails(sale);
    return {
      id: sale.id,
      numeroOrden: sale.numeroOrden,
      tipo: sale.tipo,
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
      facturacionText: details.hasInvoice ? "Facturado" : "Sin Facturar",
      cobranzasText: details.hasPayment ? "Cobrado" : "Pendiente de Pago",
      preparacionText: details.shippingStatus === "EMPACADO" ? "Empacado" : details.shippingStatus === "PARA_EMPACAR" ? "Para Empacar" : "En Preparación",
      enviosText: details.stage === "entregado" ? "Entregado" : details.stage === "despachado" ? "Despachado" : "Pendiente de Envío",
      shippingStatus: details.shippingStatus,
      tracking: details.tracking,
      logistica: details.logistica,
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
    if (!confirm("¿Estás seguro de que deseas omitir los pasos de facturación y cobranza para este pedido? Esto enviará el pedido directamente a Preparación y Logística.")) {
      return;
    }
    setLoading(true);
    const res = await skipBillingAndCollection(saleId);
    setLoading(false);
    if (res.success) {
      alert("Pasos de facturación y cobranza omitidos. El pedido ya está en etapa de Preparación.");
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

  const etapasConfig = [
    { key: "ingreso", title: "1. Ingreso", icon: FileText, color: "text-sky-500", headerBorder: "border-sky-500/40", badgeBg: "bg-sky-500/10 text-sky-400 border-sky-500/30" },
    { key: "facturacion", title: "2. Facturación", icon: Receipt, color: "text-orange-500", headerBorder: "border-orange-500/40", badgeBg: "bg-orange-500/10 text-orange-400 border-orange-500/30" },
    { key: "cobranzas", title: "3. Cobranzas", icon: Banknote, color: "text-amber-500", headerBorder: "border-amber-500/40", badgeBg: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
    { key: "preparacion", title: "4. Preparación", icon: Boxes, color: "text-purple-500", headerBorder: "border-purple-500/40", badgeBg: "bg-purple-500/10 text-purple-400 border-purple-500/30" },
    { key: "despachado", title: "5. En Tránsito", icon: Truck, color: "text-cyan-500", headerBorder: "border-cyan-500/40", badgeBg: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30" },
    { key: "entregado", title: "6. Entregado", icon: CheckCircle2, color: "text-emerald-500", headerBorder: "border-emerald-500/40", badgeBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  ];

  const getStageIndex = (stageKey: string) => {
    return etapasConfig.findIndex(e => e.key === stageKey);
  };

  if (loading && sales.length === 0) {
    return (
      <div className="p-8 text-center text-text-muted">
        Cargando flujo detallado de estados de pedidos...
      </div>
    );
  }

  return (
    <div className="w-full pb-6 px-1 md:px-2">
      
      {/* Header Compacto */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-wide flex items-center gap-2.5">
            <ClipboardList className="text-[#0078D7] w-6 h-6 shrink-0" />
            K. Estados de Pedidos
          </h1>
          <p className="text-xs text-text-muted">Control integral de trazabilidad: Ingreso ➔ Facturación ➔ Cobranza ➔ Depósito ➔ Despacho ➔ Entrega.</p>
        </div>
        <div className="w-full sm:w-auto">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-500" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="bg-bg-card border border-border-custom rounded-md pl-9 pr-3 py-1.5 text-xs text-text-primary focus:border-[#0078D7] outline-none transition-colors w-full sm:w-64"
              placeholder="Buscar por Pedido, Cliente, Producto..."
            />
          </div>
        </div>
      </div>

      {/* Grid de 6 Columnas Adaptadas al 100% de la Pantalla */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5 w-full items-start">
        {etapasConfig.map((etapa) => {
          const IconComp = etapa.icon;
          const pedidosEtapa = pedidosFiltrados.filter(p => p.stage === etapa.key);
          
          return (
            <div 
              key={etapa.key} 
              className="bg-bg-sidebar rounded-xl border border-border-custom p-2.5 flex flex-col h-[calc(100vh-175px)] w-full min-w-0 overflow-hidden"
            >
              {/* Header de Columna Compacto */}
              <div className={`flex justify-between items-center mb-2 border-b pb-2 ${etapa.headerBorder}`}>
                <h3 className="font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5 text-[11px] truncate" title={etapa.title}>
                  <IconComp className={`w-3.5 h-3.5 shrink-0 ${etapa.color}`} /> 
                  <span className="truncate">{etapa.title}</span>
                </h3>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold font-mono border shrink-0 ${etapa.badgeBg}`}>
                  {pedidosEtapa.length}
                </span>
              </div>
              
              {/* Lista de Pedidos en esta etapa */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 scrollbar-thin">
                {pedidosEtapa.length === 0 ? (
                  <div className="h-24 border border-dashed border-border-custom/40 rounded-lg flex items-center justify-center text-[11px] text-text-muted italic px-2 text-center">
                    Sin pedidos
                  </div>
                ) : (
                  pedidosEtapa.map(p => {
                    const days = getElapsedDays(p.createdAt);
                    const alertStyle = getAlertColorClasses(days);
                    return (
                      <div 
                        key={p.id} 
                        onClick={() => abrirModal(p)} 
                        className={`bg-bg-card border ${alertStyle.cardBorder} p-2.5 rounded-lg cursor-pointer transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5`}
                      >
                        {/* Fila superior: Orden + Tiempo */}
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-[10px] font-mono bg-bg-subtle text-text-muted px-1.5 py-0.5 rounded border border-border-custom font-bold truncate max-w-[65%]">
                            {p.numeroOrden}
                          </span>
                          <span className={`text-[8px] font-bold px-1 py-0.5 rounded border uppercase shrink-0 ${alertStyle.badge}`}>
                            {days}d
                          </span>
                        </div>

                        {/* Razón Social */}
                        <h4 className="font-bold text-text-primary text-xs mb-1 truncate" title={p.cliente.razonSocial}>
                          {p.cliente.razonSocial}
                        </h4>
                        
                        {/* Productos */}
                        <div className="space-y-0.5 mb-2 bg-bg-subtle/50 p-1.5 rounded border border-border-custom/30">
                          {p.productos.map((prod: any, i: number) => (
                            <p key={i} className="text-[11px] text-text-muted flex items-center gap-1 truncate" title={`${prod.cantidad}x ${prod.nombre}`}>
                              <Package className="w-2.5 h-2.5 text-[#0078D7] shrink-0" /> 
                              <span className="truncate"><strong className="text-text-secondary">{prod.cantidad}x</strong> {prod.nombre}</span>
                            </p>
                          ))}
                        </div>

                        {/* Badges de Información según Etapa */}
                        {etapa.key === "facturacion" && p.invoiceDate && (
                          <p className="text-[9px] text-orange-400 font-mono mb-1 truncate">📅 Factura: {p.invoiceDate}</p>
                        )}
                        {etapa.key === "cobranzas" && p.paymentDate && (
                          <p className="text-[9px] text-amber-400 font-mono mb-1 truncate">💳 Pago: {p.paymentDate}</p>
                        )}
                        {etapa.key === "preparacion" && (
                          <p className="text-[9px] text-purple-400 font-mono mb-1 truncate">📦 {p.preparacionText}</p>
                        )}
                        {(etapa.key === "despachado" || etapa.key === "entregado") && (
                          <div className="text-[9px] text-cyan-400 font-mono mb-1 truncate">
                            {p.logistica && <p className="truncate">🚚 {p.logistica}</p>}
                            {p.tracking && <p className="truncate">📍 Track: {p.tracking}</p>}
                          </div>
                        )}

                        {/* Footer: CUIT + Total */}
                        <div className="flex justify-between items-center border-t border-border-custom/50 pt-1.5 text-[10px]">
                          <span className="text-text-muted font-mono truncate max-w-[50%]">CUIT: {p.cliente.cuit}</span>
                          <span className="font-bold text-emerald-500 shrink-0">{p.moneda === "USD" ? "US$" : "$"} {p.total.toLocaleString("es-AR")}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: DETALLE COMPLETO Y STEPPER DE CADENA */}
      {isModalOpen && pedidoSeleccionado && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-3 md:p-4">
          <div className="bg-bg-card border border-border-custom rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[95vh] animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header Modal */}
            <div className="flex justify-between items-center p-4 border-b border-border-custom bg-bg-subtle shrink-0">
              <div>
                <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-[#0078D7]" />
                  Detalle del Pedido: {pedidoSeleccionado.numeroOrden}
                </h2>
                <p className="text-xs text-text-muted">Registro completo de trazabilidad del pedido.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-text-muted hover:text-text-primary transition-colors cursor-pointer p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper de Cadena de Proceso */}
            <div className="bg-bg-sidebar border-b border-border-custom p-3 shrink-0 overflow-x-auto scrollbar-thin">
              <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold mb-2">Trazabilidad de la Cadena (Paso Actual: Etapa {getStageIndex(pedidoSeleccionado.stage) + 1})</p>
              <div className="flex items-center justify-between min-w-[550px] gap-1.5">
                {etapasConfig.map((etapa, idx) => {
                  const IconC = etapa.icon;
                  const currentIdx = getStageIndex(pedidoSeleccionado.stage);
                  const isCompleted = idx < currentIdx;
                  const isCurrent = idx === currentIdx;

                  return (
                    <div key={etapa.key} className="flex items-center flex-1">
                      <div className={`flex flex-col items-center gap-1 flex-1 text-center p-1.5 rounded-lg transition-all ${
                        isCurrent 
                          ? 'bg-[#0078D7]/10 border border-[#0078D7] shadow-lg shadow-[#0078D7]/10' 
                          : isCompleted 
                            ? 'bg-emerald-500/5 border border-emerald-500/30 opacity-90' 
                            : 'opacity-40 border border-transparent'
                      }`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                          isCurrent 
                            ? 'bg-[#0078D7] text-white shadow' 
                            : isCompleted 
                              ? 'bg-emerald-500 text-white' 
                              : 'bg-bg-subtle text-text-muted border border-border-custom'
                        }`}>
                          {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : <IconC className="w-3.5 h-3.5" />}
                        </div>
                        <span className={`text-[10px] font-bold ${isCurrent ? 'text-[#0078D7]' : isCompleted ? 'text-emerald-400' : 'text-text-muted'}`}>
                          {etapa.title.split('. ')[1]}
                        </span>
                      </div>
                      {idx < etapasConfig.length - 1 && (
                        <ChevronRight className={`w-3.5 h-3.5 shrink-0 mx-0.5 ${idx < currentIdx ? 'text-emerald-500' : 'text-border-custom'}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Contenido Scrollable */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin">
              
              {/* Datos Cliente */}
              <div className="bg-bg-subtle border border-border-custom p-3.5 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold">Datos del Cliente</p>
                  <p className="text-text-primary font-bold text-sm flex items-center gap-1.5"><User className="w-4 h-4 text-[#0078D7]" /> {pedidoSeleccionado.cliente.razonSocial}</p>
                  <p className="text-text-muted">CUIT: <span className="font-mono text-text-secondary">{pedidoSeleccionado.cliente.cuit}</span></p>
                </div>
                <div className="space-y-1 md:text-right">
                  <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold">Contacto y Entrega</p>
                  <p className="text-text-secondary">{pedidoSeleccionado.cliente.correo}</p>
                  <p className="text-text-secondary">{pedidoSeleccionado.cliente.telefono}</p>
                  <p className="text-text-muted italic">{pedidoSeleccionado.cliente.direccion}</p>
                </div>
              </div>

              {/* Productos Vendidos */}
              <div className="bg-bg-sidebar border border-border-custom rounded-lg p-3.5">
                <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-2.5">Productos Vendidos</h3>
                <div className="divide-y divide-border-custom">
                  {pedidoSeleccionado.productos.map((prod: any, idx: number) => (
                    <div key={idx} className="py-2 flex flex-col gap-1 text-xs">
                      <div className="flex justify-between items-center w-full">
                        <div className="flex items-center gap-2">
                          <span className="bg-bg-subtle text-text-primary border border-border-custom px-1.5 py-0.5 rounded text-[11px] font-bold font-mono">{prod.cantidad}x</span>
                          <span className="text-text-secondary font-semibold">{prod.nombre}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-text-muted text-[10px] block">{pedidoSeleccionado.moneda === "USD" ? "US$" : "$"} {prod.precioUnitario.toLocaleString("es-AR")} c/u</span>
                          <span className="text-text-primary font-bold block">{pedidoSeleccionado.moneda === "USD" ? "US$" : "$"} {(prod.cantidad * prod.precioUnitario).toLocaleString("es-AR")}</span>
                        </div>
                      </div>
                      {prod.componentesSeleccionados && (
                        <div className="pl-3 border-l-2 border-teal-500 text-[10px] text-text-muted space-y-0.5 bg-teal-500/5 p-1.5 rounded-r-md">
                          <p className="font-bold text-teal-400">Componentes incluidos:</p>
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
                <div className="border-t border-border-custom pt-2.5 mt-2.5 flex justify-between items-center font-bold">
                  <span className="text-text-muted text-xs">Total del Pedido</span>
                  <span className="text-emerald-500 text-base">{pedidoSeleccionado.moneda === "USD" ? "US$" : "$"} {pedidoSeleccionado.total.toLocaleString("es-AR")}</span>
                </div>
              </div>

              {/* Resumen de Estados por Hito */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                <div className="bg-bg-subtle border border-border-custom p-2.5 rounded text-center">
                  <p className="text-[10px] text-text-muted uppercase font-bold">Facturación</p>
                  <p className="text-xs font-bold text-orange-400 mt-0.5">{pedidoSeleccionado.facturacionText}</p>
                  {pedidoSeleccionado.invoiceDate && <p className="text-[9px] text-text-muted font-mono">{pedidoSeleccionado.invoiceDate}</p>}
                </div>
                <div className="bg-bg-subtle border border-border-custom p-2.5 rounded text-center">
                  <p className="text-[10px] text-text-muted uppercase font-bold">Cobranza</p>
                  <p className="text-xs font-bold text-amber-400 mt-0.5">{pedidoSeleccionado.cobranzasText}</p>
                  {pedidoSeleccionado.paymentDate && <p className="text-[9px] text-text-muted font-mono">{pedidoSeleccionado.paymentDate}</p>}
                </div>
                <div className="bg-bg-subtle border border-border-custom p-2.5 rounded text-center">
                  <p className="text-[10px] text-text-muted uppercase font-bold">Preparación</p>
                  <p className="text-xs font-bold text-purple-400 mt-0.5">{pedidoSeleccionado.preparacionText}</p>
                </div>
                <div className="bg-bg-subtle border border-border-custom p-2.5 rounded text-center">
                  <p className="text-[10px] text-text-muted uppercase font-bold">Despacho / Entrega</p>
                  <p className="text-xs font-bold text-cyan-400 mt-0.5">{pedidoSeleccionado.enviosText}</p>
                  {pedidoSeleccionado.tracking && <p className="text-[9px] text-text-muted font-mono">{pedidoSeleccionado.tracking}</p>}
                </div>
              </div>

              {/* Bitácora de Observaciones */}
              <div className="bg-bg-sidebar border border-border-custom rounded-lg p-3.5 space-y-2.5 text-left">
                <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest">Bitácora de Observaciones</h3>
                
                {/* Escribir Nueva Observación */}
                <div className="space-y-1.5">
                  <textarea
                    value={nuevaObservacion}
                    onChange={(e) => setNuevaObservacion(e.target.value)}
                    placeholder="Escribe una observación interna..."
                    className="w-full bg-bg-card border border-border-custom rounded-lg p-2 text-xs text-text-primary outline-none focus:border-[#0078D7] min-h-[60px]"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleSaveObservation(pedidoSeleccionado.id)}
                      className="px-3 py-1 bg-[#0078D7] hover:bg-[#005a9e] text-white rounded text-xs font-bold transition-colors cursor-pointer"
                    >
                      Guardar Observación
                    </button>
                  </div>
                </div>

                {/* Listado de Observaciones */}
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-0.5 scrollbar-thin">
                  {pedidoSeleccionado.observations && pedidoSeleccionado.observations.length > 0 ? (
                    pedidoSeleccionado.observations.map((obs: any) => (
                      <div key={obs.id} className="p-2 bg-bg-card rounded border border-border-custom/50 space-y-0.5 text-xs">
                        <div className="flex justify-between items-center text-text-muted">
                          <span className="font-bold text-text-secondary">
                            {obs.user?.nombre || "Usuario"} <span className="font-normal text-[8px] bg-bg-subtle border border-border-custom px-1 py-0.5 rounded ml-1 uppercase">{obs.user?.rol || "Operador"}</span>
                          </span>
                          <span className="text-[9px]">{new Date(obs.createdAt).toLocaleString("es-AR")}</span>
                        </div>
                        <p className="text-text-primary leading-relaxed text-xs">{obs.texto}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-text-muted italic text-center py-1.5">No hay observaciones registradas.</p>
                  )}
                </div>
              </div>

            </div>

            {/* Footer Modal */}
            <div className="flex justify-between items-center p-3.5 border-t border-border-custom bg-bg-subtle shrink-0">
              <div>
                {session?.rol === "ADMIN" && (pedidoSeleccionado.stage === "ingreso" || pedidoSeleccionado.stage === "facturacion" || pedidoSeleccionado.stage === "cobranzas") && (
                  <button
                    type="button"
                    onClick={() => handleSkipSteps(pedidoSeleccionado.id)}
                    className="px-3.5 py-1.5 rounded-md bg-amber-500 hover:bg-amber-600 text-bg-card font-bold text-xs transition-colors cursor-pointer"
                  >
                    Omitir Facturación y Cobranza
                  </button>
                )}
              </div>
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)} 
                className="px-4 py-1.5 rounded-md bg-bg-sidebar border border-border-custom text-text-primary hover:bg-bg-subtle text-xs font-bold transition-colors cursor-pointer"
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
