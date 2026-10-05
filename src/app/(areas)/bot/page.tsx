"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Bot, 
  Upload, 
  FileText, 
  Brain, 
  Sparkles, 
  Plus, 
  Trash2, 
  Edit, 
  Save, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Sliders, 
  Key, 
  MessageSquare, 
  Send, 
  Download, 
  Zap,
  HelpCircle,
  FileJson,
  Layers
} from "lucide-react";
import { 
  getBotConfig, 
  saveBotConfig, 
  getKnowledgeItems, 
  saveKnowledgeItem, 
  deleteKnowledgeItem, 
  clearAllKnowledgeItems,
  importChatGPTFile 
} from "@/actions/bot";
import { sendAiMessage } from "@/actions/aiAssistant";

export default function BotAdminPage() {
  const [activeTab, setActiveTab] = useState<"rag" | "config" | "tester">("rag");

  // Config State
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [botConfig, setBotConfig] = useState({
    activo: true,
    mensajeBienvenida: "",
    mensajeSoporte: "",
    mensajeFueraHorario: "",
    aiModel: "gpt-4o-mini",
    openaiApiKey: "",
    temperature: 0.7,
    systemPrompt: "",
    operadoresEstado: "DISPONIBLES"
  });

  // RAG / Knowledge State
  const [knowledgeItems, setKnowledgeItems] = useState<any[]>([]);
  const [loadingKnowledge, setLoadingKnowledge] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("TODAS");

  // Manual Item Modal
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [manualForm, setManualForm] = useState({
    titulo: "",
    categoria: "CONOCIMIENTO",
    contenido: ""
  });

  // File Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState("CHATGPT_EXPORT");
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState("");

  // Live Tester State
  const [testMessages, setTestMessages] = useState<any[]>([]);
  const [testInput, setTestInput] = useState("");
  const [testingAi, setTestingAi] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Status Message
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoadingConfig(true);
    setLoadingKnowledge(true);

    const [confRes, knowRes] = await Promise.all([
      getBotConfig(),
      getKnowledgeItems()
    ]);

    if (confRes.success && confRes.config) {
      setBotConfig({
        activo: confRes.config.activo ?? true,
        mensajeBienvenida: confRes.config.mensajeBienvenida || "",
        mensajeSoporte: confRes.config.mensajeSoporte || "",
        mensajeFueraHorario: confRes.config.mensajeFueraHorario || "",
        aiModel: confRes.config.aiModel || "gpt-4o-mini",
        openaiApiKey: confRes.config.openaiApiKey || "",
        temperature: confRes.config.temperature ?? 0.7,
        systemPrompt: confRes.config.systemPrompt || "",
        operadoresEstado: confRes.config.operadoresEstado || "DISPONIBLES"
      });
    }

    if (knowRes.success && knowRes.items) {
      setKnowledgeItems(knowRes.items);
    }

    setLoadingConfig(false);
    setLoadingKnowledge(false);
  };

  const showToast = (type: "success" | "error", text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  // 1. Guardar Configuración del Bot
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    const res = await saveBotConfig(botConfig);
    setSavingConfig(false);

    if (res.success) {
      showToast("success", "Configuración del Bot actualizada correctamente.");
    } else {
      showToast("error", res.error || "Error al guardar la configuración.");
    }
  };

  // 2. Cargar Archivo de ChatGPT (JSON, TXT, MD, CSV, PDF text)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadSuccessMsg("");

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        const res = await importChatGPTFile({
          fileBase64: base64,
          fileName: file.name,
          categoria: uploadCategory
        });

        setIsUploading(false);
        if (res.success) {
          showToast("success", `¡Éxito! Se crearon ${res.count} pauta(s) de conocimiento a partir de "${file.name}".`);
          loadData();
        } else {
          showToast("error", res.error || "Error al importar el archivo.");
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setIsUploading(false);
      showToast("error", "Error al leer el archivo: " + err.message);
    }
  };

  // 3. Guardar Pauta Manual (Crear o Editar)
  const handleSaveManualItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.titulo.trim() || !manualForm.contenido.trim()) return;

    const res = await saveKnowledgeItem({
      id: editingItem?.id,
      titulo: manualForm.titulo,
      categoria: manualForm.categoria,
      contenido: manualForm.contenido
    });

    if (res.success) {
      showToast("success", editingItem ? "Pauta actualizada." : "Nueva pauta agregada a la base de conocimiento.");
      setShowModal(false);
      setEditingItem(null);
      setManualForm({ titulo: "", categoria: "CONOCIMIENTO", contenido: "" });
      loadData();
    } else {
      showToast("error", res.error || "Error al guardar pauta.");
    }
  };

  // 4. Eliminar Pauta RAG
  const handleDeleteItem = async (id: string) => {
    if (!confirm("¿Seguro que deseas eliminar esta pauta de conocimiento?")) return;
    const res = await deleteKnowledgeItem(id);
    if (res.success) {
      showToast("success", "Pauta eliminada.");
      loadData();
    } else {
      showToast("error", res.error || "Error al eliminar.");
    }
  };

  // 5. Vaciar toda la base RAG
  const handleClearAllItems = async () => {
    if (!confirm("⚠️ ¿ATENCIÓN: Deseas vaciar TODA la base de conocimiento RAG importada?")) return;
    const res = await clearAllKnowledgeItems();
    if (res.success) {
      showToast("success", "Base de conocimiento vaciada.");
      loadData();
    }
  };

  // 6. Probar en Vivo (Tester Chat)
  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testInput.trim() || testingAi) return;

    const userText = testInput;
    setTestInput("");

    const newMessages = [...testMessages, { role: "user", text: userText }];
    setTestMessages(newMessages);
    setTestingAi(true);

    const res = await sendAiMessage({ prompt: userText });
    setTestingAi(false);

    if (res.success && res.reply) {
      setTestMessages([...newMessages, { role: "assistant", text: res.reply, tools: res.toolCallsExecuted }]);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } else {
      setTestMessages([...newMessages, { role: "assistant", text: "❌ Error: " + (res.error || "No se pudo obtener respuesta.") }]);
    }
  };

  // Filtrado de ítems
  const categories = Array.from(new Set(knowledgeItems.map(i => i.categoria)));
  const filteredKnowledge = knowledgeItems.filter(item => {
    const matchesSearch = item.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.contenido.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === "TODAS" || item.categoria === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-12">
      {/* Toast Feedback Notification */}
      {feedback && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border text-xs font-bold animate-in slide-in-from-top-5 ${
          feedback.type === "success"
            ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
            : "bg-red-500/20 border-red-500/50 text-red-300"
        }`}>
          {feedback.type === "success" ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-red-400" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Header General */}
      <div className="bg-bg-card border border-border-custom rounded-2xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg">
              <Bot className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight flex items-center gap-2">
                Centro de Inteligencia & Bot RAG
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase font-bold">
                  OpenAI GPT Engine
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-text-muted">
                Integra archivos exportados de ChatGPT, personaliza pautas RAG y ajusta el comportamiento del Asistente Virtual.
              </p>
            </div>
          </div>
        </div>

        {/* Action Tabs */}
        <div className="flex items-center bg-bg-subtle p-1.5 rounded-xl border border-border-custom shrink-0 w-full md:w-auto">
          <button
            onClick={() => setActiveTab("rag")}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "rag"
                ? "bg-[#0078D7] text-white shadow-md"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            <Brain className="w-4 h-4" />
            Memoria RAG & ChatGPT
          </button>
          <button
            onClick={() => setActiveTab("config")}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "config"
                ? "bg-[#0078D7] text-white shadow-md"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            <Sliders className="w-4 h-4" />
            Configuración IA
          </button>
          <button
            onClick={() => setActiveTab("tester")}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "tester"
                ? "bg-[#0078D7] text-white shadow-md"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Simulador Chat
          </button>
        </div>
      </div>

      {/* TAB 1: MEMORIA RAG & IMPORTADOR DE CHATGPT */}
      {activeTab === "rag" && (
        <div className="space-y-6">
          {/* Card de Importación de Archivos ChatGPT */}
          <div className="bg-bg-card border border-emerald-500/30 rounded-2xl p-6 shadow-xl space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                    Importar Conversaciones / Documentos de ChatGPT
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                  </h3>
                  <p className="text-xs text-text-muted">
                    Sube archivos <code className="text-emerald-400 bg-bg-subtle px-1 rounded">conversations.json</code> (exportación oficial de OpenAI), <code className="text-emerald-400 bg-bg-subtle px-1 rounded">.txt</code>, <code className="text-emerald-400 bg-bg-subtle px-1 rounded">.md</code> o <code className="text-emerald-400 bg-bg-subtle px-1 rounded">.csv</code> para que la IA aprenda su contenido.
                  </p>
                </div>
              </div>

              {/* Categoría para la Importación */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-text-muted">Categoría:</label>
                <select
                  value={uploadCategory}
                  onChange={e => setUploadCategory(e.target.value)}
                  className="bg-bg-subtle border border-border-custom rounded-lg px-3 py-1.5 text-xs text-text-primary focus:border-[#0078D7] outline-none"
                >
                  <option value="CHATGPT_EXPORT">Exportación ChatGPT</option>
                  <option value="PAUTAS_SOPORTE">Pautas de Soporte</option>
                  <option value="CONOCIMIENTO">Conocimiento General</option>
                  <option value="PROCEDIMIENTOS">Procedimientos Internos</option>
                  <option value="FAQS">Preguntas Frecuentes</option>
                </select>
              </div>
            </div>

            {/* Drag & Drop Upload Zone */}
            <label className="block border-2 border-dashed border-emerald-500/40 hover:border-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 rounded-2xl p-8 text-center cursor-pointer transition-all">
              <input
                type="file"
                accept=".json,.txt,.md,.csv,.pdf"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
              />
              <div className="flex flex-col items-center space-y-3">
                <FileJson className="w-10 h-10 text-emerald-400 animate-bounce" />
                <div>
                  <p className="text-sm font-bold text-text-primary">
                    {isUploading ? "Procesando e indexando contenido..." : "Haz clic o arrastra tus archivos de ChatGPT aquí"}
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    Soporta JSON nativo de OpenAI ChatGPT, transcripciones en texto (.txt, .md) y tablas (.csv).
                  </p>
                </div>
                {isUploading && (
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-500/20 px-4 py-1.5 rounded-full border border-emerald-500/30">
                    <RefreshCw className="w-4 h-4 animate-spin" /> Indexando información en el motor Aitue AI...
                  </div>
                )}
              </div>
            </label>
          </div>

          {/* Listado de Pautas de Conocimiento RAG Activas */}
          <div className="bg-bg-card border border-border-custom rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#0078D7]" />
                  Base de Conocimiento RAG Aprendida ({knowledgeItems.length} registros)
                </h3>
                <p className="text-xs text-text-muted">
                  Estas pautas se inyectan automáticamente en el contexto de la IA para responder consultas de usuarios.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditingItem(null);
                    setManualForm({ titulo: "", categoria: "CONOCIMIENTO", contenido: "" });
                    setShowModal(true);
                  }}
                  className="flex items-center gap-1.5 bg-[#0078D7] hover:bg-[#005a9e] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Agregar Pauta Manual
                </button>
                {knowledgeItems.length > 0 && (
                  <button
                    onClick={handleClearAllItems}
                    className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    title="Vaciar toda la base"
                  >
                    <Trash2 className="w-4 h-4" /> Vaciar RAG
                  </button>
                )}
              </div>
            </div>

            {/* Filtros y Búsqueda */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar pauta por título o contenido..."
                  className="w-full bg-bg-subtle border border-border-custom rounded-xl pl-10 pr-4 py-2.5 text-xs text-text-primary focus:border-[#0078D7] outline-none"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="bg-bg-subtle border border-border-custom rounded-xl px-4 py-2.5 text-xs text-text-primary focus:border-[#0078D7] outline-none"
              >
                <option value="TODAS">Todas las categorías</option>
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Grid de Ítems RAG */}
            {loadingKnowledge ? (
              <div className="py-12 text-center text-xs text-text-muted">Cargando base de conocimiento...</div>
            ) : filteredKnowledge.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredKnowledge.map((item) => (
                  <div
                    key={item.id}
                    className="bg-bg-subtle/70 border border-border-custom rounded-xl p-4 flex flex-col justify-between space-y-3 hover:border-emerald-500/40 transition-all shadow-sm"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-xs text-text-primary line-clamp-1">{item.titulo}</h4>
                        <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0">
                          {item.categoria}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted leading-relaxed line-clamp-4 font-mono bg-bg-card/50 p-2.5 rounded-lg border border-border-custom/50 whitespace-pre-wrap">
                        {item.contenido}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border-custom/40 text-[10px] text-text-muted">
                      <span>{new Date(item.createdAt).toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingItem(item);
                            setManualForm({
                              titulo: item.titulo,
                              categoria: item.categoria,
                              contenido: item.contenido
                            });
                            setShowModal(true);
                          }}
                          className="text-[#0078D7] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Edit className="w-3 h-3" /> Editar
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-red-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" /> Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-text-muted italic bg-bg-subtle/30 rounded-xl border border-dashed border-border-custom">
                No hay pautas registradas que coincidan con la búsqueda. ¡Sube un archivo de ChatGPT arriba para comenzar!
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CONFIGURACIÓN GENERAL DEL BOT & SYSTEM PROMPT */}
      {activeTab === "config" && (
        <form onSubmit={handleSaveConfig} className="bg-bg-card border border-border-custom rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-border-custom pb-4">
            <div>
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <Sliders className="w-5 h-5 text-[#0078D7]" />
                Configuración del Motor Inteligente
              </h3>
              <p className="text-xs text-text-muted">
                Establece la clave de OpenAI, modelo predeterminado y prompt global del sistema.
              </p>
            </div>

            <button
              type="submit"
              disabled={savingConfig}
              className="flex items-center gap-2 bg-[#0078D7] hover:bg-[#005a9e] disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              <Save className="w-4 h-4" /> {savingConfig ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Activar Bot */}
            <div className="bg-bg-subtle p-4 rounded-xl border border-border-custom flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-text-primary block">Asistente Virtual Activo</label>
                <span className="text-[11px] text-text-muted">Habilita o inhabilita las respuestas automáticas de la IA.</span>
              </div>
              <input
                type="checkbox"
                checked={botConfig.activo}
                onChange={e => setBotConfig({ ...botConfig, activo: e.target.checked })}
                className="w-5 h-5 accent-[#0078D7] cursor-pointer"
              />
            </div>

            {/* Modelo OpenAI */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-emerald-400" /> Modelo OpenAI Inteligente:
              </label>
              <select
                value={botConfig.aiModel}
                onChange={e => setBotConfig({ ...botConfig, aiModel: e.target.value })}
                className="w-full bg-bg-subtle border border-border-custom rounded-xl px-4 py-2.5 text-xs text-text-primary focus:border-[#0078D7] outline-none"
              >
                <option value="gpt-4o-mini">gpt-4o-mini (Rápido y Recomendado)</option>
                <option value="gpt-4o">gpt-4o (Máxima Capacidad)</option>
                <option value="gpt-4-turbo">gpt-4-turbo</option>
                <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
              </select>
            </div>

            {/* OpenAI API Key */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                <Key className="w-4 h-4 text-yellow-400" /> Clave de API OpenAI (OPENAI_API_KEY):
              </label>
              <input
                type="password"
                value={botConfig.openaiApiKey}
                onChange={e => setBotConfig({ ...botConfig, openaiApiKey: e.target.value })}
                placeholder="sk-proj-..."
                className="w-full bg-bg-subtle border border-border-custom rounded-xl px-4 py-2.5 text-xs text-text-primary focus:border-[#0078D7] outline-none font-mono"
              />
              <p className="text-[10px] text-text-muted">Si se deja vacío, el sistema utilizará la clave configurada en el archivo `.env` del servidor.</p>
            </div>

            {/* System Prompt Global */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                <Brain className="w-4 h-4 text-purple-400" /> Prompt Global del Sistema (Instrucciones Generales):
              </label>
              <textarea
                rows={4}
                value={botConfig.systemPrompt}
                onChange={e => setBotConfig({ ...botConfig, systemPrompt: e.target.value })}
                placeholder="Ejemplo: Eres el asistente operativo inteligente de Aitue Cominca S.A. Atiendes de manera cordial y profesional..."
                className="w-full bg-bg-subtle border border-border-custom rounded-xl p-3.5 text-xs text-text-primary focus:border-[#0078D7] outline-none leading-relaxed font-mono"
              />
            </div>
          </div>
        </form>
      )}

      {/* TAB 3: SIMULADOR DE PRUEBAS EN VIVO */}
      {activeTab === "tester" && (
        <div className="bg-bg-card border border-border-custom rounded-2xl p-6 shadow-xl space-y-4">
          <div>
            <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-400" />
              Simulador de Pruebas con la Base RAG Aprendida
            </h3>
            <p className="text-xs text-text-muted">
              Prueba consultas en tiempo real para verificar cómo la IA responde utilizando las pautas importadas de ChatGPT.
            </p>
          </div>

          <div className="h-96 bg-bg-subtle border border-border-custom rounded-xl p-4 overflow-y-auto space-y-3">
            {testMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-text-muted space-y-2">
                <Bot className="w-8 h-8 text-emerald-400 opacity-50" />
                <p className="text-xs">Escribe una pregunta para probar las pautas de conocimiento RAG aprendidas.</p>
              </div>
            ) : (
              testMessages.map((m, idx) => (
                <div key={idx} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
                  <div className={`max-w-[80%] rounded-xl px-4 py-2.5 text-xs leading-relaxed ${
                    m.role === "user" ? "bg-[#0078D7] text-white" : "bg-bg-card border border-border-custom text-text-primary"
                  }`}>
                    {m.text}
                  </div>
                </div>
              ))
            )}
            {testingAi && (
              <div className="text-xs text-text-muted flex items-center gap-2 bg-bg-card p-2 rounded-lg border w-fit">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#0078D7]" /> Procesando con RAG...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSendTestMessage} className="flex items-center gap-2">
            <input
              type="text"
              value={testInput}
              onChange={e => setTestInput(e.target.value)}
              placeholder="Hazle una pregunta a la IA para verificar su memoria RAG..."
              className="flex-1 bg-bg-subtle border border-border-custom rounded-xl px-4 py-2.5 text-xs text-text-primary focus:border-[#0078D7] outline-none"
            />
            <button
              type="submit"
              disabled={!testInput.trim() || testingAi}
              className="bg-[#0078D7] hover:bg-[#005a9e] disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Send className="w-4 h-4" /> Enviar
            </button>
          </form>
        </div>
      )}

      {/* MODAL MANUAL PAUTA */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-bg-card border border-border-custom rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-text-primary">
              {editingItem ? "Editar Pauta de Conocimiento" : "Nueva Pauta Manual"}
            </h3>

            <form onSubmit={handleSaveManualItem} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-text-muted">Título / Referencia:</label>
                <input
                  type="text"
                  required
                  value={manualForm.titulo}
                  onChange={e => setManualForm({ ...manualForm, titulo: e.target.value })}
                  placeholder="Ej: Política de Garantías y RMA Starlink"
                  className="w-full bg-bg-subtle border border-border-custom rounded-xl px-3.5 py-2 text-xs text-text-primary focus:border-[#0078D7] outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-text-muted">Categoría:</label>
                <select
                  value={manualForm.categoria}
                  onChange={e => setManualForm({ ...manualForm, categoria: e.target.value })}
                  className="w-full bg-bg-subtle border border-border-custom rounded-xl px-3.5 py-2 text-xs text-text-primary focus:border-[#0078D7] outline-none"
                >
                  <option value="CONOCIMIENTO">Conocimiento General</option>
                  <option value="PAUTAS_SOPORTE">Pautas de Soporte</option>
                  <option value="PROCEDIMIENTOS">Procedimientos Internos</option>
                  <option value="FAQS">Preguntas Frecuentes</option>
                  <option value="CHATGPT_EXPORT">Exportación ChatGPT</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-text-muted">Contenido de la Pauta / Texto:</label>
                <textarea
                  required
                  rows={5}
                  value={manualForm.contenido}
                  onChange={e => setManualForm({ ...manualForm, contenido: e.target.value })}
                  placeholder="Escribe el texto detallado o respuestas esperadas que debe conocer la IA..."
                  className="w-full bg-bg-subtle border border-border-custom rounded-xl p-3 text-xs text-text-primary focus:border-[#0078D7] outline-none font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-text-muted hover:bg-bg-subtle cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#0078D7] hover:bg-[#005a9e] text-white shadow-md cursor-pointer"
                >
                  Guardar Pauta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
