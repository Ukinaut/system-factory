"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Receipt, 
  Search, 
  FileText, 
  UploadCloud, 
  CheckCircle, 
  ChevronRight, 
  ChevronLeft, 
  X, 
  Clock, 
  Calendar as CalendarIcon, 
  Activity, 
  Plus,
  Zap,
  Download,
  Eye,
  FileCheck,
  Building,
  DollarSign,
  TrendingUp,
  CreditCard,
  UserCheck,
  Percent
} from "lucide-react";
import { 
  getPendingInvoices, 
  createInvoice, 
  getClientsWithServices, 
  getIssuedInvoices, 
  createDirectInvoice, 
  generateRecurringInvoicesForMonth 
} from "@/actions/billing";
import { getClients } from "@/actions/clients";
import { getAllMonthlyServices, applyMassPriceIncrease, generateBatchMonthlyInvoices } from "@/actions/services";

export default function FacturacionDashboard() {
  const [activeSubTab, setActiveSubTab] = useState<"pending" | "history" | "calendar">("pending");
  const [busqueda, setBusqueda] = useState("");
  const [busquedaHistorial, setBusquedaHistorial] = useState("");
  
  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDirectModalOpen, setIsDirectModalOpen] = useState(false);
  
  // Modal Suba Masiva
  const [isPriceIncreaseModalOpen, setIsPriceIncreaseModalOpen] = useState(false);
  const [porcentajeSuba, setPorcentajeSuba] = useState<number>(0);
  const [montoFijoSuba, setMontoFijoSuba] = useState<number>(0);
  const [monedaFiltroSuba, setMonedaFiltroSuba] = useState("TODAS");
  const [categoriaFiltroSuba, setCategoriaFiltroSuba] = useState("TODAS");
  const [allServicesForIncrease, setAllServicesForIncrease] = useState<any[]>([]);
  const [loadingIncrease, setLoadingIncrease] = useState(false);

  // Modal Facturación Masiva de Abonos
  const [isBatchInvoiceModalOpen, setIsBatchInvoiceModalOpen] = useState(false);
  const [periodoFacturacion, setPeriodoFacturacion] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  
  // Estados de carga e historial
  const [ventaSeleccionada, setVentaSeleccionada] = useState<any>(null);
  const [ventasPendientes, setVentasPendientes] = useState<any[]>([]);
  const [issuedInvoices, setIssuedInvoices] = useState<any[]>([]);
  const [clientsWithServices, setClientsWithServices] = useState<any[]>([]);
  const [allClients, setAllClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const directFileInputRef = useRef<HTMLInputElement>(null);

  // Formulario Facturar Orden
  const [formFactura, setFormFactura] = useState({
    numeroComprobante: "",
    archivoCargado: false,
    archivoNombre: "",
    archivoBase64: "",
    observaciones: ""
  });

  // Formulario Factura Directa
  const [formDirect, setFormDirect] = useState({
    clientId: "",
    tipoFactura: "B",
    moneda: "ARS",
    montoTotal: 0,
    observaciones: "",
    descripcionItem: "Servicios de Asesoría y Conectividad",
    archivoCargado: false,
    archivoNombre: "",
    archivoBase64: ""
  });

  const loadData = async () => {
    setLoading(true);
    const [pendingRes, clientsRes, issuedRes, allClientsRes] = await Promise.all([
      getPendingInvoices(),
      getClientsWithServices(),
      getIssuedInvoices(),
      getClients()
    ]);

    if (pendingRes.success) {
      const formatted = (pendingRes.sales || []).map((s: any) => ({
        id: s.id,
        numeroOrden: s.numeroOrden,
        cliente: s.client?.razonSocial || "Cliente Desconocido",
        tipo: s.tipo,
        total: s.total,
        fecha: new Date(s.createdAt).toLocaleDateString(),
        tipoFactura: s.tipoFactura,
        moneda: s.moneda || "ARS",
      }));
      setVentasPendientes(formatted);
    }

    if (clientsRes.success) {
      setClientsWithServices(clientsRes.clients || []);
    }

    if (issuedRes.success) {
      setIssuedInvoices(issuedRes.invoices || []);
    }

    if (allClientsRes.success) {
      setAllClients(allClientsRes.clients || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const ventasFiltradas = ventasPendientes.filter(v => 
    v.cliente.toLowerCase().includes(busqueda.toLowerCase()) || 
    v.numeroOrden.toLowerCase().includes(busqueda.toLowerCase())
  );

  const facturasEmitidasFiltradas = issuedInvoices.filter(inv => {
    const q = busquedaHistorial.toLowerCase();
    const clienteName = inv.sale?.client?.razonSocial || "";
    const nroOrden = inv.sale?.numeroOrden || "";
    const obs = inv.observacionesFacturador || "";
    return clienteName.toLowerCase().includes(q) || nroOrden.toLowerCase().includes(q) || obs.toLowerCase().includes(q);
  });

  const abrirModal = (venta: any) => {
    setVentaSeleccionada(venta);
    setFormFactura({ numeroComprobante: "", archivoCargado: false, archivoNombre: "", archivoBase64: "", observaciones: "" });
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setFormFactura({
          ...formFactura,
          archivoCargado: true,
          archivoNombre: file.name,
          archivoBase64: reader.result as string,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDirectFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setFormDirect({
          ...formDirect,
          archivoCargado: true,
          archivoNombre: file.name,
          archivoBase64: reader.result as string,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFacturar = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await createInvoice({
      saleId: ventaSeleccionada.id,
      archivoUrl: formFactura.archivoCargado ? formFactura.archivoBase64 : undefined,
      observacionesFacturador: `N° Factura: ${formFactura.numeroComprobante}. ${formFactura.observaciones}`,
    });
    setLoading(false);
    if (res.success) {
      alert(`La orden ${ventaSeleccionada.numeroOrden} fue facturada exitosamente y enviada a Cobranzas.`);
      setIsModalOpen(false);
      loadData();
    } else {
      alert("Error al facturar: " + res.error);
    }
  };

  const handleOmitir = async () => {
    if (!confirm(`¿Está seguro de que desea omitir la emisión de factura para la orden ${ventaSeleccionada.numeroOrden}? Se enviará directamente a Cobranzas.`)) {
      return;
    }
    setLoading(true);
    const res = await createInvoice({
      saleId: ventaSeleccionada.id,
      archivoUrl: undefined,
      observacionesFacturador: `Facturación omitida (Venta Rápida). ${formFactura.observaciones}`,
    });
    setLoading(false);
    if (res.success) {
      alert(`La facturación de la orden ${ventaSeleccionada.numeroOrden} fue omitida y la orden fue enviada a Cobranzas.`);
      setIsModalOpen(false);
      loadData();
    } else {
      alert("Error al omitir: " + res.error);
    }
  };

  const handleCreateDirectInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDirect.clientId || formDirect.montoTotal <= 0) {
      alert("Por favor seleccione un cliente e ingrese un monto total válido.");
      return;
    }

    setLoading(true);
    try {
      const res = await createDirectInvoice({
        clientId: formDirect.clientId,
        tipoFactura: formDirect.tipoFactura,
        moneda: formDirect.moneda,
        montoTotal: Number(formDirect.montoTotal),
        observaciones: formDirect.observaciones,
        archivoUrl: formDirect.archivoCargado ? formDirect.archivoBase64 : undefined,
        items: [
          {
            descripcion: formDirect.descripcionItem || "Factura emitida directamente",
            cantidad: 1,
            precioUnitario: Number(formDirect.montoTotal)
          }
        ]
      });

      if (res.success) {
        alert("¡Factura directa creada exitosamente y derivada al área de Cobranzas!");
        setIsDirectModalOpen(false);
        setFormDirect({
          clientId: "",
          tipoFactura: "B",
          moneda: "ARS",
          montoTotal: 0,
          observaciones: "",
          descripcionItem: "Servicios de Asesoría y Conectividad",
          archivoCargado: false,
          archivoNombre: "",
          archivoBase64: ""
        });
        loadData();
      } else {
        alert("Error al crear factura directa: " + res.error);
      }
    } catch (err: any) {
      console.error("Error al crear factura directa:", err);
      alert("Error al procesar la solicitud: " + (err?.message || "Ocurrió un error inesperado al adjuntar el archivo."));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPriceIncreaseModal = async () => {
    setLoadingIncrease(true);
    setIsPriceIncreaseModalOpen(true);
    const res = await getAllMonthlyServices();
    if (res.success) {
      setAllServicesForIncrease(res.services || []);
    }
    setLoadingIncrease(false);
  };

  const handleApplyMassIncrease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (porcentajeSuba <= 0 && montoFijoSuba <= 0) {
      alert("Por favor ingrese un porcentaje de suba o un monto fijo mayor a 0.");
      return;
    }
    if (!confirm(`¿Está seguro de aplicar un aumento masivo de ${porcentajeSuba > 0 ? `+${porcentajeSuba}% ` : ""}${montoFijoSuba > 0 ? `+$${montoFijoSuba} ` : ""}a los abonos activos?`)) {
      return;
    }

    setLoading(true);
    const res = await applyMassPriceIncrease({
      porcentaje: porcentajeSuba > 0 ? porcentajeSuba : undefined,
      montoFijo: montoFijoSuba > 0 ? montoFijoSuba : undefined,
      moneda: monedaFiltroSuba,
      categoria: categoriaFiltroSuba,
    });
    setLoading(false);

    if (res.success) {
      alert(`¡Aumento masivo aplicado exitosamente a ${res.updatedCount} abonos mensuales!`);
      setIsPriceIncreaseModalOpen(false);
      setPorcentajeSuba(0);
      setMontoFijoSuba(0);
      loadData();
    } else {
      alert("Error al aplicar aumento masivo: " + res.error);
    }
  };

  const handleConfirmBatchBilling = async () => {
    setIsGeneratingBatch(true);
    const res = await generateBatchMonthlyInvoices(periodoFacturacion);
    setIsGeneratingBatch(false);
    if (res.success) {
      alert(`¡Facturación masiva completada! Se generaron comprobantes para ${res.generatedCount} clientes.`);
      setIsBatchInvoiceModalOpen(false);
      loadData();
    } else {
      alert("Error al facturar abonos masivos: " + res.error);
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
    return clientsWithServices.filter((c) => c.diaFacturacion === date.getDate());
  };

  // Cálculo de Métricas KPI
  const totalPendienteMonto = ventasPendientes.reduce((sum, v) => sum + v.total, 0);
  const totalEmitidasMonto = issuedInvoices.reduce((sum, inv) => sum + (inv.sale?.total || 0), 0);

  return (
    <div className="w-full pb-16 space-y-6">
      
      {/* Header de la Sección */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-bg-card p-6 rounded-xl border border-border-custom shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-text-primary tracking-tight flex items-center gap-3">
            <Receipt className="text-[#0078D7] w-8 h-8" />
            Facturación y Emitidos
          </h1>
          <p className="text-text-muted text-sm mt-0.5">
            Gestión integral de emisión de facturas de venta, facturación directa, comprobantes y abonos recurrentes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleOpenPriceIncreaseModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-bold text-xs rounded-lg transition-all shadow-sm cursor-pointer"
          >
            <TrendingUp className="w-4 h-4" />
            Cálculo y Suba Masiva
          </button>

          <button
            onClick={() => setIsBatchInvoiceModalOpen(true)}
            disabled={isGeneratingBatch}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold text-xs rounded-lg transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            <Zap className={`w-4 h-4 ${isGeneratingBatch ? "animate-spin" : ""}`} />
            {isGeneratingBatch ? "Generando..." : "Facturar Abonos del Mes"}
          </button>

          <button
            onClick={() => setIsDirectModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#0078D7] hover:bg-[#005a9e] text-white font-bold text-xs rounded-lg transition-all shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Emitir Factura Directa
          </button>
        </div>
      </div>

      {/* KPI Cards Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1: Pendientes de Facturación */}
        <div className="bg-bg-card border border-border-custom rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Pendientes de Facturación</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-500 font-mono tracking-tight">
            $ {totalPendienteMonto.toLocaleString("es-AR")}
          </div>
          <div className="mt-3 pt-2.5 border-t border-border-custom/60 flex justify-between text-xs text-text-muted">
            <span>Órdenes a facturar:</span>
            <span className="font-bold text-text-primary font-mono">{ventasPendientes.length}</span>
          </div>
        </div>

        {/* Card 2: Facturas Emitidas */}
        <div className="bg-bg-card border border-border-custom rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Facturas Emitidas</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-500 font-mono tracking-tight">
            $ {totalEmitidasMonto.toLocaleString("es-AR")}
          </div>
          <div className="mt-3 pt-2.5 border-t border-border-custom/60 flex justify-between text-xs text-text-muted">
            <span>Comprobantes listos:</span>
            <span className="font-bold text-text-primary font-mono">{issuedInvoices.length}</span>
          </div>
        </div>

        {/* Card 3: Clientes Abonados */}
        <div className="bg-bg-card border border-border-custom rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Abonos Recurrentes</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20">
              <CalendarIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-400 tracking-tight">
            {clientsWithServices.length} <span className="text-xs font-normal text-text-muted">clientes</span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-border-custom/60 flex justify-between text-xs text-text-muted">
            <span>Servicios activos:</span>
            <span className="font-bold text-emerald-400 font-mono">
              {clientsWithServices.reduce((acc, c) => acc + (c.services?.length || 0), 0)}
            </span>
          </div>
        </div>

        {/* Card 4: Estado AFIP / Facturación */}
        <div className="bg-bg-card border border-border-custom rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">AFIP / Comprobantes</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-400 tracking-tight flex items-center gap-2">
            CONECTADO
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-border-custom/60 flex justify-between text-xs text-text-muted">
            <span>Modo emisión:</span>
            <span className="font-bold text-text-primary font-mono">EN LÍNEA</span>
          </div>
        </div>

      </div>

      {/* Tabs Principales */}
      <div className="flex border-b border-border-custom gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab("pending")}
          className={`px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 cursor-pointer transition-all ${
            activeSubTab === "pending"
              ? "border-[#0078D7] text-[#0078D7]"
              : "border-transparent text-text-muted hover:text-text-primary"
          }`}
        >
          📦 Pendientes de Facturación ({ventasPendientes.length})
        </button>

        <button
          onClick={() => setActiveSubTab("history")}
          className={`px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 cursor-pointer transition-all ${
            activeSubTab === "history"
              ? "border-[#0078D7] text-[#0078D7]"
              : "border-transparent text-text-muted hover:text-text-primary"
          }`}
        >
          📋 Historial de Facturas Emitidas ({issuedInvoices.length})
        </button>

        <button
          onClick={() => setActiveSubTab("calendar")}
          className={`px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 cursor-pointer transition-all ${
            activeSubTab === "calendar"
              ? "border-[#0078D7] text-[#0078D7]"
              : "border-transparent text-text-muted hover:text-text-primary"
          }`}
        >
          📅 Calendario de Abonos Mensuales
        </button>
      </div>

      {/* Pestaña 1: Pendientes de Facturación */}
      {activeSubTab === "pending" && (
        <div className="bg-bg-card rounded-xl border border-border-custom shadow-xl overflow-hidden animate-in fade-in duration-200">
          <div className="p-6 border-b border-border-custom bg-bg-subtle flex gap-4">
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-3 top-3.5 text-gray-500" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full bg-bg-card border border-border-custom rounded-lg pl-10 pr-4 py-3 text-sm text-text-primary focus:border-[#0078D7] outline-none transition-colors"
                placeholder="Buscar por Cliente o N° de Orden..."
              />
            </div>
          </div>

          <div className="divide-y divide-border-custom">
            {ventasFiltradas.length > 0 ? (
              ventasFiltradas.map((venta) => (
                <div key={venta.id} className="p-6 hover:bg-bg-subtle/50 transition-colors flex flex-col md:flex-row items-center justify-between gap-6">
                  
                  <div className="flex-1 flex items-center gap-4">
                    <div className="bg-amber-500/10 p-3.5 rounded-xl border border-amber-500/30 text-amber-500">
                      <Clock className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-text-primary tracking-wide">{venta.cliente}</h3>
                        <span className="text-xs bg-bg-subtle text-text-muted px-2.5 py-1 rounded-md font-mono font-bold border border-border-custom">{venta.numeroOrden}</span>
                      </div>
                      <p className="text-sm text-text-muted">
                        Tipo:{" "}
                        <span className={venta.tipo === "VENTA_RAPIDA" ? "text-rose-400 font-bold uppercase tracking-wider" : "text-text-primary font-medium"}>
                          {venta.tipo === "VENTA_RAPIDA" ? "⚡ Venta Rápida" : venta.tipo}
                        </span>{" "}
                        | Tipo de cliente: <strong className="text-text-primary">"{venta.tipoFactura}"</strong> | Fecha: {venta.fecha}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">Total a Facturar</p>
                      <p className="text-2xl font-black text-emerald-500 font-mono">{venta.moneda === "USD" ? "US$" : "$"} {venta.total.toLocaleString("es-AR")}</p>
                    </div>
                    <button 
                      onClick={() => abrirModal(venta)}
                      className="flex items-center gap-2 bg-[#0078D7]/10 hover:bg-[#0078D7] text-[#0078D7] hover:text-white px-5 py-2.5 rounded-lg font-bold text-xs transition-all border border-[#0078D7]/30 hover:border-transparent cursor-pointer shadow-sm"
                    >
                      Adjuntar Factura
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                </div>
              ))
            ) : (
              <div className="p-16 text-center text-text-muted flex flex-col items-center">
                <CheckCircle className="w-12 h-12 text-emerald-500/50 mb-3" />
                <p className="text-lg font-semibold text-text-primary">No hay ventas pendientes de facturación.</p>
                <p className="text-xs text-text-muted mt-1">Todas las órdenes han sido procesadas o derivadas al módulo de cobranzas.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pestaña 2: Historial de Facturas Emitidas */}
      {activeSubTab === "history" && (
        <div className="bg-bg-card rounded-xl border border-border-custom shadow-xl overflow-hidden animate-in fade-in duration-200 space-y-4">
          <div className="p-6 border-b border-border-custom bg-bg-subtle flex gap-4">
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-3 top-3.5 text-gray-500" />
              <input
                type="text"
                value={busquedaHistorial}
                onChange={(e) => setBusquedaHistorial(e.target.value)}
                className="w-full bg-bg-card border border-border-custom rounded-lg pl-10 pr-4 py-3 text-sm text-text-primary focus:border-[#0078D7] outline-none transition-colors"
                placeholder="Buscar por cliente, nro de comprobante u observaciones..."
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            {facturasEmitidasFiltradas.length === 0 ? (
              <div className="p-16 text-center text-text-muted">No se encontraron facturas emitidas registradas.</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-bg-subtle/80 border-b border-border-custom text-xs uppercase tracking-widest text-text-primary font-black">
                    <th className="py-4 px-6">Cliente</th>
                    <th className="py-4 px-6">Orden / Origen</th>
                    <th className="py-4 px-6">Fecha Emisión</th>
                    <th className="py-4 px-6">Total</th>
                    <th className="py-4 px-6 text-center">Estado Cobro</th>
                    <th className="py-4 px-6 text-center">Comprobante</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-custom/60 text-sm text-text-secondary">
                  {facturasEmitidasFiltradas.map((inv) => (
                    <tr key={inv.id} className="hover:bg-bg-subtle/50 transition-colors">
                      <td className="py-4 px-6 font-bold text-text-primary">
                        {inv.sale?.client?.razonSocial || "Cliente General"}
                      </td>
                      <td className="py-4 px-6 font-mono text-xs font-bold text-[#0078D7]">
                        {inv.sale?.numeroOrden || "Factura Directa"}
                      </td>
                      <td className="py-4 px-6 font-mono text-xs text-text-secondary">
                        {new Date(inv.fecha).toLocaleString("es-AR")}
                      </td>
                      <td className="py-4 px-6 font-mono font-bold text-emerald-400">
                        {inv.sale?.moneda === "USD" ? "US$" : "$"} {(inv.sale?.total || 0).toLocaleString("es-AR")}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={`text-xs font-black px-3 py-1 rounded-md border uppercase tracking-wider ${
                          inv.estadoCobro === "PAGADO" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" :
                          inv.estadoCobro === "PARCIAL" ? "bg-amber-500/10 text-amber-400 border-amber-500/30" :
                          "bg-red-500/10 text-red-400 border-red-500/30"
                        }`}>
                          {inv.estadoCobro || "PENDIENTE"}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        {inv.archivoUrl ? (
                          <a
                            href={inv.archivoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500 hover:text-white transition-all text-xs font-bold"
                          >
                            <Eye className="w-3.5 h-3.5" /> Ver PDF
                          </a>
                        ) : (
                          <span className="text-xs text-text-muted italic">Sin adjunto</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Pestaña 3: Calendario de Abonos Mensuales */}
      {activeSubTab === "calendar" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-bg-card p-5 border border-border-custom rounded-xl shadow-md">
            <div>
              <h3 className="font-bold text-sm text-text-primary uppercase tracking-wider">Abonos y Facturaciones Recurrentes</h3>
              <p className="text-xs text-text-muted mt-0.5">Calendario de facturación mensual para clientes con servicios activos.</p>
            </div>
            
            <div className="flex items-center gap-4">
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
            <div className="lg:col-span-3 bg-bg-card border border-border-custom rounded-xl p-5 shadow-lg overflow-hidden">
              <div className="grid grid-cols-7 gap-px border-b border-border-custom pb-2 text-center text-xs font-bold text-text-muted uppercase tracking-wider">
                <div>Dom</div>
                <div>Lun</div>
                <div>Mar</div>
                <div>Mié</div>
                <div>Jue</div>
                <div>Vie</div>
                <div>Sáb</div>
              </div>

              <div className="grid grid-cols-7 divide-x divide-y divide-border-custom min-h-[440px]">
                {allCalendarDays.map((day, idx) => {
                  const dayClients = getClientsOnDate(day.date, day.isCurrentMonth);
                  const isToday =
                    new Date().getDate() === day.date.getDate() &&
                    new Date().getMonth() === day.date.getMonth() &&
                    new Date().getFullYear() === day.date.getFullYear();

                  return (
                    <div
                      key={idx}
                      className={`min-h-[90px] p-2 flex flex-col justify-between transition-colors ${
                        day.isCurrentMonth 
                          ? isToday 
                            ? "bg-[#0078D7]/5 hover:bg-[#0078D7]/10" 
                            : "hover:bg-bg-subtle/40" 
                          : "bg-bg-subtle/10 opacity-30 cursor-not-allowed"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span
                          className={`text-xs font-bold font-mono px-1.5 py-0.5 rounded-full ${
                            isToday && day.isCurrentMonth
                              ? "bg-[#0078D7] text-white"
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
                            className="bg-[#0078D7]/10 hover:bg-[#0078D7]/20 border border-[#0078D7]/25 text-white p-1 rounded text-[10px] font-bold block truncate shadow-sm transition-colors"
                            title={`Cliente: ${c.razonSocial} • Facturar Abono Mensual (${c.services?.length || 0} servicio/s)`}
                          >
                            📝 Facturar: {c.razonSocial}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-1 space-y-4">
              <div className="bg-bg-card border border-border-custom rounded-xl p-5 shadow-lg space-y-4">
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#0078D7] border-b border-border-custom pb-2 flex items-center justify-between">
                  <span>Clientes Abonados</span>
                  <span className="bg-[#0078D7]/20 text-[#0078D7] px-2 py-0.5 rounded font-mono text-[10px]">{clientsWithServices.length}</span>
                </h4>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {clientsWithServices.map((c) => (
                    <div key={c.id} className="bg-bg-subtle/50 p-3 rounded-lg border border-border-custom space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-xs text-text-primary">{c.razonSocial}</p>
                          <p className="text-[10px] text-text-muted">Día de pago: <span className="font-bold text-[#0078D7]">{c.diaFacturacion} de cada mes</span></p>
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

      {/* Modal 1: Facturar Orden Existente */}
      {isModalOpen && ventaSeleccionada && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-card border border-border-custom rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-border-custom bg-bg-subtle">
              <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#0078D7]" />
                Facturar Orden {ventaSeleccionada.numeroOrden}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-text-muted hover:text-text-primary transition-colors cursor-pointer">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleFacturar} className="p-6 space-y-6">
              
              <div className="bg-bg-subtle p-4 rounded-lg border border-border-custom flex justify-between items-center">
                <div>
                  <p className="text-sm text-text-muted">Cliente</p>
                  <p className="font-bold text-text-primary">{ventaSeleccionada.cliente}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-text-muted">Monto</p>
                  <p className="font-bold text-emerald-500">{ventaSeleccionada.moneda === "USD" ? "US$" : "$"} {ventaSeleccionada.total.toLocaleString("es-AR")}</p>
                </div>
              </div>

              {ventaSeleccionada.tipo === "VENTA_RAPIDA" ? (
                <div className="bg-rose-500/10 p-4 rounded-lg border border-rose-500/20 text-xs text-rose-400 font-medium leading-relaxed">
                  ⚡ Esta orden corresponde a una <strong>Venta Rápida</strong>. Puedes omitir la generación/emisión de la factura tradicional y pasarla directamente al panel de Cobranzas para subir el comprobante de pago mandatorio.
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                    Número de Comprobante / Factura {ventaSeleccionada.tipoFactura}
                  </label>
                  <input
                    type="text"
                    value={formFactura.numeroComprobante}
                    onChange={e => setFormFactura({...formFactura, numeroComprobante: e.target.value})}
                    className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-3 text-text-primary focus:border-[#0078D7] outline-none"
                    placeholder="Ej: 0001-00001234"
                    required
                  />
                </div>
              )}

              {ventaSeleccionada.tipo !== "VENTA_RAPIDA" && (
                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Archivo PDF o Imagen (Opcional)</label>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="application/pdf,image/*" 
                    className="hidden" 
                  />
                  <div 
                    className="border-2 border-dashed border-border-custom hover:border-[#0078D7] rounded-lg p-6 text-center cursor-pointer transition-colors bg-bg-subtle" 
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <UploadCloud className={`w-8 h-8 mx-auto mb-2 ${formFactura.archivoCargado ? 'text-emerald-500' : 'text-text-muted'}`} />
                    <p className="text-sm text-text-muted">
                      {formFactura.archivoCargado 
                        ? `Archivo "${formFactura.archivoNombre}" cargado con éxito` 
                        : "Haga clic para subir la Factura (PDF o Imagen)"}
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Observaciones Internas</label>
                <textarea
                  value={formFactura.observaciones}
                  onChange={e => setFormFactura({...formFactura, observaciones: e.target.value})}
                  className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-3 text-text-primary focus:border-[#0078D7] outline-none min-h-[80px]"
                  placeholder="Anotaciones para el módulo de cobranzas..."
                />
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t border-border-custom">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 rounded-md text-text-secondary hover:bg-bg-subtle border border-border-custom transition-colors cursor-pointer" disabled={loading}>
                  Cancelar
                </button>
                {ventaSeleccionada.tipo === "VENTA_RAPIDA" && (
                  <button type="button" onClick={handleOmitir} className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-md font-bold transition-colors cursor-pointer" disabled={loading}>
                    Omitir Factura
                  </button>
                )}
                {ventaSeleccionada.tipo !== "VENTA_RAPIDA" && (
                  <button type="submit" className="bg-[#0078D7] hover:bg-[#005a9e] text-white px-6 py-2 rounded-md font-medium flex items-center gap-2 transition-colors cursor-pointer" disabled={loading}>
                    <CheckCircle className="w-5 h-5" />
                    {loading ? "Facturando..." : "Facturar y Enviar a Cobranzas"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Emitir Factura Directa / Manual */}
      {isDirectModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-card border border-border-custom rounded-xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-border-custom bg-bg-subtle">
              <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#0078D7]" />
                Emitir Factura Directa Manual
              </h2>
              <button onClick={() => setIsDirectModalOpen(false)} className="text-text-muted hover:text-text-primary transition-colors cursor-pointer">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateDirectInvoiceSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                  Seleccionar Cliente *
                </label>
                <select
                  value={formDirect.clientId}
                  onChange={(e) => setFormDirect({ ...formDirect, clientId: e.target.value })}
                  className="w-full bg-bg-subtle border border-border-custom rounded-lg px-4 py-2.5 text-sm text-text-primary focus:border-[#0078D7] outline-none"
                  required
                >
                  <option value="">-- Seleccione un Cliente --</option>
                  {allClients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.razonSocial} ({c.cuit || c.correo || "Sin CUIT"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                    Tipo de Factura
                  </label>
                  <select
                    value={formDirect.tipoFactura}
                    onChange={(e) => setFormDirect({ ...formDirect, tipoFactura: e.target.value })}
                    className="w-full bg-bg-subtle border border-border-custom rounded-lg px-4 py-2.5 text-sm text-text-primary focus:border-[#0078D7] outline-none"
                  >
                    <option value="A">Factura A</option>
                    <option value="B">Factura B</option>
                    <option value="C">Factura C</option>
                    <option value="E">Factura E (Exportación)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                    Moneda
                  </label>
                  <select
                    value={formDirect.moneda}
                    onChange={(e) => setFormDirect({ ...formDirect, moneda: e.target.value })}
                    className="w-full bg-bg-subtle border border-border-custom rounded-lg px-4 py-2.5 text-sm text-text-primary focus:border-[#0078D7] outline-none"
                  >
                    <option value="ARS">Pesos (ARS)</option>
                    <option value="USD">Dólares (USD)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                  Descripción del Servicio o Producto
                </label>
                <input
                  type="text"
                  value={formDirect.descripcionItem}
                  onChange={(e) => setFormDirect({ ...formDirect, descripcionItem: e.target.value })}
                  className="w-full bg-bg-subtle border border-border-custom rounded-lg px-4 py-2.5 text-sm text-text-primary focus:border-[#0078D7] outline-none"
                  placeholder="Ej: Abono de Servicio Mensual Starlink"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                  Monto Total A Facturar *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formDirect.montoTotal}
                  onChange={(e) => setFormDirect({ ...formDirect, montoTotal: Number(e.target.value) })}
                  className="w-full bg-bg-subtle border border-border-custom rounded-lg px-4 py-2.5 text-sm font-mono text-emerald-400 font-bold focus:border-[#0078D7] outline-none"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                  Comprobante PDF / Imagen (Opcional)
                </label>
                <input
                  type="file"
                  ref={directFileInputRef}
                  onChange={handleDirectFileChange}
                  accept="application/pdf,image/*"
                  className="hidden"
                />
                <div
                  onClick={() => directFileInputRef.current?.click()}
                  className="border-2 border-dashed border-border-custom hover:border-[#0078D7] rounded-lg p-4 text-center cursor-pointer transition-colors bg-bg-subtle"
                >
                  <UploadCloud className={`w-6 h-6 mx-auto mb-1 ${formDirect.archivoCargado ? "text-emerald-500" : "text-text-muted"}`} />
                  <p className="text-xs text-text-muted">
                    {formDirect.archivoCargado
                      ? `Adjunto "${formDirect.archivoNombre}" listo`
                      : "Haz clic para adjuntar comprobante en PDF o Imagen"}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                  Observaciones
                </label>
                <textarea
                  value={formDirect.observaciones}
                  onChange={(e) => setFormDirect({ ...formDirect, observaciones: e.target.value })}
                  className="w-full bg-bg-subtle border border-border-custom rounded-lg px-4 py-2 text-sm text-text-primary focus:border-[#0078D7] outline-none min-h-[60px]"
                  placeholder="Anotaciones adicionales..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border-custom">
                <button
                  type="button"
                  onClick={() => setIsDirectModalOpen(false)}
                  className="px-5 py-2 rounded-lg text-text-secondary hover:bg-bg-subtle border border-border-custom text-xs font-bold cursor-pointer"
                  disabled={loading}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="bg-[#0078D7] hover:bg-[#005a9e] text-white px-5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                  disabled={loading}
                >
                  <CheckCircle className="w-4 h-4" />
                  {loading ? "Emitiendo..." : "Emitir Factura y Enviar a Cobranzas"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Cálculo y Suba Masiva de Tarifas */}
      {isPriceIncreaseModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-bg-card border border-border-custom rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-border-custom bg-bg-subtle">
              <div>
                <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-purple-400" />
                  Cálculo y Suba Masiva de Tarifas / Abonos
                </h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Simula y aplica aumentos porcentuales o fijos en los abonos mensuales de tus clientes en tiempo real.
                </p>
              </div>
              <button onClick={() => setIsPriceIncreaseModalOpen(false)} className="text-text-muted hover:text-text-primary transition-colors cursor-pointer">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleApplyMassIncrease} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 space-y-6 overflow-y-auto">
                {/* Panel de Controles de Aumento */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-bg-subtle/60 p-4 rounded-xl border border-border-custom">
                  <div>
                    <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Percent className="w-3.5 h-3.5 text-purple-400" />
                      Aumento Porcentual (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={porcentajeSuba || ""}
                      onChange={(e) => setPorcentajeSuba(Number(e.target.value))}
                      className="w-full bg-bg-card border border-border-custom rounded-lg px-3 py-2 text-sm text-text-primary font-mono font-bold focus:border-purple-500 outline-none"
                      placeholder="Ej: 15.5"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                      Monto Fijo Adicional ($)
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={montoFijoSuba || ""}
                      onChange={(e) => setMontoFijoSuba(Number(e.target.value))}
                      className="w-full bg-bg-card border border-border-custom rounded-lg px-3 py-2 text-sm text-text-primary font-mono font-bold focus:border-purple-500 outline-none"
                      placeholder="Ej: 5000"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                      Filtrar Moneda
                    </label>
                    <select
                      value={monedaFiltroSuba}
                      onChange={(e) => setMonedaFiltroSuba(e.target.value)}
                      className="w-full bg-bg-card border border-border-custom rounded-lg px-3 py-2 text-sm text-text-primary focus:border-purple-500 outline-none"
                    >
                      <option value="TODAS">Todas las Monedas</option>
                      <option value="ARS font-mono">ARS ($)</option>
                      <option value="USD">USD (US$)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                      Filtrar Categoría
                    </label>
                    <select
                      value={categoriaFiltroSuba}
                      onChange={(e) => setCategoriaFiltroSuba(e.target.value)}
                      className="w-full bg-bg-card border border-border-custom rounded-lg px-3 py-2 text-sm text-text-primary focus:border-purple-500 outline-none"
                    >
                      <option value="TODAS">Todas las Categorías</option>
                      <option value="INTERNET">Internet</option>
                      <option value="CONECTIVIDAD">Conectividad</option>
                      <option value="MANTENIMIENTO">Mantenimiento</option>
                      <option value="ABONO">Abono General</option>
                      <option value="OTRO">Otro</option>
                    </select>
                  </div>
                </div>

                {/* KPI Resumen Calculado */}
                {(() => {
                  const filteredServices = allServicesForIncrease.filter((s) => {
                    if (monedaFiltroSuba !== "TODAS" && s.moneda !== monedaFiltroSuba) return false;
                    if (categoriaFiltroSuba !== "TODAS" && s.categoria !== categoriaFiltroSuba) return false;
                    return true;
                  });

                  const totalActual = filteredServices.reduce((acc, s) => acc + (s.montoMensual || 0), 0);
                  const totalNuevo = filteredServices.reduce((acc, s) => {
                    const base = s.montoMensual || 0;
                    const incPercent = porcentajeSuba > 0 ? base * (porcentajeSuba / 100) : 0;
                    const incFix = montoFijoSuba > 0 ? montoFijoSuba : 0;
                    return acc + (base + incPercent + incFix);
                  }, 0);
                  const diferencia = totalNuevo - totalActual;

                  return (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-purple-950/20 border border-purple-500/30 p-4 rounded-xl">
                        <div>
                          <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Abonos Afectados</p>
                          <p className="text-xl font-black text-purple-300 font-mono">{filteredServices.length} servicios</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Incremento Total Estimado</p>
                          <p className="text-xl font-black text-emerald-400 font-mono">+ $ {diferencia.toLocaleString("es-AR")}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Nuevo Total Mensual Proyectado</p>
                          <p className="text-xl font-black text-white font-mono">$ {totalNuevo.toLocaleString("es-AR")}</p>
                        </div>
                      </div>

                      {/* Tabla de Previsualización */}
                      <div className="border border-border-custom rounded-xl overflow-hidden shadow-sm">
                        <div className="bg-bg-subtle px-4 py-3 border-b border-border-custom font-bold text-xs uppercase tracking-wider text-text-muted flex justify-between items-center">
                          <span>Vista Previa de Precios Individuales</span>
                          <span className="text-[10px] text-purple-400">Total: {filteredServices.length} registros</span>
                        </div>
                        <div className="max-h-[250px] overflow-y-auto divide-y divide-border-custom/50">
                          {loadingIncrease ? (
                            <div className="p-8 text-center text-text-muted text-xs">Cargando abonos del sistema...</div>
                          ) : filteredServices.length === 0 ? (
                            <div className="p-8 text-center text-text-muted text-xs">No hay abonos que coincidan con los filtros seleccionados.</div>
                          ) : (
                            <table className="w-full text-left border-collapse text-xs">
                              <thead className="bg-bg-subtle/50 text-text-muted sticky top-0 font-bold uppercase tracking-wider">
                                <tr>
                                  <th className="py-2.5 px-4">Cliente</th>
                                  <th className="py-2.5 px-4">Servicio / Categoría</th>
                                  <th className="py-2.5 px-4 text-right">Precio Actual</th>
                                  <th className="py-2.5 px-4 text-right">Aumento</th>
                                  <th className="py-2.5 px-4 text-right">Nuevo Precio</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border-custom/40">
                                {filteredServices.map((s) => {
                                  const base = s.montoMensual || 0;
                                  const incPercent = porcentajeSuba > 0 ? base * (porcentajeSuba / 100) : 0;
                                  const incFix = montoFijoSuba > 0 ? montoFijoSuba : 0;
                                  const incTotal = incPercent + incFix;
                                  const nuevo = base + incTotal;
                                  return (
                                    <tr key={s.id} className="hover:bg-bg-subtle/50 transition-colors">
                                      <td className="py-2.5 px-4 font-bold text-text-primary">
                                        {s.client?.razonSocial || "Cliente General"}
                                      </td>
                                      <td className="py-2.5 px-4 text-text-secondary">
                                        <span className="font-semibold text-text-primary">{s.nombreService || s.tipo}</span>
                                        <span className="ml-2 text-[10px] text-text-muted bg-bg-subtle px-1.5 py-0.5 rounded border border-border-custom font-mono">{s.categoria}</span>
                                      </td>
                                      <td className="py-2.5 px-4 text-right font-mono font-bold text-text-secondary">
                                        {s.moneda === "USD" ? "US$" : "$"} {base.toLocaleString("es-AR")}
                                      </td>
                                      <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-400">
                                        + {s.moneda === "USD" ? "US$" : "$"} {incTotal.toLocaleString("es-AR")}
                                      </td>
                                      <td className="py-2.5 px-4 text-right font-mono font-black text-purple-300">
                                        {s.moneda === "USD" ? "US$" : "$"} {nuevo.toLocaleString("es-AR")}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="flex justify-end gap-3 p-4 border-t border-border-custom bg-bg-subtle">
                <button
                  type="button"
                  onClick={() => setIsPriceIncreaseModalOpen(false)}
                  className="px-5 py-2 rounded-lg text-text-secondary hover:bg-bg-card border border-border-custom text-xs font-bold cursor-pointer"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || (porcentajeSuba <= 0 && montoFijoSuba <= 0)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg disabled:opacity-50"
                >
                  <TrendingUp className="w-4 h-4" />
                  {loading ? "Aplicando Aumento..." : "Confirmar y Aplicar Suba Masiva"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Facturación Masiva de Abonos del Mes */}
      {isBatchInvoiceModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-bg-card border border-border-custom rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-border-custom bg-bg-subtle">
              <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                <Zap className="w-6 h-6 text-amber-500" />
                Facturación Masiva de Abonos Mensuales
              </h2>
              <button onClick={() => setIsBatchInvoiceModalOpen(false)} className="text-text-muted hover:text-text-primary transition-colors cursor-pointer">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl text-amber-300 text-xs leading-relaxed space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-amber-400">
                  <Activity className="w-4 h-4" /> Emisión Masiva Automatizada de Abonos
                </p>
                <p>
                  Esta herramienta genera automáticamente las ordenes de venta y facturas para todos los clientes que poseen abonos de servicios mensuales activos en el período seleccionado.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                  Período a Facturar (Año-Mes)
                </label>
                <input
                  type="month"
                  value={periodoFacturacion}
                  onChange={(e) => setPeriodoFacturacion(e.target.value)}
                  className="w-full bg-bg-subtle border border-border-custom rounded-lg px-4 py-3 text-text-primary font-mono font-bold text-sm focus:border-amber-500 outline-none"
                  required
                />
              </div>

              <div className="bg-bg-subtle p-4 rounded-xl border border-border-custom space-y-2 text-xs">
                <div className="flex justify-between text-text-muted">
                  <span>Clientes Abonados Registrados:</span>
                  <span className="font-bold text-text-primary font-mono">{clientsWithServices.length} clientes</span>
                </div>
                <div className="flex justify-between text-text-muted">
                  <span>Detección de duplicados:</span>
                  <span className="font-bold text-emerald-400">Protección Activa</span>
                </div>
                <p className="text-[11px] text-text-muted italic border-t border-border-custom/60 pt-2">
                  * Si un cliente ya fue facturado para el período <strong>{periodoFacturacion}</strong>, el sistema lo omitirá automáticamente para evitar cobros duplicados.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border-custom">
                <button
                  type="button"
                  onClick={() => setIsBatchInvoiceModalOpen(false)}
                  className="px-5 py-2 rounded-lg text-text-secondary hover:bg-bg-subtle border border-border-custom text-xs font-bold cursor-pointer"
                  disabled={isGeneratingBatch}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleConfirmBatchBilling}
                  disabled={isGeneratingBatch}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg disabled:opacity-50"
                >
                  <Zap className={`w-4 h-4 ${isGeneratingBatch ? "animate-spin" : ""}`} />
                  {isGeneratingBatch ? "Generando Facturas..." : "Iniciar Facturación Masiva"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
