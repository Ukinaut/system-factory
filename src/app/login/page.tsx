"use client";

import { useState, useEffect, useActionState } from "react";
import { loginAction } from "@/actions/auth";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null);

  // Typewriter effect state for top right slogan
  const fullText1 = "SI VES";
  const fullText2 = "EL CIELO ,";
  const fullText3 = "ESTAMOS";

  const line1Len = fullText1.length;
  const line2Len = fullText2.length;
  const totalLength = line1Len + line2Len + fullText3.length;

  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (!isDeleting && charIndex < totalLength) {
      timer = setTimeout(() => {
        setCharIndex((prev) => prev + 1);
      }, 70);
    } else if (!isDeleting && charIndex === totalLength) {
      timer = setTimeout(() => {
        setIsDeleting(true);
      }, 3500);
    } else if (isDeleting && charIndex > 0) {
      timer = setTimeout(() => {
        setCharIndex((prev) => prev - 1);
      }, 35);
    } else if (isDeleting && charIndex === 0) {
      timer = setTimeout(() => {
        setIsDeleting(false);
      }, 800);
    }
    return () => clearTimeout(timer);
  }, [charIndex, isDeleting, totalLength]);

  const currentLine1 = fullText1.slice(0, Math.min(charIndex, line1Len));
  const currentLine2 = charIndex > line1Len ? fullText2.slice(0, Math.min(charIndex - line1Len, line2Len)) : "";
  const currentLine3 = charIndex > line1Len + line2Len ? fullText3.slice(0, charIndex - line1Len - line2Len) : "";
  const showDot = charIndex >= totalLength;

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
            className="w-12 h-12 sm:w-14 sm:h-14 object-contain relative z-10 filter drop-shadow-[0_0_20px_rgba(0,112,243,0.9)] animate-pulse" 
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

      {/* Esquina Superior Derecha: Texto Estilizado con Línea Azul y Animación de Escritura */}
      <div className="absolute top-6 right-6 sm:top-10 sm:right-10 z-20 flex items-stretch gap-4 pointer-events-none">
        {/* Blue vertical accent line matching the sample image */}
        <div className="w-[3px] bg-[#0070f3] rounded-full shadow-[0_0_12px_rgba(0,112,243,0.8)] shrink-0 my-0.5" />
        
        {/* Typewriter Text layout */}
        <div className="flex flex-col justify-between text-left font-sans min-h-[64px] min-w-[160px] py-0.5">
          <div className="text-xs sm:text-sm text-slate-200 font-light uppercase tracking-[0.28em] h-5 flex items-center leading-none">
            {currentLine1}
            {charIndex > 0 && charIndex <= line1Len && (
              <span className="inline-block w-1.5 h-3.5 bg-[#0070f3] ml-0.5 animate-pulse" />
            )}
          </div>
          <div className="text-xs sm:text-sm text-slate-200 font-light uppercase tracking-[0.28em] h-5 flex items-center leading-none">
            {currentLine2}
            {charIndex > line1Len && charIndex <= line1Len + line2Len && (
              <span className="inline-block w-1.5 h-3.5 bg-[#0070f3] ml-0.5 animate-pulse" />
            )}
          </div>
          <div className="text-sm sm:text-base text-white font-extrabold tracking-[0.22em] uppercase h-6 flex items-center leading-none">
            {currentLine3}
            {showDot ? (
              <span className="text-[#0070f3] font-black text-lg ml-0.5 drop-shadow-[0_0_8px_#0070f3]">.</span>
            ) : (
              charIndex > line1Len + line2Len && (
                <span className="inline-block w-1.5 h-4 bg-[#0070f3] ml-0.5 animate-pulse" />
              )
            )}
          </div>
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




