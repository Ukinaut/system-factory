"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { 
  Users, 
  Search, 
  ChevronRight, 
  Server, 
  Activity, 
  Plus, 
  Trash2, 
  X, 
  AlertCircle,
  Phone,
  Mail,
  MapPin,
  FileText,
  UserPlus,
  ShoppingCart,
  Receipt,
  DollarSign,
  History,
  CheckCircle,
  RefreshCw,
  Building2,
  UserCheck
} from "lucide-react";
import { getClients, createClient, deleteClient, getClientHistory, importXubioClients } from "@/actions/clients";
import { getCurrentUserSession } from "@/actions/users";

export default function ClientesDashboard() {
  const [activeTab, setActiveTab] = useState("directorio");
  const [clientes, setClientes] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [clearedTimestamp, setClearedTimestamp] = useState<string | null>(null);
  
  // Xubio integration state
  const [isXubioOpen, setIsXubioOpen] = useState(false);
  const [xubioId, setXubioId] = useState("947080087399824516296577659589887727462578317642609149428922995227130528588580873994708057061140575");
  const [xubioPass, setXubioPass] = useState("lPVN*1-g*JPQkmEDc8e*bq4Vpc+c9BB0/WT*sUdo9cwyE7lUFK5hkGOMZRTLYlxnXr16VQu2ZofjAH9Tf4Yavgsvg8wq/3svTmr/8vglPVN*1-g*JPQkmEDc8e*bq4Vp");
  const [xubioLoading, setXubioLoading] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [busquedaHistorial, setBusquedaHistorial] = useState("");
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form states
  const [razonSocial, setRazonSocial] = useState("");
  const [cuit, setCuit] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [direccion, setDireccion] = useState("");

  const [loading, setLoading] = useState(true);
  const [filtroPrioridad, setFiltroPrioridad] = useState("TODAS");
  const [filtroTipo, setFiltroTipo] = useState("TODOS");

  const esEmpresa = (c: any) => {
    const condicion = (c.condicionIva || "").toLowerCase();
    const razon = (c.razonSocial || "").toLowerCase();
    const cuitClean = (c.cuit || "").replace(/[^0-9]/g, "");
    return (
      condicion.includes("responsable inscripto") ||
      condicion.includes("exento") ||
      cuitClean.startsWith("30") ||
      cuitClean.startsWith("33") ||
      cuitClean.startsWith("34") ||
      razon.includes("s.a") ||
      razon.includes("s.r.l") ||
      razon.includes("srl") ||
      razon.includes("sociedad") ||
      razon.includes("empresa")
    );
  };

  const totalClientes = clientes.length;
  const empresasCount = clientes.filter(esEmpresa).length;
  const clientesFinalesCount = totalClientes - empresasCount;
  const equiposTotalesActivos = clientes.reduce((acc, c) => acc + (c.equiposActivos || 0), 0);

  // Load clients and history
  const loadData = async () => {
    setLoading(true);
    const res = await getClients();
    if (res.success) {
      setClientes(res.clients || []);
    } else {
      setErrorMsg("No se pudieron cargar los clientes de la base de datos.");
    }

    const histRes = await getClientHistory();
    if (histRes.success) {
      setHistoryItems(histRes.history || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const checkRole = async () => {
      const res = await getCurrentUserSession();
      if (res.success && res.session?.rol === "ADMIN") {
        setIsAdmin(true);
      }
    };
    checkRole();
    if (typeof window !== "undefined") {
      setClearedTimestamp(localStorage.getItem("clientes_historial_borrado_timestamp"));
    }
  }, []);

  // Filter clients
  const clientesFiltrados = clientes.filter(c => {
    const matchesSearch = c.razonSocial.toLowerCase().includes(busqueda.toLowerCase()) || 
                          c.cuit.includes(busqueda) ||
                          (c.correo && c.correo.toLowerCase().includes(busqueda.toLowerCase())) ||
                          (c.provincia && c.provincia.toLowerCase().includes(busqueda.toLowerCase())) ||
                          (c.localidad && c.localidad.toLowerCase().includes(busqueda.toLowerCase()));
    const matchesPriority = filtroPrioridad === "TODAS" || c.prioridad === filtroPrioridad;
    
    let matchesTipo = true;
    if (filtroTipo === "EMPRESAS") {
      matchesTipo = esEmpresa(c);
    } else if (filtroTipo === "FINALES") {
      matchesTipo = !esEmpresa(c);
    }

    return matchesSearch && matchesPriority && matchesTipo;
  });

  // Filter general history
  const historyFiltrado = historyItems.filter(item => {
    if (clearedTimestamp && new Date(item.fecha).getTime() <= new Date(clearedTimestamp).getTime()) {
      return false;
    }
    return item.clienteNombre.toLowerCase().includes(busquedaHistorial.toLowerCase()) ||
      item.clienteCuit.includes(busquedaHistorial) ||
      item.descripcion.toLowerCase().includes(busquedaHistorial.toLowerCase());
  });

  const handleClearHistory = () => {
    if (window.confirm("¿Está seguro de que desea limpiar el historial de actividades de clientes? Esto ocultará los registros anteriores.")) {
      const nowStr = new Date().toISOString();
      localStorage.setItem("clientes_historial_borrado_timestamp", nowStr);
      setClearedTimestamp(nowStr);
    }
  };

  const resetForm = () => {
    setRazonSocial("");
    setCuit("");
    setTelefono("");
    setCorreo("");
    setDireccion("");
    setErrorMsg("");
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!razonSocial || !cuit) {
      setErrorMsg("Razón Social y CUIT son obligatorios.");
      return;
    }

    startTransition(async () => {
      const res = await createClient({
        razonSocial,
        cuit: cuit.trim(),
        telefono: telefono.trim(),
        correo: correo.trim().toLowerCase(),
        direccion: direccion.trim()
      });

      if (res.success) {
        setSuccessMsg("Cliente creado exitosamente.");
        resetForm();
        setIsCreateOpen(false);
        loadData();
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        setErrorMsg(res.error || "Error al crear cliente.");
      }
    });
  };

  const handleDeleteConfirm = () => {
    if (!deletingId) return;

    startTransition(async () => {
      const res = await deleteClient(deletingId);
      if (res.success) {
        setSuccessMsg("Cliente y registros relacionados eliminados.");
        setDeletingId(null);
        loadData();
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        setErrorMsg(res.error || "Error al eliminar cliente.");
        setDeletingId(null);
      }
    });
  };

  const getHistoryIcon = (tipo: string) => {
    switch (tipo) {
      case "CLIENTE_CREADO":
        return <UserPlus className="w-5 h-5 text-emerald-400" />;
      case "COMPRA":
        return <ShoppingCart className="w-5 h-5 text-blue-400" />;
      case "PRESUPUESTO":
        return <FileText className="w-5 h-5 text-amber-400" />;
      case "FACTURA":
        return <Receipt className="w-5 h-5 text-indigo-400" />;
      case "PAGO":
        return <DollarSign className="w-5 h-5 text-green-400" />;
      default:
        return <History className="w-5 h-5 text-text-muted" />;
    }
  };

  const getHistoryTypeLabel = (tipo: string) => {
    switch (tipo) {
      case "CLIENTE_CREADO":
        return "Nuevo Cliente";
      case "COMPRA":
        return "Venta Registrada";
      case "PRESUPUESTO":
        return "Presupuesto";
      case "FACTURA":
        return "Factura Emitida";
      case "PAGO":
        return "Pago Recibido";
      default:
        return "Movimiento";
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-12 relative">
      
      {/* HEADER */}
      <div className="flex justify-between items-end mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-wide flex items-center gap-3 mb-2">
            <Users className="text-[#0078D7] w-8 h-8" />
            C. Clientes (Directorio Maestro)
          </h1>
          <p className="text-text-muted">Gestione perfiles, equipos asignados, consumos y consulte el historial cronológico de movimientos.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsXubioOpen(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-md font-bold transition-all shadow-lg shadow-emerald-600/20 cursor-pointer"
          >
            <RefreshCw className="w-5 h-5" />
            Importar Xubio
          </button>
          <button
            onClick={() => { resetForm(); setIsCreateOpen(true); }}
            className="flex items-center gap-2 bg-[#0078D7] hover:bg-[#005a9e] text-white px-5 py-3 rounded-md font-bold transition-all shadow-lg shadow-[#0078D7]/20 cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            Registrar Cliente
          </button>
        </div>
      </div>

      {/* MINI DASHBOARD DE MÉTRICAS KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 mb-8">
        {/* Total Clientes */}
        <div className="bg-bg-card p-5 rounded-xl border border-border-custom shadow-md flex items-center justify-between hover:border-[#0078D7]/60 transition-all">
          <div>
            <p className="text-text-muted text-[11px] font-bold uppercase tracking-wider mb-1">Total Clientes</p>
            <h3 className="text-3xl font-extrabold text-text-primary">{totalClientes.toLocaleString("es-AR")}</h3>
          </div>
          <div className="w-12 h-12 bg-[#0078D7]/10 text-[#0078D7] rounded-xl flex items-center justify-center border border-[#0078D7]/20">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Empresas / PymEs */}
        <div className="bg-bg-card p-5 rounded-xl border border-border-custom shadow-md flex items-center justify-between hover:border-emerald-500/60 transition-all">
          <div>
            <p className="text-text-muted text-[11px] font-bold uppercase tracking-wider mb-1">Empresas / PymEs</p>
            <h3 className="text-3xl font-extrabold text-emerald-400">{empresasCount.toLocaleString("es-AR")}</h3>
          </div>
          <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-500/20">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        {/* Clientes Finales */}
        <div className="bg-bg-card p-5 rounded-xl border border-border-custom shadow-md flex items-center justify-between hover:border-purple-500/60 transition-all">
          <div>
            <p className="text-text-muted text-[11px] font-bold uppercase tracking-wider mb-1">Clientes Finales</p>
            <h3 className="text-3xl font-extrabold text-purple-400">{clientesFinalesCount.toLocaleString("es-AR")}</h3>
          </div>
          <div className="w-12 h-12 bg-purple-500/10 text-purple-400 rounded-xl flex items-center justify-center border border-purple-500/20">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Equipos Activos */}
        <div className="bg-bg-card p-5 rounded-xl border border-border-custom shadow-md flex items-center justify-between hover:border-indigo-500/60 transition-all">
          <div>
            <p className="text-text-muted text-[11px] font-bold uppercase tracking-wider mb-1">Equipos Activos</p>
            <h3 className="text-3xl font-extrabold text-indigo-400">{equiposTotalesActivos.toLocaleString("es-AR")}</h3>
          </div>
          <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center border border-indigo-500/20">
            <Server className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="flex border-b border-border-custom mb-6">
        <button 
          onClick={() => setActiveTab("directorio")}
          className={`px-6 py-3 font-semibold text-sm tracking-wider uppercase transition-colors cursor-pointer ${activeTab === 'directorio' ? 'text-[#0078D7] border-b-2 border-[#0078D7]' : 'text-text-muted hover:text-text-primary'}`}
        >
          Directorio de Clientes
        </button>
        <button 
          onClick={() => setActiveTab("historial")}
          className={`px-6 py-3 font-semibold text-sm tracking-wider uppercase transition-colors flex items-center gap-2 cursor-pointer ${activeTab === 'historial' ? 'text-[#0078D7] border-b-2 border-[#0078D7]' : 'text-text-muted hover:text-text-primary'}`}
        >
          <History className="w-4 h-4" />
          Historial General de Actividades
        </button>
      </div>

      {/* FEEDBACK BANNERS */}
      {successMsg && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg flex items-center gap-3 animate-fade-in animate-duration-200">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg flex items-center gap-3 animate-fade-in animate-duration-200">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">{errorMsg}</span>
        </div>
      )}

      {/* TAB 1: LISTADO DE CLIENTES */}
      {activeTab === "directorio" && (
        <div className="bg-bg-card rounded-xl shadow-lg border border-border-custom overflow-hidden">
          {/* Search Bar */}
          <div className="p-6 border-b border-border-custom bg-bg-subtle flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="w-5 h-5 absolute left-3 top-3.5 text-gray-500" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full bg-bg-card border border-border-custom rounded-md pl-10 pr-4 py-3 text-text-primary placeholder-gray-500 focus:border-[#0078D7] outline-none transition-colors text-sm"
                placeholder="Buscar por Razón Social, CUIT, Email o Ubicación..."
              />
            </div>
            
            <div className="flex items-center gap-3 shrink-0 w-full md:w-auto justify-end flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-text-muted font-bold uppercase tracking-wider whitespace-nowrap">Tipo:</span>
                <select
                  value={filtroTipo}
                  onChange={(e) => setFiltroTipo(e.target.value)}
                  className={`px-3 py-2.5 rounded-md border font-bold uppercase cursor-pointer outline-none bg-bg-card text-xs border-border-custom ${
                    filtroTipo === "EMPRESAS" ? "text-emerald-400 border-emerald-500/30" :
                    filtroTipo === "FINALES" ? "text-purple-400 border-purple-500/30" :
                    "text-text-primary"
                  }`}
                >
                  <option value="TODOS" className="bg-bg-card text-text-primary font-bold">TODOS</option>
                  <option value="EMPRESAS" className="bg-bg-card text-emerald-400 font-bold">Empresas / PymEs</option>
                  <option value="FINALES" className="bg-bg-card text-purple-400 font-bold">Clientes Finales</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-text-muted font-bold uppercase tracking-wider whitespace-nowrap">Prioridad:</span>
                <select
                  value={filtroPrioridad}
                  onChange={(e) => setFiltroPrioridad(e.target.value)}
                  className={`px-3 py-2.5 rounded-md border font-bold uppercase cursor-pointer outline-none bg-bg-card text-xs border-border-custom ${
                    filtroPrioridad === "ALTA" ? "text-rose-500 border-rose-500/30" :
                    filtroPrioridad === "MEDIA" ? "text-amber-500 border-amber-500/30" :
                    filtroPrioridad === "BAJA" ? "text-emerald-500 border-emerald-500/30" :
                    "text-text-primary"
                  }`}
                >
                  <option value="TODAS" className="bg-bg-card text-text-primary font-bold">TODAS</option>
                  <option value="ALTA" className="bg-bg-card text-rose-500 font-bold">Alta Prioridad</option>
                  <option value="MEDIA" className="bg-bg-card text-amber-500 font-bold">Prioridad Media</option>
                  <option value="BAJA" className="bg-bg-card text-emerald-500 font-bold">Baja Prioridad</option>
                </select>
              </div>
            </div>
          </div>

          {/* Clients List */}
          <div className="divide-y divide-border-custom">
            {loading ? (
              <div className="p-12 text-center text-text-muted">Cargando clientes...</div>
            ) : clientesFiltrados.length === 0 ? (
              <div className="p-12 text-center text-text-muted">
                No se encontraron clientes en el sistema.
              </div>
            ) : (
              clientesFiltrados.map((cliente) => (
                <div key={cliente.id} className="p-6 hover:bg-bg-subtle/50 transition-colors flex flex-col md:flex-row items-center justify-between gap-6">
                  
                  <div className="flex-1 min-w-0 text-left w-full">
                    <h3 className="text-xl font-bold text-text-primary tracking-wide mb-1 truncate">{cliente.razonSocial}</h3>
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <p className="text-text-muted font-mono font-bold">{cliente.tipoIdentificacion || 'CUIT'}: {cliente.cuit}</p>
                      {cliente.condicionIva && (
                        <span className="px-2 py-0.5 bg-bg-subtle text-text-secondary rounded font-medium border border-border-custom text-[11px]">
                          {cliente.condicionIva}
                        </span>
                      )}
                      {(cliente.localidad || cliente.provincia) && (
                        <span className="px-2 py-0.5 bg-bg-subtle text-text-muted rounded font-medium border border-border-custom text-[11px]">
                          📍 {[cliente.localidad, cliente.provincia].filter(Boolean).join(", ")}
                        </span>
                      )}
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                        cliente.prioridad === "ALTA" ? "bg-rose-500/10 text-rose-500 border-rose-500/30" :
                        cliente.prioridad === "MEDIA" ? "bg-amber-500/10 text-amber-500 border-amber-500/30" :
                        "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                      }`}>
                        Prioridad {cliente.prioridad === "ALTA" ? "Alta" : cliente.prioridad === "MEDIA" ? "Media" : "Baja"}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-4 shrink-0 flex-wrap sm:flex-nowrap w-full md:w-auto justify-start md:justify-end">
                    <div className="flex items-center gap-3 bg-bg-subtle px-4 py-2 rounded-lg border border-border-custom">
                      <Server className="w-5 h-5 text-indigo-400" />
                      <div className="text-left">
                        <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Equipos</p>
                        <p className="text-text-primary font-bold text-sm">
                          {cliente.equiposActivos} <span className="text-xs font-normal text-text-muted">activos</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 bg-bg-subtle px-4 py-2 rounded-lg border border-border-custom">
                      <Activity className="w-5 h-5 text-emerald-400" />
                      <div className="text-left">
                        <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Tráfico (GB)</p>
                        <p className="text-text-primary font-bold text-sm">
                          {cliente.gigasUsados} <span className="text-xs font-normal text-text-muted">/ {cliente.gigasTotales} GB</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
                    <Link 
                      href={`/clientes/${cliente.id}`} 
                      className="flex items-center gap-2 bg-[#0078D7]/10 hover:bg-[#0078D7] text-[#0078D7] hover:text-white px-5 py-2.5 rounded-md font-bold transition-all border border-[#0078D7]/30 hover:border-transparent text-sm"
                    >
                      Ver Perfil
                      <ChevronRight className="w-4 h-4" />
                    </Link>

                    <button
                      onClick={() => setDeletingId(cliente.id)}
                      className="p-2.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 hover:border-transparent rounded-md transition-all cursor-pointer"
                      title="Eliminar cliente y registros"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: HISTORIAL CRONOLOGICO GENERAL */}
      {activeTab === "historial" && (
        <div className="bg-bg-card rounded-xl shadow-lg border border-border-custom overflow-hidden animate-in fade-in duration-200">
          
          {/* Search Bar Historial */}
          <div className="p-6 border-b border-border-custom bg-bg-subtle flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="w-5 h-5 absolute left-3 top-3.5 text-gray-500" />
              <input
                type="text"
                value={busquedaHistorial}
                onChange={(e) => setBusquedaHistorial(e.target.value)}
                className="w-full bg-bg-card border border-border-custom rounded-md pl-10 pr-4 py-3 text-text-primary placeholder-gray-500 focus:border-[#0078D7] outline-none transition-colors"
                placeholder="Buscar por Cliente, CUIT/DNI, o Tipo de movimiento..."
              />
            </div>
            {isAdmin && (
              <button
                onClick={handleClearHistory}
                disabled={historyFiltrado.length === 0}
                className="px-4 py-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 shrink-0 disabled:opacity-40 cursor-pointer w-full sm:w-auto justify-center"
              >
                <Trash2 className="w-4 h-4" />
                Borrar Historial
              </button>
            )}
          </div>

          {/* Timeline List */}
          <div className="p-6">
            {loading ? (
              <div className="py-12 text-center text-text-muted">Cargando historial de movimientos...</div>
            ) : historyFiltrado.length === 0 ? (
              <div className="py-12 text-center text-text-muted">No se encontraron movimientos registrados en el historial.</div>
            ) : (
              <div className="relative border-l-2 border-border-custom ml-4 pl-6 space-y-8 text-left">
                {historyFiltrado.map((item) => (
                  <div key={item.id} className="relative group">
                    {/* Circle icon on the timeline */}
                    <div className="absolute -left-[35px] top-0 bg-bg-card border-2 border-border-custom group-hover:border-[#0078D7] p-1.5 rounded-full transition-colors z-10 shadow-sm">
                      {getHistoryIcon(item.tipo)}
                    </div>
                    
                    <div className="bg-bg-subtle/50 hover:bg-bg-subtle p-5 rounded-lg border border-border-custom transition-all shadow-md">
                      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-text-primary bg-bg-card px-2.5 py-1 rounded-full border border-border-custom uppercase">
                            {getHistoryTypeLabel(item.tipo)}
                          </span>
                          <span className="text-xs text-text-muted font-mono">{new Date(item.fecha).toLocaleString()}</span>
                        </div>
                        {item.monto !== undefined && (
                          <span className="text-sm font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-md">
                            {item.moneda === "USD" ? "US$" : "$"} {item.monto.toLocaleString()}
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-text-primary text-base">{item.clienteNombre}</h4>
                      <p className="text-xs text-text-muted font-mono mt-0.5 mb-2">CUIT: {item.clienteCuit}</p>
                      <p className="text-sm text-text-secondary">{item.descripcion}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in animate-duration-200">
          <div className="bg-bg-card border border-border-custom max-w-lg w-full rounded-xl shadow-2xl overflow-hidden">
            
            <div className="p-6 border-b border-border-custom bg-bg-subtle flex justify-between items-center">
              <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                <Users className="w-5 h-5 text-[#0078D7]" /> Registrar Nuevo Cliente
              </h2>
              <button 
                onClick={() => setIsCreateOpen(false)}
                className="p-1.5 hover:bg-bg-subtle rounded text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 text-left">
              
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Razón Social *</label>
                <input
                  type="text"
                  required
                  value={razonSocial}
                  onChange={e => setRazonSocial(e.target.value)}
                  placeholder="Ej: Minera Andina S.A."
                  className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-2.5 text-sm text-text-primary focus:border-[#0078D7] outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">CUIT / DNI (con guiones) *</label>
                <input
                  type="text"
                  required
                  value={cuit}
                  onChange={e => setCuit(e.target.value)}
                  placeholder="Ej: 30-98765432-1 o 20-12345678-9"
                  className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-2.5 text-sm text-text-primary focus:border-[#0078D7] outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Teléfono de Contacto</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-4 w-4 text-gray-500" />
                    </span>
                    <input
                      type="text"
                      value={telefono}
                      onChange={e => setTelefono(e.target.value)}
                      placeholder="+54 11 5555-5555"
                      className="w-full bg-bg-subtle border border-border-custom rounded-md pl-9 pr-4 py-2 text-sm text-text-primary focus:border-[#0078D7] outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Correo Electrónico</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-gray-500" />
                    </span>
                    <input
                      type="email"
                      value={correo}
                      onChange={e => setCorreo(e.target.value)}
                      placeholder="contacto@empresa.com"
                      className="w-full bg-bg-subtle border border-border-custom rounded-md pl-9 pr-4 py-2 text-sm text-text-primary focus:border-[#0078D7] outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Dirección Fiscal / Operativa</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-4 w-4 text-gray-500" />
                  </span>
                  <input
                    type="text"
                    value={direccion}
                    onChange={e => setDireccion(e.target.value)}
                    placeholder="Av. General Paz 1234, CABA"
                    className="w-full bg-bg-subtle border border-border-custom rounded-md pl-9 pr-4 py-2 text-sm text-text-primary focus:border-[#0078D7] outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="border-t border-border-custom pt-6 flex justify-end gap-3 font-medium">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-5 py-2 bg-transparent border border-border-custom hover:bg-bg-subtle text-text-secondary rounded-md text-sm transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-6 py-2 bg-[#0078D7] hover:bg-[#005a9e] disabled:opacity-50 text-white rounded-md text-sm font-bold transition-colors cursor-pointer"
                >
                  {isPending ? "Registrando..." : "Registrar"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deletingId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in animate-duration-200">
          <div className="bg-bg-card border border-border-custom max-w-md w-full rounded-xl p-6 shadow-2xl space-y-6 text-left">
            <div className="flex items-center gap-4 text-red-500">
              <AlertCircle className="w-10 h-10 shrink-0" />
              <div>
                <h3 className="text-lg font-bold text-text-primary">¿Eliminar Cliente Completo?</h3>
                <p className="text-sm text-text-muted mt-1">
                  Esta acción eliminará de forma permanente al cliente y **todos** sus registros asociados (Ventas, Presupuestos, Reclamos, Servicios y Equipos asignados). No se puede deshacer.
                </p>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-2 font-medium">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 bg-transparent hover:bg-bg-subtle text-text-secondary rounded-md text-sm border border-border-custom transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isPending}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-bold transition-colors cursor-pointer"
              >
                Eliminar Todo
              </button>
            </div>
          </div>
        </div>
      )}
      {/* XUBIO IMPORT MODAL */}
      {isXubioOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in animate-duration-200">
          <div className="bg-bg-card border border-border-custom max-w-lg w-full rounded-xl shadow-2xl overflow-hidden">
            
            <div className="p-6 border-b border-border-custom bg-bg-subtle flex justify-between items-center">
              <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                <RefreshCw className={`w-5 h-5 text-emerald-500 ${xubioLoading ? 'animate-spin' : ''}`} /> Importar Clientes de Xubio
              </h2>
              <button 
                onClick={() => setIsXubioOpen(false)}
                className="p-1.5 hover:bg-bg-subtle rounded text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                disabled={xubioLoading}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Client ID de Xubio</label>
                <input
                  type="text"
                  value={xubioId}
                  onChange={e => setXubioId(e.target.value)}
                  placeholder="Ingrese el Client ID"
                  disabled={xubioLoading}
                  className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-2.5 text-sm text-text-primary focus:border-[#0078D7] outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Secret ID de Xubio</label>
                <textarea
                  value={xubioPass}
                  onChange={e => setXubioPass(e.target.value)}
                  placeholder="Ingrese el Secret ID / Password"
                  disabled={xubioLoading}
                  rows={4}
                  className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-2.5 text-sm text-text-primary focus:border-[#0078D7] outline-none transition-colors font-mono"
                />
              </div>

              <div className="border-t border-border-custom pt-6 flex justify-end gap-3 font-medium">
                <button
                  type="button"
                  onClick={() => setIsXubioOpen(false)}
                  disabled={xubioLoading}
                  className="px-5 py-2 bg-transparent border border-border-custom hover:bg-bg-subtle text-text-secondary rounded-md text-sm transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    setXubioLoading(true);
                    setErrorMsg("");
                    setSuccessMsg("");
                    try {
                      let res = await importXubioClients(xubioId.trim(), xubioPass.trim());
                      
                      // Si falla por invalid_client, intentar recortar el duplicado al final por las dudas
                      if (!res.success && res.error?.includes("invalid_client") && xubioPass.endsWith("lPVN*1-g*JPQkmEDc8e*bq4Vp")) {
                        console.log("Fallo por invalid_client. Intentando con contraseña recortada...");
                        const recortada = xubioPass.replace(/lPVN\*1-g\*JPQkmEDc8e\*bq4Vp$/, "");
                        res = await importXubioClients(xubioId.trim(), recortada.trim());
                      }

                      if (res.success) {
                        setSuccessMsg(`Se importaron/actualizaron ${res.count} clientes desde Xubio.`);
                        setIsXubioOpen(false);
                        loadData();
                      } else {
                        setErrorMsg(res.error || "Error al importar clientes de Xubio.");
                      }
                    } catch (err: any) {
                      setErrorMsg(err.message || "Error al conectar con la API de Xubio.");
                    } finally {
                      setXubioLoading(false);
                    }
                  }}
                  disabled={xubioLoading || !xubioId || !xubioPass}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-md text-sm font-bold transition-colors cursor-pointer"
                >
                  {xubioLoading ? "Importando..." : "Iniciar Importación"}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
