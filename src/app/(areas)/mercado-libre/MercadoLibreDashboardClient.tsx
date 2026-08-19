"use client";

import { useState, useEffect } from "react";
import { 
  ArrowLeft, 
  ShoppingBag, 
  Link2, 
  CheckCircle, 
  Clock, 
  MessageSquare, 
  Printer, 
  TrendingUp, 
  Search, 
  AlertCircle, 
  Send,
  FileText,
  User,
  Zap,
  X
} from "lucide-react";
import Link from "next/link";

interface MLSale {
  id: string;
  comprador: string;
  producto: string;
  fecha: string;
  monto: number;
  tipoEnvio: "FULL" | "MERCADO_ENVIOS" | "ACUERDO";
  estadoEnvio: "PARA_DESPACHAR" | "DESPACHADO" | "ENTREGADO";
  estadoPago: "APROBADO" | "PENDIENTE";
  direccion: string;
}

interface MLQuestion {
  id: string;
  comprador: string;
  pregunta: string;
  producto: string;
  fecha: string;
  respondida: boolean;
  respuesta?: string;
}

export default function MercadoLibreDashboardClient() {
  const [isLinked, setIsLinked] = useState<boolean>(false);
  const [linking, setLinking] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"ventas" | "preguntas">("ventas");
  const [busqueda, setBusqueda] = useState<string>("");
  const [selectedSale, setSelectedSale] = useState<MLSale | null>(null);
  const [printModalType, setPrintModalType] = useState<"etiqueta" | "factura" | null>(null);
  const [chatSale, setChatSale] = useState<MLSale | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([
    { sender: "buyer", text: "Hola! Buenas tardes. Quería consultar cuándo despachan el producto.", time: "Hace 1 hora" },
    { sender: "seller", text: "Hola! Su pedido se despacha hoy mismo por Mercado Envíos Flex.", time: "Hace 45 min" },
  ]);
  const [newMsg, setNewMsg] = useState("");

  const [questions, setQuestions] = useState<MLQuestion[]>([
    {
      id: "Q-9081",
      comprador: "Mariana Gomez",
      pregunta: "Hola! ¿El stock publicado está disponible para entrega inmediata?",
      producto: "Módulo Sensor de Humedad V2",
      fecha: "Hace 15 min",
      respondida: false
    },
    {
      id: "Q-9082",
      comprador: "Carlos Falcon",
      pregunta: "Buenas tardes, ¿tienen stock en color negro? ¿Hacen envíos a Córdoba?",
      producto: "Gabinete Extruido de Aluminio Pro",
      fecha: "Hace 40 min",
      respondida: false
    },
    {
      id: "Q-9083",
      comprador: "Eduardo Lopez",
      pregunta: "¿Emiten Factura A a CUIT responsable inscripto?",
      producto: "Fuente Conmutada 12V 20A",
      fecha: "Hace 2 horas",
      respondida: false
    }
  ]);

  const [sales, setSales] = useState<MLSale[]>([
    {
      id: "ML-398271629",
      comprador: "Julio Cesar",
      producto: "5x Módulo Sensor de Humedad V2",
      fecha: "Hoy, 11:20",
      monto: 34500,
      tipoEnvio: "FULL",
      estadoEnvio: "PARA_DESPACHAR",
      estadoPago: "APROBADO",
      direccion: "Av. Corrientes 1245, Piso 4, CABA (1043)"
    },
    {
      id: "ML-398271501",
      comprador: "Valeria Perez",
      producto: "1x Gabinete Extruido de Aluminio Pro",
      fecha: "Hoy, 09:15",
      monto: 18900,
      tipoEnvio: "MERCADO_ENVIOS",
      estadoEnvio: "PARA_DESPACHAR",
      estadoPago: "APROBADO",
      direccion: "Calle 14 N° 528, La Plata, Buenos Aires (1900)"
    },
    {
      id: "ML-398269411",
      comprador: "Roberto Benitez",
      producto: "2x Fuente Conmutada 12V 20A",
      fecha: "Ayer, 18:40",
      monto: 56000,
      tipoEnvio: "MERCADO_ENVIOS",
      estadoEnvio: "DESPACHADO",
      estadoPago: "APROBADO",
      direccion: "San Martín 150, Neuquén Capital (8300)"
    },
    {
      id: "ML-398255902",
      comprador: "Gaston Herrera",
      producto: "10x Conector XT60 Macho/Hembra",
      fecha: "23 Jul, 14:10",
      monto: 12500,
      tipoEnvio: "ACUERDO",
      estadoEnvio: "ENTREGADO",
      estadoPago: "APROBADO",
      direccion: "Retira en Sucursal Almagro"
    }
  ]);

  useEffect(() => {
    const savedLink = localStorage.getItem("ml_linked");
    if (savedLink === "true") {
      setIsLinked(true);
    }
  }, []);

  const handleLinkML = () => {
    setLinking(true);
    setTimeout(() => {
      setLinking(false);
      setIsLinked(true);
      localStorage.setItem("ml_linked", "true");
    }, 2000);
  };

  const handleUnlinkML = () => {
    if (confirm("¿Está seguro de que desea desvincular la cuenta de Mercado Libre?")) {
      setIsLinked(false);
      localStorage.removeItem("ml_linked");
    }
  };

  const handleSendResponse = (qId: string, text: string) => {
    if (!text.trim()) return;
    setQuestions(prev => prev.map(q => q.id === qId ? { ...q, respondida: true, respuesta: text } : q));
    alert("Respuesta enviada con éxito a Mercado Libre.");
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim()) return;
    setChatMessages([...chatMessages, { sender: "seller", text: newMsg, time: "Ahora" }]);
    setNewMsg("");
  };

  const filteredSales = sales.filter(s => 
    s.comprador.toLowerCase().includes(busqueda.toLowerCase()) ||
    s.id.toLowerCase().includes(busqueda.toLowerCase()) ||
    s.producto.toLowerCase().includes(busqueda.toLowerCase())
  );

  const pendingQuestions = questions.filter(q => !q.respondida);

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <ShoppingBag className="text-yellow-500 w-9 h-9 animate-pulse" />
            <div>
              <h1 className="text-3xl font-bold text-text-primary tracking-wide">
                Mercado Libre
              </h1>
              <p className="text-text-muted text-xs mt-1">Conexión, control de publicaciones, consultas y etiquetas de Mercado Envíos.</p>
            </div>
          </div>
        </div>

        {isLinked && (
          <button 
            onClick={handleUnlinkML}
            className="text-xs bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white px-3 py-2 rounded-lg border border-red-500/30 transition-all font-semibold cursor-pointer"
          >
            Desvincular Cuenta
          </button>
        )}
      </div>

      {!isLinked ? (
        <div className="bg-bg-card border border-border-custom rounded-xl p-8 max-w-xl mx-auto text-center shadow-xl space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-500">
            <Link2 className="w-8 h-8 animate-pulse" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-text-primary">Vincular con Mercado Libre</h2>
            <p className="text-sm text-text-muted leading-relaxed">
              Conecta tu cuenta de Mercado Libre para sincronizar automáticamente el stock de tus productos, importar las ventas recibidas y responder a las consultas de tus compradores en tiempo real.
            </p>
          </div>
          <div className="bg-bg-subtle border border-border-custom/50 rounded-lg p-4 text-xs text-text-muted text-left space-y-2">
            <p className="font-bold text-text-primary">Permisos autorizados:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Lectura y escritura de ventas y órdenes de envío.</li>
              <li>Sincronización de precios y stock con publicaciones de Mercado Libre.</li>
              <li>Lectura y respuesta de preguntas y chat de compradores.</li>
            </ul>
          </div>
          <button
            onClick={handleLinkML}
            disabled={linking}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-bg-card font-black py-3 px-6 rounded-lg text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-yellow-500/10"
          >
            {linking ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-bg-card border-t-transparent rounded-full animate-spin"></span>
                Estableciendo Conexión API...
              </span>
            ) : (
              <>
                <Link2 className="w-4.5 h-4.5" />
                Vincular Cuenta Aitue Oficial
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-yellow-500/10 to-transparent border border-yellow-500/30 rounded-xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-500 border border-yellow-500/40">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wider font-bold">Cuenta Activa</p>
                <h3 className="font-bold text-text-primary text-base">AITUE TIENDA OFICIAL <span className="text-xs font-normal text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded ml-2 uppercase">Sincronizado</span></h3>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-text-muted">
              <span>Token expira: <strong className="text-text-primary">En 180 días</strong></span>
              <button onClick={handleLinkML} className="text-yellow-500 hover:underline font-bold">Refrescar API</button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-bg-card border border-border-custom p-5 rounded-xl flex justify-between items-center shadow-sm">
              <div>
                <span className="text-xs text-text-muted font-bold uppercase tracking-wider">Ventas del Mes</span>
                <h2 className="text-2xl font-black text-text-primary mt-1">142</h2>
              </div>
              <div className="p-3 bg-yellow-500/10 rounded-lg text-yellow-500">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="bg-bg-card border border-border-custom p-5 rounded-xl flex justify-between items-center shadow-sm">
              <div>
                <span className="text-xs text-text-muted font-bold uppercase tracking-wider">Envíos por Despachar</span>
                <h2 className="text-2xl font-black text-rose-500 mt-1">{sales.filter(s => s.estadoEnvio === "PARA_DESPACHAR").length}</h2>
              </div>
              <div className="p-3 bg-rose-500/10 rounded-lg text-rose-500">
                <Clock className="w-5 h-5 animate-pulse" />
              </div>
            </div>
            <div className="bg-bg-card border border-border-custom p-5 rounded-xl flex justify-between items-center shadow-sm">
              <div>
                <span className="text-xs text-text-muted font-bold uppercase tracking-wider">Consultas Pendientes</span>
                <h2 className="text-2xl font-black text-amber-500 mt-1">{pendingQuestions.length}</h2>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-lg text-amber-500">
                <MessageSquare className="w-5 h-5" />
              </div>
            </div>
            <div className="bg-bg-card border border-border-custom p-5 rounded-xl flex justify-between items-center shadow-sm">
              <div>
                <span className="text-xs text-text-muted font-bold uppercase tracking-wider">Facturación Mercado Pago</span>
                <h2 className="text-2xl font-black text-emerald-500 mt-1">$121.900</h2>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400">
                <Zap className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="flex border-b border-border-custom gap-4 pb-px">
            <button
              onClick={() => setActiveTab("ventas")}
              className={`px-4 py-2.5 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
                activeTab === "ventas" ? "border-yellow-500 text-yellow-500" : "border-transparent text-text-muted hover:text-text-primary"
              }`}
            >
              Ventas y Envíos
            </button>
            <button
              onClick={() => setActiveTab("preguntas")}
              className={`px-4 py-2.5 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === "preguntas" ? "border-yellow-500 text-yellow-500" : "border-transparent text-text-muted hover:text-text-primary"
              }`}
            >
              Consultas de Compradores
              {pendingQuestions.length > 0 && (
                <span className="bg-yellow-500 text-bg-card font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center">
                  {pendingQuestions.length}
                </span>
              )}
            </button>
          </div>

          {activeTab === "ventas" && (
            <div className="bg-bg-card border border-border-custom rounded-xl overflow-hidden shadow-xl">
              <div className="p-5 border-b border-border-custom bg-bg-subtle flex gap-4">
                <div className="relative flex-1">
                  <Search className="w-5 h-5 absolute left-3 top-3 text-text-muted" />
                  <input
                    type="text"
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    placeholder="Buscar venta por id, comprador o producto..."
                    className="w-full bg-bg-card border border-border-custom rounded-lg pl-10 pr-4 py-2.5 text-sm text-text-primary focus:border-yellow-500 outline-none"
                  />
                </div>
              </div>

              <div className="divide-y divide-border-custom">
                {filteredSales.map(sale => (
                  <div key={sale.id} className="p-6 hover:bg-bg-subtle/50 transition-colors flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div className="flex-1 flex items-start gap-4">
                      <div className="w-12 h-12 bg-bg-subtle rounded-lg border border-border-custom flex items-center justify-center text-yellow-500">
                        <ShoppingBag className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base text-text-primary">{sale.comprador}</span>
                          <span className="text-xs bg-bg-subtle border border-border-custom px-2 py-0.5 rounded text-text-muted font-mono">{sale.id}</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded border uppercase ${
                            sale.tipoEnvio === "FULL" ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/35" :
                            sale.tipoEnvio === "MERCADO_ENVIOS" ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/35" :
                            "bg-amber-500/10 text-amber-500 border-amber-500/35"
                          }`}>
                            {sale.tipoEnvio}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-text-secondary">{sale.producto}</p>
                        <p className="text-xs text-text-muted">Fecha: {sale.fecha} | Dirección: {sale.direccion}</p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 w-full lg:w-auto justify-between lg:justify-end">
                      <div className="text-left sm:text-right">
                        <p className="text-xs text-text-muted uppercase font-bold tracking-wider">Monto Cobrado</p>
                        <p className="text-xl font-black text-emerald-500">${sale.monto.toLocaleString("es-AR")}</p>
                        <span className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-full mt-1 border ${
                          sale.estadoEnvio === "PARA_DESPACHAR" ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                          sale.estadoEnvio === "DESPACHADO" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                          "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        }`}>
                          {sale.estadoEnvio === "PARA_DESPACHAR" ? "Listo para despachar" :
                           sale.estadoEnvio === "DESPACHADO" ? "En camino" : "Entregado"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedSale(sale);
                            setPrintModalType("etiqueta");
                          }}
                          className="flex items-center gap-1.5 bg-[#0078D7]/10 hover:bg-[#0078D7] text-[#0078D7] hover:text-white border border-[#0078D7]/30 hover:border-transparent px-3.5 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer"
                          title="Imprimir etiqueta térmica de correo"
                        >
                          <Printer className="w-4 h-4" />
                          Etiqueta
                        </button>
                        <button
                          onClick={() => {
                            setSelectedSale(sale);
                            setPrintModalType("factura");
                          }}
                          className="flex items-center gap-1.5 bg-bg-card hover:bg-bg-subtle text-text-primary border border-border-custom px-3.5 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer"
                        >
                          <FileText className="w-4 h-4" />
                          Factura
                        </button>
                        <button
                          onClick={() => {
                            setChatSale(sale);
                          }}
                          className="flex items-center gap-1 bg-bg-card hover:bg-bg-subtle text-text-primary border border-border-custom p-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer"
                          title="Chat con el comprador"
                        >
                          <MessageSquare className="w-4.5 h-4.5 text-yellow-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "preguntas" && (
            <div className="space-y-4">
              {pendingQuestions.length > 0 ? (
                pendingQuestions.map(q => (
                  <div key={q.id} className="bg-bg-card border border-border-custom rounded-xl p-6 shadow-md space-y-4">
                    <div className="flex justify-between items-start border-b border-border-custom/50 pb-3">
                      <div>
                        <span className="text-xs text-text-muted font-bold uppercase tracking-wider block">PREGUNTA SOBRE</span>
                        <strong className="text-sm text-yellow-500">{q.producto}</strong>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-text-primary">{q.comprador}</span>
                        <span className="text-xs text-text-muted block">{q.fecha}</span>
                      </div>
                    </div>

                    <div className="bg-bg-subtle p-4 rounded-lg border border-border-custom italic text-base text-text-secondary">
                      "{q.pregunta}"
                    </div>

                    <div className="flex gap-3">
                      <input
                        type="text"
                        placeholder="Escribe tu respuesta pública de Mercado Libre..."
                        id={`input-${q.id}`}
                        className="flex-1 bg-bg-subtle border border-border-custom rounded-lg px-4 py-2.5 text-sm text-text-primary outline-none focus:border-yellow-500"
                        onKeyDown={e => {
                          if (e.key === "Enter") {
                            const val = (e.target as HTMLInputElement).value;
                            handleSendResponse(q.id, val);
                            (e.target as HTMLInputElement).value = "";
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          const input = document.getElementById(`input-${q.id}`) as HTMLInputElement;
                          if (input) {
                            handleSendResponse(q.id, input.value);
                            input.value = "";
                          }
                        }}
                        className="bg-yellow-500 hover:bg-yellow-600 text-bg-card font-bold px-5 py-2.5 rounded-lg text-sm uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                        Responder
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-bg-card border border-border-custom rounded-xl p-12 text-center text-text-muted flex flex-col items-center">
                  <CheckCircle className="w-12 h-12 text-emerald-500/50 mb-3" />
                  <h3 className="text-lg font-bold text-text-primary">¡Excelente!</h3>
                  <p className="text-sm mt-1">No tienes consultas pendientes por responder en Mercado Libre.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* PRINT DIALOG / MODAL */}
      {printModalType && selectedSale && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-card border border-border-custom rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-5 border-b border-border-custom bg-bg-subtle">
              <h3 className="font-bold text-sm text-text-primary flex items-center gap-2 uppercase tracking-wide">
                <Printer className="w-4 h-4 text-yellow-500" />
                Vista previa de impresión ({printModalType})
              </h3>
              <button onClick={() => setPrintModalType(null)} className="text-text-muted hover:text-text-primary cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {printModalType === "etiqueta" ? (
                <div id="print-label-area" className="bg-white text-black p-6 border-4 border-double border-black rounded font-mono text-center space-y-4 max-w-xs mx-auto">
                  <div className="border-b-2 border-black pb-2 flex justify-between items-center">
                    <span className="font-bold text-sm">MERCADO ENVÍOS</span>
                    <span className="font-bold text-xs bg-black text-white px-2 py-0.5 rounded">{selectedSale.tipoEnvio}</span>
                  </div>
                  
                  <div className="py-2 border-b border-black">
                    <div className="h-14 bg-black w-full flex items-center justify-center text-white font-bold text-xs">
                      |||||||||||||||||||||||||||||||||||||||||||||||||
                    </div>
                    <span className="text-[10px] block mt-1 tracking-widest">{selectedSale.id.replace("ML-", "")}</span>
                  </div>

                  <div className="text-left text-xs space-y-2 border-b border-black pb-3">
                    <p><strong>REMITENTE:</strong> AITUE SYSTEM FACTORY</p>
                    <p><strong>DESTINATARIO:</strong> {selectedSale.comprador}</p>
                    <p><strong>DIRECCIÓN:</strong> {selectedSale.direccion}</p>
                  </div>

                  <div className="flex justify-center py-2 border-b border-black">
                    <div className="w-16 h-16 border-2 border-black flex items-center justify-center p-1 bg-gray-100 font-bold text-[8px]">
                      [QR CODE]
                    </div>
                  </div>

                  <div className="text-[10px] text-left">
                    <p><strong>PRODUCTO:</strong> {selectedSale.producto}</p>
                    <p className="mt-1 font-bold text-center">ETIQUETA OFICIAL - CORREO ARGENTINO / OCA</p>
                  </div>
                </div>
              ) : (
                <div id="print-invoice-area" className="bg-white text-black p-6 border border-gray-300 rounded font-sans text-xs space-y-4">
                  <div className="flex justify-between items-start border-b border-gray-300 pb-4">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">AITUE S.R.L.</h2>
                      <p>CUIT: 30-71649231-9</p>
                      <p>Calle Falsa 123, CABA</p>
                    </div>
                    <div className="text-right">
                      <div className="border border-black px-3 py-1 font-bold text-center inline-block text-lg mb-2">A</div>
                      <p><strong>FACTURA N°:</strong> 0005-00048291</p>
                      <p><strong>FECHA:</strong> {selectedSale.fecha.split(",")[0] || "Hoy"}</p>
                    </div>
                  </div>

                  <div className="border-b border-gray-300 pb-3 space-y-1">
                    <p><strong>CLIENTE / COMPRADOR ML:</strong> {selectedSale.comprador}</p>
                    <p><strong>CONDICIÓN IVA:</strong> Consumidor Final</p>
                    <p><strong>DIRECCIÓN DE ENTREGA:</strong> {selectedSale.direccion}</p>
                  </div>

                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-300 bg-gray-100 font-bold">
                        <th className="py-2 px-1">Concepto</th>
                        <th className="py-2 px-1 text-right">Cant.</th>
                        <th className="py-2 px-1 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="py-2 px-1">{selectedSale.producto}</td>
                        <td className="py-2 px-1 text-right">1</td>
                        <td className="py-2 px-1 text-right">${selectedSale.monto.toLocaleString("es-AR")}</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="border-t border-gray-300 pt-3 text-right">
                    <span className="font-bold text-sm mr-4">TOTAL:</span>
                    <span className="font-bold text-base text-gray-900">${selectedSale.monto.toLocaleString("es-AR")}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-border-custom bg-bg-subtle flex justify-end gap-3">
              <button 
                onClick={() => setPrintModalType(null)} 
                className="px-4 py-2 border border-border-custom rounded-lg hover:bg-bg-card transition-colors text-xs font-semibold cursor-pointer"
              >
                Cerrar
              </button>
              <button 
                onClick={() => {
                  window.print();
                }} 
                className="px-5 py-2 bg-yellow-500 hover:bg-yellow-600 text-bg-card font-black rounded-lg text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir Documento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHAT MODAL */}
      {chatSale && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-card border border-border-custom rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-5 border-b border-border-custom bg-bg-subtle">
              <div>
                <h3 className="font-bold text-sm text-text-primary flex items-center gap-2">
                  <User className="w-4 h-4 text-yellow-500" />
                  Chat con {chatSale.comprador}
                </h3>
                <span className="text-[10px] text-text-muted font-mono">{chatSale.id}</span>
              </div>
              <button onClick={() => setChatSale(null)} className="text-text-muted hover:text-text-primary cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 h-80 overflow-y-auto space-y-4 bg-bg-subtle/30">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex flex-col ${msg.sender === "seller" ? "items-end" : "items-start"}`}>
                  <div className={`p-3 rounded-lg text-xs max-w-[80%] ${
                    msg.sender === "seller" 
                      ? "bg-yellow-500 text-bg-card font-semibold rounded-tr-none" 
                      : "bg-bg-card border border-border-custom text-text-primary rounded-tl-none"
                  }`}>
                    {msg.text}
                  </div>
                  <span className="text-[9px] text-text-muted mt-1 px-1">{msg.time}</span>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendChat} className="p-4 border-t border-border-custom flex gap-2">
              <input
                type="text"
                value={newMsg}
                onChange={e => setNewMsg(e.target.value)}
                placeholder="Escribe tu mensaje privado..."
                className="flex-1 bg-bg-subtle border border-border-custom rounded-lg px-4 py-2 text-xs text-text-primary outline-none focus:border-yellow-500"
              />
              <button
                type="submit"
                className="bg-yellow-500 hover:bg-yellow-600 text-bg-card font-black px-4 py-2 rounded-lg text-xs uppercase tracking-wider cursor-pointer"
              >
                Enviar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
