import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PerfilClient from "./PerfilClient";

export default async function PerfilPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("sessionToken")?.value;

  if (!token) {
    redirect("/login");
  }

  let sessionData: any = null;
  try {
    const decodedStr = Buffer.from(token, "base64").toString("utf-8");
    sessionData = JSON.parse(decodedStr);
  } catch {
    redirect("/login");
  }

  if (sessionData && (sessionData.id || sessionData.correo)) {
    try {
      const liveUser = await prisma.user.findFirst({
        where: {
          OR: [
            sessionData.id ? { id: sessionData.id } : undefined,
            sessionData.correo ? { correo: sessionData.correo } : undefined,
          ].filter(Boolean) as any,
        },
        include: { permissions: true },
      });

      if (liveUser) {
        sessionData.id = liveUser.id;
        sessionData.nombre = liveUser.nombre;
        sessionData.correo = liveUser.correo;
        sessionData.rol = liveUser.rol;
        sessionData.telefono = liveUser.telefono;
        sessionData.fotoUrl = liveUser.fotoUrl;
        sessionData.cargo = liveUser.cargo;
        sessionData.permissions = liveUser.permissions.map((p) => p.areaPermitida);
      }
    } catch (err) {
      console.error("Error fetching live user for perfil:", err);
    }
  }

  return <PerfilClient initialSession={sessionData} />;
}
