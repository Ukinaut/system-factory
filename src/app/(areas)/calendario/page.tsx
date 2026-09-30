"use client";

import { useState, useEffect } from "react";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  Trash2, 
  Users, 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  AlertCircle,
  Search,
  Building2,
  Ship,
  Edit3,
  CalendarDays,
  ListFilter,
  CheckCircle2,
  Sparkles,
  Layers
} from "lucide-react";
import { getCalendarEvents, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from "@/actions/calendar";
import { getClients } from "@/actions/clients";
import { getCurrentUserSession } from "@/actions/users";

export default function CalendarioPage() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  
  // Filters & Views State
  const [viewMode, setViewMode] = useState<"MES" | "SEMANA" | "AGENDA">("MES");
  const [scopeFilter, setScopeFilter] = useState<"ALL" | "GLOBAL" | "INDIVIDUAL">("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date());

  // Modals & Selection State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState<{ date: Date; events: any[] } | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Form State
  const [formEvent, setFormEvent] = useState({
    title: "",
    description: "",
    start: new Date().toISOString().slice(0, 16),
    type: "ACTIVIDAD", // ACTIVIDAD, REUNION, ALERTA_CONTRATO, CAMBIO_SERVICIO
    scope: "INDIVIDUAL", // INDIVIDUAL, GLOBAL
    clientId: ""
  });

  const loadData = async () => {
    setLoading(true);
    const [eventsRes, clientsRes] = await Promise.all([
      getCalendarEvents(),
      getClients()
    ]);
    if (eventsRes.success && eventsRes.events) {
      setEvents(eventsRes.events);
    }
    if (clientsRes.success && clientsRes.clients) {
      setClients(clientsRes.clients);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();

    const fetchSession = async () => {
      const res = await getCurrentUserSession();
      if (res.success && res.session) {
        setCurrentUserId(res.session.id);
      }
    };
    fetchSession();
  }, []);

  const openNewEventModal = (initialDate?: Date) => {
    setEditingEventId(null);
    const dateStr = initialDate ? new Date(initialDate.getTime() - (initialDate.getTimezoneOffset() * 60000)).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16);
    setFormEvent({
      title: "",
      description: "",
      start: dateStr,
      type: "ACTIVIDAD",
      scope: "INDIVIDUAL",
      clientId: ""
    });
    setIsModalOpen(true);
  };

  const openEditEventModal = (event: any) => {
    if (event.isSystem) {
      alert("Los eventos automáticos del sistema (facturaciones / importaciones) se generan dinámicamente y no pueden ser editados manualmente.");
      return;
    }
    setEditingEventId(event.id);
    const dateStr = new Date(new Date(event.start).getTime() - (new Date(event.start).getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    setFormEvent({
      title: event.title || "",
      description: event.description || "",
      start: dateStr,
      type: event.type || "ACTIVIDAD",
      scope: event.scope || "INDIVIDUAL",
      clientId: event.clientId || ""
    });
    setIsModalOpen(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let res: any;
    if (editingEventId) {
      res = await updateCalendarEvent(editingEventId, {
        title: formEvent.title,
        description: formEvent.description,
        start: new Date(formEvent.start),
        type: formEvent.type,
        scope: formEvent.scope,
        clientId: formEvent.clientId || undefined
      });
    } else {
      res = await createCalendarEvent({
        title: formEvent.title,
        description: formEvent.description,
        start: new Date(formEvent.start),
        type: formEvent.type,
        scope: formEvent.scope,
        clientId: formEvent.clientId || undefined
      });
    }
    setLoading(false);

    if (res.success) {
      alert(editingEventId ? "Evento actualizado con éxito." : "Evento creado con éxito.");
      setIsModalOpen(false);
      loadData();
    } else {
      alert("Error al guardar evento: " + res.error);
    }
  };

  const handleDeleteEvent = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm("¿Está seguro de que desea eliminar este evento?")) return;
    setLoading(true);
    const res = await deleteCalendarEvent(id);
    setLoading(false);
    if (res.success) {
      alert("Evento eliminado.");
      if (selectedDayEvents) {
        setSelectedDayEvents(prev => prev ? { ...prev, events: prev.events.filter(ev => ev.id !== id) } : null);
      }
      loadData();
    } else {
      alert("Error al eliminar: " + res.error);
    }
  };

  // Calendar Math Helpers (Month)
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

  // Week Days Math Helper
  const getWeekDays = () => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day; // Adjust for Sunday start
    startOfWeek.setDate(diff);

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      return d;
    });
  };

  const prevPeriod = () => {
    if (viewMode === "MES") {
      setCurrentDate(new Date(year, month - 1, 1));
    } else if (viewMode === "SEMANA") {
      const newD = new Date(currentDate);
      newD.setDate(newD.getDate() - 7);
      setCurrentDate(newD);
    }
  };

  const nextPeriod = () => {
    if (viewMode === "MES") {
      setCurrentDate(new Date(year, month + 1, 1));
    } else if (viewMode === "SEMANA") {
      const newD = new Date(currentDate);
      newD.setDate(newD.getDate() + 7);
      setCurrentDate(newD);
    }
  };

  // Filter events
  const getFilteredEvents = () => {
    return events.filter(e => {
      const matchesScope = scopeFilter === "ALL" || e.scope === scopeFilter;
      const matchesType = typeFilter === "ALL" || e.type === typeFilter;
      const matchesSearch = !searchTerm || 
        e.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (e.description && e.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (e.client && e.client.razonSocial.toLowerCase().includes(searchTerm.toLowerCase()));
      
      return matchesScope && matchesType && matchesSearch;
    });
  };

  const filteredEventsList = getFilteredEvents();

  const getEventsOnDate = (date: Date) => {
    return filteredEventsList.filter(e => {
      const eventDate = new Date(e.start);
      return eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear();
    });
  };

  const getTypeStyle = (type: string) => {
    switch (type) {
      case "REUNION":
        return "bg-purple-500/10 text-purple-400 border border-purple-500/30";
      case "ALERTA_CONTRATO":
        return "bg-amber-500/10 text-amber-400 border border-amber-500/30";
      case "CAMBIO_SERVICIO":
        return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30";
      case "FACTURACION_AUTOMATICA":
        return "bg-sky-500/10 text-sky-400 border border-sky-500/30 font-bold";
      case "IMPORTACION":
        return "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-bold";
      default:
        return "bg-blue-500/10 text-blue-400 border border-blue-500/30";
    }
  };

  const getTypeBadgeLabel = (type: string) => {
    switch (type) {
      case "REUNION": return "Reunión";
      case "ALERTA_CONTRATO": return "Alerta Contrato";
      case "CAMBIO_SERVICIO": return "Cambio Servicio";
      case "FACTURACION_AUTOMATICA": return "Facturación Programada";
      case "IMPORTACION": return "Arribo Importación";
      default: return "Actividad";
    }
  };

  const getTypeColorDot = (type: string) => {
    switch (type) {
      case "REUNION": return "bg-purple-500";
      case "ALERTA_CONTRATO": return "bg-amber-500";
      case "CAMBIO_SERVICIO": return "bg-emerald-500";
      case "FACTURACION_AUTOMATICA": return "bg-sky-500";
      case "IMPORTACION": return "bg-cyan-500";
      default: return "bg-blue-500";
    }
  };

  // KPIs
  const totalEventsThisMonth = filteredEventsList.filter(e => new Date(e.start).getMonth() === month && new Date(e.start).getFullYear() === year).length;
  const reunionesCount = filteredEventsList.filter(e => e.type === "REUNION").length;
  const alertasCount = filteredEventsList.filter(e => e.type === "ALERTA_CONTRATO" || e.type === "FACTURACION_AUTOMATICA").length;
  const importacionesCount = filteredEventsList.filter(e => e.type === "IMPORTACION").length;

  return (
    <div className="w-full pb-12 px-2 md:px-4">
      
      {/* Header General */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-wide flex items-center gap-3">
            <CalendarIcon className="text-[#0078D7] w-8 h-8" />
            Agenda & Operaciones de Calendario
          </h1>
          <p className="text-text-muted mt-1 text-sm">Centro inteligente de reuniones, compromisos, vencimientos de contrato y facturaciones automáticas.</p>
        </div>

        <button
          onClick={() => openNewEventModal()}
          className="bg-[#0078D7] hover:bg-[#005a9e] text-white px-5 py-2.5 rounded-lg font-bold transition-all shadow-lg hover:shadow-xl flex items-center gap-2 cursor-pointer text-sm"
        >
          <Plus className="w-5 h-5" />
          Nuevo Evento
        </button>
      </div>

      {/* KPI Cards Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-bg-card border border-border-custom p-3.5 rounded-xl shadow-md flex items-center justify-between">
          <div>
            <p className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Eventos este Mes</p>
            <p className="text-2xl font-extrabold text-text-primary mt-0.5">{totalEventsThisMonth}</p>
          </div>
          <CalendarDays className="w-7 h-7 text-[#0078D7] opacity-80" />
        </div>
        <div className="bg-bg-card border border-border-custom p-3.5 rounded-xl shadow-md flex items-center justify-between">
          <div>
            <p className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Reuniones Programadas</p>
            <p className="text-2xl font-extrabold text-purple-400 mt-0.5">{reunionesCount}</p>
          </div>
          <Users className="w-7 h-7 text-purple-500 opacity-80" />
        </div>
        <div className="bg-bg-card border border-border-custom p-3.5 rounded-xl shadow-md flex items-center justify-between">
          <div>
            <p className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Alertas y Facturación</p>
            <p className="text-2xl font-extrabold text-amber-400 mt-0.5">{alertasCount}</p>
          </div>
          <AlertCircle className="w-7 h-7 text-amber-500 opacity-80" />
        </div>
        <div className="bg-bg-card border border-border-custom p-3.5 rounded-xl shadow-md flex items-center justify-between">
          <div>
            <p className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Arribos Importación</p>
            <p className="text-2xl font-extrabold text-cyan-400 mt-0.5">{importacionesCount}</p>
          </div>
          <Ship className="w-7 h-7 text-cyan-500 opacity-80" />
        </div>
      </div>

      {/* Toolbar filters & View switcher */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 bg-bg-card p-4 border border-border-custom rounded-xl mb-6 shadow-md">
        
        {/* Cambiador de Vista: Mes / Semana / Agenda */}
        <div className="flex items-center gap-1 bg-bg-subtle p-1 rounded-lg border border-border-custom">
          <button
            onClick={() => setViewMode("MES")}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
              viewMode === "MES" ? "bg-[#0078D7] text-white shadow" : "text-text-muted hover:text-text-primary"
            }`}
          >
            Vista Mes
          </button>
          <button
            onClick={() => setViewMode("SEMANA")}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
              viewMode === "SEMANA" ? "bg-[#0078D7] text-white shadow" : "text-text-muted hover:text-text-primary"
            }`}
          >
            Vista Semana
          </button>
          <button
            onClick={() => setViewMode("AGENDA")}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
              viewMode === "AGENDA" ? "bg-[#0078D7] text-white shadow" : "text-text-muted hover:text-text-primary"
            }`}
          >
            Vista Lista / Agenda
          </button>
        </div>

        {/* Filtros por Categoría / Alcance */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={scopeFilter}
            onChange={(e: any) => setScopeFilter(e.target.value)}
            className="bg-bg-subtle border border-border-custom rounded-md px-3 py-1.5 text-xs text-text-primary outline-none focus:border-[#0078D7]"
          >
            <option value="ALL">Alcance: Todos</option>
            <option value="GLOBAL">Alcance: Globales</option>
            <option value="INDIVIDUAL">Alcance: Privados</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-bg-subtle border border-border-custom rounded-md px-3 py-1.5 text-xs text-text-primary outline-none focus:border-[#0078D7]"
          >
            <option value="ALL">Tipo: Todos</option>
            <option value="ACTIVIDAD">Actividad Común</option>
            <option value="REUNION">Reunión de Equipo</option>
            <option value="ALERTA_CONTRATO">Alerta Contrato</option>
            <option value="CAMBIO_SERVICIO">Cambio Servicio</option>
            <option value="FACTURACION_AUTOMATICA">Facturación Programada</option>
            <option value="IMPORTACION">Arribo Importación</option>
          </select>

          <div className="relative flex-1 md:w-52">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-bg-subtle border border-border-custom rounded-md pl-8 pr-3 py-1.5 text-xs text-text-primary outline-none focus:border-[#0078D7] w-full"
              placeholder="Buscar evento..."
            />
          </div>
        </div>

        {/* Control de Navegación de Fecha */}
        {viewMode !== "AGENDA" && (
          <div className="flex items-center justify-between lg:justify-end gap-3 border-t lg:border-t-0 pt-3 lg:pt-0 border-border-custom">
            <button
              onClick={prevPeriod}
              className="p-1.5 border border-border-custom rounded-md bg-bg-subtle hover:bg-bg-card transition-colors cursor-pointer text-text-muted hover:text-text-primary"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="text-sm font-bold text-text-primary capitalize tracking-wide w-40 text-center">
              {viewMode === "MES" 
                ? currentDate.toLocaleDateString("es-AR", { month: "long", year: "numeric" })
                : `Semana ${currentDate.toLocaleDateString("es-AR", { month: "short", day: "numeric" })}`
              }
            </h2>
            <button
              onClick={nextPeriod}
              className="p-1.5 border border-border-custom rounded-md bg-bg-subtle hover:bg-bg-card transition-colors cursor-pointer text-text-muted hover:text-text-primary"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* VISTA 1: MES (Grid Interactivo Mensual) */}
      {viewMode === "MES" && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 bg-bg-card border border-border-custom rounded-xl shadow-xl overflow-hidden">
            <div className="grid grid-cols-7 border-b border-border-custom bg-bg-subtle text-center py-2.5 text-xs uppercase tracking-wider font-semibold text-text-muted">
              <div>Dom</div>
              <div>Lun</div>
              <div>Mar</div>
              <div>Mié</div>
              <div>Jue</div>
              <div>Vie</div>
              <div>Sáb</div>
            </div>

            <div className="grid grid-cols-7 divide-x divide-y divide-border-custom min-h-[500px]">
              {allCalendarDays.map((day, idx) => {
                const dayEvents = getEventsOnDate(day.date);
                const isToday =
                  new Date().getDate() === day.date.getDate() &&
                  new Date().getMonth() === day.date.getMonth() &&
                  new Date().getFullYear() === day.date.getFullYear();

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDayEvents({ date: day.date, events: dayEvents })}
                    className={`p-1.5 hover:bg-bg-subtle/70 transition-all flex flex-col min-h-[95px] cursor-pointer group relative ${
                      day.isCurrentMonth ? "bg-bg-card" : "bg-bg-subtle/30 opacity-40"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span
                        className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                          isToday ? "bg-[#0078D7] text-white font-black shadow-md" : "text-text-muted group-hover:text-text-primary"
                        }`}
                      >
                        {day.date.getDate()}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="text-[9px] font-bold text-[#0078D7] bg-[#0078D7]/10 px-1 rounded border border-[#0078D7]/30 font-mono">
                          {dayEvents.length}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-1 scrollbar-none">
                      {dayEvents.slice(0, 3).map((event) => (
                        <div
                          key={event.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditEventModal(event);
                          }}
                          className={`text-[10px] px-1.5 py-0.5 rounded truncate font-medium transition-all hover:scale-102 ${getTypeStyle(
                            event.type
                          )}`}
                          title={`${event.title}: ${event.description || ""}`}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-[9px] text-[#0078D7] font-bold pl-1">
                          + {dayEvents.length - 3} más
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sidebar de Eventos Próximos */}
          <div className="bg-bg-card border border-border-custom rounded-xl shadow-xl p-4 flex flex-col h-full max-h-[550px] overflow-y-auto space-y-4">
            <h3 className="font-bold text-xs text-text-primary uppercase tracking-wider border-b border-border-custom pb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#0078D7]" /> Próximos Eventos
            </h3>

            <div className="space-y-3 flex-1 overflow-y-auto pr-1 scrollbar-thin">
              {filteredEventsList.length > 0 ? (
                filteredEventsList
                  .slice(0, 10)
                  .map((event) => (
                    <div
                      key={event.id}
                      onClick={() => openEditEventModal(event)}
                      className="p-3 bg-bg-subtle rounded-lg border border-border-custom relative group hover:border-[#0078D7]/40 transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${getTypeColorDot(event.type)}`} />
                          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                            {getTypeBadgeLabel(event.type)}
                          </span>
                        </div>
                        {event.isSystem && (
                          <span className="text-[9px] font-bold text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/30">Auto</span>
                        )}
                      </div>

                      <h4 className="font-bold text-xs text-text-primary leading-tight">{event.title}</h4>
                      {event.description && (
                        <p className="text-[11px] text-text-muted mt-1 leading-snug line-clamp-2">{event.description}</p>
                      )}

                      <div className="mt-2.5 pt-2 border-t border-border-custom/50 flex flex-col gap-0.5 text-[10px] text-text-muted">
                        <div>📅 <strong>Fecha:</strong> {new Date(event.start).toLocaleString("es-AR")}</div>
                        {event.client && (
                          <div>🏢 <strong>Cliente:</strong> {event.client.razonSocial}</div>
                        )}
                      </div>

                      {!event.isSystem && event.userId === currentUserId && (
                        <button
                          onClick={(e) => handleDeleteEvent(event.id, e)}
                          className="absolute right-2.5 top-2.5 text-text-muted hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer p-1"
                          title="Eliminar evento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))
              ) : (
                <div className="text-center text-text-muted py-12 text-xs italic">
                  Sin eventos programados.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VISTA 2: SEMANA (Vista por Días de la Semana) */}
      {viewMode === "SEMANA" && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {getWeekDays().map((day, idx) => {
            const dayEvents = getEventsOnDate(day);
            const isToday = new Date().toDateString() === day.toDateString();

            return (
              <div 
                key={idx} 
                className={`bg-bg-card border ${isToday ? 'border-[#0078D7] shadow-lg shadow-[#0078D7]/10' : 'border-border-custom'} rounded-xl p-3 flex flex-col min-h-[450px]`}
              >
                <div className="flex justify-between items-center mb-3 border-b border-border-custom pb-2">
                  <div className="text-left">
                    <p className="text-[10px] font-bold text-text-muted uppercase">{day.toLocaleDateString("es-AR", { weekday: "short" })}</p>
                    <p className={`text-base font-black ${isToday ? 'text-[#0078D7]' : 'text-text-primary'}`}>{day.getDate()}</p>
                  </div>
                  <button 
                    onClick={() => openNewEventModal(day)}
                    className="p-1 rounded bg-bg-subtle hover:bg-[#0078D7] text-text-muted hover:text-white transition-colors cursor-pointer"
                    title="Añadir evento este día"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 scrollbar-thin">
                  {dayEvents.length === 0 ? (
                    <p className="text-[10px] text-text-muted italic text-center py-6">Sin actividades</p>
                  ) : (
                    dayEvents.map(event => (
                      <div 
                        key={event.id}
                        onClick={() => openEditEventModal(event)}
                        className={`p-2 rounded border cursor-pointer transition-all hover:scale-102 ${getTypeStyle(event.type)}`}
                      >
                        <span className="text-[9px] font-mono block mb-0.5 opacity-80">{new Date(event.start).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} HS</span>
                        <h5 className="font-bold text-xs leading-tight mb-1">{event.title}</h5>
                        {event.client && <p className="text-[9px] opacity-90 truncate">🏢 {event.client.razonSocial}</p>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VISTA 3: AGENDA / LISTA */}
      {viewMode === "AGENDA" && (
        <div className="bg-bg-card border border-border-custom rounded-xl shadow-xl p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-border-custom pb-3">
            <h3 className="font-bold text-base text-text-primary flex items-center gap-2">
              <ListFilter className="w-5 h-5 text-[#0078D7]" />
              Cronograma Detallado de Eventos y Compromisos
            </h3>
            <span className="text-xs font-mono text-text-muted bg-bg-subtle border border-border-custom px-2.5 py-1 rounded-full font-bold">
              Total: {filteredEventsList.length}
            </span>
          </div>

          <div className="divide-y divide-border-custom">
            {filteredEventsList.length === 0 ? (
              <p className="text-center py-12 text-sm text-text-muted italic">No se encontraron eventos coincidentes con los filtros seleccionados.</p>
            ) : (
              filteredEventsList.map(event => (
                <div key={event.id} className="py-3.5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-bg-subtle/40 px-2 rounded-lg transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`w-3 h-3 rounded-full mt-1 shrink-0 ${getTypeColorDot(event.type)}`} />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-text-primary">{event.title}</h4>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${getTypeStyle(event.type)}`}>
                          {getTypeBadgeLabel(event.type)}
                        </span>
                        {event.isSystem && (
                          <span className="text-[9px] font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/30">Automático</span>
                        )}
                      </div>
                      {event.description && <p className="text-xs text-text-muted">{event.description}</p>}
                      <div className="flex flex-wrap gap-4 text-xs text-text-muted pt-1">
                        <span>📅 <strong>Fecha:</strong> {new Date(event.start).toLocaleString("es-AR")}</span>
                        {event.client && <span>🏢 <strong>Cliente:</strong> {event.client.razonSocial}</span>}
                        <span>👤 <strong>Creador:</strong> {event.user?.nombre || "Sistema"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    {!event.isSystem && (
                      <button
                        onClick={() => openEditEventModal(event)}
                        className="px-3 py-1.5 bg-bg-subtle hover:bg-bg-card text-text-primary border border-border-custom rounded text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Editar
                      </button>
                    )}
                    {!event.isSystem && event.userId === currentUserId && (
                      <button
                        onClick={() => handleDeleteEvent(event.id)}
                        className="p-1.5 text-text-muted hover:text-red-500 border border-border-custom rounded hover:bg-red-500/10 transition-colors cursor-pointer"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal: INSPECTOR DE DÍA SELECCIONADO */}
      {selectedDayEvents && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-card border border-border-custom rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-border-custom bg-bg-subtle">
              <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-[#0078D7]" />
                Eventos del {selectedDayEvents.date.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </h2>
              <button onClick={() => setSelectedDayEvents(null)} className="text-text-muted hover:text-text-primary transition-colors cursor-pointer p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto scrollbar-thin">
              {selectedDayEvents.events.length === 0 ? (
                <p className="text-xs text-text-muted italic text-center py-6">No hay eventos programados para esta fecha.</p>
              ) : (
                selectedDayEvents.events.map(event => (
                  <div key={event.id} className="p-3 bg-bg-subtle rounded-lg border border-border-custom space-y-1">
                    <div className="flex justify-between items-center">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${getTypeStyle(event.type)}`}>
                        {getTypeBadgeLabel(event.type)}
                      </span>
                      <span className="text-[10px] text-text-muted font-mono">{new Date(event.start).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} HS</span>
                    </div>
                    <h4 className="font-bold text-sm text-text-primary mt-1">{event.title}</h4>
                    {event.description && <p className="text-xs text-text-muted">{event.description}</p>}
                    {event.client && <p className="text-xs text-text-secondary font-semibold mt-1">🏢 Cliente: {event.client.razonSocial}</p>}
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-between items-center p-4 border-t border-border-custom bg-bg-subtle">
              <button
                onClick={() => {
                  const date = selectedDayEvents.date;
                  setSelectedDayEvents(null);
                  openNewEventModal(date);
                }}
                className="px-4 py-2 bg-[#0078D7] hover:bg-[#005a9e] text-white rounded-md text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Agregar Evento en este día
              </button>
              <button
                onClick={() => setSelectedDayEvents(null)}
                className="px-4 py-2 bg-bg-sidebar border border-border-custom text-text-primary rounded-md text-xs font-bold hover:bg-bg-subtle transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: CREAR / EDITAR EVENTO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-card border border-border-custom rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-5 border-b border-border-custom bg-bg-subtle">
              <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                {editingEventId ? <Edit3 className="w-5 h-5 text-[#0078D7]" /> : <Plus className="w-5 h-5 text-[#0078D7]" />}
                {editingEventId ? "Editar Evento" : "Crear Nuevo Evento"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-text-muted hover:text-text-primary transition-colors cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Título del Evento</label>
                <input
                  type="text"
                  value={formEvent.title}
                  onChange={e => setFormEvent({ ...formEvent, title: e.target.value })}
                  className="w-full bg-bg-subtle border border-border-custom rounded-md px-3.5 py-2 text-sm text-text-primary focus:border-[#0078D7] outline-none"
                  placeholder="Ej: Reunión Operativa de Calidad"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Descripción / Agenda</label>
                <textarea
                  value={formEvent.description}
                  onChange={e => setFormEvent({ ...formEvent, description: e.target.value })}
                  className="w-full bg-bg-subtle border border-border-custom rounded-md px-3.5 py-2 text-xs text-text-primary focus:border-[#0078D7] outline-none min-h-[75px]"
                  placeholder="Detalles del compromiso o notas importantes..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Fecha y Hora Inicio</label>
                  <input
                    type="datetime-local"
                    value={formEvent.start}
                    onChange={e => setFormEvent({ ...formEvent, start: e.target.value })}
                    className="w-full bg-bg-subtle border border-border-custom rounded-md px-3 py-2 text-xs text-text-primary focus:border-[#0078D7] outline-none font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Tipo de Evento</label>
                  <select
                    value={formEvent.type}
                    onChange={e => setFormEvent({ ...formEvent, type: e.target.value })}
                    className="w-full bg-bg-subtle border border-border-custom rounded-md px-3 py-2 text-xs text-text-primary focus:border-[#0078D7] outline-none font-medium"
                  >
                    <option value="ACTIVIDAD">Actividad Común</option>
                    <option value="REUNION">Reunión de Equipo</option>
                    <option value="ALERTA_CONTRATO">Alerta Vencimiento Contrato</option>
                    <option value="CAMBIO_SERVICIO">Cambio de Servicio</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Alcance / Visibilidad</label>
                  <select
                    value={formEvent.scope}
                    onChange={e => setFormEvent({ ...formEvent, scope: e.target.value })}
                    className="w-full bg-bg-subtle border border-border-custom rounded-md px-3 py-2 text-xs text-text-primary focus:border-[#0078D7] outline-none font-medium"
                  >
                    <option value="INDIVIDUAL">Privado (Solo para mí)</option>
                    <option value="GLOBAL">Global (Visible para todo el equipo)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Asociar a Cliente</label>
                  <select
                    value={formEvent.clientId}
                    onChange={e => setFormEvent({ ...formEvent, clientId: e.target.value })}
                    className="w-full bg-bg-subtle border border-border-custom rounded-md px-3 py-2 text-xs text-text-primary focus:border-[#0078D7] outline-none font-medium"
                  >
                    <option value="">Ninguno</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.razonSocial}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border-custom">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-md text-xs font-bold text-text-secondary hover:bg-bg-subtle border border-border-custom transition-colors cursor-pointer"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#0078D7] hover:bg-[#005a9e] text-white px-5 py-2 rounded-md text-xs font-bold transition-colors cursor-pointer"
                  disabled={loading}
                >
                  {loading ? "Guardando..." : editingEventId ? "Actualizar Evento" : "Crear Evento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
