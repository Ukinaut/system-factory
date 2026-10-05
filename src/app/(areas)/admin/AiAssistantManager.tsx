"use client";

import { useState, useEffect } from "react";
import { 
  Bot, 
  Search, 
  MessageSquare, 
  User, 
  Trash2, 
  Eye, 
  Calendar, 
  Shield, 
  Wrench, 
  RefreshCw, 
  X, 
  Sparkles,
  Users,
  Activity
} from "lucide-react";
import { getAllAiConversationsForAdmin, getAiConversationMessages, deleteAiConversation } from "@/actions/aiAssistant";

export default function AiAssistantManager() {
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ totalConversations: 0, totalMessages: 0, activeUsersCount: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [filterUserId, setFilterUserId] = useState("ALL");
  
  // Selected conversation transcript modal
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [transcriptMessages, setTranscriptMessages] = useState<any[]>([]);
  const [loadingTranscript, setLoadingTranscript] = useState(false);

  const loadAdminData = async () => {
    setLoading(true);
    const res = await getAllAiConversationsForAdmin(searchQuery, filterUserId);
    if (res.success && res.conversations) {
      setConversations(res.conversations);
      if (res.stats) {
        setStats(res.stats);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAdminData();
  }, [filterUserId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadAdminData();
  };

  const handleOpenTranscript = async (id: string) => {
    setSelectedConvId(id);
    setLoadingTranscript(true);
    const res = await getAiConversationMessages(id);
    setLoadingTranscript(false);
    if (res.success && res.messages) {
      setTranscriptMessages(res.messages);
    }
  };

  const handleDeleteConversation = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar esta conversación del historial de auditoría de IA?")) return;
    setLoading(true);
    const res = await deleteAiConversation(id);
    setLoading(false);
    if (res.success) {
      if (selectedConvId === id) setSelectedConvId(null);
      loadAdminData();
    } else {
      alert("Error al eliminar: " + res.error);
    }
  };

  // Obtener lista única de usuarios que tienen chats
  const userEntries = conversations
    .filter(c => c.user?.id && c.user)
    .map(c => [c.user.id, c.user] as [string, any]);
  const uniqueUsers = Array.from(new Map<string, any>(userEntries).values());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-bg-card p-6 border border-border-custom rounded-xl shadow-md">
        <div>
          <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <Bot className="w-6 h-6 text-[#0078D7]" />
            Monitor de Asistentes IA de Operadores
          </h2>
          <p className="text-xs text-text-muted mt-1">
            Auditoría centralizada de conversaciones, consultas y herramientas ejecutadas por los usuarios con el Asistente Virtual.
          </p>
        </div>

        <button
          onClick={loadAdminData}
          className="flex items-center gap-2 px-4 py-2 bg-bg-subtle hover:bg-border-custom/50 text-text-primary border border-border-custom rounded-lg text-xs font-semibold transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#0078D7]" : ""}`} />
          Actualizar Lista
        </button>
      </div>

      {/* Analytics Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-bg-card rounded-xl border border-border-custom p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Total Conversaciones</span>
            <h3 className="text-3xl font-black text-[#0078D7] mt-1">{stats.totalConversations}</h3>
          </div>
          <div className="p-3 bg-[#0078D7]/10 text-[#0078D7] rounded-lg border border-[#0078D7]/20">
            <MessageSquare className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-bg-card rounded-xl border border-border-custom p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Mensajes Intercambiados</span>
            <h3 className="text-3xl font-black text-purple-500 mt-1">{stats.totalMessages}</h3>
          </div>
          <div className="p-3 bg-purple-500/10 text-purple-500 rounded-lg border border-purple-500/20">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-bg-card rounded-xl border border-border-custom p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Usuarios Activos en IA</span>
            <h3 className="text-3xl font-black text-emerald-500 mt-1">{stats.activeUsersCount}</h3>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-lg border border-emerald-500/20">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Toolbar Search & User Filter */}
      <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-4 bg-bg-card p-4 border border-border-custom rounded-xl shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar conversación por título, operador o correo..."
            className="w-full bg-bg-subtle border border-border-custom rounded-lg pl-9 pr-4 py-2 text-xs text-text-primary focus:border-[#0078D7] outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterUserId}
            onChange={e => setFilterUserId(e.target.value)}
            className="bg-bg-subtle border border-border-custom rounded-lg px-3 py-2 text-xs text-text-primary focus:border-[#0078D7] outline-none"
          >
            <option value="ALL">Todos los Operadores</option>
            {uniqueUsers.map((u: any) => (
              <option key={u.id} value={u.id}>
                {u.nombre} ({u.rol})
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="bg-[#0078D7] hover:bg-[#005a9e] text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            Filtrar
          </button>
        </div>
      </form>

      {/* Main Conversations Table */}
      <div className="bg-bg-card rounded-xl border border-border-custom shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border-custom text-[11px] font-bold uppercase tracking-wider text-text-muted bg-bg-subtle/40">
                <th className="p-4">Operador / Usuario</th>
                <th className="p-4">Título / Consulta</th>
                <th className="p-4">Última Actividad</th>
                <th className="p-4 text-center">Mensajes</th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-custom text-xs">
              {conversations.length > 0 ? (
                conversations.map(conv => {
                  const lastMsg = conv.messages?.[0];
                  return (
                    <tr key={conv.id} className="hover:bg-bg-subtle/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#0078D7]/10 text-[#0078D7] flex items-center justify-center font-bold text-xs border border-[#0078D7]/20">
                            {conv.user?.nombre?.charAt(0).toUpperCase() || "U"}
                          </div>
                          <div>
                            <p className="font-bold text-text-primary whitespace-nowrap">{conv.user?.nombre || "Usuario"}</p>
                            <span className="text-[10px] font-semibold text-text-muted uppercase bg-bg-subtle px-1.5 py-0.5 rounded border border-border-custom inline-block mt-0.5">
                              {conv.user?.rol || "OPERADOR"}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 font-semibold text-text-primary max-w-sm">
                        <p className="truncate text-text-primary font-bold">{conv.title}</p>
                        {lastMsg && (
                          <p className="text-[11px] text-text-muted truncate mt-0.5 font-normal">
                            Último: "{lastMsg.content}"
                          </p>
                        )}
                      </td>

                      <td className="p-4 text-text-muted whitespace-nowrap">
                        {new Date(conv.updatedAt).toLocaleString([], { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>

                      <td className="p-4 text-center">
                        <span className="bg-[#0078D7]/10 text-[#0078D7] font-bold px-2.5 py-1 rounded-full text-xs border border-[#0078D7]/20">
                          {conv._count?.messages || 0}
                        </span>
                      </td>

                      <td className="p-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenTranscript(conv.id)}
                            className="px-3 py-1.5 bg-[#0078D7] hover:bg-[#005a9e] text-white rounded-md font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" /> Ver Transcripción
                          </button>
                          <button
                            onClick={() => handleDeleteConversation(conv.id)}
                            className="p-1.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-md border border-red-500/20 transition-all cursor-pointer"
                            title="Eliminar registro"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-text-muted italic">
                    No hay conversaciones de IA registradas que coincidan con el filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Transcripción Completa del Asistente */}
      {selectedConvId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-card border border-border-custom rounded-2xl shadow-2xl w-full max-w-3xl h-[650px] max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header Modal */}
            <div className="p-4 bg-bg-subtle border-b border-border-custom flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-[#0078D7]" />
                <h3 className="font-bold text-sm text-text-primary">
                  Transcripción Completa de Auditoría IA
                </h3>
              </div>
              <button
                onClick={() => setSelectedConvId(null)}
                className="text-text-muted hover:text-text-primary p-1 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Transcript Messages Container */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-bg-card">
              {loadingTranscript ? (
                <div className="text-center py-16 text-text-muted text-xs">
                  Cargando mensajes de transcripción...
                </div>
              ) : (
                transcriptMessages.map((msg: any) => {
                  const isUser = msg.sender === "user";
                  let toolExecutions: any[] = [];
                  if (msg.toolCalls) {
                    try {
                      toolExecutions = JSON.parse(msg.toolCalls);
                    } catch {}
                  }

                  return (
                    <div key={msg.id} className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                      <span className="text-[10px] font-bold text-text-muted mb-1 px-1 uppercase tracking-wider">
                        {isUser ? "Operador" : "Asistente AI"} • {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>

                      <div
                        className={`max-w-[90%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                          isUser
                            ? "bg-[#0078D7] text-white rounded-br-none"
                            : "bg-bg-subtle border border-border-custom text-text-primary rounded-bl-none shadow-sm"
                        }`}
                      >
                        {/* Tool Executions log */}
                        {toolExecutions.length > 0 && (
                          <div className="mb-3 space-y-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0078D7] block">
                              Herramientas Ejecutadas (RBAC Authorized):
                            </span>
                            {toolExecutions.map((t: any, idx: number) => (
                              <div key={idx} className="bg-bg-card p-2 rounded-lg border border-border-custom space-y-1 font-mono text-[10px]">
                                <div className="flex items-center gap-1.5 text-purple-400 font-bold">
                                  <Wrench className="w-3 h-3" />
                                  <span>{t.toolName}({JSON.stringify(t.args)})</span>
                                </div>
                                <div className="text-text-muted max-h-24 overflow-y-auto whitespace-pre-wrap bg-bg-subtle p-1.5 rounded">
                                  {JSON.stringify(t.result, null, 2)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Modal */}
            <div className="p-3 bg-bg-subtle border-t border-border-custom flex justify-end">
              <button
                onClick={() => setSelectedConvId(null)}
                className="px-4 py-1.5 bg-bg-card hover:bg-border-custom/50 text-text-primary border border-border-custom rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Cerrar Transcripción
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
