"use client";

import { useState } from "react";
import Link from "next/link";
import { User, Calendar, MessageSquare, Mail } from "lucide-react";
import MailModal from "./MailModal";

export default function TopHeaderNav({ sessionData }: { sessionData: any }) {
  const [isMailOpen, setIsMailOpen] = useState(false);

  return (
    <>
      <nav className="flex items-center gap-6 border-r border-border-custom pr-6">
        <Link href="/perfil" className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors">
          <User className="w-4.5 h-4.5" />
          <span>Perfil</span>
        </Link>
        <button
          onClick={() => setIsMailOpen(true)}
          className="flex items-center gap-2 text-sm text-text-muted hover:text-[#0078d4] transition-colors cursor-pointer font-medium"
          title="Abrir Cliente de Correo Outlook"
        >
          <div className="relative">
            <Mail className="w-4.5 h-4.5 text-[#0078d4]" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#0078d4] animate-pulse" />
          </div>
          <span className="font-bold text-text-primary hover:text-[#0078d4]">Mails</span>
        </button>
        <Link href="/calendario" className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors">
          <Calendar className="w-4.5 h-4.5" />
          <span>Calendario</span>
        </Link>
        <Link href="/chat" className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors">
          <MessageSquare className="w-4.5 h-4.5" />
          <span>Chat</span>
        </Link>
      </nav>

      <MailModal 
        isOpen={isMailOpen} 
        onClose={() => setIsMailOpen(false)} 
        userSession={sessionData}
      />
    </>
  );
}


