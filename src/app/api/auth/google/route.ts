import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";

const STORAGE_FILE = path.join(process.cwd(), "mail_accounts_config.json");

function getStoredOauthKeys() {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STORAGE_FILE, "utf-8"));
      return data.__google_oauth_keys || {};
    }
  } catch {}
  return {};
}

function getCleanUrl(pathAndQuery: string, request: Request): URL {
  const requestUrl = new URL(request.url);
  let host = request.headers.get("host") || requestUrl.host;
  if (host.startsWith("0.0.0.0")) {
    host = host.replace("0.0.0.0", "localhost");
  }
  const proto = request.headers.get("x-forwarded-proto") || requestUrl.protocol.replace(":", "");
  return new URL(`${proto}://${host}${pathAndQuery}`);
}

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("sessionToken")?.value;
    if (!token) {
      return NextResponse.redirect(getCleanUrl("/login", request));
    }

    const keys = getStoredOauthKeys();
    const clientId = process.env.GOOGLE_CLIENT_ID || keys.clientId;

    const cleanOrigin = getCleanUrl("", request).origin;
    const redirectUri = `${cleanOrigin}/api/auth/google/callback`;

    if (!clientId) {
      // Si no están configuradas las claves OAuth en .env o JSON, redirigir limpiamente a la interfaz de configuración
      return NextResponse.redirect(getCleanUrl("/correo?error=google_keys_missing", request));
    }

    // Google OAuth 2.0 Auth URL con permisos completos de Gmail y perfil de usuario
    const scope = [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://mail.google.com/",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.readonly"
    ].join(" ");

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scope)}` +
      `&access_type=offline` +
      `&prompt=consent` +
      `&state=${encodeURIComponent(token)}`;

    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error("Error in Google Auth Route:", error);
    return NextResponse.redirect(getCleanUrl("/correo?error=oauth_init_failed", request));
  }
}
