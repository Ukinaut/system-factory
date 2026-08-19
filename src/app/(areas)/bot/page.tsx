"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Power, PowerOff, Save, Smartphone, Settings, Users, MessageCircle } from "lucide-react";
import { getBotConfig, saveBotConfig } from "@/actions/bot";

export default function BotDashboard() {
  const [botActivo, setBotActivo] = useState(true);
  const [loading, setLoading] = useState(true);
  
  const [config, setConfig] = useState({
    mensajeBienvenida: "",
    respuestaSoporte: "",
    respuestaFueraHorario: "",
  });

  const loadData = async () => {
    setLoading(true);
    const res = await getBotConfig();
    if (res.success && res.config) {
      setBotActivo(res.config.activo);
      setConfig({
        mensajeBienvenida: res.config.mensajeBienvenida,
        respuestaSoporte: res.config.mensajeSoporte,
        respuestaFueraHorario: res.config.mensajeFueraHorario,
      });
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
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await saveBotConfig({
      activo: botActivo,
      mensajeBienvenida: config.mensajeBienvenida,
      mensajeSoporte: config.respuestaSoporte,
      mensajeFueraHorario: config.respuestaFueraHorario,
    });
    setLoading(false);
    if (res.success) {
      alert("Configuración del Bot guardada con éxito.");
      loadData();
    } else {
      alert("Error al guardar la configuración: " + res.error);
    }
  };

  if (loading && config.mensajeBienvenida === "") {
    return (
      <div className="p-8 text-center text-text-muted">
        Cargando configuración del bot de soporte...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-12">
      
      {/* HEADER */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-wide flex items-center gap-3 mb-2">
            <MessageSquare className="text-emerald-500 w-8 h-8" />
            J. Configuración WhatsApp Bot
          </h1>
          <p className="text-text-muted">Administre los flujos de auto-respuesta y el estado del asistente virtual.</p>
        </div>
        <button 
          onClick={handleToggleBot}
          className={`px-5 py-2.5 rounded-md font-bold transition-all flex items-center gap-2 border shadow-lg cursor-pointer ${
            botActivo 
            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500 hover:text-white" 
            : "bg-red-500/10 text-red-500 border-red-500/30 hover:bg-red-500 hover:text-white"
          }`}
        >
          {botActivo ? <Power className="w-5 h-5" /> : <PowerOff className="w-5 h-5" />}
          {botActivo ? "Bot Encendido" : "Bot Apagado"}
        </button>
      </div>

      {/* METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-bg-card border border-border-custom rounded-xl p-6 shadow-lg relative overflow-hidden">
          <div className="absolute -right-4 -top-4 opacity-5 text-text-primary"><MessageCircle className="w-32 h-32" /></div>
          <div className="flex items-center gap-4 mb-2">
            <div className="bg-blue-500/10 p-3 rounded-lg"><MessageCircle className="w-6 h-6 text-blue-500" /></div>
            <p className="text-text-muted font-semibold uppercase tracking-wider text-xs">Mensajes Procesados (Hoy)</p>
          </div>
          <p className="text-3xl font-bold text-text-primary pl-16">1,245</p>
        </div>
        
        <div className="bg-bg-card border border-border-custom rounded-xl p-6 shadow-lg relative overflow-hidden">
          <div className="absolute -right-4 -top-4 opacity-5 text-text-primary"><Users className="w-32 h-32" /></div>
          <div className="flex items-center gap-4 mb-2">
            <div className="bg-purple-500/10 p-3 rounded-lg"><Users className="w-6 h-6 text-purple-500" /></div>
            <p className="text-text-muted font-semibold uppercase tracking-wider text-xs">Derivados a Operador</p>
          </div>
          <p className="text-3xl font-bold text-text-primary pl-16">132</p>
        </div>

        <div className="bg-bg-card border border-border-custom rounded-xl p-6 shadow-lg relative overflow-hidden">
          <div className="absolute -right-4 -top-4 opacity-5 text-text-primary"><Smartphone className="w-32 h-32" /></div>
          <div className="flex items-center gap-4 mb-2">
            <div className="bg-emerald-500/10 p-3 rounded-lg"><Smartphone className="w-6 h-6 text-emerald-500" /></div>
            <p className="text-text-muted font-semibold uppercase tracking-wider text-xs">Estado de Conexión</p>
          </div>
          <p className="text-xl font-bold text-emerald-500 pl-16 flex items-center gap-2 mt-2">
            <span className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></span>
            WhatsApp API Online
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* PANEL DE CONFIGURACIÓN */}
        <div className="lg:col-span-2 bg-bg-card rounded-xl border border-border-custom shadow-xl overflow-hidden">
          <div className="p-6 border-b border-border-custom bg-bg-subtle flex items-center gap-3">
            <Settings className="w-5 h-5 text-text-muted" />
            <h2 className="text-lg font-bold text-text-primary">Reglas y Flujos de Respuestas</h2>
          </div>
          
          <form onSubmit={handleSave} className="p-6 space-y-6">
            <div className="bg-bg-subtle border border-border-custom rounded-lg p-5">
              <label className="block text-xs font-bold text-emerald-500 uppercase tracking-wider mb-3">Mensaje de Bienvenida (Menú Principal)</label>
              <textarea 
                value={config.mensajeBienvenida}
                onChange={e => setConfig({...config, mensajeBienvenida: e.target.value})}
                className="w-full bg-bg-card border border-border-custom rounded-md px-4 py-3 text-text-secondary focus:border-emerald-500 focus:text-text-primary outline-none h-32 leading-relaxed font-sans"
              />
              <p className="text-[10px] text-text-muted mt-2 uppercase tracking-wide">Este mensaje se envía automáticamente al recibir la primera interacción de un número en 24hs.</p>
            </div>

            <div className="bg-bg-subtle border border-border-custom rounded-lg p-5">
              <label className="block text-xs font-bold text-blue-500 uppercase tracking-wider mb-3">Respuesta de Derivación a Soporte (Opción 1)</label>
              <textarea 
                value={config.respuestaSoporte}
                onChange={e => setConfig({...config, respuestaSoporte: e.target.value})}
                className="w-full bg-bg-card border border-border-custom rounded-md px-4 py-3 text-text-secondary focus:border-blue-500 focus:text-text-primary outline-none h-24 leading-relaxed font-sans"
              />
            </div>

            <div className="bg-bg-subtle border border-border-custom rounded-lg p-5">
              <label className="block text-xs font-bold text-orange-500 uppercase tracking-wider mb-3">Respuesta Fuera de Horario (Ausencia)</label>
              <textarea 
                value={config.respuestaFueraHorario}
                onChange={e => setConfig({...config, respuestaFueraHorario: e.target.value})}
                className="w-full bg-bg-card border border-border-custom rounded-md px-4 py-3 text-text-secondary focus:border-orange-500 focus:text-text-primary outline-none h-24 leading-relaxed font-sans"
              />
            </div>

            <div className="flex justify-end pt-4">
              <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-md font-bold flex items-center gap-2 transition-colors shadow-lg cursor-pointer" disabled={loading}>
                <Save className="w-5 h-5" />
                {loading ? "Guardando..." : "Guardar Configuración"}
              </button>
            </div>
          </form>
        </div>

        {/* PREVISUALIZADOR (MOCKUP CELULAR) */}
        <div className="bg-bg-card rounded-xl border border-border-custom shadow-xl overflow-hidden flex flex-col items-center p-6 relative">
          <h2 className="text-sm font-bold text-text-muted uppercase tracking-wider w-full mb-6 border-b border-border-custom pb-3 text-center">Previsualización</h2>
          
          <div className="w-[280px] h-[550px] bg-[#0a0a0a] rounded-[2.5rem] border-[8px] border-[#2d2d2d] relative shadow-2xl overflow-hidden flex flex-col">
            {/* Notch falso */}
            <div className="w-32 h-6 bg-[#2d2d2d] absolute top-0 left-1/2 -translate-x-1/2 rounded-b-xl z-10"></div>
            
            {/* Header chat */}
            <div className="bg-[#075E54] px-4 py-3 pt-8 flex items-center gap-3 shadow-md shrink-0">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white"><MessageSquare className="w-4 h-4" /></div>
              <div>
                <p className="text-white font-bold text-sm">Aitue Cominca S.A.</p>
                <p className="text-white/70 text-[10px]">Cuenta de empresa</p>
              </div>
            </div>

            {/* Area de mensajes */}
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

              {botActivo && (
                <div className="flex justify-end mb-2">
                  <div className="bg-[#dcf8c6] px-3 py-1.5 rounded-lg rounded-tr-none shadow-sm max-w-[85%]">
                    <p className="text-gray-800 text-[13px]">1</p>
                    <p className="text-[9px] text-gray-500 text-right mt-1">10:43 ✓✓</p>
                  </div>
                </div>
              )}

              {botActivo && (
                <div className="flex justify-start">
                  <div className="bg-white px-3 py-1.5 rounded-lg rounded-tl-none shadow-sm max-w-[90%] border-l-4 border-blue-500">
                    <p className="text-gray-800 text-[13px] whitespace-pre-wrap">{config.respuestaSoporte}</p>
                    <p className="text-[9px] text-gray-500 text-right mt-1">10:43</p>
                  </div>
                </div>
              )}
            </div>

            {/* Input simulado */}
            <div className="bg-[#f0f0f0] px-3 py-2 shrink-0 flex items-center gap-2">
              <div className="flex-1 bg-white rounded-full h-9 border border-gray-300"></div>
              <div className="w-9 h-9 bg-[#128C7E] rounded-full flex items-center justify-center">
                <div className="w-4 h-4 text-white"></div>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
