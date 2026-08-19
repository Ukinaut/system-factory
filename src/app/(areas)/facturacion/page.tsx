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
  Server,
  DollarSign
} from "lucide-react";
import { getPendingInvoices, createInvoice, getClientsWithServices } from "@/actions/billing";

export default function FacturacionDashboard() {
  const [activeSubTab, setActiveSubTab] = useState<"pending" | "calendar">("pending");
  const [busqueda, setBusqueda] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ventaSeleccionada, setVentaSeleccionada] = useState<any>(null);
  const [ventasPendientes, setVentasPendientes] = useState<any[]>([]);
  const [clientsWithServices, setClientsWithServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formFactura, setFormFactura] = useState({
    numeroComprobante: "",
    archivoCargado: false,
    archivoNombre: "",
    archivoBase64: "",
    observaciones: ""
  });

  const loadData = async () => {
    setLoading(true);
    const [pendingRes, clientsRes] = await Promise.all([
      getPendingInvoices(),
      getClientsWithServices()
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

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const ventasFiltradas = ventasPendientes.filter(v => 
    v.cliente.toLowerCase().includes(busqueda.toLowerCase()) || 
    v.numeroOrden.toLowerCase().includes(busqueda.toLowerCase())
  );

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

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const getClientsOnDate = (date: Date, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return [];
    return clientsWithServices.filter((c) => {
      const matchDay = c.diaFacturacion === date.getDate();
      return matchDay;
    });
  };

  if (loading && ventasPendientes.length === 0 && clientsWithServices.length === 0) {
    return (
      <div className="p-8 text-center text-text-muted">
        Cargando módulo de facturación...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-wide flex items-center gap-3 mb-2">
            <Receipt className="text-[#0078D7] w-8 h-8" />
            C. Facturación y Cobro
          </h1>
          <p className="text-text-muted">Gestión de emisión de facturas y control de abonos recurrentes.</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-border-custom gap-2 pb-px overflow-x-auto">
          <button
            onClick={() => setActiveSubTab("pending")}
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeSubTab === "pending"
                ? "border-[#0078D7] text-[#0078D7]"
                : "border-transparent text-text-muted hover:text-text-primary"
            }`}
          >
            Pendientes de Facturación ({ventasPendientes.length})
          </button>
          <button
            onClick={() => setActiveSubTab("calendar")}
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeSubTab === "calendar"
                ? "border-[#0078D7] text-[#0078D7]"
                : "border-transparent text-text-muted hover:text-text-primary"
            }`}
          >
            Calendario de Facturación
          </button>
        </div>
      </div>

      {activeSubTab === "pending" && (
        <div className="bg-bg-card rounded-xl border border-border-custom shadow-xl overflow-hidden animate-in fade-in duration-200">
          <div className="p-6 border-b border-border-custom bg-bg-subtle flex gap-4">
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-3 top-3.5 text-gray-500" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full bg-bg-card border border-border-custom rounded-md pl-10 pr-4 py-3 text-text-primary focus:border-[#0078D7] outline-none transition-colors"
                placeholder="Buscar por Cliente o N° de Orden..."
              />
            </div>
          </div>

          <div className="divide-y divide-border-custom">
            {ventasFiltradas.length > 0 ? (
              ventasFiltradas.map((venta) => (
                <div key={venta.id} className="p-6 hover:bg-bg-subtle transition-colors flex flex-col md:flex-row items-center justify-between gap-6">
                  
                  <div className="flex-1 flex items-center gap-4">
                    <div className="bg-amber-500/10 p-3 rounded-lg border border-amber-500/30">
                      <Clock className="w-6 h-6 text-amber-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-text-primary tracking-wide">{venta.cliente}</h3>
                        <span className="text-xs bg-bg-subtle text-text-muted px-2 py-0.5 rounded font-mono border border-border-custom">{venta.numeroOrden}</span>
                      </div>
                      <p className="text-sm text-text-muted">
                        Tipo:{" "}
                        <span className={venta.tipo === "VENTA_RAPIDA" ? "text-rose-400 font-bold uppercase tracking-wider" : "text-text-primary font-medium"}>
                          {venta.tipo === "VENTA_RAPIDA" ? "⚡ Venta Rápida" : venta.tipo}
                        </span>{" "}
                        | Factura solicitada: <strong className="text-text-primary">"{venta.tipoFactura}"</strong> | Fecha: {venta.fecha}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">Total a Facturar</p>
                      <p className="text-2xl font-bold text-emerald-500">{venta.moneda === "USD" ? "US$" : "$"} {venta.total.toLocaleString()}</p>
                    </div>
                    <button 
                      onClick={() => abrirModal(venta)}
                      className="flex items-center gap-2 bg-[#0078D7]/10 hover:bg-[#0078D7] text-[#0078D7] hover:text-white px-5 py-2.5 rounded-md font-medium transition-colors border border-[#0078D7]/30 hover:border-transparent cursor-pointer"
                    >
                      Adjuntar Factura
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                </div>
              ))
            ) : (
              <div className="p-12 text-center text-text-muted flex flex-col items-center">
                <CheckCircle className="w-12 h-12 text-emerald-500/50 mb-4" />
                <p className="text-lg">No hay ventas pendientes de facturación.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeSubTab === "calendar" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-bg-card p-4 border border-border-custom rounded-xl shadow-md">
            <div>
              <h3 className="font-bold text-sm text-text-primary uppercase tracking-wider">Abonos y Facturaciones Recurrentes</h3>
              <p className="text-xs text-text-muted mt-0.5">Calendario de facturación mensual para clientes con servicios activos.</p>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={prevMonth}
                className="p-2 border border-border-custom rounded bg-bg-subtle hover:bg-bg-card transition-colors cursor-pointer text-text-muted hover:text-text-primary"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-base font-bold text-text-primary capitalize tracking-wide w-48 text-center">
                {currentDate.toLocaleDateString([], { month: "long", year: "numeric" })}
              </h2>
              <button
                onClick={nextMonth}
                className="p-2 border border-border-custom rounded bg-bg-subtle hover:bg-bg-card transition-colors cursor-pointer text-text-muted hover:text-text-primary"
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
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#0078D7] border-b border-border-custom pb-2">Clientes Mensuales Activos</h4>
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
                  <p className="font-bold text-emerald-500">{ventaSeleccionada.moneda === "USD" ? "US$" : "$"} {ventaSeleccionada.total.toLocaleString()}</p>
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
    </div>
  );
}
