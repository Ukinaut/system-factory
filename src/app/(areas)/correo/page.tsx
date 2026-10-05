"use client";

import { useState, useEffect } from "react";
import { 
  Mail, 
  Send, 
  Inbox, 
  Settings, 
  X, 
  Search, 
  Plus, 
  RefreshCw, 
  Trash2, 
  Reply, 
  Forward, 
  CheckCircle2, 
  ShieldCheck, 
  Star,
  Key,
  AlertCircle,
  Paperclip,
  AtSign,
  LogOut,
  Sliders,
  FileText,
  Download,
  Filter,
  CheckCheck
} from "lucide-react";
import { 
  getMails, 
  sendMailAction, 
  getMailAccountSettings, 
  saveMailAccountSettings, 
  testGoogleWorkspaceConnection,
  markMailAsReadAction,
  toggleStarMailAction,
  deleteMailAction,
  unlinkGoogleAccount,
  saveGoogleOauthKeys,
  getGoogleOauthKeysStatus,
  AttachmentItem
} from "@/actions/mail";
import { getCurrentUserSession } from "@/actions/users";

function formatBytes(bytes: number = 0): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getAttachmentIcon(filename: string = "", contentType: string = "") {
  const ext = filename.split('.').pop()?.toLowerCase() || "";
  if (ext === "pdf" || contentType.includes("pdf")) return <FileText className="w-5 h-5 text-red-400" />;
  if (["xls", "xlsx", "csv"].includes(ext) || contentType.includes("excel") || contentType.includes("spreadsheet"))
    return <FileText className="w-5 h-5 text-emerald-400" />;
  if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext) || contentType.includes("image"))
    return <FileText className="w-5 h-5 text-purple-400" />;
  return <Paperclip className="w-5 h-5 text-blue-400" />;
}

