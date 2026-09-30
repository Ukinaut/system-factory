"use client";

import { useState, useEffect, useRef } from "react";
import { 
  DollarSign, 
  Search, 
  CheckCircle, 
  ChevronRight, 
  ChevronLeft, 
  X, 
  FileText, 
  UploadCloud, 
  Banknote, 
  Calendar,
  AlertTriangle,
  Wallet,
  TrendingUp,
  Clock,
  Zap,
  Filter,
  CreditCard,
  Building2,
  Percent,
  Plus,
  Trash2,
  ShieldCheck,
  Receipt,
  ArrowRightLeft,
  ChevronDown
} from "lucide-react";
import { getInvoicesWithPayments, registerPayment, getClientsWithServices } from "@/actions/billing";

interface RetencionItem {
  id: string;
  tipo: string;
  certificado: string;
  monto: number;
}

export default function CobranzasDashboard() {
  const [activeTab, setActiveTab] = useState("pendientes");
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("TODOS"); // TODOS, VENCIDAS, PARCIALES, AL_DIA, VENTA_RAPIDA
  const [filtroMoneda, setFiltroMoneda] = useState("TODOS"); // TODOS, ARS, USD

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cobroSeleccionado, setCobroSeleccionado] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [clientsWithServices, setClientsWithServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const retencionFileInputRef = useRef<HTMLInputElement>(null);

  // Expanded payments details state
  const [expandedInvoices, setExpandedInvoices] = useState<{ [key: string]: boolean }>({});

  // Form State
  const [formCobro, setFormCobro] = useState({
    montoCobrado: 0,
    metodoPago: "Transferencia",
    fechaPago: new Date().toISOString().split('T')[0],
    tasaCambio: "",
    tarjetaCuotas: 1,
    tarjetaRecargo: 0,
    numeroCupon: "",
    observaciones: "",
    
    // Comprobantes
    comprobanteCargado: false,
    comprobanteNombre: "",
    comprobanteBase64: "",

    // Retenciones
    aplicaRetencion: false,
    retencionesList: [] as RetencionItem[],
    comprobanteRetencionCargado: false,
    comprobanteRetencionNombre: "",
    comprobanteRetencionBase64: "",
  });

  const loadData = async () => {
    setLoading(true);
    const [invoicesRes, clientsRes] = await Promise.all([
      getInvoicesWithPayments(),
      getClientsWithServices()
    ]);

    if (invoicesRes.success) {
      setInvoices(invoicesRes.invoices || []);
    }
    if (clientsRes.success) {
      setClientsWithServices(clientsRes.clients || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Map invoice data & calculations
  const mappedInvoices = invoices.map(inv => {
    const totalPagado = (inv.payments || []).reduce(
      (sum: number, p: any) => sum + (p.montoCobrado || 0) + (p.montoRetenciones || 0),
      0
    );

    const totalFactura = inv.sale?.total || 0;
    const saldoPendiente = inv.saldoPendiente !== null && inv.saldoPendiente !== undefined
      ? inv.saldoPendiente 
      : Math.max(0, totalFactura - totalPagado);

    const estadoCobro = inv.estadoCobro || (saldoPendiente <= 0.05 ? "PAGADO" : (totalPagado > 0 ? "PARCIAL" : "PENDIENTE"));

    const fechaFactura = new Date(inv.fecha);
    const vencimiento = new Date(fechaFactura);
    vencimiento.setDate(vencimiento.getDate() + 15);
    
    const hoy = new Date();
    const diffTime = hoy.getTime() - vencimiento.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diasVencidos = diffDays > 0 && estadoCobro !== "PAGADO" ? diffDays : 0;

    return {
      id: inv.id,
      saleId: inv.saleId,
      numeroOrden: inv.sale?.numeroOrden || "ORD-???",
      cliente: inv.sale?.client?.razonSocial || "Cliente Desconocido",
      totalFactura,
      totalPagado,
      saldoPendiente,
      estadoCobro,
      moneda: inv.sale?.moneda || "ARS",
      fechaFactura: fechaFactura.toLocaleDateString(),
      vencimiento: vencimiento.toLocaleDateString(),
      diasVencidos,
      tipoVenta: inv.sale?.tipo || "STANDARD",
      payments: inv.payments || []
    };
  });

  const facturasPendientes = mappedInvoices.filter(inv => inv.estadoCobro !== "PAGADO");
  const pagosCompletados = mappedInvoices.filter(inv => inv.estadoCobro === "PAGADO");

  // Metrics
  const totalPendienteArs = facturasPendientes
    .filter(f => f.moneda === "ARS")
    .reduce((sum, f) => sum + f.saldoPendiente, 0);

  const totalPendienteUsd = facturasPendientes
    .filter(f => f.moneda === "USD")
    .reduce((sum, f) => sum + f.saldoPendiente, 0);

  const facturasVencidasList = facturasPendientes.filter(f => f.diasVencidos > 0);
  const totalVencidoArs = facturasVencidasList
    .filter(f => f.moneda === "ARS")
    .reduce((sum, f) => sum + f.saldoPendiente, 0);

  const totalCobradoArs = mappedInvoices
    .filter(inv => inv.moneda === "ARS")
    .reduce((sum, inv) => sum + inv.totalPagado, 0);

  const totalCobradoUsd = mappedInvoices
    .filter(inv => inv.moneda === "USD")
    .reduce((sum, inv) => sum + inv.totalPagado, 0);

  // Filter pending & completed
  const facturasFiltradas = facturasPendientes.filter(f => {
    const matchesSearch = f.cliente.toLowerCase().includes(busqueda.toLowerCase()) || 
                          f.numeroOrden.toLowerCase().includes(busqueda.toLowerCase());
    
    const matchesMoneda = filtroMoneda === "TODOS" || f.moneda === filtroMoneda;

    let matchesEstado = true;
    if (filtroEstado === "VENCIDAS") matchesEstado = f.diasVencidos > 0;
    if (filtroEstado === "PARCIALES") matchesEstado = f.estadoCobro === "PARCIAL";
    if (filtroEstado === "AL_DIA") matchesEstado = f.diasVencidos === 0;
    if (filtroEstado === "VENTA_RAPIDA") matchesEstado = f.tipoVenta === "VENTA_RAPIDA";

    return matchesSearch && matchesMoneda && matchesEstado;
  });

  const pagosFiltrados = pagosCompletados.filter(p => {
    const matchesSearch = p.cliente.toLowerCase().includes(busqueda.toLowerCase()) || 
                          p.numeroOrden.toLowerCase().includes(busqueda.toLowerCase());
    
    const matchesMoneda = filtroMoneda === "TODOS" || p.moneda === filtroMoneda;

    return matchesSearch && matchesMoneda;
  });

  const abrirModal = (factura: any) => {
    setCobroSeleccionado(factura);
    setFormCobro({
      montoCobrado: factura.saldoPendiente,
      metodoPago: "Transferencia",
      fechaPago: new Date().toISOString().split('T')[0],
      tasaCambio: "",
      tarjetaCuotas: 1,
      tarjetaRecargo: 0,
      numeroCupon: "",
      observaciones: "",
      comprobanteCargado: false,
      comprobanteNombre: "",
      comprobanteBase64: "",
      aplicaRetencion: false,
      retencionesList: [],
      comprobanteRetencionCargado: false,
      comprobanteRetencionNombre: "",
      comprobanteRetencionBase64: "",
    });
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isRetencion = false) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (isRetencion) {
          setFormCobro(prev => ({
            ...prev,
            comprobanteRetencionCargado: true,
            comprobanteRetencionNombre: file.name,
            comprobanteRetencionBase64: reader.result as string,
          }));
        } else {
          setFormCobro(prev => ({
            ...prev,
            comprobanteCargado: true,
            comprobanteNombre: file.name,
            comprobanteBase64: reader.result as string,
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const addRetencionItem = () => {
    setFormCobro(prev => ({
      ...prev,
      retencionesList: [
        ...prev.retencionesList,
        { id: Date.now().toString(), tipo: "Retención IIBB", certificado: "", monto: 0 }
      ]
    }));
  };

  const removeRetencionItem = (id: string) => {
    setFormCobro(prev => ({
      ...prev,
      retencionesList: prev.retencionesList.filter(r => r.id !== id)
    }));
  };

  const updateRetencionItem = (id: string, field: string, value: any) => {
    setFormCobro(prev => ({
      ...prev,
      retencionesList: prev.retencionesList.map(r => r.id === id ? { ...r, [field]: value } : r)
    }));
  };

  const totalRetencionesForm = formCobro.aplicaRetencion 
    ? formCobro.retencionesList.reduce((sum, r) => sum + (Number(r.monto) || 0), 0)
    : 0;

  const totalCobroTotalTransaccion = Number(formCobro.montoCobrado || 0) + totalRetencionesForm;

  const handleCobrar = async (e: React.FormEvent) => {
    e.preventDefault();

    if (totalCobroTotalTransaccion <= 0) {
      alert("Por favor ingrese un monto de cobro o retención válido.");
      return;
    }

    if (cobroSeleccionado?.tipoVenta === "VENTA_RAPIDA" && !formCobro.comprobanteCargado) {
      alert("Comprobante de pago obligatorio: Para registrar una Venta Rápida, es obligatorio adjuntar el comprobante o ticket de pago.");
      return;
    }

    setLoading(true);
    try {
      const res = await registerPayment({
        invoiceId: cobroSeleccionado.id,
        montoCobrado: Number(formCobro.montoCobrado) || 0,
        montoRetenciones: totalRetencionesForm,
        detallesRetencion: formCobro.aplicaRetencion && formCobro.retencionesList.length > 0 
          ? JSON.stringify(formCobro.retencionesList) 
          : undefined,
        metodoPago: formCobro.metodoPago,
        tasaCambio: formCobro.tasaCambio ? Number(formCobro.tasaCambio) : undefined,
        tarjetaCuotas: formCobro.metodoPago.startsWith("Tarjeta") ? Number(formCobro.tarjetaCuotas) : undefined,
        tarjetaRecargo: formCobro.metodoPago.startsWith("Tarjeta") ? Number(formCobro.tarjetaRecargo) : undefined,
        numeroCupon: formCobro.numeroCupon || undefined,
        observaciones: formCobro.observaciones || undefined,
        comprobanteUrl: formCobro.comprobanteCargado ? formCobro.comprobanteBase64 : undefined,
        comprobanteRetencionUrl: formCobro.comprobanteRetencionCargado ? formCobro.comprobanteRetencionBase64 : undefined,
        fechaPago: formCobro.fechaPago
      });

      if (res.success) {
        alert(`El cobro asociado a la orden ${cobroSeleccionado.numeroOrden} fue registrado con éxito.`);
        setIsModalOpen(false);
        loadData();
      } else {
        alert("Error al registrar pago: " + res.error);
      }
    } catch (err: any) {
      console.error("Error al registrar cobro:", err);
      alert("Error al procesar la solicitud: " + (err?.message || "Ocurrió un error inesperado al subir el comprobante. Verifique el tamaño del archivo e intente nuevamente."));
    } finally {
      setLoading(false);
    }
  };

  // Calendar Math Helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonthDays = Array.from({ length: firstDayOfMonth }, (_, i) => {
    const d = new Date(year, month, 0);
    d.setDate(d.getDate() - firstDayOfMonth + i + 1);
    return { date: d, isCurrentMonth: false };
  });

  const currentMonthDays = Array.from({ length: daysInMonth }, (_, i) => {
    return { date: new Date(year, month, i + 1), isCurrentMonth: true };
  });

  const allCalendarDays = [...prevMonthDays, ...currentMonthDays];
  while (allCalendarDays.length % 7 !== 0) {
    const lastDay = allCalendarDays[allCalendarDays.length - 1].date;
    const nextDay = new Date(lastDay);
    nextDay.setDate(nextDay.getDate() + 1);
    allCalendarDays.push({ date: nextDay, isCurrentMonth: false });
  }

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const getClientsOnDate = (date: Date, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return [];
    const dayNum = date.getDate();
    return clientsWithServices.filter(c => c.diaFacturacion === dayNum);
  };

  if (loading && invoices.length === 0 && clientsWithServices.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-text-muted animate-pulse">
          <DollarSign className="w-10 h-10 text-emerald-500 animate-spin" />
          <p className="text-sm font-semibold">Cargando registros de cobranzas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full pb-16 space-y-6">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-text-primary tracking-tight flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
              <DollarSign className="w-7 h-7" />
            </div>
            Gestión Avanzada de Cobranzas
          </h1>
          <p className="text-text-muted text-sm mt-1">Cobros multimoneda, retenciones impositivas, financiación en cuotas y pagos parciales.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData()}
            className="px-4 py-2 bg-bg-card hover:bg-bg-subtle border border-border-custom rounded-lg text-xs font-bold text-text-secondary transition-all flex items-center gap-2 cursor-pointer shadow-sm"
          >
            Actualizar Datos
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        
        {/* Card 1: Total Pendiente */}
        <div className="bg-bg-card border border-border-custom rounded-xl p-5 shadow-lg relative overflow-hidden group hover:border-emerald-500/40 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Total Pendiente</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-500 tracking-tight font-mono">
            $ {totalPendienteArs.toLocaleString("es-AR")}
          </div>
          {totalPendienteUsd > 0 && (
            <div className="text-xs font-mono text-emerald-400/80 mt-1 font-semibold">
              + US$ {totalPendienteUsd.toLocaleString("es-AR")}
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-border-custom/60 flex justify-between text-xs text-text-muted">
            <span>Ordenes con saldo:</span>
            <span className="font-bold text-text-primary font-mono">{facturasPendientes.length}</span>
          </div>
        </div>

        {/* Card 2: Deuda Vencida */}
        <div className="bg-bg-card border border-border-custom rounded-xl p-5 shadow-lg relative overflow-hidden group hover:border-red-500/40 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Deuda Vencida</span>
            <div className="p-2 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-red-500 tracking-tight font-mono">
            $ {totalVencidoArs.toLocaleString("es-AR")}
          </div>
          <div className="mt-3 pt-3 border-t border-border-custom/60 flex justify-between text-xs text-text-muted">
            <span>Atrasadas:</span>
            <span className="font-bold text-red-400 font-mono">{facturasVencidasList.length} factura/s</span>
          </div>
        </div>

        {/* Card 3: Total Cobrado */}
        <div className="bg-bg-card border border-border-custom rounded-xl p-5 shadow-lg relative overflow-hidden group hover:border-[#0078D7]/40 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Total Cobrado</span>
            <div className="p-2 rounded-lg bg-[#0078D7]/10 text-[#0078D7] border border-[#0078D7]/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#0078D7] tracking-tight font-mono">
            $ {totalCobradoArs.toLocaleString("es-AR")}
          </div>
          {totalCobradoUsd > 0 && (
            <div className="text-xs font-mono text-[#0078D7]/80 mt-1 font-semibold">
              + US$ {totalCobradoUsd.toLocaleString("es-AR")}
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-border-custom/60 flex justify-between text-xs text-text-muted">
            <span>Órdenes saldadas:</span>
            <span className="font-bold text-text-primary font-mono">{pagosCompletados.length}</span>
          </div>
        </div>

        {/* Card 4: Clientes con Abono Mensual */}
        <div className="bg-bg-card border border-border-custom rounded-xl p-5 shadow-lg relative overflow-hidden group hover:border-amber-500/40 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Abonos Mensuales</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-500 tracking-tight">
            {clientsWithServices.length} <span className="text-sm font-normal text-text-muted">clientes</span>
          </div>
          <div className="mt-3 pt-3 border-t border-border-custom/60 flex justify-between text-xs text-text-muted">
            <span>Servicios activos:</span>
            <span className="font-bold text-amber-400 font-mono">
              {clientsWithServices.reduce((acc, c) => acc + (c.services?.length || 0), 0)}
            </span>
          </div>
        </div>

      </div>

      {/* Modern Tabs Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-border-custom mb-6 gap-4">
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab("pendientes")}
            className={`px-5 py-3 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer border-b-2 ${
              activeTab === 'pendientes' 
                ? 'text-emerald-500 border-emerald-500 bg-emerald-500/5' 
                : 'text-text-muted border-transparent hover:text-text-primary hover:bg-bg-subtle/50'
            } rounded-t-lg`}
          >
            <Clock className="w-4 h-4" />
            Pendientes de Cobro 
            <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded-full font-mono font-bold border border-emerald-500/30">
              {facturasPendientes.length}
            </span>
          </button>

          <button 
            onClick={() => setActiveTab("completados")}
            className={`px-5 py-3 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer border-b-2 ${
              activeTab === 'completados' 
                ? 'text-emerald-500 border-emerald-500 bg-emerald-500/5' 
                : 'text-text-muted border-transparent hover:text-text-primary hover:bg-bg-subtle/50'
            } rounded-t-lg`}
          >
            <ShieldCheck className="w-4 h-4" />
            Pagos Completados
            <span className="bg-bg-subtle text-text-muted text-xs px-2 py-0.5 rounded-full font-mono border border-border-custom">
              {pagosCompletados.length}
            </span>
          </button>

          <button 
            onClick={() => setActiveTab("calendario")}
            className={`px-5 py-3 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer border-b-2 ${
              activeTab === 'calendario' 
                ? 'text-emerald-500 border-emerald-500 bg-emerald-500/5' 
                : 'text-text-muted border-transparent hover:text-text-primary hover:bg-bg-subtle/50'
            } rounded-t-lg`}
          >
            <Calendar className="w-4 h-4" />
            Calendario Clientes
          </button>
        </div>
      </div>

      {activeTab !== "calendario" ? (
        <div className="bg-bg-card rounded-xl border border-border-custom shadow-2xl overflow-hidden animate-in fade-in duration-200">
          
          {/* Search & Filter Bar */}
          <div className="p-5 border-b border-border-custom bg-bg-subtle/70 flex flex-col md:flex-row items-center gap-4">
            
            {/* Search Box */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-text-muted" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full bg-bg-card border border-border-custom rounded-lg pl-10 pr-4 py-2.5 text-sm text-text-primary focus:border-[#0078D7] focus:ring-1 focus:ring-[#0078D7] outline-none transition-all"
                placeholder="Buscar por cliente o N° de orden (ej: ORD-12345)..."
              />
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {activeTab === "pendientes" && (
                <div className="flex items-center gap-1 bg-bg-card border border-border-custom p-1 rounded-lg">
                  <button
                    onClick={() => setFiltroEstado("TODOS")}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      filtroEstado === "TODOS" ? "bg-[#0078D7] text-white" : "text-text-muted hover:text-text-primary"
                    }`}
                  >
                    Todas
                  </button>
                  <button
                    onClick={() => setFiltroEstado("VENCIDAS")}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      filtroEstado === "VENCIDAS" ? "bg-red-500 text-white" : "text-text-muted hover:text-red-400"
                    }`}
                  >
                    Vencidas ({facturasVencidasList.length})
                  </button>
                  <button
                    onClick={() => setFiltroEstado("PARCIALES")}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      filtroEstado === "PARCIALES" ? "bg-amber-500 text-white" : "text-text-muted hover:text-amber-400"
                    }`}
                  >
                    Parciales
                  </button>
                  <button
                    onClick={() => setFiltroEstado("AL_DIA")}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      filtroEstado === "AL_DIA" ? "bg-emerald-600 text-white" : "text-text-muted hover:text-emerald-400"
                    }`}
                  >
                    Al Día
                  </button>
                  <button
                    onClick={() => setFiltroEstado("VENTA_RAPIDA")}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      filtroEstado === "VENTA_RAPIDA" ? "bg-rose-500 text-white" : "text-text-muted hover:text-rose-400"
                    }`}
                  >
                    ⚡ Venta Rápida
                  </button>
                </div>
              )}

              {/* Currency Selector */}
              <select
                value={filtroMoneda}
                onChange={(e) => setFiltroMoneda(e.target.value)}
                className="bg-bg-card border border-border-custom rounded-lg px-3 py-2 text-xs font-bold text-text-primary outline-none focus:border-[#0078D7] cursor-pointer"
              >
                <option value="TODOS">Moneda: Todas</option>
                <option value="ARS">ARS ($)</option>
                <option value="USD">USD (US$)</option>
              </select>
            </div>
          </div>

          {/* Listado */}
          <div className="divide-y divide-border-custom">
            
            {/* TAB PENDIENTES */}
            {activeTab === "pendientes" && (
              facturasFiltradas.length > 0 ? (
                facturasFiltradas.map((factura) => (
                  <div key={factura.id} className="p-6 hover:bg-bg-subtle/60 transition-all flex flex-col md:flex-row items-center justify-between gap-6 group">
                    <div className="flex-1 flex items-center gap-4 w-full">
                      <div className={`p-3.5 rounded-xl border transition-colors ${
                        factura.diasVencidos > 0 
                          ? 'bg-red-500/10 border-red-500/30 text-red-500' 
                          : factura.estadoCobro === "PARCIAL"
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                      }`}>
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-bold text-text-primary tracking-wide group-hover:text-emerald-400 transition-colors">
                            {factura.cliente}
                          </h3>
                          <span className="text-xs bg-bg-subtle text-text-muted px-2.5 py-0.5 rounded-md font-mono font-bold border border-border-custom">
                            {factura.numeroOrden}
                          </span>
                          {factura.estadoCobro === "PARCIAL" && (
                            <span className="text-[10px] bg-amber-500/10 text-amber-400 font-bold px-2 py-0.5 rounded-full border border-amber-500/20">
                              ⚡ Pago Parcial Ingresado
                            </span>
                          )}
                          {factura.tipoVenta === "VENTA_RAPIDA" && (
                            <span className="text-[10px] bg-rose-500/10 text-rose-400 font-bold px-2 py-0.5 rounded-full border border-rose-500/20 flex items-center gap-1">
                              <Zap className="w-3 h-3 fill-rose-400" /> Venta Rápida
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-text-muted flex items-center gap-2 flex-wrap">
                          <span>Total Orden: <strong>{factura.moneda === "USD" ? "US$" : "$"} {factura.totalFactura.toLocaleString("es-AR")}</strong></span>
                          <span>•</span>
                          <span>Cobrado a la fecha: <strong className="text-emerald-400">{factura.moneda === "USD" ? "US$" : "$"} {factura.totalPagado.toLocaleString("es-AR")}</strong></span>
                          <span>•</span>
                          <span>Vencimiento: <strong>{factura.vencimiento}</strong></span>
                          {factura.diasVencidos > 0 && (
                            <span className="text-red-400 font-bold bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20 animate-pulse">
                              ⚠️ ¡Atrasado {factura.diasVencidos} días!
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto border-t md:border-t-0 border-border-custom/50 pt-4 md:pt-0">
                      <div className="text-left md:text-right">
                        <p className="text-[10px] text-text-muted uppercase tracking-wider font-bold">Saldo Pendiente</p>
                        <p className="text-2xl font-black text-emerald-400 font-mono tracking-tight">
                          {factura.moneda === "USD" ? "US$" : "$"} {factura.saldoPendiente.toLocaleString("es-AR")}
                        </p>
                      </div>
                      <button 
                        onClick={() => abrirModal(factura)}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all shadow-md hover:shadow-emerald-500/20 cursor-pointer"
                      >
                        Registrar Cobro
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-16 text-center text-text-muted flex flex-col items-center">
                  <CheckCircle className="w-14 h-14 text-emerald-500/40 mb-4" />
                  <p className="text-lg font-bold text-text-primary">No se encontraron órdenes pendientes de cobro.</p>
                  <p className="text-xs text-text-muted mt-1">Todas las cuentas asignadas al filtro seleccionado están al día.</p>
                </div>
              )
            )}

            {/* TAB COMPLETADOS */}
            {activeTab === "completados" && (
              pagosFiltrados.length > 0 ? (
                pagosFiltrados.map((pago) => (
                  <div key={pago.id} className="divide-y divide-border-custom/50">
                    <div className="p-6 hover:bg-bg-subtle/50 flex flex-col md:flex-row items-center justify-between gap-6 transition-colors">
                      <div className="flex-1 flex items-center gap-4">
                        <div className="bg-emerald-500/10 p-3.5 rounded-xl border border-emerald-500/30 text-emerald-400">
                          <CheckCircle className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg font-bold text-text-primary tracking-wide">{pago.cliente}</h3>
                            <span className="text-xs bg-bg-subtle text-text-muted px-2.5 py-0.5 rounded-md font-mono font-bold border border-border-custom">
                              {pago.numeroOrden}
                            </span>
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
                              ✓ Saldado Completamente
                            </span>
                          </div>
                          <p className="text-xs text-text-muted">
                            Total Orden: <strong>{pago.moneda === "USD" ? "US$" : "$"} {pago.totalFactura.toLocaleString("es-AR")}</strong> • Registrar en {pago.payments.length} transacción/es de pago.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-[10px] text-emerald-500/80 uppercase tracking-wider font-bold">Cobrado</p>
                          <p className="text-2xl font-black text-emerald-400 font-mono">
                            {pago.moneda === "USD" ? "US$" : "$"} {pago.totalPagado.toLocaleString("es-AR")}
                          </p>
                        </div>
                        <button
                          onClick={() => setExpandedInvoices(prev => ({ ...prev, [pago.id]: !prev[pago.id] }))}
                          className="p-2 border border-border-custom rounded-lg bg-bg-subtle hover:bg-bg-card transition-colors cursor-pointer text-text-muted hover:text-text-primary"
                          title="Ver detalle de pagos y retenciones"
                        >
                          <ChevronDown className={`w-5 h-5 transition-transform ${expandedInvoices[pago.id] ? "rotate-180" : ""}`} />
                        </button>
                      </div>
                    </div>

                    {/* Collapsible Payment Details */}
                    {expandedInvoices[pago.id] && (
                      <div className="bg-bg-subtle/60 p-5 space-y-3 animate-in slide-in-from-top-1 duration-200">
                        <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">Historial de Transacciones y Retenciones</h4>
                        <div className="space-y-2">
                          {pago.payments.map((p: any, idx: number) => {
                            const retencionesList: RetencionItem[] = p.detallesRetencion ? JSON.parse(p.detallesRetencion) : [];
                            return (
                              <div key={p.id || idx} className="bg-bg-card p-4 rounded-xl border border-border-custom flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-text-primary">Transacción #{idx + 1}</span>
                                    <span className="text-text-muted font-mono">• {new Date(p.fechaPago).toLocaleDateString()}</span>
                                    <span className="bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded text-[10px]">{p.metodoPago}</span>
                                  </div>
                                  <p className="text-text-muted">
                                    Monto ingresado: <strong className="text-emerald-400">${p.montoCobrado?.toLocaleString()}</strong>
                                    {p.montoRetenciones > 0 && (
                                      <span> + Retenciones: <strong className="text-amber-400">${p.montoRetenciones?.toLocaleString()}</strong></span>
                                    )}
                                    {p.numeroCupon && <span> • Cupón: <strong className="text-text-primary">{p.numeroCupon}</strong></span>}
                                    {p.tarjetaCuotas && <span> • Cuotas: <strong className="text-text-primary">{p.tarjetaCuotas}</strong></span>}
                                    {p.tasaCambio && <span> • Cotización: <strong className="text-text-primary">${p.tasaCambio}</strong></span>}
                                  </p>
                                  {retencionesList.length > 0 && (
                                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                                      <span className="text-[10px] text-amber-400 font-bold uppercase">Retenciones:</span>
                                      {retencionesList.map((r, rIdx) => (
                                        <span key={rIdx} className="bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-mono">
                                          {r.tipo} (${r.monto}) - Cert: {r.certificado || 'S/N'}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center gap-3">
                                  {p.comprobanteUrl && (
                                    <a href={p.comprobanteUrl} target="_blank" rel="noreferrer" className="text-xs text-[#0078D7] hover:underline font-bold flex items-center gap-1">
                                      <Receipt className="w-3.5 h-3.5" /> Ticket Pago
                                    </a>
                                  )}
                                  {p.comprobanteRetencionUrl && (
                                    <a href={p.comprobanteRetencionUrl} target="_blank" rel="noreferrer" className="text-xs text-amber-400 hover:underline font-bold flex items-center gap-1">
                                      <FileText className="w-3.5 h-3.5" /> Cert. Retención
                                    </a>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-16 text-center text-text-muted flex flex-col items-center">
                  <FileText className="w-12 h-12 text-text-muted/40 mb-3" />
                  <p className="text-lg font-bold text-text-primary">No hay pagos saldados registrados.</p>
                </div>
              )
            )}

          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-bg-card p-5 border border-border-custom rounded-xl shadow-md">
            <div>
              <h3 className="font-bold text-sm text-text-primary uppercase tracking-wider">Calendario de Cobros y Recaudación</h3>
              <p className="text-xs text-text-muted mt-0.5">Vencimientos y fechas fijas de facturación para clientes con abonos recurrentes.</p>
            </div>
            
            {/* Date switcher */}
            <div className="flex items-center gap-3">
              <button
                onClick={prevMonth}
                className="p-2 border border-border-custom rounded-lg bg-bg-subtle hover:bg-bg-card transition-colors cursor-pointer text-text-muted hover:text-text-primary"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-base font-bold text-text-primary capitalize tracking-wide w-48 text-center">
                {currentDate.toLocaleDateString([], { month: "long", year: "numeric" })}
              </h2>
              <button
                onClick={nextMonth}
                className="p-2 border border-border-custom rounded-lg bg-bg-subtle hover:bg-bg-card transition-colors cursor-pointer text-text-muted hover:text-text-primary"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Monthly Calendar Grid */}
            <div className="lg:col-span-3 bg-bg-card border border-border-custom rounded-xl shadow-xl overflow-hidden">
              <div className="grid grid-cols-7 border-b border-border-custom bg-bg-subtle text-center py-3 text-xs uppercase tracking-wider font-semibold text-text-muted">
                <div>Dom</div>
                <div>Lun</div>
                <div>Mar</div>
                <div>Mié</div>
                <div>Jue</div>
                <div>Vie</div>
                <div>Sáb</div>
              </div>

              <div className="grid grid-cols-7 divide-x divide-y divide-border-custom min-h-[460px]">
                {allCalendarDays.map((day, idx) => {
                  const dayClients = getClientsOnDate(day.date, day.isCurrentMonth);
                  const isToday =
                    new Date().getDate() === day.date.getDate() &&
                    new Date().getMonth() === day.date.getMonth() &&
                    new Date().getFullYear() === day.date.getFullYear();

                  return (
                    <div
                      key={idx}
                      className={`min-h-[95px] p-2 flex flex-col justify-between transition-colors ${
                        day.isCurrentMonth 
                          ? isToday 
                            ? "bg-emerald-500/10 hover:bg-emerald-500/15" 
                            : "hover:bg-bg-subtle/40" 
                          : "bg-bg-subtle/10 opacity-30 cursor-not-allowed"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span
                          className={`text-xs font-bold font-mono px-2 py-0.5 rounded-full ${
                            isToday && day.isCurrentMonth
                              ? "bg-emerald-500 text-white shadow-sm"
                              : "text-text-muted"
                          }`}
                        >
                          {day.date.getDate()}
                        </span>
                      </div>
                      
                      <div className="flex-1 space-y-1">
                        {dayClients.map((c) => (
                          <div 
                            key={c.id} 
                            className="bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 p-1.5 rounded-md text-[10px] font-bold block truncate shadow-sm transition-colors cursor-pointer"
                            title={`Cliente: ${c.razonSocial} • Cobrar Abono Mensual (${c.services?.length || 0} servicio/s)`}
                          >
                            💰 Cobrar: {c.razonSocial}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Side list detailing monthly services */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-bg-card border border-border-custom rounded-xl p-5 shadow-lg space-y-4">
                <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-500 border-b border-border-custom pb-2 flex items-center justify-between">
                  <span>Vencimientos Mensuales</span>
                  <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded text-[10px]">{clientsWithServices.length}</span>
                </h4>
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {clientsWithServices.map((c) => (
                    <div key={c.id} className="bg-bg-subtle/50 p-3 rounded-lg border border-border-custom space-y-2 hover:border-emerald-500/30 transition-all">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-xs text-text-primary">{c.razonSocial}</p>
                          <p className="text-[10px] text-text-muted">Día de cobro: <span className="font-bold text-emerald-400">{c.diaFacturacion} de cada mes</span></p>
                        </div>
                        <span className="text-[9px] bg-emerald-500/10 text-emerald-400 font-bold px-1.5 py-0.5 rounded border border-emerald-500/20 uppercase">Abonado</span>
                      </div>
                      
                      <div className="space-y-1 border-t border-border-custom/50 pt-2">
                        {c.services?.map((s: any) => (
                          <div key={s.id} className="flex justify-between text-[10px]">
                            <span className="text-text-secondary font-medium">🔌 {s.tipo} ({s.operador})</span>
                            <span className="text-text-muted font-bold">{s.gigasAsignados} GB</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Avanzado para Registrar Cobro */}
      {isModalOpen && cobroSeleccionado && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-bg-card border border-border-custom rounded-2xl shadow-2xl w-full max-w-2xl my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header Modal */}
            <div className="flex justify-between items-center p-6 border-b border-border-custom bg-bg-subtle/80">
              <h2 className="text-xl font-bold text-text-primary flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <Banknote className="w-6 h-6" />
                </div>
                Registrar Cobro Avanzado
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-text-muted hover:text-text-primary transition-colors cursor-pointer p-1 rounded-lg hover:bg-bg-subtle"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleCobrar} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              
              {/* Summary Card */}
              <div className="bg-bg-subtle/80 p-5 rounded-xl border border-border-custom grid grid-cols-1 md:grid-cols-3 gap-4 shadow-inner">
                <div>
                  <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Cliente</p>
                  <p className="font-bold text-sm text-text-primary truncate">{cobroSeleccionado.cliente}</p>
                  <p className="text-xs font-mono text-emerald-400 font-bold">{cobroSeleccionado.numeroOrden}</p>
                </div>
                <div>
                  <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Total Orden</p>
                  <p className="font-bold text-sm text-text-primary font-mono">
                    {cobroSeleccionado.moneda === "USD" ? "US$" : "$"} {cobroSeleccionado.totalFactura.toLocaleString("es-AR")}
                  </p>
                  <p className="text-[10px] text-text-muted font-medium">Pagado previo: ${cobroSeleccionado.totalPagado.toLocaleString("es-AR")}</p>
                </div>
                <div className="text-left md:text-right">
                  <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Saldo Remanente</p>
                  <p className="text-2xl font-black text-emerald-400 font-mono">
                    {cobroSeleccionado.moneda === "USD" ? "US$" : "$"} {cobroSeleccionado.saldoPendiente.toLocaleString("es-AR")}
                  </p>
                </div>
              </div>

              {/* Grid Principal Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Monto a Cobrar */}
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                    Monto a Cobrar ({cobroSeleccionado.moneda === "USD" ? "US$" : "$"})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={cobroSeleccionado.saldoPendiente}
                    value={formCobro.montoCobrado === 0 ? "" : formCobro.montoCobrado}
                    onChange={e => {
                      const val = e.target.value;
                      setFormCobro({ ...formCobro, montoCobrado: val === "" ? 0 : Number(val) });
                    }}
                    onFocus={e => e.target.select()}
                    className="w-full bg-bg-subtle border border-border-custom rounded-lg px-4 py-2.5 text-base font-bold font-mono text-emerald-400 focus:border-[#0078D7] outline-none"
                    required
                  />
                  <p className="text-[10px] text-text-muted mt-1">Puedes modificar el valor para registrar un cobro parcial.</p>
                </div>

                {/* Método de Pago */}
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Medio de Pago Principal</label>
                  <select
                    value={formCobro.metodoPago}
                    onChange={e => setFormCobro({...formCobro, metodoPago: e.target.value})}
                    className="w-full bg-bg-subtle border border-border-custom rounded-lg px-4 py-2.5 text-sm text-text-primary focus:border-[#0078D7] outline-none cursor-pointer"
                  >
                    <option value="Transferencia">Transferencia Bancaria</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Tarjeta de Crédito">Tarjeta de Crédito</option>
                    <option value="Tarjeta de Débito">Tarjeta de Débito</option>
                    <option value="MercadoPago">MercadoPago</option>
                  </select>
                </div>

                {/* Fecha de Pago */}
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Fecha del Cobro
                  </label>
                  <input
                    type="date"
                    value={formCobro.fechaPago}
                    onChange={e => setFormCobro({...formCobro, fechaPago: e.target.value})}
                    className="w-full bg-bg-subtle border border-border-custom rounded-lg px-4 py-2.5 text-sm text-text-primary focus:border-[#0078D7] outline-none"
                    required
                  />
                </div>

                {/* Tasa de Cambio (ARS / USD) */}
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1">
                    <ArrowRightLeft className="w-3.5 h-3.5 text-[#0078D7]" /> Tasa de Cambio / Cotización (Opcional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formCobro.tasaCambio}
                    onChange={e => setFormCobro({...formCobro, tasaCambio: e.target.value})}
                    placeholder="Ej: 1350.50 (BNA / Pactada)"
                    className="w-full bg-bg-subtle border border-border-custom rounded-lg px-4 py-2.5 text-sm text-text-primary focus:border-[#0078D7] outline-none"
                  />
                </div>

              </div>

              {/* Si es Tarjeta de Crédito / Débito */}
              {formCobro.metodoPago.startsWith("Tarjeta") && (
                <div className="bg-bg-subtle/50 p-4 rounded-xl border border-border-custom space-y-4 animate-in fade-in duration-200">
                  <h4 className="text-xs font-bold text-[#0078D7] uppercase tracking-wider flex items-center gap-2">
                    <CreditCard className="w-4 h-4" /> Detalle de Financiación y Cupón Posnet
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-text-muted uppercase mb-1">Cuotas</label>
                      <select
                        value={formCobro.tarjetaCuotas}
                        onChange={e => setFormCobro({ ...formCobro, tarjetaCuotas: Number(e.target.value) })}
                        className="w-full bg-bg-card border border-border-custom rounded-lg px-3 py-2 text-xs font-bold text-text-primary outline-none"
                      >
                        <option value={1}>1 Cuota (Sin Interés)</option>
                        <option value={3}>3 Cuotas</option>
                        <option value={6}>6 Cuotas</option>
                        <option value={12}>12 Cuotas</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-text-muted uppercase mb-1">Recargo Financiero ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formCobro.tarjetaRecargo === 0 ? "" : formCobro.tarjetaRecargo}
                        onChange={e => setFormCobro({ ...formCobro, tarjetaRecargo: Number(e.target.value) })}
                        placeholder="0"
                        className="w-full bg-bg-card border border-border-custom rounded-lg px-3 py-2 text-xs font-bold text-text-primary outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-text-muted uppercase mb-1">N° Cupón / Lote</label>
                      <input
                        type="text"
                        value={formCobro.numeroCupon}
                        onChange={e => setFormCobro({ ...formCobro, numeroCupon: e.target.value })}
                        placeholder="Ej: C-984321"
                        className="w-full bg-bg-card border border-border-custom rounded-lg px-3 py-2 text-xs font-bold text-text-primary outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Retenciones Impositivas */}
              <div className="bg-bg-subtle/50 p-4 rounded-xl border border-border-custom space-y-4">
                <div className="flex items-center justify-between border-b border-border-custom/60 pb-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-text-primary uppercase tracking-wider">Retenciones Impositivas</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formCobro.aplicaRetencion}
                      onChange={e => setFormCobro({ ...formCobro, aplicaRetencion: e.target.checked })}
                      className="sr-only peer" 
                    />
                    <div className="w-9 h-5 bg-bg-card peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                {formCobro.aplicaRetencion && (
                  <div className="space-y-3 animate-in fade-in duration-200">
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] text-text-muted">Agregue los certificados de retención presentados por el cliente (IVA, IIBB, Ganancias, etc.):</p>
                      <button
                        type="button"
                        onClick={addRetencionItem}
                        className="text-xs bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-white px-2.5 py-1 rounded transition-colors font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Agregar Retención
                      </button>
                    </div>

                    {formCobro.retencionesList.map((ret, rIdx) => (
                      <div key={ret.id} className="grid grid-cols-1 md:grid-cols-3 gap-2 bg-bg-card p-3 rounded-lg border border-border-custom items-center">
                        <select
                          value={ret.tipo}
                          onChange={e => updateRetencionItem(ret.id, "tipo", e.target.value)}
                          className="bg-bg-subtle border border-border-custom rounded px-2.5 py-1.5 text-xs text-text-primary outline-none"
                        >
                          <option value="Retención IIBB">Retención IIBB</option>
                          <option value="Retención IVA">Retención IVA</option>
                          <option value="Retención Ganancias">Retención Ganancias</option>
                          <option value="Retención SUSS">Retención SUSS</option>
                          <option value="Otras Retenciones">Otras Retenciones</option>
                        </select>

                        <input
                          type="text"
                          value={ret.certificado}
                          onChange={e => updateRetencionItem(ret.id, "certificado", e.target.value)}
                          placeholder="N° Certificado"
                          className="bg-bg-subtle border border-border-custom rounded px-2.5 py-1.5 text-xs text-text-primary outline-none"
                        />

                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.01"
                            value={ret.monto === 0 ? "" : ret.monto}
                            onChange={e => updateRetencionItem(ret.id, "monto", Number(e.target.value))}
                            placeholder="Monto ($)"
                            className="w-full bg-bg-subtle border border-border-custom rounded px-2.5 py-1.5 text-xs font-bold text-amber-400 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => removeRetencionItem(ret.id)}
                            className="text-red-500 hover:bg-red-500/10 p-1.5 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Subida del certificado de retención */}
                    <div className="pt-2">
                      <label className="block text-[10px] font-bold text-text-muted uppercase mb-1">Certificado de Retención (PDF / Imagen)</label>
                      <input 
                        type="file" 
                        ref={retencionFileInputRef} 
                        onChange={e => handleFileChange(e, true)} 
                        accept="application/pdf,image/*" 
                        className="hidden" 
                      />
                      <div 
                        onClick={() => retencionFileInputRef.current?.click()}
                        className="border border-dashed border-border-custom hover:border-amber-500/50 rounded-lg p-3 text-center cursor-pointer bg-bg-card transition-colors"
                      >
                        <p className="text-xs text-amber-400 font-medium">
                          {formCobro.comprobanteRetencionCargado 
                            ? `✓ Certificado "${formCobro.comprobanteRetencionNombre}" cargado` 
                            : "Adjuntar archivo comprobante de retención..."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Subida del Comprobante de Pago Principal */}
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Comprobante de Transferencia / Ticket de Pago</span>
                  {cobroSeleccionado?.tipoVenta === "VENTA_RAPIDA" && (
                    <span className="text-rose-400 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                      <Zap className="w-3 h-3 fill-rose-400" /> (Obligatorio Venta Rápida)
                    </span>
                  )}
                </label>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={e => handleFileChange(e, false)} 
                  accept="application/pdf,image/*" 
                  className="hidden" 
                />
                <div 
                  className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all bg-bg-subtle/50 hover:bg-bg-subtle ${
                    cobroSeleccionado?.tipoVenta === "VENTA_RAPIDA" && !formCobro.comprobanteCargado
                      ? "border-rose-500/60 hover:border-rose-500"
                      : "border-border-custom hover:border-emerald-500/60"
                  }`} 
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadCloud className={`w-8 h-8 mx-auto mb-2 transition-transform group-hover:scale-110 ${formCobro.comprobanteCargado ? 'text-emerald-400' : 'text-text-muted'}`} />
                  <p className="text-xs font-medium text-text-secondary">
                    {formCobro.comprobanteCargado 
                      ? `✓ Archivo "${formCobro.comprobanteNombre}" adjuntado` 
                      : "Haga clic aquí para subir ticket o transferencia"}
                  </p>
                </div>
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Observaciones</label>
                <textarea
                  value={formCobro.observaciones}
                  onChange={e => setFormCobro({ ...formCobro, observaciones: e.target.value })}
                  placeholder="Detalles adicionales del pago o recibo..."
                  className="w-full bg-bg-subtle border border-border-custom rounded-lg px-3 py-2 text-xs text-text-primary outline-none min-h-[60px]"
                />
              </div>

              {/* Live Payment Summary Bar */}
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-3 text-xs">
                <div>
                  <p className="text-text-muted font-bold">Cobertura Total de esta Transacción:</p>
                  <p className="text-lg font-black text-emerald-400 font-mono">
                    ${totalCobroTotalTransaccion.toLocaleString("es-AR")}
                  </p>
                  <p className="text-[10px] text-text-muted">
                    Dinero ($ {Number(formCobro.montoCobrado || 0).toLocaleString()}) + Retenciones ($ {totalRetencionesForm.toLocaleString()})
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-text-muted font-bold">Nuevo Saldo Resultante:</p>
                  <p className="text-sm font-black font-mono text-text-primary">
                    ${Math.max(0, cobroSeleccionado.saldoPendiente - totalCobroTotalTransaccion).toLocaleString("es-AR")}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-border-custom">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-text-secondary hover:bg-bg-subtle border border-border-custom transition-all cursor-pointer" 
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/20" 
                  disabled={loading}
                >
                  <CheckCircle className="w-4 h-4" />
                  {loading ? "Procesando..." : "Confirmar Cobro"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
