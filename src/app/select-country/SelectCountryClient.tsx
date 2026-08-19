"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { selectCountryAction } from "@/actions/countries";
import { Globe, ArrowRight, Loader2 } from "lucide-react";

interface Country {
  id: string;
  code: string;
  nombre: string;
  isPrincipal: boolean;
}

const getFlagUrl = (code: string) => {
  const cleanCode = code.trim().toLowerCase();
  if (cleanCode === "nv") {
    return "/flags/nv.png";
  }
  if (cleanCode.length === 2) {
    return `https://flagcdn.com/${cleanCode}.svg`;
  }
  return null;
};

export default function SelectCountryClient({
  initialCountries,
}: {
  initialCountries: Country[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = (code: string, id: string) => {
    setSelectedId(id);
    startTransition(async () => {
      const res = await selectCountryAction(code);
      if (res.success) {
        // Redirigir a login o raíz del sistema
        router.push("/login");
        router.refresh();
      }
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#070708] text-gray-200 p-6 relative overflow-hidden">
      {/* Background Video from YouTube */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <iframe
          src="https://www.youtube.com/embed/7KXGZAEWzn0?autoplay=1&mute=1&controls=0&loop=1&playlist=7KXGZAEWzn0&start=90&modestbranding=1&rel=0&iv_load_policy=3&showinfo=0&disablekb=1&fs=0"
          className="absolute top-1/2 left-1/2 w-[300%] h-[300%] md:w-[120%] md:h-[120%] -translate-x-1/2 -translate-y-1/2 aspect-video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          style={{ border: 'none' }}
        />
        {/* Premium dark backdrop-blur overlay */}
        <div className="absolute inset-0 bg-[#070708]/65 backdrop-blur-[1px]" />
      </div>

      {/* Background gradients for premium feel */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-4xl flex flex-col items-center z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex p-3 bg-white/5 border border-white/10 rounded-full mb-6 backdrop-blur-md">
            <img 
              src="/Log Star.png" 
              alt="Logo Star" 
              className="w-12 h-12 object-contain"
            />
          </div>
          <h1 className="text-4xl md:text-5xl font-extralight tracking-widest text-white mb-4">
            Aitue Cominca S.A.
          </h1>
          <p className="text-gray-400 text-sm md:text-base max-w-md mx-auto tracking-wide uppercase">
            Seleccione la región o subdivisión del sistema
          </p>
        </div>

        {/* Countries Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl">
          {initialCountries.map((country) => {
            const isSelected = selectedId === country.id;
            const flagUrl = getFlagUrl(country.code);

            return (
              <button
                key={country.id}
                onClick={() => handleSelect(country.code, country.id)}
                disabled={isPending}
                className={`relative group text-left p-6 rounded-xl border transition-all duration-300 backdrop-blur-md cursor-pointer ${
                  isSelected
                    ? "bg-[#0078D7]/10 border-[#0078D7] shadow-[0_0_25px_rgba(0,120,215,0.15)]"
                    : "bg-[#141416]/60 border-white/5 hover:border-white/15 hover:bg-[#1a1a1e]/80 hover:shadow-xl"
                } ${isPending && !isSelected ? "opacity-40" : ""}`}
              >
                {/* Principal Badge */}
                {country.isPrincipal && (
                  <span className="absolute top-4 right-4 bg-[#0078D7] text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Principal
                  </span>
                )}

                {/* Card Content */}
                <div className="flex flex-col h-full justify-between">
                  <div className="mb-4">
                    {flagUrl ? (
                      <img 
                        src={flagUrl} 
                        alt={`Bandera de ${country.nombre}`} 
                        className="w-12 h-8 object-cover rounded shadow border border-white/10 group-hover:scale-105 transition-transform duration-300 origin-left"
                      />
                    ) : (
                      <span className="text-3xl">🌐</span>
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-medium text-white mb-1">
                      {country.nombre}
                    </h2>
                    <p className="text-xs text-gray-500 font-mono tracking-wider">
                      CÓDIGO: {country.code}
                    </p>
                  </div>

                  <div className="mt-6 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#0078D7]">
                    <span>
                      {isSelected && isPending ? "Ingresando..." : "Ingresar"}
                    </span>
                    {isSelected && isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[#0078D7]" />
                    ) : (
                      <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer info */}
        <p className="mt-12 text-xs text-gray-600 tracking-wide text-center">
          SISTEMA DE GESTIÓN CENTRALIZADO • AITUE COMINCA S.A.
        </p>
      </div>
    </div>
  );
}
