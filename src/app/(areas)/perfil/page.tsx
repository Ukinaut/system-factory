"use client";

import { useState, useEffect, useRef } from "react";
import { User, Shield, Key, Mail, Landmark, Phone, Briefcase, Camera, Save, CheckCircle, Upload } from "lucide-react";
import { updateProfile } from "@/actions/users";

export default function PerfilPage() {
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    nombre: "",
    correo: "",
    telefono: "",
    cargo: "",
    contrasena: "",
    confirmarContrasena: "",
    fotoBase64: "",
    fotoFileName: "",
    fotoPreview: "",
  });

  useEffect(() => {
    // Leer datos de sesión desde cookie
    const cookies = document.cookie.split("; ");
    const sessionCookie = cookies.find((row) => row.startsWith("sessionToken="));
    if (sessionCookie) {
      try {
        const token = sessionCookie.split("=")[1];
        const decodedStr = atob(decodeURIComponent(token));
        const data = JSON.parse(decodedStr);
        setSession(data);
        setForm({
          nombre: data.nombre || "",
          correo: data.correo || "",
          telefono: data.telefono || "",
          cargo: data.cargo || "",
          contrasena: "",
          confirmarContrasena: "",
          fotoBase64: "",
          fotoFileName: "",
          fotoPreview: data.fotoUrl || "",
        });
      } catch (e) {
        console.error("Error parsing session cookie:", e);
      }
    }
  }, []);

  // Manejar selección de foto de perfil
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Por favor selecciona una imagen válida (PNG, JPG, WEBP).");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setForm((f) => ({
        ...f,
        fotoBase64: base64,
        fotoFileName: file.name,
        fotoPreview: base64,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.contrasena && form.contrasena !== form.confirmarContrasena) {
      alert("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    const res = await updateProfile({
      nombre: form.nombre,
      correo: form.correo,
      telefono: form.telefono,
      cargo: form.cargo,
      contrasena: form.contrasena || undefined,
      fotoBase64: form.fotoBase64 || undefined,
      fotoFileName: form.fotoFileName || undefined,
    });
    setLoading(false);

    if (res.success) {
      alert("Perfil actualizado con éxito.");
      setForm((f) => ({ ...f, contrasena: "", confirmarContrasena: "" }));
      // Recargar ventana o actualizar datos desde cookie
      window.location.reload();
    } else {
      alert("Error al actualizar perfil: " + res.error);
    }
  };

  if (!session) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center text-text-muted">
        Cargando perfil de usuario...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary tracking-wide flex items-center gap-3">
          <User className="text-[#0078D7] w-8 h-8" />
          Mi Perfil
        </h1>
        <p className="text-text-muted">Gestione su información de acceso, foto de perfil y consulte sus permisos en el sistema.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Info Column */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-bg-card rounded-xl border border-border-custom shadow-xl p-6 text-center">
            {/* Foto de Perfil con selector */}
            <div className="relative w-28 h-28 mx-auto mb-4 group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-[#0078D7] bg-bg-subtle flex items-center justify-center shadow-md">
                {form.fotoPreview ? (
                  <img src={form.fotoPreview} alt={session.nombre} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-14 h-14 text-text-muted" />
                )}
              </div>
              <div className="absolute inset-0 bg-black/50 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white">
                <Camera className="w-6 h-6 mb-1" />
                <span className="text-[10px] font-bold uppercase">Cambiar Foto</span>
              </div>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-[#0078D7] hover:underline font-bold mb-3 flex items-center justify-center gap-1 mx-auto"
            >
              <Upload className="w-3.5 h-3.5" />
              Subir Foto de Perfil
            </button>

            <h2 className="text-lg font-bold text-text-primary">{session.nombre}</h2>
            {session.cargo && <p className="text-xs text-text-secondary font-semibold mt-0.5">{session.cargo}</p>}
            <p className="text-xs text-[#0078D7] font-bold uppercase tracking-wider mt-1.5 inline-block bg-[#0078D7]/10 px-3 py-1 rounded-full border border-[#0078D7]/20">
              {session.rol}
            </p>
          </div>

          <div className="bg-bg-card rounded-xl border border-border-custom shadow-xl p-6 space-y-4">
            <h3 className="font-bold text-sm text-text-primary flex items-center gap-2 border-b border-border-custom pb-2">
              <Shield className="w-4 h-4 text-emerald-500" />
              Permisos y Áreas Autorizadas
            </h3>
            {session.rol === "ADMIN" ? (
              <p className="text-xs text-emerald-500 font-semibold bg-emerald-500/10 p-2.5 rounded border border-emerald-500/20 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 shrink-0" /> Acceso Completo (Administrador Global)
              </p>
            ) : (
              <div className="space-y-1.5">
                {(session.permissions || []).map((p: any, idx: number) => (
                  <span
                    key={idx}
                    className="inline-block text-xs bg-bg-subtle text-text-secondary px-2.5 py-1 rounded border border-border-custom font-medium mr-1.5"
                  >
                    {p.areaPermitida}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Form Column */}
        <div className="md:col-span-2">
          <div className="bg-bg-card rounded-xl border border-border-custom shadow-xl p-6">
            <h3 className="font-bold text-lg text-text-primary mb-6 border-b border-border-custom pb-3 flex items-center gap-2">
              <Landmark className="w-5 h-5 text-[#0078D7]" />
              Información Básica del Perfil
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Nombre Completo *</label>
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-3 text-text-primary focus:border-[#0078D7] outline-none text-sm font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                    <Mail className="w-3.5 h-3.5 inline mr-1 text-[#0078D7]" /> Correo Electrónico (Login) *
                  </label>
                  <input
                    type="email"
                    value={form.correo}
                    onChange={(e) => setForm({ ...form, correo: e.target.value })}
                    className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-3 text-text-primary focus:border-[#0078D7] outline-none text-sm font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                    <Phone className="w-3.5 h-3.5 inline mr-1 text-[#0078D7]" /> Teléfono / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={form.telefono}
                    onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                    placeholder="Ej: +54 9 11 1234 5678"
                    className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-3 text-text-primary focus:border-[#0078D7] outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                    <Briefcase className="w-3.5 h-3.5 inline mr-1 text-[#0078D7]" /> Cargo / Puesto en la empresa
                  </label>
                  <input
                    type="text"
                    value={form.cargo}
                    onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                    placeholder="Ej: Ejecutivo de Ventas / Operador Logístico"
                    className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-3 text-text-primary focus:border-[#0078D7] outline-none text-sm"
                  />
                </div>
              </div>

              <div className="bg-bg-subtle/40 p-6 rounded-lg border border-border-custom space-y-6">
                <h4 className="font-bold text-sm text-text-primary flex items-center gap-2">
                  <Key className="w-4 h-4 text-[#0078D7]" />
                  Cambiar Contraseña (Dejar vacío para mantener la actual)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Nueva Contraseña</label>
                    <input
                      type="password"
                      value={form.contrasena}
                      onChange={(e) => setForm({ ...form, contrasena: e.target.value })}
                      className="w-full bg-bg-card border border-border-custom rounded-md px-4 py-3 text-text-primary focus:border-[#0078D7] outline-none text-sm"
                      minLength={6}
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Confirmar Contraseña</label>
                    <input
                      type="password"
                      value={form.confirmarContrasena}
                      onChange={(e) => setForm({ ...form, confirmarContrasena: e.target.value })}
                      className="w-full bg-bg-card border border-border-custom rounded-md px-4 py-3 text-text-primary focus:border-[#0078D7] outline-none text-sm"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-border-custom">
                <button
                  type="submit"
                  className="bg-[#0078D7] hover:bg-[#005a9e] text-white px-8 py-3 rounded-md font-bold transition-all cursor-pointer flex items-center gap-2 text-sm shadow-lg shadow-[#0078D7]/20"
                  disabled={loading}
                >
                  <Save className="w-5 h-5" />
                  {loading ? "Guardando cambios..." : "Guardar Perfil"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
