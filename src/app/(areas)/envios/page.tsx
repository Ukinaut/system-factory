"use client";

import { useState, useEffect } from "react";
import { Package, Truck, Search, CheckCircle, ChevronRight, X, MapPin, CheckSquare, Square, ClipboardCheck, Eye, Navigation, Compass, ShieldAlert, Award, Trash2, Boxes, Plus, Minus } from "lucide-react";
import { getShippings, updateShipping, deleteShipping } from "@/actions/logistics";
import { getCurrentUserSession } from "@/actions/users";
import { getProducts } from "@/actions/products";

const SOLUCIONES_DISPONIBLES = [
  {
    nombre: "EXPORTACION SOLUCION BLUK BASICO",
    componentes: [
      { nombre: "GABINETE", cantidad: 1 },
      { nombre: "PROTECTOR ENVOLVENTE", cantidad: 1 }
    ]
  },
  {
    nombre: "EXPORTACION SOLUCION STANDARD",
    componentes: [
      { nombre: "GABINETE", cantidad: 1 },
      { nombre: "PROTECTOR ENVOLVENTE", cantidad: 1 },
      { nombre: "PRENSACABLE", cantidad: 1 },
      { nombre: "CABLE PUENTE", cantidad: 1 },
      { nombre: "TORNILLO LARGO M8 X4", cantidad: 1 },
      { nombre: "TUERCA LARGA M8 X4", cantidad: 1 }
    ]
  },
  {
    nombre: "EXPORTACION SOLUCION PLUS",
    componentes: [
      { nombre: "GABINETE", cantidad: 1 },
      { nombre: "PROTECTOR ENVOLVENTE", cantidad: 1 },
      { nombre: "PRENSACABLE", cantidad: 1 },
      { nombre: "TORNILLO LARGO M8 X4", cantidad: 1 },
      { nombre: "TUERCA LARGA M8 X4", cantidad: 1 },
      { nombre: "MODULO INTEGRADO", cantidad: 1 },
      { nombre: "CABLE 12V", cantidad: 1 }
    ]
  },
  {
    nombre: "EXPORTACION SOLUCION PRO",
    componentes: [
      { nombre: "GABINETE", cantidad: 1 },
      { nombre: "PROTECTOR ENVOLVENTE", cantidad: 1 },
      { nombre: "IMANES NEODIMIO X4", cantidad: 1 },
      { nombre: "PRENSACABLE", cantidad: 1 },
      { nombre: "TORNILLO LARGO M8 X4", cantidad: 1 },
      { nombre: "TUERCA LARGA M8 X4", cantidad: 1 },
      { nombre: "MODULO INTEGRADO", cantidad: 1 },
      { nombre: "CABLE 12V", cantidad: 1 }
    ]
  },
  {
    nombre: "EXPORTACION SOLUCION ULTRA+",
    componentes: [
      { nombre: "GABINETE", cantidad: 1 },
      { nombre: "PROTECTOR ENVOLVENTE", cantidad: 1 },
      { nombre: "IMANES NEODIMIO X4", cantidad: 1 },
      { nombre: "TORNILLO LARGO M8 X4", cantidad: 1 },
      { nombre: "TUERCA LARGA M8 X4", cantidad: 1 },
      { nombre: "MODULO CORPORATIVO", cantidad: 1 },
      { nombre: "GPS", cantidad: 1 },
      { nombre: "MIKROTIK", cantidad: 1 },
      { nombre: "TELTONIKA", cantidad: 1 },
      { nombre: "VALVULAS HIDROFUGAS", cantidad: 1 },
      { nombre: "CAMARA STREMING", cantidad: 1 },
      { nombre: "MODULO S/D 1A", cantidad: 1 },
      { nombre: "CONECTOR IP65 2 PINES", cantidad: 1 },
      { nombre: "CONECTOR IP67 2 PINES", cantidad: 1 },
      { nombre: "CONECTOR IP68 4 PINES", cantidad: 1 },
      { nombre: "CONECTOR RJ45 HEMBRA AMARILLO", cantidad: 1 }
    ]
  },
  {
    nombre: "NACIONAL STANDARD",
    componentes: [
      { nombre: "GABINETE", cantidad: 1 },
      { nombre: "PROTECTOR ENVOLVENTE", cantidad: 1 },
      { nombre: "PRENSACABLE", cantidad: 1 },
      { nombre: "CABLE PUENTE", cantidad: 1 },
      { nombre: "TORNILLO LARGO M8 X4", cantidad: 1 },
      { nombre: "TUERCA LARGA M8 X4", cantidad: 1 }
    ]
  },
  {
    nombre: "NACIONAL PRO",
    componentes: [
      { nombre: "GABINETE", cantidad: 1 },
      { nombre: "PROTECTOR ENVOLVENTE", cantidad: 1 },
      { nombre: "IMANES NEODIMIO X4", cantidad: 1 },
      { nombre: "PRENSACABLE", cantidad: 1 },
      { nombre: "TORNILLO LARGO M8 X4", cantidad: 1 },
      { nombre: "TUERCA LARGA M8 X4", rounded: true, cantidad: 1 },
      { nombre: "MODULO INTEGRADO", cantidad: 1 },
      { nombre: "CABLE 12V", cantidad: 1 }
    ]
  },
  {
    nombre: "NACIONAL ULTRA+",
    componentes: [
      { nombre: "GABINETE", cantidad: 1 },
      { nombre: "PROTECTOR ENVOLVENTE", cantidad: 1 },
      { nombre: "IMANES NEODIMIO X4", cantidad: 1 },
      { nombre: "TORNILLO LARGO M8 X4", cantidad: 1 },
      { nombre: "TUERCA LARGA M8 X4", cantidad: 1 },
      { nombre: "MODULO CORPORATIVO", cantidad: 1 },
      { nombre: "GPS", cantidad: 1 },
      { nombre: "MIKROTIK", cantidad: 1 },
      { nombre: "TELTONIKA", cantidad: 1 },
      { nombre: "VALVULAS HIDROFUGAS", cantidad: 1 },
      { nombre: "CAMARA STREMING", cantidad: 1 },
      { nombre: "MODULO S/D 1A", cantidad: 1 },
      { nombre: "CONECTOR IP65 2 PINES", cantidad: 1 },
      { nombre: "CONECTOR IP67 2 PINES", cantidad: 1 },
      { nombre: "CONECTOR IP68 4 PINES", cantidad: 1 },
      { nombre: "CONECTOR RJ45 HEMBRA AMARILLO", cantidad: 1 }
    ]
  }
];

