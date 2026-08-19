"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Users, MessageSquare, Search, Shield, Globe, User, Phone, Mail } from "lucide-react";
import { getMessages, sendMessage } from "@/actions/chat";
import { getUsersDirectory } from "@/actions/users";

export default function ChatPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"chats" | "directorio">("chats");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load current user from cookies
  useEffect(() => {
    const cookies = document.cookie.split("; ");
    const sessionCookie = cookies.find((row) => row.startsWith("sessionToken="));
    if (sessionCookie) {
      try {
        const token = sessionCookie.split("=")[1];
        const data = JSON.parse(atob(decodeURIComponent(token)));
        setCurrentUser(data);
      } catch (e) {
        console.error("Error decoding session:", e);
      }
    }
  }, []);

  // Fetch all users in the directory
  const loadDirectory = async () => {
    const res = await getUsersDirectory();
    if (res.success && res.users) {
      // Excluir al usuario actual de la lista del directorio
      setUsers(res.users);
    }
  };

  useEffect(() => {
    loadDirectory();
  }, [currentUser]);

  // Fetch messages between current user and selected user
  const fetchMessages = async () => {
    if (!selectedUser) return;
    const res = await getMessages(selectedUser.id);
    if (res.success && res.messages) {
      setMessages(res.messages);
    }
  };

  // Poll for messages when a chat is open
  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [selectedUser]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;
    const text = newMessage;
    setNewMessage(""); // Clear early for responsiveness

    const res = await sendMessage(selectedUser.id, text);
    if (res.success) {
      fetchMessages();
    } else {
      alert("Error al enviar mensaje: " + res.error);
    }
  };

  // Filter users based on query
  const filteredUsers = users.filter((u) => {
    if (currentUser && u.id === currentUser.id) return false;
    const matchName = u.nombre.toLowerCase().includes(searchQuery.toLowerCase());
    const matchEmail = u.correo.toLowerCase().includes(searchQuery.toLowerCase());
    return matchName || matchEmail;
  });

  // Group users by Area (Role or OperatorPermission)
  const usersByArea = {
    Administradores: filteredUsers.filter(u => u.rol === "ADMIN"),
    Ventas: filteredUsers.filter(u => u.rol !== "ADMIN" && u.permissions.some((p: any) => p.areaPermitida === "VENTAS")),
    Cobranzas: filteredUsers.filter(u => u.rol !== "ADMIN" && u.permissions.some((p: any) => p.areaPermitida === "COBRANZAS")),
    Operativa: filteredUsers.filter(u => u.rol !== "ADMIN" && u.permissions.some((p: any) => p.areaPermitida === "TECNICO" || p.areaPermitida === "SOPORTE")),
    Logística: filteredUsers.filter(u => u.rol !== "ADMIN" && u.permissions.some((p: any) => p.areaPermitida === "STOCK" || p.areaPermitida === "LOGISTICA")),
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

  // Unique list of users we have active chats with
  const activeChatsUsers = users.filter(u => {
    if (currentUser && u.id === currentUser.id) return false;
    // Just a placeholder for "active chat" - we can show all users or filter users
    // For simplicity, we show all users in active directory query, but sorted by last message.
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-140px)] flex flex-col md:flex-row border border-border-custom bg-bg-card rounded-xl overflow-hidden shadow-2xl">
      {/* Sidebar - Pestaña Chats / Directorio */}
      <div className="w-full md:w-80 border-r border-border-custom flex flex-col shrink-0 bg-bg-subtle/30">
        {/* Pestañas */}
        <div className="flex border-b border-border-custom shrink-0">
          <button
            onClick={() => setActiveTab("chats")}
            className={`flex-1 py-4 text-xs uppercase font-bold tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "chats" ? "text-[#0078D7] border-b-2 border-[#0078D7] bg-bg-card/45" : "text-text-muted hover:text-text-primary"
            }`}
          >
            <MessageSquare className="w-4 h-4" /> Chats Activos
          </button>
          <button
            onClick={() => setActiveTab("directorio")}
            className={`flex-1 py-4 text-xs uppercase font-bold tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "directorio" ? "text-[#0078D7] border-b-2 border-[#0078D7] bg-bg-card/45" : "text-text-muted hover:text-text-primary"
            }`}
          >
            <Users className="w-4 h-4" /> Agenda
          </button>
        </div>

        {/* Buscador */}
        <div className="p-4 border-b border-border-custom bg-bg-card shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar compañero..."
              className="w-full bg-bg-subtle border border-border-custom rounded-md pl-9 pr-4 py-2 text-xs text-text-primary focus:border-[#0078D7] outline-none"
            />
          </div>
        </div>

        {/* Listado */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {activeTab === "chats" ? (
            activeChatsUsers.length > 0 ? (
              activeChatsUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => setSelectedUser(u)}
                  className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors cursor-pointer ${
                    selectedUser?.id === u.id
                      ? "bg-[#0078D7]/10 text-text-primary border border-[#0078D7]/30"
                      : "hover:bg-bg-subtle/50 text-text-secondary"
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-[#0078D7]/10 text-[#0078D7] flex items-center justify-center border border-[#0078D7]/20 shrink-0 font-bold">
                    {u.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs truncate text-text-primary">{u.nombre}</p>
                    <p className="text-[10px] text-text-muted truncate mt-0.5 uppercase tracking-wide font-semibold">
                      {u.rol}
                    </p>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-8 text-center text-text-muted text-xs italic">
                No hay usuarios para chatear.
              </div>
            )
          ) : (
            /* DIRECTORIO / AGENDA CON ACORDEONES POR AREAS Y PAISES */
            <div className="space-y-4 p-2">
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
                            onClick={() => setSelectedUser(u)}
                            className="w-full text-left pl-3 pr-2 py-1.5 hover:bg-bg-subtle/40 rounded transition-colors text-xs text-text-secondary flex items-center justify-between cursor-pointer"
                          >
                            <span className="truncate pr-2 font-medium">{u.nombre}</span>
                            <span className="text-[9px] text-text-muted font-mono">{u.rol}</span>
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
                            onClick={() => setSelectedUser(u)}
                            className="w-full text-left pl-3 pr-2 py-1.5 hover:bg-bg-subtle/40 rounded transition-colors text-xs text-text-secondary flex items-center justify-between cursor-pointer"
                          >
                            <span className="truncate pr-2 font-medium">{u.nombre}</span>
                            <span className="text-[9px] text-text-muted font-mono">{u.rol}</span>
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
            <div className="p-4 border-b border-border-custom bg-bg-card flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#0078D7]/10 text-[#0078D7] flex items-center justify-center border border-[#0078D7]/20 font-bold shrink-0">
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
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-bg-main/5">
              {messages.length > 0 ? (
                messages.map((m) => {
                  const isMe = m.senderId === currentUser?.id;
                  return (
                    <div
                      key={m.id}
                      className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] p-3.5 rounded-xl text-xs shadow-md leading-relaxed border ${
                          isMe
                            ? "bg-[#0078D7] text-white border-[#005a9e] rounded-br-none"
                            : "bg-bg-card text-text-primary border-border-custom rounded-bl-none"
                        }`}
                      >
                        <p>{m.content}</p>
                        <span
                          className={`text-[9px] block mt-1.5 text-right font-medium ${
                            isMe ? "text-white/70" : "text-text-muted"
                          }`}
                        >
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="h-full flex items-center justify-center text-text-muted text-xs italic">
                  Escriba un mensaje para comenzar la conversación...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input de Mensajes */}
            <form onSubmit={handleSend} className="p-4 border-t border-border-custom bg-bg-card shrink-0 flex gap-3">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Escribe un mensaje aquí..."
                className="flex-1 bg-bg-subtle border border-border-custom rounded-lg px-4 py-3 text-xs text-text-primary focus:border-[#0078D7] outline-none"
                required
              />
              <button
                type="submit"
                className="bg-[#0078D7] hover:bg-[#005a9e] text-white p-3 rounded-lg transition-colors cursor-pointer flex items-center justify-center"
              >
                <Send className="w-4.5 h-4.5" />
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
