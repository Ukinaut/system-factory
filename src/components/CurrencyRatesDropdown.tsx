"use client";

import { useState, useEffect, useRef } from "react";
import { Coins, RefreshCw, Calculator, TrendingUp, CreditCard, Banknote } from "lucide-react";
import { scrapeBnaRates } from "@/actions/bna";

export default function CurrencyRatesDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [exchangeMode, setExchangeMode] = useState<"billete" | "transfer">("billete");
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [sourceInfo, setSourceInfo] = useState<string>("Cargando...");

  // Rates dictionary
  const [scrapedRates, setScrapedRates] = useState({
    usd_billete: 960.00,
    eur_billete: 1045.00,
    usd_transfer: 926.40,
    eur_transfer: 1008.00,
    brl_billete: 172.80,
    brl_transfer: 166.60
  });

  // Calculator state
  const [calcAmount, setCalcAmount] = useState<string>("1");
  const [calcFrom, setCalcFrom] = useState<string>("USD");
  const [calcTo, setCalcTo] = useState<string>("ARS");
  const [calcResult, setCalcResult] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const fetchRates = async () => {
    setLoading(true);
    try {
      const res = await scrapeBnaRates();
      if (res.success && res.rates) {
        setScrapedRates({
          usd_billete: res.rates.usd_billete,
          eur_billete: res.rates.eur_billete,
          brl_billete: res.rates.brl_billete,
          usd_transfer: res.rates.usd_transfer,
          eur_transfer: res.rates.eur_transfer,
          brl_transfer: res.rates.brl_transfer
        });
        setSourceInfo(res.source || "BNA Directo");
        setLastUpdated(new Date().toLocaleDateString([], {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        }));
      }
    } catch (error) {
      console.error("Error fetching rates:", error);
      setLastUpdated(new Date().toLocaleDateString() + " (Offline)");
      setSourceInfo("Offline");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();

    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Compute active rates based on mode
  const usdRate = exchangeMode === "billete" ? scrapedRates.usd_billete : scrapedRates.usd_transfer;
  const eurRate = exchangeMode === "billete" ? scrapedRates.eur_billete : scrapedRates.eur_transfer;
  const brlRate = exchangeMode === "billete" ? scrapedRates.brl_billete : scrapedRates.brl_transfer;

  // Dictionary for easy access in calculator
  const computedRates: Record<string, number> = {
    USD: usdRate,
    EUR: eurRate,
    BRL: brlRate,
    ARS: 1
  };

  // Recalculate calculator result
  useEffect(() => {
    const amount = parseFloat(calcAmount);
    if (isNaN(amount) || amount <= 0) {
      setCalcResult(null);
      return;
    }

    const rateFrom = computedRates[calcFrom];
    const rateTo = computedRates[calcTo];

    if (rateFrom && rateTo) {
      const amountInArs = amount * rateFrom;
      const result = amountInArs / rateTo;
      setCalcResult(result);
    } else {
      setCalcResult(null);
    }
  }, [calcAmount, calcFrom, calcTo, scrapedRates, exchangeMode]);

  return (
    <div className="relative" ref={containerRef}>
      {/* Bubble Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-full bg-bg-card border border-border-custom hover:border-[#0078D7] hover:text-[#0078D7] flex items-center justify-center transition-all duration-200 cursor-pointer relative shadow-sm"
        title="Cotizaciones del día"
      >
        <Coins className="w-5 h-5 text-text-muted hover:text-[#0078D7]" />
        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0078D7] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#0078D7]"></span>
        </span>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 bg-bg-card border border-border-custom rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 backdrop-blur-md">
          {/* Header */}
          <div className="p-4 border-b border-border-custom bg-bg-subtle flex justify-between items-center">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#0078D7]" />
              <span className="font-bold text-xs uppercase tracking-wider text-text-primary">Cotización BNA</span>
            </div>
            <button
              onClick={fetchRates}
              className={`text-text-muted hover:text-text-primary transition-colors p-1 rounded hover:bg-bg-card cursor-pointer ${
                loading ? "animate-spin" : ""
              }`}
              title="Actualizar cotizaciones"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mode Selector Toggles */}
          <div className="p-3 bg-bg-subtle/30 border-b border-border-custom flex gap-2 justify-center">
            <button
              onClick={() => setExchangeMode("billete")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer border ${
                exchangeMode === "billete"
                  ? "bg-[#0078D7] text-white border-transparent shadow-sm"
                  : "bg-bg-card text-text-muted border-border-custom hover:text-text-primary"
              }`}
            >
              <Banknote className="w-3.5 h-3.5" />
              Billete Físico
            </button>
            <button
              onClick={() => setExchangeMode("transfer")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer border ${
                exchangeMode === "transfer"
                  ? "bg-[#0078D7] text-white border-transparent shadow-sm"
                  : "bg-bg-card text-text-muted border-border-custom hover:text-text-primary"
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              Transferencia / Divisas
            </button>
          </div>

          {/* Rates List */}
          <div className="p-4 space-y-3.5 border-b border-border-custom">
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-secondary font-medium">💵 USD a ARS</span>
              <span className="font-mono font-bold text-emerald-500">
                $ {usdRate.toLocaleString([], { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-secondary font-medium">💶 EUR a ARS</span>
              <span className="font-mono font-bold text-emerald-500">
                $ {eurRate.toLocaleString([], { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-secondary font-medium">🇧🇷 BRL a ARS</span>
              <span className="font-mono font-bold text-emerald-500">
                $ {brlRate.toLocaleString([], { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs border-t border-border-custom/50 pt-2.5">
              <span className="text-text-secondary font-medium">💵 USD a EUR</span>
              <span className="font-mono font-bold text-text-primary">
                € {(usdRate / eurRate).toLocaleString([], { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Interactive Calculator Section */}
          <div className="p-4 bg-bg-subtle/50 space-y-3">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">
              <Calculator className="w-3.5 h-3.5 text-[#0078D7]" />
              <span>Calculadora Express ({exchangeMode === "billete" ? "Billete" : "Divisa"})</span>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                value={calcAmount}
                onChange={(e) => setCalcAmount(e.target.value)}
                className="col-span-1 bg-bg-card border border-border-custom rounded px-2 py-1 text-xs text-text-primary font-semibold outline-none focus:border-[#0078D7]"
                placeholder="1.00"
              />
              <select
                value={calcFrom}
                onChange={(e) => setCalcFrom(e.target.value)}
                className="col-span-1 bg-bg-card border border-border-custom rounded px-1 py-1 text-xs text-text-primary font-bold outline-none cursor-pointer"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="BRL">BRL</option>
                <option value="ARS">ARS</option>
              </select>
              <select
                value={calcTo}
                onChange={(e) => setCalcTo(e.target.value)}
                className="col-span-1 bg-bg-card border border-border-custom rounded px-1 py-1 text-xs text-text-primary font-bold outline-none cursor-pointer"
              >
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="BRL">BRL</option>
              </select>
            </div>

            {calcResult !== null && (
              <div className="bg-bg-card p-2 rounded border border-border-custom text-center">
                <span className="text-[10px] text-text-muted uppercase block font-semibold tracking-wide">Resultado aproximado</span>
                <span className="font-mono text-sm font-bold text-emerald-500">
                  {calcTo === "ARS" ? "$" : calcTo === "USD" ? "US$" : calcTo === "EUR" ? "€" : ""} {calcResult.toLocaleString([], { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 bg-bg-subtle text-center border-t border-border-custom">
            <span className="text-[9px] text-text-muted block">
              Fuente: {sourceInfo} • {lastUpdated || "Cargando..."}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
