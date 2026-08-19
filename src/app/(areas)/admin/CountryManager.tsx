"use client";

import { useState, useTransition, useEffect } from "react";
import { 
  Globe, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  AlertCircle, 
  Loader2, 
  X,
  Star
} from "lucide-react";
import { 
  createCountry, 
  updateCountry, 
  deleteCountry 
} from "@/actions/countries";

interface Country {
  id: string;
  code: string;
  nombre: string;
  isPrincipal: boolean;
  activo: boolean;
}

const COUNTRY_CODES: Record<string, string> = {
  argentina: "AR",
  españa: "ES",
  colombia: "CO",
  maldivas: "MV",
  chile: "CL",
  uruguay: "UY",
  brasil: "BR",
  brazil: "BR",
  paraguay: "PY",
  bolivia: "BO",
  peru: "PE",
  ecuador: "EC",
  venezuela: "VE",
  mexico: "MX",
  méxico: "MX",
  "estados unidos": "US",
  usa: "US",
  canada: "CA",
  canadá: "CA",
  "reino unido": "GB",
  italia: "IT",
  francia: "FR",
  alemania: "DE",
  china: "CN",
  japon: "JP",
  japón: "JP",
  australia: "AU",
  portugal: "PT",
  andorra: "AD",
  panama: "PA",
  panamá: "PA",
  "costa rica": "CR",
  honduras: "HN",
  guatemala: "GT",
  "el salvador": "SV",
  nicaragua: "NI",
  cuba: "CU",
  "puerto rico": "PR",
  "republica dominicana": "DO",
  "república dominicana": "DO"
};

