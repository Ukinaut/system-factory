"use client";

import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, Clock, Plus, Trash2, Users, FileText, ChevronLeft, ChevronRight, X, AlertCircle } from "lucide-react";
import { getCalendarEvents, createCalendarEvent, deleteCalendarEvent } from "@/actions/calendar";
import { getClients } from "@/actions/clients";
import { getCurrentUserSession } from "@/actions/users";

export default function CalendarioPage() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [scopeFilter, setScopeFilter] = useState<"ALL" | "GLOBAL" | "INDIVIDUAL">("ALL");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
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

    // Fetch session securely from server action
    const fetchSession = async () => {
      const res = await getCurrentUserSession();
      if (res.success && res.session) {
        setCurrentUserId(res.session.id);
      }
    };
    fetchSession();
  }, []);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await createCalendarEvent({
      title: formEvent.title,
      description: formEvent.description,
      start: new Date(formEvent.start),
      type: formEvent.type,
      scope: formEvent.scope,
      clientId: formEvent.clientId || undefined
    });
    setLoading(false);

    if (res.success) {
      alert("Evento creado con éxito.");
      setIsModalOpen(false);
      setFormEvent({
        title: "",
        description: "",
        start: new Date().toISOString().slice(0, 16),
        type: "ACTIVIDAD",
        scope: "INDIVIDUAL",
        clientId: ""
      });
      loadData();
    } else {
      alert("Error al crear evento: " + res.error);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm("¿Está seguro de que desea eliminar este evento?")) return;
    setLoading(true);
    const res = await deleteCalendarEvent(id);
    setLoading(false);
    if (res.success) {
      alert("Evento eliminado.");
      loadData();
    } else {
      alert("Error al eliminar: " + res.error);
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
  // Pad end to make full rows of 7
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

  // Get events on a specific date
  const getEventsOnDate = (date: Date) => {
    return events.filter(e => {
      const eventDate = new Date(e.start);
      const matchesDate = eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear();
      
      const matchesScope = scopeFilter === "ALL" || e.scope === scopeFilter;
      return matchesDate && matchesScope;
    });
  };

  const getTypeStyle = (type: string) => {
    switch (type) {
      case "REUNION":
        return "bg-purple-500/10 text-purple-400 border border-purple-500/20";
      case "ALERTA_CONTRATO":
        return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
      case "CAMBIO_SERVICIO":
        return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
      default:
        return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
    }
  };

  const getTypeColorDot = (type: string) => {
    switch (type) {
      case "REUNION": return "bg-purple-500";
      case "ALERTA_CONTRATO": return "bg-amber-500";
      case "CAMBIO_SERVICIO": return "bg-emerald-500";
      default: return "bg-blue-500";
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-wide flex items-center gap-3">
            <CalendarIcon className="text-[#0078D7] w-8 h-8" />
            Agenda y Calendario
          </h1>
          <p className="text-text-muted mt-1">Coordine reuniones, actividades y gestione alertas de vencimiento de contratos.</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#0078D7] hover:bg-[#005a9e] text-white px-5 py-2.5 rounded-md font-medium transition-colors flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          Nuevo Evento
        </button>
      </div>

      {/* Toolbar filters */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-bg-card p-4 border border-border-custom rounded-xl mb-6 shadow-md">
        <div className="flex items-center gap-2 bg-bg-subtle p-1 rounded-lg border border-border-custom">
          <button
            onClick={() => setScopeFilter("ALL")}
            className={`px-4 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
              scopeFilter === "ALL" ? "bg-[#0078D7] text-white" : "text-text-muted hover:text-text-primary"
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setScopeFilter("GLOBAL")}
            className={`px-4 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
              scopeFilter === "GLOBAL" ? "bg-[#0078D7] text-white" : "text-text-muted hover:text-text-primary"
            }`}
          >
            Globales
          </button>
          <button
            onClick={() => setScopeFilter("INDIVIDUAL")}
            className={`px-4 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
              scopeFilter === "INDIVIDUAL" ? "bg-[#0078D7] text-white" : "text-text-muted hover:text-text-primary"
            }`}
          >
            Individuales
          </button>
        </div>

        {/* Date switcher */}
        <div className="flex items-center gap-4">
          <button
            onClick={prevMonth}
            className="p-2 border border-border-custom rounded bg-bg-subtle hover:bg-bg-card transition-colors cursor-pointer text-text-muted hover:text-text-primary"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold text-text-primary capitalize tracking-wide w-48 text-center">
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

          <div className="grid grid-cols-7 divide-x divide-y divide-border-custom min-h-[480px]">
            {allCalendarDays.map((day, idx) => {
              const dayEvents = getEventsOnDate(day.date);
              const isToday =
                new Date().getDate() === day.date.getDate() &&
                new Date().getMonth() === day.date.getMonth() &&
                new Date().getFullYear() === day.date.getFullYear();

              return (
                <div
                  key={idx}
                  className={`p-2 hover:bg-bg-subtle/50 transition-colors flex flex-col min-h-[90px] ${
                    day.isCurrentMonth ? "bg-bg-card" : "bg-bg-subtle/20 opacity-40"
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span
                      className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                        isToday ? "bg-[#0078D7] text-white font-black" : "text-text-muted"
                      }`}
                    >
                      {day.date.getDate()}
                    </span>
                  </div>

                  {/* List of short events */}
                  <div className="flex-1 overflow-y-auto space-y-1">
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        className={`text-[10px] px-1.5 py-0.5 rounded truncate font-medium ${getTypeStyle(
                          event.type
                        )}`}
                        title={`${event.title}: ${event.description || ""}`}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[9px] text-[#0078D7] font-bold pl-1.5">
                        + {dayEvents.length - 3} más
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar list view */}
        <div className="bg-bg-card border border-border-custom rounded-xl shadow-xl p-5 flex flex-col h-full lg:max-h-[550px] overflow-y-auto space-y-5">
          <h3 className="font-bold text-sm text-text-primary uppercase tracking-wider border-b border-border-custom pb-2 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#0078D7]" /> Próximos Eventos
          </h3>

          <div className="space-y-4 flex-1 overflow-y-auto pr-1">
            {events.length > 0 ? (
              events
                .filter(e => scopeFilter === "ALL" || e.scope === scopeFilter)
                .slice(0, 10)
                .map((event) => (
                  <div
                    key={event.id}
                    className="p-3 bg-bg-subtle rounded-lg border border-border-custom relative group hover:border-[#0078D7]/30 transition-all"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${getTypeColorDot(event.type)}`} />
                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                        {event.type.replace("_", " ")}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-text-primary leading-tight">{event.title}</h4>
                    {event.description && (
                      <p className="text-xs text-text-muted mt-1 leading-normal">{event.description}</p>
                    )}

                    <div className="mt-3 pt-2 border-t border-border-custom/50 flex flex-col gap-1 text-[10px] text-text-muted">
                      <div>
                        <strong>Fecha:</strong> {new Date(event.start).toLocaleString()}
                      </div>
                      {event.client && (
                        <div>
                          <strong>Cliente:</strong> {event.client.razonSocial}
                        </div>
                      )}
                      <div>
                        <strong>Creador:</strong> {event.user?.nombre || "Sistema"}
                      </div>
                      <div className="mt-1">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase ${
                          event.scope === 'GLOBAL' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        }`}>
                          {event.scope}
                        </span>
                      </div>
                    </div>

                    {/* Delete Event Button */}
                    {event.userId === currentUserId && (
                      <button
                        onClick={() => handleDeleteEvent(event.id)}
                        className="absolute right-3 top-3 text-text-muted hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                        title="Eliminar evento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))
            ) : (
              <div className="text-center text-text-muted py-12 text-xs italic">
                No hay eventos programados.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Crear Evento */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-card border border-border-custom rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-border-custom bg-bg-subtle">
              <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#0078D7]" />
                Crear Nuevo Evento
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="p-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Título</label>
                  <input
                    type="text"
                    value={formEvent.title}
                    onChange={e => setFormEvent({ ...formEvent, title: e.target.value })}
                    className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-3 text-text-primary focus:border-[#0078D7] outline-none"
                    placeholder="Ej: Reunión Operativa Semanal"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Descripción</label>
                  <textarea
                    value={formEvent.description}
                    onChange={e => setFormEvent({ ...formEvent, description: e.target.value })}
                    className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-3 text-text-primary focus:border-[#0078D7] outline-none min-h-[80px]"
                    placeholder="Detalles sobre la agenda o temas a tratar..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Fecha y Hora Inicio</label>
                    <input
                      type="datetime-local"
                      value={formEvent.start}
                      onChange={e => setFormEvent({ ...formEvent, start: e.target.value })}
                      className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-3 text-text-primary focus:border-[#0078D7] outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Tipo de Evento</label>
                    <select
                      value={formEvent.type}
                      onChange={e => setFormEvent({ ...formEvent, type: e.target.value })}
                      className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-3 text-text-primary focus:border-[#0078D7] outline-none appearance-none font-medium"
                    >
                      <option value="ACTIVIDAD">Actividad Común</option>
                      <option value="REUNION">Reunión de Equipo</option>
                      <option value="ALERTA_CONTRATO">Alerta de Vencimiento de Contrato</option>
                      <option value="CAMBIO_SERVICIO">Cambio de Servicio</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Alcance / Visibilidad</label>
                    <select
                      value={formEvent.scope}
                      onChange={e => setFormEvent({ ...formEvent, scope: e.target.value })}
                      className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-3 text-text-primary focus:border-[#0078D7] outline-none appearance-none font-medium"
                    >
                      <option value="INDIVIDUAL">Privado (Solo para mí)</option>
                      <option value="GLOBAL">Global (Visible para todos)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Asociar a Cliente (Opcional)</label>
                    <select
                      value={formEvent.clientId}
                      onChange={e => setFormEvent({ ...formEvent, clientId: e.target.value })}
                      className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-3 text-text-primary focus:border-[#0078D7] outline-none appearance-none font-medium"
                    >
                      <option value="">Ninguno</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.razonSocial}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t border-border-custom">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 rounded-md text-text-secondary hover:bg-bg-subtle border border-border-custom transition-colors cursor-pointer"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#0078D7] hover:bg-[#005a9e] text-white px-6 py-2 rounded-md font-medium transition-colors cursor-pointer"
                  disabled={loading}
                >
                  {loading ? "Creando..." : "Crear Evento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
