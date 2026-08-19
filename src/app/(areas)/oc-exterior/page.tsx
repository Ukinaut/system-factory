"use client";

import { useState, useEffect } from "react";
import { 
  Globe, 
  Plus, 
  Trash2, 
  CheckSquare, 
  Square, 
  Clock, 
  CheckCircle, 
  Calendar, 
  Package, 
  User, 
  Truck,
  Archive,
  ArrowRight
} from "lucide-react";
import { 
  getForeignOrders, 
  createForeignOrder, 
  updateOrderItemVerification, 
  confirmForeignOrderArrival,
  deleteForeignOrder
} from "@/actions/foreignOrders";
import { getProducts } from "@/actions/products";
import { getCurrentUserSession } from "@/actions/users";
import Link from "next/link";

export default function OcExteriorPage() {
  const [activeTab, setActiveTab] = useState<"create" | "history">("create");
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  // Form State
  const [nroOrden, setNroOrden] = useState("");
  const [proveedor, setProveedor] = useState("");
  const [paisOrigen, setPaisOrigen] = useState("");
  const [fechaLlegadaAprox, setFechaLlegadaAprox] = useState("");
  const [montoFinal, setMontoFinal] = useState("");
  const [moneda, setMoneda] = useState("USD");
  const [items, setItems] = useState<any[]>([
    { nombreProduct: "", cantidad: 1, tipoProduct: "PRODUCTO_FINAL" }
  ]);

  // Selected Order for Checklist Details
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [ordersRes, prodRes] = await Promise.all([
      getForeignOrders(),
      getProducts()
    ]);
    if (ordersRes.success) {
      setOrders(ordersRes.orders || []);
    }
    if (prodRes.success) {
      setProducts(prodRes.products || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    getCurrentUserSession().then(res => {
      if (res.success && res.session) {
        setSession(res.session);
      }
    });
  }, []);

  const handleAddItemRow = () => {
    setItems([...items, { nombreProduct: "", cantidad: 1, tipoProduct: "PRODUCTO_FINAL" }]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleCreateOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nroOrden || !proveedor) {
      alert("Por favor complete los campos obligatorios.");
      return;
    }
    const invalidItem = items.some(item => !item.nombreProduct || item.cantidad <= 0);
    if (invalidItem) {
      alert("Por favor configure nombres y cantidades correctas para todos los artículos.");
      return;
    }

    setLoading(true);
    const res = await createForeignOrder({
      nroOrden,
      proveedor,
      paisOrigen: paisOrigen || undefined,
      fechaLlegadaAprox: fechaLlegadaAprox || undefined,
      montoFinal: montoFinal ? parseFloat(montoFinal) : undefined,
      moneda,
      items
    });
    setLoading(false);

    if (res.success) {
      alert("Orden de compra exterior registrada con éxito.");
      setNroOrden("");
      setProveedor("");
      setPaisOrigen("");
      setFechaLlegadaAprox("");
      setMontoFinal("");
      setMoneda("USD");
      setItems([{ nombreProduct: "", cantidad: 1, tipoProduct: "PRODUCTO_FINAL" }]);
      loadData();
      setActiveTab("history");
    } else {
      alert("Error al registrar orden: " + res.error);
    }
  };

  const handleToggleVerifyItem = async (orderId: string, itemId: string, currentVal: boolean) => {
    const newVal = !currentVal;
    
    // Optimistic UI update
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          items: o.items.map((i: any) => i.id === itemId ? { ...i, verificado: newVal } : i)
        };
      }
      return o;
    }));

    const res = await updateOrderItemVerification(itemId, newVal);
    if (!res.success) {
      alert("Error al guardar verificación: " + res.error);
      loadData();
    }
  };

  const handleConfirmArrival = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    const unverifiedItems = order.items.filter((i: any) => !i.verificado);
    let msg = "¿Está seguro de que desea confirmar el arribo y cargar al stock?";
    if (unverifiedItems.length > 0) {
      msg = `¡Atención! Hay ${unverifiedItems.length} materiales sin verificar en esta orden. No se sumarán al stock. ¿Desea confirmar el arribo igualmente?`;
    }

    if (!confirm(msg)) return;

    setLoading(true);
    const res = await confirmForeignOrderArrival(orderId);
    setLoading(false);

    if (res.success) {
      alert("Importación confirmada e ingresada al Stock de forma exitosa.");
      setSelectedOrderId(null);
      loadData();
    } else {
      alert("Error al procesar arribo: " + res.error);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm("¿Está seguro de que deseas eliminar esta importación del historial? Esta acción es irreversible.")) {
      return;
    }
    setLoading(true);
    const res = await deleteForeignOrder(orderId);
    setLoading(false);
    if (res.success) {
      alert("Registro de importación eliminado correctamente del historial.");
      loadData();
    } else {
      alert("Error al eliminar la importación: " + res.error);
    }
  };

  const pendingOrders = orders.filter(o => o.estado === "PENDIENTE");
  const completedOrders = orders.filter(o => o.estado === "VERIFICADO");
  const selectedOrder = orders.find(o => o.id === selectedOrderId);

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-wide flex items-center gap-3 mb-2">
            <Globe className="text-[#0078D7] w-8 h-8 animate-pulse" />
            OC Exterior / Importación
          </h1>
          <p className="text-text-muted">Gestione órdenes al exterior, realice checklist de arribos e incremente stock automáticamente.</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-bg-card p-1 rounded-lg border border-border-custom shadow-sm shrink-0">
          <Link
            href="/compras"
            className="px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-md text-text-muted hover:text-text-primary transition-all duration-200 cursor-pointer flex items-center gap-1.5"
          >
            <Truck className="w-3.5 h-3.5" /> Control de Arribos (Ir a Compras) <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={() => {
              setActiveTab("create");
              setSelectedOrderId(null);
            }}
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-md transition-all duration-200 flex items-center gap-1 cursor-pointer ${
              activeTab === "create"
                ? "bg-[#0078D7] text-white shadow-md"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            <Plus className="w-3.5 h-3.5" /> Nueva OC Exterior
          </button>
          <button
            onClick={() => {
              setActiveTab("history");
              setSelectedOrderId(null);
            }}
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-md transition-all duration-200 cursor-pointer ${
              activeTab === "history"
                ? "bg-[#0078D7] text-white shadow-md"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            Historial
          </button>
        </div>
      </div>

      {/* Tab: Create Foreign Order */}
      {activeTab === "create" && (
        <div className="bg-bg-card border border-border-custom rounded-2xl p-8 shadow-xl w-full max-w-4xl mx-auto animate-in fade-in duration-300">
          <h2 className="text-xl font-bold text-text-primary mb-8 flex items-center gap-3 border-b border-border-custom pb-4">
            <div className="bg-[#0078D7]/10 p-2 rounded-lg text-[#0078D7]">
              <Plus className="w-5 h-5" />
            </div>
            Registrar Orden de Compra Exterior
          </h2>

          <form onSubmit={handleCreateOrderSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Nro de Orden (OC)</label>
                <input
                  type="text"
                  value={nroOrden}
                  onChange={e => setNroOrden(e.target.value)}
                  placeholder="Ej: OCE-2026-004"
                  className="w-full bg-bg-subtle border border-border-custom rounded-lg px-4 py-3 text-text-primary focus:border-[#0078D7] focus:ring-1 focus:ring-[#0078D7]/30 transition-all outline-none text-xs font-semibold shadow-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Proveedor del Exterior</label>
                <input
                  type="text"
                  value={proveedor}
                  onChange={e => setProveedor(e.target.value)}
                  placeholder="Ej: SpaceX Satellite Corp"
                  className="w-full bg-bg-subtle border border-border-custom rounded-lg px-4 py-3 text-text-primary focus:border-[#0078D7] focus:ring-1 focus:ring-[#0078D7]/30 transition-all outline-none text-xs font-semibold shadow-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">País de Origen</label>
                <input
                  type="text"
                  value={paisOrigen}
                  onChange={e => setPaisOrigen(e.target.value)}
                  placeholder="Ej: China, USA, Alemania"
                  className="w-full bg-bg-subtle border border-border-custom rounded-lg px-4 py-3 text-text-primary focus:border-[#0078D7] focus:ring-1 focus:ring-[#0078D7]/30 transition-all outline-none text-xs font-semibold shadow-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Fecha Aprox. Llegada
                </label>
                <input
                  type="date"
                  value={fechaLlegadaAprox}
                  onChange={e => setFechaLlegadaAprox(e.target.value)}
                  className="w-full bg-bg-subtle border border-border-custom rounded-lg px-4 py-2.5 text-text-primary focus:border-[#0078D7] focus:ring-1 focus:ring-[#0078D7]/30 transition-all outline-none text-xs font-semibold shadow-sm cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Monto de la Orden</label>
                <input
                  type="number"
                  step="0.01"
                  value={montoFinal}
                  onChange={e => setMontoFinal(e.target.value)}
                  placeholder="Ej: 1500.00"
                  className="w-full bg-bg-subtle border border-border-custom rounded-lg px-4 py-3 text-text-primary focus:border-[#0078D7] focus:ring-1 focus:ring-[#0078D7]/30 transition-all outline-none text-xs font-semibold shadow-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Moneda</label>
                <select
                  value={moneda}
                  onChange={e => setMoneda(e.target.value)}
                  className="w-full bg-bg-subtle border border-border-custom rounded-lg px-4 py-3 text-text-primary focus:border-[#0078D7] focus:ring-1 focus:ring-[#0078D7]/30 transition-all outline-none text-xs font-semibold shadow-sm cursor-pointer"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="ARS">ARS ($)</option>
                </select>
              </div>
            </div>

            {/* Dynamic Items List */}
            <div className="space-y-5">
              <div className="flex justify-between items-center border-b border-border-custom pb-3">
                <h3 className="font-bold text-xs uppercase tracking-widest text-[#0078D7] flex items-center gap-2">
                  <Package className="w-4 h-4" /> Artículos del Pedido
                </h3>
                <button
                  type="button"
                  onClick={handleAddItemRow}
                  className="text-xs bg-[#0078D7]/10 hover:bg-[#0078D7] text-[#0078D7] hover:text-white px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Agregar Fila
                </button>
              </div>

              <div className="space-y-4">
                {items.map((item, idx) => (
                  <div key={idx} className="flex flex-col md:flex-row items-stretch md:items-center gap-4 bg-bg-subtle/40 p-4 rounded-xl border border-border-custom hover:border-border-custom/80 transition-all relative animate-in slide-in-from-top-2 duration-200">
                    <div className="flex-1">
                      <label className="block text-[9px] font-bold text-text-muted uppercase tracking-widest mb-2">Nombre / Descripción del Artículo</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={item.nombreProduct}
                          onChange={e => handleItemChange(idx, "nombreProduct", e.target.value)}
                          placeholder="Ej: Antena Satelital V3"
                          className="w-full bg-bg-card border border-border-custom rounded-lg px-3.5 py-2.5 text-xs text-text-primary focus:border-[#0078D7] outline-none shadow-sm transition-all"
                          required
                          list={`products-datalist-${idx}`}
                        />
                        <datalist id={`products-datalist-${idx}`}>
                          {products.map(p => (
                            <option key={p.id} value={p.nombre} />
                          ))}
                        </datalist>
                      </div>
                    </div>

                    <div className="w-full md:w-32">
                      <label className="block text-[9px] font-bold text-text-muted uppercase tracking-widest mb-2 text-center md:text-left">Cantidad</label>
                      <input
                        type="number"
                        value={item.cantidad}
                        onChange={e => handleItemChange(idx, "cantidad", parseInt(e.target.value) || 0)}
                        className="w-full bg-bg-card border border-border-custom rounded-lg px-3 py-2.5 text-xs text-text-primary focus:border-[#0078D7] outline-none text-center font-bold shadow-sm transition-all"
                        min="1"
                        required
                      />
                    </div>

                    <div className="w-full md:w-48">
                      <label className="block text-[9px] font-bold text-text-muted uppercase tracking-widest mb-2">Tipo de Stock</label>
                      <select
                        value={item.tipoProduct}
                        onChange={e => handleItemChange(idx, "tipoProduct", e.target.value)}
                        className="w-full bg-bg-card border border-border-custom rounded-lg px-3 py-2.5 text-xs text-text-primary focus:border-[#0078D7] outline-none cursor-pointer shadow-sm transition-all"
                      >
                        <option value="PRODUCTO_FINAL">Producto Final</option>
                        <option value="ENSAMBLE">Ensamble</option>
                        <option value="MATERIA_PRIMA">Materia Prima</option>
                      </select>
                    </div>

                    <div className="flex items-end justify-center md:pt-6">
                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(idx)}
                        disabled={items.length === 1}
                        className="text-red-500 hover:text-white hover:bg-red-500 border border-transparent hover:border-red-600 rounded-lg p-2.5 cursor-pointer disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-red-500 shrink-0 transition-all duration-200"
                        title="Eliminar fila"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-border-custom">
              <button
                type="submit"
                disabled={loading}
                className="w-full md:w-auto bg-[#0078D7] hover:bg-[#005a9e] text-white px-10 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle className="w-4.5 h-4.5" />
                {loading ? "Procesando..." : "Registrar y Enviar a Control"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab: History */}
      {activeTab === "history" && (
        <div className="bg-bg-card border border-border-custom rounded-xl p-6 shadow-xl animate-in fade-in duration-200">
          <h2 className="text-lg font-bold text-text-primary mb-6 flex items-center gap-2 border-b border-border-custom pb-3">
            <Archive className="w-5 h-5 text-[#0078D7]" /> Historial de Importaciones Controladas
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border-custom font-bold uppercase tracking-wider text-text-muted bg-bg-subtle/50">
                  <th className="p-3">Nro Orden</th>
                  <th className="p-3">Proveedor</th>
                  <th className="p-3">Procedencia</th>
                  <th className="p-3">Monto / Moneda</th>
                  <th className="p-3">Lanzamiento</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Detalle Materiales</th>
                  {session?.rol === "ADMIN" && <th className="p-3 text-center">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom">
                {completedOrders.length > 0 ? (
                  completedOrders.map(o => (
                    <tr key={o.id} className="hover:bg-bg-subtle/30 transition-colors">
                      <td className="p-3 font-mono font-bold text-[#0078D7]">{o.nroOrden}</td>
                      <td className="p-3 font-bold text-text-primary">{o.proveedor}</td>
                      <td className="p-3 font-semibold text-text-secondary">{o.paisOrigen || "-"}</td>
                      <td className="p-3 font-bold text-text-primary">{o.moneda} {o.montoFinal?.toLocaleString() || "0"}</td>
                      <td className="p-3 text-text-muted">{new Date(o.fechaEmision).toLocaleDateString()}</td>
                      <td className="p-3">
                        <span className="bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded border border-emerald-500/20 uppercase flex items-center gap-1 w-max">
                          <CheckCircle className="w-3 h-3" /> Arribado y Stockeado
                        </span>
                      </td>
                      <td className="p-3 max-w-sm">
                        <div className="flex flex-wrap gap-1.5">
                          {o.items?.map((i: any) => (
                            <span key={i.id} className="bg-bg-subtle text-text-secondary px-2 py-0.5 rounded border border-border-custom font-medium">
                              📦 {i.nombreProduct} ({i.cantidad} u)
                            </span>
                          ))}
                        </div>
                      </td>
                      {session?.rol === "ADMIN" && (
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleDeleteOrder(o.id)}
                            className="p-1.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 hover:border-transparent rounded transition-all cursor-pointer"
                            title="Eliminar importación del historial"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={session?.rol === "ADMIN" ? 8 : 7} className="text-center py-12 text-text-muted italic">
                      No hay órdenes exteriores controladas en el historial todavía.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
