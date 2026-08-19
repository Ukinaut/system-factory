"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Check, Info } from "lucide-react";
import { getNotifications, markNotificationAsRead } from "@/actions/notifications";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    const res = await getNotifications();
    if (res.success && res.notifications) {
      setNotifications(res.notifications);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Polling every 10 seconds to fetch new notifications
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.leida).length;

  const handleMarkAsRead = async (id: string) => {
    const res = await markNotificationAsRead(id);
    if (res.success) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, leida: true } : n))
      );
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 bg-bg-card hover:bg-bg-subtle text-text-muted hover:text-text-primary rounded-lg border border-border-custom transition-all cursor-pointer flex items-center justify-center outline-none focus:border-[#0078D7]"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-bg-main animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-80 bg-bg-card border border-border-custom rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="p-4 border-b border-border-custom bg-bg-subtle flex justify-between items-center">
            <h3 className="font-bold text-sm text-text-primary tracking-wide">Notificaciones</h3>
            {unreadCount > 0 && (
              <span className="text-[11px] bg-red-500/10 text-red-500 font-semibold px-2 py-0.5 rounded-full">
                {unreadCount} Nuevas
              </span>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-border-custom">
            {notifications.length > 0 ? (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-4 transition-colors relative flex items-start gap-3 ${
                    n.leida ? "bg-bg-card opacity-70" : "bg-bg-subtle/40 hover:bg-bg-subtle"
                  }`}
                >
                  <div className="mt-0.5 bg-[#0078D7]/10 p-1.5 rounded text-[#0078D7]">
                    <Info className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="text-xs font-bold text-text-primary truncate">{n.titulo}</p>
                    <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{n.mensaje}</p>
                    <span className="text-[10px] text-text-muted mt-1 block">
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {!n.leida && (
                    <button
                      onClick={() => handleMarkAsRead(n.id)}
                      className="absolute right-3 top-4 text-text-muted hover:text-emerald-500 transition-colors p-1 cursor-pointer"
                      title="Marcar como leída"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-text-muted text-xs italic">
                Sin notificaciones pendientes.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
