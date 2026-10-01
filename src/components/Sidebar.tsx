"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  ShieldCheck, 
  ShoppingCart, 
  Users, 
  Receipt, 
  Banknote, 
  Briefcase, 
  Truck, 
  PackageSearch, 
  TestTube, 
  BotMessageSquare,
  LogOut,
  User as UserIcon,
  ClipboardList,
  ShoppingBag,
  FileCheck,
  Globe,
  Store,
  Menu,
  X
} from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { clearSelectedCountryAction } from "@/actions/countries";
import ThemeToggle from "./ThemeToggle";

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

const areas = [
  { name: "Administrador", path: "/admin", icon: ShieldCheck, roles: ["ADMIN"] },
  { name: "Ventas", path: "/ventas", icon: ShoppingCart, roles: ["ADMIN", "VENTAS"] },
  { name: "Ventas Generales", path: "/ventas-generales", icon: ShoppingBag, roles: ["ADMIN", "VENTAS", "COBRANZAS", "TECNICO", "STOCK"] },
  { name: "Mercado Libre", path: "/mercado-libre", icon: Store, roles: ["ADMIN", "VENTAS"] },
  { name: "Clientes", path: "/clientes", icon: Users, roles: ["ADMIN", "VENTAS"] },
  { name: "Facturación", path: "/facturacion", icon: Receipt, roles: ["ADMIN", "VENTAS", "COBRANZAS"] },
  { name: "Cobranzas", path: "/cobranzas", icon: Banknote, roles: ["ADMIN", "COBRANZAS"] },
  { name: "Compras", path: "/compras", icon: ShoppingBag, roles: ["ADMIN", "VENTAS", "STOCK"] },
  { name: "Orden de Compra", path: "/orden-compra", icon: FileCheck, roles: ["ADMIN", "VENTAS", "STOCK"] },
  { name: "OC Exterior", path: "/oc-exterior", icon: Globe, roles: ["ADMIN", "VENTAS", "STOCK"] },
  { name: "Operativa", path: "/operativa", icon: Briefcase, roles: ["ADMIN", "TECNICO"] },
  { name: "Envíos", path: "/envios", icon: Truck, roles: ["ADMIN", "TECNICO", "STOCK"] },
  { name: "Stock", path: "/stock", icon: PackageSearch, roles: ["ADMIN", "STOCK"] },
  { name: "Laboratorio", path: "/laboratorio", icon: TestTube, roles: ["ADMIN", "TECNICO"] },
  { name: "Bot", path: "/bot", icon: BotMessageSquare, roles: ["ADMIN"] },
  { name: "Estado Pedidos", path: "/estado-pedidos", icon: ClipboardList, roles: ["ADMIN", "VENTAS", "COBRANZAS", "TECNICO", "STOCK"] },
];

