"use client";

import { ShoppingBag, Construction, Clock, ArrowLeft, Sparkles, Code2, Wrench } from "lucide-react";
import Link from "next/link";

export default function TiendaDashboardClient() {
  return (
    <div className="w-full min-h-[75vh] flex flex-col items-center justify-center p-6 text-center">
      {/* Container Card with Glassmorphism */}
      <div className="relative w-full max-w-2xl bg-bg-card/80 border border-purple-500/30 rounded-2xl p-8 sm:p-12 shadow-2xl backdrop-blur-xl space-y-8 overflow-hidden">
        
        {/* Decorative Background Glowing Orbs */}
        <div className="absolute -top-20 -left-20 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header Icon */}
        <div className="relative inline-flex items-center justify-center">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/5 border border-purple-500/40 flex items-center justify-center shadow-xl shadow-purple-500/10">
            <ShoppingBag className="w-12 h-12 text-purple-400 animate-pulse" />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-purple-600 text-white p-2 rounded-xl border-2 border-bg-card shadow-md">
            <Construction className="w-5 h-5" />
          </div>
        </div>

        {/* Status Badge */}
        <div>
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-purple-500/10 border border-purple-500/30 text-purple-300 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            En Desarrollo
          </span>
        </div>

        {/* Main Title & Message */}
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight">
            Tienda Online & Vinculación API
          </h1>
          <h2 className="text-xl sm:text-2xl font-semibold text-purple-400 tracking-wide">
            Próximamente seguiremos trabajando en el mismo
          </h2>
          <p className="text-text-muted text-sm sm:text-base max-w-lg mx-auto leading-relaxed pt-2">
            Estamos construyendo el canal de integración e-commerce vía API para automatizar el ingreso de ventas, emisión de comprobantes y sincronización de stock en tiempo real.
          </p>
        </div>

        {/* Features Preview / Status Items */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="bg-bg-subtle/60 border border-border-custom/60 rounded-xl p-3.5 text-left flex items-center gap-3">
            <Code2 className="w-5 h-5 text-purple-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-text-primary">Vinculación API</p>
              <p className="text-[11px] text-text-muted">Webhooks Live</p>
            </div>
          </div>
          <div className="bg-bg-subtle/60 border border-border-custom/60 rounded-xl p-3.5 text-left flex items-center gap-3">
            <Clock className="w-5 h-5 text-blue-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-text-primary">Estado</p>
              <p className="text-[11px] text-text-muted">En Construcción</p>
            </div>
          </div>
          <div className="bg-bg-subtle/60 border border-border-custom/60 rounded-xl p-3.5 text-left flex items-center gap-3">
            <Wrench className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-text-primary">Próximamente</p>
              <p className="text-[11px] text-text-muted">Disponible pronto</p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-4">
          <Link
            href="/ventas"
            className="inline-flex items-center gap-2 bg-[#0078D7] hover:bg-[#005a9e] text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-[#0078D7]/20 hover:scale-105 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a Ventas
          </Link>
        </div>

      </div>
    </div>
  );
}
