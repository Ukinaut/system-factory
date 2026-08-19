import Sidebar from "@/components/Sidebar";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { User, Calendar, MessageSquare } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import CurrencyRatesDropdown from "@/components/CurrencyRatesDropdown";
import { prisma } from "@/lib/prisma";

export default async function AreasLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("sessionToken")?.value;
  
  if (!sessionToken) {
    redirect("/login");
  }

  let sessionData = null;
  try {
    const decodedStr = Buffer.from(sessionToken, "base64").toString("utf-8");
    sessionData = JSON.parse(decodedStr);
  } catch(e) {
    redirect("/login");
  }

  // Fetch latest permissions and role dynamically
  if (sessionData && sessionData.id) {
    try {
      const liveUser = await prisma.user.findUnique({
        where: { id: sessionData.id },
        include: { permissions: true }
      });
      if (liveUser) {
        sessionData.rol = liveUser.rol;
        sessionData.permissions = liveUser.permissions.map(p => p.areaPermitida);
      }
    } catch (dbErr) {
      console.error("Error fetching live session data:", dbErr);
    }
  }

  const selectedCountry = cookieStore.get("selectedCountry")?.value || null;

  return (
    <div className="flex min-h-screen bg-bg-main text-text-primary transition-all duration-200">
      <Sidebar session={sessionData} selectedCountry={selectedCountry} />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-border-custom bg-bg-card flex items-center justify-between px-8 z-10 shrink-0">
          <div className="text-sm font-semibold text-text-muted">
            Bienvenido, <span className="text-text-primary font-bold">{sessionData.nombre}</span>
          </div>
          <div className="flex items-center gap-6">
            <nav className="flex items-center gap-6 border-r border-border-custom pr-6">
              <Link href="/perfil" className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors">
                <User className="w-4.5 h-4.5" />
                <span>Perfil</span>
              </Link>
              <Link href="/calendario" className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors">
                <Calendar className="w-4.5 h-4.5" />
                <span>Calendario</span>
              </Link>
              <Link href="/chat" className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors">
                <MessageSquare className="w-4.5 h-4.5" />
                <span>Chat</span>
              </Link>
            </nav>
            <CurrencyRatesDropdown />
            <NotificationBell />
          </div>
        </header>

        {/* Scrollable Main Area */}
        <main className="flex-1 p-8 overflow-y-auto bg-bg-main">
          {children}
        </main>
      </div>
    </div>
  );
}
