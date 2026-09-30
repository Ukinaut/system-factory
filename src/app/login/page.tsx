"use client";

import { useActionState } from "react";
import { loginAction } from "@/actions/auth";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null);

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-[#070b14] text-gray-100">
      {/* Background Image - Blurred with scale to avoid border artifacts */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transform scale-105 filter blur-[5px] transition-all duration-700"
        style={{ backgroundImage: "url('/login-bg.jpg')" }}
      />
      {/* Blue Tinted Overlay with Backdrop Blur */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/80 via-[#070b14]/75 to-blue-900/60 backdrop-blur-sm" />

      {/* Esquina Superior Izquierda: Logo Aitue con brillo y texto */}
      <div className="absolute top-6 left-6 sm:top-8 sm:left-8 z-20 flex items-center gap-3.5">
        <div className="relative flex items-center justify-center">
          <div className="absolute -inset-2 rounded-full bg-blue-500/40 blur-lg animate-pulse pointer-events-none" />
          <img 
            src="/logo.png" 
            alt="Aitue Logo" 
            className="w-12 h-12 sm:w-14 sm:h-14 object-contain relative z-10 filter drop-shadow-[0_0_18px_rgba(0,112,243,0.9)] animate-pulse" 
          />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-black tracking-wide text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
            Aitue Comunica S.A.
          </h2>
          <p className="text-[10px] sm:text-xs text-blue-400 font-bold uppercase tracking-widest drop-shadow">
            Soluciones en Telecomunicaciones
          </p>
        </div>
      </div>

      {/* Esquina Superior Derecha: Texto Animado que aparece y desaparece */}
      <div className="absolute top-6 right-6 sm:top-8 sm:right-8 z-20 text-right">
        <div className="px-4 py-2 rounded-2xl bg-blue-950/50 border border-blue-400/30 backdrop-blur-md shadow-[0_0_20px_rgba(0,102,255,0.2)]">
          <span className="text-xs sm:text-sm font-black tracking-wider text-blue-300 uppercase animate-pulse drop-shadow-[0_0_15px_rgba(59,130,246,0.9)]">
            ¡Si ves el Cielo, Estamos!
          </span>
        </div>
      </div>

      {/* Glassmorphic Login Card */}
      <div className="relative z-10 w-full max-w-md mx-4 p-8 sm:p-9 bg-[#080d19]/90 backdrop-blur-md rounded-3xl border border-blue-500/30 shadow-[0_25px_60px_rgba(0,102,255,0.2)]">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mb-3 shadow-inner">
            <img 
              src="/logo.png" 
              alt="Aitue Logo Small" 
              className="w-8 h-8 object-contain"
            />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white text-center">Acceso al Sistema</h1>
          <p className="text-xs text-blue-400 font-semibold tracking-widest uppercase mt-1">PANEL DE GESTIÓN</p>
        </div>

        {state?.error && (
          <div className="bg-rose-500/15 border-l-4 border-rose-500 text-rose-300 p-3 mb-5 text-xs rounded-r-lg font-medium">
            {state.error}
          </div>
        )}

        <form action={formAction} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Correo Electrónico
            </label>
            <input
              type="text"
              name="correo"
              required
              className="w-full bg-[#0d1629]/90 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all outline-none"
              placeholder="admin@systemfactory.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Contraseña
            </label>
            <input
              type="password"
              name="password"
              required
              className="w-full bg-[#0d1629]/90 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all outline-none"
              placeholder="••••••••"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 cursor-pointer text-xs uppercase tracking-wider flex items-center justify-center gap-2"
            >
              {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "INGRESAR AL SISTEMA"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}



