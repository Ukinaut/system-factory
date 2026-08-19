"use client";

import React, { useState, useEffect } from "react";
import { Layers, Search, AlertTriangle, AlertOctagon, Plus, PackageOpen, Edit2, ImageIcon, ArrowDownRight, ArrowUpRight, TrendingDown, ChevronDown, ChevronRight, X, Save, ArrowDownUp, Trash2 } from "lucide-react";
import { getProducts, createProduct, updateProduct, adjustProductStock, getStockLogs, deleteProduct } from "@/actions/products";
import { getCountries, getSelectedCountry } from "@/actions/countries";

export default function StockDashboard() {
  const [activeTab, setActiveTab] = useState("inventario");
  const [busqueda, setBusqueda] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("Todos");
  const [filtroAlerta, setFiltroAlerta] = useState<"Todos" | "Alerta" | "Critico">("Todos");
  
  // Estados para Acordeón y Modales
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"EDIT" | "ADJUST" | "CREATE" | null>(null);
  const [itemSeleccionado, setItemSeleccionado] = useState<any>(null);

  // Inventario y Movimientos de DB
  const [inventario, setInventario] = useState<any[]>([]);
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de Formularios
  const [formEdit, setFormEdit] = useState<any>({});
  const [formAdjust, setFormAdjust] = useState({ tipo: "Entrada", cantidad: 1, justificacion: "", usuario: "Admin" });

  // Control e independencia de stock por país
  const [activeCountryCode, setActiveCountryCode] = useState<string | null>(null);
  const [paises, setPaises] = useState<any[]>([]);
  const [selectedFilterCountryId, setSelectedFilterCountryId] = useState<string>("Todos");

  const loadData = async (filterCountryId?: string) => {
    setLoading(true);
    const prodRes = await getProducts(filterCountryId || selectedFilterCountryId);
    const logsRes = await getStockLogs();
    
    if (prodRes.success) {
      // Formatear categorías para que coincidan con la UI original
      const formatted = (prodRes.products || [])
        .filter((p: any) => p.tipo !== "SERVICIO" && p.tipo !== "SERVICIO_GPS" && p.tipo !== "SERVICIO_RED" && p.tipo !== "PACK_INTERNET")
        .map((p: any) => ({
          id: p.id,
          nombre: p.nombre,
          categoria: p.tipo === "PRODUCTO_FINAL" ? "Producto Final" : p.tipo === "ENSAMBLE" ? "Repuestos" : "Materia Prima",
          cantidad: p.cantidad,
          alertaMinima: p.alertaMinima,
          alertaCritica: p.alertaCritica,
          foto: null,
          caracteristicas: p.caracteristicas || (p.tipo === "PRODUCTO_FINAL" ? "Hardware y equipamiento para despliegue de telecomunicaciones satelitales." : "Accesorios y partes de reposición técnica."),
          country: p.country,
        }));
      setInventario(formatted);
    }

    if (logsRes.success) {
      const formattedLogs = (logsRes.logs || []).map((l: any) => ({
        id: l.id,
        fecha: new Date(l.fechaHora).toLocaleString(),
        tipo: l.accion.includes("Entrada") ? "Entrada" : "Salida",
        articulo: l.accion.split("para ")[1]?.split(" (")[0] || "Artículo",
        cantidad: parseInt(l.accion.split("Cantidad ")[1]?.split(".")[0]) || 1,
        motivo: l.accion,
        usuario: l.user?.nombre || "Admin",
      }));
      setMovimientos(formattedLogs);
    }
    setLoading(false);
  };

  useEffect(() => {
    const fetchCountryData = async () => {
      const currentCountry = await getSelectedCountry();
      setActiveCountryCode(currentCountry);
      if (currentCountry === "AR") {
        const countriesRes = await getCountries();
        if (countriesRes.success) {
          setPaises(countriesRes.countries);
        }
      }
    };
    fetchCountryData();
  }, []);

  useEffect(() => {
    loadData(selectedFilterCountryId);
  }, [selectedFilterCountryId]);

  function getStatus(cantidad: number, minima: number, critica: number) {
    if (cantidad <= critica) return "Critico";
    if (cantidad <= minima) return "Alerta";
    return "Normal";
  }

  const inventarioFiltrado = inventario.filter(item => {
    const coincideBusqueda = item.nombre.toLowerCase().includes(busqueda.toLowerCase()) || item.id.toLowerCase().includes(busqueda.toLowerCase());
    const coincideCategoria = filtroCategoria === "Todos" || item.categoria === filtroCategoria;
    const status = getStatus(item.cantidad, item.alertaMinima, item.alertaCritica);
    const coincideAlerta = filtroAlerta === "Todos" || status === filtroAlerta;
    return coincideBusqueda && coincideCategoria && coincideAlerta;
  });

  const metricas = {
    total: inventario.length,
    alertas: inventario.filter(i => getStatus(i.cantidad, i.alertaMinima, i.alertaCritica) === "Alerta").length,
    criticos: inventario.filter(i => getStatus(i.cantidad, i.alertaMinima, i.alertaCritica) === "Critico").length,
    consumidosMes: movimientos.filter(m => m.tipo === "Salida").reduce((acc, curr) => acc + curr.cantidad, 0)
  };

  // Calcular consumos por artículo
  const consumosPorArticulo = movimientos
    .filter(m => m.tipo === "Salida")
    .reduce((acc: Record<string, number>, curr) => {
      acc[curr.articulo] = (acc[curr.articulo] || 0) + curr.cantidad;
      return acc;
    }, {});

  const topConsumidos = Object.entries(consumosPorArticulo)
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 5);

  const tendenciaConsumos = [
    { dia: "Lun", cantidad: 4 },
    { dia: "Mar", cantidad: 9 },
    { dia: "Mié", cantidad: 15 },
    { dia: "Jue", cantidad: 7 },
    { dia: "Vie", cantidad: 12 },
    { dia: "Sáb", cantidad: 5 },
    { dia: "Dom", cantidad: 2 }
  ];
  
  const maxTendencia = Math.max(...tendenciaConsumos.map(t => t.cantidad), 1);

  const toggleExpand = (id: string) => {
    setExpandedItem(expandedItem === id ? null : id);
  };

  const openModal = (type: "EDIT" | "ADJUST" | "CREATE", item?: any) => {
    setItemSeleccionado(item || null);
    setModalType(type);
    if (type === "EDIT") {
      setFormEdit({ ...item, countryId: item.country?.id || "", caracteristicas: item.caracteristicas || "" });
    } else if (type === "CREATE") {
      setFormEdit({ nombre: "", categoria: "Producto Final", alertaMinima: 10, alertaCritica: 2, cantidad: 0, caracteristicas: "", countryId: selectedFilterCountryId !== "Todos" ? selectedFilterCountryId : "" });
    } else {
      setFormAdjust({ tipo: "Entrada", cantidad: 1, justificacion: "", usuario: "Admin" });
    }
    setIsModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Mapear categorías de la UI a la DB
    const dbTipo = formEdit.categoria === "Producto Final" ? "PRODUCTO_FINAL" : formEdit.categoria === "Repuestos" ? "ENSAMBLE" : "MATERIA_PRIMA";

    let res;
    if (modalType === "CREATE") {
      res = await createProduct({
        tipo: dbTipo,
        nombre: formEdit.nombre,
        cantidad: formEdit.cantidad,
        alertaMinima: formEdit.alertaMinima,
        alertaCritica: formEdit.alertaCritica,
        caracteristicas: formEdit.caracteristicas,
        countryId: formEdit.countryId,
      });
    } else {
      res = await updateProduct({
        id: formEdit.id,
        nombre: formEdit.nombre,
        tipo: dbTipo,
        alertaMinima: formEdit.alertaMinima,
        alertaCritica: formEdit.alertaCritica,
        caracteristicas: formEdit.caracteristicas,
        countryId: formEdit.countryId,
      });
    }

    setLoading(false);
    if (res.success) {
      alert(modalType === "CREATE" ? "Artículo creado con éxito." : "Artículo actualizado con éxito.");
      setIsModalOpen(false);
      loadData();
    } else {
      alert("Error al guardar: " + res.error);
    }
  };

  const handleSaveAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formAdjust.tipo === "Salida" && itemSeleccionado.cantidad - formAdjust.cantidad < 0) {
      alert("Error: No puedes registrar una salida mayor al stock actual.");
      return;
    }

    setLoading(true);
    const res = await adjustProductStock({
      id: itemSeleccionado.id,
      tipo: formAdjust.tipo,
      cantidad: formAdjust.cantidad,
      justificacion: formAdjust.justificacion,
      usuario: formAdjust.usuario,
    });

    setLoading(false);
    if (res.success) {
      alert("Ajuste de stock registrado correctamente.");
      setIsModalOpen(false);
      loadData();
    } else {
      alert("Error al ajustar stock: " + res.error);
    }
  };

  const handleDeleteProduct = async (id: string, nombre: string) => {
    if (confirm(`¿Está seguro de que desea eliminar el artículo "${nombre}"? Esta acción no se puede deshacer.`)) {
      setLoading(true);
      const res = await deleteProduct(id);
      setLoading(false);
      if (res.success) {
        alert("Artículo eliminado con éxito.");
        loadData();
      } else {
        alert("Error al eliminar: " + res.error);
      }
    }
  };

  if (loading && inventario.length === 0) {
    return (
      <div className="p-8 text-center text-text-muted">
        Cargando inventario y catálogo...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-wide flex items-center gap-3 mb-2">
            <Layers className="text-teal-500 w-8 h-8" />
            H. Control de Stock
          </h1>
          <p className="text-text-muted">Gestión de inventario físico, historial de consumos y alertas de reposición.</p>
        </div>
        <button onClick={() => openModal("CREATE")} className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-md font-medium transition-colors flex items-center gap-2 cursor-pointer">
          <Plus className="w-5 h-5" /> Nuevo Artículo
        </button>
      </div>

      {/* Tarjetas de Métricas de Stock */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div 
          onClick={() => {
            setActiveTab("inventario");
            setFiltroAlerta("Todos");
          }}
          className={`border rounded-xl p-6 shadow-lg cursor-pointer hover:scale-[1.02] active:scale-[0.98] hover:shadow-xl transition-all duration-200 ${
            filtroAlerta === "Todos" && activeTab === "inventario"
              ? "bg-blue-500/5 border-blue-500"
              : "bg-bg-card border-border-custom"
          }`}
        >
          <div className="flex items-center gap-4 mb-2">
            <div className="bg-blue-500/10 p-3 rounded-lg"><PackageOpen className="w-6 h-6 text-blue-500" /></div>
            <p className="text-text-muted font-semibold uppercase tracking-wider text-xs">Catálogo Total</p>
          </div>
          <p className="text-3xl font-bold text-text-primary pl-16">{metricas.total}</p>
        </div>
        
        <div 
          onClick={() => {
            setActiveTab("historial");
          }}
          className={`border rounded-xl p-6 shadow-lg cursor-pointer hover:scale-[1.02] active:scale-[0.98] hover:shadow-xl transition-all duration-200 ${
            activeTab === "historial"
              ? "bg-teal-500/5 border-teal-500"
              : "bg-bg-card border-teal-500/20"
          }`}
        >
          <div className="flex items-center gap-4 mb-2">
            <div className="bg-teal-500/10 p-3 rounded-lg"><TrendingDown className="w-6 h-6 text-teal-500" /></div>
            <p className="text-text-muted font-semibold uppercase tracking-wider text-xs">Consumidos (Mes)</p>
          </div>
          <p className="text-3xl font-bold text-teal-500 pl-16">{metricas.consumidosMes} unds.</p>
        </div>

        <div 
          onClick={() => {
            setActiveTab("inventario");
            setFiltroAlerta("Alerta");
          }}
          className={`border rounded-xl p-6 shadow-lg cursor-pointer hover:scale-[1.02] active:scale-[0.98] hover:shadow-xl transition-all duration-200 ${
            filtroAlerta === "Alerta" && activeTab === "inventario"
              ? "bg-amber-500/10 border-amber-500"
              : "bg-bg-card border-amber-500/20"
          }`}
        >
          <div className="flex items-center gap-4 mb-2">
            <div className="bg-amber-500/10 p-3 rounded-lg"><AlertTriangle className="w-6 h-6 text-amber-500" /></div>
            <p className="text-text-muted font-semibold uppercase tracking-wider text-xs">Stock Bajo (Alerta)</p>
          </div>
          <p className="text-3xl font-bold text-amber-500 pl-16">{metricas.alertas}</p>
        </div>

        <div 
          onClick={() => {
            setActiveTab("inventario");
            setFiltroAlerta("Critico");
          }}
          className={`border rounded-xl p-6 shadow-lg cursor-pointer hover:scale-[1.02] active:scale-[0.98] hover:shadow-xl transition-all duration-200 ${
            filtroAlerta === "Critico" && activeTab === "inventario"
              ? "bg-red-500/10 border-red-500"
              : "bg-bg-card border-red-500/20"
          }`}
        >
          <div className="flex items-center gap-4 mb-2">
            <div className="bg-red-500/10 p-3 rounded-lg"><AlertOctagon className="w-6 h-6 text-red-500" /></div>
            <p className="text-text-muted font-semibold uppercase tracking-wider text-xs">Ruptura (Crítico)</p>
          </div>
          <p className="text-3xl font-bold text-red-500 pl-16">{metricas.criticos}</p>
        </div>
      </div>

      {/* Gráficos de Consumo y Tendencias */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Columna Izquierda: Top Consumidos (Barras Horizontales) */}
        <div className="bg-bg-card border border-border-custom rounded-xl p-6 shadow-lg">
          <h2 className="text-lg font-bold text-text-primary mb-6 flex items-center gap-2">
            <TrendingDown className="text-teal-500 w-5 h-5" />
            Top 5 Artículos Consumidos
          </h2>
          {topConsumidos.length > 0 ? (
            <div className="space-y-5">
              {topConsumidos.map((item, index) => {
                const maxCantidad = Math.max(...topConsumidos.map(i => i.cantidad), 1);
                const porcentaje = (item.cantidad / maxCantidad) * 100;
                return (
                  <div key={index} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="font-semibold text-text-secondary">{item.nombre}</span>
                      <span className="font-bold text-teal-500">{item.cantidad} und.</span>
                    </div>
                    <div className="w-full bg-bg-subtle rounded-full h-3 border border-border-custom overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-teal-500 to-emerald-400 h-3 rounded-full transition-all duration-500" 
                        style={{ width: `${porcentaje}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-text-muted italic text-sm">
              No hay registros de salidas en este período.
            </div>
          )}
        </div>

        {/* Columna Derecha: Tendencia Semanal (Gráfico de Barras Verticales) */}
        <div className="bg-bg-card border border-border-custom rounded-xl p-6 shadow-lg flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-text-primary mb-6 flex items-center gap-2">
              <Layers className="text-indigo-500 w-5 h-5" />
              Tendencia Semanal de Consumos (Total Salidas)
            </h2>
            <div className="flex items-end justify-between h-48 px-4 border-b border-border-custom pb-2 relative">
              {tendenciaConsumos.map((t, idx) => {
                const heightPercentage = (t.cantidad / maxTendencia) * 80 + 10; // entre 10% y 90%
                return (
                  <div key={idx} className="flex flex-col items-center gap-2 flex-1 group relative">
                    {/* Tooltip */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-bg-sidebar border border-border-custom text-text-primary text-xs font-bold rounded px-2 py-1 absolute -top-8 pointer-events-none shadow-md z-10">
                      {t.cantidad} salidas
                    </div>
                    {/* Barra */}
                    <div 
                      className="w-8 bg-gradient-to-t from-indigo-600 to-purple-500 hover:from-indigo-500 hover:to-purple-400 rounded-t transition-all duration-500 cursor-pointer"
                      style={{ height: `${(heightPercentage / 100) * 160}px` }}
                    />
                    <span className="text-xs text-text-muted font-medium">{t.dia}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <p className="text-[10px] text-text-muted mt-4 text-center">Filtro de tendencia calculado en base al historial de movimientos de depósito.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-custom mb-6 justify-between items-center pr-2">
        <div className="flex">
          <button 
            onClick={() => setActiveTab("inventario")}
            className={`px-6 py-3 font-semibold text-sm tracking-wider uppercase transition-colors flex items-center gap-2 cursor-pointer ${activeTab === 'inventario' ? 'text-teal-500 border-b-2 border-teal-500' : 'text-text-muted hover:text-text-primary'}`}
          >
            Inventario Físico
          </button>
          <button 
            onClick={() => setActiveTab("historial")}
            className={`px-6 py-3 font-semibold text-sm tracking-wider uppercase transition-colors flex items-center gap-2 cursor-pointer ${activeTab === 'historial' ? 'text-teal-500 border-b-2 border-teal-500' : 'text-text-muted hover:text-text-primary'}`}
          >
            Historial de Movimientos
          </button>
        </div>
      </div>

      <div className="bg-bg-card rounded-xl border border-border-custom shadow-xl overflow-hidden">
        {activeTab === "inventario" && filtroAlerta !== "Todos" && (
          <div className="px-6 py-3.5 bg-teal-500/5 border-b border-border-custom flex items-center justify-between text-sm font-semibold text-teal-600 dark:text-teal-400">
            <span>
              Mostrando únicamente artículos con estado: <strong className="uppercase">{filtroAlerta === "Critico" ? "Ruptura (Crítico)" : "Stock Bajo (Alerta)"}</strong>
            </span>
            <button 
              onClick={() => setFiltroAlerta("Todos")}
              className="text-text-muted hover:text-text-primary flex items-center gap-1 font-bold cursor-pointer"
            >
              <X className="w-4 h-4" /> Quitar filtro
            </button>
          </div>
        )}
        
        {/* TAB INVENTARIO FISICO */}
        {activeTab === "inventario" && (
          <>
            <div className="p-6 border-b border-border-custom bg-bg-subtle flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="w-5 h-5 absolute left-3 top-3.5 text-gray-500" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full bg-bg-card border border-border-custom rounded-md pl-10 pr-4 py-3 text-text-primary focus:border-teal-500 outline-none transition-colors"
                  placeholder="Buscar por Nombre o SKU..."
                />
              </div>

              {activeCountryCode === "AR" && (
                <div className="flex items-center bg-bg-card border border-border-custom rounded-md px-4 py-2 min-w-[200px]">
                  <select
                    value={selectedFilterCountryId}
                    onChange={(e) => setSelectedFilterCountryId(e.target.value)}
                    className="flex-1 bg-transparent text-text-primary text-sm focus:outline-none outline-none appearance-none cursor-pointer"
                  >
                    <option value="Todos" className="bg-bg-card">Todos los Países</option>
                    {paises.map(p => (
                      <option key={p.id} value={p.id} className="bg-bg-card">
                        {p.nombre} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <select
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
                className="bg-bg-card border border-border-custom rounded-md px-4 py-3 text-text-primary focus:border-teal-500 outline-none appearance-none min-w-[200px]"
              >
                <option value="Todos">Todas las Categorías</option>
                <option value="Producto Final">Producto Final</option>
                <option value="Materia Prima">Materia Prima</option>
                <option value="Repuestos">Repuestos</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-bg-subtle border-b border-border-custom text-xs uppercase tracking-wider text-text-muted font-semibold">
                    <th className="w-12"></th>
                    <th className="p-4 pl-0 w-24 text-center">Foto</th>
                    <th className="p-4">SKU / Artículo</th>
                    <th className="p-4">Categoría</th>
                    <th className="p-4 text-center">En Stock</th>
                    <th className="p-4 text-center">Estado / Alertas</th>
                    <th className="p-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-custom">
                  {inventarioFiltrado.map((item) => {
                    const status = getStatus(item.cantidad, item.alertaMinima, item.alertaCritica);
                    const isExpanded = expandedItem === item.id;

                    return (
                      <React.Fragment key={item.id}>
                        <tr className="hover:bg-bg-subtle transition-colors group">
                          <td className="p-4 text-center cursor-pointer" onClick={() => toggleExpand(item.id)}>
                            {isExpanded ? <ChevronDown className="w-5 h-5 text-text-muted hover:text-teal-500" /> : <ChevronRight className="w-5 h-5 text-text-muted hover:text-teal-500" />}
                          </td>
                          <td className="p-4 pl-0 text-center">
                            {item.foto ? (
                              <img src={item.foto} alt={item.nombre} className="w-12 h-12 object-cover rounded-md border border-border-custom mx-auto" />
                            ) : (
                              <div className="w-12 h-12 bg-bg-subtle rounded-md border border-border-custom flex items-center justify-center mx-auto text-text-muted">
                                <ImageIcon className="w-5 h-5" />
                              </div>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="font-bold text-text-primary tracking-wide">{item.nombre}</p>
                              {activeCountryCode === "AR" && item.country && (
                                <span className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded font-mono border border-blue-500/20 font-bold uppercase shrink-0">
                                  {item.country.code}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-text-muted font-mono bg-bg-subtle inline-block px-2 py-0.5 rounded border border-border-custom">{item.id.substring(0, 8)}</p>
                          </td>
                          <td className="p-4">
                            <span className="text-sm text-text-secondary">{item.categoria}</span>
                          </td>
                          <td className="p-4 text-center">
                            <span className={`text-2xl font-bold ${status === 'Critico' ? 'text-red-500' : status === 'Alerta' ? 'text-amber-500' : 'text-text-primary'}`}>
                              {item.cantidad}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] uppercase font-bold border mb-2 ${
                              status === 'Normal' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 
                              status === 'Alerta' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 
                              'bg-red-500/10 text-red-400 border-red-500/30'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${status === 'Normal' ? 'bg-emerald-400' : status === 'Alerta' ? 'bg-amber-400' : 'bg-red-400'}`}></span>
                              {status}
                            </span>
                            <div className="text-[10px] text-text-muted mt-1">
                              Avisar: <strong className="text-amber-500">{item.alertaMinima}</strong> | Crítico: <strong className="text-red-500">{item.alertaCritica}</strong>
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={() => openModal("EDIT", item)} className="p-2 bg-bg-subtle hover:bg-teal-600 hover:text-white text-text-muted rounded transition-colors cursor-pointer border border-border-custom" title="Editar Info / Alertas">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => openModal("ADJUST", item)} className="p-2 bg-bg-subtle hover:bg-blue-600 hover:text-white text-text-muted rounded transition-colors cursor-pointer border border-border-custom" title="Carga / Descarga Manual">
                                <ArrowDownUp className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDeleteProduct(item.id, item.nombre)} className="p-2 bg-bg-subtle hover:bg-red-600 hover:text-white text-text-muted rounded transition-colors cursor-pointer border border-border-custom" title="Eliminar Artículo">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {/* Acordeón Características */}
                        {isExpanded && (
                          <tr className="bg-bg-subtle">
                            <td colSpan={7} className="p-0 border-l-4 border-l-teal-500">
                              <div className="p-6 bg-bg-card border-y border-border-custom">
                                <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Características del Producto</h4>
                                <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
                                  {item.caracteristicas || "No se han cargado características para este artículo."}
                                </p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
              {inventarioFiltrado.length === 0 && (
                <div className="p-12 text-center text-text-muted">
                  No se encontraron artículos en el inventario.
                </div>
              )}
            </div>
          </>
        )}

        {/* TAB HISTORIAL DE MOVIMIENTOS */}
        {activeTab === "historial" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-bg-subtle border-b border-border-custom text-xs uppercase tracking-wider text-text-muted font-semibold">
                  <th className="p-4 pl-6">Fecha / Hora</th>
                  <th className="p-4">Acción Registrada</th>
                  <th className="p-4 text-center">Realizado por</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom">
                {movimientos.length > 0 ? (
                  movimientos.map((mov) => (
                    <tr key={mov.id} className="hover:bg-bg-subtle transition-colors">
                      <td className="p-4 pl-6">
                        <span className="text-sm font-mono text-text-secondary">{mov.fecha}</span>
                      </td>
                      <td className="p-4 text-text-primary">
                        {mov.motivo}
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-xs text-text-muted bg-bg-subtle px-2 py-1 rounded border border-border-custom">{mov.usuario}</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="p-12 text-center text-text-muted border-b border-border-custom">
                      No hay registros de movimientos en base de datos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: EDITAR / CREAR ARTICULO */}
      {isModalOpen && (modalType === "EDIT" || modalType === "CREATE") && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-card border border-border-custom rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-border-custom bg-bg-subtle">
              <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-teal-500" />
                {modalType === "CREATE" ? "Nuevo Artículo de Inventario" : `Editar Artículo: ${formEdit.id.substring(0, 8)}`}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-text-muted hover:text-text-primary transition-colors cursor-pointer">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
               <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Nombre del Artículo</label>
                  <input type="text" value={formEdit.nombre} onChange={e => setFormEdit({...formEdit, nombre: e.target.value})} className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-2.5 text-text-primary focus:border-teal-500 outline-none" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Categoría</label>
                  <select value={formEdit.categoria} onChange={e => setFormEdit({...formEdit, categoria: e.target.value})} className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-2.5 text-text-primary focus:border-teal-500 outline-none">
                    <option value="Producto Final">Producto Final</option>
                    <option value="Materia Prima">Materia Prima</option>
                    <option value="Repuestos">Repuestos</option>
                  </select>
                </div>
              </div>

              {activeCountryCode === "AR" && (
                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">País / Región de Destino</label>
                  <select 
                    value={formEdit.countryId} 
                    onChange={e => setFormEdit({...formEdit, countryId: e.target.value})} 
                    className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-2.5 text-text-primary focus:border-teal-500 outline-none"
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

              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Características del Producto</label>
                <textarea
                  value={formEdit.caracteristicas || ""}
                  onChange={e => setFormEdit({...formEdit, caracteristicas: e.target.value})}
                  className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-2.5 text-text-primary focus:border-teal-500 outline-none min-h-[80px]"
                  placeholder="Detalles y características del producto..."
                />
              </div>

              {modalType === "CREATE" && (
                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Cantidad Inicial en Stock</label>
                  <input type="number" min="0" value={formEdit.cantidad} onChange={e => setFormEdit({...formEdit, cantidad: Number(e.target.value)})} className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-2.5 text-text-primary focus:border-teal-500 outline-none" required />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-amber-500/10 p-4 rounded-lg border border-amber-500/30">
                  <label className="block text-xs font-semibold text-amber-500 uppercase tracking-wider mb-2 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Nivel Alerta (Amarilla)</label>
                  <input type="number" min="0" value={formEdit.alertaMinima} onChange={e => setFormEdit({...formEdit, alertaMinima: Number(e.target.value)})} className="w-full bg-bg-card border border-amber-500/50 rounded-md px-4 py-2 text-text-primary outline-none focus:ring-1 focus:ring-amber-500" />
                </div>
                <div className="bg-red-500/10 p-4 rounded-lg border border-red-500/30">
                  <label className="block text-xs font-semibold text-red-500 uppercase tracking-wider mb-2 flex items-center gap-1"><AlertOctagon className="w-3.5 h-3.5" /> Nivel Crítico (Roja)</label>
                  <input type="number" min="0" value={formEdit.alertaCritica} onChange={e => setFormEdit({...formEdit, alertaCritica: Number(e.target.value)})} className="w-full bg-bg-card border border-red-500/50 rounded-md px-4 py-2 text-text-primary outline-none focus:ring-1 focus:ring-red-500" />
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t border-border-custom">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 rounded-md text-text-secondary hover:bg-bg-subtle border border-border-custom transition-colors cursor-pointer" disabled={loading}>Cancelar</button>
                <button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-md font-medium flex items-center gap-2 cursor-pointer" disabled={loading}>
                  <Save className="w-4 h-4" /> 
                  {loading ? "Guardando..." : "Guardar Artículo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CARGA / DESCARGA MANUAL */}
      {isModalOpen && modalType === "ADJUST" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-card border border-border-custom rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-border-custom bg-bg-subtle">
              <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                <ArrowDownUp className="w-5 h-5 text-blue-500" />
                Ajuste Manual de Stock
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-text-muted hover:text-text-primary transition-colors cursor-pointer">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSaveAdjust} className="p-6 space-y-5">
              <div className="bg-bg-subtle p-4 rounded-lg border border-border-custom">
                <p className="text-xs text-text-muted uppercase font-semibold mb-1">Artículo a modificar</p>
                <p className="text-text-primary font-bold">{itemSeleccionado?.nombre}</p>
                <p className="text-sm text-text-muted mt-1">Stock Actual: <strong className="text-text-primary">{itemSeleccionado?.cantidad}</strong></p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Tipo de Ajuste</label>
                  <select value={formAdjust.tipo} onChange={e => setFormAdjust({...formAdjust, tipo: e.target.value})} className={`w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-2.5 text-text-primary outline-none ${formAdjust.tipo === 'Entrada' ? 'text-emerald-500' : 'text-red-500'}`}>
                    <option value="Entrada">Entrada (+)</option>
                    <option value="Salida">Salida (-)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Cantidad</label>
                  <input type="number" min="1" value={formAdjust.cantidad} onChange={e => setFormAdjust({...formAdjust, cantidad: Number(e.target.value)})} className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-2.5 text-text-primary focus:border-blue-500 outline-none" required />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Justificación / Motivo</label>
                <input type="text" value={formAdjust.justificacion} onChange={e => setFormAdjust({...formAdjust, justificacion: e.target.value})} className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-2.5 text-text-primary focus:border-blue-500 outline-none" placeholder="Ej: Ajuste de inventario, Devolución..." required />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Realizado por (Usuario)</label>
                <input type="text" value={formAdjust.usuario} onChange={e => setFormAdjust({...formAdjust, usuario: e.target.value})} className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-2.5 text-text-primary focus:border-blue-500 outline-none" required />
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t border-border-custom">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 rounded-md text-text-secondary hover:bg-bg-subtle border border-border-custom transition-colors cursor-pointer" disabled={loading}>Cancelar</button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium flex items-center gap-2 cursor-pointer" disabled={loading}>
                  <Save className="w-4 h-4" /> 
                  {loading ? "Procesando..." : "Registrar Movimiento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
