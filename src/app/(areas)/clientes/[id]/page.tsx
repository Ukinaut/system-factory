"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Plus, MapPin, Activity, Server, History, Edit, Save, X, Globe, Receipt, ExternalLink, FileText, Network, Phone, Mail, ChevronRight, AlertTriangle, RefreshCw, File, Upload, HelpCircle, Trash2, ChevronDown, ChevronUp, Eye } from "lucide-react";
import { getClientById, updateClient, createClient, createClientEvent, deleteClientEvent, updateClientEvent, updateClientPriority } from "@/actions/clients";
import { getCurrentUserSession } from "@/actions/users";

export default function PerfilCliente({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const clientId = resolvedParams.id;

  const [activeTab, setActiveTab] = useState("equipos");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [cliente, setCliente] = useState<any>({
    id: clientId,
    razonSocial: "",
    cuit: "",
    correo: "",
    telefono: "",
    direccion: "",
    prioridad: "MEDIA",
    parentId: null,
    parent: null,
    subClients: []
  });

  // Modal Subnodo
  const [isSubnodeOpen, setIsSubnodeOpen] = useState(false);
  const [subnodeName, setSubnodeName] = useState("");
  const [subnodePhone, setSubnodePhone] = useState("");
  const [subnodeEmail, setSubnodeEmail] = useState("");
  const [subnodeAddress, setSubnodeAddress] = useState("");
  const [subnodeLoading, setSubnodeLoading] = useState(false);

  // Modal Evento
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventDate, setEventDate] = useState("");
  const [eventType, setEventType] = useState("Reclamo");
  const [eventObservations, setEventObservations] = useState("");
  const [eventFile, setEventFile] = useState<File | null>(null);
  const [eventFileBase64, setEventFileBase64] = useState<string | null>(null);
  const [eventLoading, setEventLoading] = useState(false);

  // Session & Expandible & Detalle & Edición
  const [session, setSession] = useState<any>(null);
  const [expandedEvents, setExpandedEvents] = useState<{ [key: string]: boolean }>({});
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailEvent, setDetailEvent] = useState<any>(null);

  const [isEditEventModalOpen, setIsEditEventModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState("");
  const [editEventDate, setEditEventDate] = useState("");
  const [editEventType, setEditEventType] = useState("Reclamo");
  const [editEventObservations, setEditEventObservations] = useState("");
  const [editEventFile, setEditEventFile] = useState<File | null>(null);
  const [editEventFileBase64, setEditEventFileBase64] = useState<string | null>(null);
  const [editEventFileCurrentName, setEditEventFileCurrentName] = useState<string | null>(null);
  const [editEventFileDelete, setEditEventFileDelete] = useState(false);
  const [editEventLoading, setEditEventLoading] = useState(false);

  const [equipos, setEquipos] = useState<any[]>([]);
  const [compras, setCompras] = useState<any[]>([]);
  const [eventos, setEventos] = useState<any[]>([]);
  const [editForm, setEditForm] = useState(cliente);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEventFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setEventFileBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventDate || !eventType || !eventObservations) {
      alert("Por favor completa los campos obligatorios.");
      return;
    }

    setEventLoading(true);
    const res = await createClientEvent(clientId, {
      fecha: eventDate,
      tipo: eventType,
      observaciones: eventObservations,
      adjuntoBase64: eventFileBase64 || undefined,
      adjuntoNombre: eventFile?.name || undefined,
    });
    setEventLoading(false);

    if (res.success) {
      setIsEventModalOpen(false);
      setEventDate("");
      setEventType("Reclamo");
      setEventObservations("");
      setEventFile(null);
      setEventFileBase64(null);
      alert("Evento registrado correctamente.");
      loadData();
    } else {
      alert("Error al registrar evento: " + res.error);
    }
  };

  const toggleExpandEvent = (eventId: string) => {
    setExpandedEvents(prev => ({
      ...prev,
      [eventId]: !prev[eventId]
    }));
  };

  const handleOpenEditEvent = (ev: any) => {
    setEditingEventId(ev.id);
    const localDate = new Date(ev.fecha);
    localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
    setEditEventDate(localDate.toISOString().slice(0, 16));
    setEditEventType(ev.tipo);
    setEditEventObservations(ev.observaciones);
    setEditEventFile(null);
    setEditEventFileBase64(null);
    setEditEventFileCurrentName(ev.adjuntoNombre);
    setEditEventFileDelete(false);
    setIsEditEventModalOpen(true);
  };

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditEventFile(file);
      setEditEventFileDelete(false);
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditEventFileBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editEventDate || !editEventType || !editEventObservations) {
      alert("Por favor completa los campos obligatorios.");
      return;
    }

    setEditEventLoading(true);
    const res = await updateClientEvent(editingEventId, clientId, {
      fecha: editEventDate,
      tipo: editEventType,
      observaciones: editEventObservations,
      adjuntoBase64: editEventFileBase64 || undefined,
      adjuntoNombre: editEventFile?.name || undefined,
      eliminarAdjunto: editEventFileDelete
    });
    setEditEventLoading(false);

    if (res.success) {
      setIsEditEventModalOpen(false);
      alert("Evento actualizado correctamente.");
      loadData();
    } else {
      alert("Error al actualizar evento: " + res.error);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este evento? Esta acción no se puede deshacer.")) {
      return;
    }
    setLoading(true);
    const res = await deleteClientEvent(eventId, clientId);
    setLoading(false);
    if (res.success) {
      alert("Evento eliminado correctamente.");
      loadData();
    } else {
      alert("Error al eliminar evento: " + res.error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    const res = await getClientById(clientId);
    if (res.success && res.client) {
      const c = res.client;
      setCliente({
        id: c.id,
        razonSocial: c.razonSocial,
        cuit: c.cuit,
        correo: c.correo || "",
        telefono: c.telefono || "",
        direccion: c.direccion || "",
        prioridad: c.prioridad || "MEDIA",
        parentId: c.parentId,
        parent: c.parent,
        subClients: c.subClients || [],
      });
      setEditForm({
        id: c.id,
        razonSocial: c.razonSocial,
        cuit: c.cuit,
        correo: c.correo || "",
        telefono: c.telefono || "",
        direccion: c.direccion || "",
      });
      setEquipos(c.equipos || []);
      setEventos(c.events || []);

      // Consolidar compras del cliente matriz y sus subnodos
      let allSales = [...(c.sales || [])].map(s => ({ ...s, compradoPor: "Matriz" }));
      if (c.subClients && c.subClients.length > 0) {
        c.subClients.forEach((sub: any) => {
          if (sub.sales && sub.sales.length > 0) {
            const subSalesMapped = sub.sales.map((s: any) => ({
              ...s,
              compradoPor: sub.razonSocial
            }));
            allSales = [...allSales, ...subSalesMapped];
          }
        });
      }
      // Ordenar por fecha descendente
      allSales.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setCompras(allSales);
    }
    setLoading(false);
  };

  const handleUpdatePriority = async (newPriority: string) => {
    setLoading(true);
    const res = await updateClientPriority(clientId, newPriority);
    setLoading(false);
    if (res.success) {
      alert("Prioridad del cliente actualizada correctamente.");
      loadData();
    } else {
      alert("Error al actualizar la prioridad del cliente: " + res.error);
    }
  };

  useEffect(() => {
    loadData();
    getCurrentUserSession().then(res => {
      if (res.success && res.session) {
        setSession(res.session);
      }
    });
  }, [clientId]);

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await updateClient(clientId, {
      razonSocial: editForm.razonSocial,
      cuit: editForm.cuit,
      correo: editForm.correo,
      telefono: editForm.telefono,
      direccion: editForm.direccion,
    });
    setLoading(false);
    if (res.success) {
      setCliente(editForm);
      setIsEditing(false);
      alert("Datos del cliente actualizados correctamente.");
      loadData();
    } else {
      alert("Error al actualizar: " + res.error);
    }
  };

  const exportPDF = () => {
    alert("Generando PDF con el historial completo de movimientos, compras y consumos del cliente...");
  };

  const totalGigasUsados = equipos.reduce((acc: number, curr: any) => acc + (curr.gigasConsumidos || 0), 0);
  const totalEquipos = equipos.length;

  const getRecommendedPriority = () => {
    if (totalEquipos > 5 || totalGigasUsados > 1000) {
      return "ALTA";
    } else if (totalEquipos >= 2 || totalGigasUsados >= 200) {
      return "MEDIA";
    } else {
      return "BAJA";
    }
  };

  const recomendacion = getRecommendedPriority();

  if (loading && !cliente.razonSocial) {
    return (
      <div className="max-w-6xl mx-auto p-8 text-center text-text-muted">
        Cargando perfil del cliente...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-12">
      {/* Header Profile */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Link href="/clientes" className="p-2 bg-bg-card border border-border-custom rounded hover:bg-bg-subtle transition-colors">
            <ArrowLeft className="w-5 h-5 text-text-muted" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-text-primary tracking-wide">{cliente.razonSocial || "Cargando..."}</h1>
            <p className="text-text-muted font-mono mt-1">CUIT: {cliente.cuit} | {cliente.correo || "Sin correo"}</p>
            {cliente.parent && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Subnodo de:
                </span>
                <Link href={`/clientes/${cliente.parent.id}`} className="text-sm font-bold text-[#0078D7] hover:underline flex items-center gap-1">
                  {cliente.parent.razonSocial}
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            )}

            {/* Prioridad y Recomendación del Sistema */}
            <div className="mt-4 flex flex-wrap items-center gap-3 bg-bg-card p-3 rounded-lg border border-border-custom text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-text-muted font-bold uppercase tracking-wider">Prioridad:</span>
                <select
                  value={cliente.prioridad || "MEDIA"}
                  onChange={(e) => handleUpdatePriority(e.target.value)}
                  className={`px-3 py-1.5 rounded border font-bold uppercase cursor-pointer outline-none ${
                    cliente.prioridad === "ALTA" ? "bg-rose-500/10 text-rose-500 border-rose-500/30" :
                    cliente.prioridad === "MEDIA" ? "bg-amber-500/10 text-amber-500 border-amber-500/30" :
                    "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                  }`}
                >
                  <option value="ALTA" className="bg-bg-card text-rose-500">Alta Prioridad</option>
                  <option value="MEDIA" className="bg-bg-card text-amber-500">Prioridad Media</option>
                  <option value="BAJA" className="bg-bg-card text-emerald-500">Baja Prioridad</option>
                </select>
              </div>

              <div className="flex items-center gap-2 border-l border-border-custom pl-3 flex-wrap">
                <span className="text-text-muted">Recomendación:</span>
                <span className={`font-bold px-2 py-0.5 rounded border uppercase ${
                  recomendacion === "ALTA" ? "bg-rose-500/10 text-rose-500 border-rose-500/30" :
                  recomendacion === "MEDIA" ? "bg-amber-500/10 text-amber-500 border-amber-500/30" :
                  "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                }`}>
                  {recomendacion === "ALTA" ? "Alta" : recomendacion === "MEDIA" ? "Media" : "Baja"} (Uso: {totalEquipos} eq | {totalGigasUsados} GB)
                </span>
                {cliente.prioridad !== recomendacion && (
                  <button
                    onClick={() => handleUpdatePriority(recomendacion)}
                    className="flex items-center gap-1 bg-[#0078D7] hover:bg-[#005a9e] text-white px-2 py-1 rounded font-bold transition-all cursor-pointer text-[10px] uppercase shadow-sm"
                  >
                    <RefreshCw className="w-3 h-3" /> Aplicar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setIsEditing(true)} className="bg-bg-card hover:bg-bg-subtle text-text-secondary px-5 py-2.5 rounded-md font-medium transition-colors border border-border-custom flex items-center gap-2 cursor-pointer">
            <Edit className="w-5 h-5" />
            Editar Cliente
          </button>
          <button onClick={exportPDF} className="bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white px-5 py-2.5 rounded-md font-medium transition-colors border border-rose-600/30 hover:border-transparent flex items-center gap-2 cursor-pointer">
            <Download className="w-5 h-5" />
            Exportar a PDF
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-custom mb-6">
        <button 
          onClick={() => setActiveTab("equipos")}
          className={`px-6 py-3 font-semibold text-sm tracking-wider uppercase transition-colors cursor-pointer ${activeTab === 'equipos' ? 'text-[#0078D7] border-b-2 border-[#0078D7]' : 'text-text-muted hover:text-text-primary'}`}
        >
          Equipos y Consumos
        </button>
        <button 
          onClick={() => setActiveTab("compras")}
          className={`px-6 py-3 font-semibold text-sm tracking-wider uppercase transition-colors cursor-pointer ${activeTab === 'compras' ? 'text-[#0078D7] border-b-2 border-[#0078D7]' : 'text-text-muted hover:text-text-primary'}`}
        >
          Historial de Compras
        </button>
        <button 
          onClick={() => setActiveTab("historial")}
          className={`px-6 py-3 font-semibold text-sm tracking-wider uppercase transition-colors cursor-pointer ${activeTab === 'historial' ? 'text-[#0078D7] border-b-2 border-[#0078D7]' : 'text-text-muted hover:text-text-primary'}`}
        >
          Historial de Movimientos
        </button>
        {!cliente.parentId && (
          <button 
            onClick={() => setActiveTab("subnodos")}
            className={`px-6 py-3 font-semibold text-sm tracking-wider uppercase transition-colors cursor-pointer ${activeTab === 'subnodos' ? 'text-[#0078D7] border-b-2 border-[#0078D7]' : 'text-text-muted hover:text-text-primary'}`}
          >
            Subnodos / Áreas
          </button>
        )}
      </div>

      {/* Tab: Equipos */}
      {activeTab === "equipos" && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button className="bg-[#0078D7] hover:bg-[#005a9e] text-white px-4 py-2 rounded-md font-medium transition-colors flex items-center gap-2 cursor-pointer">
              <Plus className="w-4 h-4" /> Nuevo Equipo
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {equipos.length > 0 ? (
              equipos.map((equipo) => (
                <div key={equipo.id} className={`bg-bg-card rounded-xl border ${equipo.estado === 'Activo' ? 'border-border-custom hover:border-[#0078D7]/50' : 'border-red-900/30 opacity-70'} shadow-lg overflow-hidden transition-all duration-300`}>
                  <div className={`p-4 border-b border-border-custom flex justify-between items-center ${equipo.marca === 'Starlink' ? 'bg-indigo-905/10 bg-indigo-900/10' : 'bg-orange-900/10'}`}>
                    <div className="flex items-center gap-3">
                      <Server className={`w-6 h-6 ${equipo.marca === 'Starlink' ? 'text-indigo-400' : 'text-orange-400'}`} />
                      <div>
                        <h3 className="font-bold text-text-primary tracking-wide">{equipo.marca} - {equipo.modelo}</h3>
                        <p className="text-xs text-text-muted uppercase">{equipo.identificador}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${equipo.estado === 'Activo' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                      {equipo.estado}
                    </span>
                  </div>
                  
                  <div className="p-6 space-y-4">
                    <div className="flex flex-col gap-4">
                      <div className="bg-bg-subtle p-3 rounded-lg border border-border-custom flex justify-between items-center">
                        <div className="flex flex-col">
                          <p className="text-xs text-text-muted uppercase tracking-wider mb-1 font-semibold flex items-center gap-2"><MapPin className="w-3 h-3" /> Tipo / Ubicación</p>
                          <p className="text-sm text-text-secondary"><span className="font-bold text-text-primary">{equipo.movilidad}</span>: {equipo.ubicacion}</p>
                        </div>
                        <div className="flex flex-col items-end text-right border-l border-border-custom pl-4">
                           <p className="text-xs text-text-muted uppercase tracking-wider mb-1 font-semibold flex items-center gap-2"><Globe className="w-3 h-3" /> Proveedor</p>
                           <p className="text-sm font-bold text-blue-400">{equipo.proveedor}</p>
                        </div>
                      </div>

                      <div className="bg-bg-subtle p-4 rounded-lg border border-border-custom">
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-xs text-text-muted uppercase tracking-wider font-semibold flex items-center gap-2"><Activity className="w-3 h-3" /> Consumo de Datos</p>
                          <p className="text-xs text-text-muted"><strong className="text-text-primary">{equipo.gigasConsumidos} GB</strong> / {equipo.gigasAsignados} GB</p>
                        </div>
                        {/* Barra de Progreso */}
                        <div className="w-full bg-bg-card rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${equipo.gigasConsumidos >= equipo.gigasAsignados * 0.9 ? 'bg-red-500' : 'bg-[#0078D7]'}`}
                            style={{ width: `${Math.min((equipo.gigasConsumidos / equipo.gigasAsignados) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 bg-bg-card border border-border-custom rounded-xl p-12 text-center text-text-muted">
                Este cliente no cuenta con equipos asignados todavía.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Historial de Compras */}
      {activeTab === "compras" && (
        <div className="bg-bg-card rounded-xl border border-border-custom shadow-xl overflow-hidden">
          <div className="p-6 border-b border-border-custom bg-bg-subtle">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <Receipt className="text-emerald-500 w-5 h-5" />
              Historial de Ventas / Facturas
            </h2>
          </div>
          <div className="overflow-x-auto">
            {compras.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-bg-subtle border-b border-border-custom text-xs uppercase tracking-wider text-text-muted font-semibold">
                    <th className="p-4 pl-6">N° Orden</th>
                    <th className="p-4">Fecha</th>
                    {cliente.subClients && cliente.subClients.length > 0 && (
                      <th className="p-4">Nodo / Sucursal</th>
                    )}
                    <th className="p-4">Tipo</th>
                    <th className="p-4">Artículos / Detalle</th>
                    <th className="p-4 text-center">Estado</th>
                    <th className="p-4 text-right">Total</th>
                    <th className="p-4 text-center">Factura</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-custom text-sm text-text-secondary">
                  {compras.map((compra) => {
                    const invoice = compra.invoices?.[0];
                    return (
                      <tr key={compra.id} className="hover:bg-bg-subtle transition-colors">
                        <td className="p-4 pl-6 font-bold font-mono text-text-primary">{compra.numeroOrden}</td>
                        <td className="p-4">{new Date(compra.createdAt).toLocaleDateString()}</td>
                        {cliente.subClients && cliente.subClients.length > 0 && (
                          <td className="p-4">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                              compra.compradoPor === 'Matriz'
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                            }`}>
                              {compra.compradoPor}
                            </span>
                          </td>
                        )}
                        <td className="p-4 text-xs font-semibold uppercase">{compra.tipo}</td>
                        <td className="p-4 max-w-xs">
                          <ul className="list-disc pl-4 space-y-0.5 text-xs text-text-muted">
                            {(compra.details || []).map((det: any, idx: number) => (
                              <li key={idx}>
                                {det.producto?.nombre || "Producto"} x {det.cantidad} ({compra.moneda === "USD" ? "US$" : "$"} {det.precioUnitario})
                              </li>
                            ))}
                          </ul>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold border ${
                            compra.estado === 'PENDIENTE' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                            compra.estado === 'FACTURADO' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                            'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }`}>
                            {compra.estado}
                          </span>
                        </td>
                        <td className="p-4 text-right font-bold text-text-primary">{compra.moneda === "USD" ? "US$" : "$"} {compra.total.toLocaleString()}</td>
                        <td className="p-4 text-center">
                          {invoice?.archivoUrl ? (
                            <a 
                              href={invoice.archivoUrl} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="inline-flex items-center gap-1.5 text-[#0078D7] hover:underline font-medium text-xs cursor-pointer"
                            >
                              <FileText className="w-4 h-4" />
                              Ver Documento
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-text-muted text-xs italic">Sin factura</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center text-text-muted italic">
                No hay transacciones registradas para este cliente.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Historial de Movimientos */}
      {activeTab === "historial" && (
        <div className="space-y-6 text-left animate-in fade-in duration-200">
          <div className="flex justify-between items-center bg-bg-card p-6 rounded-xl border border-border-custom shadow-md">
            <div>
              <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                <History className="text-[#0078D7] w-5 h-5" />
                Historial de Eventos del Cliente
              </h2>
              <p className="text-sm text-text-muted mt-1">Registra y visualiza reclamos, recargas y otros eventos significativos.</p>
            </div>
            <button
              onClick={() => {
                const now = new Date();
                now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
                setEventDate(now.toISOString().slice(0, 16));
                setIsEventModalOpen(true);
              }}
              className="bg-[#0078D7] hover:bg-[#005a9e] text-white px-4 py-2.5 rounded-md font-bold transition-colors flex items-center gap-2 cursor-pointer shadow-md text-sm"
            >
              <Plus className="w-4 h-4" /> Registrar Evento
            </button>
          </div>

          <div className="bg-bg-card rounded-xl border border-border-custom p-8 shadow-md">
            {eventos.length > 0 ? (
              <div className="relative border-l-2 border-border-custom ml-4 pl-8 space-y-8 text-left">
                {eventos.map((ev: any) => {
                  let Icon = HelpCircle;
                  let colorClass = "bg-bg-subtle text-text-muted border-border-custom";
                  if (ev.tipo === "Reclamo") {
                    Icon = AlertTriangle;
                    colorClass = "bg-rose-500/10 text-rose-500 border-rose-500/20";
                  } else if (ev.tipo === "Recarga") {
                    Icon = RefreshCw;
                    colorClass = "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
                  } else if (ev.tipo === "Otros") {
                    Icon = FileText;
                    colorClass = "bg-blue-500/10 text-blue-500 border-blue-500/20";
                  }
                  
                  return (
                    <div key={ev.id} className="relative text-left">
                      {/* Icono de tipo de evento en la linea de tiempo */}
                      <div className={`absolute -left-[49px] top-0.5 w-8 h-8 rounded-full border flex items-center justify-center shrink-0 shadow-sm ${colorClass}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      
                      <div className="space-y-3 bg-bg-subtle/20 p-5 rounded-xl border border-border-custom shadow-sm hover:shadow-md transition-all">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-custom/30 pb-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full inline-block uppercase tracking-wider ${
                              ev.tipo === 'Reclamo' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' :
                              ev.tipo === 'Recarga' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                              'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                            }`}>
                              {ev.tipo}
                            </span>
                            <span className="text-xs text-text-muted font-mono">
                              {new Date(ev.fecha).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 bg-bg-card border border-border-custom rounded-md p-0.5">
                            <button
                              onClick={() => {
                                setDetailEvent(ev);
                                setIsDetailModalOpen(true);
                              }}
                              className="p-1 hover:bg-bg-subtle text-text-muted hover:text-text-primary rounded transition-colors cursor-pointer"
                              title="Despegar detalle completo"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {session?.rol === "ADMIN" && (
                              <>
                                <button
                                  onClick={() => handleOpenEditEvent(ev)}
                                  className="p-1 hover:bg-bg-subtle text-blue-500 hover:text-blue-600 rounded transition-colors cursor-pointer"
                                  title="Editar evento"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteEvent(ev.id)}
                                  className="p-1 hover:bg-bg-subtle text-rose-500 hover:text-rose-600 rounded transition-colors cursor-pointer"
                                  title="Eliminar evento"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-text-secondary text-sm bg-bg-subtle/50 p-4 rounded-lg border border-border-custom/50">
                          <p className="whitespace-pre-wrap leading-relaxed">
                            {ev.observaciones.length > 180 && !expandedEvents[ev.id]
                              ? `${ev.observaciones.slice(0, 180)}...`
                              : ev.observaciones}
                          </p>
                          
                          {ev.observaciones.length > 180 && (
                            <button
                              onClick={() => toggleExpandEvent(ev.id)}
                              className="text-xs font-semibold text-[#0078D7] hover:underline flex items-center gap-1 mt-2 cursor-pointer"
                            >
                              {expandedEvents[ev.id] ? (
                                <>
                                  Ver menos <ChevronUp className="w-3.5 h-3.5" />
                                </>
                              ) : (
                                <>
                                  Ver más <ChevronDown className="w-3.5 h-3.5" />
                                </>
                              )}
                            </button>
                          )}
                        </div>
                        
                        {ev.adjuntoUrl && (
                          <div className="flex items-center justify-between bg-bg-subtle p-3 rounded-lg border border-border-custom text-xs">
                            <div className="flex items-center gap-2 text-text-secondary truncate max-w-[60%]">
                              <File className="w-4 h-4 text-text-muted shrink-0" />
                              <span className="truncate">{ev.adjuntoNombre || "Archivo Adjunto"}</span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 ml-4">
                              <a
                                href={ev.adjuntoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#0078D7] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" /> Visualizar
                              </a>
                              <a
                                href={ev.adjuntoUrl}
                                download={ev.adjuntoNombre || "archivo"}
                                className="text-[#0078D7] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5" /> Descargar
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-text-muted flex flex-col items-center justify-center">
                <History className="w-12 h-12 text-border-custom mb-4" />
                <h4 className="text-lg text-text-primary font-semibold mb-2">Sin Eventos Registrados</h4>
                <p className="max-w-md mx-auto text-sm">Aún no se han registrado eventos personalizados de reclamo, recarga u otros para este cliente.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Subnodos / Áreas */}
      {activeTab === "subnodos" && !cliente.parentId && (
        <div className="space-y-6 animate-in fade-in duration-200 text-left">
          <div className="flex justify-between items-center bg-bg-card p-6 rounded-xl border border-border-custom shadow-md">
            <div>
              <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                <Network className="text-[#0078D7] w-5 h-5" />
                Subnodos y Áreas de Trabajo
              </h2>
              <p className="text-sm text-text-muted mt-1">Crea y gestiona divisiones organizacionales o sucursales de esta empresa.</p>
            </div>
            <button
              onClick={() => {
                setSubnodeName("");
                setSubnodePhone("");
                setSubnodeEmail("");
                setSubnodeAddress("");
                setIsSubnodeOpen(true);
              }}
              className="bg-[#0078D7] hover:bg-[#005a9e] text-white px-4 py-2.5 rounded-md font-bold transition-colors flex items-center gap-2 cursor-pointer shadow-md text-sm"
            >
              <Plus className="w-4 h-4" /> Nueva Área / Subnodo
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {cliente.subClients && cliente.subClients.length > 0 ? (
              cliente.subClients.map((sub: any) => {
                const activos = sub.equipos?.filter((e: any) => e.estado === "Activo").length || 0;
                return (
                  <div key={sub.id} className="bg-bg-card rounded-xl border border-border-custom hover:border-[#0078D7]/40 p-6 shadow-md transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-text-primary">{sub.razonSocial}</h3>
                          <span className="text-xs font-mono text-text-muted uppercase">ID: {sub.id}</span>
                        </div>
                        <span className="text-xs bg-bg-subtle text-[#0078D7] border border-border-custom font-semibold px-2.5 py-1 rounded-full uppercase">
                          Área / Sucursal
                        </span>
                      </div>

                      <div className="space-y-2 mb-6">
                        {sub.direccion && (
                          <p className="text-sm text-text-secondary flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-text-muted shrink-0" />
                            {sub.direccion}
                          </p>
                        )}
                        {sub.telefono && (
                          <p className="text-sm text-text-secondary flex items-center gap-2">
                            <Phone className="w-4 h-4 text-text-muted shrink-0" />
                            {sub.telefono}
                          </p>
                        )}
                        {sub.correo && (
                          <p className="text-sm text-text-secondary flex items-center gap-2">
                            <Mail className="w-4 h-4 text-text-muted shrink-0" />
                            {sub.correo}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-border-custom pt-4 mt-2 flex justify-between items-center">
                      <div className="flex gap-4">
                        <span className="text-xs font-semibold text-text-muted">
                          <strong className="text-text-primary mr-1">{activos}</strong> Equipos
                        </span>
                        <span className="text-xs font-semibold text-text-muted">
                          <strong className="text-text-primary mr-1">{sub.services?.length || 0}</strong> Servicios
                        </span>
                      </div>
                      <Link
                        href={`/clientes/${sub.id}`}
                        className="text-[#0078D7] hover:underline font-bold text-sm flex items-center gap-1"
                      >
                        Ver Gestión
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-2 bg-bg-card border border-border-custom rounded-xl p-12 text-center text-text-muted italic">
                Aún no has registrado subnodos o áreas para este cliente.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Editar Cliente */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-card border border-border-custom rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-border-custom bg-bg-subtle">
              <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                <Edit className="w-5 h-5 text-[#0078D7]" />
                Editar Datos del Cliente
              </h2>
              <button onClick={() => setIsEditing(false)} className="text-text-muted hover:text-text-primary transition-colors cursor-pointer">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSaveEdit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Razón Social</label>
                  <input
                    type="text"
                    value={editForm.razonSocial}
                    onChange={e => setEditForm({...editForm, razonSocial: e.target.value})}
                    className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-3 text-text-primary focus:border-[#0078D7] outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">CUIT</label>
                  <input
                    type="text"
                    value={editForm.cuit}
                    onChange={e => setEditForm({...editForm, cuit: e.target.value})}
                    className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-3 text-text-primary focus:border-[#0078D7] outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Correo Electrónico</label>
                  <input
                    type="email"
                    value={editForm.correo}
                    onChange={e => setEditForm({...editForm, correo: e.target.value})}
                    className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-3 text-text-primary focus:border-[#0078D7] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Teléfono</label>
                  <input
                    type="text"
                    value={editForm.telefono}
                    onChange={e => setEditForm({...editForm, telefono: e.target.value})}
                    className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-3 text-text-primary focus:border-[#0078D7] outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Dirección</label>
                  <input
                    type="text"
                    value={editForm.direccion}
                    onChange={e => setEditForm({...editForm, direccion: e.target.value})}
                    className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-3 text-text-primary focus:border-[#0078D7] outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t border-border-custom bg-bg-subtle">
                <button type="button" onClick={() => setIsEditing(false)} className="px-6 py-2 rounded-md text-text-secondary hover:bg-bg-subtle border border-border-custom transition-colors cursor-pointer" disabled={loading}>
                  Cancelar
                </button>
                <button type="submit" className="bg-[#0078D7] hover:bg-[#005a9e] text-white px-6 py-2 rounded-md font-medium flex items-center gap-2 transition-colors cursor-pointer" disabled={loading}>
                  <Save className="w-5 h-5" />
                  {loading ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Registrar Subnodo */}
      {isSubnodeOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-card border border-border-custom rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-border-custom bg-bg-subtle">
              <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                <Network className="w-5 h-5 text-[#0078D7]" />
                Registrar Área / Subnodo
              </h2>
              <button onClick={() => setIsSubnodeOpen(false)} className="text-text-muted hover:text-text-primary transition-colors cursor-pointer" disabled={subnodeLoading}>
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!subnodeName) return;
              setSubnodeLoading(true);
              const res = await createClient({
                razonSocial: subnodeName.trim(),
                cuit: cliente.cuit, // Hereda el CUIT de la empresa matriz
                telefono: subnodePhone.trim(),
                correo: subnodeEmail.trim().toLowerCase(),
                direccion: subnodeAddress.trim(),
                parentId: cliente.id
              });
              setSubnodeLoading(false);
              if (res.success) {
                setIsSubnodeOpen(false);
                loadData();
                alert("Área/Subnodo creado exitosamente.");
              } else {
                alert("Error: " + res.error);
              }
            }} className="p-6 space-y-4 text-left">
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Nombre del Área / Sucursal *</label>
                <input
                  type="text"
                  value={subnodeName}
                  onChange={e => setSubnodeName(e.target.value)}
                  placeholder="Ej: Planta Sur, Administración, Operaciones"
                  className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-2.5 text-text-primary focus:border-[#0078D7] outline-none text-sm"
                  required
                  disabled={subnodeLoading}
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Dirección Específica</label>
                <input
                  type="text"
                  value={subnodeAddress}
                  onChange={e => setSubnodeAddress(e.target.value)}
                  placeholder="Ej: Ruta 40 Km 125, Mendoza"
                  className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-2.5 text-text-primary focus:border-[#0078D7] outline-none text-sm"
                  disabled={subnodeLoading}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Teléfono de Contacto</label>
                  <input
                    type="text"
                    value={subnodePhone}
                    onChange={e => setSubnodePhone(e.target.value)}
                    placeholder="+54 261 555-5555"
                    className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-2.5 text-text-primary focus:border-[#0078D7] outline-none text-sm"
                    disabled={subnodeLoading}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Correo Electrónico</label>
                  <input
                    type="email"
                    value={subnodeEmail}
                    onChange={e => setSubnodeEmail(e.target.value)}
                    placeholder="area@empresa.com"
                    className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-2.5 text-text-primary focus:border-[#0078D7] outline-none text-sm"
                    disabled={subnodeLoading}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t border-border-custom bg-bg-subtle font-medium text-sm">
                <button type="button" onClick={() => setIsSubnodeOpen(false)} className="px-5 py-2 rounded-md text-text-secondary hover:bg-bg-subtle border border-border-custom transition-colors cursor-pointer" disabled={subnodeLoading}>
                  Cancelar
                </button>
                <button type="submit" className="bg-[#0078D7] hover:bg-[#005a9e] text-white px-5 py-2 rounded-md font-medium flex items-center gap-2 transition-colors cursor-pointer" disabled={subnodeLoading}>
                  {subnodeLoading ? "Creando..." : "Crear Subnodo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Registrar Evento */}
      {isEventModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-card border border-border-custom rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-border-custom bg-bg-subtle">
              <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                <History className="w-5 h-5 text-[#0078D7]" />
                Registrar Evento
              </h2>
              <button onClick={() => setIsEventModalOpen(false)} className="text-text-muted hover:text-text-primary transition-colors cursor-pointer" disabled={eventLoading}>
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleCreateEvent} className="p-6 space-y-4 text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Fecha y Hora *</label>
                  <input
                    type="datetime-local"
                    value={eventDate}
                    onChange={e => setEventDate(e.target.value)}
                    className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-2.5 text-text-primary focus:border-[#0078D7] outline-none text-sm"
                    required
                    disabled={eventLoading}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Tipo de Evento *</label>
                  <select
                    value={eventType}
                    onChange={e => setEventType(e.target.value)}
                    className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-2.5 text-text-primary focus:border-[#0078D7] outline-none text-sm"
                    required
                    disabled={eventLoading}
                  >
                    <option value="Reclamo">Reclamo</option>
                    <option value="Recarga">Recarga</option>
                    <option value="Otros">Otros</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Observaciones / Detalles *</label>
                <textarea
                  value={eventObservations}
                  onChange={e => setEventObservations(e.target.value)}
                  placeholder="Describe los detalles del evento registrado..."
                  rows={4}
                  className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-2.5 text-text-primary focus:border-[#0078D7] outline-none text-sm resize-none"
                  required
                  disabled={eventLoading}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Adjuntar Archivo (Imagen, Correo, PDF, etc.)</label>
                <div className="border-2 border-dashed border-border-custom hover:border-[#0078D7]/50 rounded-lg p-6 text-center cursor-pointer transition-colors relative">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={eventLoading}
                  />
                  <div className="flex flex-col items-center justify-center gap-1">
                    <Upload className="w-8 h-8 text-text-muted" />
                    <span className="text-sm font-semibold text-text-primary">
                      {eventFile ? eventFile.name : "Selecciona o arrastra un archivo"}
                    </span>
                    <span className="text-xs text-text-muted">
                      {eventFile ? `${(eventFile.size / 1024).toFixed(1)} KB` : "Imágenes, PDFs o correos (.eml/.msg)"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t border-border-custom bg-bg-subtle font-medium text-sm">
                <button type="button" onClick={() => setIsEventModalOpen(false)} className="px-5 py-2 rounded-md text-text-secondary hover:bg-bg-subtle border border-border-custom transition-colors cursor-pointer" disabled={eventLoading}>
                  Cancelar
                </button>
                <button type="submit" className="bg-[#0078D7] hover:bg-[#005a9e] text-white px-5 py-2 rounded-md font-medium flex items-center gap-2 transition-colors cursor-pointer" disabled={eventLoading}>
                  {eventLoading ? "Registrando..." : "Registrar Evento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Evento */}
      {isEditEventModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-card border border-border-custom rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-border-custom bg-bg-subtle">
              <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                <Edit className="w-5 h-5 text-[#0078D7]" />
                Editar Evento
              </h2>
              <button onClick={() => setIsEditEventModalOpen(false)} className="text-text-muted hover:text-text-primary transition-colors cursor-pointer" disabled={editEventLoading}>
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateEvent} className="p-6 space-y-4 text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Fecha y Hora *</label>
                  <input
                    type="datetime-local"
                    value={editEventDate}
                    onChange={e => setEditEventDate(e.target.value)}
                    className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-2.5 text-text-primary focus:border-[#0078D7] outline-none text-sm"
                    required
                    disabled={editEventLoading}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Tipo de Evento *</label>
                  <select
                    value={editEventType}
                    onChange={e => setEditEventType(e.target.value)}
                    className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-2.5 text-text-primary focus:border-[#0078D7] outline-none text-sm"
                    required
                    disabled={editEventLoading}
                  >
                    <option value="Reclamo">Reclamo</option>
                    <option value="Recarga">Recarga</option>
                    <option value="Otros">Otros</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Observaciones / Detalles *</label>
                <textarea
                  value={editEventObservations}
                  onChange={e => setEditEventObservations(e.target.value)}
                  placeholder="Describe los detalles del evento..."
                  rows={4}
                  className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-2.5 text-text-primary focus:border-[#0078D7] outline-none text-sm resize-none"
                  required
                  disabled={editEventLoading}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Archivo Adjunto</label>
                {editEventFileCurrentName && !editEventFileDelete ? (
                  <div className="flex items-center justify-between bg-bg-subtle p-3 rounded-lg border border-border-custom text-xs mb-2">
                    <span className="truncate text-text-secondary">{editEventFileCurrentName}</span>
                    <button
                      type="button"
                      onClick={() => setEditEventFileDelete(true)}
                      className="text-rose-500 hover:text-rose-600 font-semibold cursor-pointer"
                    >
                      Eliminar adjunto
                    </button>
                  </div>
                ) : null}
                
                <div className="border-2 border-dashed border-border-custom hover:border-[#0078D7]/50 rounded-lg p-6 text-center cursor-pointer transition-colors relative">
                  <input
                    type="file"
                    onChange={handleEditFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={editEventLoading}
                  />
                  <div className="flex flex-col items-center justify-center gap-1">
                    <Upload className="w-8 h-8 text-text-muted" />
                    <span className="text-sm font-semibold text-text-primary">
                      {editEventFile ? editEventFile.name : "Subir nuevo archivo"}
                    </span>
                    <span className="text-xs text-text-muted">
                      {editEventFile ? `${(editEventFile.size / 1024).toFixed(1)} KB` : "Reemplazará el archivo actual"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t border-border-custom bg-bg-subtle font-medium text-sm">
                <button type="button" onClick={() => setIsEditEventModalOpen(false)} className="px-5 py-2 rounded-md text-text-secondary hover:bg-bg-subtle border border-border-custom transition-colors cursor-pointer" disabled={editEventLoading}>
                  Cancelar
                </button>
                <button type="submit" className="bg-[#0078D7] hover:bg-[#005a9e] text-white px-5 py-2 rounded-md font-medium flex items-center gap-2 transition-colors cursor-pointer" disabled={editEventLoading}>
                  {editEventLoading ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detalle Evento */}
      {isDetailModalOpen && detailEvent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-card border border-border-custom rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-border-custom bg-bg-subtle">
              <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                <Eye className="w-5 h-5 text-[#0078D7]" />
                Detalle del Evento
              </h2>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-text-muted hover:text-text-primary transition-colors cursor-pointer">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 text-left">
              <div className="grid grid-cols-2 gap-4 bg-bg-subtle p-4 rounded-xl border border-border-custom text-sm">
                <div>
                  <span className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Tipo de Evento</span>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full inline-block uppercase tracking-wider ${
                    detailEvent.tipo === 'Reclamo' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' :
                    detailEvent.tipo === 'Recarga' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                    'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                  }`}>
                    {detailEvent.tipo}
                  </span>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Fecha y Hora</span>
                  <span className="text-text-primary font-medium">
                    {new Date(detailEvent.fecha).toLocaleString("es-AR", { dateStyle: "long", timeStyle: "short" })}
                  </span>
                </div>
              </div>

              <div>
                <span className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Observaciones / Detalles</span>
                <div className="bg-bg-subtle/50 p-5 rounded-lg border border-border-custom text-text-secondary text-sm whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto">
                  {detailEvent.observaciones}
                </div>
              </div>

              {detailEvent.adjuntoUrl && (
                <div>
                  <span className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Archivo Adjunto</span>
                  
                  {/* Vista previa en línea para imágenes */}
                  {/\.(jpg|jpeg|png|webp|gif)$/i.test(detailEvent.adjuntoUrl) && (
                    <div className="mb-3 border border-border-custom rounded-lg overflow-hidden bg-bg-subtle max-h-[220px] flex items-center justify-center p-2">
                      <img
                        src={detailEvent.adjuntoUrl}
                        alt={detailEvent.adjuntoNombre || "Vista previa"}
                        className="max-h-[200px] max-w-full object-contain rounded shadow-sm"
                      />
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-bg-subtle p-4 rounded-lg border border-border-custom text-sm">
                    <div className="flex items-center gap-3 text-text-secondary truncate max-w-full sm:max-w-[50%]">
                      <File className="w-5 h-5 text-text-muted shrink-0" />
                      <span className="truncate">{detailEvent.adjuntoNombre || "Archivo Adjunto"}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={detailEvent.adjuntoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-bg-card hover:bg-bg-subtle border border-border-custom text-text-primary px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 cursor-pointer text-xs transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> Visualizar
                      </a>
                      <a
                        href={detailEvent.adjuntoUrl}
                        download={detailEvent.adjuntoNombre || "archivo"}
                        className="bg-[#0078D7] hover:bg-[#005a9e] text-white px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 cursor-pointer text-xs transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" /> Descargar
                      </a>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-border-custom bg-bg-subtle font-medium text-sm">
                <button type="button" onClick={() => setIsDetailModalOpen(false)} className="px-5 py-2 bg-bg-card hover:bg-bg-subtle border border-border-custom rounded-md text-text-secondary transition-colors cursor-pointer">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