export default function GmailPage() {
  const [session, setSession] = useState<any>(null);
  const [activeFolder, setActiveFolder] = useState<"INBOX" | "STARRED" | "SENT" | "LINK">("INBOX");
  const [quickFilter, setQuickFilter] = useState<"ALL" | "UNREAD" | "STARRED" | "HAS_ATTACHMENTS">("ALL");
  const [inbox, setInbox] = useState<any[]>([]);
  const [sent, setSent] = useState<any[]>([]);
  const [selectedMail, setSelectedMail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isComposing, setIsComposing] = useState(false);

  // Compose Form & Attachments
  const [composeData, setComposeData] = useState({
    to: "",
    subject: "",
    body: ""
  });
  const [attachedFiles, setAttachedFiles] = useState<AttachmentItem[]>([]);
  const [sending, setSending] = useState(false);

  // Google Account Settings
  const [accountSettings, setAccountSettings] = useState({
    provider: "GOOGLE_WORKSPACE",
    email: "",
    displayName: "",
    googlePicture: "",
    appPassword: "",
    smtpHost: "smtp.gmail.com",
    smtpPort: 465,
    isLinked: false
  });
  const [testingConn, setTestingConn] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);
  const [savingAccount, setSavingAccount] = useState(false);

  // OAuth Keys Form State
  const [showOauthKeysForm, setShowOauthKeysForm] = useState(false);
  const [oauthKeys, setOauthKeys] = useState({ clientId: "", clientSecret: "" });

  // Toast feedback
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    // Detect URL query params for Google OAuth feedback
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("google_linked") === "success") {
        showToast("success", "¡Felicidades! Tu cuenta de Gmail se ha vinculado correctamente mediante Google OAuth.");
      } else if (params.get("error") === "google_keys_missing") {
        showToast("error", "Se requieren las claves Google Client ID y Client Secret para habilitar el inicio de sesión OAuth. Ingrésalas abajo.");
        setActiveFolder("LINK");
        setShowOauthKeysForm(true);
      } else if (params.get("error")) {
        showToast("error", "Ocurrió un inconveniente al vincular con Google: " + params.get("error"));
      }
    }

    getCurrentUserSession().then(res => {
      if (res.success && res.session) {
        setSession(res.session);
        setAccountSettings(prev => ({
          ...prev,
          email: res.session.correo || "",
          displayName: res.session.nombre || ""
        }));
      }
    });
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [mailsRes, accRes, oauthStatus] = await Promise.all([
      getMails(),
      getMailAccountSettings(),
      getGoogleOauthKeysStatus()
    ]);

    if (mailsRes.success) {
      setInbox(mailsRes.inbox || []);
      setSent(mailsRes.sent || []);
      if (mailsRes.inbox && mailsRes.inbox.length > 0 && !selectedMail) {
        setSelectedMail(mailsRes.inbox[0]);
      }
    }

    if (accRes.success && accRes.account) {
      setAccountSettings(prev => ({ ...prev, ...accRes.account }));
    }

    if (oauthStatus && (oauthStatus.clientId || oauthStatus.clientSecret)) {
      setOauthKeys({ clientId: oauthStatus.clientId, clientSecret: oauthStatus.clientSecret });
    }

    setLoading(false);
  };

  // Archivos Adjuntos Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const filePromises = Array.from(files).map((file) => {
      return new Promise<AttachmentItem>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            filename: file.name,
            content: reader.result as string,
            contentType: file.type || "application/octet-stream",
            size: file.size
          });
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(filePromises).then((newFiles) => {
      setAttachedFiles((prev) => [...prev, ...newFiles]);
    });
  };

  // Iniciar Sesión con Google OAuth
  const handleGoogleOAuthLogin = async () => {
    const status = await getGoogleOauthKeysStatus();
    if (status.hasKeys) {
      window.location.href = "/api/auth/google";
    } else {
      showToast("error", "Se requieren configurar las claves de aplicación Google Client ID y Client Secret.");
      setActiveFolder("LINK");
      setShowOauthKeysForm(true);
      if (status.clientId) {
        setOauthKeys({ clientId: status.clientId, clientSecret: status.clientSecret });
      }
    }
  };

  // Desvincular Cuenta Google
  const handleUnlinkGoogle = async () => {
    if (!confirm("¿Seguro que deseas cerrar sesión y desvincular tu cuenta de Gmail?")) return;
    const res = await unlinkGoogleAccount();
    if (res.success) {
      showToast("success", "Cuenta de Google desvinculada.");
      fetchData();
    } else {
      showToast("error", res.error || "Error al desvincular.");
    }
  };

  // Guardar Claves OAuth Personalizadas
  const handleSaveOauthKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await saveGoogleOauthKeys(oauthKeys);
    if (res.success) {
      showToast("success", "Claves de Google OAuth guardadas correctamente.");
      setShowOauthKeysForm(false);
    } else {
      showToast("error", res.error || "Error al guardar claves.");
    }
  };

  // Redactar / Enviar
  const handleSendMail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeData.to || !composeData.subject || !composeData.body) {
      showToast("error", "Por favor completa el destinatario, asunto y mensaje.");
      return;
    }

    setSending(true);
    const res = await sendMailAction({
      to: composeData.to,
      subject: composeData.subject,
      body: composeData.body,
      fromName: accountSettings.displayName,
      attachments: attachedFiles
    });
    setSending(false);

    if (res.success) {
      showToast("success", res.simulated ? "Correo enviado con adjuntos (Modo simulación)" : "Correo enviado con éxito por Gmail / Google Workspace");
      setComposeData({ to: "", subject: "", body: "" });
      setAttachedFiles([]);
      setIsComposing(false);
      setActiveFolder("SENT");
      fetchData();
    } else {
      showToast("error", res.error || "Error al enviar el correo.");
    }
  };

  // Probar Conexión con Google
  const handleTestConnection = async () => {
    setTestingConn(true);
    setTestResult(null);
    const res = await testGoogleWorkspaceConnection({
      email: accountSettings.email,
      appPassword: accountSettings.appPassword,
      smtpHost: accountSettings.smtpHost,
      smtpPort: accountSettings.smtpPort
    });
    setTestingConn(false);
    setTestResult(res);
  };

  // Guardar Vinculación Directa por Contraseña de Aplicación
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAccount(true);
    const res = await saveMailAccountSettings(accountSettings);
    setSavingAccount(false);

    if (res.success) {
      showToast("success", "Cuenta de Google vinculada exitosamente a tu usuario.");
      setActiveFolder("INBOX");
      fetchData();
    } else {
      showToast("error", res.error || "Error al vincular cuenta de Google.");
    }
  };

  // Acciones sobre Correos
  const handleToggleStar = async (mailId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleStarMailAction(mailId);
    setInbox(prev => prev.map(m => m.id === mailId ? { ...m, isStarred: !m.isStarred } : m));
  };

  const handleDeleteMail = async (mailId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm("¿Eliminar este mensaje?")) return;
    await deleteMailAction(mailId);
    setInbox(prev => prev.filter(m => m.id !== mailId));
    setSent(prev => prev.filter(m => m.id !== mailId));
    if (selectedMail?.id === mailId) {
      setSelectedMail(null);
    }
    showToast("success", "Correo movido a la papelera.");
  };

  const handleSelectMail = (mail: any) => {
    setSelectedMail(mail);
    if (!mail.isRead) {
      markMailAsReadAction(mail.id);
      setInbox(prev => prev.map(m => m.id === mail.id ? { ...m, isRead: true } : m));
    }
  };

  const handleMarkAllRead = () => {
    setInbox(prev => prev.map(m => ({ ...m, isRead: true })));
    showToast("success", "Todos los mensajes marcados como leídos.");
  };

  // Filtrado de correos por carpeta, filtros rápidos y búsqueda
  let currentList: any[] = [];
  if (activeFolder === "INBOX") currentList = inbox;
  else if (activeFolder === "SENT") currentList = sent;
  else if (activeFolder === "STARRED") currentList = inbox.filter(m => m.isStarred);

  const filteredMails = currentList.filter(m => {
    const matchesSearch = 
      (m.subject || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.fromName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.fromEmail || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.body || "").toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (quickFilter === "UNREAD") return !m.isRead;
    if (quickFilter === "STARRED") return m.isStarred;
    if (quickFilter === "HAS_ATTACHMENTS") return m.attachments && m.attachments.length > 0;
    return true;
  });

  const unreadCount = inbox.filter(m => !m.isRead).length;

  return (
    <div className="w-full h-[calc(100vh-5rem)] flex flex-col bg-bg-card border border-border-custom rounded-2xl shadow-2xl overflow-hidden">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border text-xs font-bold animate-in slide-in-from-top-5 ${
          toast.type === "success"
            ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
            : "bg-red-500/20 border-red-500/50 text-red-300"
        }`}>
          {toast.type === "success" ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-red-400" />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* GMAIL HEADER */}
      <div className="bg-bg-subtle border-b border-border-custom px-6 py-3.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-red-500 via-yellow-500 to-blue-500 p-0.5 shadow-md flex items-center justify-center">
              <div className="w-full h-full bg-bg-card rounded-[10px] flex items-center justify-center">
                <Mail className="w-5 h-5 text-red-500" />
              </div>
            </div>
            <div>
              <h1 className="text-base font-extrabold text-text-primary tracking-tight flex items-center gap-2">
                Gmail & Google Workspace Client
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 uppercase font-bold">
                  {accountSettings.isLinked ? "Sesión Abierta" : "Desconectado"}
                </span>
              </h1>
              <p className="text-xs text-text-muted">
                {accountSettings.email || session?.correo || "Vincular cuenta propia de Google Gmail"}
              </p>
            </div>
          </div>
        </div>

        {/* Buscador Gmail */}
        <div className="flex-1 max-w-xl mx-8 relative hidden sm:block">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar en el correo (remitente, asunto, contenido o adjuntos)..."
            className="w-full bg-bg-card border border-border-custom rounded-xl pl-10 pr-4 py-2 text-xs text-text-primary focus:border-[#0078D7] outline-none shadow-inner"
          />
        </div>

        {/* Acciones del Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 bg-bg-card hover:bg-border-custom/50 border border-border-custom text-text-primary rounded-xl transition-all cursor-pointer shadow-sm"
            title="Actualizar bandeja"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0078D7]' : ''}`} />
          </button>
          <button
            onClick={() => setIsComposing(true)}
            className="bg-gradient-to-r from-red-500 to-blue-600 hover:from-red-600 hover:to-blue-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer hover:scale-105"
          >
            <Plus className="w-4 h-4" /> Redactar Correo
          </button>
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* SIDEBAR DE CARPETAS (Estilo Gmail) */}
        <div className="w-64 bg-bg-sidebar border-r border-border-custom p-4 flex flex-col justify-between shrink-0">
          <div className="space-y-2">
            <button
              onClick={() => setIsComposing(true)}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 px-4 rounded-xl font-extrabold text-xs tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all mb-4"
            >
              <Plus className="w-4 h-4" /> Redactar Correo
            </button>

            <p className="text-[10px] font-extrabold uppercase tracking-widest text-text-muted px-3 mb-1">
              Bandejas Gmail
            </p>

            <button
              onClick={() => { setActiveFolder("INBOX"); setIsComposing(false); }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeFolder === "INBOX" && !isComposing
                  ? "bg-[#0078D7] text-white shadow-md"
                  : "text-text-secondary hover:bg-bg-subtle hover:text-text-primary"
              }`}
            >
              <div className="flex items-center gap-3">
                <Inbox className="w-4 h-4" />
                <span>Bandeja de Entrada</span>
              </div>
              {unreadCount > 0 && (
                <span className="bg-white/20 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => { setActiveFolder("STARRED"); setIsComposing(false); }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeFolder === "STARRED" && !isComposing
                  ? "bg-[#0078D7] text-white shadow-md"
                  : "text-text-secondary hover:bg-bg-subtle hover:text-text-primary"
              }`}
            >
              <div className="flex items-center gap-3">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                <span>Destacados</span>
              </div>
              <span className="text-[10px] font-mono text-text-muted">{inbox.filter(m => m.isStarred).length}</span>
            </button>

            <button
              onClick={() => { setActiveFolder("SENT"); setIsComposing(false); }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeFolder === "SENT" && !isComposing
                  ? "bg-[#0078D7] text-white shadow-md"
                  : "text-text-secondary hover:bg-bg-subtle hover:text-text-primary"
              }`}
            >
              <div className="flex items-center gap-3">
                <Send className="w-4 h-4" />
                <span>Enviados</span>
              </div>
              <span className="text-[10px] font-mono text-text-muted">{sent.length}</span>
            </button>

            <div className="pt-4">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-text-muted px-3 mb-1">
                Cuenta de Google
              </p>
              <button
                onClick={() => { setActiveFolder("LINK"); setIsComposing(false); }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeFolder === "LINK" && !isComposing
                    ? "bg-[#0078D7] text-white shadow-md"
                    : "text-text-secondary hover:bg-bg-subtle hover:text-text-primary"
                }`}
              >
                <Settings className="w-4 h-4 text-emerald-400" />
                <span>Vincular Google / Gmail</span>
              </button>
            </div>
          </div>

          {/* Tarjeta de estado de sesión de Google */}
          <div className="bg-bg-card border border-border-custom rounded-xl p-3.5 space-y-2 shadow-sm">
            <div className="flex items-center gap-2">
              {accountSettings.googlePicture ? (
                <img src={accountSettings.googlePicture} alt="Google Avatar" className="w-5 h-5 rounded-full border border-emerald-400" />
              ) : (
                <ShieldCheck className={`w-4 h-4 ${accountSettings.isLinked ? "text-emerald-400" : "text-yellow-400"}`} />
              )}
              <span className="text-xs font-bold text-text-primary truncate">
                {accountSettings.isLinked ? "Google OAuth Activo" : "Google No Vinculado"}
              </span>
            </div>
            <p className="text-[11px] text-text-muted truncate font-mono">
              {accountSettings.email || "Sin casilla configurada"}
            </p>
          </div>
        </div>

        {/* CONTENIDO PRINCIPAL: LISTADO Y LECTOR DE CORREOS */}
        {activeFolder !== "LINK" && !isComposing && (
          <div className="flex-1 flex overflow-hidden">
            
            {/* COLUMNA CENTRAL: LISTA DE MENSAJES CON FILTROS CÓMODOS */}
            <div className="w-96 border-r border-border-custom flex flex-col bg-bg-card shrink-0">
              
              {/* Encabezado Lista & Filtros de Navegación Cómoda */}
              <div className="p-3 border-b border-border-custom bg-bg-subtle/50 space-y-2 shrink-0">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-extrabold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-[#0078D7]" />
                    {activeFolder === "INBOX" && "Bandeja de Entrada"}
                    {activeFolder === "STARRED" && "Correos Destacados"}
                    {activeFolder === "SENT" && "Correos Enviados"}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[10px] font-bold text-text-muted hover:text-[#0078D7] flex items-center gap-1 transition-colors cursor-pointer"
                      title="Marcar todo como leído"
                    >
                      <CheckCheck className="w-3.5 h-3.5" /> Leídos
                    </button>
                    <span className="text-[10px] font-mono text-text-muted font-bold bg-bg-card px-2 py-0.5 rounded border border-border-custom">
                      {filteredMails.length}
                    </span>
                  </div>
                </div>

                {/* Filtros Rápidos (Pills) */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px] font-bold">
                  <button
                    onClick={() => setQuickFilter("ALL")}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      quickFilter === "ALL"
                        ? "bg-[#0078D7] text-white shadow-sm"
                        : "bg-bg-card border border-border-custom text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setQuickFilter("UNREAD")}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      quickFilter === "UNREAD"
                        ? "bg-[#0078D7] text-white shadow-sm"
                        : "bg-bg-card border border-border-custom text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    Sin leer ({inbox.filter(m => !m.isRead).length})
                  </button>
                  <button
                    onClick={() => setQuickFilter("STARRED")}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      quickFilter === "STARRED"
                        ? "bg-[#0078D7] text-white shadow-sm"
                        : "bg-bg-card border border-border-custom text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    Destacados
                  </button>
                  <button
                    onClick={() => setQuickFilter("HAS_ATTACHMENTS")}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                      quickFilter === "HAS_ATTACHMENTS"
                        ? "bg-[#0078D7] text-white shadow-sm"
                        : "bg-bg-card border border-border-custom text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    <Paperclip className="w-3 h-3" /> Con Adjuntos
                  </button>
                </div>
              </div>

              {/* Lista Scrollable de Correos */}
              <div className="flex-1 overflow-y-auto divide-y divide-border-custom/50">
                {loading ? (
                  <div className="py-16 text-center text-xs text-text-muted flex flex-col items-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-[#0078D7]" />
                    <span>Conectando a servidores de Google Gmail...</span>
                  </div>
                ) : filteredMails.length > 0 ? (
                  filteredMails.map((mail) => {
                    const isSelected = selectedMail?.id === mail.id;
                    const hasAttachments = mail.attachments && mail.attachments.length > 0;

                    return (
                      <div
                        key={mail.id}
                        onClick={() => handleSelectMail(mail)}
                        className={`p-3.5 cursor-pointer transition-all relative flex flex-col space-y-1.5 ${
                          isSelected
                            ? "bg-[#0078D7]/10 border-l-4 border-[#0078D7] text-text-primary"
                            : mail.isRead
                            ? "bg-bg-card hover:bg-bg-subtle text-text-secondary"
                            : "bg-bg-subtle/80 text-text-primary font-bold hover:bg-bg-subtle"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 truncate pr-2">
                            <button
                              onClick={(e) => handleToggleStar(mail.id, e)}
                              className="text-text-muted hover:text-yellow-400 transition-colors"
                            >
                              <Star className={`w-3.5 h-3.5 ${mail.isStarred ? "text-yellow-400 fill-yellow-400" : ""}`} />
                            </button>
                            <span className="text-xs font-bold truncate">
                              {activeFolder === "SENT" ? `Para: ${mail.toEmail}` : mail.fromName || mail.fromEmail}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {!mail.isRead && (
                              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" title="No leído" />
                            )}
                            <span className="text-[10px] text-text-muted font-mono">
                              {new Date(mail.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        </div>

                        <h4 className={`text-xs truncate ${!mail.isRead ? "font-extrabold text-[#0078D7]" : "font-semibold"}`}>
                          {mail.subject}
                        </h4>

                        <p className="text-[11px] text-text-muted line-clamp-1 leading-snug font-normal">
                          {mail.body}
                        </p>

                        <div className="pt-1 flex items-center justify-between">
                          {mail.badge ? (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30 uppercase font-mono">
                              {mail.badge}
                            </span>
                          ) : <span />}

                          {hasAttachments && (
                            <span className="text-[10px] text-[#0078D7] font-bold flex items-center gap-1 bg-[#0078D7]/10 px-2 py-0.5 rounded border border-[#0078D7]/30">
                              <Paperclip className="w-3 h-3" />
                              {mail.attachments.length} adjunto(s)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-16 text-center text-xs text-text-muted italic space-y-1">
                    <p>No se encontraron mensajes en esta vista.</p>
                    {quickFilter !== "ALL" && (
                      <button
                        onClick={() => setQuickFilter("ALL")}
                        className="text-[11px] text-[#0078D7] hover:underline font-bold"
                      >
                        Limpiar filtros
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* COLUMNA DERECHA: LECTOR DE CORREO COMPLETO Y ADJUNTOS */}
            <div className="flex-1 flex flex-col bg-bg-sidebar overflow-hidden">
              {selectedMail ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Action Header */}
                  <div className="p-4 border-b border-border-custom bg-bg-card flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setComposeData({
                            to: selectedMail.fromEmail,
                            subject: `RE: ${selectedMail.subject}`,
                            body: `\n\n------------------------------\nDe: ${selectedMail.fromName} <${selectedMail.fromEmail}>\nFecha: ${new Date(selectedMail.createdAt).toLocaleString()}\nAsunto: ${selectedMail.subject}\n\n${selectedMail.body}`
                          });
                          setIsComposing(true);
                        }}
                        className="px-4 py-2 bg-[#0078D7] hover:bg-[#005a9e] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                      >
                        <Reply className="w-3.5 h-3.5" /> Responder
                      </button>

                      <button
                        onClick={() => {
                          setComposeData({
                            to: "",
                            subject: `RV: ${selectedMail.subject}`,
                            body: `\n\n---------- Mensaje reenviado ----------\nDe: ${selectedMail.fromName} <${selectedMail.fromEmail}>\nFecha: ${new Date(selectedMail.createdAt).toLocaleString()}\nAsunto: ${selectedMail.subject}\n\n${selectedMail.body}`
                          });
                          setIsComposing(true);
                        }}
                        className="px-4 py-2 bg-bg-subtle hover:bg-border-custom/50 text-text-primary border border-border-custom rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Forward className="w-3.5 h-3.5" /> Reenviar
                      </button>

                      <button
                        onClick={() => handleDeleteMail(selectedMail.id)}
                        className="p-2 text-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
                        title="Eliminar mensaje"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <span className="text-xs text-text-muted font-mono">
                      {new Date(selectedMail.createdAt).toLocaleString()}
                    </span>
                  </div>

                  {/* Visualizador de Contenido del Correo */}
                  <div className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6">
                    <div className="border-b border-border-custom pb-6 space-y-4">
                      <h2 className="text-xl md:text-2xl font-extrabold text-text-primary leading-tight">
                        {selectedMail.subject}
                      </h2>

                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-blue-600 text-white font-extrabold flex items-center justify-center text-sm shadow-md">
                          {selectedMail.fromName ? selectedMail.fromName.slice(0, 2).toUpperCase() : "GW"}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-text-primary flex items-center gap-2">
                            {selectedMail.fromName}
                            <span className="text-xs font-mono font-normal text-text-muted">&lt;{selectedMail.fromEmail}&gt;</span>
                          </p>
                          <p className="text-xs text-text-muted font-mono">Para: {selectedMail.toEmail}</p>
                        </div>
                      </div>
                    </div>

                    {/* Cuerpo del Correo */}
                    <div className="bg-bg-card border border-border-custom p-6 md:p-8 rounded-2xl text-xs sm:text-sm leading-relaxed text-text-primary space-y-4 shadow-lg font-sans">
                      {selectedMail.body.split("\n").map((p: string, idx: number) => (
                        <p key={idx}>{p}</p>
                      ))}
                    </div>

                    {/* ARCHIVOS ADJUNTOS DEL CORREO */}
                    {selectedMail.attachments && selectedMail.attachments.length > 0 && (
                      <div className="bg-bg-card border border-border-custom rounded-2xl p-5 space-y-3 shadow-md">
                        <div className="flex items-center justify-between border-b border-border-custom pb-3">
                          <h4 className="text-xs font-extrabold text-text-primary flex items-center gap-2 uppercase tracking-wider">
                            <Paperclip className="w-4 h-4 text-[#0078D7]" />
                            Archivos Adjuntos ({selectedMail.attachments.length})
                          </h4>
                          <span className="text-[10px] text-text-muted font-mono">
                            Total: {formatBytes(selectedMail.attachments.reduce((acc: number, a: any) => acc + (a.size || 0), 0))}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          {selectedMail.attachments.map((att: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between bg-bg-subtle p-3 rounded-xl border border-border-custom hover:border-[#0078D7]/40 transition-all">
                              <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-9 h-9 rounded-lg bg-bg-card border border-border-custom flex items-center justify-center shrink-0">
                                  {getAttachmentIcon(att.filename, att.contentType)}
                                </div>
                                <div className="truncate">
                                  <p className="text-xs font-bold text-text-primary truncate">{att.filename}</p>
                                  <p className="text-[10px] text-text-muted font-mono">{formatBytes(att.size)}</p>
                                </div>
                              </div>
                              
                              <a
                                href={att.content?.startsWith("data:") ? att.content : "#"}
                                download={att.filename}
                                target="_blank"
                                rel="noreferrer"
                                className="p-2 bg-bg-card hover:bg-[#0078D7] hover:text-white text-text-primary border border-border-custom rounded-lg transition-all cursor-pointer shrink-0 ml-2"
                                title="Descargar archivo adjunto"
                              >
                                <Download className="w-4 h-4" />
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-text-muted text-xs italic space-y-3">
                  <Mail className="w-10 h-10 text-[#0078D7] opacity-30" />
                  <p>Selecciona un correo de la bandeja para leer su contenido y adjuntos.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* COMPOSER: REDACTAR CORREO NUEVO CON ADJUNTOS */}
        {isComposing && (
          <div className="flex-1 flex flex-col bg-bg-sidebar p-6 overflow-y-auto">
            <div className="max-w-3xl mx-auto w-full bg-bg-card border border-border-custom rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
              <div className="flex justify-between items-center border-b border-border-custom pb-4">
                <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <Send className="w-5 h-5 text-red-500" />
                  Nuevo Mensaje de Correo Gmail / Google Workspace
                </h3>
                <button
                  onClick={() => setIsComposing(false)}
                  className="text-text-muted hover:text-text-primary p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSendMail} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Para (Destinatario):</label>
                  <div className="relative">
                    <AtSign className="w-4 h-4 absolute left-3.5 top-3 text-text-muted" />
                    <input
                      type="email"
                      required
                      value={composeData.to}
                      onChange={e => setComposeData({ ...composeData, to: e.target.value })}
                      placeholder="cliente@empresa.com"
                      className="w-full bg-bg-subtle border border-border-custom rounded-xl pl-10 pr-4 py-2.5 text-xs text-text-primary focus:border-[#0078D7] outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Asunto:</label>
                  <input
                    type="text"
                    required
                    value={composeData.subject}
                    onChange={e => setComposeData({ ...composeData, subject: e.target.value })}
                    placeholder="Ej: Presupuesto y disponibilidad de terminales satelitales Starlink"
                    className="w-full bg-bg-subtle border border-border-custom rounded-xl px-4 py-2.5 text-xs text-text-primary focus:border-[#0078D7] outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Mensaje:</label>
                  <textarea
                    required
                    rows={8}
                    value={composeData.body}
                    onChange={e => setComposeData({ ...composeData, body: e.target.value })}
                    placeholder="Escribe aquí tu mensaje de correo corporativo..."
                    className="w-full bg-bg-subtle border border-border-custom rounded-xl p-4 text-xs text-text-primary focus:border-[#0078D7] outline-none leading-relaxed font-sans"
                  />
                </div>

                {/* ADJUNTAR ARCHIVOS / DOCUMENTOS */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-[#0078D7]" />
                      Adjuntar Documentos / Archivos:
                    </label>
                    <label className="text-xs text-[#0078D7] font-bold hover:underline cursor-pointer flex items-center gap-1 bg-[#0078D7]/10 px-3 py-1 rounded-lg border border-[#0078D7]/30 transition-all">
                      <Plus className="w-3.5 h-3.5" /> Seleccionar archivos
                      <input
                        type="file"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {attachedFiles.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-bg-subtle border border-border-custom rounded-xl">
                      {attachedFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-bg-card p-2.5 rounded-lg border border-border-custom shadow-sm">
                          <div className="flex items-center gap-2 truncate pr-2">
                            {getAttachmentIcon(file.filename, file.contentType)}
                            <div className="truncate">
                              <p className="text-xs font-bold text-text-primary truncate">{file.filename}</p>
                              <p className="text-[10px] text-text-muted font-mono">{formatBytes(file.size)}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))}
                            className="text-text-muted hover:text-red-400 p-1 cursor-pointer shrink-0"
                            title="Quitar archivo adjunto"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-border-custom rounded-xl p-4 text-center text-xs text-text-muted hover:border-[#0078D7]/50 transition-all bg-bg-subtle/30">
                      <p>Selecciona documentos (PDF, Excel, Word, imágenes) para incluir en este envío.</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-custom">
                  <button
                    type="button"
                    onClick={() => { setIsComposing(false); setAttachedFiles([]); }}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-text-muted hover:bg-bg-subtle transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={sending}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-red-500 to-blue-600 hover:from-red-600 hover:to-blue-700 text-white shadow-lg transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    {sending ? "Enviando..." : "Enviar desde Google Gmail"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB VINCULACIÓN CUENTA GOOGLE OAUTH 2.0 */}
        {activeFolder === "LINK" && !isComposing && (
          <div className="flex-1 flex flex-col bg-bg-sidebar p-6 md:p-8 overflow-y-auto">
            <div className="max-w-2xl mx-auto w-full space-y-6">
              
              {/* SECCIÓN 1: VINCULACIÓN OFICIAL CON GOOGLE OAUTH 2.0 */}
              <div className="bg-bg-card border border-blue-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
                <div className="absolute -top-16 -right-16 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="border-b border-border-custom pb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-extrabold text-text-primary flex items-center gap-2">
                      <ShieldCheck className="w-6 h-6 text-blue-400" />
                      Vinculación Oficial de Cuenta Google (Gmail OAuth 2.0)
                    </h3>
                    <p className="text-xs text-text-muted mt-1">
                      Cada usuario inicia sesión en Google con su cuenta propia para vincular su casilla y mantener la sesión abierta de forma permanente.
                    </p>
                  </div>
                </div>

                {/* Si el usuario ya está vinculado mediante Google OAuth */}
                {accountSettings.isLinked ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center gap-4">
                      {accountSettings.googlePicture ? (
                        <img src={accountSettings.googlePicture} alt="Avatar Google" className="w-14 h-14 rounded-full border-2 border-emerald-400 shadow-md" />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xl border border-emerald-500/40">
                          {accountSettings.displayName ? accountSettings.displayName.slice(0, 2).toUpperCase() : "G"}
                        </div>
                      )}

                      <div className="space-y-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          ✓ Sesión de Gmail Conectada y Abierta
                        </span>
                        <h4 className="text-base font-bold text-text-primary">{accountSettings.displayName}</h4>
                        <p className="text-xs text-text-muted font-mono">{accountSettings.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-emerald-500/20 text-xs">
                      <span className="text-emerald-300/80 text-[11px]">
                        Los correos entrantes y salientes se sincronizan de forma segura con los servidores de Google.
                      </span>

                      <button
                        onClick={handleUnlinkGoogle}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <LogOut className="w-4 h-4" /> Desvincular Cuenta
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Botón Oficial de Iniciar Sesión con Google */
                  <div className="space-y-4 text-center py-4">
                    <p className="text-xs text-text-muted max-w-md mx-auto leading-relaxed">
                      Haz clic en el botón a continuación para ingresar a tu cuenta de Google en la ventana oficial de inicio de sesión de Gmail.
                    </p>

                    <button
                      onClick={handleGoogleOAuthLogin}
                      className="inline-flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 px-6 py-3.5 rounded-2xl font-bold text-sm shadow-xl hover:scale-105 transition-all cursor-pointer"
                    >
                      {/* Logo oficial multi-color de Google */}
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.3 7.31 24 12 24z"/>
                        <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.18 0 9.99 0 12s.46 3.82 1.26 5.42l4.02-3.15z"/>
                        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                      </svg>
                      Iniciar Sesión y Vincular con Google (Gmail OAuth 2.0)
                    </button>

                    <p className="text-[10px] text-text-muted italic">
                      Google OAuth 2.0 mantendrá tu sesión activa de manera segura y autorizada.
                    </p>
                  </div>
                )}
              </div>

              {/* SECCIÓN 2: MODO ALTERNATIVO CON CONTRASEÑA DE APLICACIÓN GOOGLE / SMTP */}
              <div className="bg-bg-card border border-border-custom rounded-2xl p-6 sm:p-8 shadow-xl space-y-5">
                <div className="border-b border-border-custom pb-3 flex justify-between items-center">
                  <h4 className="text-sm font-bold text-text-primary flex items-center gap-2">
                    <Key className="w-4 h-4 text-yellow-400" />
                    Método Alternativo: Contraseña de Aplicación de Google / SMTP
                  </h4>
                </div>

                <form onSubmit={handleSaveSettings} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Nombre del Remitente:</label>
                    <input
                      type="text"
                      required
                      value={accountSettings.displayName}
                      onChange={e => setAccountSettings({ ...accountSettings, displayName: e.target.value })}
                      placeholder="Ej: Aitue Cominca - Soporte Técnico"
                      className="w-full bg-bg-subtle border border-border-custom rounded-xl px-4 py-2 text-xs text-text-primary focus:border-[#0078D7] outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Correo Electrónico de Google / Gmail:</label>
                    <input
                      type="email"
                      required
                      value={accountSettings.email}
                      onChange={e => setAccountSettings({ ...accountSettings, email: e.target.value })}
                      placeholder="usuario@gmail.com o ventas@tuempresa.com"
                      className="w-full bg-bg-subtle border border-border-custom rounded-xl px-4 py-2 text-xs text-text-primary focus:border-[#0078D7] outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Contraseña de Aplicación de Google (16 caracteres):</label>
                    <input
                      type="password"
                      value={accountSettings.appPassword}
                      onChange={e => setAccountSettings({ ...accountSettings, appPassword: e.target.value })}
                      placeholder="xxxx xxxx xxxx xxxx"
                      className="w-full bg-bg-subtle border border-border-custom rounded-xl px-4 py-2 text-xs text-text-primary focus:border-[#0078D7] outline-none font-mono"
                    />
                  </div>

                  {testResult && (
                    <div className={`p-3 rounded-xl border text-xs font-bold ${
                      testResult.success
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        : "bg-red-500/10 border-red-500/30 text-red-400"
                    }`}>
                      {testResult.success ? (
                        <p className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 shrink-0" /> {testResult.message}
                        </p>
                      ) : (
                        <p className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0" /> {testResult.error}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="pt-2 flex justify-between items-center">
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={testingConn}
                      className="px-4 py-2 rounded-xl bg-bg-subtle hover:bg-border-custom/50 text-text-primary border border-border-custom text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${testingConn ? 'animate-spin text-[#0078D7]' : ''}`} />
                      {testingConn ? "Verificando..." : "Probar Conexión SMTP"}
                    </button>

                    <button
                      type="submit"
                      disabled={savingAccount}
                      className="px-5 py-2 rounded-xl bg-[#0078D7] hover:bg-[#005a9e] text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-2"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      {savingAccount ? "Guardando..." : "Guardar Credenciales"}
                    </button>
                  </div>
                </form>
              </div>

              {/* OPCIONAL: CONFIGURAR CLAVES OAUTH DE GOOGLE (Para Administrador) */}
              <div className="text-center">
                <button
                  onClick={() => setShowOauthKeysForm(!showOauthKeysForm)}
                  className="text-xs text-text-muted hover:text-text-primary underline cursor-pointer inline-flex items-center gap-1"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  {showOauthKeysForm ? "Ocultar configuración de claves OAuth de Google" : "Configurar Client ID / Secret de Google OAuth 2.0 (Administrador)"}
                </button>

                {showOauthKeysForm && (
                  <form onSubmit={handleSaveOauthKeys} className="mt-4 bg-bg-card border border-border-custom p-5 rounded-2xl space-y-3 text-left animate-in slide-in-from-top-2">
                    <h5 className="text-xs font-bold text-text-primary">Configuración de Google OAuth 2.0 (Google Cloud Console):</h5>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-text-muted">Google Client ID:</label>
                      <input
                        type="text"
                        required
                        value={oauthKeys.clientId}
                        onChange={e => setOauthKeys({ ...oauthKeys, clientId: e.target.value })}
                        placeholder="1234567890-xxx.apps.googleusercontent.com"
                        className="w-full bg-bg-subtle border border-border-custom rounded-xl px-3 py-1.5 text-xs text-text-primary outline-none font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-text-muted">Google Client Secret:</label>
                      <input
                        type="password"
                        required
                        value={oauthKeys.clientSecret}
                        onChange={e => setOauthKeys({ ...oauthKeys, clientSecret: e.target.value })}
                        placeholder="GOCSPX-..."
                        className="w-full bg-bg-subtle border border-border-custom rounded-xl px-3 py-1.5 text-xs text-text-primary outline-none font-mono"
                      />
                    </div>
                    <button
                      type="submit"
                      className="bg-[#0078D7] hover:bg-[#005a9e] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Guardar Claves OAuth
                    </button>
                  </form>
                )}
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
