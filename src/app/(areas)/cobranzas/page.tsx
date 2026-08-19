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
  Calendar 
} from "lucide-react";
import { getInvoicesWithPayments, registerPayment, getClientsWithServices } from "@/actions/billing";

export default function CobranzasDashboard() {
  const [activeTab, setActiveTab] = useState("pendientes");
  const [busqueda, setBusqueda] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cobroSeleccionado, setCobroSeleccionado] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [clientsWithServices, setClientsWithServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formCobro, setFormCobro] = useState({
    metodoPago: "Transferencia",
    fechaPago: new Date().toISOString().split('T')[0],
    comprobanteCargado: false,
    comprobanteNombre: "",
    comprobanteBase64: "",
    observaciones: ""
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

  // Filtrar facturas pendientes (sin pagos) y pagadas (con pagos)
  const facturasPendientes = invoices
    .filter(inv => inv.payments.length === 0)
    .map(inv => {
      const fechaFactura = new Date(inv.fecha);
      const vencimiento = new Date(fechaFactura);
      vencimiento.setDate(vencimiento.getDate() + 15);
      
      const hoy = new Date();
      const diffTime = hoy.getTime() - vencimiento.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const diasVencidos = diffDays > 0 ? diffDays : 0;

      return {
        id: inv.id,
        saleId: inv.saleId,
        numeroOrden: inv.sale?.numeroOrden || "ORD-???",
        cliente: inv.sale?.client?.razonSocial || "Cliente Desconocido",
        total: inv.sale?.total || 0,
        moneda: inv.sale?.moneda || "ARS",
        fechaFactura: fechaFactura.toLocaleDateString(),
        vencimiento: vencimiento.toLocaleDateString(),
        diasVencidos,
        tipoVenta: inv.sale?.tipo || "STANDARD"
      };
    });

  const pagosCompletados = invoices
    .filter(inv => inv.payments.length > 0)
    .map(inv => {
      const payment = inv.payments[0];
      return {
        id: inv.id,
        numeroOrden: inv.sale?.numeroOrden || "ORD-???",
        cliente: inv.sale?.client?.razonSocial || "Cliente Desconocido",
        total: inv.sale?.total || 0,
        moneda: inv.sale?.moneda || "ARS",
        fechaPago: new Date(payment.fechaPago).toLocaleDateString(),
        metodo: "Registrado",
      };
    });

  const facturasFiltradas = facturasPendientes.filter(f => 
    f.cliente.toLowerCase().includes(busqueda.toLowerCase()) || 
    f.numeroOrden.toLowerCase().includes(busqueda.toLowerCase())
  );

  const pagosFiltrados = pagosCompletados.filter(p => 
    p.cliente.toLowerCase().includes(busqueda.toLowerCase()) || 
    p.numeroOrden.toLowerCase().includes(busqueda.toLowerCase())
  );

  const abrirModal = (factura: any) => {
    setCobroSeleccionado(factura);
    setFormCobro({ 
      metodoPago: "Transferencia", 
      fechaPago: new Date().toISOString().split('T')[0], 
      comprobanteCargado: false, 
      comprobanteNombre: "",
      comprobanteBase64: "",
      observaciones: "" 
    });
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setFormCobro({
          ...formCobro,
          comprobanteCargado: true,
          comprobanteNombre: file.name,
          comprobanteBase64: reader.result as string,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCobrar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cobroSeleccionado?.tipoVenta === "VENTA_RAPIDA" && !formCobro.comprobanteCargado) {
      alert("Comprobante de pago obligatorio: Para registrar una Venta Rápida, es obligatorio adjuntar el comprobante o ticket de pago.");
      return;
    }
    setLoading(true);
    const res = await registerPayment({
      invoiceId: cobroSeleccionado.id,
      metodoPago: formCobro.metodoPago,
      comprobanteUrl: formCobro.comprobanteCargado ? formCobro.comprobanteBase64 : undefined,
    });
    setLoading(false);
    if (res.success) {
      alert(`El pago de la factura asociada a ${cobroSeleccionado.numeroOrden} fue registrado con éxito.`);
      setIsModalOpen(false);
      loadData();
    } else {
      alert("Error al registrar pago: " + res.error);
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
    const dayNum = date.getDate();
    return clientsWithServices.filter(c => c.diaFacturacion === dayNum);
  };

  if (loading && invoices.length === 0 && clientsWithServices.length === 0) {
    return (
      <div className="p-8 text-center text-text-muted">
        Cargando registros de cobranzas...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-wide flex items-center gap-3 mb-2">
            <DollarSign className="text-emerald-500 w-8 h-8" />
            E. Cobranzas
          </h1>
          <p className="text-text-muted">Controle las cuentas por cobrar y registre los pagos ingresados.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-custom mb-6">
        <button 
          onClick={() => setActiveTab("pendientes")}
          className={`px-6 py-3 font-semibold text-sm tracking-wider uppercase transition-colors flex items-center gap-2 cursor-pointer ${activeTab === 'pendientes' ? 'text-emerald-500 border-b-2 border-emerald-500' : 'text-text-muted hover:text-text-primary'}`}
        >
          Pendientes de Cobro <span className="bg-bg-subtle text-text-muted text-xs px-2 py-0.5 rounded-full font-mono border border-border-custom">{facturasPendientes.length}</span>
        </button>
        <button 
          onClick={() => setActiveTab("completados")}
          className={`px-6 py-3 font-semibold text-sm tracking-wider uppercase transition-colors cursor-pointer ${activeTab === 'completados' ? 'text-emerald-500 border-b-2 border-emerald-500' : 'text-text-muted hover:text-text-primary'}`}
        >
          Pagos Completados
        </button>
        <button 
          onClick={() => setActiveTab("calendario")}
          className={`px-6 py-3 font-semibold text-sm tracking-wider uppercase transition-colors flex items-center gap-2 cursor-pointer ${activeTab === 'calendario' ? 'text-emerald-500 border-b-2 border-emerald-500' : 'text-text-muted hover:text-text-primary'}`}
        >
          <Calendar className="w-4 h-4" />
          Calendario Clientes
        </button>
      </div>

      {activeTab !== "calendario" ? (
        <div className="bg-bg-card rounded-xl border border-border-custom shadow-xl overflow-hidden animate-in fade-in duration-200">
          {/* Barra de Búsqueda */}
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

          {/* Listado */}
          <div className="divide-y divide-border-custom">
            
            {/* TAB PENDIENTES */}
            {activeTab === "pendientes" && (
              facturasFiltradas.length > 0 ? (
                facturasFiltradas.map((factura) => (
                  <div key={factura.id} className="p-6 hover:bg-bg-subtle transition-colors flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex-1 flex items-center gap-4">
                      <div className={`p-3 rounded-lg border ${factura.diasVencidos > 0 ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-amber-500/10 border-amber-500/30 text-amber-500'}`}>
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold text-text-primary tracking-wide">{factura.cliente}</h3>
                          <span className="text-xs bg-bg-subtle text-text-muted px-2 py-0.5 rounded font-mono border border-border-custom">{factura.numeroOrden}</span>
                        </div>
                        <p className="text-sm text-text-muted flex items-center gap-2">
                          Fecha Factura: {factura.fechaFactura} | Vencimiento: {factura.vencimiento} 
                          {factura.diasVencidos > 0 && (
                            <span className="text-red-500 font-semibold bg-red-500/10 px-2 py-0.5 rounded">¡Atrasado {factura.diasVencidos} días!</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">Monto Deuda</p>
                        <p className="text-2xl font-bold text-emerald-500">{factura.moneda === "USD" ? "US$" : "$"} {factura.total.toLocaleString()}</p>
                      </div>
                      <button 
                        onClick={() => abrirModal(factura)}
                        className="flex items-center gap-2 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-500 hover:text-white px-5 py-2.5 rounded-md font-medium transition-colors border border-emerald-600/30 hover:border-transparent cursor-pointer"
                      >
                        Registrar Pago
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-text-muted flex flex-col items-center">
                  <CheckCircle className="w-12 h-12 text-emerald-500/50 mb-4" />
                  <p className="text-lg">No hay facturas pendientes de cobro.</p>
                </div>
              )
            )}

            {/* TAB COMPLETADOS */}
            {activeTab === "completados" && (
              pagosFiltrados.length > 0 ? (
                pagosFiltrados.map((pago) => (
                  <div key={pago.id} className="p-6 bg-bg-subtle flex flex-col md:flex-row items-center justify-between gap-6 opacity-70 border-b border-border-custom">
                    <div className="flex-1 flex items-center gap-4">
                      <div className="bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/30 text-emerald-500">
                        <CheckCircle className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold text-text-primary tracking-wide">{pago.cliente}</h3>
                          <span className="text-xs bg-bg-subtle text-text-muted px-2 py-0.5 rounded font-mono border border-border-custom">{pago.numeroOrden}</span>
                        </div>
                        <p className="text-sm text-text-muted">Pagado el: {pago.fechaPago}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-emerald-500/70 uppercase tracking-wider font-semibold">Cobrado</p>
                      <p className="text-2xl font-bold text-emerald-500/70">{pago.moneda === "USD" ? "US$" : "$"} {pago.total.toLocaleString()}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-text-muted flex flex-col items-center">
                  <p className="text-lg">No hay pagos registrados con esta búsqueda.</p>
                </div>
              )
            )}

          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-bg-card p-4 border border-border-custom rounded-xl shadow-md">
            <div>
              <h3 className="font-bold text-sm text-text-primary uppercase tracking-wider">Calendario de Cobros y Recaudación</h3>
              <p className="text-xs text-text-muted mt-0.5">Calendario de vencimiento y abonos de clientes mensuales con servicios.</p>
            </div>
            
            {/* Date switcher */}
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
                            ? "bg-[#10b981]/5 hover:bg-[#10b981]/10" 
                            : "hover:bg-bg-subtle/40" 
                          : "bg-bg-subtle/10 opacity-30 cursor-not-allowed"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span
                          className={`text-xs font-bold font-mono px-1.5 py-0.5 rounded-full ${
                            isToday && day.isCurrentMonth
                              ? "bg-emerald-500 text-white"
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
                            className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-white p-1 rounded text-[10px] font-bold block truncate shadow-sm transition-colors"
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
                <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-500 border-b border-border-custom pb-2">Vencimientos Clientes</h4>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {clientsWithServices.map((c) => (
                    <div key={c.id} className="bg-bg-subtle/50 p-3 rounded-lg border border-border-custom space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-xs text-text-primary">{c.razonSocial}</p>
                          <p className="text-[10px] text-text-muted">Día de cobro: <span className="font-bold text-emerald-500">{c.diaFacturacion} de cada mes</span></p>
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

      {/* Modal para Cargar Pago */}
      {isModalOpen && cobroSeleccionado && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-card border border-border-custom rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-border-custom bg-bg-subtle">
              <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                <Banknote className="w-5 h-5 text-emerald-500" />
                Registrar Pago
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-text-muted hover:text-text-primary transition-colors cursor-pointer">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleCobrar} className="p-6 space-y-6">
              
              <div className="bg-bg-subtle p-4 rounded-lg border border-border-custom flex justify-between items-center">
                <div>
                  <p className="text-sm text-text-muted">Cliente</p>
                  <p className="font-bold text-text-primary">{cobroSeleccionado.cliente}</p>
                  <p className="text-xs font-mono text-text-muted mt-1">{cobroSeleccionado.numeroOrden}</p>
                </div>
                 <div className="text-right">
                  <p className="text-sm text-text-muted">Monto a Cobrar</p>
                  <p className="text-2xl font-bold text-emerald-500">{cobroSeleccionado.moneda === "USD" ? "US$" : "$"} {cobroSeleccionado.total.toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Método de Pago</label>
                  <select
                    value={formCobro.metodoPago}
                    onChange={e => setFormCobro({...formCobro, metodoPago: e.target.value})}
                    className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-3 text-text-primary focus:border-[#0078D7] outline-none appearance-none"
                  >
                    <option value="Transferencia">Transferencia Bancaria</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Cheque">Cheque</option>
                    <option value="MercadoPago">MercadoPago</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Fecha de Pago
                  </label>
                  <input
                    type="date"
                    value={formCobro.fechaPago}
                    onChange={e => setFormCobro({...formCobro, fechaPago: e.target.value})}
                    className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-3 text-text-primary focus:border-[#0078D7] outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                  Comprobante de Pago (PDF o Imagen)
                  {cobroSeleccionado?.tipoVenta === "VENTA_RAPIDA" && (
                    <span className="text-red-400 font-bold ml-1.5 text-[10px] uppercase tracking-wider animate-pulse">(Obligatorio - Venta Rápida)</span>
                  )}
                </label>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="application/pdf,image/*" 
                  className="hidden" 
                />
                <div 
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors bg-bg-subtle ${
                    cobroSeleccionado?.tipoVenta === "VENTA_RAPIDA" && !formCobro.comprobanteCargado
                      ? "border-red-500/50 hover:border-red-500"
                      : "border-border-custom hover:border-emerald-500/50"
                  }`} 
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadCloud className={`w-8 h-8 mx-auto mb-2 ${formCobro.comprobanteCargado ? 'text-emerald-500' : 'text-text-muted'}`} />
                  <p className="text-sm text-text-muted">
                    {formCobro.comprobanteCargado 
                      ? `Archivo "${formCobro.comprobanteNombre}" cargado con éxito` 
                      : "Haga clic para subir Ticket / Comprobante"}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t border-border-custom">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 rounded-md text-text-secondary hover:bg-bg-subtle border border-border-custom transition-colors cursor-pointer" disabled={loading}>
                  Cancelar
                </button>
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-md font-medium flex items-center gap-2 transition-colors cursor-pointer" disabled={loading}>
                  <CheckCircle className="w-5 h-5" />
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
