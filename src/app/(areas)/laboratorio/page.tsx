"use client";

import { TestTube, Construction, Clock, ArrowLeft, Sparkles, Wrench, Cpu } from "lucide-react";
import Link from "next/link";

export default function LaboratorioDashboard() {
  return (
    <div className="w-full min-h-[75vh] flex flex-col items-center justify-center p-6 text-center">
      {/* Container Card with Glassmorphism */}
      <div className="relative w-full max-w-2xl bg-bg-card/80 border border-emerald-500/30 rounded-2xl p-8 sm:p-12 shadow-2xl backdrop-blur-xl space-y-8 overflow-hidden">
        
        {/* Decorative Background Glowing Orbs */}
        <div className="absolute -top-20 -left-20 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header Icon */}
        <div className="relative inline-flex items-center justify-center">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/5 border border-emerald-500/40 flex items-center justify-center shadow-xl shadow-emerald-500/10">
            <TestTube className="w-12 h-12 text-emerald-400 animate-pulse" />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-bg-card p-2 rounded-xl border-2 border-bg-card shadow-md">
            <Construction className="w-5 h-5 text-gray-900" />
          </div>
        </div>

        {/* Status Badge */}
        <div>
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            En Desarrollo
          </span>
        </div>

        {/* Main Title & Message */}
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight">
            AITUE Admin Hub - Laboratorio
          </h1>
          <h2 className="text-xl sm:text-2xl font-semibold text-emerald-400 tracking-wide">
            Próximamente seguiremos trabajando en el mismo
          </h2>
          <p className="text-text-muted text-sm sm:text-base max-w-lg mx-auto leading-relaxed pt-2">
            Estamos desarrollando el módulo técnico de Laboratorio, gestión de órdenes RMA, diagnóstico de hardware satelital, control de repuestos y calibración de equipos en campo.
          </p>
        </div>

        {/* Features Preview / Status Items */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="bg-bg-subtle/60 border border-border-custom/60 rounded-xl p-3.5 text-left flex items-center gap-3">
            <Cpu className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-text-primary">Laboratorio RMA</p>
              <p className="text-[11px] text-text-muted">Diagnóstico & Hardware</p>
            </div>
          </div>
          <div className="bg-bg-subtle/60 border border-border-custom/60 rounded-xl p-3.5 text-left flex items-center gap-3">
            <Clock className="w-5 h-5 text-teal-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-text-primary">Estado</p>
              <p className="text-[11px] text-text-muted">En Construcción</p>
            </div>
          </div>
          <div className="bg-bg-subtle/60 border border-border-custom/60 rounded-xl p-3.5 text-left flex items-center gap-3">
            <Wrench className="w-5 h-5 text-green-400 shrink-0" />
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
