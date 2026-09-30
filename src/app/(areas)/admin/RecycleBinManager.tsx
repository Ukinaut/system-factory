"use client";

import { useState } from "react";
import { 
  Trash2, 
  RotateCcw, 
  Search, 
  AlertTriangle, 
  FileText, 
  Users, 
  ShoppingBag, 
  Truck, 
  CheckCircle, 
  X, 
  RefreshCw,
  Clock,
  DollarSign,
  HelpCircle
} from "lucide-react";
import { 
  getRecycleBinItems, 
  restoreRecycleBinItem, 
  permanentlyDeleteRecycleBinItem, 
  emptyRecycleBin 
} from "@/actions/recycleBin";

interface RecycleItem {
  id: string;
  entityType: string;
  entityId: string;
  title: string;
  subtitle?: string | null;
  deletedByUserId?: string | null;
  deletedByName?: string | null;
  payload: string;
  deletedAt: string | Date;
}

const TIPO_LABELS: Record<string, { name: string; color: string; icon: any }> = {
  CLIENT: { name: "Cliente", color: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: Users },
  SALE: { name: "Venta / Orden", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: ShoppingBag },
  SHIPPING: { name: "Envío / Despacho", color: "bg-purple-500/10 text-purple-400 border-purple-500/20", icon: Truck },
  PRODUCT: { name: "Producto / Insumo", color: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: FileText },
  INVOICE: { name: "Factura / Cobro", color: "bg-teal-500/10 text-teal-400 border-teal-500/20", icon: DollarSign },
  CLAIM: { name: "Reclamo / RMA", color: "bg-rose-500/10 text-rose-400 border-rose-500/20", icon: AlertTriangle },
  QUOTE: { name: "Presupuesto", color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20", icon: FileText },
};

export default function RecycleBinManager({ initialItems }: { initialItems: RecycleItem[] }) {
  const [items, setItems] = useState<RecycleItem[]>(initialItems);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modales de confirmación
  const [confirmRestoreItem, setConfirmRestoreItem] = useState<RecycleItem | null>(null);
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<RecycleItem | null>(null);
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    const res = await getRecycleBinItems();
    if (res.success && res.items) {
      setItems(res.items as any[]);
    }
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleRestore = async () => {
    if (!confirmRestoreItem) return;
    const id = confirmRestoreItem.id;
    setLoadingId(id);
    const res = await restoreRecycleBinItem(id);
    setLoadingId(null);

    if (res.success) {
      alert(`El registro "${confirmRestoreItem.title}" fue restaurado con éxito.`);
      setItems(prev => prev.filter(i => i.id !== id));
      setConfirmRestoreItem(null);
    } else {
      alert("Error al restaurar elemento: " + res.error);
    }
  };

  const handleDeletePermanent = async () => {
    if (!confirmDeleteItem) return;
    const id = confirmDeleteItem.id;
    setLoadingId(id);
    const res = await permanentlyDeleteRecycleBinItem(id);
    setLoadingId(null);

    if (res.success) {
      setItems(prev => prev.filter(i => i.id !== id));
      setConfirmDeleteItem(null);
    } else {
      alert("Error al eliminar elemento: " + res.error);
    }
  };

  const handleEmptyBin = async () => {
    setLoadingId("EMPTY_ALL");
    const res = await emptyRecycleBin();
    setLoadingId(null);

    if (res.success) {
      setItems([]);
      setShowEmptyConfirm(false);
      alert("La papelera de reciclaje ha sido vaciada completamente.");
    } else {
      alert("Error al vaciar la papelera: " + res.error);
    }
  };

  // Filtrado de elementos
  const itemsFiltrados = items.filter(item => {
    const matchesType = activeFilter === "ALL" || item.entityType === activeFilter;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      item.title.toLowerCase().includes(searchLower) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(searchLower)) ||
      (item.deletedByName && item.deletedByName.toLowerCase().includes(searchLower));
    return matchesType && matchesSearch;
  });

  return (
    <div className="bg-bg-card rounded-xl shadow-lg border border-border-custom overflow-hidden w-full space-y-6 p-6 text-left">
      {/* Cabecera del Módulo */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border-custom pb-5">
        <div>
          <h2 className="text-xl font-bold text-text-primary flex items-center gap-2 tracking-wide">
            <Trash2 className="w-5 h-5 text-rose-500" />
            Papelera de Reciclaje del Sistema
          </h2>
          <p className="text-xs text-text-muted mt-1">
            Recupera ventas, clientes, facturas o envíos eliminados por operadores, o elimínalos definitivamente de la base de datos.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border-custom bg-bg-subtle text-text-secondary hover:text-text-primary text-xs font-medium cursor-pointer transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#0078D7]" : ""}`} />
            Actualizar
          </button>

          {items.length > 0 && (
            <button
              onClick={() => setShowEmptyConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 hover:border-transparent text-xs font-bold transition-all cursor-pointer shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Vaciar Papelera
            </button>
          )}
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Chips de filtro por tipo */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeFilter === "ALL"
                ? "bg-[#0078D7] text-white shadow-md shadow-[#0078D7]/20"
                : "bg-bg-subtle text-text-muted hover:text-text-primary border border-border-custom"
            }`}
          >
            Todos ({items.length})
          </button>
          {Object.entries(TIPO_LABELS).map(([typeKey, cfg]) => {
            const count = items.filter(i => i.entityType === typeKey).length;
            if (count === 0 && activeFilter !== typeKey) return null;
            const Icon = cfg.icon;
            return (
              <button
                key={typeKey}
                onClick={() => setActiveFilter(typeKey)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                  activeFilter === typeKey
                    ? "bg-[#0078D7] text-white border-[#0078D7] shadow-md shadow-[#0078D7]/20"
                    : "bg-bg-subtle text-text-muted hover:text-text-primary border-border-custom"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cfg.name} ({count})
              </button>
            );
          })}
        </div>

        {/* Buscador */}
        <div className="relative w-full md:w-72 shrink-0">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por orden, cliente, CUIT..."
            className="w-full bg-bg-subtle border border-border-custom rounded-lg pl-9 pr-4 py-2 text-xs text-text-primary placeholder-text-muted focus:border-[#0078D7] outline-none transition-colors"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-2.5 text-text-muted hover:text-text-primary cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Tabla de Elementos en Papelera */}
      {itemsFiltrados.length > 0 ? (
        <div className="overflow-x-auto border border-border-custom rounded-xl bg-bg-card">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-bg-subtle/80 border-b border-border-custom text-text-muted font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">Tipo de Registro</th>
                <th className="py-3.5 px-4">Detalle / Identificador</th>
                <th className="py-3.5 px-4">Eliminado Por</th>
                <th className="py-3.5 px-4">Fecha de Eliminación</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-custom/50">
              {itemsFiltrados.map((item) => {
                const config = TIPO_LABELS[item.entityType] || { name: item.entityType, color: "bg-bg-subtle text-text-muted border-border-custom", icon: FileText };
                const Icon = config.icon;
                const dateFormatted = new Date(item.deletedAt).toLocaleString("es-AR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                });

                return (
                  <tr key={item.id} className="hover:bg-bg-subtle/40 transition-colors group">
                    {/* Badge Tipo */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-bold text-[11px] border ${config.color}`}>
                        <Icon className="w-3.5 h-3.5" />
                        {config.name}
                      </span>
                    </td>

                    {/* Título & Subtítulo */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-text-primary tracking-wide text-sm">{item.title}</div>
                      {item.subtitle && (
                        <div className="text-text-muted text-xs mt-0.5">{item.subtitle}</div>
                      )}
                    </td>

                    {/* Usuario Responsable */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="text-text-secondary font-medium">{item.deletedByName || "Sistema"}</span>
                    </td>

                    {/* Fecha */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-text-muted font-mono">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-text-muted" />
                        {dateFormatted}
                      </div>
                    </td>

                    {/* Acciones de Restauración y Borrado Definitivo */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setConfirmRestoreItem(item)}
                          disabled={loadingId === item.id}
                          className="flex items-center gap-1 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white px-3 py-1.5 rounded-lg font-bold border border-emerald-500/20 hover:border-transparent transition-all cursor-pointer"
                          title="Restaurar este elemento al sistema activo"
                        >
                          <RotateCcw className={`w-3.5 h-3.5 ${loadingId === item.id ? "animate-spin" : ""}`} />
                          Restaurar
                        </button>

                        <button
                          onClick={() => setConfirmDeleteItem(item)}
                          disabled={loadingId === item.id}
                          className="flex items-center gap-1 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white px-3 py-1.5 rounded-lg font-bold border border-rose-500/20 hover:border-transparent transition-all cursor-pointer"
                          title="Eliminar definitivamente de la base de datos"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-12 text-center text-text-muted flex flex-col items-center bg-bg-subtle/30 border border-border-custom rounded-xl">
          <CheckCircle className="w-12 h-12 text-emerald-400 mb-3 opacity-60" />
          <h3 className="text-base font-bold text-text-primary">La papelera de reciclaje está vacía</h3>
          <p className="text-xs text-text-muted max-w-sm mt-1">
            {searchTerm || activeFilter !== "ALL"
              ? "No se encontraron elementos eliminados que coincidan con la búsqueda o filtro seleccionado."
              : "No hay registros eliminados en este momento. Todos los clientes, ventas y documentos permanecen activos."}
          </p>
        </div>
      )}

      {/* Modal 1: Confirmar Restauración */}
      {confirmRestoreItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-card border border-border-custom max-w-md w-full rounded-xl p-6 shadow-2xl space-y-5 text-left animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/10 rounded-full text-emerald-400 border border-emerald-500/20">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-primary">¿Restaurar elemento?</h3>
                <p className="text-xs text-text-muted">El registro volverá a estar activo en su correspondiente sección.</p>
              </div>
            </div>

            <div className="bg-bg-subtle p-3 rounded-lg border border-border-custom text-xs space-y-1">
              <p className="font-bold text-text-primary">{confirmRestoreItem.title}</p>
              {confirmRestoreItem.subtitle && <p className="text-text-muted">{confirmRestoreItem.subtitle}</p>}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmRestoreItem(null)}
                className="px-4 py-2 rounded-lg text-text-secondary hover:bg-bg-subtle border border-border-custom text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleRestore}
                disabled={loadingId === confirmRestoreItem.id}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <RotateCcw className={`w-4 h-4 ${loadingId === confirmRestoreItem.id ? "animate-spin" : ""}`} />
                {loadingId === confirmRestoreItem.id ? "Restaurando..." : "Sí, Restaurar Registro"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Confirmar Borrado Definitivo */}
      {confirmDeleteItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-card border border-border-custom max-w-md w-full rounded-xl p-6 shadow-2xl space-y-5 text-left animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-500/10 rounded-full text-rose-400 border border-rose-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-primary">¿Eliminar definitivamente?</h3>
                <p className="text-xs text-text-muted">Esta acción es irreversible y purgará permanentemente este registro.</p>
              </div>
            </div>

            <div className="bg-bg-subtle p-3 rounded-lg border border-border-custom text-xs space-y-1">
              <p className="font-bold text-text-primary">{confirmDeleteItem.title}</p>
              {confirmDeleteItem.subtitle && <p className="text-text-muted">{confirmDeleteItem.subtitle}</p>}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmDeleteItem(null)}
                className="px-4 py-2 rounded-lg text-text-secondary hover:bg-bg-subtle border border-border-custom text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeletePermanent}
                disabled={loadingId === confirmDeleteItem.id}
                className="bg-rose-600 hover:bg-rose-500 text-white px-5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Trash2 className="w-4 h-4" />
                {loadingId === confirmDeleteItem.id ? "Eliminando..." : "Eliminar Definitivamente"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Confirmar Vaciar Papelera */}
      {showEmptyConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-card border border-border-custom max-w-md w-full rounded-xl p-6 shadow-2xl space-y-5 text-left animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-500/10 rounded-full text-rose-400 border border-rose-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-primary">¿Vaciar toda la papelera?</h3>
                <p className="text-xs text-text-muted">Se eliminarán definitivamente todos los ({items.length}) elementos archivados.</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowEmptyConfirm(false)}
                className="px-4 py-2 rounded-lg text-text-secondary hover:bg-bg-subtle border border-border-custom text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleEmptyBin}
                disabled={loadingId === "EMPTY_ALL"}
                className="bg-rose-600 hover:bg-rose-500 text-white px-5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Trash2 className="w-4 h-4" />
                {loadingId === "EMPTY_ALL" ? "Vaciando..." : "Sí, Vaciar Papelera"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
