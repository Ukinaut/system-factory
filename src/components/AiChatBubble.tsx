"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Bot, 
  X, 
  Send, 
  Plus, 
  Trash2, 
  MessageSquare, 
  Sparkles, 
  ChevronDown, 
  ShieldCheck, 
  Wrench, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Maximize2,
  Minus
} from "lucide-react";
import { 
  getUserAiConversations, 
  getAiConversationMessages, 
  createAiConversation, 
  deleteAiConversation, 
  sendAiMessage 
} from "@/actions/aiAssistant";
import { getCurrentUserSession } from "@/actions/users";

export default function AiChatBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [showThreadDrawer, setShowThreadDrawer] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    getCurrentUserSession().then(res => {
      if (res.success && res.session) {
        setSession(res.session);
      }
    });
  }, []);

  const loadConversations = async () => {
    const res = await getUserAiConversations();
    if (res.success && res.conversations) {
      setConversations(res.conversations);
      if (!activeConversationId && res.conversations.length > 0) {
        setActiveConversationId(res.conversations[0].id);
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadConversations();
    }
  }, [isOpen]);

  useEffect(() => {
    if (activeConversationId) {
      getAiConversationMessages(activeConversationId).then(res => {
        if (res.success && res.messages) {
          setMessages(res.messages);
          setTimeout(scrollToBottom, 100);
        }
      });
    } else {
      setMessages([]);
    }
  }, [activeConversationId]);

  const handleStartNewConversation = async () => {
    setLoading(true);
    const res = await createAiConversation();
    setLoading(false);
    if (res.success && res.conversation) {
      setActiveConversationId(res.conversation.id);
      setShowThreadDrawer(false);
      loadConversations();
    }
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("¿Eliminar este historial de chat?")) return;
    const res = await deleteAiConversation(id);
    if (res.success) {
      if (activeConversationId === id) {
        setActiveConversationId(null);
      }
      loadConversations();
    }
  };

  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const messageText = customText || prompt;
    if (!messageText.trim() || loading) return;

    const userMessageText = messageText;
    setPrompt("");

    // Agregar mensaje local optimista
    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      sender: "user",
      content: userMessageText,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);
    setTimeout(scrollToBottom, 50);

    setLoading(true);
    const res = await sendAiMessage({
      conversationId: activeConversationId || undefined,
      prompt: userMessageText
    });
    setLoading(false);

    if (res.success) {
      if (!activeConversationId && res.conversationId) {
        setActiveConversationId(res.conversationId);
      }
      // Recargar lista y mensajes
      loadConversations();
      if (res.conversationId) {
        const msgRes = await getAiConversationMessages(res.conversationId);
        if (msgRes.success && msgRes.messages) {
          setMessages(msgRes.messages);
          setTimeout(scrollToBottom, 100);
        }
      }
    } else {
      alert("Error en el asistente: " + res.error);
    }
  };

  if (!session) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Ventana de Chat Expandida */}
      {isOpen && (
        <div className="w-80 sm:w-96 h-[580px] max-h-[85vh] bg-bg-card border border-border-custom rounded-2xl shadow-2xl flex flex-col overflow-hidden mb-4 animate-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="p-3.5 bg-gradient-to-r from-[#0078D7] to-purple-700 text-white flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <Bot className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-xs flex items-center gap-1.5">
                  Aitue Virtual Assistant
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                </h3>
                <p className="text-[10px] text-white/80 flex items-center gap-1 font-medium">
                  <ShieldCheck className="w-3 h-3" />
                  Rol: <strong className="uppercase">{session.rol}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowThreadDrawer(!showThreadDrawer)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                title="Historial de consultas"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white cursor-pointer"
                title="Minimizar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Drawer de Hilos / Historial de Conversaciones */}
          {showThreadDrawer ? (
            <div className="flex-1 bg-bg-subtle p-4 overflow-y-auto space-y-3">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-bold text-xs text-text-muted uppercase tracking-wider">Mis Conversaciones</h4>
                <button
                  onClick={handleStartNewConversation}
                  className="flex items-center gap-1 text-xs bg-[#0078D7] hover:bg-[#005a9e] text-white px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Nueva Consulta
                </button>
              </div>

              {conversations.length > 0 ? (
                conversations.map(conv => (
                  <div
                    key={conv.id}
                    onClick={() => {
                      setActiveConversationId(conv.id);
                      setShowThreadDrawer(false);
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex justify-between items-start ${
                      activeConversationId === conv.id
                        ? "bg-[#0078D7]/10 border-[#0078D7] text-text-primary"
                        : "bg-bg-card border-border-custom hover:border-text-muted text-text-secondary"
                    }`}
                  >
                    <div className="space-y-1 overflow-hidden pr-2">
                      <p className="font-bold text-xs truncate leading-snug">{conv.title}</p>
                      <span className="text-[10px] text-text-muted block">
                        {new Date(conv.updatedAt).toLocaleDateString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} • {conv._count?.messages || 0} mensajes
                      </span>
                    </div>
                    <button
                      onClick={e => handleDeleteConversation(conv.id, e)}
                      className="text-text-muted hover:text-red-400 p-1 transition-colors cursor-pointer"
                      title="Eliminar chat"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-xs text-text-muted italic text-center py-8">No tienes conversaciones registradas.</p>
              )}
            </div>
          ) : (
            /* Área Principal de Chat */
            <div className="flex-1 flex flex-col justify-between overflow-hidden bg-bg-card">
              {/* Mensajes */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-[#0078D7]/10 text-[#0078D7] flex items-center justify-center border border-[#0078D7]/20">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-text-primary">¡Hola {session.nombre}!</h4>
                      <p className="text-xs text-text-muted mt-1 max-w-[240px] leading-relaxed">
                        Soy tu asistente virtual. Puedo ayudarte a consultar clientes, stock, reclamos o presupuestos autorizados para tu rol.
                      </p>
                    </div>

                    {/* Chips de sugerencias rápidas */}
                    <div className="w-full pt-2 space-y-2 text-left">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">Sugerencias rápidas:</span>
                      <button
                        onClick={() => handleSendMessage(undefined, "🔍 Buscar cliente por CUIT o Razón Social")}
                        className="w-full text-left p-2 rounded-lg bg-bg-subtle hover:bg-border-custom/50 border border-border-custom text-xs text-text-primary transition-colors cursor-pointer"
                      >
                        🔍 Buscar cliente por CUIT
                      </button>
                      <button
                        onClick={() => handleSendMessage(undefined, "📦 Consultar estado actual del inventario de stock")}
                        className="w-full text-left p-2 rounded-lg bg-bg-subtle hover:bg-border-custom/50 border border-border-custom text-xs text-text-primary transition-colors cursor-pointer"
                      >
                        📦 Consultar stock de productos
                      </button>
                      <button
                        onClick={() => handleSendMessage(undefined, "📋 Ver reclamos de soporte técnico abiertos")}
                        className="w-full text-left p-2 rounded-lg bg-bg-subtle hover:bg-border-custom/50 border border-border-custom text-xs text-text-primary transition-colors cursor-pointer"
                      >
                        📋 Ver tickets de reclamo técnico
                      </button>
                    </div>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isUser = msg.sender === "user";
                    let toolExecutions: any[] = [];
                    if (msg.toolCalls) {
                      try {
                        toolExecutions = JSON.parse(msg.toolCalls);
                      } catch {}
                    }

                    return (
                      <div key={msg.id} className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                        <div
                          className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                            isUser
                              ? "bg-[#0078D7] text-white rounded-br-none"
                              : "bg-bg-subtle border border-border-custom text-text-primary rounded-bl-none shadow-sm"
                          }`}
                        >
                          {/* Badges de Herramientas ejecutadas */}
                          {toolExecutions.length > 0 && (
                            <div className="mb-2 space-y-1">
                              {toolExecutions.map((t, idx) => (
                                <div key={idx} className="bg-bg-card/70 border border-border-custom p-1.5 rounded text-[10px] text-text-muted flex items-center gap-1.5">
                                  <Wrench className="w-3 h-3 text-[#0078D7] shrink-0" />
                                  <span>Ejecutó: <strong>{t.toolName}</strong></span>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="whitespace-pre-wrap">{msg.content}</div>
                        </div>

                        <span className="text-[9px] text-text-muted mt-1 px-1">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                )}

                {loading && (
                  <div className="flex items-center gap-2 text-xs text-text-muted bg-bg-subtle p-2.5 rounded-xl border border-border-custom w-fit animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin text-[#0078D7]" />
                    <span>Aitue AI procesando consulta...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Formulario de Entrada */}
              <form onSubmit={handleSendMessage} className="p-3 bg-bg-subtle border-t border-border-custom flex items-center gap-2">
                <input
                  type="text"
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder="Escribe tu consulta..."
                  className="flex-1 bg-bg-card border border-border-custom rounded-xl px-3.5 py-2.5 text-xs text-text-primary focus:border-[#0078D7] outline-none"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={!prompt.trim() || loading}
                  className="p-2.5 bg-[#0078D7] hover:bg-[#005a9e] disabled:bg-bg-subtle disabled:text-text-muted text-white rounded-xl font-bold transition-colors cursor-pointer shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Botón Flotante (Burbuja) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2 bg-gradient-to-r from-[#0078D7] to-purple-600 hover:from-[#005a9e] hover:to-purple-700 text-white p-3.5 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer border border-white/20"
        >
          <div className="relative">
            <Bot className="w-6 h-6 animate-bounce" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white"></span>
          </div>
          <span className="font-bold text-xs pr-1 hidden sm:inline-block">Asistente AI</span>
        </button>
      )}
    </div>
  );
}
