import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";

const STORAGE_FILE = path.join(process.cwd(), "mail_accounts_config.json");

function readAccounts(): Record<string, any> {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      return JSON.parse(fs.readFileSync(STORAGE_FILE, "utf-8"));
    }
  } catch {}
  return {};
}

function saveAccounts(data: Record<string, any>) {
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving OAuth accounts:", err);
  }
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
  const urlObj = new URL(request.url);
  const code = urlObj.searchParams.get("code");
  const errorParam = urlObj.searchParams.get("error");
  const cleanOrigin = getCleanUrl("", request).origin;
  const redirectUri = `${cleanOrigin}/api/auth/google/callback`;

  if (errorParam || !code) {
    console.error("Google OAuth error or code missing:", errorParam);
    return NextResponse.redirect(getCleanUrl("/correo?error=oauth_denied", request));
  }

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("sessionToken")?.value;
    if (!token) {
      return NextResponse.redirect(getCleanUrl("/login", request));
    }

    const decodedStr = Buffer.from(token, "base64").toString("utf-8");
    const session = JSON.parse(decodedStr);
    if (!session || !session.id) {
      return NextResponse.redirect(getCleanUrl("/login", request));
    }

    const accounts = readAccounts();
    const keys = accounts.__google_oauth_keys || {};
    const clientId = process.env.GOOGLE_CLIENT_ID || keys.clientId;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || keys.clientSecret;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(getCleanUrl("/correo?error=google_keys_missing", request));
    }

    // Intercambiar código de autorización por tokens de Google (Access & Refresh Tokens)
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code"
      })
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error("Error exchanging OAuth code with Google:", errText);
      return NextResponse.redirect(getCleanUrl("/correo?error=token_exchange_failed", request));
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;

    // Obtener información del usuario autenticado en Google (Email, Nombre, Foto)
    const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    let googleEmail = session.correo || "usuario@gmail.com";
    let googleName = session.nombre || "Usuario Google";
    let googlePicture = null;

    if (userResponse.ok) {
      const userInfo = await userResponse.json();
      googleEmail = userInfo.email || googleEmail;
      googleName = userInfo.name || googleName;
      googlePicture = userInfo.picture || null;
    }

    // Guardar vinculación de cuenta de Google de forma permanente para la sesión del usuario
    accounts[session.id] = {
      provider: "GOOGLE_OAUTH",
      email: googleEmail,
      displayName: googleName,
      googlePicture,
      accessToken,
      refreshToken: refreshToken || accounts[session.id]?.refreshToken || null,
      smtpHost: "smtp.gmail.com",
      smtpPort: 465,
      isLinked: true,
      linkedAt: new Date().toISOString()
    };

    saveAccounts(accounts);

    return NextResponse.redirect(getCleanUrl("/correo?google_linked=success", request));
  } catch (error: any) {
    console.error("Error in Google Auth Callback:", error);
    return NextResponse.redirect(getCleanUrl("/correo?error=callback_failed", request));
  }
}
