"use client";

import { useState, useRef, useEffect } from "react";
import { User, Shield, Key, Mail, Landmark, Phone, Briefcase, Camera, Save, CheckCircle, Upload, ShieldCheck, RefreshCw, AlertCircle, Sparkles, Server } from "lucide-react";
import { updateProfile } from "@/actions/users";
import { getMailAccountSettings, saveMailAccountSettings, testGoogleWorkspaceConnection } from "@/actions/mail";
import { useRouter } from "next/navigation";

export default function PerfilClient({ initialSession }: { initialSession: any }) {
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<any>(initialSession);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Basic Profile Form State
  const [form, setForm] = useState({
    nombre: initialSession?.nombre || "",
    correo: initialSession?.correo || "",
    telefono: initialSession?.telefono || "",
    cargo: initialSession?.cargo || "",
    contrasena: "",
    confirmarContrasena: "",
    fotoBase64: "",
    fotoFileName: "",
    fotoPreview: initialSession?.fotoUrl || "",
  });

  // Google Workspace Mail Integration State
  const [googleMailConfig, setGoogleMailConfig] = useState({
    email: initialSession?.correo || "",
    displayName: initialSession?.nombre || "",
    appPassword: "",
    smtpHost: "smtp.gmail.com",
    smtpPort: 465,
    isLinked: false
  });
  const [testingGoogle, setTestingGoogle] = useState(false);
  const [googleTestResult, setGoogleTestResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);
  const [savingGoogle, setSavingGoogle] = useState(false);
  const [googleStatusMsg, setGoogleStatusMsg] = useState<string | null>(null);

  // Load existing linked Google Workspace configuration
  useEffect(() => {
    getMailAccountSettings().then((res) => {
      if (res.success && res.account) {
        setGoogleMailConfig((prev) => ({
          ...prev,
          email: res.account.email || initialSession?.correo || "",
          displayName: res.account.displayName || initialSession?.nombre || "",
          appPassword: res.account.smtpPass || "",
          smtpHost: res.account.smtpHost || "smtp.gmail.com",
          smtpPort: res.account.smtpPort || 465,
          isLinked: !!res.account.isLinked && !!res.account.smtpPass
        }));
      }
    });
  }, [initialSession]);

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

  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.contrasena && form.contrasena !== form.confirmarContrasena) {
      alert("Las contraseñas de acceso al sistema no coinciden.");
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

    if (res.success && res.user) {
      alert("Perfil de usuario actualizado con éxito.");
      setSession((prev: any) => ({
        ...prev,
        nombre: res.user.nombre,
        correo: res.user.correo,
        telefono: res.user.telefono,
        cargo: res.user.cargo,
        fotoUrl: res.user.fotoUrl,
      }));
      setForm((f) => ({ 
        ...f, 
        contrasena: "", 
        confirmarContrasena: "", 
        fotoPreview: res.user.fotoUrl || f.fotoPreview 
      }));
      router.refresh();
    } else {
      alert("Error al actualizar perfil: " + (res.error || "Ocurrió un error inesperado"));
    }
  };

  const handleTestGoogleConnection = async () => {
    setTestingGoogle(true);
    setGoogleTestResult(null);
    const res = await testGoogleWorkspaceConnection({
      email: googleMailConfig.email,
      appPassword: googleMailConfig.appPassword,
      smtpHost: googleMailConfig.smtpHost,
      smtpPort: googleMailConfig.smtpPort
    });
    setTestingGoogle(false);
    setGoogleTestResult(res);
  };

  const handleSaveGoogleWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleMailConfig.email || !googleMailConfig.appPassword) {
      alert("Ingresa el correo corporativo y la Contraseña de Aplicación de Google (16 caracteres).");
      return;
    }

    setSavingGoogle(true);
    setGoogleStatusMsg(null);
    const res = await saveMailAccountSettings({
      provider: "GOOGLE_WORKSPACE",
      email: googleMailConfig.email,
      displayName: googleMailConfig.displayName || form.nombre,
      appPassword: googleMailConfig.appPassword,
      smtpHost: googleMailConfig.smtpHost,
      smtpPort: googleMailConfig.smtpPort
    });
    setSavingGoogle(false);

    if (res.success) {
      setGoogleMailConfig(prev => ({ ...prev, isLinked: true }));
      setGoogleStatusMsg("✅ Cuenta corporativa de Google Workspace vinculada y lista para enviar correos.");
      alert("¡Cuenta corporativa de Google Workspace vinculada con éxito!");
    } else {
      alert("Error al vincular cuenta: " + res.error);
    }
  };

  return (
    <div className="w-full pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary tracking-wide flex items-center gap-3">
          <User className="text-[#0078D7] w-8 h-8" />
          Mi Perfil & Vinculación de Cuentas
        </h1>
        <p className="text-text-muted">Gestione su información personal, clave de acceso al sistema y vinculación de su casilla corporativa Google Workspace.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Photo & Permissions */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-bg-card rounded-xl border border-border-custom shadow-xl p-6 text-center">
            {/* Foto de Perfil con selector */}
            <div className="relative w-28 h-28 mx-auto mb-4 group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-[#0078D7] bg-bg-subtle flex items-center justify-center shadow-md">
                {form.fotoPreview ? (
                  <img src={form.fotoPreview} alt={session?.nombre} className="w-full h-full object-cover" />
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
              className="text-xs text-[#0078D7] hover:underline font-bold mb-3 flex items-center justify-center gap-1 mx-auto cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              Subir Foto de Perfil
            </button>

            <h2 className="text-lg font-bold text-text-primary">{session?.nombre}</h2>
            {session?.cargo && <p className="text-xs text-text-secondary font-semibold mt-0.5">{session.cargo}</p>}
            <p className="text-xs text-[#0078D7] font-bold uppercase tracking-wider mt-1.5 inline-block bg-[#0078D7]/10 px-3 py-1 rounded-full border border-[#0078D7]/20">
              {session?.rol}
            </p>
          </div>

          {/* Google Workspace Link Status Card */}
          <div className="bg-bg-card rounded-xl border border-border-custom shadow-xl p-5 space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-text-muted flex items-center gap-2 border-b border-border-custom pb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Estado de Correo Corporativo
            </h3>
            {googleMailConfig.isLinked ? (
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-lg text-xs space-y-1">
                <p className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" /> Google Workspace Activo
                </p>
                <p className="text-text-primary font-mono text-[11px] truncate">{googleMailConfig.email}</p>
                <p className="text-[10px] text-text-muted">Servidor: {googleMailConfig.smtpHost}:465</p>
              </div>
            ) : (
              <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg text-xs space-y-1">
                <p className="font-bold text-amber-400 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" /> Sin Vincular
                </p>
                <p className="text-[11px] text-text-muted">Ingresa tu Contraseña de Aplicación de Google para habilitar el envío de mails corporativos.</p>
              </div>
            )}
          </div>

          <div className="bg-bg-card rounded-xl border border-border-custom shadow-xl p-6 space-y-4">
            <h3 className="font-bold text-sm text-text-primary flex items-center gap-2 border-b border-border-custom pb-2">
              <Shield className="w-4 h-4 text-emerald-500" />
              Permisos y Áreas Autorizadas
            </h3>
            {session?.rol === "ADMIN" ? (
              <p className="text-xs text-emerald-500 font-semibold bg-emerald-500/10 p-2.5 rounded border border-emerald-500/20 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 shrink-0" /> Acceso Completo (Administrador Global)
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {(session?.permissions || []).map((p: string, idx: number) => (
                  <span
                    key={idx}
                    className="inline-block text-xs bg-bg-subtle text-text-secondary px-2.5 py-1 rounded border border-border-custom font-medium"
                  >
                    {p}
                  </span>
                ))}
                {(!session?.permissions || session.permissions.length === 0) && (
                  <span className="text-xs text-text-muted italic">Sin permisos específicos</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Forms */}
        <div className="md:col-span-2 space-y-8">
          
          {/* SECTION 1: GOOGLE WORKSPACE MAIL LINKING */}
          <div className="bg-bg-card rounded-xl border border-[#0078D7]/40 shadow-2xl p-6 space-y-6">
            <div className="border-b border-border-custom pb-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg text-text-primary flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  Vincular Cuenta de Google Workspace (Gmail Empresa)
                </h3>
                <span className="text-[10px] font-bold uppercase bg-[#0078D7]/15 text-[#0078D7] px-2.5 py-1 rounded-full border border-[#0078D7]/30">
                  Google Email
                </span>
              </div>
              <p className="text-xs text-text-muted mt-1.5">
                Configura tu casilla de e-mail de la empresa (ej: <span className="font-mono text-text-secondary">ventas@aitue.com.ar</span>) para enviar y recibir correos directamente desde SYSTEM FACTORY.
              </p>
            </div>

            <form onSubmit={handleSaveGoogleWorkspace} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                    Correo Empresa Google Workspace *
                  </label>
                  <input
                    type="email"
                    value={googleMailConfig.email}
                    onChange={(e) => setGoogleMailConfig({ ...googleMailConfig, email: e.target.value })}
                    placeholder="ventas@aitue.com.ar"
                    className="w-full bg-bg-subtle border border-border-custom rounded-md px-3.5 py-2.5 text-xs text-text-primary focus:border-[#0078D7] outline-none font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                    Nombre Remitente *
                  </label>
                  <input
                    type="text"
                    value={googleMailConfig.displayName}
                    onChange={(e) => setGoogleMailConfig({ ...googleMailConfig, displayName: e.target.value })}
                    placeholder="Aitue Cominca - Ventas"
                    className="w-full bg-bg-subtle border border-border-custom rounded-md px-3.5 py-2.5 text-xs text-text-primary focus:border-[#0078D7] outline-none font-semibold"
                    required
                  />
                </div>
              </div>

              {/* Box con instrucciones de Contraseña de Aplicación */}
              <div className="bg-sky-500/10 border border-sky-500/30 p-4 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-sky-200 font-bold text-xs">
                  <Sparkles className="w-4 h-4 text-sky-400" />
                  Contraseña de Aplicación de Google (16 Caracteres)
                </div>
                <p className="text-[11px] text-sky-200/90 leading-relaxed">
                  Google Workspace requiere generar una <strong>Contraseña de Aplicación</strong> en la seguridad de tu cuenta de Google (<span className="font-semibold text-white">Google Account ➔ Seguridad ➔ Verificación en 2 pasos ➔ Contraseñas de aplicación</span>). Pégala aquí abajo:
                </p>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-sky-100 mb-1">
                    Contraseña de Aplicación (16 letras):
                  </label>
                  <input
                    type="password"
                    value={googleMailConfig.appPassword}
                    onChange={(e) => setGoogleMailConfig({ ...googleMailConfig, appPassword: e.target.value })}
                    placeholder="xxxx xxxx xxxx xxxx"
                    className="w-full bg-bg-card border border-sky-500/40 rounded-md px-3.5 py-2 text-xs text-text-primary outline-none font-mono font-bold tracking-widest"
                    required
                  />
                </div>
              </div>

              {googleTestResult && (
                <div className={`p-3 rounded-lg border text-xs font-semibold ${
                  googleTestResult.success 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}>
                  {googleTestResult.success ? (
                    <p className="flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 shrink-0" /> {googleTestResult.message}
                    </p>
                  ) : (
                    <p className="flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 shrink-0" /> {googleTestResult.error}
                    </p>
                  )}
                </div>
              )}

              {googleStatusMsg && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs font-bold text-emerald-400">
                  {googleStatusMsg}
                </div>
              )}

              <div className="pt-2 flex justify-between items-center flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleTestGoogleConnection}
                  disabled={testingGoogle}
                  className="px-4 py-2 rounded-md bg-bg-subtle hover:bg-bg-card text-text-primary border border-border-custom text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingGoogle ? 'animate-spin' : ''}`} />
                  {testingGoogle ? "Verificando Google..." : "Probar Conexión con Google"}
                </button>

                <button
                  type="submit"
                  disabled={savingGoogle}
                  className="px-6 py-2.5 rounded-md bg-[#0078D7] hover:bg-[#005a9e] text-white text-xs font-bold transition-all shadow-lg shadow-[#0078D7]/20 cursor-pointer flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {savingGoogle ? "Guardando..." : "Vincular Google Workspace a esta Cuenta"}
                </button>
              </div>
            </form>
          </div>

          {/* SECTION 2: BASIC PROFILE & ACCESO AL SISTEMA */}
          <div className="bg-bg-card rounded-xl border border-border-custom shadow-xl p-6">
            <h3 className="font-bold text-lg text-text-primary mb-6 border-b border-border-custom pb-3 flex items-center gap-2">
              <Landmark className="w-5 h-5 text-[#0078D7]" />
              Información Básica del Perfil & Acceso al Sistema
            </h3>

            <form onSubmit={handleSubmitProfile} className="space-y-6">
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
                    <Mail className="w-3.5 h-3.5 inline mr-1 text-[#0078D7]" /> Correo de Usuario (Login) *
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

              {/* Password cambio de usuario sistema */}
              <div className="bg-bg-subtle/40 p-6 rounded-lg border border-border-custom space-y-4">
                <div>
                  <h4 className="font-bold text-sm text-text-primary flex items-center gap-2">
                    <Key className="w-4 h-4 text-[#0078D7]" />
                    Cambiar Contraseña de Acceso al Sistema
                  </h4>
                  <p className="text-xs text-text-muted mt-1">
                    Esta es la contraseña para iniciar sesión en SYSTEM FACTORY (dejar en blanco para conservar la actual).
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Nueva Contraseña de Acceso</label>
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
                    <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Confirmar Contraseña de Acceso</label>
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
                  {loading ? "Guardando cambios..." : "Guardar Datos de Perfil"}
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
