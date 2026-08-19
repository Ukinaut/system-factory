"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Save, ShoppingCart, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { getProducts } from "@/actions/products";
import { createQuickSale } from "@/actions/sales";

export default function VentaRapidaPage() {
  const [loading, setLoading] = useState(false);
  const [clientName, setClientName] = useState("");
  const [productos, setProductos] = useState<any[]>([]);
  const [articulos, setArticulos] = useState<any[]>([
    { id: 1, nombre: "", productoId: "", cantidad: 1, precio: 0 }
  ]);
  const [focusedProductRow, setFocusedProductRow] = useState<number | null>(null);
  const [moneda, setMoneda] = useState("ARS");

  useEffect(() => {
    getProducts().then(res => {
      if (res.success) {
        setProductos(res.products || []);
      }
    });
  }, []);

  // Click outside to close suggestion dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (!target.closest(".product-row-container")) {
        setFocusedProductRow(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const addArticulo = () => {
    setArticulos([...articulos, { id: Date.now(), nombre: "", productoId: "", cantidad: 1, precio: 0 }]);
  };

  const removeArticulo = (id: number) => {
    setArticulos(articulos.filter(a => a.id !== id));
  };

  const updateArticulo = (id: number, updates: Record<string, any>) => {
    setArticulos(articulos.map(a => {
      if (a.id === id) {
        const updated = { ...a, ...updates };
        if (updates.productoId) {
          const prod = productos.find(p => p.id === updates.productoId);
          if (prod) {
            updated.precio = prod.precio || 0;
          }
        }
        return updated;
      }
      return a;
    }));
  };

  const getFilteredProducts = (query: string) => {
    if (!query) return [];
    return productos.filter(p =>
      p.nombre.toLowerCase().includes(query.toLowerCase()) ||
      p.id.toLowerCase().includes(query.toLowerCase())
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      alert("Por favor ingrese el nombre del cliente.");
      return;
    }
    const filtered = articulos.filter(a => a.productoId && a.cantidad > 0);
    if (filtered.length === 0) {
      alert("Por favor cargue al menos un producto.");
      return;
    }

    setLoading(true);
    const res = await createQuickSale({
      clientName: clientName.trim(),
      moneda,
      articulos: filtered.map(a => ({
        productoId: a.productoId,
        cantidad: a.cantidad,
        precio: parseFloat(a.precio.toString()) || 0
      }))
    });
    setLoading(false);

    if (res.success) {
      alert("Venta Rápida registrada con éxito. Enviada a Facturación y Cobranza.");
      window.location.href = "/ventas";
    } else {
      alert("Error al registrar Venta Rápida: " + res.error);
    }
  };

  const total = articulos.reduce((acc, curr) => acc + (curr.cantidad * curr.precio), 0);

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/ventas" className="p-2 bg-bg-card border border-border-custom rounded hover:bg-bg-subtle transition-colors">
          <ArrowLeft className="w-5 h-5 text-text-muted" />
        </Link>
        <h1 className="text-3xl font-bold text-text-primary tracking-wide flex items-center gap-3">
          <ShoppingCart className="text-[#0078D7] w-8 h-8" />
          Nueva Venta Rápida
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-bg-card border border-border-custom rounded-xl p-8 shadow-xl space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Nombre del Cliente</label>
            <input
              type="text"
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              placeholder="Ej: Juan Pérez o Consumidor Final"
              className="w-full bg-bg-subtle border border-border-custom rounded-lg px-4 py-3 text-sm text-text-primary focus:border-[#0078D7] outline-none shadow-sm transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Moneda</label>
            <select
              value={moneda}
              onChange={e => setMoneda(e.target.value)}
              className="w-full bg-bg-subtle border border-border-custom rounded-lg px-4 py-3 text-sm text-text-primary focus:border-[#0078D7] outline-none shadow-sm transition-all appearance-none"
            >
              <option value="ARS">ARS ($)</option>
              <option value="USD">USD (US$)</option>
            </select>
          </div>
        </div>

        {/* Artículos */}
        <div className="space-y-4 pt-4 border-t border-border-custom/50">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#0078D7]">Productos Vendidos</h3>
            <button
              type="button"
              onClick={addArticulo}
              className="text-xs bg-[#0078D7]/10 hover:bg-[#0078D7] text-[#0078D7] hover:text-white px-3 py-1.5 rounded transition-all cursor-pointer font-bold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Agregar Producto
            </button>
          </div>

          <div className="border border-border-custom rounded-xl bg-bg-subtle/20">
            {/* Header de la Tabla (Oculto en móvil, visible en md+) */}
            <div className="hidden md:flex items-center gap-4 bg-bg-subtle/80 px-6 py-3 border-b border-border-custom text-[11px] font-bold text-text-muted uppercase tracking-wider rounded-t-xl">
              <div className="flex-1">Producto</div>
              <div className="w-28 text-center">Cantidad</div>
              <div className="w-36">Precio Unitario ($)</div>
              {articulos.length > 1 && <div className="w-10 text-center">Acciones</div>}
            </div>

            <div className="divide-y divide-border-custom">
              {articulos.map((art, idx) => (
                <div key={art.id} className="product-row-container flex flex-col md:flex-row items-center gap-4 px-6 py-4 hover:bg-bg-subtle/30 transition-colors">
                  
                  {/* Selector de Producto por Autocompletado */}
                  <div className="flex-1 w-full relative">
                    <label className="block md:hidden text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Producto</label>
                    <input
                      type="text"
                      value={art.nombre}
                      onChange={e => {
                        updateArticulo(art.id, { nombre: e.target.value });
                        setFocusedProductRow(art.id);
                      }}
                      onFocus={() => {
                        setFocusedProductRow(art.id);
                      }}
                      className="w-full bg-bg-card border border-border-custom rounded-lg px-4 py-2.5 text-sm text-text-primary focus:border-[#0078D7] focus:ring-1 focus:ring-[#0078D7] outline-none transition-all"
                      placeholder="Escriba para buscar producto..."
                      required
                      autoComplete="off"
                    />

                    {/* Dropdown de Sugerencias */}
                    {focusedProductRow === art.id && art.nombre && getFilteredProducts(art.nombre).length > 0 && (
                      <ul className="absolute z-50 w-full bg-bg-card border border-border-custom rounded-lg mt-1 max-h-60 overflow-y-auto shadow-2xl text-left">
                        {getFilteredProducts(art.nombre).map(p => (
                          <li
                            key={p.id}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onClick={() => {
                              updateArticulo(art.id, { nombre: p.nombre, productoId: p.id });
                              setFocusedProductRow(null);
                            }}
                            className="px-4 py-2.5 hover:bg-[#0078D7] hover:text-white cursor-pointer text-sm text-text-secondary border-b border-border-custom last:border-b-0"
                          >
                            <div className="font-bold">{p.nombre}</div>
                            <div className="text-xs text-text-muted font-mono">
                              Stock: {p.cantidad} {p.tipo !== "PRODUCTO_FINAL" && p.tipo !== "ENSAMBLE" && p.tipo !== "MATERIA_PRIMA" ? "(Servicio)" : ""}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Input de Cantidad */}
                  <div className="w-full md:w-28">
                    <label className="block md:hidden text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1 text-center">Cantidad</label>
                    <input
                      type="number"
                      value={art.cantidad}
                      onChange={e => updateArticulo(art.id, { cantidad: parseInt(e.target.value) || 1 })}
                      onFocus={e => e.target.select()}
                      className="w-full bg-bg-card border border-border-custom rounded-lg px-4 py-2.5 text-sm text-text-primary text-center font-bold focus:border-[#0078D7] focus:ring-1 focus:ring-[#0078D7] outline-none transition-all"
                      min="1"
                      required
                    />
                  </div>

                  {/* Input de Precio Unitario */}
                  <div className="w-full md:w-36">
                    <label className="block md:hidden text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Precio Unitario ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={art.precio}
                      onChange={e => updateArticulo(art.id, { precio: parseFloat(e.target.value) || 0 })}
                      onFocus={e => e.target.select()}
                      className="w-full bg-bg-card border border-border-custom rounded-lg px-4 py-2.5 text-sm text-text-primary font-bold focus:border-[#0078D7] focus:ring-1 focus:ring-[#0078D7] outline-none transition-all"
                      required
                    />
                  </div>

                  {/* Botón de Eliminar */}
                  {articulos.length > 1 && (
                    <div className="w-full md:w-10 flex justify-center mt-2 md:mt-0">
                      <button
                        type="button"
                        onClick={() => removeArticulo(art.id)}
                        className="text-red-500 hover:bg-red-500/10 p-2.5 rounded-lg border border-transparent hover:border-red-500/20 transition-all cursor-pointer"
                        title="Eliminar artículo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="flex justify-between items-center border-t border-border-custom/50 pt-6">
          <div className="text-right">
            <span className="text-xs text-text-muted font-bold block uppercase">Total a Cobrar</span>
            <span className="text-2xl font-black text-[#0078D7]">{moneda === "USD" ? "US$" : "$"} {total.toLocaleString("es-AR")}</span>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-[#0078D7] hover:bg-[#005a9e] text-white px-8 py-3 rounded-lg font-bold text-xs uppercase tracking-wider shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-4.5 h-4.5" />
            {loading ? "Procesando..." : "Confirmar Venta Rápida"}
          </button>
        </div>
      </form>
    </div>
  );
}
