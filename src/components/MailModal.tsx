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
  User, 
  ShieldCheck, 
  Server, 
  AtSign,
  Key,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  Sparkles
} from "lucide-react";
import { getMails, sendMailAction, getMailAccountSettings, saveMailAccountSettings, testGoogleWorkspaceConnection } from "@/actions/mail";

interface MailModalProps {
  isOpen: boolean;
  onClose: () => void;
  userSession?: any;
}

export default function MailModal({ isOpen, onClose, userSession }: MailModalProps) {
  const [activeFolder, setActiveFolder] = useState<"INBOX" | "SENT" | "LINK">("INBOX");
  const [inbox, setInbox] = useState<any[]>([]);
  const [sent, setSent] = useState<any[]>([]);
  const [selectedMail, setSelectedMail] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [isComposing, setIsComposing] = useState(false);

  // Compose State
  const [composeData, setComposeData] = useState({
    to: "",
    subject: "",
    body: ""
  });
  const [sending, setSending] = useState(false);

  // Account Settings State
  const [accountSettings, setAccountSettings] = useState({
    provider: "GOOGLE_WORKSPACE",
    email: userSession?.correo || "ventas@empresa.com",
    displayName: userSession?.nombre || "System Factory",
    appPassword: "",
    smtpHost: "smtp.gmail.com",
    smtpPort: 465
  });
  const [testingConn, setTestingConn] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);
  const [savingAccount, setSavingAccount] = useState(false);

  const fetchMails = async () => {
    setLoading(true);
    const res = await getMails();
    if (res.success) {
      setInbox(res.inbox || []);
      setSent(res.sent || []);
      if (!selectedMail && res.inbox && res.inbox.length > 0) {
        setSelectedMail(res.inbox[0]);
      }
    }
    const accRes = await getMailAccountSettings();
    if (accRes.success && accRes.account) {
      setAccountSettings(prev => ({ ...prev, ...accRes.account }));
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchMails();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentList = activeFolder === "INBOX" ? inbox : sent;
  const filteredList = currentList.filter(m => 
    m.subject.toLowerCase().includes(searchFilter.toLowerCase()) ||
    m.fromName.toLowerCase().includes(searchFilter.toLowerCase()) ||
    m.fromEmail.toLowerCase().includes(searchFilter.toLowerCase()) ||
    (m.body && m.body.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  const handleSendMail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeData.to || !composeData.subject || !composeData.body) {
      alert("Por favor completa todos los campos para enviar el correo.");
      return;
    }

    setSending(true);
    const res = await sendMailAction({
      to: composeData.to,
      subject: composeData.subject,
      body: composeData.body,
      fromName: accountSettings.displayName
    });
    setSending(false);

    if (res.success) {
      alert("Correo electrónico enviado con éxito " + (res.simulated ? "(Modo Respaldo / Simulación activo)" : "a través de Google Workspace"));
      setComposeData({ to: "", subject: "", body: "" });
      setIsComposing(false);
      fetchMails();
      setActiveFolder("SENT");
    } else {
      alert("Error al enviar correo: " + res.error);
    }
  };

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

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAccount(true);
    const res = await saveMailAccountSettings(accountSettings);
    setSavingAccount(false);
    if (res.success) {
      alert("Cuenta corporativa de Google Workspace vinculada exitosamente.");
      setActiveFolder("INBOX");
    } else {
      alert("Error al vincular cuenta: " + res.error);
    }
  };

  const openReply = (mail: any) => {
    setComposeData({
      to: mail.fromEmail,
      subject: `RE: ${mail.subject}`,
      body: `\n\n------------------------------\nDe: ${mail.fromName} <${mail.fromEmail}>\nFecha: ${new Date(mail.createdAt).toLocaleString()}\nAsunto: ${mail.subject}\n\n${mail.body}`
    });
    setIsComposing(true);
  };

  const unreadCount = inbox.filter(m => !m.isRead).length;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 p-2 md:p-6 animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-bg-card border border-border-custom rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col">
        
        {/* Top Google Workspace & Outlook Bar */}
        <div className="bg-[#0078d4] text-white px-5 py-3 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center border border-white/20">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-base tracking-wide leading-tight flex items-center gap-2">
                Google Workspace & Outlook Mail Client <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-mono uppercase">System Factory</span>
              </h2>
              <p className="text-[11px] text-white/80">{accountSettings.email} ({accountSettings.displayName})</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsComposing(true)}
              className="bg-white hover:bg-white/90 text-[#0078d4] px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Redactar Correo
            </button>
            <button
              onClick={fetchMails}
              className="p-2 hover:bg-white/10 rounded-lg text-white transition-colors cursor-pointer"
              title="Actualizar bandeja"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded-lg text-white transition-colors cursor-pointer ml-2"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Outlook Body Layout */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Sidebar (Folders) */}
          <div className="w-56 bg-bg-sidebar border-r border-border-custom p-3 flex flex-col justify-between shrink-0">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest px-3 mb-2">Carpetas Corporativas</p>

              <button
                onClick={() => { setActiveFolder("INBOX"); setIsComposing(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  activeFolder === "INBOX" && !isComposing ? "bg-[#0078d4] text-white" : "text-text-secondary hover:bg-bg-subtle hover:text-text-primary"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Inbox className="w-4 h-4" />
                  <span>Bandeja de Entrada</span>
                </div>
                {unreadCount > 0 && (
                  <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold">
                    {unreadCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => { setActiveFolder("SENT"); setIsComposing(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  activeFolder === "SENT" && !isComposing ? "bg-[#0078d4] text-white" : "text-text-secondary hover:bg-bg-subtle hover:text-text-primary"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Send className="w-4 h-4" />
                  <span>Enviados</span>
                </div>
                <span className="text-[10px] font-mono opacity-80">{sent.length}</span>
              </button>

              <button
                onClick={() => { setActiveFolder("LINK"); setIsComposing(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  activeFolder === "LINK" && !isComposing ? "bg-[#0078d4] text-white" : "text-text-secondary hover:bg-bg-subtle hover:text-text-primary"
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Vincular Google / Outlook</span>
              </button>
            </div>

            {/* Linked Status Card */}
            <div className="bg-bg-subtle p-3 rounded-xl border border-border-custom text-[11px] space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Google Workspace
              </div>
              <p className="text-text-muted truncate font-mono text-[10px]">{accountSettings.email}</p>
              <p className="text-[9px] text-text-muted">Servidor: {accountSettings.smtpHost}</p>
            </div>
          </div>

          {/* Tab 1 & 2: Mail Viewer & List */}
          {activeFolder !== "LINK" && !isComposing && (
            <div className="flex-1 flex overflow-hidden">
              
              {/* Middle Column: Email List */}
              <div className="w-80 border-r border-border-custom flex flex-col bg-bg-card shrink-0">
                
                {/* Search */}
                <div className="p-3 border-b border-border-custom">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-text-muted" />
                    <input
                      type="text"
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      placeholder="Buscar correos empresa..."
                      className="w-full bg-bg-subtle border border-border-custom rounded-lg pl-8 pr-3 py-1.5 text-xs text-text-primary outline-none focus:border-[#0078d4]"
                    />
                  </div>
                </div>

                {/* Mail List */}
                <div className="flex-1 overflow-y-auto divide-y divide-border-custom scrollbar-thin">
                  {filteredList.length === 0 ? (
                    <div className="p-8 text-center text-xs text-text-muted italic">
                      No hay correos en esta carpeta.
                    </div>
                  ) : (
                    filteredList.map((mail) => {
                      const isSelected = selectedMail?.id === mail.id;
                      return (
                        <div
                          key={mail.id}
                          onClick={() => setSelectedMail(mail)}
                          className={`p-3.5 cursor-pointer transition-colors relative ${
                            isSelected ? 'bg-[#0078d4]/10 border-l-4 border-[#0078d4]' : 'hover:bg-bg-subtle'
                          }`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center gap-1.5 truncate pr-2">
                              {!mail.isRead && (
                                <span className="w-2 h-2 rounded-full bg-[#0078d4] shrink-0" />
                              )}
                              <span className={`text-xs truncate ${!mail.isRead ? 'font-black text-text-primary' : 'font-semibold text-text-secondary'}`}>
                                {activeFolder === "INBOX" ? mail.fromName : mail.toEmail}
                              </span>
                            </div>
                            <span className="text-[10px] text-text-muted font-mono shrink-0">
                              {new Date(mail.createdAt).toLocaleDateString("es-AR", { month: "short", day: "numeric" })}
                            </span>
                          </div>

                          <h4 className={`text-xs truncate mb-1 ${!mail.isRead ? 'font-bold text-[#0078d4]' : 'text-text-primary'}`}>
                            {mail.subject}
                          </h4>

                          <p className="text-[11px] text-text-muted truncate line-clamp-1">
                            {mail.body}
                          </p>

                          {mail.badge && (
                            <span className="mt-1.5 inline-block text-[9px] font-bold px-1.5 py-0.5 rounded bg-bg-subtle text-text-muted border border-border-custom uppercase font-mono">
                              {mail.badge}
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Full Email Reading Inspector */}
              <div className="flex-1 flex flex-col bg-bg-sidebar overflow-hidden">
                {selectedMail ? (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    
                    {/* Action Bar */}
                    <div className="p-3 border-b border-border-custom bg-bg-card flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openReply(selectedMail)}
                          className="px-3 py-1.5 bg-[#0078d4] hover:bg-[#005a9e] text-white rounded-md text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Reply className="w-3.5 h-3.5" /> Responder
                        </button>
                        <button
                          onClick={() => openReply(selectedMail)}
                          className="px-3 py-1.5 bg-bg-subtle hover:bg-bg-card text-text-primary border border-border-custom rounded-md text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Forward className="w-3.5 h-3.5" /> Reenviar
                        </button>
                      </div>
                      <span className="text-xs text-text-muted font-mono">{new Date(selectedMail.createdAt).toLocaleString("es-AR")}</span>
                    </div>

                    {/* Email Details */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
                      <div className="border-b border-border-custom pb-4 space-y-3">
                        <h2 className="text-xl font-bold text-text-primary leading-snug">{selectedMail.subject}</h2>
                        
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#0078d4] text-white font-bold flex items-center justify-center text-sm shadow">
                            {selectedMail.fromName ? selectedMail.fromName.slice(0, 2).toUpperCase() : "GW"}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-text-primary">{selectedMail.fromName}</p>
                            <p className="text-xs text-text-muted font-mono">&lt;{selectedMail.fromEmail}&gt; para &lt;{selectedMail.toEmail}&gt;</p>
                          </div>
                        </div>
                      </div>

                      {/* Email Body Content */}
                      <div className="bg-bg-card border border-border-custom p-6 rounded-xl text-sm leading-relaxed text-text-primary space-y-3 shadow-inner">
                        {selectedMail.body.split("\n").map((paragraph: string, idx: number) => (
                          <p key={idx}>{paragraph}</p>
                        ))}
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-text-muted text-xs italic">
                    Selecciona un correo de la lista para leer su contenido.
                  </div>
                )}
              </div>

            </div>
          )}

          {/* Tab 3: Redactar Correo (Compose Tab) */}
          {isComposing && (
            <div className="flex-1 flex flex-col bg-bg-sidebar p-6 overflow-y-auto">
              <div className="max-w-3xl mx-auto w-full bg-bg-card border border-border-custom rounded-xl p-6 shadow-xl space-y-4">
                <div className="flex justify-between items-center border-b border-border-custom pb-3">
                  <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                    <Send className="w-4 h-4 text-[#0078d4]" /> Nuevo Mensaje de Correo (Google Workspace)
                  </h3>
                  <button onClick={() => setIsComposing(false)} className="text-text-muted hover:text-text-primary cursor-pointer">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSendMail} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Para (Destinatario):</label>
                    <div className="relative">
                      <AtSign className="w-4 h-4 absolute left-3 top-2.5 text-text-muted" />
                      <input
                        type="email"
                        value={composeData.to}
                        onChange={(e) => setComposeData({ ...composeData, to: e.target.value })}
                        placeholder="cliente@empresa.com"
                        className="w-full bg-bg-subtle border border-border-custom rounded-md pl-9 pr-3 py-2 text-xs text-text-primary outline-none focus:border-[#0078d4]"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Asunto:</label>
                    <input
                      type="text"
                      value={composeData.subject}
                      onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                      placeholder="Ej: Presupuesto y disponibilidad de terminales satelitales"
                      className="w-full bg-bg-subtle border border-border-custom rounded-md px-3 py-2 text-xs text-text-primary outline-none focus:border-[#0078d4]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Mensaje:</label>
                    <textarea
                      value={composeData.body}
                      onChange={(e) => setComposeData({ ...composeData, body: e.target.value })}
                      placeholder="Escribe el cuerpo del correo electrónico..."
                      className="w-full bg-bg-subtle border border-border-custom rounded-md p-3 text-xs text-text-primary outline-none focus:border-[#0078d4] min-h-[220px]"
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t border-border-custom">
                    <button
                      type="button"
                      onClick={() => setIsComposing(false)}
                      className="px-4 py-2 rounded-md bg-bg-subtle border border-border-custom text-text-primary text-xs font-bold hover:bg-bg-card transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={sending}
                      className="px-5 py-2 rounded-md bg-[#0078d4] hover:bg-[#005a9e] text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {sending ? "Enviando..." : "Enviar desde Google Workspace"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Tab 4: Vincular Cuenta Empresa Google Workspace */}
          {activeFolder === "LINK" && !isComposing && (
            <div className="flex-1 flex flex-col bg-bg-sidebar p-6 overflow-y-auto">
              <div className="max-w-2xl mx-auto w-full bg-bg-card border border-border-custom rounded-xl p-6 shadow-xl space-y-6">
                <div className="border-b border-border-custom pb-4">
                  <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" /> Vincular Cuenta Empresa (Google Workspace / Outlook)
                  </h3>
                  <p className="text-xs text-text-muted mt-1">Vincula la casilla corporativa de tu empresa (ej: <span className="font-mono text-text-secondary">ventas@aitue.com.ar</span>) para enviar y recibir correos directo desde el sistema.</p>
                </div>

                <form onSubmit={handleSaveSettings} className="space-y-4">
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Proveedor Corporativo:</label>
                      <select
                        value={accountSettings.provider}
                        onChange={(e) => setAccountSettings({ ...accountSettings, provider: e.target.value, smtpHost: e.target.value === "GOOGLE_WORKSPACE" ? "smtp.gmail.com" : "smtp.office365.com" })}
                        className="w-full bg-bg-subtle border border-border-custom rounded-md px-3 py-2 text-xs text-text-primary outline-none focus:border-[#0078d4] font-bold"
                      >
                        <option value="GOOGLE_WORKSPACE">Google Workspace / Gmail Empresa (@empresa.com)</option>
                        <option value="OUTLOOK">Microsoft Outlook 365 / Office 365</option>
                        <option value="CUSTOM">Servidor SMTP/IMAP Personalizado</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Nombre del Remitente:</label>
                      <input
                        type="text"
                        value={accountSettings.displayName}
                        onChange={(e) => setAccountSettings({ ...accountSettings, displayName: e.target.value })}
                        placeholder="Ej: Aitue Cominca - Ventas"
                        className="w-full bg-bg-subtle border border-border-custom rounded-md px-3 py-2 text-xs text-text-primary outline-none focus:border-[#0078d4]"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Correo de la Empresa (Google Workspace):</label>
                    <input
                      type="email"
                      value={accountSettings.email}
                      onChange={(e) => setAccountSettings({ ...accountSettings, email: e.target.value })}
                      placeholder="ventas@aitue.com.ar"
                      className="w-full bg-bg-subtle border border-border-custom rounded-md px-3 py-2 text-xs text-text-primary outline-none focus:border-[#0078d4]"
                      required
                    />
                  </div>

                  {accountSettings.provider === "GOOGLE_WORKSPACE" && (
                    <div className="bg-sky-500/10 border border-sky-500/30 p-3.5 rounded-lg text-xs text-sky-300 space-y-2">
                      <p className="font-bold flex items-center gap-1.5 text-sky-200">
                        <Sparkles className="w-4 h-4 text-sky-400" /> Instrucciones para Google Workspace:
                      </p>
                      <p className="text-[11px] leading-relaxed text-sky-200/90">
                        Para vincular una casilla corporativa de Google Workspace, utiliza una <strong>Contraseña de Aplicación de 16 caracteres</strong> generada en la Seguridad de tu Cuenta de Google (Google Account ➔ Seguridad ➔ Verificación en 2 pasos ➔ Contraseñas de Aplicaciones).
                      </p>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-sky-100 mb-1">Contraseña de Aplicación de Google (16 caracteres):</label>
                        <input
                          type="password"
                          value={accountSettings.appPassword}
                          onChange={(e) => setAccountSettings({ ...accountSettings, appPassword: e.target.value })}
                          placeholder="xxxx xxxx xxxx xxxx"
                          className="w-full bg-bg-card border border-sky-500/40 rounded px-3 py-1.5 text-xs text-text-primary outline-none font-mono"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Servidor SMTP Host:</label>
                      <input
                        type="text"
                        value={accountSettings.smtpHost}
                        onChange={(e) => setAccountSettings({ ...accountSettings, smtpHost: e.target.value })}
                        placeholder="smtp.gmail.com"
                        className="w-full bg-bg-subtle border border-border-custom rounded-md px-3 py-2 text-xs text-text-primary outline-none focus:border-[#0078d4]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Puerto SMTP:</label>
                      <input
                        type="number"
                        value={accountSettings.smtpPort}
                        onChange={(e) => setAccountSettings({ ...accountSettings, smtpPort: Number(e.target.value) })}
                        placeholder="465"
                        className="w-full bg-bg-subtle border border-border-custom rounded-md px-3 py-2 text-xs text-text-primary outline-none focus:border-[#0078d4]"
                      />
                    </div>
                  </div>

                  {testResult && (
                    <div className={`p-3 rounded-lg border text-xs font-semibold ${
                      testResult.success 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    }`}>
                      {testResult.success ? (
                        <p className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 shrink-0" /> {testResult.message}
                        </p>
                      ) : (
                        <p className="flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 shrink-0" /> {testResult.error}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="pt-3 flex justify-between items-center">
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={testingConn}
                      className="px-4 py-2 rounded-md bg-bg-subtle hover:bg-bg-card text-text-primary border border-border-custom text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${testingConn ? 'animate-spin' : ''}`} />
                      {testingConn ? "Verificando Google..." : "Probar Conexión Google"}
                    </button>

                    <button
                      type="submit"
                      disabled={savingAccount}
                      className="px-6 py-2 rounded-md bg-[#0078d4] hover:bg-[#005a9e] text-white text-xs font-bold transition-all shadow cursor-pointer flex items-center gap-1.5"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      {savingAccount ? "Guardando..." : "Guardar & Vincular Google Workspace"}
                    </button>
                  </div>

                </form>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
