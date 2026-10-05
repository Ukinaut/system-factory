"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { sendEmail, buildEmailTemplate, verifySmtpConnection } from "@/lib/email";
import { fetchGoogleWorkspaceEmails, FetchedEmail } from "@/lib/imap";
import fs from "fs";
import path from "path";

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("sessionToken")?.value;
  if (!token) return null;
  try {
    const decodedStr = Buffer.from(token, "base64").toString("utf-8");
    return JSON.parse(decodedStr);
  } catch {
    return null;
  }
}

// Storage path for persistent mail account settings per user
const STORAGE_FILE = path.join(process.cwd(), "mail_accounts_config.json");

function readStoredMailAccounts(): Record<string, any> {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const data = fs.readFileSync(STORAGE_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading stored mail accounts:", err);
  }
  return {};
}

function saveStoredMailAccounts(data: Record<string, any>) {
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving stored mail accounts:", err);
  }
}

const sentMailLogStore: any[] = [
  {
    id: "sent-demo-1",
    fromEmail: "ventas@systemfactory.com",
    fromName: "Ventas System Factory",
    toEmail: "cliente@empresa.com",
    toName: "TechCorp Argentina",
    subject: "Respuesta a Cotización Orden #COT-8823192",
    body: "Estimado cliente, adjuntamos la propuesta comercial solicitada para la provisión de terminales Starlink móviles. Quedamos a su disposición.",
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    isRead: true,
    folder: "SENT"
  }
];

export async function getMailAccountSettings() {
  const session = await getSession();
  if (!session) return { success: false, error: "No autenticado" };

  const accounts = readStoredMailAccounts();
  const userAccount = accounts[session.id] || {
    provider: "GOOGLE_WORKSPACE",
    email: session.correo || "ventas@empresa.com",
    displayName: session.nombre || "Ventas System Factory",
    smtpHost: "smtp.gmail.com",
    smtpPort: 465,
    smtpUser: session.correo || "",
    smtpPass: "",
    isLinked: false
  };

  return { success: true, account: userAccount };
}

export async function testGoogleWorkspaceConnection(data: {
  email: string;
  appPassword: string;
  smtpHost?: string;
  smtpPort?: number;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "No autenticado" };

  const res = await verifySmtpConnection({
    host: data.smtpHost || "smtp.gmail.com",
    port: data.smtpPort || 465,
    user: data.email,
    pass: data.appPassword
  });

  return res;
}

export async function unlinkGoogleAccount() {
  const session = await getSession();
  if (!session) return { success: false, error: "No autenticado" };

  const accounts = readStoredMailAccounts();
  if (accounts[session.id]) {
    delete accounts[session.id];
    saveStoredMailAccounts(accounts);
  }

  revalidatePath("/correo");
  revalidatePath("/perfil");
  return { success: true, message: "Cuenta de Google desvinculada correctamente." };
}

export async function saveGoogleOauthKeys(data: { clientId: string; clientSecret: string }) {
  const session = await getSession();
  if (!session) return { success: false, error: "No autenticado" };

  const accounts = readStoredMailAccounts();
  accounts.__google_oauth_keys = {
    clientId: data.clientId.trim(),
    clientSecret: data.clientSecret.trim(),
    updatedAt: new Date().toISOString()
  };

  saveStoredMailAccounts(accounts);
  revalidatePath("/correo");
  return { success: true, message: "Claves de Google OAuth 2.0 guardadas correctamente." };
}

export async function saveMailAccountSettings(data: {
  provider: string;
  email: string;
  displayName: string;
  appPassword?: string;
  smtpHost?: string;
  smtpPort?: number;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "No autenticado" };

  // First verify SMTP connection to confirm credentials are valid
  if (data.appPassword) {
    const testRes = await verifySmtpConnection({
      host: data.smtpHost || "smtp.gmail.com",
      port: data.smtpPort || 465,
      user: data.email,
      pass: data.appPassword
    });

    if (!testRes.success) {
      return { success: false, error: testRes.error };
    }
  }

  const accounts = readStoredMailAccounts();
  accounts[session.id] = {
    ...data,
    smtpHost: data.smtpHost || "smtp.gmail.com",
    smtpPort: data.smtpPort || 465,
    smtpUser: data.email,
    smtpPass: data.appPassword || "",
    isLinked: true,
    linkedAt: new Date().toISOString()
  };

  saveStoredMailAccounts(accounts);

  revalidatePath("/perfil");
  revalidatePath("/correo");
  return { success: true, message: "Cuenta empresarial de Google Workspace vinculada correctamente." };
}