export default function Sidebar({ 
  session,
  selectedCountry 
}: { 
  session: any;
  selectedCountry: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const rol = session?.rol || "OPERATOR";
  const nombre = session?.nombre || "Usuario Invitado";

  // Cerrar menú desplegable móvil cuando cambie de ruta
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const handleChangeCountry = () => {
    startTransition(async () => {
      const res = await clearSelectedCountryAction();
      if (res.success) {
        router.push("/select-country");
        router.refresh();
      }
    });
  };

  // Filtramos áreas según rol y permisos manuales (con fallback a roles por defecto)
  const allowedAreas = areas.filter(a => {
    if (rol === "ADMIN") return true;
    const areaKey = a.path.replace("/", "").replace("-", "_").toUpperCase();
    if (session?.permissions) {
      return session.permissions.includes(areaKey);
    }
    return a.roles.includes(rol);
  });

  const flagUrl = selectedCountry ? getFlagUrl(selectedCountry) : null;

  const sidebarContent = (
    <div className="flex flex-col h-full bg-bg-sidebar text-text-secondary border-r border-border-custom w-80">
      {/* Encabezado del Menú */}
      <div className="p-6 flex items-center justify-between border-b border-border-custom gap-2 shrink-0">
        <div className="flex items-center gap-3">
          <img 
            src="/logo.png" 
            alt="Aitue Cominca S.A. Logo" 
            className="w-10 h-10 object-contain rounded shrink-0" 
          />
          <div>
            <h1 className="text-base font-bold tracking-wide text-text-primary leading-tight">Aitue Cominca S.A.</h1>
            <p className="text-xs text-[#0078D7] font-bold uppercase tracking-widest">{rol}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {/* Botón de cierre para versión móvil */}
          <button 
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden p-2 text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-subtle transition-colors cursor-pointer"
            aria-label="Cerrar menú"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Indicador de País */}
      {selectedCountry && (
        <div className="mx-4 mt-4 px-3.5 py-2.5 bg-bg-subtle rounded-md border border-border-custom flex items-center justify-between shadow-sm shrink-0">
          <div className="flex items-center gap-2">
            {flagUrl ? (
              <img 
                src={flagUrl} 
                alt={`Bandera de ${selectedCountry}`} 
                className="w-7 h-5 object-cover rounded shadow-sm border border-white/10 shrink-0"
              />
            ) : (
              <span className="text-base">🌐</span>
            )}
            <span className="text-sm font-bold text-text-primary uppercase tracking-wider">{selectedCountry}</span>
          </div>
          <button 
            onClick={handleChangeCountry}
            disabled={isPending}
            className="text-xs text-[#0078D7] hover:text-[#005a9e] disabled:opacity-50 font-bold uppercase tracking-wider cursor-pointer"
          >
            {isPending ? "Cambiando..." : "Cambiar"}
          </button>
        </div>
      )}

      {/* Lista de Navegación */}
      <nav className="flex-1 overflow-y-auto py-6">
        <ul className="space-y-1.5 px-4">
          {allowedAreas.map((area) => {
            const isActive = pathname.startsWith(area.path);
            const Icon = area.icon;
            return (
              <li key={area.path}>
                <Link 
                  href={area.path}
                  onClick={() => setIsMobileOpen(false)}
                  className={`flex items-center gap-4 px-4 py-3.5 rounded-md transition-all duration-200 ${isActive ? 'bg-[#0078D7] text-white shadow-md font-bold' : 'hover:bg-bg-subtle hover:text-[#0078D7]'}`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span className="font-semibold text-base tracking-wide">{area.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Pie de Usuario y Cierre de Sesión */}
      <div className="p-4 border-t border-border-custom bg-bg-subtle shrink-0">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-10 h-10 bg-bg-card rounded-full flex items-center justify-center border border-border-custom overflow-hidden shrink-0 shadow-sm">
            {session?.fotoUrl ? (
              <img src={session.fotoUrl} alt={nombre} className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-5 h-5 text-text-muted" />
            )}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-base font-bold text-text-primary truncate">{nombre}</p>
            <p className="text-xs text-text-muted truncate">{session?.correo}</p>
          </div>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="w-full flex items-center justify-center gap-3 px-4 py-3 text-text-muted hover:bg-red-500/10 hover:text-red-500 rounded-md transition-all duration-200 border border-transparent hover:border-red-500/20 cursor-pointer">
            <LogOut className="w-5 h-5" />
            <span className="font-bold text-base tracking-wide uppercase">Cerrar Sesión</span>
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {/* Botón activador Hamburguesa en pantallas móviles */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="md:hidden fixed top-3 left-4 z-30 p-2.5 bg-bg-card border border-border-custom text-text-primary rounded-xl shadow-lg hover:border-[#0078D7] active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
        aria-label="Abrir menú de navegación"
      >
        <Menu className="w-5 h-5 text-[#0078D7]" />
      </button>

      {/* Fondo oscuro traslúcido para menú desplegable en móvil */}
      {isMobileOpen && (
        <div 
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
        />
      )}

      {/* Drawer desplegable móvil */}
      <aside className={`fixed inset-y-0 left-0 z-50 transform md:hidden transition-transform duration-300 ease-in-out ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {sidebarContent}
      </aside>

      {/* Sidebar fijo en escritorio */}
      <aside className="hidden md:flex h-screen sticky top-0 shrink-0 z-20">
        {sidebarContent}
      </aside>
    </>
  );
}
