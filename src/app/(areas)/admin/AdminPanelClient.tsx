"use client";

import { useState, useTransition, useEffect } from "react";
import { 
  Users, 
  UserPlus, 
  Edit2, 
  Trash2, 
  Shield, 
  Search, 
  Lock, 
  Mail, 
  FileText, 
  AlertCircle, 
  Check,
  UserCheck,
  KeyRound,
  X
} from "lucide-react";
import { createUser, updateUser, deleteUser } from "@/actions/users";

interface Permission {
  id: string;
  userId: string;
  areaPermitida: string;
}

interface User {
  id: string;
  nombre: string;
  correo: string;
  cuit_dni: string;
  rol: string;
  createdAt: Date;
  permissions: Permission[];
}

const ROLES_DISPONIBLES = [
  { id: "ADMIN", name: "Administrador", color: "bg-red-500/10 text-red-400 border-red-500/20" },
  { id: "SUPERVISOR", name: "Supervisor", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  { id: "OPERATOR", name: "Operador", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  { id: "VIEWER", name: "Visualizador", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" }
];

const AREAS_DISPONIBLES = [
  { id: "VENTAS", name: "Ventas" },
  { id: "VENTAS_GENERALES", name: "Ventas Generales" },
  { id: "MERCADO_LIBRE", name: "Mercado Libre" },
  { id: "CLIENTES", name: "Clientes" },
  { id: "FACTURACION", name: "Facturación" },
  { id: "COBRANZAS", name: "Cobranzas" },
  { id: "COMPRAS", name: "Compras" },
  { id: "ORDEN_COMPRA", name: "Orden de Compra" },
  { id: "OC_EXTERIOR", name: "OC Exterior" },
  { id: "OPERATIVA", name: "Operativa" },
  { id: "ENVIOS", name: "Envíos" },
  { id: "STOCK", name: "Stock" },
  { id: "LABORATORIO", name: "Laboratorio" },
  { id: "BOT", name: "WhatsApp Bot" },
  { id: "ESTADO_PEDIDOS", name: "Estado Pedidos" },
];

const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: ["VENTAS", "VENTAS_GENERALES", "MERCADO_LIBRE", "CLIENTES", "FACTURACION", "COBRANZAS", "COMPRAS", "ORDEN_COMPRA", "OC_EXTERIOR", "OPERATIVA", "ENVIOS", "STOCK", "LABORATORIO", "BOT", "ESTADO_PEDIDOS", "ADMIN"],
  SUPERVISOR: ["VENTAS", "VENTAS_GENERALES", "MERCADO_LIBRE", "CLIENTES", "FACTURACION", "COBRANZAS", "COMPRAS", "ORDEN_COMPRA", "OC_EXTERIOR", "OPERATIVA", "ENVIOS", "STOCK", "LABORATORIO", "ESTADO_PEDIDOS"],
  OPERATOR: ["VENTAS", "VENTAS_GENERALES", "MERCADO_LIBRE", "CLIENTES", "OPERATIVA", "ENVIOS", "STOCK", "LABORATORIO", "ORDEN_COMPRA", "ESTADO_PEDIDOS"],
  VIEWER: ["VENTAS", "VENTAS_GENERALES", "MERCADO_LIBRE", "CLIENTES", "FACTURACION", "COBRANZAS", "OPERATIVA", "ENVIOS", "STOCK", "LABORATORIO", "ESTADO_PEDIDOS"]
};

export default function AdminPanelClient({ initialUsers }: { initialUsers: User[] }) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [activeTab, setActiveTab] = useState<"list" | "form">("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [isPending, startTransition] = useTransition();

  // Form State
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [cuitDni, setCuitDni] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [rol, setRol] = useState("OPERATOR");
  const [selectedPerms, setSelectedPerms] = useState<string[]>(DEFAULT_ROLE_PERMISSIONS.OPERATOR);

  // Status message
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  // Confirm Delete Dialog
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  // Sync users if initialUsers change
  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  // Manejar el cambio de rol para pre-cargar permisos por defecto
  const handleRolChange = (nuevoRol: string) => {
    setRol(nuevoRol);
    // Solo actualizamos automáticamente si no estamos editando un usuario existente,
    // o si el administrador explícitamente quiere reiniciar los permisos del rol.
    setSelectedPerms(DEFAULT_ROLE_PERMISSIONS[nuevoRol] || []);
  };

  // Toggle de un permiso específico
  const togglePermission = (areaId: string) => {
    if (selectedPerms.includes(areaId)) {
      setSelectedPerms(selectedPerms.filter(p => p !== areaId));
    } else {
      setSelectedPerms([...selectedPerms, areaId]);
    }
  };

  // Limpiar formulario
  const resetForm = () => {
    setEditingUserId(null);
    setNombre("");
    setCorreo("");
    setCuitDni("");
    setContrasena("");
    setRol("OPERATOR");
    setSelectedPerms(DEFAULT_ROLE_PERMISSIONS.OPERATOR);
    setMessage(null);
  };

  // Cargar usuario para edición
  const handleEditClick = (user: User) => {
    setEditingUserId(user.id);
    setNombre(user.nombre);
    setCorreo(user.correo);
    setCuitDni(user.cuit_dni);
    setContrasena(""); // En blanco por defecto al editar
    setRol(user.rol);
    setSelectedPerms(user.permissions.map(p => p.areaPermitida));
    setMessage(null);
    setActiveTab("form");
  };

  // Enviar formulario (creación o actualización)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!nombre || !correo || !cuitDni || (!editingUserId && !contrasena)) {
      setMessage({ type: "error", text: "Por favor complete todos los campos obligatorios." });
      return;
    }

    startTransition(async () => {
      if (editingUserId) {
        // Actualizar
        const result = await updateUser(editingUserId, {
          nombre,
          correo: correo.toLowerCase().trim(),
          cuit_dni: cuitDni.trim(),
          contrasena: contrasena.trim() || undefined,
          rol,
          permissions: selectedPerms
        });

        if (result.success) {
          setMessage({ type: "success", text: "Usuario actualizado con éxito." });
          // Actualizamos el estado local
          setUsers(prev => prev.map(u => u.id === editingUserId ? {
            ...u,
            nombre,
            correo: correo.toLowerCase().trim(),
            cuit_dni: cuitDni.trim(),
            rol,
            permissions: selectedPerms.map(p => ({ id: Math.random().toString(), userId: editingUserId, areaPermitida: p }))
          } : u));
          setTimeout(() => {
            resetForm();
            setActiveTab("list");
          }, 1500);
        } else {
          setMessage({ type: "error", text: result.error || "Error al actualizar usuario." });
        }
      } else {
        // Crear nuevo
        const result = await createUser({
          nombre,
          correo: correo.toLowerCase().trim(),
          cuit_dni: cuitDni.trim(),
          contrasena: contrasena.trim(),
          rol,
          permissions: selectedPerms
        });

        if (result.success && result.user) {
          setMessage({ type: "success", text: "Usuario registrado con éxito." });
          const newUser = {
            ...result.user,
            permissions: selectedPerms.map(p => ({ id: Math.random().toString(), userId: result.user!.id, areaPermitida: p }))
          };
          setUsers(prev => [newUser, ...prev]);
          setTimeout(() => {
            resetForm();
            setActiveTab("list");
          }, 1500);
        } else {
          setMessage({ type: "error", text: result.error || "Error al crear usuario." });
        }
      }
    });
  };

  // Confirmar eliminación
  const handleDeleteConfirm = () => {
    if (!deletingUserId) return;

    startTransition(async () => {
      const result = await deleteUser(deletingUserId);
      if (result.success) {
        setUsers(prev => prev.filter(u => u.id !== deletingUserId));
        setMessage({ type: "success", text: "Usuario eliminado correctamente." });
        setDeletingUserId(null);
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: "error", text: result.error || "Error al eliminar usuario." });
        setDeletingUserId(null);
      }
    });
  };

  // Filtrar usuarios locales por búsqueda
  const filteredUsers = users.filter(user => 
    user.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.correo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.cuit_dni.includes(searchTerm)
  );

  // Estadísticas rápidas
  const totalUsersCount = users.length;
  const adminCount = users.filter(u => u.rol === "ADMIN").length;
  const customPermsCount = users.filter(u => {
    const defaultPerms = DEFAULT_ROLE_PERMISSIONS[u.rol] || [];
    const currentPerms = u.permissions.map(p => p.areaPermitida);
    if (u.rol === "ADMIN") return false;
    return defaultPerms.length !== currentPerms.length || !defaultPerms.every(p => currentPerms.includes(p));
  }).length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      
      {/* STATS HEADER */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-bg-card p-6 rounded-xl shadow-lg border border-border-custom hover:border-[#0078D7] transition-all flex items-center justify-between">
          <div>
            <h3 className="text-text-muted text-xs font-semibold uppercase tracking-wider">Usuarios Registrados</h3>
            <p className="text-4xl font-light mt-3 text-text-primary">{totalUsersCount}</p>
          </div>
          <div className="bg-[#0078D7]/10 p-4 rounded-lg">
            <Users className="w-8 h-8 text-[#0078D7]" />
          </div>
        </div>
        
        <div className="bg-bg-card p-6 rounded-xl shadow-lg border border-border-custom hover:border-red-500/50 transition-all flex items-center justify-between">
          <div>
            <h3 className="text-text-muted text-xs font-semibold uppercase tracking-wider">Administradores</h3>
            <p className="text-4xl font-light mt-3 text-text-primary">{adminCount}</p>
          </div>
          <div className="bg-red-500/10 p-4 rounded-lg">
            <Shield className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className="bg-bg-card p-6 rounded-xl shadow-lg border border-border-custom hover:border-purple-500/50 transition-all flex items-center justify-between">
          <div>
            <h3 className="text-text-muted text-xs font-semibold uppercase tracking-wider">Permisos Personalizados</h3>
            <p className="text-4xl font-light mt-3 text-text-primary">{customPermsCount}</p>
          </div>
          <div className="bg-purple-500/10 p-4 rounded-lg">
            <UserCheck className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* FEEDBACK BANNERS */}
      {message && (
        <div className={`p-4 rounded-lg border flex items-center gap-3 animate-fade-in ${
          message.type === "success" 
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
            : "bg-red-500/10 border-red-500/20 text-red-400"
        }`}>
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      {/* ADMIN TABS & ACTIONS */}
      <div className="bg-bg-card rounded-xl shadow-lg border border-border-custom overflow-hidden">
        
        {/* TAB HEADERS */}
        <div className="flex border-b border-border-custom bg-bg-subtle px-6 py-4 justify-between items-center flex-wrap gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => { setMessage(null); setActiveTab("list"); }}
              className={`px-4 py-2 rounded-md font-bold text-sm tracking-wide transition-all ${
                activeTab === "list"
                  ? "bg-[#0078D7] text-white shadow-md shadow-[#0078D7]/20"
                  : "text-text-muted hover:text-text-primary hover:bg-bg-subtle"
              }`}
            >
              Lista de Usuarios
            </button>
            <button
              onClick={() => { setMessage(null); setActiveTab("form"); }}
              className={`px-4 py-2 rounded-md font-bold text-sm tracking-wide transition-all ${
                activeTab === "form"
                  ? "bg-[#0078D7] text-white shadow-md shadow-[#0078D7]/20"
                  : "text-text-muted hover:text-text-primary hover:bg-bg-subtle"
              }`}
            >
              {editingUserId ? "Editar Usuario" : "Registrar Nuevo Usuario"}
            </button>
          </div>

          {activeTab === "list" && (
            <div className="relative w-full max-w-xs">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-text-muted" />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre, correo, cuit..."
                className="w-full bg-bg-subtle border border-border-custom rounded-md pl-9 pr-4 py-2 text-sm text-text-primary placeholder-text-muted focus:border-[#0078D7] outline-none transition-colors"
              />
            </div>
          )}
        </div>

        {/* TAB CONTENT: USER LIST */}
        {activeTab === "list" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-custom bg-bg-subtle text-xs text-text-muted uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Usuario / CUIT</th>
                  <th className="px-6 py-4 font-semibold">Correo Electrónico</th>
                  <th className="px-6 py-4 font-semibold">Rol</th>
                  <th className="px-6 py-4 font-semibold">Permisos de Módulo</th>
                  <th className="px-6 py-4 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-text-muted text-sm bg-bg-card">
                      No se encontraron usuarios registrados.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(user => {
                    const roleConfig = ROLES_DISPONIBLES.find(r => r.id === user.rol);
                    const userPermList = user.permissions.map(p => p.areaPermitida);
                    const isCustom = user.rol !== "ADMIN" && (
                      userPermList.length !== (DEFAULT_ROLE_PERMISSIONS[user.rol]?.length || 0)
                    );

                    return (
                      <tr key={user.id} className="hover:bg-bg-subtle transition-colors text-sm text-text-secondary">
                        <td className="px-6 py-4">
                          <div className="font-bold text-text-primary">{user.nombre}</div>
                          <div className="text-xs text-text-muted mt-0.5">CUIT/DNI: {user.cuit_dni}</div>
                        </td>
                        <td className="px-6 py-4 text-text-secondary font-mono text-xs">{user.correo}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase border ${roleConfig?.color || "bg-gray-500/10 text-text-muted border-border-custom"}`}>
                            {roleConfig?.name || user.rol}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {user.rol === "ADMIN" ? (
                            <span className="text-xs font-semibold text-red-400 tracking-wide uppercase flex items-center gap-1.5">
                              <Shield className="w-3.5 h-3.5" /> Acceso Total Administrador
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5 max-w-md">
                              {userPermList.length === 0 ? (
                                <span className="text-xs text-text-muted italic">Sin permisos asignados</span>
                              ) : (
                                AREAS_DISPONIBLES.map(area => {
                                  const hasPerm = userPermList.includes(area.id);
                                  if (!hasPerm) return null;
                                  return (
                                    <span key={area.id} className="px-2 py-0.5 bg-bg-subtle text-text-secondary rounded text-[11px] font-medium border border-border-custom">
                                      {area.name}
                                    </span>
                                  );
                                })
                              )}
                              {isCustom && (
                                <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded text-[11px] font-bold border border-purple-500/20 animate-pulse">
                                  Personalizado
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleEditClick(user)}
                              className="p-2 hover:bg-bg-subtle text-text-muted hover:text-text-primary rounded transition-colors cursor-pointer"
                              title="Editar usuario"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeletingUserId(user.id)}
                              className="p-2 hover:bg-red-500/10 text-text-muted hover:text-red-400 rounded transition-colors cursor-pointer"
                              title="Eliminar usuario"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB CONTENT: FORM (CREATE / EDIT) */}
        {activeTab === "form" && (
          <form onSubmit={handleSubmit} className="p-8 space-y-8 bg-bg-card">
            
            {/* VOLVER ALERT AL EDITAR */}
            {editingUserId && (
              <div className="bg-[#0078D7]/10 border border-[#0078D7]/30 p-4 rounded-lg flex items-center justify-between">
                <span className="text-sm text-text-secondary">
                  Estas editando al usuario <strong className="text-text-primary">{nombre}</strong>.
                </span>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-[#0078D7] hover:underline font-bold"
                >
                  Cancelar Edición / Crear Nuevo
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* DATOS BÁSICOS */}
              <div className="space-y-5">
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider border-b border-border-custom pb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#0078D7]" /> Datos Generales
                </h3>
                
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                    placeholder="Ej: Juan Pérez"
                    className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-2.5 text-sm text-text-primary focus:border-[#0078D7] outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">CUIT o DNI (Único)</label>
                  <input
                    type="text"
                    required
                    value={cuitDni}
                    onChange={e => setCuitDni(e.target.value)}
                    placeholder="Ej: 20459871239"
                    className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-2.5 text-sm text-text-primary focus:border-[#0078D7] outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Correo Electrónico (Login)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-text-muted" />
                    </span>
                    <input
                      type="email"
                      required
                      value={correo}
                      onChange={e => setCorreo(e.target.value)}
                      placeholder="ejemplo@empresa.com"
                      className="w-full bg-bg-subtle border border-border-custom rounded-md pl-10 pr-4 py-2.5 text-sm text-text-primary focus:border-[#0078D7] outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                    Contraseña {editingUserId && <span className="text-text-muted font-normal italic">(dejar en blanco para conservar la actual)</span>}
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-text-muted" />
                    </span>
                    <input
                      type="password"
                      required={!editingUserId}
                      value={contrasena}
                      onChange={e => setContrasena(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-bg-subtle border border-border-custom rounded-md pl-10 pr-4 py-2.5 text-sm text-text-primary focus:border-[#0078D7] outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* ROL Y PERMISOS MANUALES */}
              <div className="space-y-5">
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider border-b border-border-custom pb-2 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-[#0078D7]" /> Rol y Permisos de Acceso
                </h3>

                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Rol Jerárquico</label>
                  <select
                    value={rol}
                    onChange={e => handleRolChange(e.target.value)}
                    className="w-full bg-bg-subtle border border-border-custom rounded-md px-4 py-2.5 text-sm text-text-primary focus:border-[#0078D7] outline-none transition-colors appearance-none cursor-pointer"
                  >
                    {ROLES_DISPONIBLES.map(r => (
                      <option key={r.id} value={r.id} className="bg-bg-card text-text-primary">
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-xs font-bold text-text-muted uppercase tracking-wider">
                      Permisos Manuales por Casillas
                    </label>
                    {rol !== "ADMIN" && (
                      <button
                        type="button"
                        onClick={() => setSelectedPerms(DEFAULT_ROLE_PERMISSIONS[rol] || [])}
                        className="text-[10px] text-[#0078D7] hover:underline font-bold uppercase"
                      >
                        Reiniciar a Default
                      </button>
                    )}
                  </div>

                  {rol === "ADMIN" ? (
                    <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-lg text-xs text-red-400 leading-relaxed">
                      El rol de <strong>Administrador</strong> tiene acceso absoluto por defecto a todos los módulos y la configuración general. No requiere asignación granular.
                    </div>
                  ) : (
                    <div className="bg-bg-subtle border border-border-custom rounded-lg p-4 grid grid-cols-2 gap-3">
                      {AREAS_DISPONIBLES.map(area => {
                        const isChecked = selectedPerms.includes(area.id);
                        return (
                          <label 
                            key={area.id}
                            className={`flex items-center gap-3 px-3 py-2 rounded border cursor-pointer select-none transition-all duration-150 text-xs ${
                              isChecked
                                ? "bg-[#0078D7]/10 border-[#0078D7]/30 text-text-primary font-semibold"
                                : "bg-bg-sidebar/50 border-transparent text-text-muted hover:bg-bg-subtle"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => togglePermission(area.id)}
                              className="sr-only" // Hidden checkbox, visual style is on the label
                            />
                            <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                              isChecked ? "bg-[#0078D7] border-[#0078D7]" : "border-gray-600 bg-bg-subtle"
                            }`}>
                              {isChecked && <Check className="w-3 h-3 text-white stroke-[3]" />}
                            </div>
                            <span>{area.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* FORM FOOTER / ACTION */}
            <div className="border-t border-border-custom pt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2.5 bg-transparent border border-border-custom hover:bg-bg-subtle hover:text-text-primary rounded-md font-bold text-sm text-text-muted transition-colors cursor-pointer"
              >
                Limpiar Formulario
              </button>
              
              <button
                type="submit"
                disabled={isPending}
                className="px-8 py-2.5 bg-[#0078D7] hover:bg-[#005a9e] disabled:opacity-50 text-white rounded-md font-bold text-sm tracking-wide transition-colors flex items-center gap-2 shadow-lg shadow-[#0078D7]/20 cursor-pointer"
              >
                {isPending ? "Procesando..." : (editingUserId ? "Guardar Cambios" : "Crear Usuario")}
              </button>
            </div>

          </form>
        )}

      </div>

      {/* CONFIRM DELETE DIALOG / MODAL */}
      {deletingUserId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-bg-card border border-border-custom max-w-md w-full rounded-xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center gap-4 text-red-500">
              <AlertCircle className="w-10 h-10 shrink-0" />
              <div>
                <h3 className="text-lg font-bold text-text-primary">¿Confirmar Eliminación?</h3>
                <p className="text-sm text-text-muted mt-1">
                  Esta acción es permanente. El usuario perderá el acceso inmediato al sistema de forma definitiva.
                </p>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingUserId(null)}
                className="px-4 py-2 bg-transparent hover:bg-bg-subtle text-text-muted hover:text-text-primary rounded-md text-sm font-bold border border-border-custom transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isPending}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-bold transition-colors cursor-pointer"
              >
                Eliminar Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
