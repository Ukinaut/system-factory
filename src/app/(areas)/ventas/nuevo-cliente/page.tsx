"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, UserPlus } from "lucide-react";
import Link from "next/link";
import { createClient } from "../actions";

export default function NuevoCliente() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    cuit: "",
    razonSocial: "",
    telefono: "",
    correo: "",
    direccion: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    if (!formData.cuit || !formData.razonSocial) {
      setError("CUIT y Razón Social son obligatorios.");
      setLoading(false);
      return;
    }

    const res = await createClient(formData);
    if (res.success) {
      setSuccess(true);
      setFormData({ cuit: "", razonSocial: "", telefono: "", correo: "", direccion: "" });
    } else {
      setError(res.error || "Error desconocido");
    }
    
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/ventas" className="p-2 bg-bg-card border border-border-custom rounded hover:bg-bg-subtle transition-colors">
          <ArrowLeft className="w-5 h-5 text-text-muted" />
        </Link>
        <h1 className="text-3xl font-bold text-text-primary tracking-wide flex items-center gap-3">
          <UserPlus className="text-emerald-500 w-8 h-8" />
          Registrar Nuevo Cliente
        </h1>
      </div>

      <div className="bg-bg-card rounded-xl border border-border-custom shadow-xl p-8">
        {error && (
          <div className="bg-red-500/10 border-l-4 border-red-500 text-red-400 p-4 mb-6 rounded-r">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-emerald-500/10 border-l-4 border-emerald-500 text-emerald-400 p-4 mb-6 rounded-r">
            ¡Cliente registrado correctamente en la base de datos!
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">CUIT</label>
              <input
                type="text"
                value={formData.cuit}
                onChange={e => setFormData({...formData, cuit: e.target.value})}
                className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-3 text-text-primary focus:border-[#0078D7] transition-colors outline-none"
                placeholder="Ej: 30-12345678-9"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Razón Social / Nombre</label>
              <input
                type="text"
                value={formData.razonSocial}
                onChange={e => setFormData({...formData, razonSocial: e.target.value})}
                className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-3 text-text-primary focus:border-[#0078D7] transition-colors outline-none"
                placeholder="Empresa S.A."
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Teléfono</label>
              <input
                type="text"
                value={formData.telefono}
                onChange={e => setFormData({...formData, telefono: e.target.value})}
                className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-3 text-text-primary focus:border-[#0078D7] transition-colors outline-none"
                placeholder="+54 11 1234-5678"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Correo Electrónico</label>
              <input
                type="email"
                value={formData.correo}
                onChange={e => setFormData({...formData, correo: e.target.value})}
                className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-3 text-text-primary focus:border-[#0078D7] transition-colors outline-none"
                placeholder="contacto@empresa.com"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Dirección</label>
              <input
                type="text"
                value={formData.direccion}
                onChange={e => setFormData({...formData, direccion: e.target.value})}
                className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-3 text-text-primary focus:border-[#0078D7] transition-colors outline-none"
                placeholder="Calle Falsa 123, Ciudad"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-8 rounded-md transition-colors flex items-center gap-2 disabled:opacity-50 tracking-wide cursor-pointer"
            >
              <Save className="w-5 h-5" />
              {loading ? "GUARDANDO..." : "GUARDAR CLIENTE"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
