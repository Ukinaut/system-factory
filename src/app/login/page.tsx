"use client";

import { useActionState } from "react";
import { loginAction } from "@/actions/auth";
import { ShieldCheck, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#000000] text-gray-200">
      <div className="w-full max-w-md p-10 bg-[#1c1c1c] rounded border border-[#333333] shadow-2xl">
        <div className="flex flex-col items-center mb-10">
          <img 
            src="/logo.png" 
            alt="Aitue Cominca S.A. Logo" 
            className="w-16 h-16 object-contain mb-6" 
          />
          <h1 className="text-3xl font-light tracking-widest text-white">Aitue Cominca S.A.</h1>
          <p className="text-gray-500 mt-2 text-sm tracking-wide">ACCESO AL SISTEMA DE GESTIÓN</p>
        </div>

        {state?.error && (
          <div className="bg-red-500/10 border-l-4 border-red-500 text-red-400 p-3 mb-6 text-sm">
            {state.error}
          </div>
        )}

        <form action={formAction} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Correo Electrónico (Para Pruebas)
            </label>
            <input
              type="text"
              name="correo"
              required
              className="w-full bg-[#0f0f0f] border border-[#333333] rounded-md px-4 py-3 text-white focus:border-[#0078D7] transition-colors outline-none"
              placeholder="admin@systemfactory.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Contraseña
            </label>
            <input
              type="password"
              name="password"
              required
              className="w-full bg-[#0f0f0f] border border-[#333333] rounded-md px-4 py-3 text-white focus:border-[#0078D7] transition-colors outline-none"
              placeholder="••••••••"
            />
          </div>

          <div className="pt-2">
            <p className="text-xs text-gray-500 mb-4 bg-[#222] p-3 rounded border border-[#333]">
              <strong>Cuentas de prueba:</strong><br/>
              - admin@systemfactory.com (Pass: admin123)<br/>
              - tecnico@systemfactory.com (Pass: tecnico123)<br/>
              - ventas@systemfactory.com (Pass: ventas123)
            </p>

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-[#0078D7] hover:bg-[#005a9e] disabled:opacity-50 text-white font-medium py-3 px-4 rounded-md transition-colors mt-4 tracking-wide flex items-center justify-center gap-2"
            >
              {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "INGRESAR"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