export default function EnviosDashboard() {
  const [activeTab, setActiveTab] = useState("para-empacar");
  const [busqueda, setBusqueda] = useState("");
  const [isPackModalOpen, setIsPackModalOpen] = useState(false);
  const [isShipModalOpen, setIsShipModalOpen] = useState(false);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [envioSeleccionado, setEnvioSeleccionado] = useState<any>(null);
  const [shippings, setShippings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemsChecklist, setItemsChecklist] = useState<Record<string, boolean>>({});

  // Cajas de stock para el embalaje
  const [stockProductosCajas, setStockProductosCajas] = useState<any[]>([]);
  const [cajasSeleccionadas, setCajasSeleccionadas] = useState<Record<string, { checked: boolean; cantidad: number; nombre: string }>>({});
  const [busquedaCajas, setBusquedaCajas] = useState("");

  const [formDespacho, setFormDespacho] = useState({
    logistica: "Correo Argentino",
    tracking: "",
    checklist: [false]
  });

  const [session, setSession] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    const res = await getShippings();
    if (res.success) {
      setShippings(res.shippings || []);
    }
    const sessionRes = await getCurrentUserSession();
    if (sessionRes.success) {
      setSession(sessionRes.session);
    }
    const productsRes = await getProducts("Todos");
    if (productsRes.success) {
      const packagingItems = (productsRes.products || []).filter((p: any) => {
        const name = (p.nombre || "").toLowerCase();
        return (
          name.includes("caja") ||
          name.includes("cajita") ||
          name.includes("bolsa") ||
          name.includes("bolsas") ||
          name.includes("bolsita") ||
          name.includes("burbuja") ||
          name.includes("film") ||
          name.includes("sobre")
        );
      });
      setStockProductosCajas(packagingItems);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Mapear los envíos en base a su estado
  const listParaEmpacar = shippings.filter(s => s.estado === "PARA_EMPACAR");
  const listEmpacados = shippings.filter(s => s.estado === "EMPACADO");
  const listDespachados = shippings.filter(s => s.estado === "DESPACHADO");
  const listEntregados = shippings.filter(s => s.estado === "ENTREGADO");

  // Filtro de búsqueda general
  const filterBySearch = (list: any[]) => {
    return list.filter(s => {
      const q = busqueda.toLowerCase();
      const nro = (s.sale?.numeroOrden || "").toLowerCase();
      const cli = (s.sale?.client?.razonSocial || "").toLowerCase();
      const trk = (s.tracking || "").toLowerCase();
      return nro.includes(q) || cli.includes(q) || trk.includes(q);
    });
  };

  const paraEmpacarFiltrados = filterBySearch(listParaEmpacar);
  const empacadosFiltrados = filterBySearch(listEmpacados);
  const despachadosFiltrados = filterBySearch(listDespachados);
  const entregadosFiltrados = filterBySearch(listEntregados);

  // Abrir Modal de Empaque (Checklist)
  const abrirModalEmpaque = (envio: any) => {
    setEnvioSeleccionado(envio);
    
    // Generar checklist de ítems/componentes
    const initialItemsChecklist: Record<string, boolean> = {};
    envio.sale?.details?.forEach((detail: any) => {
      const isKit = SOLUCIONES_DISPONIBLES.some(k => k.nombre === detail.producto?.nombre);
      const components = detail.componentesSeleccionados 
        ? JSON.parse(detail.componentesSeleccionados) 
        : (isKit ? SOLUCIONES_DISPONIBLES.find(k => k.nombre === detail.producto?.nombre)?.componentes || [] : []);

      if (components.length > 0) {
        components.forEach((comp: any) => {
          const key = `${detail.id}-comp-${comp.nombre}`;
          initialItemsChecklist[key] = false;
        });
      } else {
        initialItemsChecklist[detail.id] = false;
      }
    });
    setItemsChecklist(initialItemsChecklist);

    // Cargar estado inicial de cajas seleccionadas si existieran
    const initialCajasState: Record<string, { checked: boolean; cantidad: number; nombre: string }> = {};
    if (envio.cajasUtilizadas) {
      try {
        const parsed = JSON.parse(envio.cajasUtilizadas);
        parsed.forEach((c: any) => {
          initialCajasState[c.id] = { checked: true, cantidad: c.cantidad, nombre: c.nombre };
        });
      } catch (err) {
        console.error("Error parsing cajasUtilizadas:", err);
      }
    }
    setCajasSeleccionadas(initialCajasState);
    setBusquedaCajas("");

    setFormDespacho({
      logistica: "Correo Argentino",
      tracking: "",
      checklist: [false]
    });
    setIsPackModalOpen(true);
  };

  // Abrir Modal de Despacho (Tracking/Transporte)
  const abrirModalDespacho = (envio: any) => {
    setEnvioSeleccionado(envio);
    setFormDespacho({
      logistica: envio.logistica || "Correo Argentino",
      tracking: envio.tracking || "",
      checklist: [true]
    });
    setIsShipModalOpen(true);
  };

  // Abrir Modal de Seguimiento en Vivo
  const abrirModalTracking = (envio: any) => {
    setEnvioSeleccionado(envio);
    setIsTrackingModalOpen(true);
  };

  const toggleChecklist = (index: number) => {
    const newChecklist = [...formDespacho.checklist];
    newChecklist[index] = !newChecklist[index];
    setFormDespacho({ ...formDespacho, checklist: newChecklist });
  };

  const itemsChecklistCompleto = Object.values(itemsChecklist).every(Boolean);
  const checklistCompleto = formDespacho.checklist.every(Boolean) && itemsChecklistCompleto;

  // Completar empaque y pasar a EMPACADO
  const handleEmpacar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checklistCompleto) {
      alert("Por favor completa todo el checklist de depósito.");
      return;
    }

    const cajasUtilizadas = Object.entries(cajasSeleccionadas)
      .filter(([_, val]) => val.checked && val.cantidad > 0)
      .map(([id, val]) => ({ id, nombre: val.nombre, cantidad: val.cantidad }));

    setLoading(true);
    const res = await updateShipping({
      id: envioSeleccionado.id,
      estado: "EMPACADO",
      cajasUtilizadas
    });
    setLoading(false);

    if (res.success) {
      alert(`Orden ${envioSeleccionado.sale?.numeroOrden || ""} empaquetada correctamente.`);
      setIsPackModalOpen(false);
      loadData();
    } else {
      alert("Error al empacar: " + res.error);
    }
  };

  // Registrar transporte y tracking y pasar a DESPACHADO
  const handleDespachar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDespacho.tracking.trim()) {
      alert("Por favor ingresa un número de tracking válido.");
      return;
    }
    setLoading(true);
    const res = await updateShipping({
      id: envioSeleccionado.id,
      logistica: formDespacho.logistica,
      tracking: formDespacho.tracking,
      estado: "DESPACHADO",
      subEstado: "RECIBIDO"
    });
    setLoading(false);

    if (res.success) {
      alert(`Envío asignado a ${formDespacho.logistica} y despachado con éxito.`);
      setIsShipModalOpen(false);
      loadData();
    } else {
      alert("Error al despachar: " + res.error);
    }
  };

  // Manejar el cambio rápido del sub-estado de logística
  const handleSubEstadoChange = async (envioId: string, subEst: string) => {
    setLoading(true);
    const targetEstado = subEst === "ENTREGADO" ? "ENTREGADO" : "DESPACHADO";
    const res = await updateShipping({
      id: envioId,
      estado: targetEstado,
      subEstado: subEst
    });
    setLoading(false);
    if (res.success) {
      loadData();
      alert(subEst === "ENTREGADO" ? "Envío entregado correctamente." : "Estado de logística actualizado.");
    } else {
      alert("Error al actualizar: " + res.error);
    }
  };

  const handleDeleteShipping = async (envioId: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este envío en su totalidad? Esta acción no se puede deshacer.")) {
      return;
    }
    setLoading(true);
    const res = await deleteShipping(envioId);
    setLoading(false);
    if (res.success) {
      alert("Envío eliminado con éxito.");
      loadData();
    } else {
      alert("Error al eliminar el envío: " + res.error);
    }
  };

  // Obtener URL de tracking oficial
  const getLogisticsTrackingUrl = (logistica: string, tracking: string) => {
    const trk = encodeURIComponent(tracking || "");
    switch (logistica) {
      case "Correo Argentino":
        return `https://www.correoargentino.com.ar/formularios/ondepaquete?numero=${trk}`;
      case "Andreani":
        return `https://www.andreani.com/#!/informacionEnvio/${trk}`;
      case "DHL":
        return `https://www.dhl.com/ar-es/home/tracking.html?tracking-id=${trk}`;
      case "OCASA":
        return `https://www.ocasa.com/es/tracking?nro=${trk}`;
      case "OCA":
        return `https://www5.oca.com.ar/ocaexpresspak/tracking/TrackingNoProduct.aspx?NumeroEnvio=${trk}`;
      case "TASA Logística":
        return `https://www.tasalogistica.com.ar/`;
      case "Cruz del Sur":
        return `https://www.cruzdelsur.com.ar/tracking?nro=${trk}`;
      case "FedEx":
        return `https://www.fedex.com/apps/fedextrack/?tracknumbers=${trk}`;
      case "UPS":
        return `https://www.ups.com/track?loc=es_AR&trackNums=${trk}`;
      case "Vía Bariloche":
        return `https://www.viabariloche.com.ar/`;
      case "Vía Cargo":
        return `https://www.viacargo.com.ar/tracking?tracking=${trk}`;
      default:
        return "#";
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-wide flex items-center gap-3 mb-2">
            <Package className="text-purple-500 w-8 h-8" />
            G. Envíos y Logística
          </h1>
          <p className="text-text-muted">Control de empaque, despacho de mercadería física y seguimiento de entregas en vivo.</p>
        </div>
      </div>

      {/* Tabs de 4 estados */}
      <div className="flex border-b border-border-custom mb-6 overflow-x-auto whitespace-nowrap">
        <button 
          onClick={() => setActiveTab("para-empacar")}
          className={`px-6 py-3 font-semibold text-sm tracking-wider uppercase transition-colors flex items-center gap-2 cursor-pointer ${activeTab === 'para-empacar' ? 'text-purple-500 border-b-2 border-purple-500' : 'text-text-muted hover:text-text-primary'}`}
        >
          Para Empacar <span className="bg-bg-subtle text-text-muted text-xs px-2 py-0.5 rounded-full border border-border-custom">{listParaEmpacar.length}</span>
        </button>
        <button 
          onClick={() => setActiveTab("empacados")}
          className={`px-6 py-3 font-semibold text-sm tracking-wider uppercase transition-colors flex items-center gap-2 cursor-pointer ${activeTab === 'empacados' ? 'text-purple-500 border-b-2 border-purple-500' : 'text-text-muted hover:text-text-primary'}`}
        >
          Empacados / Listos <span className="bg-bg-subtle text-text-muted text-xs px-2 py-0.5 rounded-full border border-border-custom">{listEmpacados.length}</span>
        </button>
        <button 
          onClick={() => setActiveTab("despachados")}
          className={`px-6 py-3 font-semibold text-sm tracking-wider uppercase transition-colors flex items-center gap-2 cursor-pointer ${activeTab === 'despachados' ? 'text-purple-500 border-b-2 border-purple-500' : 'text-text-muted hover:text-text-primary'}`}
        >
          En Tránsito <span className="bg-bg-subtle text-text-muted text-xs px-2 py-0.5 rounded-full border border-border-custom">{listDespachados.length}</span>
        </button>
        <button 
          onClick={() => setActiveTab("entregados")}
          className={`px-6 py-3 font-semibold text-sm tracking-wider uppercase transition-colors flex items-center gap-2 cursor-pointer ${activeTab === 'entregados' ? 'text-purple-500 border-b-2 border-purple-500' : 'text-text-muted hover:text-text-primary'}`}
        >
          Entregados <span className="bg-bg-subtle text-text-muted text-xs px-2 py-0.5 rounded-full border border-border-custom">{listEntregados.length}</span>
        </button>
      </div>

      <div className="bg-bg-card rounded-xl border border-border-custom shadow-xl overflow-hidden">
        {/* Barra de Búsqueda */}
        <div className="p-6 border-b border-border-custom bg-bg-subtle flex gap-4">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3 top-3.5 text-gray-500" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full bg-bg-card border border-border-custom rounded-md pl-10 pr-4 py-3 text-text-primary focus:border-purple-500 outline-none transition-colors text-sm"
              placeholder="Buscar por Cliente, N° de Orden o Tracking..."
            />
          </div>
        </div>

        {/* Listado */}
        <div className="divide-y divide-border-custom">
          
          {/* TAB 1: PARA EMPACAR */}
          {activeTab === "para-empacar" && (
            paraEmpacarFiltrados.length > 0 ? (
              paraEmpacarFiltrados.map((envio) => (
                <div key={envio.id} className="p-6 hover:bg-bg-subtle transition-colors flex flex-col md:flex-row items-center justify-between gap-6 text-left">
                  <div className="flex-1 flex items-center gap-4">
                    <div className="p-3 rounded-lg border bg-purple-500/10 border-purple-500/30 text-purple-500">
                      <Package className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-text-primary tracking-wide">{envio.sale?.client?.razonSocial || "Cliente Desconocido"}</h3>
                        <span className="text-xs bg-bg-subtle text-text-muted px-2 py-0.5 rounded font-mono border border-border-custom">{envio.sale?.numeroOrden || "ORD-???"}</span>
                      </div>
                      <p className="text-sm text-text-muted flex items-center gap-1.5 mt-1">
                        <MapPin className="w-3.5 h-3.5" /> Destino: <span className="text-text-secondary">{envio.sale?.client?.direccion || "No especificada"}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => abrirModalEmpaque(envio)}
                      className="flex items-center gap-2 bg-purple-600/10 hover:bg-purple-600 text-purple-500 hover:text-white px-5 py-2.5 rounded-md font-medium transition-colors border border-purple-600/30 hover:border-transparent cursor-pointer text-sm"
                    >
                      Preparar Envío
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    {session?.rol === "ADMIN" && (
                      <button
                        onClick={() => handleDeleteShipping(envio.id)}
                        className="p-2.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-md transition-colors border border-red-500/30 hover:border-transparent cursor-pointer"
                        title="Eliminar Envío por Completo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-text-muted flex flex-col items-center">
                <CheckCircle className="w-12 h-12 text-emerald-500/50 mb-4" />
                <p className="text-lg">No hay órdenes pendientes de empaquetado.</p>
              </div>
            )
          )}

          {/* TAB 2: LISTOS / EMPACADOS */}
          {activeTab === "empacados" && (
            empacadosFiltrados.length > 0 ? (
              empacadosFiltrados.map((envio) => (
                <div key={envio.id} className="p-6 hover:bg-bg-subtle transition-colors flex flex-col md:flex-row items-center justify-between gap-6 text-left">
                  <div className="flex-1 flex items-center gap-4">
                    <div className="p-3 rounded-lg border bg-blue-500/10 border-blue-500/30 text-blue-500">
                      <ClipboardCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-text-primary tracking-wide">{envio.sale?.client?.razonSocial || "Cliente Desconocido"}</h3>
                        <span className="text-xs bg-bg-subtle text-text-muted px-2 py-0.5 rounded font-mono border border-border-custom">{envio.sale?.numeroOrden || "ORD-???"}</span>
                      </div>
                      <p className="text-sm text-text-muted flex items-center gap-1.5 mt-1">
                        <MapPin className="w-3.5 h-3.5" /> Destino: <span className="text-text-secondary">{envio.sale?.client?.direccion || "No especificada"}</span>
                      </p>
                      {envio.cajasUtilizadas && (() => {
                        try {
                          const cajas = JSON.parse(envio.cajasUtilizadas);
                          if (cajas && cajas.length > 0) {
                            return (
                              <p className="text-xs text-text-muted flex items-center gap-1.5 mt-1">
                                <Boxes className="w-3.5 h-3.5 text-purple-400" /> Embalaje: <span className="text-purple-400 font-semibold">{cajas.map((c: any) => `${c.cantidad}x ${c.nombre}`).join(", ")}</span>
                              </p>
                            );
                          }
                        } catch (err) {}
                        return null;
                      })()}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => abrirModalDespacho(envio)}
                      className="flex items-center gap-2 bg-blue-600/10 hover:bg-blue-600 text-blue-500 hover:text-white px-5 py-2.5 rounded-md font-medium transition-colors border border-blue-600/30 hover:border-transparent cursor-pointer text-sm"
                    >
                      Asignar Despacho / Tracking
                      <Truck className="w-4 h-4" />
                    </button>
                    {session?.rol === "ADMIN" && (
                      <button
                        onClick={() => handleDeleteShipping(envio.id)}
                        className="p-2.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-md transition-colors border border-red-500/30 hover:border-transparent cursor-pointer"
                        title="Eliminar Envío por Completo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-text-muted flex flex-col items-center">
                <Package className="w-12 h-12 text-blue-500/50 mb-4" />
                <p className="text-lg">No hay envíos empaquetados listos para retirar.</p>
              </div>
            )
          )}

          {/* TAB 3: EN TRANSITO */}
          {activeTab === "despachados" && (
            despachadosFiltrados.length > 0 ? (
              despachadosFiltrados.map((envio) => (
                <div key={envio.id} className="p-6 hover:bg-bg-subtle transition-colors flex flex-col md:flex-row items-center justify-between gap-6 text-left">
                  <div className="flex-1 flex items-center gap-4">
                    <div className="bg-purple-500/10 p-3 rounded-lg border border-purple-500/30 text-purple-500">
                      <Truck className="w-6 h-6 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-text-primary tracking-wide">{envio.sale?.client?.razonSocial || "Cliente Desconocido"}</h3>
                        <span className="text-xs bg-bg-subtle text-text-muted px-2 py-0.5 rounded font-mono border border-border-custom">{envio.sale?.numeroOrden || "ORD-???"}</span>
                      </div>
                      <p className="text-xs text-text-muted">Transporte: <strong className="text-text-secondary">{envio.logistica}</strong> | Tracking: <strong className="text-text-secondary">{envio.tracking}</strong></p>
                      <p className="text-xs text-text-muted flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" /> Destino: <span className="text-text-secondary truncate">{envio.sale?.client?.direccion || "No especificada"}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                    {/* Selector de Sub-Estado rápido según la logística */}
                    <div className="flex flex-col gap-1 text-left">
                      <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Estado Logística</span>
                      <select
                        value={envio.subEstado || "RECIBIDO"}
                        onChange={(e) => handleSubEstadoChange(envio.id, e.target.value)}
                        className="bg-bg-card border border-border-custom rounded-md px-3 py-1.5 text-xs text-text-primary focus:border-purple-500 outline-none cursor-pointer"
                      >
                        <option value="RECIBIDO">Recibido en Sucursal</option>
                        <option value="TRANSITO">En Camino (Tránsito)</option>
                        <option value="DISTRIBUCION">En Distribución Local</option>
                        <option value="INCIDENCIA">Incidencia (Domicilio cerrado)</option>
                        <option value="ENTREGADO">Entregado (Finalizar)</option>
                      </select>
                    </div>

                    <button 
                      onClick={() => abrirModalTracking(envio)}
                      className="flex items-center justify-center gap-2 bg-purple-600/10 hover:bg-purple-600 text-purple-500 hover:text-white px-4 py-2 rounded-md font-bold transition-all border border-purple-600/30 hover:border-transparent cursor-pointer text-xs sm:self-end h-[34px]"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      Seguimiento en Vivo
                    </button>
                    {session?.rol === "ADMIN" && (
                      <button
                        onClick={() => handleDeleteShipping(envio.id)}
                        className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-md transition-colors border border-red-500/30 hover:border-transparent cursor-pointer h-[34px] flex items-center justify-center sm:self-end"
                        title="Eliminar Envío por Completo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-text-muted flex flex-col items-center">
                <Truck className="w-12 h-12 text-purple-500/50 mb-4" />
                <p className="text-lg">No hay envíos en tránsito actualmente.</p>
              </div>
            )
          )}

          {/* TAB 4: ENTREGADOS */}
          {activeTab === "entregados" && (
            entregadosFiltrados.length > 0 ? (
              entregadosFiltrados.map((envio) => (
                <div key={envio.id} className="p-6 bg-bg-subtle/20 flex flex-col md:flex-row items-center justify-between gap-6 border-b border-border-custom text-left">
                  <div className="flex-1 flex items-center gap-4">
                    <div className="bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/30 text-emerald-500">
                      <CheckCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-text-primary tracking-wide">{envio.sale?.client?.razonSocial || "Cliente Desconocido"}</h3>
                        <span className="text-xs bg-bg-subtle text-text-muted px-2 py-0.5 rounded font-mono border border-border-custom">{envio.sale?.numeroOrden || "ORD-???"}</span>
                      </div>
                      <p className="text-sm text-text-muted">Entregado con éxito a destino ({envio.sale?.client?.direccion || "No especificada"})</p>
                      <p className="text-xs text-text-muted">Transportado por: <strong>{envio.logistica}</strong> | Ref Tracking: <strong>{envio.tracking}</strong></p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="bg-bg-card p-3 rounded-lg border border-border-custom/50 flex items-center gap-1.5 text-xs text-emerald-500 font-bold">
                      <Award className="w-4 h-4 text-emerald-500" /> Entrega Finalizada
                    </div>
                    {session?.rol === "ADMIN" && (
                      <button
                        onClick={() => handleDeleteShipping(envio.id)}
                        className="p-2.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-md transition-colors border border-red-500/30 hover:border-transparent cursor-pointer"
                        title="Eliminar Envío por Completo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-text-muted flex flex-col items-center">
                <CheckCircle className="w-12 h-12 text-emerald-500/50 mb-4" />
                <p className="text-lg">No hay envíos de equipo entregados todavía.</p>
              </div>
            )
          )}
        </div>
      </div>

      {/* Modal 1: Preparar Envío (Checklist) */}
      {isPackModalOpen && envioSeleccionado && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-card border border-border-custom rounded-xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-border-custom bg-bg-subtle shrink-0">
              <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-purple-500" />
                Checklist de Empaque: {envioSeleccionado.sale?.numeroOrden || "ORD-???"}
              </h2>
              <button onClick={() => setIsPackModalOpen(false)} className="text-text-muted hover:text-text-primary transition-colors flex items-center justify-center cursor-pointer">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleEmpacar} className="p-6 space-y-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* COLUMNA IZQUIERDA: Checklist de Pedido y Tareas */}
                <div className="space-y-6">
                  <div className="bg-bg-subtle p-4 rounded-lg border border-border-custom text-left">
                    <p className="text-xs text-text-muted mb-1">Destino Final</p>
                    <p className="font-bold text-text-primary flex items-center gap-2 text-sm"><MapPin className="w-4 h-4 text-purple-500" /> {envioSeleccionado.sale?.client?.direccion || "No especificada"}</p>
                    <div className="mt-3 pt-3 border-t border-border-custom text-left space-y-3">
                      <p className="text-xs text-text-muted uppercase font-semibold mb-2">Artículos y Componentes a Empacar:</p>
                      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2">
                        {envioSeleccionado.sale?.details?.map((detail: any) => {
                          const isKit = SOLUCIONES_DISPONIBLES.some(k => k.nombre === detail.producto?.nombre);
                          const components = detail.componentesSeleccionados 
                            ? JSON.parse(detail.componentesSeleccionados) 
                            : (isKit ? SOLUCIONES_DISPONIBLES.find(k => k.nombre === detail.producto?.nombre)?.componentes || [] : []);

                          if (components.length > 0) {
                            return (
                              <div key={detail.id} className="p-3 bg-bg-card rounded-lg border border-border-custom space-y-2.5">
                                <div className="font-bold text-text-primary text-xs flex items-center gap-1.5 border-b border-border-custom/50 pb-1.5">
                                  <span>📦 Kit: {detail.producto?.nombre} (x{detail.cantidad})</span>
                                </div>
                                <div className="pl-3 space-y-2">
                                  {components.map((comp: any, compIdx: number) => {
                                    const key = `${detail.id}-comp-${comp.nombre}`;
                                    const isChecked = !!itemsChecklist[key];
                                    return (
                                      <div 
                                        key={compIdx} 
                                        className="flex items-start gap-2.5 cursor-pointer text-xs text-text-secondary hover:text-text-primary"
                                        onClick={() => {
                                          setItemsChecklist(prev => ({
                                            ...prev,
                                            [key]: !prev[key]
                                          }));
                                        }}
                                      >
                                        {isChecked ? (
                                          <CheckSquare className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                                        ) : (
                                          <Square className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />
                                        )}
                                        <div className="flex-1 flex justify-between items-center">
                                          <span className={isChecked ? "line-through text-text-muted" : ""}>{comp.nombre}</span>
                                          <span className="font-mono bg-bg-subtle px-1.5 py-0.5 rounded border border-border-custom text-[10px] font-bold">x{comp.cantidad * detail.cantidad}</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          } else {
                            // Producto regular
                            const key = detail.id;
                            const isChecked = !!itemsChecklist[key];
                            return (
                              <div 
                                key={detail.id} 
                                className="flex items-center gap-3 p-3 bg-bg-card rounded-lg border border-border-custom cursor-pointer text-xs text-text-secondary hover:text-text-primary"
                                onClick={() => {
                                  setItemsChecklist(prev => ({
                                    ...prev,
                                    [key]: !prev[key]
                                  }));
                                }}
                              >
                                {isChecked ? (
                                  <CheckSquare className="w-4 h-4 text-purple-500 shrink-0" />
                                ) : (
                                  <Square className="w-4 h-4 text-text-muted shrink-0" />
                                )}
                                <div className="flex-1 flex justify-between items-center font-bold text-text-primary">
                                  <span className={isChecked ? "line-through text-text-muted" : ""}>{detail.producto?.nombre}</span>
                                  <span className="font-mono bg-bg-subtle px-1.5 py-0.5 rounded border border-border-custom text-[10px] font-bold">x{detail.cantidad}</span>
                                </div>
                              </div>
                            );
                          }
                        })}
                        {(!envioSeleccionado.sale?.details || envioSeleccionado.sale.details.length === 0) && (
                          <div className="text-sm text-text-muted italic">
                            Kits de Conectividad Satelital / Equipos Físicos
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Checklist Operativo */}
                  <div className="text-left">
                    <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Tareas de Verificación en Depósito</label>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 cursor-pointer" onClick={() => toggleChecklist(0)}>
                        {formDespacho.checklist[0] ? <CheckSquare className="w-5 h-5 text-emerald-500 flex-shrink-0" /> : <Square className="w-5 h-5 text-text-muted flex-shrink-0" />}
                        <span className={formDespacho.checklist[0] ? "text-text-muted line-through" : "text-text-primary"}>Empaquetado seguro anti-golpes y sellado de caja</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* COLUMNA DERECHA: Panel Lateral de Cajas y Bolsas de Stock */}
                <div className="bg-bg-subtle p-4 rounded-lg border border-border-custom text-left flex flex-col h-full min-h-[480px]">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-text-primary text-sm flex items-center gap-2">
                      <Boxes className="w-4 h-4 text-purple-500" />
                      Cajas y Bolsas del Stock (Embalaje)
                    </h4>
                    <span className="text-[10px] text-text-muted bg-bg-card px-2 py-0.5 rounded border border-border-custom font-mono">
                      {Object.values(cajasSeleccionadas).filter(c => c.checked && c.cantidad > 0).length} seleccionadas
                    </span>
                  </div>
                  <p className="text-xs text-text-muted mb-3">
                    Tilda cuáles cajas o bolsas del stock se utilizaron para preparar el embalaje e indica la cantidad.
                  </p>

                  {/* Buscador de Cajas y Bolsas */}
                  <div className="relative mb-3">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-500" />
                    <input
                      type="text"
                      value={busquedaCajas}
                      onChange={(e) => setBusquedaCajas(e.target.value)}
                      className="w-full bg-bg-card border border-border-custom rounded-md pl-8 pr-3 py-1.5 text-xs text-text-primary focus:border-purple-500 outline-none"
                      placeholder="Buscar caja o bolsa en el inventario..."
                    />
                  </div>

                  {/* Lista de Cajas del Stock */}
                  <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1 flex-1">
                    {stockProductosCajas
                      .filter((p: any) => {
                        if (!busquedaCajas.trim()) return true;
                        return p.nombre.toLowerCase().includes(busquedaCajas.toLowerCase());
                      })
                      .map((prod: any) => {
                        const itemState = cajasSeleccionadas[prod.id] || { checked: false, cantidad: 1, nombre: prod.nombre };
                        return (
                          <div 
                            key={prod.id}
                            className={`p-2.5 rounded-lg border transition-all ${
                              itemState.checked 
                                ? "bg-purple-500/10 border-purple-500/40 text-text-primary" 
                                : "bg-bg-card border-border-custom/70 text-text-secondary hover:border-border-custom"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div 
                                className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
                                onClick={() => {
                                  setCajasSeleccionadas(prev => ({
                                    ...prev,
                                    [prod.id]: {
                                      checked: !(prev[prod.id]?.checked),
                                      cantidad: prev[prod.id]?.cantidad || 1,
                                      nombre: prod.nombre
                                    }
                                  }));
                                }}
                              >
                                {itemState.checked ? (
                                  <CheckSquare className="w-4 h-4 text-purple-500 shrink-0" />
                                ) : (
                                  <Square className="w-4 h-4 text-text-muted shrink-0" />
                                )}
                                <div className="truncate">
                                  <p className={`text-xs font-bold truncate ${itemState.checked ? "text-purple-400" : "text-text-primary"}`}>
                                    {prod.nombre}
                                  </p>
                                  <p className="text-[10px] text-text-muted">
                                    Stock disp: <span className="font-semibold text-text-secondary">{prod.cantidad} u.</span>
                                  </p>
                                </div>
                              </div>

                              {/* Contador de Cantidad */}
                              {itemState.checked && (
                                <div className="flex items-center gap-1 shrink-0 bg-bg-card p-1 rounded border border-purple-500/30">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const newCant = Math.max(1, itemState.cantidad - 1);
                                      setCajasSeleccionadas(prev => ({
                                        ...prev,
                                        [prod.id]: { ...prev[prod.id], cantidad: newCant }
                                      }));
                                    }}
                                    className="p-1 rounded hover:bg-bg-subtle text-text-muted hover:text-text-primary cursor-pointer"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <input
                                    type="number"
                                    min="1"
                                    max={prod.cantidad || 99}
                                    value={itemState.cantidad}
                                    onChange={(e) => {
                                      const val = Math.max(1, parseInt(e.target.value) || 1);
                                      setCajasSeleccionadas(prev => ({
                                        ...prev,
                                        [prod.id]: { ...prev[prod.id], cantidad: val }
                                      }));
                                    }}
                                    className="w-9 text-center text-xs font-bold bg-transparent text-text-primary outline-none font-mono"
                                  />
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const newCant = itemState.cantidad + 1;
                                      setCajasSeleccionadas(prev => ({
                                        ...prev,
                                        [prod.id]: { ...prev[prod.id], cantidad: newCant }
                                      }));
                                    }}
                                    className="p-1 rounded hover:bg-bg-subtle text-text-muted hover:text-text-primary cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    {stockProductosCajas.length === 0 && (
                      <div className="text-center py-6 text-xs text-text-muted">
                        No hay cajas ni bolsas registradas en el stock.
                      </div>
                    )}
                  </div>
                </div>

              </div>

              <div className="flex justify-end gap-4 pt-4 border-t border-border-custom shrink-0">
                <button type="button" onClick={() => setIsPackModalOpen(false)} className="px-6 py-2 rounded-md text-text-secondary hover:bg-bg-subtle border border-border-custom transition-colors cursor-pointer" disabled={loading}>
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={!checklistCompleto || loading}
                  className={`px-6 py-2 rounded-md font-medium flex items-center gap-2 transition-colors ${checklistCompleto && !loading ? 'bg-purple-600 hover:bg-purple-700 text-white cursor-pointer' : 'bg-bg-subtle border border-border-custom text-text-muted cursor-not-allowed'}`}
                >
                  <CheckCircle className="w-5 h-5" />
                  {loading ? "Empacando..." : "Finalizar Empaque (Listo)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Registrar Transporte / Tracking (Despachar) */}
      {isShipModalOpen && envioSeleccionado && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-card border border-border-custom rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-border-custom bg-bg-subtle">
              <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-500" />
                Despachar Orden: {envioSeleccionado.sale?.numeroOrden || "ORD-???"}
              </h2>
              <button onClick={() => setIsShipModalOpen(false)} className="text-text-muted hover:text-text-primary transition-colors flex items-center justify-center cursor-pointer">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleDespachar} className="p-6 space-y-4 text-left">
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Empresa de Logística</label>
                <select
                  value={formDespacho.logistica}
                  onChange={e => setFormDespacho({...formDespacho, logistica: e.target.value})}
                  className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-3 text-text-primary focus:border-blue-500 outline-none cursor-pointer text-sm"
                >
                  <option value="Correo Argentino">Correo Argentino</option>
                  <option value="Andreani">Andreani</option>
                  <option value="DHL">DHL</option>
                  <option value="OCASA">OCASA</option>
                  <option value="OCA">OCA</option>
                  <option value="TASA Logística">TASA Logística</option>
                  <option value="Cruz del Sur">Cruz del Sur</option>
                  <option value="FedEx">FedEx</option>
                  <option value="UPS">UPS</option>
                  <option value="Vía Bariloche">Vía Bariloche</option>
                  <option value="Vía Cargo">Vía Cargo</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Código de Seguimiento (Tracking) *</label>
                <input
                  type="text"
                  value={formDespacho.tracking}
                  onChange={e => setFormDespacho({...formDespacho, tracking: e.target.value})}
                  className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-3 text-text-primary focus:border-blue-500 outline-none text-sm"
                  placeholder="Ej: AR-90281-ML"
                  required
                  disabled={loading}
                />
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t border-border-custom">
                <button type="button" onClick={() => setIsShipModalOpen(false)} className="px-5 py-2 rounded-md text-text-secondary hover:bg-bg-subtle border border-border-custom transition-colors cursor-pointer text-sm" disabled={loading}>
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-md font-medium flex items-center gap-2 transition-colors cursor-pointer text-sm"
                >
                  <Truck className="w-5 h-5" />
                  {loading ? "Despachando..." : "Despachar y Notificar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Seguimiento en Vivo (Simulador de Transporte) */}
      {isTrackingModalOpen && envioSeleccionado && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-card border border-border-custom rounded-xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-border-custom bg-bg-subtle">
              <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                <Compass className="w-5 h-5 text-purple-500 animate-spin" />
                Seguimiento en Vivo: {envioSeleccionado.sale?.numeroOrden || "ORD-???"}
              </h2>
              <button onClick={() => setIsTrackingModalOpen(false)} className="text-text-muted hover:text-text-primary transition-colors flex items-center justify-center cursor-pointer">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 text-left">
              {/* Información General del Tracking */}
              <div className="bg-bg-subtle border border-border-custom rounded-xl p-4 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="block text-text-muted font-bold uppercase tracking-wider mb-0.5">Transportista</span>
                  <strong className="text-sm text-text-primary">{envioSeleccionado.logistica}</strong>
                </div>
                <div>
                  <span className="block text-text-muted font-bold uppercase tracking-wider mb-0.5">Código Referencia</span>
                  <strong className="text-sm text-purple-500 font-mono tracking-wider">{envioSeleccionado.tracking}</strong>
                </div>
                <div className="col-span-2 border-t border-border-custom/50 pt-2 mt-1">
                  <span className="block text-text-muted font-bold uppercase tracking-wider mb-0.5">Destino Final de Entrega</span>
                  <span className="text-text-secondary text-sm font-semibold flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-purple-500 shrink-0" /> {envioSeleccionado.sale?.client?.direccion || "Dirección no especificada"}</span>
                </div>
              </div>

              {/* Linea de tiempo simulada del transportista según subEstado */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">Historial de Tránsito (Logística)</h4>
                
                <div className="relative border-l-2 border-border-custom ml-3.5 pl-6 space-y-6">
                  {/* PASO 1: Recibido en origen */}
                  <div className="relative">
                    <div className={`absolute -left-[32px] top-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center bg-bg-card ${
                      envioSeleccionado.subEstado === "RECIBIDO" ? "border-purple-500 ring-4 ring-purple-500/20" : "border-emerald-500 bg-emerald-500"
                    }`} />
                    <div>
                      <h5 className="text-sm font-bold text-text-primary">Recibido en sucursal del transportista</h5>
                      <p className="text-xs text-text-muted">El paquete ingresó en la sucursal de origen de {envioSeleccionado.logistica}.</p>
                    </div>
                  </div>

                  {/* PASO 2: En tránsito */}
                  <div className="relative">
                    <div className={`absolute -left-[32px] top-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center bg-bg-card ${
                      envioSeleccionado.subEstado === "TRANSITO" ? "border-purple-500 ring-4 ring-purple-500/20" :
                      ["DISTRIBUCION", "INCIDENCIA", "ENTREGADO"].includes(envioSeleccionado.subEstado) ? "border-emerald-500 bg-emerald-500" : "border-border-custom"
                    }`} />
                    <div>
                      <h5 className={`text-sm font-bold ${["TRANSITO", "DISTRIBUCION", "INCIDENCIA", "ENTREGADO"].includes(envioSeleccionado.subEstado) ? "text-text-primary" : "text-text-muted"}`}>En camino hacia destino</h5>
                      <p className="text-xs text-text-muted">Tránsito inter-sucursal hacia la planta de distribución zonal.</p>
                    </div>
                  </div>

                  {/* PASO 3: En distribución local o Incidencia */}
                  <div className="relative">
                    <div className={`absolute -left-[32px] top-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center bg-bg-card ${
                      envioSeleccionado.subEstado === "DISTRIBUCION" ? "border-purple-500 ring-4 ring-purple-500/20" :
                      envioSeleccionado.subEstado === "INCIDENCIA" ? "border-rose-500 bg-rose-500/20 ring-4 ring-rose-500/20" :
                      ["ENTREGADO"].includes(envioSeleccionado.subEstado) ? "border-emerald-500 bg-emerald-500" : "border-border-custom"
                    }`} />
                    <div>
                      <h5 className={`text-sm font-bold ${["DISTRIBUCION", "INCIDENCIA", "ENTREGADO"].includes(envioSeleccionado.subEstado) ? "text-text-primary" : "text-text-muted"}`}>
                        {envioSeleccionado.subEstado === "INCIDENCIA" ? (
                          <span className="text-rose-500 flex items-center gap-1"><ShieldAlert className="w-4 h-4" /> Intento de Entrega Fallido</span>
                        ) : "En distribución local"}
                      </h5>
                      <p className="text-xs text-text-muted">El cartero o camión de reparto tiene el paquete cargado para su entrega hoy.</p>
                    </div>
                  </div>

                  {/* PASO 4: Entregado */}
                  <div className="relative text-left">
                    <div className={`absolute -left-[32px] top-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center bg-bg-card ${
                      envioSeleccionado.subEstado === "ENTREGADO" ? "border-emerald-500 bg-emerald-500" : "border-border-custom"
                    }`} />
                    <div>
                      <h5 className={`text-sm font-bold ${envioSeleccionado.subEstado === "ENTREGADO" ? "text-emerald-500" : "text-text-muted"}`}>Paquete Entregado</h5>
                      <p className="text-xs text-text-muted">El cliente final recibió los equipos correctamente.</p>
                    </div>
                  </div>

                </div>
              </div>

              {/* Botón de Redirección Externa */}
              <div className="pt-4 border-t border-border-custom flex flex-col sm:flex-row gap-4 items-center justify-between">
                <span className="text-xs text-text-muted">Puedes consultar el portal externo oficial:</span>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsTrackingModalOpen(false)} 
                    className="px-5 py-2 bg-bg-card hover:bg-bg-subtle border border-border-custom rounded-md text-text-secondary transition-colors text-xs font-semibold cursor-pointer"
                  >
                    Cerrar
                  </button>
                  <a
                    href={getLogisticsTrackingUrl(envioSeleccionado.logistica, envioSeleccionado.tracking)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#0078D7] hover:bg-[#005a9e] text-white px-5 py-2 rounded-md font-bold transition-all cursor-pointer text-xs flex items-center gap-1.5 shadow"
                  >
                    <Eye className="w-4 h-4" />
                    Ver en Web de {envioSeleccionado.logistica}
                  </a>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
