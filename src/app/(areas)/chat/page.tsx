"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Users, MessageSquare, Search, Shield, Globe, User, Phone, Mail, CheckCircle2, Clock } from "lucide-react";
import { getMessages, sendMessage } from "@/actions/chat";
import { getUsersDirectory, getCurrentUserSession } from "@/actions/users";

export default function ChatPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"chats" | "directorio">("chats");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // 1. Fetch authenticated user session securely via Server Action
  useEffect(() => {
    const fetchSession = async () => {
      const res = await getCurrentUserSession();
      if (res.success && res.session) {
        setCurrentUser(res.session);
      }
    };
    fetchSession();
  }, []);

  // 2. Fetch directory of users
  const loadDirectory = async () => {
    const res = await getUsersDirectory();
    if (res.success && res.users) {
      setUsers(res.users);
    }
  };

  useEffect(() => {
    loadDirectory();
  }, []);

  // Filter out the current logged-in user from all user lists
  const availableUsers = users.filter(u => !currentUser || u.id !== currentUser.id);

  const filteredUsers = availableUsers.filter((u) => {
    const matchName = u.nombre.toLowerCase().includes(searchQuery.toLowerCase());
    const matchEmail = u.correo.toLowerCase().includes(searchQuery.toLowerCase());
    return matchName || matchEmail;
  });

  // Auto-select first chat partner if none selected
  useEffect(() => {
    if (!selectedUser && availableUsers.length > 0) {
      setSelectedUser(availableUsers[0]);
    }
  }, [availableUsers, selectedUser]);

  // 3. Fetch messages between current user and selected user
  const fetchMessages = async () => {
    if (!selectedUser) return;
    const res = await getMessages(selectedUser.id);
    if (res.success && res.messages) {
      setMessages(res.messages);
    }
  };

  // Poll every 2.5 seconds for real-time chat updates
  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 2500);
    return () => clearInterval(interval);
  }, [selectedUser]);

  // Scroll ONLY the internal chat container when messages arrive (never touch main page layout scroll)
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;
    const text = newMessage;
    setNewMessage(""); // Clear early for high responsiveness

    const res = await sendMessage(selectedUser.id, text);
    if (res.success) {
      fetchMessages();
    } else {
      alert("Error al enviar mensaje: " + res.error);
    }
  };

  // Group users by Area (Role or OperatorPermission)
  const usersByArea = {
    Administradores: filteredUsers.filter(u => u.rol === "ADMIN"),
    Ventas: filteredUsers.filter(u => u.rol !== "ADMIN" && u.permissions.some((p: any) => p.areaPermitida === "VENTAS")),
    Cobranzas: filteredUsers.filter(u => u.rol !== "ADMIN" && u.permissions.some((p: any) => p.areaPermitida === "COBRANZAS")),
    Operativa: filteredUsers.filter(u => u.rol !== "ADMIN" && u.permissions.some((p: any) => p.areaPermitida === "TECNICO" || p.areaPermitida === "SOPORTE")),
    Logística: filteredUsers.filter(u => u.rol !== "ADMIN" && u.permissions.some((p: any) => p.areaPermitida === "STOCK" || p.areaPermitida === "LOGISTICA")),
    Otros: filteredUsers.filter(u => u.rol !== "ADMIN" && u.permissions.length === 0),
  };

  // Group users by Country
  const countriesList = ["AR", "ES", "CO", "NV"];
  const countryNameMap: Record<string, string> = {
    AR: "Argentina",
    ES: "España",
    CO: "Colombia",
    NV: "Neverland"
  };

  const usersByCountry: Record<string, any[]> = {};
  countriesList.forEach(code => {
    usersByCountry[countryNameMap[code]] = filteredUsers.filter(u => 
      u.rol === "ADMIN" || u.countries.some((c: any) => c.countryCode === code)
    );
  });

  return (
    <div className="w-full h-[calc(100vh-140px)] flex flex-col md:flex-row border border-border-custom bg-bg-card rounded-xl overflow-hidden shadow-2xl">
      {/* Sidebar - Pestaña Chats / Directorio */}
      <div className="w-full md:w-80 border-r border-border-custom flex flex-col shrink-0 bg-bg-subtle/30">
        {/* Pestañas */}
        <div className="flex border-b border-border-custom shrink-0">
          <button
            onClick={() => setActiveTab("chats")}
            className={`flex-1 py-3.5 text-xs uppercase font-bold tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "chats" ? "text-[#0078D7] border-b-2 border-[#0078D7] bg-bg-card/45" : "text-text-muted hover:text-text-primary"
            }`}
          >
            <MessageSquare className="w-4 h-4" /> Chats Activos
          </button>
          <button
            onClick={() => setActiveTab("directorio")}
            className={`flex-1 py-3.5 text-xs uppercase font-bold tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "directorio" ? "text-[#0078D7] border-b-2 border-[#0078D7] bg-bg-card/45" : "text-text-muted hover:text-text-primary"
            }`}
          >
            <Users className="w-4 h-4" /> Agenda
          </button>
        </div>

        {/* Buscador */}
        <div className="p-3 border-b border-border-custom bg-bg-card shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar compañero..."
              className="w-full bg-bg-subtle border border-border-custom rounded-md pl-9 pr-3 py-1.5 text-xs text-text-primary focus:border-[#0078D7] outline-none"
            />
          </div>
        </div>

        {/* Listado */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
          {activeTab === "chats" ? (
            filteredUsers.length > 0 ? (
              filteredUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => setSelectedUser(u)}
                  className={`w-full text-left p-2.5 rounded-lg flex items-center gap-3 transition-all cursor-pointer ${
                    selectedUser?.id === u.id
                      ? "bg-[#0078D7] text-white shadow-md font-bold"
                      : "hover:bg-bg-subtle text-text-secondary"
                  }`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center border shrink-0 font-bold ${
                    selectedUser?.id === u.id ? "bg-white/20 text-white border-white/30" : "bg-[#0078D7]/10 text-[#0078D7] border-[#0078D7]/20"
                  }`}>
                    {u.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`font-bold text-xs truncate ${selectedUser?.id === u.id ? "text-white" : "text-text-primary"}`}>{u.nombre}</p>
                    <p className={`text-[10px] truncate mt-0.5 uppercase tracking-wide font-semibold ${selectedUser?.id === u.id ? "text-white/80" : "text-text-muted"}`}>
                      {u.rol}
                    </p>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-8 text-center text-text-muted text-xs italic">
                No hay usuarios disponibles para chatear.
              </div>
            )
          ) : (
            /* DIRECTORIO / AGENDA CON ACORDEONES POR AREAS Y PAISES */
            <div className="space-y-4 p-1">
              {/* POR AREA */}
              <div>
                <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-[#0078D7]" /> Por Áreas y Roles
                </h4>
                <div className="space-y-2">
                  {Object.entries(usersByArea).map(([area, list]) => (
                    list.length > 0 && (
                      <div key={area} className="space-y-1">
                        <div className="text-[9px] font-bold text-text-muted uppercase bg-bg-subtle/50 px-2 py-0.5 rounded border border-border-custom/50">
                          {area} ({list.length})
                        </div>
                        {list.map((u) => (
                          <button
                            key={u.id}
                            onClick={() => { setSelectedUser(u); setActiveTab("chats"); }}
                            className={`w-full text-left pl-3 pr-2 py-1.5 rounded transition-colors text-xs flex items-center justify-between cursor-pointer ${
                              selectedUser?.id === u.id ? 'bg-[#0078D7] text-white font-bold' : 'hover:bg-bg-subtle text-text-secondary'
                            }`}
                          >
                            <span className="truncate pr-2 font-medium">{u.nombre}</span>
                            <span className="text-[9px] font-mono opacity-80">{u.rol}</span>
                          </button>
                        ))}
                      </div>
                    )
                  ))}
                </div>
              </div>

              {/* POR PAIS */}
              <div>
                <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1 pt-2 border-t border-border-custom/40">
                  <Globe className="w-3.5 h-3.5 text-emerald-500" /> Por Países
                </h4>
                <div className="space-y-2">
                  {Object.entries(usersByCountry).map(([country, list]) => (
                    list.length > 0 && (
                      <div key={country} className="space-y-1">
                        <div className="text-[9px] font-bold text-text-muted uppercase bg-bg-subtle/50 px-2 py-0.5 rounded border border-border-custom/50">
                          {country} ({list.length})
                        </div>
                        {list.map((u) => (
                          <button
                            key={u.id}
                            onClick={() => { setSelectedUser(u); setActiveTab("chats"); }}
                            className={`w-full text-left pl-3 pr-2 py-1.5 rounded transition-colors text-xs flex items-center justify-between cursor-pointer ${
                              selectedUser?.id === u.id ? 'bg-[#0078D7] text-white font-bold' : 'hover:bg-bg-subtle text-text-secondary'
                            }`}
                          >
                            <span className="truncate pr-2 font-medium">{u.nombre}</span>
                            <span className="text-[9px] font-mono opacity-80">{u.rol}</span>
                          </button>
                        ))}
                      </div>
                    )
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Ventana de Chat */}
      <div className="flex-1 flex flex-col bg-bg-main/20">
        {selectedUser ? (
          <>
            {/* Header del Chat */}
            <div className="p-3.5 border-b border-border-custom bg-bg-card flex items-center justify-between shrink-0 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#0078D7] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow">
                  {selectedUser.nombre.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-text-primary">{selectedUser.nombre}</h3>
                  <p className="text-[10px] text-text-muted mt-0.5 flex items-center gap-1.5 uppercase font-semibold">
                    <Shield className="w-3 h-3 text-[#0078D7]" /> {selectedUser.rol} | <Mail className="w-3 h-3" /> {selectedUser.correo}
                  </p>
                </div>
              </div>
            </div>

            {/* Listado de Mensajes */}
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 bg-bg-main/5 scrollbar-thin">
              {messages.length > 0 ? (
                messages.map((m) => {
                  const isMe = m.senderId === currentUser?.id;
                  return (
                    <div
                      key={m.id}
                      className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[75%] md:max-w-[65%] p-3 rounded-xl text-xs shadow-md leading-relaxed border ${
                          isMe
                            ? "bg-[#0078D7] text-white border-[#005a9e] rounded-br-none"
                            : "bg-bg-card text-text-primary border-border-custom rounded-bl-none"
                        }`}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                        <span
                          className={`text-[9px] block mt-1 text-right font-mono ${
                            isMe ? "text-white/80" : "text-text-muted"
                          }`}
                        >
                          {new Date(m.createdAt).toLocaleTimeString("es-AR", { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-text-muted text-xs italic space-y-2">
                  <MessageSquare className="w-8 h-8 opacity-30 text-[#0078D7]" />
                  <p>Inicia la conversación enviando un mensaje a <strong>{selectedUser.nombre}</strong>...</p>
                </div>
              )}
            </div>

            {/* Input de Mensajes */}
            <form onSubmit={handleSend} className="p-3 border-t border-border-custom bg-bg-card shrink-0 flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={`Escribe un mensaje para ${selectedUser.nombre}...`}
                className="flex-1 bg-bg-subtle border border-border-custom rounded-lg px-3.5 py-2.5 text-xs text-text-primary focus:border-[#0078D7] outline-none"
                required
              />
              <button
                type="submit"
                className="bg-[#0078D7] hover:bg-[#005a9e] text-white px-4 py-2.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 text-text-muted">
            <MessageSquare className="w-16 h-16 text-border-custom mb-4" />
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-2">Mensajería Interna</h3>
            <p className="max-w-md text-xs leading-relaxed">
              Selecciona a un compañero de la lista o desde la Agenda para iniciar un chat privado y seguro en tiempo real.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
