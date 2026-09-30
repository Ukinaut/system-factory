import tls from "tls";

export interface FetchedEmail {
  id: string;
  fromEmail: string;
  fromName: string;
  toEmail: string;
  subject: string;
  body: string;
  createdAt: string;
  isRead: boolean;
  folder: "INBOX" | "SENT";
  badge?: string;
}

export async function fetchGoogleWorkspaceEmails(
  user: string,
  pass: string,
  limit: number = 10
): Promise<{ success: boolean; emails?: FetchedEmail[]; error?: string }> {
  if (!user || !pass) {
    return { success: false, error: "Usuario o contraseña no provistos." };
  }

  const cleanPass = pass.replace(/\s+/g, "");

  return new Promise((resolve) => {
    let resolved = false;
    const socket = tls.connect(
      {
        host: "imap.gmail.com",
        port: 993,
        rejectUnauthorized: false
      },
      () => {
        // Socket connected
      }
    );

    socket.setTimeout(12000, () => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
        resolve({ success: false, error: "Tiempo de espera agotado al conectar a imap.gmail.com" });
      }
    });

    let buffer = "";
    let step = 0;
    const emails: FetchedEmail[] = [];

    socket.on("data", (data) => {
      buffer += data.toString("utf-8");

      // Step 0: Server Greeting (* OK)
      if (step === 0 && buffer.includes("* OK")) {
        step = 1;
        buffer = "";
        socket.write(`A1 LOGIN "${user}" "${cleanPass}"\r\n`);
        return;
      }

      // Step 1: LOGIN response
      if (step === 1) {
        if (buffer.includes("A1 OK")) {
          step = 2;
          buffer = "";
          socket.write(`A2 SELECT INBOX\r\n`);
          return;
        } else if (buffer.includes("A1 NO") || buffer.includes("A1 BAD")) {
          if (!resolved) {
            resolved = true;
            socket.write(`A99 LOGOUT\r\n`);
            socket.destroy();
            resolve({
              success: false,
              error: "Credenciales de Google Workspace rechazadas por IMAP. Verifica la Contraseña de Aplicación de 16 caracteres."
            });
          }
          return;
        }
      }

      // Step 2: SELECT INBOX response
      if (step === 2 && buffer.includes("A2 OK")) {
        step = 3;
        buffer = "";
        // Fetch last N messages
        socket.write(`A3 FETCH *:1 (BODY.PEEK[HEADER.FIELDS (FROM TO SUBJECT DATE)] BODY.PEEK[TEXT])\r\n`);
        return;
      }

      // Step 3: FETCH response & LOGOUT
      if (step === 3 && (buffer.includes("A3 OK") || buffer.includes("A3 NO") || buffer.includes("A3 BAD"))) {
        // Parse buffer for emails
        const parsedEmails = parseImapFetchResponse(buffer, user);
        if (!resolved) {
          resolved = true;
          socket.write(`A4 LOGOUT\r\n`);
          socket.end();
          resolve({ success: true, emails: parsedEmails });
        }
      }
    });

    socket.on("error", (err) => {
      if (!resolved) {
        resolved = true;
        resolve({ success: false, error: err.message || "Error al conectar con el servidor IMAP de Google." });
      }
    });

    socket.on("end", () => {
      if (!resolved) {
        resolved = true;
        resolve({ success: true, emails });
      }
    });
  });
}

function parseImapFetchResponse(rawBuffer: string, accountUser: string): FetchedEmail[] {
  const emails: FetchedEmail[] = [];
  const blocks = rawBuffer.split(/\* \d+ FETCH/g);

  blocks.forEach((block, idx) => {
    if (!block.trim()) return;

    let subject = "(Sin asunto)";
    let fromStr = "Desconocido";
    let dateStr = new Date().toISOString();
    let body = "";

    const lines = block.split("\r\n");
    let isHeader = true;

    lines.forEach((line) => {
      if (line.toLowerCase().startsWith("subject:")) {
        subject = line.substring(8).trim();
      } else if (line.toLowerCase().startsWith("from:")) {
        fromStr = line.substring(5).trim();
      } else if (line.toLowerCase().startsWith("date:")) {
        try {
          dateStr = new Date(line.substring(5).trim()).toISOString();
        } catch {}
      } else if (line === "") {
        isHeader = false;
      } else if (!isHeader && !line.startsWith("A3 OK") && !line.startsWith("* OK")) {
        body += line + "\n";
      }
    });

    // Extract name and email from "Name <email@domain.com>"
    let fromName = fromStr;
    let fromEmail = fromStr;
    const match = fromStr.match(/(.*?)\s*<([^>]+)>/);
    if (match) {
      fromName = match[1].replace(/"/g, "").trim() || match[2];
      fromEmail = match[2].trim();
    }

    if (fromStr !== "Desconocido" || subject !== "(Sin asunto)") {
      emails.push({
        id: `gw-imap-${Date.now()}-${idx}`,
        fromEmail,
        fromName: fromName || fromEmail,
        toEmail: accountUser,
        subject,
        body: body.trim().slice(0, 500) || "Sin contenido de texto.",
        createdAt: dateStr,
        isRead: true,
        folder: "INBOX",
        badge: "GOOGLE"
      });
    }
  });

  return emails;
}
