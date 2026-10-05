import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: string | Buffer;
    contentType?: string;
  }>;
  smtpConfig?: {
    host?: string;
    port?: number;
    user?: string;
    pass?: string;
  };
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
  fromName,
  fromEmail,
  replyTo,
  attachments,
  smtpConfig
}: SendEmailParams) {
  const host = smtpConfig?.host || process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(smtpConfig?.port || process.env.SMTP_PORT) || 465;
  const user = smtpConfig?.user || process.env.SMTP_USER;
  const rawPass = smtpConfig?.pass || process.env.SMTP_PASS || "";
  const pass = rawPass.replace(/\s+/g, ""); // Limpiar espacios de la contraseña de aplicación de Google

  const senderName = fromName || process.env.SMTP_FROM_NAME || "SYSTEM FACTORY";
  const senderEmail = fromEmail || user || "notificaciones@systemfactory.com";
  const replyToEmail = replyTo || senderEmail;
  const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);

  if (recipients.length === 0) {
    return { success: false, error: "Sin destinatarios válidos." };
  }

  // Si no hay credenciales SMTP cargadas, registrar auditoría en consola y retornar simulación exitosa
  if (!user || !pass) {
    console.log(`\n[GOOGLE WORKSPACE EMAIL SIMULATION] ------------------`);
    console.log(`From: "${senderName}" <${senderEmail}>`);
    console.log(`Reply-To: ${replyToEmail}`);
    console.log(`To: ${recipients.join(", ")}`);
    console.log(`Subject: ${subject}`);
    console.log(`Attachments: ${attachments ? attachments.map(a => a.filename).join(", ") : "Ninguno"}`);
    console.log(`Body (Snippet): ${text || html.replace(/<[^>]+>/g, "").slice(0, 150)}...`);
    console.log(`------------------------------------------------------\n`);
    return { success: true, simulated: true };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100
    });

    const info = await transporter.sendMail({
      from: `"${senderName}" <${user}>`,
      replyTo: replyToEmail ? `"${senderName}" <${replyToEmail}>` : undefined,
      to: recipients,
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, ""),
      attachments
    });

    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error("[GOOGLE WORKSPACE / SMTP EMAIL ERROR]:", error);
    return { success: false, error: error?.message || "Error al enviar e-mail a través del servidor SMTP." };
  }
}

/** Verifica en tiempo real la conexión SMTP con Google Workspace o servidor personalizado */
export async function verifySmtpConnection(config: { host: string; port: number; user: string; pass: string }) {
  if (!config.user || !config.pass) {
    return { success: false, error: "Ingresa el correo y la contraseña de aplicación de Google." };
  }

  const cleanPass = config.pass.replace(/\s+/g, ""); // Eliminar espacios automáticamente

  try {
    const transporter = nodemailer.createTransport({
      host: config.host || "smtp.gmail.com",
      port: Number(config.port) || 465,
      secure: Number(config.port) === 465,
      auth: {
        user: config.user,
        pass: cleanPass
      }
    });

    await transporter.verify();
    return { success: true, message: "Conexión exitosa con Google Workspace (smtp.gmail.com)." };
  } catch (error: any) {
    console.error("[SMTP VERIFY ERROR]:", error);
    return { success: false, error: error?.message || "Falló la autenticación con Google Workspace. Revisa el correo y la Contraseña de Aplicación de 16 caracteres." };
  }
}

/** Obten los correos de todos los integrantes autorizados para un área + el operador que ejecuta */
export async function getAreaRecipients(areaName: string, actorEmail?: string): Promise<string[]> {
  try {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { rol: "ADMIN" },
          { rol: "SUPERVISOR" },
          { permissions: { some: { areaPermitida: { contains: areaName } } } }
        ]
      },
      select: { correo: true }
    });

    const emails = new Set<string>();
    users.forEach(u => {
      if (u.correo && u.correo.includes("@")) {
        emails.add(u.correo.trim().toLowerCase());
      }
    });

    if (actorEmail && actorEmail.includes("@")) {
      emails.add(actorEmail.trim().toLowerCase());
    }

    return Array.from(emails);
  } catch (error) {
    console.error("Error fetching area recipients:", error);
    return actorEmail ? [actorEmail] : [];
  }
}

/** Plantilla base elegante con estética SYSTEM FACTORY & Google Workspace */
export function buildEmailTemplate({
  title,
  preheader,
  contentHtml,
  senderInfo
}: {
  title: string;
  preheader?: string;
  contentHtml: string;
  senderInfo?: { nombre: string; area?: string };
}) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; border: 1px solid #334155; overflow: hidden; }
          .header { background-color: #0f172a; padding: 24px; text-align: center; border-bottom: 2px solid #0078d4; }
          .logo { font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: 1px; }
          .logo span { color: #0078d4; }
          .content { padding: 32px 24px; line-height: 1.6; font-size: 14px; color: #cbd5e1; }
          .title { font-size: 18px; font-weight: 700; color: #f8fafc; margin-bottom: 16px; }
          .badge { display: inline-block; background-color: rgba(0, 120, 212, 0.15); color: #38bdf8; padding: 4px 10px; border-radius: 6px; font-weight: 600; font-size: 12px; margin-bottom: 16px; border: 1px solid rgba(0, 120, 212, 0.3); }
          .footer { background-color: #0f172a; padding: 16px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #334155; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">SYSTEM <span>FACTORY</span></div>
            ${preheader ? `<div style="font-size:11px; color:#94a3b8; margin-top:4px;">${preheader}</div>` : ""}
          </div>
          <div class="content">
            <div class="title">${title}</div>
            ${contentHtml}
            ${
              senderInfo
                ? `<div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #334155; font-size: 12px; color: #94a3b8;">
                    Enviado desde cuenta corporativa Google Workspace por: <strong>${senderInfo.nombre}</strong> ${senderInfo.area ? `(${senderInfo.area})` : ""}
                   </div>`
                : ""
            }
          </div>
          <div class="footer">
            SYSTEM FACTORY &copy; ${new Date().getFullYear()} - Conectividad & Telecomunicaciones Satelitales.
          </div>
        </div>
      </body>
    </html>
  `;
}
