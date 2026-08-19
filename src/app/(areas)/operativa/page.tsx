"use client";

import React, { useState, useEffect } from "react";
import { Server, Activity, Search, ShieldAlert, WifiOff, Globe, Play, Pause, ChevronDown, ChevronRight, Users, Plus, Trash2, Edit2, Save, X, Cpu, Network, Wifi, MapPin, Truck } from "lucide-react";
import { getEquiposYServicios, toggleEquipoEstado } from "@/actions/operativa";
import { getProducts, createProduct, updateProduct, deleteProduct } from "@/actions/products";
import { getCountries, getSelectedCountry } from "@/actions/countries";
import { getProviders, createProvider, updateProvider, deleteProvider } from "@/actions/providers";

export default function OperativaDashboard() {
  const [activeTab, setActiveTab] = useState("monitoreo");
  const [busqueda, setBusqueda] = useState("");
  const [filtroProveedor, setFiltroProveedor] = useState("Todos");
  const [clientesExpandidos, setClientesExpandidos] = useState<Record<string, boolean>>({});
  const [clientes, setClientes] = useState<any[]>([]);
  
  // Servicios & Packs states
  const [servicios, setServicios] = useState<any[]>([]);
  const [paises, setPaises] = useState<any[]>([]);
  const [activeCountryCode, setActiveCountryCode] = useState<string | null>(null);
  
  // Proveedores states
  const [proveedores, setProveedores] = useState<any[]>([]);

  // Loading and Modal states
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"CREATE" | "EDIT" | "CREATE_PROVIDER" | "EDIT_PROVIDER" | null>(null);
  
  // Form states
  const [formService, setFormService] = useState({
    id: "",
    nombre: "",
    tipo: "SERVICIO_GPS", // "SERVICIO_GPS" | "SERVICIO_RED" | "PACK_INTERNET"
    gigas: 50,
    countryId: ""
  });

  const [formProvider, setFormProvider] = useState({
    id: "",
    nombre: "",
    servicioBrindado: ""
  });

  const loadData = async () => {
    setLoading(true);
    // Cargar equipos y monitoreo
    const res = await getEquiposYServicios();
    if (res.success) {
      setClientes(res.clientes || []);
    }

    // Cargar productos de tipo servicio/pack
    const prodRes = await getProducts();
    if (prodRes.success) {
      const filtered = (prodRes.products || []).filter(
        (p: any) => p.tipo === "SERVICIO" || p.tipo === "SERVICIO_GPS" || p.tipo === "SERVICIO_RED" || p.tipo === "PACK_INTERNET"
      );
      setServicios(filtered);
    }

    // Cargar países
    const countriesRes = await getCountries();
    if (countriesRes.success) {
      setPaises(countriesRes.countries || []);
    }

    // Cargar proveedores
    const providersRes = await getProviders();
    if (providersRes.success) {
      setProveedores(providersRes.providers || []);
    }

    const currentCountry = await getSelectedCountry();
    setActiveCountryCode(currentCountry);

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleEstado = async (id: string, estadoActual: string) => {
    const nuevoEstado = estadoActual === "Activo" ? "Suspendido" : "Activo";
    const res = await toggleEquipoEstado(id, nuevoEstado);
    if (res.success) {
      loadData();
    } else {
      alert("Error al cambiar estado del equipo.");
    }
  };

  const toggleClienteExpandido = (clienteId: string) => {
    setClientesExpandidos(prev => ({
      ...prev,
      [clienteId]: !prev[clienteId]
    }));
  };

  // Guardar creación o edición de servicios/packs
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let res;
    if (modalType === "CREATE") {
      res = await createProduct({
        tipo: formService.tipo,
        nombre: formService.nombre,
        cantidad: formService.tipo === "PACK_INTERNET" ? Number(formService.gigas) : 0,
        alertaMinima: 0,
        alertaCritica: 0,
        countryId: formService.countryId || undefined
      });
    } else {
      res = await updateProduct({
        id: formService.id,
        nombre: formService.nombre,
        tipo: formService.tipo,
        alertaMinima: 0,
        alertaCritica: 0,
        countryId: formService.countryId || undefined
      });
      // Actualizar la cantidad por separado si es un pack
      if (res.success && formService.tipo === "PACK_INTERNET") {
        const prevProduct = servicios.find(s => s.id === formService.id);
        const difference = Number(formService.gigas) - (prevProduct?.cantidad || 0);
        if (difference !== 0) {
          const { adjustProductStock } = await import("@/actions/products");
          await adjustProductStock({
            id: formService.id,
            tipo: difference > 0 ? "Entrada" : "Salida",
            cantidad: Math.abs(difference),
            justificacion: "Ajuste de capacidad de GB en pack de internet",
            usuario: "Sistema"
          });
        }
      }
    }

    setLoading(false);
    if (res.success) {
      alert(modalType === "CREATE" ? "Servicio/Pack creado con éxito." : "Servicio/Pack actualizado con éxito.");
      setIsModalOpen(false);
      loadData();
    } else {
      alert("Error al guardar: " + res.error);
    }
  };

  // Guardar creación o edición de proveedores
  const handleSaveProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let res;
    if (modalType === "CREATE_PROVIDER") {
      res = await createProvider({
        nombre: formProvider.nombre,
        servicioBrindado: formProvider.servicioBrindado
      });
    } else {
      res = await updateProvider({
        id: formProvider.id,
        nombre: formProvider.nombre,
        servicioBrindado: formProvider.servicioBrindado
      });
    }

    setLoading(false);
    if (res.success) {
      alert(modalType === "CREATE_PROVIDER" ? "Proveedor creado con éxito." : "Proveedor actualizado con éxito.");
      setIsModalOpen(false);
      loadData();
    } else {
      alert("Error al guardar: " + res.error);
    }
  };

  // Eliminar un servicio o pack
  const handleDeleteService = async (id: string, nombre: string) => {
    if (confirm(`¿Está seguro de que desea eliminar "${nombre}"?`)) {
      setLoading(true);
      const res = await deleteProduct(id);
      setLoading(false);
      if (res.success) {
        alert("Eliminado con éxito.");
        loadData();
      } else {
        alert("Error al eliminar: " + res.error);
      }
    }
  };

  // Eliminar un proveedor
  const handleDeleteProvider = async (id: string, nombre: string) => {
    if (confirm(`¿Está seguro de que desea eliminar el proveedor "${nombre}"?`)) {
      setLoading(true);
      const res = await deleteProvider(id);
      setLoading(false);
      if (res.success) {
        alert("Proveedor eliminado con éxito.");
        loadData();
      } else {
        alert("Error al eliminar proveedor: " + res.error);
      }
    }
  };

  const openModal = (type: "CREATE" | "EDIT" | "CREATE_PROVIDER" | "EDIT_PROVIDER", item?: any) => {
    setModalType(type);
    if (type === "EDIT" && item) {
      setFormService({
        id: item.id,
        nombre: item.nombre,
        tipo: item.tipo === "SERVICIO" ? "SERVICIO_GPS" : item.tipo,
        gigas: item.tipo === "PACK_INTERNET" ? item.cantidad : 50,
        countryId: item.countryId || ""
      });
    } else if (type === "EDIT_PROVIDER" && item) {
      setFormProvider({
        id: item.id,
        nombre: item.nombre,
        servicioBrindado: item.servicioBrindado
      });
    } else if (type === "CREATE_PROVIDER") {
      setFormProvider({
        id: "",
        nombre: "",
        servicioBrindado: ""
      });
    } else {
      const defaultCountry = paises.find(p => p.code === activeCountryCode);
      setFormService({
        id: "",
        nombre: "",
        tipo: "SERVICIO_GPS",
        gigas: 50,
        countryId: defaultCountry?.id || ""
      });
    }
    setIsModalOpen(true);
  };

  // Filtrar equipos por búsqueda y proveedor
  const clientesFiltrados = clientes.map(c => {
    const equiposFiltrados = (c.equipos || []).filter((e: any) => {
      const coincideBusqueda = c.razonSocial.toLowerCase().includes(busqueda.toLowerCase()) || 
                              e.identificadorServicio.toLowerCase().includes(busqueda.toLowerCase());
      const coincideProveedor = filtroProveedor === "Todos" || e.proveedor === filtroProveedor;
      return coincideBusqueda && coincideProveedor;
    });

    return {
      ...c,
      equiposFiltrados,
    };
  }).filter(c => c.equiposFiltrados.length > 0);

  // Calcular métricas de equipos
  let totalNodos = 0;
  let activosNodos = 0;
  let suspendidosNodos = 0;
  let alertasNodos = 0;

  clientes.forEach(c => {
    (c.equipos || []).forEach((e: any) => {
      totalNodos++;
      if (e.estado === "Activo") activosNodos++;
      else if (e.estado === "Suspendido") suspendidosNodos++;
      else alertasNodos++;
    });
  });

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-wide flex items-center gap-3 mb-2">
            <Activity className="text-blue-500 w-8 h-8" />
            F. Centro de Control Operativo
          </h1>
          <p className="text-text-muted">Monitoreo global de nodos, tráfico de datos y gestión de conectividad, servicios y proveedores.</p>
        </div>
        {activeTab === "servicios" && (
          <button 
            onClick={() => openModal("CREATE")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-md font-medium transition-colors flex items-center gap-2 cursor-pointer text-sm"
          >
            <Plus className="w-5 h-5" /> Nuevo Servicio / Pack
          </button>
        )}
        {activeTab === "proveedores" && (
          <button 
            onClick={() => openModal("CREATE_PROVIDER")}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-md font-medium transition-colors flex items-center gap-2 cursor-pointer text-sm"
          >
            <Plus className="w-5 h-5" /> Nuevo Proveedor
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-custom mb-6 justify-between items-center pr-2">
        <div className="flex">
          <button 
            onClick={() => setActiveTab("monitoreo")}
            className={`px-6 py-3 font-semibold text-sm tracking-wider uppercase transition-colors flex items-center gap-2 cursor-pointer ${activeTab === 'monitoreo' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-text-muted hover:text-text-primary'}`}
          >
            Centro de Control
          </button>
          <button 
            onClick={() => setActiveTab("servicios")}
            className={`px-6 py-3 font-semibold text-sm tracking-wider uppercase transition-colors flex items-center gap-2 cursor-pointer ${activeTab === 'servicios' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-text-muted hover:text-text-primary'}`}
          >
            Servicios & Packs de Internet
          </button>
          <button 
            onClick={() => setActiveTab("proveedores")}
            className={`px-6 py-3 font-semibold text-sm tracking-wider uppercase transition-colors flex items-center gap-2 cursor-pointer ${activeTab === 'proveedores' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-text-muted hover:text-text-primary'}`}
          >
            Proveedores
          </button>
        </div>
      </div>

      {/* TAB 1: CENTRO DE MONITOREO */}
      {activeTab === "monitoreo" && (
        <>
          {/* Tarjetas de Métricas Globales */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-bg-card border border-border-custom rounded-xl p-6 shadow-lg">
              <div className="flex items-center gap-4 mb-2">
                <div className="bg-blue-500/10 p-3 rounded-lg"><Globe className="w-6 h-6 text-blue-500" /></div>
                <p className="text-text-muted font-semibold uppercase tracking-wider text-xs">Nodos Totales</p>
              </div>
              <p className="text-3xl font-bold text-text-primary pl-16">{totalNodos}</p>
            </div>
            
            <div className="bg-bg-card border border-border-custom rounded-xl p-6 shadow-lg">
              <div className="flex items-center gap-4 mb-2">
                <div className="bg-emerald-500/10 p-3 rounded-lg"><Activity className="w-6 h-6 text-emerald-500" /></div>
                <p className="text-text-muted font-semibold uppercase tracking-wider text-xs">Operativos</p>
              </div>
              <p className="text-3xl font-bold text-text-primary pl-16">{activosNodos}</p>
            </div>

            <div className="bg-bg-card border border-amber-500/30 rounded-xl p-6 shadow-lg shadow-amber-900/10">
              <div className="flex items-center gap-4 mb-2">
                <div className="bg-amber-500/10 p-3 rounded-lg"><ShieldAlert className="w-6 h-6 text-amber-500" /></div>
                <p className="text-text-muted font-semibold uppercase tracking-wider text-xs">Alertas de Tráfico</p>
              </div>
              <p className="text-3xl font-bold text-amber-500 pl-16">{alertasNodos}</p>
            </div>

            <div className="bg-bg-card border border-red-500/30 rounded-xl p-6 shadow-lg shadow-red-900/10">
              <div className="flex items-center gap-4 mb-2">
                <div className="bg-red-500/10 p-3 rounded-lg"><WifiOff className="w-6 h-6 text-red-500" /></div>
                <p className="text-text-muted font-semibold uppercase tracking-wider text-xs">Suspendidos</p>
              </div>
              <p className="text-3xl font-bold text-red-500 pl-16">{suspendidosNodos}</p>
            </div>
          </div>

          <div className="bg-bg-card rounded-xl border border-border-custom shadow-xl overflow-hidden">
            {/* Barra de Filtros */}
            <div className="p-6 border-b border-border-custom bg-bg-subtle flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="w-5 h-5 absolute left-3 top-3.5 text-gray-500" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full bg-bg-card border border-border-custom rounded-md pl-10 pr-4 py-3 text-text-primary focus:border-blue-500 outline-none transition-colors"
                  placeholder="Buscar por ID de Equipo o Cliente..."
                />
              </div>
              <select
                value={filtroProveedor}
                onChange={(e) => setFiltroProveedor(e.target.value)}
                className="bg-bg-card border border-border-custom rounded-md px-4 py-3 text-text-primary focus:border-blue-500 outline-none appearance-none min-w-[200px]"
              >
                <option value="Todos">Todos los Proveedores</option>
                <option value="Telespazio">Telespazio</option>
                <option value="Telefónica">Telefónica</option>
                <option value="Ale MC">Ale MC</option>
              </select>
            </div>

            {/* Listado Agrupado por Cliente */}
            <div className="divide-y divide-border-custom">
              {clientesFiltrados.length > 0 ? (
                clientesFiltrados.map((c) => {
                  const nodos = c.equiposFiltrados;
                  const totalAsignados = nodos.reduce((sum: number, nodo: any) => sum + (nodo.gigasAsignados || 0), 0);
                  const totalConsumidos = nodos.reduce((sum: number, nodo: any) => sum + (nodo.gigasConsumidos || 0), 0);
                  const totalRestantes = Math.max(0, totalAsignados - totalConsumidos);

                  return (
                    <div key={c.id} className="bg-bg-card border-b border-border-custom last:border-b-0">
                      {/* Cabecera del Cliente (Acordeón) */}
                      <div 
                        className="p-4 bg-bg-subtle hover:bg-bg-card cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between transition-colors border-l-4 border-l-blue-500 gap-4"
                        onClick={() => toggleClienteExpandido(c.id)}
                      >
                        <div className="flex items-center gap-3">
                          {clientesExpandidos[c.id] ? (
                            <ChevronDown className="w-5 h-5 text-text-muted" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-text-muted" />
                          )}
                          <Users className="w-5 h-5 text-blue-500" />
                          <h3 className="font-bold text-lg text-text-primary tracking-wide">{c.razonSocial}</h3>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4 md:gap-6 pl-8 md:pl-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-text-muted font-semibold uppercase tracking-wider">Asignado:</span>
                            <span className="text-sm font-bold text-text-primary">{totalAsignados} GB</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-text-muted font-semibold uppercase tracking-wider">Consumido:</span>
                            <span className="text-sm font-bold text-red-400">{totalConsumidos} GB</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-text-muted font-semibold uppercase tracking-wider">Restante:</span>
                            <span className="text-sm font-bold text-emerald-500">{totalRestantes} GB</span>
                          </div>
                          <div className="h-4 w-px bg-border-custom hidden md:block"></div>
                          <span className="text-sm font-semibold text-text-muted bg-bg-card px-3 py-1 rounded-full border border-border-custom">
                            {nodos.length} {nodos.length === 1 ? 'Equipo' : 'Equipos'}
                          </span>
                        </div>
                      </div>

                      {/* Tabla de Equipos del Cliente */}
                      {clientesExpandidos[c.id] && (
                        <div className="overflow-x-auto bg-bg-subtle border-t border-border-custom">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-border-custom text-xs uppercase tracking-wider text-text-muted font-semibold">
                                <th className="p-3 pl-12 w-32">Estado</th>
                                <th className="p-3">Identificador</th>
                                <th className="p-3">Ubicación</th>
                                <th className="p-3">Proveedor</th>
                                <th className="p-3 min-w-[150px]">Tráfico (GB)</th>
                                <th className="p-3 text-center w-24">Acciones</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border-custom">
                              {nodos.map((nodo: any) => (
                                <tr key={nodo.id} className="hover:bg-bg-card transition-colors group">
                                  <td className="p-3 pl-12">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] uppercase font-bold border ${
                                      nodo.estado === 'Activo' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 
                                      'bg-red-500/10 text-red-400 border-red-500/30'
                                    }`}>
                                      <span className={`w-1.5 h-1.5 rounded-full ${nodo.estado === 'Activo' ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                                      {nodo.estado}
                                    </span>
                                  </td>
                                  <td className="p-3">
                                    <div className="flex items-center gap-3">
                                      <Server className={`w-4 h-4 ${nodo.marca === 'Starlink' ? 'text-indigo-400' : 'text-orange-400'}`} />
                                      <div>
                                        <p className="font-bold text-text-primary text-sm tracking-wide">{nodo.identificadorServicio}</p>
                                        <p className="text-[10px] text-text-muted uppercase">{nodo.marca} {nodo.modelo}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-3">
                                    <p className="text-sm text-text-secondary">{nodo.localidad || "Sin especificar"}, {nodo.provincia || ""}</p>
                                  </td>
                                  <td className="p-3">
                                    <span className="bg-bg-subtle text-text-secondary px-3 py-1 rounded-md text-xs font-medium border border-border-custom">
                                      {nodo.proveedor || "Directo"}
                                    </span>
                                  </td>
                                  <td className="p-3">
                                    <div className="w-full">
                                      <div className="flex justify-between text-[11px] mb-1">
                                        <span className="text-text-secondary font-bold">{nodo.gigasConsumidos} <span className="font-normal text-text-muted">/ {nodo.gigasAsignados}</span></span>
                                      </div>
                                      <div className="w-full bg-bg-card border border-border-custom rounded-full h-1 overflow-hidden">
                                        <div 
                                          className={`h-1 rounded-full ${nodo.estado === 'Suspendido' ? 'bg-red-500' : 'bg-blue-500'}`}
                                          style={{ width: `${Math.min(((nodo.gigasConsumidos || 0) / (nodo.gigasAsignados || 1)) * 100, 100)}%` }}
                                        ></div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-3 text-center">
                                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button 
                                        onClick={() => toggleEstado(nodo.id, nodo.estado)}
                                        className={`p-1.5 rounded transition-colors cursor-pointer ${nodo.estado === 'Suspendido' ? 'bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-white' : 'bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white'}`}
                                        title={nodo.estado === 'Suspendido' ? 'Reactivar Servicio' : 'Suspender Servicio'}
                                      >
                                        {nodo.estado === 'Suspendido' ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-12 text-center text-text-muted">
                  No hay equipos operativos que coincidan con la búsqueda.
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* TAB 2: SERVICIOS Y PACKS DE INTERNET */}
      {activeTab === "servicios" && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* Columna 1: Packs de Internet */}
          <div className="bg-bg-card rounded-xl border border-border-custom shadow-xl overflow-hidden">
            <div className="p-5 bg-bg-subtle border-b border-border-custom flex items-center gap-3">
              <div className="bg-blue-500/10 p-2.5 rounded-lg"><Wifi className="w-5 h-5 text-blue-500" /></div>
              <div>
                <h3 className="font-bold text-base text-text-primary">Packs de Internet</h3>
                <p className="text-[10px] text-text-muted">Packs de GB (50 GB - 1 TB).</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-bg-subtle border-b border-border-custom text-[10px] uppercase tracking-wider text-text-muted font-semibold">
                    <th className="p-3 pl-5">Nombre</th>
                    <th className="p-3 text-center">Gigas</th>
                    {activeCountryCode === "AR" && <th className="p-3 text-center">País</th>}
                    <th className="p-3 text-center w-20">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-custom text-sm">
                  {servicios.filter(s => s.tipo === "PACK_INTERNET").length > 0 ? (
                    servicios.filter(s => s.tipo === "PACK_INTERNET").map((item) => (
                      <tr key={item.id} className="hover:bg-bg-subtle/50 transition-colors">
                        <td className="p-3 pl-5 font-bold text-text-primary">{item.nombre}</td>
                        <td className="p-3 text-center font-bold text-blue-400">{item.cantidad} GB</td>
                        {activeCountryCode === "AR" && (
                          <td className="p-3 text-center">
                            <span className="text-[9px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20 font-bold font-mono">
                              {item.country?.code || "AR"}
                            </span>
                          </td>
                        )}
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button onClick={() => openModal("EDIT", item)} className="p-1 bg-bg-subtle hover:bg-blue-600 hover:text-white text-text-muted rounded transition-colors cursor-pointer border border-border-custom">
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button onClick={() => handleDeleteService(item.id, item.nombre)} className="p-1 bg-bg-subtle hover:bg-red-600 hover:text-white text-text-muted rounded transition-colors cursor-pointer border border-border-custom">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-text-muted italic">No hay packs configurados.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Columna 2: Servicios GPS */}
          <div className="bg-bg-card rounded-xl border border-border-custom shadow-xl overflow-hidden">
            <div className="p-5 bg-bg-subtle border-b border-border-custom flex items-center gap-3">
              <div className="bg-emerald-500/10 p-2.5 rounded-lg"><MapPin className="w-5 h-5 text-emerald-500" /></div>
              <div>
                <h3 className="font-bold text-base text-text-primary">Servicios GPS</h3>
                <p className="text-[10px] text-text-muted">Servicios de geolocalización y rastreo.</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-bg-subtle border-b border-border-custom text-[10px] uppercase tracking-wider text-text-muted font-semibold">
                    <th className="p-3 pl-5">Nombre</th>
                    {activeCountryCode === "AR" && <th className="p-3 text-center">País</th>}
                    <th className="p-3 text-center w-20">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-custom text-sm">
                  {servicios.filter(s => s.tipo === "SERVICIO_GPS" || s.tipo === "SERVICIO").length > 0 ? (
                    servicios.filter(s => s.tipo === "SERVICIO_GPS" || s.tipo === "SERVICIO").map((item) => (
                      <tr key={item.id} className="hover:bg-bg-subtle/50 transition-colors">
                        <td className="p-3 pl-5 font-bold text-text-primary">{item.nombre}</td>
                        {activeCountryCode === "AR" && (
                          <td className="p-3 text-center">
                            <span className="text-[9px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20 font-bold font-mono">
                              {item.country?.code || "AR"}
                            </span>
                          </td>
                        )}
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button onClick={() => openModal("EDIT", item)} className="p-1 bg-bg-subtle hover:bg-blue-600 hover:text-white text-text-muted rounded transition-colors cursor-pointer border border-border-custom">
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button onClick={() => handleDeleteService(item.id, item.nombre)} className="p-1 bg-bg-subtle hover:bg-red-600 hover:text-white text-text-muted rounded transition-colors cursor-pointer border border-border-custom">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-text-muted italic">No hay servicios GPS configurados.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Columna 3: Servicios de Administración de Red */}
          <div className="bg-bg-card rounded-xl border border-border-custom shadow-xl overflow-hidden">
            <div className="p-5 bg-bg-subtle border-b border-border-custom flex items-center gap-3">
              <div className="bg-indigo-500/10 p-2.5 rounded-lg"><Cpu className="w-5 h-5 text-indigo-500" /></div>
              <div>
                <h3 className="font-bold text-base text-text-primary">Administración de Red</h3>
                <p className="text-[10px] text-text-muted">Servicios de administración, ruteo y soporte.</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-bg-subtle border-b border-border-custom text-[10px] uppercase tracking-wider text-text-muted font-semibold">
                    <th className="p-3 pl-5">Nombre</th>
                    {activeCountryCode === "AR" && <th className="p-3 text-center">País</th>}
                    <th className="p-3 text-center w-20">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-custom text-sm">
                  {servicios.filter(s => s.tipo === "SERVICIO_RED").length > 0 ? (
                    servicios.filter(s => s.tipo === "SERVICIO_RED").map((item) => (
                      <tr key={item.id} className="hover:bg-bg-subtle/50 transition-colors">
                        <td className="p-3 pl-5 font-bold text-text-primary">{item.nombre}</td>
                        {activeCountryCode === "AR" && (
                          <td className="p-3 text-center">
                            <span className="text-[9px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20 font-bold font-mono">
                              {item.country?.code || "AR"}
                            </span>
                          </td>
                        )}
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button onClick={() => openModal("EDIT", item)} className="p-1 bg-bg-subtle hover:bg-blue-600 hover:text-white text-text-muted rounded transition-colors cursor-pointer border border-border-custom">
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button onClick={() => handleDeleteService(item.id, item.nombre)} className="p-1 bg-bg-subtle hover:bg-red-600 hover:text-white text-text-muted rounded transition-colors cursor-pointer border border-border-custom">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-text-muted italic">No hay servicios de administración configurados.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 3: PROVEEDORES */}
      {activeTab === "proveedores" && (
        <div className="bg-bg-card rounded-xl border border-border-custom shadow-xl overflow-hidden">
          <div className="p-6 bg-bg-subtle border-b border-border-custom flex items-center gap-3">
            <div className="bg-emerald-500/10 p-2.5 rounded-lg"><Truck className="w-5 h-5 text-emerald-500" /></div>
            <div>
              <h3 className="font-bold text-lg text-text-primary">Listado de Proveedores</h3>
              <p className="text-xs text-text-muted">Proveedores del sistema y tipo de servicio que brindan.</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-bg-subtle border-b border-border-custom text-xs uppercase tracking-wider text-text-muted font-semibold">
                  <th className="p-4 pl-6">Nombre del Proveedor</th>
                  <th className="p-4">Servicio que Brinda</th>
                  <th className="p-4 text-center w-28">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom">
                {proveedores.length > 0 ? (
                  proveedores.map((item) => (
                    <tr key={item.id} className="hover:bg-bg-subtle/50 transition-colors">
                      <td className="p-4 pl-6 font-bold text-text-primary">{item.nombre}</td>
                      <td className="p-4">
                        <span className="bg-bg-subtle text-text-secondary px-3 py-1 rounded-md text-xs font-semibold border border-border-custom">
                          {item.servicioBrindado}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => openModal("EDIT_PROVIDER", item)} className="p-1.5 bg-bg-subtle hover:bg-blue-600 hover:text-white text-text-muted rounded transition-colors cursor-pointer border border-border-custom">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteProvider(item.id, item.nombre)} className="p-1.5 bg-bg-subtle hover:bg-red-600 hover:text-white text-text-muted rounded transition-colors cursor-pointer border border-border-custom">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="p-12 text-center text-text-muted italic">No hay proveedores registrados.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL DE EDICIÓN / CREACIÓN DE SERVICIOS */}
      {isModalOpen && (modalType === "CREATE" || modalType === "EDIT") && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-card border border-border-custom rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-border-custom bg-bg-subtle">
              <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                <Network className="w-5 h-5 text-blue-500" />
                {modalType === "CREATE" ? "Nuevo Servicio / Pack" : "Editar Servicio / Pack"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-text-muted hover:text-text-primary transition-colors cursor-pointer">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSaveService} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Nombre</label>
                <input 
                  type="text" 
                  value={formService.nombre} 
                  onChange={e => setFormService({...formService, nombre: e.target.value})} 
                  placeholder="Ej: Servicio GPS Avanzado, Pack 100 GB..."
                  className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-2.5 text-text-primary focus:border-blue-500 outline-none" 
                  required 
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Tipo de Elemento</label>
                <select 
                  value={formService.tipo} 
                  onChange={e => setFormService({...formService, tipo: e.target.value})}
                  className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-2.5 text-text-primary focus:border-blue-500 outline-none"
                  disabled={modalType === "EDIT"}
                >
                  <option value="SERVICIO_GPS">Servicio GPS</option>
                  <option value="SERVICIO_RED">Servicio de Administración de Red</option>
                  <option value="PACK_INTERNET">Pack de Internet (GB)</option>
                </select>
              </div>

              {formService.tipo === "PACK_INTERNET" && (
                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Capacidad de Internet (GB)</label>
                  <input 
                    type="number" 
                    min="50" 
                    max="1000" 
                    value={formService.gigas} 
                    onChange={e => setFormService({...formService, gigas: Number(e.target.value)})} 
                    className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-2.5 text-text-primary focus:border-blue-500 outline-none" 
                    required 
                  />
                  <p className="text-[10px] text-text-muted mt-1">El rango de los packs de internet debe estar entre 50 GB y 1000 GB (1 TB).</p>
                </div>
              )}

              {activeCountryCode === "AR" && (
                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">País / Región</label>
                  <select 
                    value={formService.countryId} 
                    onChange={e => setFormService({...formService, countryId: e.target.value})} 
                    className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-2.5 text-text-primary focus:border-blue-500 outline-none"
                    required
                  >
                    <option value="">Seleccionar País...</option>
                    {paises.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-4 pt-4 border-t border-border-custom font-medium">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 rounded-md text-text-secondary hover:bg-bg-subtle border border-border-custom transition-colors cursor-pointer" disabled={loading}>Cancelar</button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md flex items-center gap-2 cursor-pointer" disabled={loading}>
                  <Save className="w-4 h-4" /> 
                  {loading ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE EDICIÓN / CREACIÓN DE PROVEEDORES */}
      {isModalOpen && (modalType === "CREATE_PROVIDER" || modalType === "EDIT_PROVIDER") && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-card border border-border-custom rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-border-custom bg-bg-subtle">
              <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-500" />
                {modalType === "CREATE_PROVIDER" ? "Nuevo Proveedor" : "Editar Proveedor"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-text-muted hover:text-text-primary transition-colors cursor-pointer">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSaveProvider} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Nombre del Proveedor</label>
                <input 
                  type="text" 
                  value={formProvider.nombre} 
                  onChange={e => setFormProvider({...formProvider, nombre: e.target.value})} 
                  placeholder="Ej: Telespazio, Telefónica, Ale MC..."
                  className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-2.5 text-text-primary focus:border-emerald-500 outline-none" 
                  required 
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Servicio que Brinda</label>
                <input 
                  type="text" 
                  value={formProvider.servicioBrindado} 
                  onChange={e => setFormProvider({...formProvider, servicioBrindado: e.target.value})} 
                  placeholder="Ej: Internet Satelital, Equipamiento GPS, Gestión de Nodos..."
                  className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-2.5 text-text-primary focus:border-emerald-500 outline-none" 
                  required 
                />
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t border-border-custom font-medium">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 rounded-md text-text-secondary hover:bg-bg-subtle border border-border-custom transition-colors cursor-pointer" disabled={loading}>Cancelar</button>
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-md flex items-center gap-2 cursor-pointer" disabled={loading}>
                  <Save className="w-4 h-4" /> 
                  {loading ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
