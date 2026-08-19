"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
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
  Inbox,
  Brain,
  Calendar,
  Layers,
  Sparkles,
  Bot,
  Sliders,
  Plus,
  Trash2,
  ChevronRight,
  UserCheck,
  Headphones,
  Zap,
  Activity
} from "lucide-react";
import { 
  getBotConfig, 
  saveBotConfig, 
  syncExternalWhatsAppApi, 
  getWhatsAppMessages,
  getKnowledgeItems,
  saveKnowledgeItem,
  deleteKnowledgeItem
} from "@/actions/bot";

export default function BotAdminHub() {
  const [activeTab, setActiveTab] = useState<"hub" | "live_chats" | "openai" | "rag" | "whatsapp_api">("hub");
  const [botActivo, setBotActivo] = useState(true);
  const [operadoresEstado, setOperadoresEstado] = useState("DISPONIBLES");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Config State
  const [config, setConfig] = useState({
    mensajeBienvenida: "",
    respuestaSoporte: "",
    respuestaFueraHorario: "",
    apiUrl: "",
    apiToken: "",
    webhookSecret: "",
    aiModel: "meta/llama-3.1-8b-instruct",
    openaiApiKey: "",
    temperature: 0.7,
    systemPrompt: "",
  });

  // RAG Knowledge Base
  const [knowledgeItems, setKnowledgeItems] = useState<any[]>([]);
  const [isKnowledgeModalOpen, setIsKnowledgeModalOpen] = useState(false);
  const [kTitulo, setKTitulo] = useState("");
  const [kCategoria, setKCategoria] = useState("REGLAS");
  const [kContenido, setKContenido] = useState("");

  // WhatsApp Messages
  const [mensajes, setMensajes] = useState<any[]>([]);
  const [selectedChatRemitente, setSelectedChatRemitente] = useState<string | null>(null);
  const [manualReplyText, setManualReplyText] = useState("");

  const [isPending, startTransition] = useTransition();

  const loadData = async () => {
    setLoading(true);
    const res = await getBotConfig();
    if (res.success && res.config) {
      setBotActivo(res.config.activo);
      setOperadoresEstado(res.config.operadoresEstado || "DISPONIBLES");
      setConfig({
        mensajeBienvenida: res.config.mensajeBienvenida || "",
        respuestaSoporte: res.config.mensajeSoporte || "",
        respuestaFueraHorario: res.config.mensajeFueraHorario || "",
        apiUrl: res.config.apiUrl || "",
        apiToken: res.config.apiToken || "",
        webhookSecret: res.config.webhookSecret || "",
        aiModel: res.config.aiModel || "meta/llama-3.1-8b-instruct",
        openaiApiKey: res.config.openaiApiKey || "",
        temperature: res.config.temperature ?? 0.7,
        systemPrompt: res.config.systemPrompt || "Eres AITUE AI, el asistente virtual inteligente de Aitue Cominca S.A.",
      });
    }

    const msgRes = await getWhatsAppMessages();
    if (msgRes.success) {
      setMensajes(msgRes.messages || []);
    }

    const ragRes = await getKnowledgeItems();
    if (ragRes.success) {
      setKnowledgeItems(ragRes.items || []);
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
      ...config,
      mensajeSoporte: config.respuestaSoporte,
      mensajeFueraHorario: config.respuestaFueraHorario,
      activo: nuevoEstado,
      operadoresEstado,
    });
  };

  const handleToggleOperadores = async () => {
    const nuevoEstado = operadoresEstado === "DISPONIBLES" ? "OCUPADOS" : "DISPONIBLES";
    setOperadoresEstado(nuevoEstado);
    await saveBotConfig({
      ...config,
      mensajeSoporte: config.respuestaSoporte,
      mensajeFueraHorario: config.respuestaFueraHorario,
      activo: botActivo,
      operadoresEstado: nuevoEstado,
    });
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMsg(null);
    setLoading(true);
    const res = await saveBotConfig({
      ...config,
      mensajeSoporte: config.respuestaSoporte,
      mensajeFueraHorario: config.respuestaFueraHorario,
      activo: botActivo,
      operadoresEstado,
    });
    setLoading(false);
    if (res.success) {
      setFeedbackMsg({ type: "success", text: "Configuración del AITUE AI Hub guardada correctamente." });
      loadData();
    } else {
      setFeedbackMsg({ type: "error", text: res.error || "Error al guardar la configuración." });
    }
  };

  const handleCreateKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kTitulo || !kContenido) return;
    startTransition(async () => {
      const res = await saveKnowledgeItem({
        titulo: kTitulo,
        categoria: kCategoria,
        contenido: kContenido
      });
      if (res.success) {
        setKTitulo("");
        setKContenido("");
        setIsKnowledgeModalOpen(false);
        loadData();
      }
    });
  };

  const handleDeleteKnowledge = (id: string) => {
    startTransition(async () => {
      await deleteKnowledgeItem(id);
      loadData();
    });
  };

  const handleSyncApi = async () => {
    setSyncing(true);
    setFeedbackMsg(null);
    const res = await syncExternalWhatsAppApi();
    setSyncing(false);

    if (res.success) {
      setFeedbackMsg({ type: "success", text: `Sincronización API exitosa: Se importaron ${res.count} mensajes de WhatsApp.` });
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

  // Group messages by contact
  const chatGroups = mensajes.reduce((acc: any, msg: any) => {
    if (!acc[msg.remitente]) {
      acc[msg.remitente] = {
        remitente: msg.remitente,
        nombre: msg.nombre || msg.remitente,
        lastMessage: msg.contenido,
        lastDate: msg.createdAt,
        messages: []
      };
    }
    acc[msg.remitente].messages.push(msg);
    return acc;
  }, {});

  const selectedGroup = selectedChatRemitente ? chatGroups[selectedChatRemitente] : null;

  if (loading && config.systemPrompt === "") {
    return (
      <div className="p-12 text-center text-text-muted font-mono">
        Cargando AITUE Admin Hub & WhatsApp AI Engine...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-12 font-sans">
      
      {/* HEADER SUPERIOR CYBERPUNK */}
      <div className="bg-[#0b0f19] border border-cyan-950/60 rounded-2xl p-6 shadow-2xl mb-8 relative overflow-hidden backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
          
          {/* Logo & Info */}
          <div className="flex items-center gap-4">
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.15)]">
              <Sparkles className="w-8 h-8 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-wider text-white">
                  AITUE Admin Hub
                </h1>
                <span className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 text-[10px] font-mono px-2 py-0.5 rounded-full uppercase tracking-widest font-bold">
                  v2.5 AI Engine
                </span>
              </div>
              <p className="text-xs text-gray-400 font-mono tracking-wide mt-1">
                Centro de Control Inteligente • WhatsApp Bot & RAG Memory System
              </p>
            </div>
          </div>

          {/* Badges de Estado */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Operadores status */}
            <button 
              onClick={handleToggleOperadores}
              className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                operadoresEstado === "DISPONIBLES"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${operadoresEstado === "DISPONIBLES" ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
              OPERADORES: {operadoresEstado}
            </button>

            {/* OpenAI status */}
            <div className="px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2">
              <Brain className="w-3.5 h-3.5" />
              OpenAI: {config.aiModel}
            </div>

            {/* WP Connection Status */}
            <div className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 ${
              botActivo 
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}>
              <Smartphone className="w-3.5 h-3.5" />
              Bot WP: {botActivo ? "Vinculado" : "Desconectado"}
            </div>

            {/* Bot toggle */}
            <button
              onClick={handleToggleBot}
              className="px-3.5 py-1.5 bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-lg"
            >
              <Power className="w-3.5 h-3.5" />
              {botActivo ? "Reiniciar Bot" : "Encender Bot"}
            </button>
          </div>

        </div>

        {/* NAVEGACIÓN PRINCIPAL DEL HUB */}
        <div className="flex border-t border-gray-800/80 mt-6 pt-4 gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab("hub")}
            className={`px-5 py-2 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "hub"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Activity className="w-4 h-4" />
            Centro de Control
          </button>

          <button
            onClick={() => setActiveTab("live_chats")}
            className={`px-5 py-2 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "live_chats"
                ? "bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Chats en Vivo ({Object.keys(chatGroups).length})
          </button>

          <button
            onClick={() => setActiveTab("openai")}
            className={`px-5 py-2 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "openai"
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.15)]"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Brain className="w-4 h-4" />
            OpenAI API & Modelos
          </button>

          <button
            onClick={() => setActiveTab("rag")}
            className={`px-5 py-2 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "rag"
                ? "bg-pink-500/20 text-pink-300 border border-pink-500/40 shadow-[0_0_15px_rgba(236,72,153,0.15)]"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Layers className="w-4 h-4" />
            Memoria & RAG ({knowledgeItems.length})
          </button>

          <button
            onClick={() => setActiveTab("whatsapp_api")}
            className={`px-5 py-2 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "whatsapp_api"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Smartphone className="w-4 h-4" />
            Bot WhatsApp & Webhook
          </button>
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

      {/* VISTA 1: CENTRO DE CONTROL (HUB CARDS GRID REPLICADO) */}
      {activeTab === "hub" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Card 1: Chats en Vivo (Handoff) */}
          <div className="bg-[#0b0f19] border border-cyan-900/40 hover:border-cyan-500/60 rounded-2xl p-6 shadow-xl flex flex-col justify-between transition-all duration-300 group">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                  <MessageSquare className="w-6 h-6 text-blue-400" />
                </div>
                <span className="text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 px-2.5 py-1 rounded-full uppercase tracking-wider border border-blue-500/30">
                  Chats en Tiempo Real
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                Chats en Vivo (Handoff)
              </h3>
              <p className="text-gray-400 text-xs leading-relaxed mb-6">
                Chatea en vivo con clientes de WhatsApp y la Web. Pausa la auto-respuesta del bot y toma el control manual para asistencia personalizada.
              </p>
            </div>
            
            <div className="flex items-center justify-between border-t border-gray-800/60 pt-4 text-xs font-mono font-bold uppercase tracking-wider text-blue-400">
              <span>VINCULADO // LIVE</span>
              <button 
                onClick={() => setActiveTab("live_chats")}
                className="flex items-center gap-1 hover:translate-x-1 transition-transform cursor-pointer"
              >
                Atender Chats →
              </button>
            </div>
          </div>

          {/* Card 2: Base de Clientes (CRM) */}
          <div className="bg-[#0b0f19] border border-cyan-900/40 hover:border-cyan-500/60 rounded-2xl p-6 shadow-xl flex flex-col justify-between transition-all duration-300 group">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
                  <Users className="w-6 h-6 text-purple-400" />
                </div>
                <span className="text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 px-2.5 py-1 rounded-full uppercase tracking-wider border border-purple-500/30">
                  Memoria del Cliente
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">
                Base de Clientes (CRM)
              </h3>
              <p className="text-gray-400 text-xs leading-relaxed mb-6">
                Registra clientes, edita datos de empresas, productos, equipos instalados e intereses para hiper-personalización de la IA.
              </p>
            </div>
            
            <div className="flex items-center justify-between border-t border-gray-800/60 pt-4 text-xs font-mono font-bold uppercase tracking-wider text-purple-400">
              <span>CRM ACTIVO</span>
              <Link href="/clientes" className="flex items-center gap-1 hover:translate-x-1 transition-transform">
                Ver Directorio →
              </Link>
            </div>
          </div>

          {/* Card 3: Agenda de Citas & Reglas */}
          <div className="bg-[#0b0f19] border border-cyan-900/40 hover:border-cyan-500/60 rounded-2xl p-6 shadow-xl flex flex-col justify-between transition-all duration-300 group">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                  <Calendar className="w-6 h-6 text-indigo-400" />
                </div>
                <span className="text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 px-2.5 py-1 rounded-full uppercase tracking-wider border border-indigo-500/30">
                  Agenda Inteligente
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors">
                Agenda de Citas & Reglas
              </h3>
              <p className="text-gray-400 text-xs leading-relaxed mb-6">
                Revisa turnos agendados automáticamente por la IA. Configura horarios, duración de turnos, feriados y capacidad de atención.
              </p>
            </div>
            
            <div className="flex items-center justify-between border-t border-gray-800/60 pt-4 text-xs font-mono font-bold uppercase tracking-wider text-indigo-400">
              <span>CONFIG AGENDA</span>
              <Link href="/agenda" className="flex items-center gap-1 hover:translate-x-1 transition-transform">
                Ver Turnos →
              </Link>
            </div>
          </div>

          {/* Card 4: Configuración OpenAI API */}
          <div className="bg-[#0b0f19] border border-cyan-900/40 hover:border-cyan-500/60 rounded-2xl p-6 shadow-xl flex flex-col justify-between transition-all duration-300 group">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
                  <Brain className="w-6 h-6 text-cyan-400" />
                </div>
                <span className="text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 px-2.5 py-1 rounded-full uppercase tracking-wider border border-cyan-500/30">
                  OpenAI Configurado
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">
                Configuración OpenAI API
              </h3>
              <p className="text-gray-400 text-xs leading-relaxed mb-6">
                Claves de API, selección de modelos (Llama 3.1, GPT-4o), ajuste de creatividad (temperatura) y tokens máximos de respuesta.
              </p>
            </div>
            
            <div className="flex items-center justify-between border-t border-gray-800/60 pt-4 text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
              <span>API KEY // ACTIVA</span>
              <button 
                onClick={() => setActiveTab("openai")}
                className="flex items-center gap-1 hover:translate-x-1 transition-transform cursor-pointer"
              >
                Configurar API →
              </button>
            </div>
          </div>

          {/* Card 5: Memoria RAG & Pautas */}
          <div className="bg-[#0b0f19] border border-cyan-900/40 hover:border-cyan-500/60 rounded-2xl p-6 shadow-xl flex flex-col justify-between transition-all duration-300 group">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-pink-500/10 rounded-xl border border-pink-500/20">
                  <Layers className="w-6 h-6 text-pink-400" />
                </div>
                <span className="text-[10px] font-mono font-bold bg-pink-500/20 text-pink-300 px-2.5 py-1 rounded-full uppercase tracking-wider border border-pink-500/30">
                  RAG Activado
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2 group-hover:text-pink-400 transition-colors">
                Memoria RAG & Pautas
              </h3>
              <p className="text-gray-400 text-xs leading-relaxed mb-6">
                Sube y edita especificaciones de gabinetes, catálogo y reglas comerciales para entrenar a los asistentes virtuales.
              </p>
            </div>
            
            <div className="flex items-center justify-between border-t border-gray-800/60 pt-4 text-xs font-mono font-bold uppercase tracking-wider text-pink-400">
              <span>PAUTAS RAG</span>
              <button 
                onClick={() => setActiveTab("rag")}
                className="flex items-center gap-1 hover:translate-x-1 transition-transform cursor-pointer"
              >
                Entrenar IA →
              </button>
            </div>
          </div>

          {/* Card 6: Conexión WhatsApp QR */}
          <div className="bg-[#0b0f19] border border-cyan-900/40 hover:border-cyan-500/60 rounded-2xl p-6 shadow-xl flex flex-col justify-between transition-all duration-300 group">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                  <Smartphone className="w-6 h-6 text-emerald-400" />
                </div>
                <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full uppercase tracking-wider border border-emerald-500/30">
                  WhatsApp Engine
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">
                Conexión WhatsApp QR & API
              </h3>
              <p className="text-gray-400 text-xs leading-relaxed mb-6">
                Vincula el número celular real de AITUE escaneando el código QR o configurando la API externa con Webhook 24/7.
              </p>
            </div>
            
            <div className="flex items-center justify-between border-t border-gray-800/60 pt-4 text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
              <span>QR PERSISTENTE</span>
              <button 
                onClick={() => setActiveTab("whatsapp_api")}
                className="flex items-center gap-1 hover:translate-x-1 transition-transform cursor-pointer"
              >
                Escanear QR / API →
              </button>
            </div>
          </div>

        </div>
      )}

      {/* VISTA 2: CHATS EN VIVO (HANDOFF) */}
      {activeTab === "live_chats" && (
        <div className="bg-[#0b0f19] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-3 min-h-[600px]">
          {/* Chat list sidebar */}
          <div className="border-r border-gray-800 bg-[#080b12] p-4 flex flex-col">
            <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-gray-300 mb-4 pb-3 border-b border-gray-800 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-400" />
              Conversaciones Activas ({Object.keys(chatGroups).length})
            </h3>

            <div className="flex-1 overflow-y-auto space-y-2">
              {Object.keys(chatGroups).length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-8">No hay chats recientes importados de WhatsApp.</p>
              ) : (
                Object.values(chatGroups).map((group: any) => (
                  <button
                    key={group.remitente}
                    onClick={() => setSelectedChatRemitente(group.remitente)}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                      selectedChatRemitente === group.remitente
                        ? "bg-blue-500/20 border-blue-500/50 text-white"
                        : "bg-[#0d121f] border-gray-800/80 text-gray-300 hover:bg-[#131929]"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-sm truncate">{group.nombre}</span>
                      <span className="text-[10px] text-gray-500 font-mono">
                        {new Date(group.lastDate).toLocaleTimeString("es-AR", { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 truncate">{group.lastMessage}</p>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Active Chat Conversation Area */}
          <div className="md:col-span-2 flex flex-col bg-[#0b0f19]">
            {selectedGroup ? (
              <>
                {/* Header chat */}
                <div className="p-4 border-b border-gray-800 bg-[#0e1320] flex justify-between items-center">
                  <div>
                    <h3 className="text-base font-bold text-white">{selectedGroup.nombre}</h3>
                    <p className="text-xs text-gray-400 font-mono">📱 {selectedGroup.remitente}</p>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full uppercase">
                    Handoff: Control Manual
                  </span>
                </div>

                {/* Messages list */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#070a10]">
                  {selectedGroup.messages.map((m: any) => (
                    <div 
                      key={m.id}
                      className={`flex flex-col ${m.direccion === "ENTRANTE" ? "items-start" : "items-end"}`}
                    >
                      <div className={`max-w-[80%] p-3 rounded-xl text-xs font-sans whitespace-pre-wrap shadow-md ${
                        m.direccion === "ENTRANTE"
                          ? "bg-[#141b2d] border border-blue-900/40 text-gray-200"
                          : "bg-emerald-950/60 border border-emerald-500/30 text-emerald-200"
                      }`}>
                        {m.contenido}
                      </div>
                      <span className="text-[9px] text-gray-500 font-mono mt-1">
                        {new Date(m.createdAt).toLocaleString("es-AR")}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Reply box */}
                <div className="p-4 border-t border-gray-800 bg-[#0e1320] flex gap-2">
                  <input
                    type="text"
                    placeholder="Escriba una respuesta manual para enviar por WhatsApp..."
                    value={manualReplyText}
                    onChange={e => setManualReplyText(e.target.value)}
                    className="flex-1 bg-[#141b2d] border border-gray-700 rounded-lg px-4 py-2.5 text-xs text-white outline-none focus:border-blue-500"
                  />
                  <button 
                    onClick={() => {
                      if (!manualReplyText) return;
                      alert("Mensaje enviado por WhatsApp a " + selectedGroup.remitente);
                      setManualReplyText("");
                    }}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold font-mono uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Enviar
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-gray-500">
                <MessageSquare className="w-12 h-12 mb-3 text-gray-700" />
                <p className="text-sm font-mono">Seleccione una conversación del menú lateral para atender el chat en vivo.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VISTA 3: OPENAI API & MODELOS */}
      {activeTab === "openai" && (
        <form onSubmit={handleSaveConfig} className="bg-[#0b0f19] border border-gray-800 rounded-2xl p-6 shadow-2xl space-y-6">
          <div className="flex items-center gap-3 border-b border-gray-800 pb-4">
            <Brain className="w-6 h-6 text-cyan-400" />
            <div>
              <h2 className="text-lg font-bold text-white">Configuración del Motor de Inteligencia Artificial (OpenAI / Llama)</h2>
              <p className="text-xs text-gray-400">Seleccione los modelos de lenguaje y ajuste el System Prompt para guiar a la IA de AITUE.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-mono font-bold text-gray-300 uppercase tracking-wider mb-2">Modelo de Lenguaje IA</label>
              <select
                value={config.aiModel}
                onChange={e => setConfig({ ...config, aiModel: e.target.value })}
                className="w-full bg-[#141b2d] border border-gray-700 rounded-xl px-4 py-3 text-cyan-300 font-mono text-sm outline-none focus:border-cyan-500"
              >
                <option value="meta/llama-3.1-8b-instruct">Meta Llama 3.1 8B Instruct (Ultra Rápido)</option>
                <option value="meta/llama-3.1-70b-instruct">Meta Llama 3.1 70B Instruct (Alta Precisión)</option>
                <option value="gpt-4o">OpenAI GPT-4o (Complejo / Multimodal)</option>
                <option value="gpt-4o-mini">OpenAI GPT-4o Mini (Económico)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-gray-300 uppercase tracking-wider mb-2">Clave de API de OpenAI / Groq (API Key)</label>
              <input
                type="password"
                placeholder="sk-proj-..."
                value={config.openaiApiKey}
                onChange={e => setConfig({ ...config, openaiApiKey: e.target.value })}
                className="w-full bg-[#141b2d] border border-gray-700 rounded-xl px-4 py-3 text-white font-mono text-sm outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-bold text-gray-300 uppercase tracking-wider mb-2">Creatividad / Temperatura ({config.temperature})</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={config.temperature}
              onChange={e => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-gray-500 font-mono mt-1">
              <span>0.0 (Preciso / Comercial)</span>
              <span>0.7 (Equilibrado)</span>
              <span>1.0 (Creativo)</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-bold text-gray-300 uppercase tracking-wider mb-2">System Prompt Principal (Instrucciones Directas de la IA)</label>
            <textarea
              rows={6}
              value={config.systemPrompt}
              onChange={e => setConfig({ ...config, systemPrompt: e.target.value })}
              className="w-full bg-[#141b2d] border border-gray-700 rounded-xl px-4 py-3 text-gray-200 font-sans text-xs outline-none focus:border-cyan-500 leading-relaxed"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg cursor-pointer flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Guardar Configuración IA
            </button>
          </div>
        </form>
      )}

      {/* VISTA 4: MEMORIA & RAG */}
      {activeTab === "rag" && (
        <div className="bg-[#0b0f19] border border-gray-800 rounded-2xl p-6 shadow-2xl space-y-6">
          <div className="flex justify-between items-center border-b border-gray-800 pb-4 flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Layers className="w-6 h-6 text-pink-400" />
              <div>
                <h2 className="text-lg font-bold text-white">Memoria RAG & Entrenador de Pautas Comerciales</h2>
                <p className="text-xs text-gray-400">Agregue especificaciones técnicas, precios y reglas de negocio para alimentar a la IA.</p>
              </div>
            </div>

            <button
              onClick={() => setIsKnowledgeModalOpen(true)}
              className="px-5 py-2.5 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-lg"
            >
              <Plus className="w-4 h-4" />
              Agregar Pauta RAG
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {knowledgeItems.length === 0 ? (
              <div className="md:col-span-2 p-12 text-center text-gray-500 font-mono">
                No hay pautas de entrenamiento RAG creadas. Haga clic en **Agregar Pauta RAG** para capacitar a la IA.
              </div>
            ) : (
              knowledgeItems.map((item) => (
                <div key={item.id} className="bg-[#101726] border border-pink-950/50 hover:border-pink-500/40 rounded-xl p-5 shadow-lg relative group">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-mono font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30 px-2 py-0.5 rounded uppercase">
                      {item.categoria}
                    </span>
                    <button
                      onClick={() => handleDeleteKnowledge(item.id)}
                      className="text-gray-500 hover:text-red-400 transition-colors p-1 cursor-pointer"
                      title="Eliminar pauta"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{item.titulo}</h3>
                  <p className="text-xs text-gray-300 bg-[#080c14] p-3 rounded-lg border border-gray-800 font-sans whitespace-pre-wrap">
                    {item.contenido}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* VISTA 5: BOT WHATSAPP & WEBHOOK */}
      {activeTab === "whatsapp_api" && (
        <form onSubmit={handleSaveConfig} className="space-y-6">
          <div className="bg-[#0b0f19] border border-gray-800 rounded-2xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center gap-3 border-b border-gray-800 pb-4">
              <Smartphone className="w-6 h-6 text-emerald-400" />
              <div>
                <h2 className="text-lg font-bold text-white">Conexión de WhatsApp Bot & API Receptor</h2>
                <p className="text-xs text-gray-400">Configure la dirección del Bot de WhatsApp de la otra plataforma y los datos de sincronización.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-mono font-bold text-gray-300 uppercase tracking-wider mb-2">Endpoint API Externa del Bot</label>
                <input
                  type="url"
                  placeholder="https://api.wpbot-externo.com/v1/messages"
                  value={config.apiUrl}
                  onChange={e => setConfig({ ...config, apiUrl: e.target.value })}
                  className="w-full bg-[#141b2d] border border-gray-700 rounded-xl px-4 py-3 text-emerald-400 font-mono text-sm outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-gray-300 uppercase tracking-wider mb-2">Bearer Token API</label>
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsIn..."
                  value={config.apiToken}
                  onChange={e => setConfig({ ...config, apiToken: e.target.value })}
                  className="w-full bg-[#141b2d] border border-gray-700 rounded-xl px-4 py-3 text-white font-mono text-sm outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-4 border-t border-gray-800 pt-6">
              <label className="block text-xs font-mono font-bold text-gray-300 uppercase tracking-wider">URL del Webhook de Ingesta (Copiable)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={webhookUrl}
                  className="flex-1 bg-[#141b2d] border border-gray-700 rounded-xl px-4 py-3 text-emerald-400 font-mono text-xs outline-none font-bold"
                />
                <button
                  type="button"
                  onClick={copyWebhookUrl}
                  className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-200" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copiado!" : "Copiar Webhook"}
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg cursor-pointer flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Guardar Conexión WhatsApp
            </button>
          </div>
        </form>
      )}

      {/* MODAL AGREGAR PAUTA RAG */}
      {isKnowledgeModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#0b0f19] border border-pink-500/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-pink-400" />
              Nueva Pauta de Entrenamiento RAG
            </h3>

            <form onSubmit={handleCreateKnowledge} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold text-gray-300 uppercase tracking-wider mb-2">Título / Tema</label>
                <input
                  type="text"
                  placeholder="Ej. Precios de Gabinetes y Antenas Satelitales"
                  value={kTitulo}
                  onChange={e => setKTitulo(e.target.value)}
                  className="w-full bg-[#141b2d] border border-gray-700 rounded-xl px-4 py-2.5 text-white font-sans text-xs outline-none focus:border-pink-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-gray-300 uppercase tracking-wider mb-2">Categoría</label>
                <select
                  value={kCategoria}
                  onChange={e => setKCategoria(e.target.value)}
                  className="w-full bg-[#141b2d] border border-gray-700 rounded-xl px-4 py-2.5 text-pink-300 font-mono text-xs outline-none focus:border-pink-500"
                >
                  <option value="REGLAS">REGLAS COMERCIALES</option>
                  <option value="CATÁLOGO">CATÁLOGO DE PRODUCTOS</option>
                  <option value="GABINETES">GABINETES Y EQUIPOS</option>
                  <option value="SOPORTE">PREGUNTAS FRECUENTES / SOPORTE</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-gray-300 uppercase tracking-wider mb-2">Contenido de la Pauta RAG</label>
                <textarea
                  rows={5}
                  placeholder="Escriba las reglas, especificaciones o información con las que la IA responderá a los usuarios..."
                  value={kContenido}
                  onChange={e => setKContenido(e.target.value)}
                  className="w-full bg-[#141b2d] border border-gray-700 rounded-xl px-4 py-2.5 text-gray-200 font-sans text-xs outline-none focus:border-pink-500 leading-relaxed"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsKnowledgeModalOpen(false)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-mono uppercase tracking-wider cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-6 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider cursor-pointer shadow-lg"
                >
                  Guardar Pauta RAG
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