export default function CountryManager({ 
  initialCountries 
}: { 
  initialCountries: Country[] 
 }) {
  const [countries, setCountries] = useState<Country[]>(initialCountries);
  const [activeTab, setActiveTab] = useState<"list" | "form">("list");
  const [isPending, startTransition] = useTransition();

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [code, setCode] = useState("");
  const [isPrincipal, setIsPrincipal] = useState(false);
  const [activo, setActivo] = useState(true);

  // Status message
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  // Confirm Delete Dialog
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setCountries(initialCountries);
  }, [initialCountries]);

  const handleNombreChange = (val: string) => {
    setNombre(val);
    const cleanName = val.toLowerCase().trim();
    if (cleanName in COUNTRY_CODES) {
      setCode(COUNTRY_CODES[cleanName]);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setNombre("");
    setCode("");
    setIsPrincipal(false);
    setActivo(true);
    setMessage(null);
  };

  const handleEditClick = (country: Country) => {
    setEditingId(country.id);
    setNombre(country.nombre);
    setCode(country.code);
    setIsPrincipal(country.isPrincipal);
    setActivo(country.activo);
    setMessage(null);
    setActiveTab("form");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!nombre || !code) {
      setMessage({ type: "error", text: "Por favor complete todos los campos obligatorios." });
      return;
    }

    startTransition(async () => {
      if (editingId) {
        // Actualizar
        const result = await updateCountry(editingId, {
          nombre,
          code: code.toUpperCase().trim(),
          isPrincipal,
          activo
        });

        if (result.success) {
          setMessage({ type: "success", text: "País/Región actualizado con éxito." });
          // Si se marcó como principal, desmarcamos los demás localmente
          setCountries(prev => prev.map(c => {
            let updatedPrincipal = c.isPrincipal;
            if (c.id === editingId) {
              updatedPrincipal = isPrincipal;
            } else if (isPrincipal) {
              updatedPrincipal = false;
            }
            return c.id === editingId ? {
              ...c,
              nombre,
              code: code.toUpperCase().trim(),
              isPrincipal,
              activo
            } : { ...c, isPrincipal: updatedPrincipal };
          }));

          setTimeout(() => {
            resetForm();
            setActiveTab("list");
          }, 1500);
        } else {
          setMessage({ type: "error", text: result.error || "Error al actualizar país/región." });
        }
      } else {
        // Crear nuevo
        const result = await createCountry({
          nombre,
          code: code.toUpperCase().trim(),
          isPrincipal,
          activo
        });

        if (result.success && result.country) {
          setMessage({ type: "success", text: "País/Región registrado con éxito." });
          const newCountry = result.country;
          // Si es principal, actualizamos localmente para desactivar la principalidad de los otros
          setCountries(prev => {
            const updatedList = prev.map(c => isPrincipal ? { ...c, isPrincipal: false } : c);
            return [newCountry, ...updatedList];
          });
          setTimeout(() => {
            resetForm();
            setActiveTab("list");
          }, 1500);
        } else {
          setMessage({ type: "error", text: result.error || "Error al crear país/región." });
        }
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteCountry(id);
      if (result.success) {
        setCountries(prev => prev.filter(c => c.id !== id));
        setDeletingId(null);
      } else {
        alert(result.error || "No se pudo eliminar el país/región.");
      }
    });
  };

  return (
    <div className="bg-bg-card rounded-xl shadow-lg border border-border-custom overflow-hidden max-w-7xl mx-auto">
      {/* Cabecera del Panel */}
      <div className="p-6 border-b border-border-custom flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-bg-subtle">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 rounded-lg text-[#0078D7]">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-primary">Configuración Regional de Países</h2>
            <p className="text-text-muted text-xs mt-0.5">Agrega, edita o desactiva las subdivisiones de la plataforma.</p>
          </div>
        </div>

        {/* Selector de pestañas */}
        <div className="flex items-center bg-bg-subtle p-1 rounded-lg border border-border-custom self-start md:self-auto">
          <button
            onClick={() => { setActiveTab("list"); resetForm(); }}
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-md transition-all duration-200 cursor-pointer ${
              activeTab === "list"
                ? "bg-[#0078D7] text-white shadow-md"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            Listado
          </button>
          <button
            onClick={() => { setActiveTab("form"); resetForm(); }}
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-md transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
              activeTab === "form"
                ? "bg-[#0078D7] text-white shadow-md"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            {editingId ? "Editar País" : "Nuevo País"}
          </button>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="p-6">
        {activeTab === "list" ? (
          <div className="overflow-x-auto">
            {countries.length === 0 ? (
              <div className="text-center py-12 text-text-muted">
                <Globe className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No hay países o regiones configurados.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border-custom text-text-muted text-xs uppercase tracking-wider font-semibold">
                    <th className="py-4 px-4">País / Región</th>
                    <th className="py-4 px-4">Código</th>
                    <th className="py-4 px-4">Estado</th>
                    <th className="py-4 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-custom text-sm text-text-secondary">
                  {countries.map((c) => (
                    <tr key={c.id} className="hover:bg-bg-subtle transition-colors">
                      <td className="py-4 px-4 font-medium text-text-primary">
                        <div className="flex items-center gap-3">
                          {c.isPrincipal && (
                            <span title="País Principal">
                              <Star className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
                            </span>
                          )}
                          <span>{c.nombre}</span>
                          {c.isPrincipal && (
                            <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20 font-bold uppercase tracking-wider">
                              Principal
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 font-mono text-text-muted">{c.code}</td>
                      <td className="py-4 px-4">
                        {c.activo ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold text-text-muted bg-bg-subtle border border-border-custom rounded-full">
                            Inactivo
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEditClick(c)}
                            className="p-1.5 hover:bg-bg-subtle hover:text-text-primary rounded transition-colors text-text-muted cursor-pointer"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          
                          {deletingId === c.id ? (
                            <div className="flex items-center gap-1.5 bg-red-950 border border-red-500/20 p-1 rounded">
                              <span className="text-xs text-red-400 px-1 font-semibold">¿Borrar?</span>
                              <button
                                onClick={() => handleDelete(c.id)}
                                disabled={isPending}
                                className="p-1 text-red-400 hover:text-white hover:bg-red-500 rounded transition-colors cursor-pointer"
                              >
                                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={() => setDeletingId(null)}
                                className="p-1 text-text-muted hover:text-text-primary rounded transition-colors cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeletingId(c.id)}
                              className="p-1.5 hover:bg-red-500/10 hover:text-red-400 rounded transition-colors text-text-muted cursor-pointer"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl bg-bg-card">
            {message && (
              <div className={`p-4 rounded border flex items-start gap-3 ${
                message.type === "success" 
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                  : "bg-red-500/10 border-red-500/20 text-red-400"
              }`}>
                {message.type === "success" ? <Check className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
                <span className="text-sm font-medium">{message.text}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                  Nombre del País / Región *
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => handleNombreChange(e.target.value)}
                  placeholder="Ej: España"
                  required
                  className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-2.5 text-text-primary focus:border-[#0078D7] transition-colors outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                  Código de Región * (Ej: AR, ES, CO)
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Ej: ES"
                  maxLength={5}
                  required
                  className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-2.5 text-text-primary focus:border-[#0078D7] transition-colors outline-none uppercase font-mono"
                />
              </div>
            </div>

            <div className="bg-bg-subtle/50 p-4 rounded-lg border border-border-custom space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isPrincipal"
                  checked={isPrincipal}
                  onChange={(e) => setIsPrincipal(e.target.checked)}
                  className="w-4.5 h-4.5 accent-[#0078D7] cursor-pointer"
                />
                <label htmlFor="isPrincipal" className="text-sm text-text-secondary select-none cursor-pointer">
                  Definir como <strong>País Principal</strong> (Solo puede haber un país principal activo)
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="activo"
                  checked={activo}
                  onChange={(e) => setActivo(e.target.checked)}
                  className="w-4.5 h-4.5 accent-[#0078D7] cursor-pointer"
                />
                <label htmlFor="activo" className="text-sm text-text-secondary select-none cursor-pointer">
                  Región Activa (Habilita la selección de este país en la pantalla de entrada)
                </label>
              </div>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <button
                type="submit"
                disabled={isPending}
                className="bg-[#0078D7] hover:bg-[#005a9e] disabled:opacity-50 text-white font-semibold py-2.5 px-6 rounded transition-colors tracking-wide flex items-center gap-2 cursor-pointer"
              >
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingId ? "Actualizar Región" : "Guardar Región"}
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab("list"); resetForm(); }}
                className="bg-transparent hover:bg-bg-subtle border border-border-custom text-text-muted hover:text-text-primary py-2.5 px-6 rounded transition-all cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
