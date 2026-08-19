"use client";

import { useState, useEffect, useTransition } from "react";
import { 
  MessageSquare, 
  Power, 
  PowerOff, 
  Save, 
  Smartphone, 
  Settings, 
  Users, 
  MessageCircle,
  Globe,
  RefreshCw,
  Copy,
  Check,
  Webhook,
  Key,
  Database,
  Inbox
} from "lucide-react";
import { getBotConfig, saveBotConfig, syncExternalWhatsAppApi, getWhatsAppMessages } from "@/actions/bot";

export default function BotDashboard() {
  const [activeTab, setActiveTab] = useState<"api" | "flujos" | "mensajes">("api");
  const [botActivo, setBotActivo] = useState(true);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [config, setConfig] = useState({
    mensajeBienvenida: "",
    respuestaSoporte: "",
    respuestaFueraHorario: "",
    apiUrl: "",
    apiToken: "",
    webhookSecret: "",
  });

  const [mensajes, setMensajes] = useState<any[]>([]);
  const [isPending, startTransition] = useTransition();

  const loadData = async () => {
    setLoading(true);
    const res = await getBotConfig();
    if (res.success && res.config) {
      setBotActivo(res.config.activo);
      setConfig({
        mensajeBienvenida: res.config.mensajeBienvenida || "",
        respuestaSoporte: res.config.mensajeSoporte || "",
        respuestaFueraHorario: res.config.mensajeFueraHorario || "",
        apiUrl: res.config.apiUrl || "",
        apiToken: res.config.apiToken || "",
        webhookSecret: res.config.webhookSecret || "",
      });
    }

    const msgRes = await getWhatsAppMessages();
    if (msgRes.success) {
      setMensajes(msgRes.messages || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleBot = async () => {
    const nuevoEstado = !botActivo;
    setBotActivo(nuevoEstado);
    await saveBotConfig({
      activo: nuevoEstado,
      mensajeBienvenida: config.mensajeBienvenida,
      mensajeSoporte: config.respuestaSoporte,
      mensajeFueraHorario: config.respuestaFueraHorario,
      apiUrl: config.apiUrl,
      apiToken: config.apiToken,
      webhookSecret: config.webhookSecret,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMsg(null);
    setLoading(true);
    const res = await saveBotConfig({
      activo: botActivo,
      mensajeBienvenida: config.mensajeBienvenida,
      mensajeSoporte: config.respuestaSoporte,
      mensajeFueraHorario: config.respuestaFueraHorario,
      apiUrl: config.apiUrl,
      apiToken: config.apiToken,
      webhookSecret: config.webhookSecret,
    });
    setLoading(false);
    if (res.success) {
      setFeedbackMsg({ type: "success", text: "Configuración del Bot y de la API guardada con éxito." });
      loadData();
    } else {
      setFeedbackMsg({ type: "error", text: "Error al guardar la configuración: " + res.error });
    }
  };

  const handleSyncApi = async () => {
    setSyncing(true);
    setFeedbackMsg(null);
    const res = await syncExternalWhatsAppApi();
    setSyncing(false);

    if (res.success) {
      setFeedbackMsg({ type: "success", text: `Sincronización exitosa: Se importaron ${res.count} mensajes de la API externa.` });
      loadData();
    } else {
      setFeedbackMsg({ type: "error", text: res.error || "Error al conectar con la API externa." });
    }
  };

  const webhookUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/api/whatsapp/webhook`
    : "http://localhost:3000/api/whatsapp/webhook";

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading && config.mensajeBienvenida === "") {
    return (
      <div className="p-12 text-center text-text-muted">
        Cargando configuración del bot de WhatsApp e integraciones API...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-12">
      
      {/* HEADER */}
      <div className="flex justify-between items-end mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-wide flex items-center gap-3 mb-2">
            <MessageSquare className="text-emerald-500 w-8 h-8" />
            J. Integración WhatsApp Bot & API Externa
          </h1>
          <p className="text-text-muted">Conecte su bot de WhatsApp externo vía API REST / Webhook e ingrese los mensajes al sistema.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleSyncApi}
            disabled={syncing || !config.apiUrl}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-md font-bold transition-all flex items-center gap-2 shadow-lg cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Sincronizando..." : "Sincronizar API Ahora"}
          </button>
          
          <button 
            onClick={handleToggleBot}
            className={`px-5 py-2.5 rounded-md font-bold transition-all flex items-center gap-2 border shadow-lg cursor-pointer ${
              botActivo 
              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500 hover:text-white" 
              : "bg-red-500/10 text-red-500 border-red-500/30 hover:bg-red-500 hover:text-white"
            }`}
          >
            {botActivo ? <Power className="w-5 h-5" /> : <PowerOff className="w-5 h-5" />}
            {botActivo ? "Bot Activo" : "Bot Inactivo"}
          </button>
        </div>
      </div>

      {/* METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-bg-card border border-border-custom rounded-xl p-6 shadow-lg relative overflow-hidden">
          <div className="absolute -right-4 -top-4 opacity-5 text-text-primary"><MessageCircle className="w-32 h-32" /></div>
          <div className="flex items-center gap-4 mb-2">
            <div className="bg-blue-500/10 p-3 rounded-lg"><MessageCircle className="w-6 h-6 text-blue-500" /></div>
            <p className="text-text-muted font-semibold uppercase tracking-wider text-xs">Mensajes Importados</p>
          </div>
          <p className="text-3xl font-bold text-text-primary pl-16">{mensajes.length.toLocaleString("es-AR")}</p>
        </div>
        
        <div className="bg-bg-card border border-border-custom rounded-xl p-6 shadow-lg relative overflow-hidden">
          <div className="absolute -right-4 -top-4 opacity-5 text-text-primary"><Users className="w-32 h-32" /></div>
          <div className="flex items-center gap-4 mb-2">
            <div className="bg-purple-500/10 p-3 rounded-lg"><Users className="w-6 h-6 text-purple-500" /></div>
            <p className="text-text-muted font-semibold uppercase tracking-wider text-xs">Contactos Unicos</p>
          </div>
          <p className="text-3xl font-bold text-text-primary pl-16">
            {new Set(mensajes.map(m => m.remitente)).size.toLocaleString("es-AR")}
          </p>
        </div>

        <div className="bg-bg-card border border-border-custom rounded-xl p-6 shadow-lg relative overflow-hidden">
          <div className="absolute -right-4 -top-4 opacity-5 text-text-primary"><Smartphone className="w-32 h-32" /></div>
          <div className="flex items-center gap-4 mb-2">
            <div className="bg-emerald-500/10 p-3 rounded-lg"><Smartphone className="w-6 h-6 text-emerald-500" /></div>
            <p className="text-text-muted font-semibold uppercase tracking-wider text-xs">Estado API Externa</p>
          </div>
          <p className="text-xl font-bold text-emerald-500 pl-16 flex items-center gap-2 mt-2">
            <span className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></span>
            {config.apiUrl ? "Conexión API Configurada" : "Esperando URL de API"}
          </p>
        </div>
      </div>

      {/* FEEDBACK BANNERS */}
      {feedbackMsg && (
        <div className={`mb-6 p-4 rounded-xl border flex items-center gap-3 font-semibold text-sm animate-fade-in ${
          feedbackMsg.type === "success" 
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
            : "bg-red-500/10 border-red-500/30 text-red-400"
        }`}>
          <span>{feedbackMsg.type === "success" ? "✅" : "⚠️"}</span>
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* TABS */}
      <div className="flex border-b border-border-custom mb-6">
        <button 
          onClick={() => setActiveTab("api")}
          className={`px-6 py-3 font-semibold text-sm tracking-wider uppercase transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === "api" ? "text-emerald-400 border-b-2 border-emerald-400" : "text-text-muted hover:text-text-primary"
          }`}
        >
          <Globe className="w-4 h-4" />
          Conexión API Externa & Webhook
        </button>
        <button 
          onClick={() => setActiveTab("mensajes")}
          className={`px-6 py-3 font-semibold text-sm tracking-wider uppercase transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === "mensajes" ? "text-emerald-400 border-b-2 border-emerald-400" : "text-text-muted hover:text-text-primary"
          }`}
        >
          <Inbox className="w-4 h-4" />
          Mensajes e Historial Importado ({mensajes.length})
        </button>
        <button 
          onClick={() => setActiveTab("flujos")}
          className={`px-6 py-3 font-semibold text-sm tracking-wider uppercase transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === "flujos" ? "text-emerald-400 border-b-2 border-emerald-400" : "text-text-muted hover:text-text-primary"
          }`}
        >
          <Settings className="w-4 h-4" />
          Mensajes de Auto-Respuesta
        </button>
      </div>

      {/* TAB 1: CONEXIÓN API EXTERNA & WEBHOOK */}
      {activeTab === "api" && (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="bg-bg-card rounded-xl border border-border-custom shadow-xl p-6 space-y-6">
            <div className="flex items-center gap-3 border-b border-border-custom pb-4">
              <Globe className="w-6 h-6 text-emerald-400" />
              <div>
                <h2 className="text-lg font-bold text-text-primary">1. Credenciales de la API Externa del Bot</h2>
                <p className="text-xs text-text-muted">Configure el endpoint desde donde SYSTEM FACTORY importará los chats y mensajes de WhatsApp.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-text-primary uppercase tracking-wider mb-2">URL del Endpoint API Externa</label>
                <input 
                  type="url"
                  placeholder="https://api.wpbot-externo.com/v1/messages"
                  value={config.apiUrl}
                  onChange={e => setConfig({ ...config, apiUrl: e.target.value })}
                  className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-3 text-text-primary focus:border-emerald-500 outline-none text-sm font-mono"
                />
                <p className="text-[11px] text-text-muted mt-1">URL GET que retorna el JSON de mensajes procesados por el bot externo.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-primary uppercase tracking-wider mb-2">Token de Autenticación API (Bearer Token)</label>
                <div className="relative">
                  <Key className="w-4 h-4 absolute left-3 top-3.5 text-gray-500" />
                  <input 
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiIsIn..."
                    value={config.apiToken}
                    onChange={e => setConfig({ ...config, apiToken: e.target.value })}
                    className="w-full bg-bg-subtle border border-border-custom rounded-md pl-10 pr-4 py-3 text-text-primary focus:border-emerald-500 outline-none text-sm font-mono"
                  />
                </div>
                <p className="text-[11px] text-text-muted mt-1">Se enviará como Header `Authorization: Bearer [TOKEN]` al consultar la API.</p>
              </div>
            </div>
          </div>

          {/* WEBHOOK PANEL */}
          <div className="bg-bg-card rounded-xl border border-border-custom shadow-xl p-6 space-y-6">
            <div className="flex items-center gap-3 border-b border-border-custom pb-4">
              <Webhook className="w-6 h-6 text-blue-400" />
              <div>
                <h2 className="text-lg font-bold text-text-primary">2. Webhook HTTP Receptor (Ingreso Automático)</h2>
                <p className="text-xs text-text-muted">Proporcione este Webhook a su bot externo para enviar mensajes automáticamente en tiempo real.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-primary uppercase tracking-wider mb-2">URL del Webhook de este Sistema</label>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    readOnly
                    value={webhookUrl}
                    className="flex-1 bg-bg-subtle border border-border-custom rounded-md px-4 py-3 text-emerald-400 font-mono text-sm outline-none font-bold"
                  />
                  <button 
                    type="button"
                    onClick={copyWebhookUrl}
                    className="px-5 py-3 bg-[#0078D7] hover:bg-[#005a9e] text-white rounded-md font-bold flex items-center gap-2 transition-all cursor-pointer"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copiado!" : "Copiar URL"}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-primary uppercase tracking-wider mb-2">Clave Secreta del Webhook (Opcional)</label>
                <input 
                  type="text"
                  placeholder="mi_secreto_webhook_123"
                  value={config.webhookSecret}
                  onChange={e => setConfig({ ...config, webhookSecret: e.target.value })}
                  className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-3 text-text-primary focus:border-emerald-500 outline-none text-sm font-mono"
                />
                <p className="text-[11px] text-text-muted mt-1">Si la define, el bot externo deberá enviar la clave en el Header `Authorization: Bearer [SECRETO]`.</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button 
              type="submit" 
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-md font-bold flex items-center gap-2 transition-colors shadow-lg cursor-pointer text-sm"
            >
              <Save className="w-5 h-5" />
              {loading ? "Guardando..." : "Guardar Configuración API"}
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: MENSAJES E HISTORIAL IMPORTADO */}
      {activeTab === "mensajes" && (
        <div className="bg-bg-card rounded-xl border border-border-custom shadow-xl overflow-hidden">
          <div className="p-6 border-b border-border-custom bg-bg-subtle flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-emerald-400" />
              <div>
                <h2 className="text-lg font-bold text-text-primary">Historial de Mensajes Recibidos de WhatsApp</h2>
                <p className="text-xs text-text-muted">Consulte los chats e interacciones importadas desde la API o Webhook externo.</p>
              </div>
            </div>

            <button 
              onClick={handleSyncApi}
              disabled={syncing || !config.apiUrl}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
              Sincronizar Mensajes
            </button>
          </div>

          <div className="divide-y divide-border-custom">
            {mensajes.length === 0 ? (
              <div className="p-12 text-center text-text-muted">
                No hay mensajes importados aún. Haga clic en **Sincronizar API Ahora** o configure la URL del bot externo.
              </div>
            ) : (
              mensajes.map((msg) => (
                <div key={msg.id} className="p-5 hover:bg-bg-subtle/50 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <span className="font-bold text-text-primary text-base">{msg.nombre || msg.remitente}</span>
                      <span className="font-mono text-xs text-text-muted bg-bg-subtle px-2 py-0.5 rounded border border-border-custom">
                        📱 {msg.remitente}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border ${
                        msg.direccion === "ENTRANTE" 
                          ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      }`}>
                        {msg.direccion}
                      </span>
                    </div>
                    <p className="text-text-secondary text-sm bg-bg-subtle p-3 rounded-lg border border-border-custom mt-2 font-sans whitespace-pre-wrap">
                      {msg.contenido}
                    </p>
                  </div>

                  <div className="shrink-0 text-right text-xs text-text-muted">
                    {new Date(msg.createdAt).toLocaleString("es-AR")}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: FLUJOS Y AUTO-RESPUESTAS */}
      {activeTab === "flujos" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-bg-card rounded-xl border border-border-custom shadow-xl overflow-hidden">
            <div className="p-6 border-b border-border-custom bg-bg-subtle flex items-center gap-3">
              <Settings className="w-5 h-5 text-text-muted" />
              <h2 className="text-lg font-bold text-text-primary">Reglas y Flujos de Auto-Respuesta</h2>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-6">
              <div className="bg-bg-subtle border border-border-custom rounded-lg p-5">
                <label className="block text-xs font-bold text-emerald-500 uppercase tracking-wider mb-3">Mensaje de Bienvenida (Menú Principal)</label>
                <textarea 
                  value={config.mensajeBienvenida}
                  onChange={e => setConfig({...config, mensajeBienvenida: e.target.value})}
                  className="w-full bg-bg-card border border-border-custom rounded-md px-4 py-3 text-text-secondary focus:border-emerald-500 focus:text-text-primary outline-none h-32 leading-relaxed font-sans"
                />
              </div>

              <div className="bg-bg-subtle border border-border-custom rounded-lg p-5">
                <label className="block text-xs font-bold text-blue-500 uppercase tracking-wider mb-3">Respuesta de Derivación a Soporte</label>
                <textarea 
                  value={config.respuestaSoporte}
                  onChange={e => setConfig({...config, respuestaSoporte: e.target.value})}
                  className="w-full bg-bg-card border border-border-custom rounded-md px-4 py-3 text-text-secondary focus:border-blue-500 focus:text-text-primary outline-none h-24 leading-relaxed font-sans"
                />
              </div>

              <div className="bg-bg-subtle border border-border-custom rounded-lg p-5">
                <label className="block text-xs font-bold text-orange-500 uppercase tracking-wider mb-3">Respuesta Fuera de Horario</label>
                <textarea 
                  value={config.respuestaFueraHorario}
                  onChange={e => setConfig({...config, respuestaFueraHorario: e.target.value})}
                  className="w-full bg-bg-card border border-border-custom rounded-md px-4 py-3 text-text-secondary focus:border-orange-500 focus:text-text-primary outline-none h-24 leading-relaxed font-sans"
                />
              </div>

              <div className="flex justify-end pt-4">
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-md font-bold flex items-center gap-2 transition-colors shadow-lg cursor-pointer" disabled={loading}>
                  <Save className="w-5 h-5" />
                  {loading ? "Guardando..." : "Guardar Flujos"}
                </button>
              </div>
            </form>
          </div>

          {/* MOCKUP CELULAR */}
          <div className="bg-bg-card rounded-xl border border-border-custom shadow-xl overflow-hidden flex flex-col items-center p-6 relative">
            <h2 className="text-sm font-bold text-text-muted uppercase tracking-wider w-full mb-6 border-b border-border-custom pb-3 text-center">Previsualización del Chat</h2>
            
            <div className="w-[280px] h-[550px] bg-[#0a0a0a] rounded-[2.5rem] border-[8px] border-[#2d2d2d] relative shadow-2xl overflow-hidden flex flex-col">
              <div className="w-32 h-6 bg-[#2d2d2d] absolute top-0 left-1/2 -translate-x-1/2 rounded-b-xl z-10"></div>
              
              <div className="bg-[#075E54] px-4 py-3 pt-8 flex items-center gap-3 shadow-md shrink-0">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white"><MessageSquare className="w-4 h-4" /></div>
                <div>
                  <p className="text-white font-bold text-sm">Aitue Cominca S.A.</p>
                  <p className="text-white/70 text-[10px]">Cuenta de empresa</p>
                </div>
              </div>

              <div className="flex-1 bg-[#ece5dd] p-4 flex flex-col gap-3 overflow-y-auto" style={{ backgroundImage: "url('https://i.pinimg.com/736x/8c/98/99/8c98994518b575bfd8c949e91d20548b.jpg')", backgroundSize: 'cover' }}>
                <div className="flex justify-end mb-2">
                  <div className="bg-[#dcf8c6] px-3 py-1.5 rounded-lg rounded-tr-none shadow-sm max-w-[85%]">
                    <p className="text-gray-800 text-[13px]">Hola, necesito ayuda con mi equipo.</p>
                    <p className="text-[9px] text-gray-500 text-right mt-1">10:42 ✓✓</p>
                  </div>
                </div>

                {botActivo && (
                  <div className="flex justify-start mb-2">
                    <div className="bg-white px-3 py-1.5 rounded-lg rounded-tl-none shadow-sm max-w-[90%] border-l-4 border-emerald-500">
                      <p className="text-gray-800 text-[13px] whitespace-pre-wrap">{config.mensajeBienvenida}</p>
                      <p className="text-[9px] text-gray-500 text-right mt-1">10:42</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