export async function getMails() {
  const session = await getSession();
  if (!session) return { success: false, error: "No autenticado", inbox: [], sent: [] };

  const accounts = readStoredMailAccounts();
  const userAccount = accounts[session.id];

  let googleEmails: FetchedEmail[] = [];

  // If user linked their Google Workspace email & app password, fetch live IMAP emails
  if (userAccount && userAccount.email && userAccount.smtpPass) {
    const imapRes = await fetchGoogleWorkspaceEmails(userAccount.email, userAccount.smtpPass, 10);
    if (imapRes.success && imapRes.emails) {
      googleEmails = imapRes.emails;
    }
  }

  const [sales, clients] = await Promise.all([
    prisma.sale.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { client: true }
    }),
    prisma.client.findMany({
      take: 4,
      orderBy: { createdAt: "desc" }
    })
  ]);

  const defaultInbox: any[] = [
    {
      id: "inbox-gw-1",
      fromEmail: "admin@workspace.google.com",
      fromName: "Google Workspace Security",
      toEmail: userAccount?.email || session.correo,
      subject: userAccount?.isLinked ? "Cuenta de Google Workspace vinculada con éxito" : "Vincular cuenta de Google Workspace",
      body: userAccount?.isLinked
        ? `Su cuenta corporativa (${userAccount.email}) se encuentra enlazada y sincronizada en SYSTEM FACTORY.`
        : "Ingrese su contraseña de aplicación de 16 caracteres para activar el intercambio de correos.",
      createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
      isRead: false,
      folder: "INBOX",
      badge: "GOOGLE"
    },
    ...sales.map((s, idx) => ({
      id: `inbox-sale-${s.id}`,
      fromEmail: s.client?.correo || "contacto@cliente.com",
      fromName: s.client?.razonSocial || "Venta Registrada",
      toEmail: session.correo,
      subject: `Consulta sobre Orden ${s.numeroOrden} - Total ${s.moneda} $${s.total.toLocaleString("es-AR")}`,
      body: `Estimado equipo de ventas, confirmamos el requerimiento de despacho para la orden ${s.numeroOrden}. Por favor enviar la factura y el código de seguimiento a esta dirección.`,
      createdAt: new Date(new Date(s.createdAt).getTime() + 1000 * 60 * 15).toISOString(),
      isRead: idx > 1,
      folder: "INBOX",
      badge: s.tipo
    })),
    ...clients.map(c => ({
      id: `inbox-client-${c.id}`,
      fromEmail: c.correo || "contacto@cliente.com",
      fromName: c.razonSocial,
      toEmail: session.correo,
      subject: `Actualización de Datos & Solicitud de Tráfico Satelital`,
      body: `Solicitamos ampliación del paquete de datos para nuestras antenas Starlink. Razón Social: ${c.razonSocial} (CUIT: ${c.cuit}).`,
      createdAt: new Date(new Date(c.createdAt).getTime() + 1000 * 60 * 60).toISOString(),
      isRead: true,
      folder: "INBOX",
      badge: "CLIENTE"
    }))
  ];

  // Combine real IMAP emails at top + system inbox notifications
  const inbox = [...googleEmails, ...defaultInbox];
  const sent = sentMailLogStore;

  return { success: true, inbox, sent };
}

export async function sendMailAction(data: {
  to: string;
  subject: string;
  body: string;
  fromName?: string;
}) {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: "Usuario no autenticado." };

    const accounts = readStoredMailAccounts();
    const linkedAcc = accounts[session.id];

    const fromEmail = linkedAcc?.email || session.correo || "ventas@systemfactory.com";
    const fromName = data.fromName || linkedAcc?.displayName || session.nombre || "SYSTEM FACTORY Google Workspace";

    const htmlContent = buildEmailTemplate({
      title: data.subject,
      contentHtml: `<p>${data.body.replace(/\n/g, "<br/>")}</p>`,
      senderInfo: { nombre: fromName, area: session.rol }
    });

    const res = await sendEmail({
      to: data.to,
      subject: data.subject,
      html: htmlContent,
      text: data.body,
      fromName,
      fromEmail,
      replyTo: fromEmail,
      smtpConfig: linkedAcc && linkedAcc.smtpPass ? {
        host: linkedAcc.smtpHost || "smtp.gmail.com",
        port: linkedAcc.smtpPort || 465,
        user: linkedAcc.email,
        pass: linkedAcc.smtpPass
      } : undefined
    });

    sentMailLogStore.unshift({
      id: "sent-" + Date.now(),
      fromEmail,
      fromName,
      toEmail: data.to,
      toName: data.to.split("@")[0],
      subject: data.subject,
      body: data.body,
      createdAt: new Date().toISOString(),
      isRead: true,
      folder: "SENT"
    });

    revalidatePath("/");
    revalidatePath("/correo");
    return { success: true, message: "Correo electrónico enviado correctamente.", simulated: res.simulated };
  } catch (error: any) {
    console.error("Error in sendMailAction:", error);
    return { success: false, error: error?.message || "Error al procesar el envío de correo." };
  }
}

// In-memory mail store for state changes during session
const mailStateStore: Record<string, { isRead?: boolean; isStarred?: boolean; isDeleted?: boolean }> = {};

export async function markMailAsReadAction(mailId: string, isRead: boolean = true) {
  mailStateStore[mailId] = { ...mailStateStore[mailId], isRead };
  revalidatePath("/correo");
  return { success: true };
}

export async function toggleStarMailAction(mailId: string) {
  const current = mailStateStore[mailId]?.isStarred || false;
  mailStateStore[mailId] = { ...mailStateStore[mailId], isStarred: !current };
  revalidatePath("/correo");
  return { success: true, isStarred: !current };
}

export async function deleteMailAction(mailId: string) {
  mailStateStore[mailId] = { ...mailStateStore[mailId], isDeleted: true };
  revalidatePath("/correo");
  return { success: true };
}

