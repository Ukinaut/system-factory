import Link from "next/link";
import { UserPlus, ShoppingCart, FileText, AlertTriangle, Zap } from "lucide-react";

export default function VentasDashboard() {
  const actions = [
    {
      title: "Nuevo Cliente",
      description: "Registrar datos de facturación (CUIT, Razón Social, etc.)",
      icon: UserPlus,
      href: "/ventas/nuevo-cliente",
      color: "text-emerald-500"
    },
    {
      title: "Nueva Venta",
      description: "Generar pedido, seleccionar artículos/servicios y enviar a facturación.",
      icon: ShoppingCart,
      href: "/ventas/nueva-venta",
      color: "text-[#0078D7]"
    },
    {
      title: "Venta Rápida",
      description: "Generar venta directa ingresando solo el nombre del cliente, omitiendo la factura opcionalmente.",
      icon: Zap,
      href: "/ventas/venta-rapida",
      color: "text-rose-500"
    },
    {
      title: "Presupuesto",
      description: "Crear cotización sin generar deuda ni movimiento de stock.",
      icon: FileText,
      href: "/ventas/presupuesto",
      color: "text-amber-500"
    },
    {
      title: "Nuevo Reclamo",
      description: "Registrar inconvenientes de clientes con prioridad asignada.",
      icon: AlertTriangle,
      href: "/ventas/reclamo",
      color: "text-red-500"
    }
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8 text-text-primary tracking-wide">B. Ventas</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Link key={index} href={action.href} className="group block">
              <div className="bg-bg-card p-8 rounded-xl border border-border-custom hover:border-[#0078D7] transition-all duration-300 shadow-lg hover:shadow-[#0078D7]/10 flex items-start gap-6 h-full">
                <div className={`p-4 rounded-lg bg-bg-subtle border border-border-custom group-hover:border-[#0078D7]/50 ${action.color} transition-colors`}>
                  <Icon className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-text-primary mb-2 tracking-wide group-hover:text-[#0078D7] transition-colors">{action.title}</h3>
                  <p className="text-text-muted text-sm leading-relaxed">{action.description}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
