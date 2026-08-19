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
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
  fromName,
  fromEmail,
  replyTo
}: SendEmailParams) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  const senderName = fromName || process.env.SMTP_FROM_NAME || "SYSTEM FACTORY";
  const replyToEmail = replyTo || fromEmail || user;
  const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);

  if (recipients.length === 0) {
    return { success: false, error: "Sin destinatarios válidos." };
  }

  // Si no hay configuración SMTP cargada en .env, registrar simulacro en consola
  if (!host || !user || !pass) {
    console.log(`\n[EMAIL SIMULATION - AUDIT BACKUP MULTIUSER] ------------------`);
    console.log(`From: "${senderName}" <${user || "notificaciones@systemfactory.com"}>`);
    console.log(`Reply-To (Operador): ${replyToEmail}`);
    console.log(`To (Integrantes de Área): ${recipients.join(", ")}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body (Snippet): ${text || html.replace(/<[^>]+>/g, "").slice(0, 150)}...`);
    console.log(`----------------------------------------------------------\n`);
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
      // Pool de conexiones para máxima concurrencia de múltiples operadores
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
      text: text || html.replace(/<[^>]+>/g, "")
    });

    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error("[EMAIL ERROR]:", error);
    return { success: false, error: error?.message || "Error al enviar e-mail" };
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

/** Plantilla base elegante con estética SYSTEM FACTORY */
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
          .header { background-color: #0f172a; padding: 24px; text-align: center; border-bottom: 2px solid #a855f7; }
          .logo { font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: 1px; }
          .logo span { color: #a855f7; }
          .content { padding: 32px 24px; line-height: 1.6; font-size: 14px; color: #cbd5e1; }
          .title { font-size: 18px; font-weight: 700; color: #f8fafc; margin-bottom: 16px; }
          .badge { display: inline-block; background-color: rgba(168, 85, 247, 0.15); color: #c084fc; padding: 4px 10px; border-radius: 6px; font-weight: 600; font-size: 12px; margin-bottom: 16px; border: 1px solid rgba(168, 85, 247, 0.3); }
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
                    Operador / Autor: <strong>${senderInfo.nombre}</strong> ${senderInfo.area ? `(${senderInfo.area})` : ""}
                   </div>`
                : ""
            }
          </div>
          <div class="footer">
            SYSTEM FACTORY &copy; ${new Date().getFullYear()} - Respaldo y Registro de Operaciones.
          </div>
        </div>
      </body>
    </html>
  `;
}
