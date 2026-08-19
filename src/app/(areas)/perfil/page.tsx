"use client";

import { useState, useEffect } from "react";
import { User, Shield, Key, Mail, Landmark } from "lucide-react";
import { updateProfile } from "@/actions/users";

export default function PerfilPage() {
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<any>(null);

  const [form, setForm] = useState({
    nombre: "",
    correo: "",
    contrasena: "",
    confirmarContrasena: "",
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
          contrasena: "",
          confirmarContrasena: "",
        });
      } catch (e) {
        console.error("Error parsing session cookie:", e);
      }
    }
  }, []);

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
      contrasena: form.contrasena || undefined,
    });
    setLoading(false);

    if (res.success) {
      alert("Perfil actualizado con éxito.");
      setForm((f) => ({ ...f, contrasena: "", confirmarContrasena: "" }));
      // Recargar datos desde la cookie actualizada
      const cookies = document.cookie.split("; ");
      const sessionCookie = cookies.find((row) => row.startsWith("sessionToken="));
      if (sessionCookie) {
        const token = sessionCookie.split("=")[1];
        const data = JSON.parse(atob(decodeURIComponent(token)));
        setSession(data);
      }
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
        <p className="text-text-muted">Gestione su información de acceso y consulte sus permisos en el sistema.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Info Column */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-bg-card rounded-xl border border-border-custom shadow-xl p-6 text-center">
            <div className="w-20 h-20 bg-[#0078D7]/10 text-[#0078D7] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#0078D7]/30">
              <User className="w-10 h-10" />
            </div>
            <h2 className="text-lg font-bold text-text-primary">{session.nombre}</h2>
            <p className="text-xs text-[#0078D7] font-semibold uppercase tracking-wider mt-1">{session.rol}</p>
          </div>

          <div className="bg-bg-card rounded-xl border border-border-custom shadow-xl p-6 space-y-4">
            <h3 className="font-bold text-sm text-text-primary flex items-center gap-2 border-b border-border-custom pb-2">
              <Shield className="w-4 h-4 text-emerald-500" />
              Permisos y Áreas
            </h3>
            {session.rol === "ADMIN" ? (
              <p className="text-xs text-emerald-500 font-semibold bg-emerald-500/10 p-2.5 rounded border border-emerald-500/20">
                Acceso completo (Administrador Global)
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
              Información de la Cuenta
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Nombre Completo</label>
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-3 text-text-primary focus:border-[#0078D7] outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                    <Mail className="w-3.5 h-3.5 inline mr-1" /> Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={form.correo}
                    onChange={(e) => setForm({ ...form, correo: e.target.value })}
                    className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-3 text-text-primary focus:border-[#0078D7] outline-none"
                    required
                  />
                </div>
              </div>

              <div className="bg-bg-subtle/40 p-6 rounded-lg border border-border-custom space-y-6">
                <h4 className="font-bold text-sm text-text-primary flex items-center gap-2">
                  <Key className="w-4 h-4 text-[#0078D7]" />
                  Cambiar Contraseña (Dejar vacío para no modificar)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Nueva Contraseña</label>
                    <input
                      type="password"
                      value={form.contrasena}
                      onChange={(e) => setForm({ ...form, contrasena: e.target.value })}
                      className="w-full bg-bg-card border border-border-custom rounded-md px-4 py-3 text-text-primary focus:border-[#0078D7] outline-none"
                      minLength={6}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Confirmar Contraseña</label>
                    <input
                      type="password"
                      value={form.confirmarContrasena}
                      onChange={(e) => setForm({ ...form, confirmarContrasena: e.target.value })}
                      className="w-full bg-bg-card border border-border-custom rounded-md px-4 py-3 text-text-primary focus:border-[#0078D7] outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-border-custom">
                <button
                  type="submit"
                  className="bg-[#0078D7] hover:bg-[#005a9e] text-white px-6 py-3 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-2"
                  disabled={loading}
                >
                  <Save className="w-5 h-5" />
                  {loading ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

// Simple Save Icon fallback since Save wasn't imported from lucide
import { Save } from "lucide-react";
