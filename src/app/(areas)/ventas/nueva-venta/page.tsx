"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Save, ShoppingCart, Plus, Trash2, Search, X } from "lucide-react";
import Link from "next/link";
import { getClients } from "@/actions/clients";
import { getProducts } from "@/actions/products";
import { createSale } from "@/actions/sales";

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
      { nombre: "TUERCA LARGA M8 X4", cantidad: 1 },
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

export default function NuevaVenta() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    clienteBusqueda: "",
    tipoVenta: "ARTICULO",
    tipoEnvio: "RETIRO", // "RETIRO" o "ENVIO"
    costoEnvio: 0,
    descuento: 0,
    autorizaDescuento: "",
    observaciones: "",
    tipoFactura: "A",
    moneda: "ARS",
  });

  // Autocomplete data lists
  const [clientes, setClientes] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  
  // Selected IDs
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedSubnodeId, setSelectedSubnodeId] = useState<string | null>(null);

  // Suggestions visibility
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [focusedProductRow, setFocusedProductRow] = useState<number | null>(null);

  // Refs for closing dropdowns when clicking outside
  const clientSuggestionsRef = useRef<HTMLDivElement>(null);

  const [articulos, setArticulos] = useState<any[]>([
    { id: 1, nombre: "", productoId: "", cantidad: 1, precio: 0 }
  ]);

  const [activeKitRowId, setActiveKitRowId] = useState<number | null>(null);

  // Load clients and products on mount
  useEffect(() => {
    const loadData = async () => {
      const clientsRes = await getClients();
      if (clientsRes.success) {
        setClientes(clientsRes.clients || []);
      }
      
      const productsRes = await getProducts();
      if (productsRes.success) {
        setProductos(productsRes.products || []);
      }
    };
    loadData();
  }, []);

  // Click outside to close client suggestions and product suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (clientSuggestionsRef.current && !clientSuggestionsRef.current.contains(target)) {
        setShowClientSuggestions(false);
      }
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
    setArticulos(articulos.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalClientId = selectedSubnodeId || selectedClientId;
    if (!finalClientId) {
      alert("Por favor seleccione un cliente válido de la lista.");
      return;
    }
    const filtered = articulos.filter(a => a.productoId && a.cantidad > 0);
    if (filtered.length === 0) {
      alert("Por favor cargue al menos un producto válido.");
      return;
    }
    setLoading(true);
    const res = await createSale({
      clientId: finalClientId,
      tipo: formData.tipoVenta,
      costoEnvio: formData.costoEnvio,
      descuento: formData.descuento,
      autorizaDescuento: formData.autorizaDescuento,
      observaciones: formData.observaciones,
      tipoFactura: formData.tipoFactura,
      moneda: formData.moneda,
      articulos: filtered.map(a => {
        const isKit = SOLUCIONES_DISPONIBLES.some(k => k.nombre === a.nombre);
        const componentesSeleccionados = isKit && a.kitComponents
          ? JSON.stringify(a.kitComponents.filter((c: any) => c.checked))
          : undefined;

        return {
          productoId: a.productoId,
          cantidad: a.cantidad,
          precio: a.precio,
          componentesSeleccionados
        };
      })
    });
    setLoading(false);
    if (res.success) {
      alert("Venta enviada a Facturación correctamente.");
      window.location.href = "/ventas";
    } else {
      alert("Error al registrar venta: " + res.error);
    }
  };

  // Filter clients based on query
  const filteredClients = clientes.filter(c =>
    c.razonSocial.toLowerCase().includes(formData.clienteBusqueda.toLowerCase()) ||
    c.cuit.includes(formData.clienteBusqueda)
  );

  // Filter products based on query
  const getFilteredProducts = (query: string) => {
    if (!query) return [];
    return productos.filter(p =>
      p.nombre.toLowerCase().includes(query.toLowerCase()) ||
      p.id.toLowerCase().includes(query.toLowerCase())
    );
  };

  // Calcular totales
  const subtotal = articulos.reduce((acc, curr) => acc + (curr.cantidad * curr.precio), 0);
  const total = subtotal + Number(formData.costoEnvio) - Number(formData.descuento);

  const selectedClientObj = clientes.find(c => c.id === selectedClientId);

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/ventas" className="p-2 bg-bg-card border border-border-custom rounded hover:bg-bg-subtle transition-colors">
          <ArrowLeft className="w-5 h-5 text-text-muted" />
        </Link>
        <h1 className="text-3xl font-bold text-text-primary tracking-wide flex items-center gap-3">
          <ShoppingCart className="text-[#0078D7] w-8 h-8" />
          Nueva Venta
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Sección Cliente y Tipo de Venta */}
        <div className="bg-bg-card rounded-xl border border-border-custom shadow-xl p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4 border-b border-border-custom pb-2">1. Datos Generales</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="relative" ref={clientSuggestionsRef}>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Buscar Cliente (Razón Social o CUIT)</label>
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-3 text-gray-500" />
                <input
                  type="text"
                  value={formData.clienteBusqueda}
                  onChange={e => {
                    setFormData({...formData, clienteBusqueda: e.target.value});
                    setShowClientSuggestions(true);
                    setSelectedClientId(null);
                    setSelectedSubnodeId(null);
                  }}
                  onFocus={() => setShowClientSuggestions(true)}
                  className="w-full bg-bg-subtle border border-border-custom rounded-md pl-10 pr-4 py-3 text-text-primary focus:border-[#0078D7] transition-colors outline-none"
                  placeholder="Ej: Consumidor Final..."
                  required
                  autoComplete="off"
                />
              </div>

              {/* Clients Dropdown */}
              {showClientSuggestions && formData.clienteBusqueda && filteredClients.length > 0 && (
                <ul className="absolute z-50 w-full bg-bg-card border border-border-custom rounded-md mt-1 max-h-60 overflow-y-auto shadow-2xl">
                  {filteredClients.map(c => (
                    <li
                      key={c.id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onClick={() => {
                        setFormData({ ...formData, clienteBusqueda: `${c.razonSocial} (${c.cuit})` });
                        setSelectedClientId(c.id);
                        setSelectedSubnodeId(c.id);
                        setShowClientSuggestions(false);
                      }}
                      className="px-4 py-2.5 hover:bg-[#0078D7] hover:text-white cursor-pointer text-sm text-text-secondary border-b border-border-custom last:border-b-0"
                    >
                      <div className="font-bold">{c.razonSocial}</div>
                      <div className="text-xs text-text-muted font-mono">CUIT: {c.cuit}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Tipo de Venta</label>
              <select
                value={formData.tipoVenta}
                onChange={e => setFormData({...formData, tipoVenta: e.target.value})}
                className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-3 text-text-primary focus:border-[#0078D7] transition-colors outline-none appearance-none"
              >
                <option value="ARTICULO" className="bg-bg-card text-text-primary">Solo Artículo</option>
                <option value="SERVICIO" className="bg-bg-card text-text-primary">Solo Servicio</option>
                <option value="MIXTO" className="bg-bg-card text-text-primary">Artículo + Servicio</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Moneda</label>
              <select
                value={formData.moneda}
                onChange={e => setFormData({...formData, moneda: e.target.value})}
                className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-3 text-text-primary focus:border-[#0078D7] transition-colors outline-none appearance-none"
              >
                <option value="ARS" className="bg-bg-card text-text-primary">ARS ($)</option>
                <option value="USD" className="bg-bg-card text-text-primary">USD (US$)</option>
              </select>
            </div>

            {/* Subnodos Dropdown Selector */}
            {selectedClientObj && selectedClientObj.subClients && selectedClientObj.subClients.length > 0 && (
              <div className="md:col-span-3 bg-bg-subtle/50 p-4 rounded-lg border border-border-custom mt-2 animate-in fade-in duration-200 text-left">
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                  Seleccionar Subnodo / Área para la compra
                </label>
                <select
                  value={selectedSubnodeId || selectedClientId || ""}
                  onChange={e => setSelectedSubnodeId(e.target.value)}
                  className="w-full bg-bg-card border border-border-custom rounded-md px-4 py-3 text-text-primary focus:border-[#0078D7] outline-none"
                >
                  <option value={selectedClientId || ""} className="bg-bg-card text-text-primary">Matriz / Principal ({selectedClientObj.razonSocial})</option>
                  {selectedClientObj.subClients.map((sub: any) => (
                    <option key={sub.id} value={sub.id} className="bg-bg-card text-text-primary">
                      Subnodo: {sub.razonSocial} {sub.direccion ? `(${sub.direccion})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Sección Artículos */}
        <div className="bg-bg-card rounded-xl border border-border-custom shadow-xl p-6">
          <div className="flex justify-between items-center mb-4 border-b border-border-custom pb-2">
            <h2 className="text-lg font-semibold text-text-primary">2. Artículos / Servicios</h2>
            <button type="button" onClick={addArticulo} className="flex items-center gap-2 text-sm text-[#0078D7] hover:text-blue-400 transition-colors cursor-pointer">
              <Plus className="w-4 h-4" /> Agregar Artículo
            </button>
          </div>
          
          <div className="space-y-4">
             {articulos.map((art, index) => (
              <div key={art.id} className="product-row-container flex flex-col md:flex-row gap-4 items-end bg-bg-subtle p-4 rounded border border-border-custom">
                <div className="flex-1 w-full relative">
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Buscar Producto</label>
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
                    className="w-full bg-bg-card border border-border-custom rounded-md px-3 py-2 text-text-primary focus:border-[#0078D7] outline-none"
                    placeholder="Escriba para buscar en stock..."
                    required
                    autoComplete="off"
                  />

                  {/* Products Dropdown */}
                  {focusedProductRow === art.id && art.nombre && getFilteredProducts(art.nombre).length > 0 && (
                    <ul className="absolute z-50 w-full bg-bg-card border border-border-custom rounded-md mt-1 max-h-60 overflow-y-auto shadow-2xl text-left">
                      {getFilteredProducts(art.nombre).map(p => (
                        <li
                          key={p.id}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onClick={() => {
                            const isKit = SOLUCIONES_DISPONIBLES.some(k => k.nombre === p.nombre);
                            let kitComponents: any[] = [];
                            if (isKit) {
                              const kitDef = SOLUCIONES_DISPONIBLES.find(k => k.nombre === p.nombre);
                              if (kitDef) {
                                kitComponents = kitDef.componentes.map(comp => {
                                  // Buscar si el componente existe en el stock (productos de la DB)
                                  const matchedProduct = productos.find(dbProd => 
                                    dbProd.nombre.toLowerCase().replace(/[^a-z0-9]/g, "") === comp.nombre.toLowerCase().replace(/[^a-z0-9]/g, "") ||
                                    dbProd.nombre.toLowerCase().includes(comp.nombre.toLowerCase()) ||
                                    comp.nombre.toLowerCase().includes(dbProd.nombre.toLowerCase())
                                  );
                                  return {
                                    id: matchedProduct?.id || null, // Guardar la referencia al id real del stock
                                    nombre: comp.nombre,
                                    cantidad: comp.cantidad,
                                    checked: true
                                  };
                                });
                              }
                            }
                            updateArticulo(art.id, { 
                              nombre: p.nombre, 
                              productoId: p.id,
                              kitComponents: isKit ? kitComponents : undefined
                            });
                            setFocusedProductRow(null);
                            if (isKit) {
                              setActiveKitRowId(art.id);
                            }
                          }}
                          className="px-4 py-2 hover:bg-[#0078D7] hover:text-white cursor-pointer text-sm text-text-secondary border-b border-border-custom last:border-b-0"
                        >
                          <div className="font-bold">{p.nombre}</div>
                          <div className="text-xs text-text-muted font-mono">Stock: {p.cantidad} | SKU: {p.id.substring(0, 8)}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                  {art.kitComponents && (
                    <button
                      type="button"
                      onClick={() => setActiveKitRowId(art.id)}
                      className="mt-2 text-xs font-bold text-[#0078D7] hover:text-[#005a9e] transition-colors flex items-center gap-1.5 cursor-pointer block"
                    >
                      <span>🛠️ Configurar componentes ({art.kitComponents.filter((c: any) => c.checked).length} de {art.kitComponents.length} tildados)</span>
                    </button>
                  )}
                </div>
                <div className="w-full md:w-24">
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Cant.</label>
                  <input
                    type="number"
                    min="1"
                    value={art.cantidad}
                    onChange={e => updateArticulo(art.id, { cantidad: Number(e.target.value) })}
                    onFocus={e => e.target.select()}
                    className="w-full bg-bg-card border border-border-custom rounded-md px-3 py-2 text-text-primary focus:border-[#0078D7] outline-none"
                  />
                </div>
                <div className="w-full md:w-32">
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Precio Un.</label>
                  <input
                    type="number"
                    min="0"
                    value={art.precio}
                    onChange={e => updateArticulo(art.id, { precio: Number(e.target.value) })}
                    onFocus={e => e.target.select()}
                    className="w-full bg-bg-card border border-border-custom rounded-md px-3 py-2 text-text-primary focus:border-[#0078D7] outline-none"
                  />
                </div>
                <button 
                  type="button" 
                  onClick={() => removeArticulo(art.id)}
                  disabled={articulos.length === 1}
                  className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded transition-colors disabled:opacity-30 cursor-pointer"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Sección Costos Adicionales y Resumen */}
        <div className="bg-bg-card rounded-xl border border-border-custom shadow-xl p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4 border-b border-border-custom pb-2">3. Adicionales y Facturación</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Entrega / Envío</label>
              <select
                value={formData.tipoEnvio}
                onChange={e => {
                  const val = e.target.value;
                  setFormData({
                    ...formData,
                    tipoEnvio: val,
                    costoEnvio: val === "RETIRO" ? 0 : formData.costoEnvio
                  });
                }}
                className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-3 text-text-primary focus:border-[#0078D7] transition-colors outline-none appearance-none cursor-pointer"
              >
                <option value="RETIRO" className="bg-bg-card text-text-primary">Retiro Local (Sin costo)</option>
                <option value="ENVIO" className="bg-bg-card text-text-primary">Envío a Domicilio</option>
              </select>
            </div>
            {formData.tipoEnvio === "ENVIO" && (
              <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Costo de Envío</label>
                <input
                  type="number"
                  min="0"
                  value={formData.costoEnvio}
                  onChange={e => setFormData({...formData, costoEnvio: Number(e.target.value)})}
                  onFocus={e => e.target.select()}
                  className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-3 text-text-primary focus:border-[#0078D7] outline-none"
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Descuento ($)</label>
              <input
                type="number"
                min="0"
                value={formData.descuento}
                onChange={e => setFormData({...formData, descuento: Number(e.target.value)})}
                className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-3 text-text-primary focus:border-[#0078D7] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Autoriza Dto.</label>
              <input
                type="text"
                value={formData.autorizaDescuento}
                onChange={e => setFormData({...formData, autorizaDescuento: e.target.value})}
                className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-3 text-text-primary focus:border-[#0078D7] outline-none"
                placeholder="Nombre de supervisor..."
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Tipo de Factura</label>
              <select
                value={formData.tipoFactura}
                onChange={e => setFormData({...formData, tipoFactura: e.target.value})}
                className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-3 text-text-primary focus:border-[#0078D7] transition-colors outline-none appearance-none"
              >
                <option value="A" className="bg-bg-card text-text-primary">Factura A</option>
                <option value="B" className="bg-bg-card text-text-primary">Factura B</option>
                <option value="C" className="bg-bg-card text-text-primary">Factura C</option>
                <option value="X" className="bg-bg-card text-text-primary">Remito (X)</option>
              </select>
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Observaciones</label>
            <textarea
              value={formData.observaciones}
              onChange={e => setFormData({...formData, observaciones: e.target.value})}
              className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-3 text-text-primary focus:border-[#0078D7] outline-none min-h-[80px]"
              placeholder="Detalles adicionales para Facturación / Operativa..."
            />
          </div>

          <div className="mt-8 bg-bg-subtle border border-border-custom rounded-lg p-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-xl text-text-secondary">
              Total a Pagar: <span className="text-3xl font-bold text-emerald-500 ml-2">{formData.moneda === "USD" ? "US$" : "$"} {total.toFixed(2)}</span>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-[#0078D7] hover:bg-[#005a9e] text-white font-bold py-3 px-8 rounded-md transition-colors flex items-center gap-3 disabled:opacity-50 tracking-wide w-full md:w-auto justify-center cursor-pointer"
            >
              <Save className="w-5 h-5" />
              {loading ? "PROCESANDO..." : "ENVIAR A FACTURACIÓN"}
            </button>
          </div>
        </div>
      </form>

      {/* Right Drawer: Configurar Solución */}
      {activeKitRowId !== null && (() => {
        const activeRow = articulos.find(a => a.id === activeKitRowId);
        if (!activeRow || !activeRow.kitComponents) return null;

        return (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
              onClick={() => setActiveKitRowId(null)}
            />
            {/* Drawer */}
            <div className="fixed right-0 top-0 h-full w-96 bg-bg-card border-l border-border-custom shadow-2xl z-50 p-6 flex flex-col animate-in slide-in-from-right duration-300 text-left">
              <div className="flex justify-between items-center pb-4 border-b border-border-custom">
                <div>
                  <h3 className="text-lg font-bold text-text-primary">Configurar Solución</h3>
                  <p className="text-xs text-text-muted">{activeRow.nombre}</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setActiveKitRowId(null)} 
                  className="text-text-muted hover:text-text-primary transition-colors cursor-pointer animate-none bg-transparent border-none outline-none"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-4 space-y-3">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Componentes requeridos:</p>
                {activeRow.kitComponents.map((comp: any, idx: number) => {
                  const hasStock = !!comp.id;
                  return (
                    <label 
                      key={idx} 
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                        comp.checked 
                          ? "bg-teal-500/5 border-teal-500/30 text-text-primary" 
                          : "bg-bg-subtle border-border-custom text-text-muted font-normal"
                      }`}
                    >
                      <input 
                        type="checkbox"
                        checked={comp.checked}
                        onChange={() => {
                          setArticulos(prev => prev.map(art => {
                            if (art.id === activeKitRowId && art.kitComponents) {
                              return {
                                ...art,
                                kitComponents: art.kitComponents.map((c: any, cIdx: number) => 
                                  cIdx === idx ? { ...c, checked: !c.checked } : c
                                )
                              };
                            }
                            return art;
                          }));
                        }}
                        className="mt-0.5 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-semibold flex items-center justify-between">
                          <span>{comp.nombre}</span>
                          <span className="text-xs px-2 py-0.5 bg-bg-card border border-border-custom rounded-md font-mono font-bold">x{comp.cantidad}</span>
                        </div>
                        {!hasStock && (
                          <span className="text-[10px] text-amber-500 font-semibold block mt-0.5">⚠️ No encontrado en stock</span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-border-custom shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveKitRowId(null)}
                  className="w-full bg-[#0078D7] hover:bg-[#005a9e] text-white font-bold py-2.5 rounded-md transition-colors text-center cursor-pointer text-sm"
                >
                  Confirmar Componentes
                </button>
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}
