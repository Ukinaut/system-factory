"use client";

import { useState, useEffect } from "react";
import { 
  ShoppingBag, 
  CheckCircle, 
  XCircle, 
  Clock, 
  MessageSquare, 
  AlertCircle, 
  DollarSign, 
  Filter, 
  ChevronDown, 
  CheckSquare, 
  ListFilter, 
  User, 
  Trash2, 
  FileText, 
  Upload, 
  Check, 
  Eye,
  Plus,
  Link as LinkIcon,
  Image as ImageIcon
} from "lucide-react";
import { 
  getPurchaseRequests, 
  updatePurchaseRequestStatus, 
  deletePurchaseRequest, 
  updatePurchaseRequestFields,
  createPurchaseInvoice,
  getPurchaseInvoices,
  deletePurchaseInvoice
} from "@/actions/purchases";
import { getCurrentUserSession } from "@/actions/users";
import { 
  getImportInvoices, 
  createImportInvoice,
  getForeignOrders,
  updateOrderItemVerification,
  confirmForeignOrderArrival,
  deleteImportInvoice
} from "@/actions/foreignOrders";
import { getProducts } from "@/actions/products";
import { Globe, PlusCircle, Printer, BarChart3, Calendar, Truck, Square, ArrowRight } from "lucide-react";

export default function ComprasGestionPage() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [areaFilter, setAreaFilter] = useState<string>("ALL");
  const [session, setSession] = useState<any>(null);

  // Sub-tab state: "requests" | "consolidate" | "invoices" | "imports" | "reports"
  const [activeSubTab, setActiveSubTab] = useState<"requests" | "consolidate" | "invoices" | "imports" | "reports">("requests");

  // Report Filter States
  const [reportArea, setReportArea] = useState<string>("ALL");
  const [reportType, setReportType] = useState<string>("ALL");
  const [reportDateFrom, setReportDateFrom] = useState<string>("");
  const [reportDateTo, setReportDateTo] = useState<string>("");

  // Selection state for consolidation
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
  
  // Invoice form state
  const [invoiceForm, setInvoiceForm] = useState({
    nroFactura: "",
    proveedor: "",
    montoFinal: "",
    moneda: "ARS",
    formaPago: "",
    fileBase64: "",
    fileName: ""
  });

  // Rejection modal/state
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionComment, setRejectionComment] = useState("");

  // Expandable invoice ID state to view linked requests
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);

  // Import Invoices States
  const [importInvoices, setImportInvoices] = useState<any[]>([]);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [expandedImportId, setExpandedImportId] = useState<string | null>(null);

  // Mode and checklist states for Imports
  const [importMode, setImportMode] = useState<"oc" | "manual">("oc");
  const [pendingForeignOrders, setPendingForeignOrders] = useState<any[]>([]);
  const [selectedForeignOrderId, setSelectedForeignOrderId] = useState<string | null>(null);

  const [arrivalForm, setArrivalForm] = useState({
    montoFinal: "",
    moneda: "USD",
    fileBase64: "",
    fileName: ""
  });

  // New Import Invoice Form State
  const [importForm, setImportForm] = useState({
    nroFactura: "",
    proveedor: "",
    montoFinal: "",
    moneda: "USD",
    fileBase64: "",
    fileName: ""
  });
  const [importItems, setImportItems] = useState<any[]>([
    { nombreProduct: "", cantidad: 1, tipoProduct: "PRODUCTO_FINAL" }
  ]);

  const loadRequests = async () => {
    setLoading(true);
    const res = await getPurchaseRequests();
    if (res.success && res.requests) {
      setRequests(res.requests);
    }
    setLoading(false);
  };

  const loadInvoices = async () => {
    setLoading(true);
    const res = await getPurchaseInvoices();
    if (res.success && res.invoices) {
      setInvoices(res.invoices);
    }
    setLoading(false);
  };

  const loadImportInvoicesData = async () => {
    setLoading(true);
    const [invRes, prodRes, ordersRes] = await Promise.all([
      getImportInvoices(),
      getProducts(),
      getForeignOrders()
    ]);
    if (invRes.success) {
      setImportInvoices(invRes.invoices || []);
    }
    if (prodRes.success) {
      setProductsList(prodRes.products || []);
    }
    if (ordersRes.success) {
      setPendingForeignOrders(ordersRes.orders ? ordersRes.orders.filter((o: any) => o.estado === "PENDIENTE") : []);
    }
    setLoading(false);
  };

  const handleToggleVerifyImportOrderItem = async (orderId: string, itemId: string, currentVal: boolean) => {
    const newVal = !currentVal;
    
    // Update local state optimistically
    setPendingForeignOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          items: o.items.map((i: any) => i.id === itemId ? { ...i, verificado: newVal } : i)
        };
      }
      return o;
    }));

    const res = await updateOrderItemVerification(itemId, newVal);
    if (!res.success) {
      alert("Error al guardar verificación: " + res.error);
      loadImportInvoicesData();
    }
  };

  const handleConfirmArrivalWithInvoice = async (orderId: string) => {
    const order = pendingForeignOrders.find(o => o.id === orderId);
    if (!order) return;

    const unverifiedItems = order.items.filter((i: any) => !i.verificado);
    let msg = "¿Está seguro de que desea confirmar el arribo y cargar al stock?";
    if (unverifiedItems.length > 0) {
      msg = `¡Atención! Hay ${unverifiedItems.length} materiales sin verificar en esta orden. No se sumarán al stock. ¿Desea confirmar el arribo igualmente?`;
    }

    if (!confirm(msg)) return;

    setLoading(true);
    const res = await confirmForeignOrderArrival(orderId, {
      montoFinal: arrivalForm.montoFinal ? parseFloat(arrivalForm.montoFinal) : undefined,
      moneda: arrivalForm.moneda,
      fileBase64: arrivalForm.fileBase64 || undefined,
      fileName: arrivalForm.fileName || undefined
    });
    setLoading(false);

    if (res.success) {
      alert("Importación confirmada e ingresada al Stock de forma exitosa. Se ha generado la Factura de Importación vinculada.");
      setSelectedForeignOrderId(null);
      setArrivalForm({ montoFinal: "", moneda: "USD", fileBase64: "", fileName: "" });
      loadImportInvoicesData();
    } else {
      alert("Error al procesar arribo: " + res.error);
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!confirm("¿Está seguro de que desea eliminar este comprobante/factura de compra del historial? Las solicitudes asociadas se desvincularán pero no se eliminarán. Esta acción es irreversible.")) {
      return;
    }
    setLoading(true);
    const res = await deletePurchaseInvoice(invoiceId);
    setLoading(false);
    if (res.success) {
      alert("Factura/Comprobante eliminado correctamente del historial.");
      loadInvoices();
    } else {
      alert("Error al eliminar la factura: " + res.error);
    }
  };

  const handleDeleteImportInvoice = async (invoiceId: string) => {
    if (!confirm("¿Está seguro de que desea eliminar esta factura de importación del historial? Esta acción es irreversible.")) {
      return;
    }
    setLoading(true);
    const res = await deleteImportInvoice(invoiceId);
    setLoading(false);
    if (res.success) {
      alert("Factura de importación eliminada correctamente.");
      loadImportInvoicesData();
    } else {
      alert("Error al eliminar la factura de importación: " + res.error);
    }
  };

  useEffect(() => {
    loadRequests();
    getCurrentUserSession().then((res) => {
      if (res.success && res.session) {
        setSession(res.session);
      }
    });
  }, []);

  useEffect(() => {
    if (activeSubTab === "invoices") {
      loadInvoices();
    } else if (activeSubTab === "imports") {
      loadImportInvoicesData();
    }
  }, [activeSubTab]);

  const handleUpdateStatus = async (id: string, newStatus: string, comment?: string) => {
    setLoading(true);
    const res = await updatePurchaseRequestStatus(id, newStatus, comment);
    setLoading(false);

    if (res.success) {
      alert(`Solicitud marcada como ${newStatus.toLowerCase()} exitosamente.`);
      setRejectingId(null);
      setRejectionComment("");
      loadRequests();
    } else {
      alert("Error al actualizar estado: " + res.error);
    }
  };

  const handleDeleteRequest = async (id: string) => {
    if (!confirm("¿Está seguro de que desea eliminar esta solicitud de compra? Esta acción no se puede deshacer.")) {
      return;
    }
    setLoading(true);
    const res = await deletePurchaseRequest(id);
    setLoading(false);
    if (res.success) {
      alert("Solicitud de compra eliminada exitosamente.");
      loadRequests();
      // Remove from selection if deleted
      setSelectedRequestIds(prev => prev.filter(reqId => reqId !== id));
    } else {
      alert("Error al eliminar la solicitud: " + res.error);
    }
  };

  const handleFieldChange = async (id: string, field: "formaPago" | "proveedor", value: string) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    const res = await updatePurchaseRequestFields(id, { [field]: value });
    if (!res.success) {
      alert("Error al actualizar la solicitud: " + res.error);
      loadRequests();
    }
  };

  const toggleSelectRequest = (id: string) => {
    setSelectedRequestIds((prev) => {
      const isSelected = prev.includes(id);
      let updated;
      if (isSelected) {
        updated = prev.filter((item) => item !== id);
      } else {
        updated = [...prev, id];
      }
      
      const selectedReqs = requests.filter((r) => updated.includes(r.id));
      const totalAmount = selectedReqs.reduce((acc, curr) => acc + curr.montoAprox, 0);
      const suggestedProveedor = selectedReqs.find((r) => r.proveedor)?.proveedor || "";
      const suggestedFormaPago = selectedReqs.find((r) => r.formaPago)?.formaPago || "";
      
      setInvoiceForm((f) => ({
        ...f,
        montoFinal: totalAmount > 0 ? totalAmount.toString() : "",
        proveedor: suggestedProveedor,
        formaPago: suggestedFormaPago
      }));

      return updated;
    });
  };

  const toggleSelectAllApproved = () => {
    const approvedWithoutInvoice = requests.filter(r => r.estado === "APROBADA" && !r.purchaseInvoiceId);
    if (selectedRequestIds.length === approvedWithoutInvoice.length) {
      setSelectedRequestIds([]);
      setInvoiceForm(f => ({ ...f, montoFinal: "", proveedor: "", formaPago: "" }));
    } else {
      const allIds = approvedWithoutInvoice.map(r => r.id);
      setSelectedRequestIds(allIds);
      const totalAmount = approvedWithoutInvoice.reduce((acc, curr) => acc + curr.montoAprox, 0);
      const suggestedProveedor = approvedWithoutInvoice.find((r) => r.proveedor)?.proveedor || "";
      const suggestedFormaPago = approvedWithoutInvoice.find((r) => r.formaPago)?.formaPago || "";
      setInvoiceForm(f => ({
        ...f,
        montoFinal: totalAmount.toString(),
        proveedor: suggestedProveedor,
        formaPago: suggestedFormaPago
      }));
    }
  };

  const handleInvoiceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setInvoiceForm((f) => ({ ...f, fileName: file.name }));

    const reader = new FileReader();
    reader.onloadend = () => {
      setInvoiceForm((f) => ({ ...f, fileBase64: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleCreateInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRequestIds.length === 0) {
      alert("Por favor seleccione al menos una solicitud.");
      return;
    }
    if (!invoiceForm.montoFinal) {
      alert("Por favor ingrese el monto final.");
      return;
    }

    const res = await createPurchaseInvoice({
      requestIds: selectedRequestIds,
      montoFinal: parseFloat(invoiceForm.montoFinal),
      moneda: invoiceForm.moneda,
      proveedor: invoiceForm.proveedor || undefined,
      nroFactura: invoiceForm.nroFactura || undefined,
      formaPago: invoiceForm.formaPago || undefined,
      fileBase64: invoiceForm.fileBase64 || undefined,
      fileName: invoiceForm.fileName || undefined
    });
    setLoading(false);

    if (res.success) {
      alert("Factura asociada y cargada correctamente.");
      setSelectedRequestIds([]);
      setInvoiceForm({
        nroFactura: "",
        proveedor: "",
        montoFinal: "",
        moneda: "ARS",
        formaPago: "",
        fileBase64: "",
        fileName: ""
      });
      loadRequests();
      setActiveSubTab("invoices");
    } else {
      alert("Error al cargar factura: " + res.error);
    }
  };

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case "APROBADA":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
            <CheckCircle className="w-3.5 h-3.5" /> APROBADA
          </span>
        );
      case "RECHAZADA":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/25">
            <XCircle className="w-3.5 h-3.5" /> RECHAZADA
          </span>
        );
      case "PROCESADA":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/25">
            <CheckSquare className="w-3.5 h-3.5" /> PROCESADA
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/25">
            <Clock className="w-3.5 h-3.5" /> PENDIENTE
          </span>
        );
    }
  };

  const filteredRequests = requests.filter((r) => {
    const matchStatus = statusFilter === "ALL" || r.estado === statusFilter;
    const matchArea = areaFilter === "ALL" || r.areaDestino === areaFilter;
    return matchStatus && matchArea;
  });

  const approvedWithoutInvoiceRequests = requests.filter(
    (r) => r.estado === "APROBADA" && !r.purchaseInvoiceId
  );

  const pendingCount = requests.filter((r) => r.estado === "PENDIENTE").length;
  const totalSpend = requests
    .filter((r) => r.estado === "APROBADA" || r.estado === "PROCESADA")
    .reduce((acc, curr) => acc + curr.montoAprox, 0);

  const areasList = ["LABORATORIO", "OPERATIVA", "DESPACHOS", "COCINA", "BANOS", "LIMPIEZA", "OTROS"];

  return (
    <div className="max-w-6xl mx-auto pb-12">
      {/* Title Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary tracking-wide flex items-center gap-3">
          <ShoppingBag className="text-[#0078D7] w-8 h-8" />
          Gestión de Compras
        </h1>
        <p className="text-text-muted mt-1">
          Panel de control para la evaluación, aprobación, rechazo y procesamiento de solicitudes de compras del personal.
        </p>
      </div>

      {/* Analytics Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-bg-card rounded-xl border border-border-custom shadow-xl p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Pendientes de Aprobación</span>
            <h3 className="text-3xl font-black text-amber-500 mt-2">{pendingCount}</h3>
          </div>
          <div className="bg-amber-500/10 text-amber-500 p-3 rounded-lg border border-amber-500/20">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-bg-card rounded-xl border border-border-custom shadow-xl p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Monto Total Aprobado / Procesado</span>
            <h3 className="text-3xl font-black text-emerald-500 mt-2">$ {totalSpend.toLocaleString()}</h3>
          </div>
          <div className="bg-emerald-500/10 text-emerald-500 p-3 rounded-lg border border-emerald-500/20">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-bg-card rounded-xl border border-border-custom shadow-xl p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Total Historial de Solicitudes</span>
            <h3 className="text-3xl font-black text-text-primary mt-2">{requests.length}</h3>
          </div>
          <div className="bg-blue-500/10 text-blue-500 p-3 rounded-lg border border-blue-500/20">
            <ShoppingBag className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Sub-tabs Navigation */}
      <div className="flex border-b border-border-custom mb-6 gap-6">
        <button
          onClick={() => setActiveSubTab("requests")}
          className={`pb-3 font-semibold text-sm transition-all cursor-pointer border-b-2 ${
            activeSubTab === "requests" ? "text-[#0078D7] border-[#0078D7]" : "text-text-muted border-transparent hover:text-text-primary"
          }`}
        >
          Gestión de Solicitudes
        </button>
        <button
          onClick={() => setActiveSubTab("consolidate")}
          className={`pb-3 font-semibold text-sm transition-all cursor-pointer border-b-2 flex items-center gap-2 ${
            activeSubTab === "consolidate" ? "text-[#0078D7] border-[#0078D7]" : "text-text-muted border-transparent hover:text-text-primary"
          }`}
        >
          Asociar Factura (Consolidar)
          {approvedWithoutInvoiceRequests.length > 0 && (
            <span className="bg-[#0078D7] text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
              {approvedWithoutInvoiceRequests.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveSubTab("invoices")}
          className={`pb-3 font-semibold text-sm transition-all cursor-pointer border-b-2 ${
            activeSubTab === "invoices" ? "text-[#0078D7] border-[#0078D7]" : "text-text-muted border-transparent hover:text-text-primary"
          }`}
        >
          Historial de Facturas
        </button>
        <button
          onClick={() => setActiveSubTab("imports")}
          className={`pb-3 font-semibold text-sm transition-all cursor-pointer border-b-2 flex items-center gap-1.5 ${
            activeSubTab === "imports" ? "text-[#0078D7] border-[#0078D7]" : "text-text-muted border-transparent hover:text-text-primary"
          }`}
        >
          <Globe className="w-4 h-4" /> Compras Importaciones/Stock
        </button>
        <button
          onClick={() => setActiveSubTab("reports")}
          className={`pb-3 font-semibold text-sm transition-all cursor-pointer border-b-2 flex items-center gap-1.5 ${
            activeSubTab === "reports" ? "text-[#0078D7] border-[#0078D7]" : "text-text-muted border-transparent hover:text-text-primary"
          }`}
        >
          <BarChart3 className="w-4 h-4" /> Informe
        </button>
      </div>

      {/* Tab 1: Requests Management */}
      {activeSubTab === "requests" && (
        <div className="space-y-6">
          {/* Toolbar filters */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-bg-card p-4 border border-border-custom rounded-xl shadow-md">
            <div className="flex items-center gap-2 bg-bg-subtle p-1 rounded-lg border border-border-custom shrink-0">
              {["ALL", "PENDIENTE", "APROBADA", "PROCESADA", "RECHAZADA"].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                    statusFilter === status ? "bg-[#0078D7] text-white" : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  {status === "ALL" ? "Todas" : status.toLowerCase() + "s"}
                </button>
              ))}
            </div>

            {/* Area Filter */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <ListFilter className="w-4 h-4 text-text-muted shrink-0" />
              <select
                value={areaFilter}
                onChange={(e) => setAreaFilter(e.target.value)}
                className="bg-bg-subtle border border-border-custom rounded px-3 py-1.5 text-xs text-text-primary focus:border-[#0078D7] outline-none"
              >
                <option value="ALL">Todas las Áreas</option>
                {areasList.map((area) => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Main Requests Table */}
          <div className="bg-bg-card rounded-xl border border-border-custom shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border-custom text-[11px] font-bold uppercase tracking-wider text-text-muted bg-bg-subtle/30">
                    <th className="py-3.5 px-4 whitespace-nowrap">Solicitante</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Artículo</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Fecha de solicitud</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Observaciones</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Estado</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-custom text-xs">
                  {filteredRequests.length > 0 ? (
                    filteredRequests.map((r) => (
                      <tr key={r.id} className="hover:bg-bg-subtle/30 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-[#0078D7]/10 text-[#0078D7] flex items-center justify-center font-bold text-xs border border-[#0078D7]/15">
                              {r.user?.nombre.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-text-primary whitespace-nowrap">{r.user?.nombre}</p>
                              <p className="text-[10px] text-text-muted font-semibold uppercase">{r.user?.rol}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 font-bold text-text-primary">
                          <div className="min-w-[150px]">
                            <p className="text-text-primary leading-tight">{r.articulo}</p>
                            <p className="text-[10px] text-text-muted mt-1 leading-none font-medium">
                              {r.tipoArticulo} • {r.areaDestino} • $ {r.montoAprox.toLocaleString()}
                            </p>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-text-muted whitespace-nowrap">
                          {new Date(r.createdAt).toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </td>
                        <td className="py-4 px-4 max-w-xs">
                          <div className="space-y-1">
                            {r.referenciaUrl && (
                              <a
                                href={r.referenciaUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#0078D7] hover:underline block font-semibold text-xs"
                              >
                                Ver Referencia
                              </a>
                            )}
                            {r.comentario && (
                              <p className="text-red-400 bg-red-500/10 p-1.5 rounded border border-red-500/20 leading-relaxed">
                                {r.comentario}
                              </p>
                            )}
                            {!r.referenciaUrl && !r.comentario && <span className="text-text-muted italic">-</span>}
                          </div>
                        </td>
                        <td className="py-4 px-4">{getStatusBadge(r.estado)}</td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {r.estado === "PENDIENTE" && (
                              <>
                                <button
                                  onClick={() => handleUpdateStatus(r.id, "APROBADA")}
                                  className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded font-medium transition-colors cursor-pointer text-[10px]"
                                  disabled={loading}
                                >
                                  Aprobar
                                </button>
                                <button
                                  onClick={() => setRejectingId(r.id)}
                                  className="px-2.5 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded font-medium transition-colors cursor-pointer text-[10px]"
                                  disabled={loading}
                                >
                                  Rechazar
                                </button>
                              </>
                            )}
                            {r.estado === "APROBADA" && (
                              <button
                                onClick={() => handleUpdateStatus(r.id, "PROCESADA")}
                                className="px-2.5 py-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded font-medium transition-colors cursor-pointer text-[10px]"
                                  disabled={loading}
                              >
                                Procesar Compra
                              </button>
                            )}
                            {r.estado === "PROCESADA" && (
                              <span className="text-text-muted italic text-[11px]">Procesada</span>
                            )}
                            {r.estado === "RECHAZADA" && (
                              <span className="text-red-500/70 font-semibold text-[11px]">Rechazada</span>
                            )}
                            {session?.rol === "ADMIN" && (
                              <button
                                onClick={() => handleDeleteRequest(r.id)}
                                className="p-1.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded border border-red-500/20 transition-all cursor-pointer flex items-center gap-1 text-[10px]"
                                title="Eliminar solicitud"
                                disabled={loading}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-text-muted italic">
                        No hay solicitudes de compras que coincidan con los filtros.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Consolidate / Associate Invoice */}
      {activeSubTab === "consolidate" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Approved requests without invoices */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-bg-card rounded-xl border border-border-custom shadow-xl overflow-hidden">
              <div className="p-4 bg-bg-subtle/40 border-b border-border-custom flex justify-between items-center">
                <h3 className="font-bold text-sm text-text-primary">Artículos Aprobados Pendientes de Factura</h3>
                {approvedWithoutInvoiceRequests.length > 0 && (
                  <button
                    onClick={toggleSelectAllApproved}
                    className="text-xs text-[#0078D7] hover:underline font-semibold cursor-pointer"
                  >
                    {selectedRequestIds.length === approvedWithoutInvoiceRequests.length 
                      ? "Deseleccionar Todos" 
                      : "Seleccionar Todos"}
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border-custom text-[11px] font-bold uppercase tracking-wider text-text-muted bg-bg-subtle/30">
                      <th className="p-3.5 text-center w-12">Sel.</th>
                      <th className="p-3.5">Solicitante</th>
                      <th className="p-3.5">Artículo</th>
                      <th className="p-3.5">Proveedor Sugerido</th>
                      <th className="p-3.5">Monto Aprox.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-custom text-xs">
                    {approvedWithoutInvoiceRequests.length > 0 ? (
                      approvedWithoutInvoiceRequests.map((r) => {
                        const isSelected = selectedRequestIds.includes(r.id);
                        return (
                          <tr 
                            key={r.id} 
                            onClick={() => toggleSelectRequest(r.id)}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? "bg-[#0078D7]/5 hover:bg-[#0078D7]/10" : "hover:bg-bg-subtle/30"
                            }`}
                          >
                            <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectRequest(r.id)}
                                className="w-4 h-4 text-[#0078D7] border-border-custom rounded focus:ring-[#0078D7] cursor-pointer"
                              />
                            </td>
                            <td className="p-3 font-semibold text-text-primary">{r.user?.nombre}</td>
                            <td className="p-3">
                              <p className="font-bold text-text-primary">{r.articulo}</p>
                              <p className="text-[10px] text-text-muted">{r.tipoArticulo} • {r.areaDestino}</p>
                            </td>
                            <td className="p-3">
                              <span className="italic text-text-secondary">{r.proveedor || "Sin asignar"}</span>
                            </td>
                            <td className="p-3 font-bold text-text-primary">$ {r.montoAprox.toLocaleString()}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-text-muted italic">
                          No hay solicitudes aprobadas sin facturar en este momento.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Form to associate invoice */}
          <div className="lg:col-span-1">
            <div className="bg-bg-card rounded-xl border border-border-custom shadow-xl p-6 sticky top-4">
              <h3 className="font-bold text-base text-text-primary mb-4 pb-2 border-b border-border-custom flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#0078D7]" /> Asociar Factura
              </h3>
              
              <div className="mb-4 bg-[#0078D7]/10 border border-[#0078D7]/20 p-3.5 rounded-lg text-xs">
                <span className="font-bold text-[#0078D7] block uppercase tracking-wide text-[10px]">Artículos Seleccionados</span>
                <p className="text-2xl font-black text-text-primary mt-1">{selectedRequestIds.length}</p>
                <span className="text-[10px] text-text-muted block mt-1">
                  Selecciona varios artículos aprobados de la lista para cargarlos en una sola factura.
                </span>
              </div>

              <form onSubmit={handleCreateInvoiceSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Proveedor</label>
                  <input
                    type="text"
                    value={invoiceForm.proveedor}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, proveedor: e.target.value })}
                    placeholder="Ej. Distribuidora S.A."
                    className="w-full bg-bg-subtle border border-border-custom rounded-md px-3 py-2 text-xs text-text-primary focus:border-[#0078D7] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Forma de Pago (Método de Pago)</label>
                  <select
                    value={invoiceForm.formaPago}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, formaPago: e.target.value })}
                    className="w-full bg-bg-subtle border border-border-custom rounded-md px-3 py-2 text-xs text-text-primary focus:border-[#0078D7] outline-none cursor-pointer"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="Mercado Pago">Mercado Pago</option>
                    <option value="Transferencia bancaria">Transferencia bancaria</option>
                    <option value="Visa Ale">Visa Ale</option>
                    <option value="Visa Martin">Visa Martin</option>
                    <option value="Visa Benja">Visa Benja</option>
                    <option value="Visa Hugo">Visa Hugo</option>
                    <option value="Visa Susana">Visa Susana</option>
                    <option value="Visa Agustina">Visa Agustina</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Nro de Factura (Opcional)</label>
                  <input
                    type="text"
                    value={invoiceForm.nroFactura}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, nroFactura: e.target.value })}
                    placeholder="Ej. 0001-00048291"
                    className="w-full bg-bg-subtle border border-border-custom rounded-md px-3 py-2 text-xs text-text-primary focus:border-[#0078D7] outline-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Moneda</label>
                    <select
                      value={invoiceForm.moneda}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, moneda: e.target.value })}
                      className="w-full bg-bg-subtle border border-border-custom rounded-md px-3 py-2 text-xs text-text-primary focus:border-[#0078D7] outline-none cursor-pointer font-bold"
                    >
                      <option value="ARS">ARS ($)</option>
                      <option value="USD">USD (US$)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Monto Final Factura</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-text-muted">
                        {invoiceForm.moneda === "ARS" ? "$" : invoiceForm.moneda === "USD" ? "US$" : "€"}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        value={invoiceForm.montoFinal}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, montoFinal: e.target.value })}
                        placeholder="0.00"
                        className="w-full bg-bg-subtle border border-border-custom rounded-md pl-12 pr-3 py-2 text-xs text-text-primary focus:border-[#0078D7] outline-none font-bold"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Comprobante / PDF / Imagen</label>
                  <div className="flex items-center gap-3">
                    <label className="flex-1 flex flex-col items-center justify-center p-4 border border-dashed border-border-custom hover:border-[#0078D7] rounded-lg bg-bg-subtle/50 cursor-pointer transition-colors text-center">
                      <Upload className="w-6 h-6 text-text-muted mb-1" />
                      <span className="text-[10px] text-text-muted font-medium">
                        {invoiceForm.fileName ? invoiceForm.fileName : "Subir archivo de factura"}
                      </span>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleInvoiceFileChange}
                        className="hidden"
                      />
                    </label>
                    {invoiceForm.fileBase64 && (
                      <button
                        type="button"
                        onClick={() => setInvoiceForm((f) => ({ ...f, fileBase64: "", fileName: "" }))}
                        className="text-red-500 hover:text-red-600 text-xs font-bold shrink-0"
                      >
                        Quitar
                      </button>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={selectedRequestIds.length === 0 || loading}
                  className="w-full bg-[#0078D7] hover:bg-[#005a9e] disabled:bg-bg-subtle disabled:text-text-muted disabled:border-border-custom disabled:cursor-not-allowed border border-transparent text-white py-3 rounded-md font-semibold text-xs transition-colors mt-6 cursor-pointer"
                >
                  {loading ? "Cargando..." : "Cargar y Asociar Factura"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Invoice History list */}
      {activeSubTab === "invoices" && (
        <div className="space-y-4">
          <div className="bg-bg-card rounded-xl border border-border-custom shadow-xl overflow-hidden">
            <div className="p-4 bg-bg-subtle/40 border-b border-border-custom">
              <h3 className="font-bold text-sm text-text-primary">Comprobantes y Facturas de Compra Registradas</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border-custom text-[11px] font-bold uppercase tracking-wider text-text-muted bg-bg-subtle/30">
                    <th className="p-3.5 w-8"></th>
                    <th className="p-3.5">Proveedor</th>
                    <th className="p-3.5">Forma de Pago</th>
                    <th className="p-3.5">Nro Factura</th>
                    <th className="p-3.5">Monto Final</th>
                    <th className="p-3.5">Fecha de Carga</th>
                    <th className="p-3.5">Artículos</th>
                    <th className="p-3.5 text-center">Comprobante</th>
                    {session?.rol === "ADMIN" && <th className="p-3.5 text-center">Acciones</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-custom text-xs">
                  {invoices.length > 0 ? (
                    invoices.map((inv) => {
                      const isExpanded = expandedInvoiceId === inv.id;
                      return (
                        <>
                          <tr 
                            key={inv.id} 
                            onClick={() => setExpandedInvoiceId(isExpanded ? null : inv.id)}
                            className="hover:bg-bg-subtle/30 transition-colors cursor-pointer"
                          >
                            <td className="p-3 text-center">
                              <span className="text-text-muted text-[10px]">
                                {isExpanded ? "▼" : "▶"}
                              </span>
                            </td>
                            <td className="p-3 font-bold text-text-primary">{inv.proveedor || "-"}</td>
                            <td className="p-3">
                              <span className="text-[11px] font-semibold bg-bg-subtle border border-border-custom px-2 py-0.5 rounded text-text-muted">
                                {inv.formaPago || "Sin asignar"}
                              </span>
                            </td>
                            <td className="p-3 font-semibold text-text-secondary">{inv.nroFactura || "-"}</td>
                            <td className="p-3 font-bold text-emerald-500">
                              {inv.moneda === "ARS" ? "$" : inv.moneda === "USD" ? "US$" : "€"} {inv.montoFinal.toLocaleString()}
                            </td>
                            <td className="p-3 text-text-muted">
                              {new Date(inv.createdAt).toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </td>
                            <td className="p-3 font-medium text-text-muted">
                              {inv.requests?.length || 0} artículos
                            </td>
                            <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                              {inv.archivoUrl ? (
                                <a
                                  href={inv.archivoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[#0078D7] hover:underline font-bold"
                                >
                                  <Eye className="w-3.5 h-3.5" /> Ver Archivo
                                </a>
                              ) : (
                                <span className="text-text-muted italic text-[11px]">Sin archivo</span>
                              )}
                            </td>
                            {session?.rol === "ADMIN" && (
                              <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => handleDeleteInvoice(inv.id)}
                                  className="p-1.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 hover:border-transparent rounded transition-all cursor-pointer"
                                  title="Eliminar factura de compra del historial"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            )}
                          </tr>
                          {isExpanded && (
                            <tr className="bg-bg-subtle/30">
                              <td colSpan={session?.rol === "ADMIN" ? 9 : 8} className="p-4 border-t border-b border-border-custom/50">
                                <div className="pl-6 space-y-3">
                                  <h4 className="font-bold text-xs text-[#0078D7] uppercase tracking-wider">Artículos Vinculados a esta Factura:</h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {inv.requests && inv.requests.length > 0 ? (
                                      inv.requests.map((req: any) => (
                                        <div key={req.id} className="bg-bg-card p-3 rounded-lg border border-border-custom flex items-center justify-between">
                                          <div>
                                            <p className="font-bold text-xs text-text-primary">{req.articulo}</p>
                                            <span className="text-[10px] text-text-muted block mt-0.5">
                                              Solicitado por: <span className="font-bold">{req.user?.nombre}</span> • Área: {req.areaDestino}
                                            </span>
                                          </div>
                                          <div className="text-right">
                                            <span className="font-bold text-xs text-text-primary block">$ {req.montoAprox.toLocaleString()}</span>
                                            <span className="text-[9px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/25 px-1.5 py-0.5 rounded-full block mt-0.5">
                                              PROCESADA
                                            </span>
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <p className="text-xs text-text-muted italic">No hay artículos cargados en esta factura.</p>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={session?.rol === "ADMIN" ? 9 : 8} className="text-center py-12 text-text-muted italic">
                        No hay facturas registradas en el sistema todavía.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Import Invoices / Stock */}
      {activeSubTab === "imports" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Sub-toggle imports menu */}
          <div className="flex border-b border-border-custom gap-2 pb-px mb-4 overflow-x-auto">
            <button
              onClick={() => {
                setImportMode("oc");
                setSelectedForeignOrderId(null);
              }}
              className={`flex items-center gap-2 px-6 py-2.5 border-b-2 font-semibold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer whitespace-nowrap ${
                importMode === "oc"
                  ? "border-[#0078D7] text-text-primary bg-white/2"
                  : "border-transparent text-text-muted hover:text-text-primary"
              }`}
            >
              <Truck className="w-4 h-4" />
              Control de Arribos (OC Exterior) ({pendingForeignOrders.length})
            </button>
            <button
              onClick={() => setImportMode("manual")}
              className={`flex items-center gap-2 px-6 py-2.5 border-b-2 font-semibold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer whitespace-nowrap ${
                importMode === "manual"
                  ? "border-[#0078D7] text-text-primary bg-white/2"
                  : "border-transparent text-text-muted hover:text-text-primary"
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              Cargar Factura Manual
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column (Manual Form or Pending OC List) */}
            <div className="lg:col-span-1 space-y-6">
              {importMode === "manual" ? (
                <div className="bg-bg-card border border-border-custom p-6 rounded-xl shadow-xl space-y-6 self-start">
                  <h3 className="font-bold text-sm text-text-primary uppercase tracking-wider flex items-center gap-2 border-b border-border-custom pb-3">
                    <PlusCircle className="text-[#0078D7] w-5 h-5" /> Nueva Factura de Importación
                  </h3>

                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!importForm.nroFactura || !importForm.proveedor || !importForm.montoFinal) {
                        alert("Por favor complete los campos obligatorios.");
                        return;
                      }
                      const parsedMonto = parseFloat(importForm.montoFinal);
                      if (isNaN(parsedMonto) || parsedMonto <= 0) {
                        alert("Monto final inválido.");
                        return;
                      }
                      const invalidItem = importItems.some(i => !i.nombreProduct || i.cantidad <= 0);
                      if (invalidItem) {
                        alert("Configure artículos y cantidades válidos.");
                        return;
                      }

                      setLoading(true);
                      const res = await createImportInvoice({
                        nroFactura: importForm.nroFactura,
                        proveedor: importForm.proveedor,
                        montoFinal: parsedMonto,
                        moneda: importForm.moneda,
                        fileBase64: importForm.fileBase64 || undefined,
                        fileName: importForm.fileName || undefined,
                        items: importItems
                      });
                      setLoading(false);

                      if (res.success) {
                        alert("Factura de importación registrada e inventario de Stock actualizado exitosamente.");
                        setImportForm({
                          nroFactura: "",
                          proveedor: "",
                          montoFinal: "",
                          moneda: "USD",
                          fileBase64: "",
                          fileName: ""
                        });
                        setImportItems([{ nombreProduct: "", cantidad: 1, tipoProduct: "PRODUCTO_FINAL" }]);
                        loadImportInvoicesData();
                      } else {
                        alert("Error: " + res.error);
                      }
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Nro Factura</label>
                      <input
                        type="text"
                        value={importForm.nroFactura}
                        onChange={e => setImportForm({ ...importForm, nroFactura: e.target.value })}
                        placeholder="Ej: INV-98721A"
                        className="w-full bg-bg-subtle border border-border-custom rounded-md px-3 py-2 text-xs text-text-primary focus:border-[#0078D7] outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Proveedor</label>
                      <input
                        type="text"
                        value={importForm.proveedor}
                        onChange={e => setImportForm({ ...importForm, proveedor: e.target.value })}
                        placeholder="Ej: Shenzhen Optics Ltd"
                        className="w-full bg-bg-subtle border border-border-custom rounded-md px-3 py-2 text-xs text-text-primary focus:border-[#0078D7] outline-none"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Monto Final</label>
                        <input
                          type="number"
                          step="0.01"
                          value={importForm.montoFinal}
                          onChange={e => setImportForm({ ...importForm, montoFinal: e.target.value })}
                          placeholder="1500.00"
                          className="w-full bg-bg-subtle border border-border-custom rounded-md px-3 py-2 text-xs text-text-primary focus:border-[#0078D7] outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Moneda</label>
                        <select
                          value={importForm.moneda}
                          onChange={e => setImportForm({ ...importForm, moneda: e.target.value })}
                          className="w-full bg-bg-subtle border border-border-custom rounded-md px-2 py-2 text-xs text-text-primary focus:border-[#0078D7] outline-none cursor-pointer"
                        >
                          <option value="USD">USD ($)</option>
                          <option value="EUR">EUR (€)</option>
                          <option value="ARS">ARS ($)</option>
                        </select>
                      </div>
                    </div>

                    {/* Upload Invoice File */}
                    <div>
                      <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Adjuntar Factura (PDF/Imagen)</label>
                      <div className="relative border border-dashed border-border-custom rounded-md p-3 text-center bg-bg-subtle hover:bg-bg-card transition-colors cursor-pointer">
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setImportForm({
                                  ...importForm,
                                  fileBase64: reader.result as string,
                                  fileName: file.name
                                });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        <div className="flex flex-col items-center gap-1">
                          <Upload className="w-5 h-5 text-text-muted" />
                          <span className="text-[10px] text-text-secondary font-medium">
                            {importForm.fileName ? importForm.fileName : "Seleccionar archivo"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Dynamic products loader */}
                    <div className="space-y-3 pt-3 border-t border-border-custom">
                      <div className="flex justify-between items-center">
                        <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Artículos a Sumar al Stock</label>
                        <button
                          type="button"
                          onClick={() => setImportItems([...importItems, { nombreProduct: "", cantidad: 1, tipoProduct: "PRODUCTO_FINAL" }])}
                          className="text-[10px] text-[#0078D7] bg-[#0078D7]/10 hover:bg-[#0078D7] hover:text-white px-2 py-1 rounded font-bold transition-colors cursor-pointer"
                        >
                          + Agregar
                        </button>
                      </div>

                      {importItems.map((item, idx) => (
                        <div key={idx} className="bg-bg-subtle p-3 rounded-lg border border-border-custom space-y-2 relative">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-mono text-text-muted">Item #{idx + 1}</span>
                            {importItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setImportItems(importItems.filter((_, i) => i !== idx))}
                                className="text-red-500 hover:text-red-600 text-[10px] cursor-pointer"
                              >
                                Eliminar
                              </button>
                            )}
                          </div>

                          <input
                            type="text"
                            placeholder="Nombre del artículo"
                            value={item.nombreProduct}
                            onChange={(e) => {
                              const updated = [...importItems];
                              updated[idx].nombreProduct = e.target.value;
                              setImportItems(updated);
                            }}
                            className="w-full bg-bg-card border border-border-custom rounded px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-[#0078D7]"
                            required
                            list={`import-products-datalist-${idx}`}
                          />
                          <datalist id={`import-products-datalist-${idx}`}>
                            {productsList.map(p => (
                              <option key={p.id} value={p.nombre} />
                            ))}
                          </datalist>

                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="number"
                              placeholder="Cant"
                              value={item.cantidad}
                              onChange={(e) => {
                                const updated = [...importItems];
                                updated[idx].cantidad = parseInt(e.target.value) || 0;
                                setImportItems(updated);
                              }}
                              className="w-full bg-bg-card border border-border-custom rounded px-2.5 py-1.5 text-xs text-text-primary text-center font-bold outline-none focus:border-[#0078D7]"
                              min="1"
                              required
                            />
                            <select
                              value={item.tipoProduct}
                              onChange={(e) => {
                                const updated = [...importItems];
                                updated[idx].tipoProduct = e.target.value;
                                setImportItems(updated);
                              }}
                              className="w-full bg-bg-card border border-border-custom rounded px-2 py-1.5 text-xs text-text-primary cursor-pointer outline-none"
                            >
                              <option value="PRODUCTO_FINAL">Final</option>
                              <option value="ENSAMBLE">Ensamble</option>
                              <option value="MATERIA_PRIMA">Materia Prima</option>
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-[#0078D7] hover:bg-[#005a9e] text-white py-2 rounded-md font-bold text-xs transition-colors cursor-pointer shadow-md uppercase tracking-wider"
                    >
                      {loading ? "Procesando..." : "Ingresar Importación y Stock"}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="bg-bg-card border border-border-custom p-6 rounded-xl shadow-xl space-y-4 self-start">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-text-secondary border-b border-border-custom pb-3">Órdenes Exteriores Pendientes</h3>
                  <div className="space-y-3">
                    {pendingForeignOrders.length > 0 ? (
                      pendingForeignOrders.map(order => (
                        <div
                          key={order.id}
                          onClick={() => {
                            setSelectedForeignOrderId(order.id);
                            setArrivalForm({
                              montoFinal: order.montoFinal ? order.montoFinal.toString() : "",
                              moneda: order.moneda || "USD",
                              fileBase64: "",
                              fileName: ""
                            });
                          }}
                          className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer shadow-sm ${
                            selectedForeignOrderId === order.id
                              ? "bg-[#0078D7]/10 border-[#0078D7]/40 ring-1 ring-[#0078D7]/20"
                              : "bg-bg-card border-border-custom hover:bg-bg-subtle"
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] bg-bg-subtle text-text-muted px-2 py-0.5 rounded font-mono font-bold border border-border-custom">{order.nroOrden}</span>
                            <span className="text-[9px] bg-amber-500/10 text-amber-400 font-bold px-1.5 py-0.5 rounded border border-amber-500/25 uppercase flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" /> Pendiente
                            </span>
                          </div>
                          <p className="font-bold text-xs text-text-primary mb-1">{order.proveedor}</p>
                          <div className="flex justify-between items-center text-[10px] text-text-muted border-t border-border-custom/50 pt-2 mt-2">
                            <span>📦 {order.items?.length || 0} ítems</span>
                            {order.paisOrigen && <span>Procedencia: {order.paisOrigen}</span>}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 bg-bg-card border border-border-custom rounded-xl text-center text-text-muted italic text-xs">
                        No hay órdenes exteriores pendientes de arribo.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column (History Table or Checklist Details) */}
            <div className="lg:col-span-2 space-y-4">
              {importMode === "oc" && selectedForeignOrderId ? (
                <div className="bg-bg-card border border-border-custom rounded-xl p-6 shadow-xl space-y-6">
                  {/* Header */}
                  <div className="flex justify-between items-start border-b border-border-custom pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-bg-subtle text-text-muted px-2 py-0.5 rounded font-mono font-bold border border-border-custom">
                          {pendingForeignOrders.find(o => o.id === selectedForeignOrderId)?.nroOrden}
                        </span>
                        <button
                          onClick={() => setSelectedForeignOrderId(null)}
                          className="text-xs text-[#0078D7] hover:underline font-semibold flex items-center gap-1"
                        >
                          ← Ver Historial de Facturas
                        </button>
                      </div>
                      <h2 className="text-base font-bold text-text-primary mt-2">
                        Proveedor: {pendingForeignOrders.find(o => o.id === selectedForeignOrderId)?.proveedor}
                      </h2>
                    </div>
                    <span className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/30 px-2.5 py-1 rounded-md font-semibold flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5" /> Checklist de Arribo
                    </span>
                  </div>

                  {/* Checklist of items */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-[10px] uppercase tracking-wider text-text-muted">Control de Materiales Recibidos</h4>
                    <div className="divide-y divide-border-custom bg-bg-subtle/30 rounded-xl border border-border-custom overflow-hidden">
                      {pendingForeignOrders.find(o => o.id === selectedForeignOrderId)?.items?.map((item: any) => (
                        <div
                          key={item.id}
                          onClick={() => handleToggleVerifyImportOrderItem(selectedForeignOrderId!, item.id, item.verificado)}
                          className="p-3 flex items-center justify-between hover:bg-bg-subtle/50 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            {item.verificado ? (
                              <CheckSquare className="w-4 h-4 text-[#0078D7]" />
                            ) : (
                              <Square className="w-4 h-4 text-text-muted" />
                            )}
                            <div>
                              <p className={`font-semibold text-xs ${item.verificado ? "line-through text-text-muted" : "text-text-primary"}`}>
                                {item.nombreProduct}
                              </p>
                              <span className="text-[9px] text-text-muted uppercase">{item.tipoProduct}</span>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-[#0078D7]">{item.cantidad} u.</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Financial inputs for generating import invoice */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-border-custom/50 pt-4">
                    <div>
                      <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Monto de la Factura</label>
                      <input
                        type="number"
                        step="0.01"
                        value={arrivalForm.montoFinal}
                        onChange={e => setArrivalForm({ ...arrivalForm, montoFinal: e.target.value })}
                        className="w-full bg-bg-subtle border border-border-custom rounded px-3 py-2 text-xs text-text-primary outline-none focus:border-[#0078D7]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Moneda</label>
                      <select
                        value={arrivalForm.moneda}
                        onChange={e => setArrivalForm({ ...arrivalForm, moneda: e.target.value })}
                        className="w-full bg-bg-subtle border border-border-custom rounded px-2.5 py-2 text-xs text-text-primary outline-none cursor-pointer"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="ARS">ARS ($)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Factura Digital (PDF/Imagen)</label>
                      <div className="relative border border-dashed border-border-custom rounded p-2 text-center bg-bg-subtle hover:bg-bg-card transition-colors cursor-pointer">
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setArrivalForm({
                                  ...arrivalForm,
                                  fileBase64: reader.result as string,
                                  fileName: file.name
                                });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        <span className="text-[9px] text-text-secondary truncate block font-medium">
                          {arrivalForm.fileName ? arrivalForm.fileName : "Subir PDF/Imagen"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-3 border-t border-border-custom/50 pt-4">
                    <button
                      onClick={() => handleConfirmArrivalWithInvoice(selectedForeignOrderId!)}
                      disabled={loading}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-md flex items-center gap-1.5"
                    >
                      <CheckCircle className="w-4 h-4" />
                      {loading ? "Procesando..." : "Confirmar Recepción y Registrar Factura"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-text-secondary">Historial de Facturas de Importación</h3>
                  <div className="bg-bg-card border border-border-custom rounded-xl shadow-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-border-custom font-bold uppercase tracking-wider text-text-muted bg-bg-subtle/50">
                            <th className="p-3">Factura Nro</th>
                            <th className="p-3">Proveedor</th>
                            <th className="p-3">Fecha de Carga</th>
                            <th className="p-3">Monto Final</th>
                            <th className="p-3 text-center">Archivo</th>
                            <th className="p-3 text-center">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-custom">
                          {importInvoices.length > 0 ? (
                            importInvoices.map((inv) => {
                              const currencySymbols: Record<string, string> = { USD: "U$S", EUR: "€", ARS: "$" };
                              const symbol = currencySymbols[inv.moneda] || "U$S";
                              const isExpanded = expandedImportId === inv.id;

                              return (
                                <>
                                  <tr key={inv.id} className="hover:bg-bg-subtle/30 transition-colors">
                                    <td className="p-3 font-mono font-bold text-[#0078D7]">{inv.nroFactura}</td>
                                    <td className="p-3 font-bold text-text-primary">{inv.proveedor}</td>
                                    <td className="p-3 text-text-muted">{new Date(inv.createdAt).toLocaleDateString()}</td>
                                    <td className="p-3 font-black text-text-primary">
                                      {symbol} {inv.montoFinal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="p-3 text-center">
                                      {inv.archivoUrl ? (
                                        <a
                                          href={inv.archivoUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 text-[#0078D7] hover:underline font-semibold"
                                        >
                                          <FileText className="w-4 h-4" /> Ver
                                        </a>
                                      ) : (
                                        <span className="text-text-muted italic">-</span>
                                      )}
                                    </td>
                                    <td className="p-3 text-center">
                                      <div className="flex items-center justify-center gap-2">
                                        <button
                                          onClick={() => setExpandedImportId(isExpanded ? null : inv.id)}
                                          className="text-xs bg-bg-subtle hover:bg-bg-card text-text-secondary hover:text-text-primary px-2.5 py-1.5 rounded border border-border-custom transition-all cursor-pointer font-bold shrink-0"
                                        >
                                          {isExpanded ? "Ocultar Detalle" : "Ver Artículos"}
                                        </button>
                                        {session?.rol === "ADMIN" && (
                                          <button
                                            onClick={() => handleDeleteImportInvoice(inv.id)}
                                            className="p-1.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 hover:border-transparent rounded transition-all cursor-pointer shrink-0"
                                            title="Eliminar factura de importación del historial"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                  {isExpanded && (
                                    <tr className="bg-bg-subtle/30">
                                      <td colSpan={6} className="p-4 border-t border-b border-border-custom/50">
                                        <div className="pl-6 space-y-3">
                                          <h4 className="font-bold text-xs text-[#0078D7] uppercase tracking-wider">Artículos que Sumaron al Stock:</h4>
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {inv.items && inv.items.length > 0 ? (
                                              inv.items.map((item: any) => (
                                                <div key={item.id} className="bg-bg-card p-3 rounded-lg border border-border-custom flex items-center justify-between">
                                                  <div>
                                                    <p className="font-bold text-xs text-text-primary">{item.nombreProduct}</p>
                                                    <span className="text-[9px] bg-bg-subtle text-text-muted px-1.5 py-0.5 rounded uppercase font-semibold mt-1 inline-block">
                                                      {item.tipoProduct}
                                                    </span>
                                                  </div>
                                                  <div className="text-right">
                                                    <span className="text-[10px] text-text-muted block">Cantidad</span>
                                                    <span className="font-black text-sm text-[#0078D7] block">+{item.cantidad} unidades</span>
                                                  </div>
                                                </div>
                                              ))
                                            ) : (
                                              <p className="text-xs text-text-muted italic">No hay artículos vinculados a esta factura.</p>
                                            )}
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={6} className="text-center py-12 text-text-muted italic">
                                No hay facturas de importación registradas.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Printable Reports & Visual Charts */}
      {activeSubTab === "reports" && (() => {
        // Build national expenses
        const nationalExpenses = requests
          .filter(r => r.estado === "APROBADA" || r.estado === "PROCESADA")
          .map(r => ({
            id: r.id,
            solicitante: r.user?.nombre || "N/A",
            articulo: r.articulo,
            tipoArticulo: r.tipoArticulo || "OTROS",
            areaDestino: r.areaDestino || "OTROS",
            fecha: new Date(r.createdAt),
            monto: r.montoAprox,
            moneda: "ARS",
            montoARS: r.montoAprox,
            esImportacion: false
          }));

        // Build import expenses
        const importExpenses = importInvoices.map(inv => {
          const factor = inv.moneda === "USD" ? 1000 : inv.moneda === "EUR" ? 1100 : 1;
          const montoARS = inv.montoFinal * factor;
          return {
            id: inv.id,
            solicitante: "COMPRAS EXTERIOR",
            articulo: `Factura ${inv.nroFactura} (${inv.proveedor})`,
            tipoArticulo: "IMPORTACIÓN",
            areaDestino: "COMPRAS EXTERIOR",
            fecha: new Date(inv.createdAt),
            monto: inv.montoFinal,
            moneda: inv.moneda,
            montoARS,
            esImportacion: true
          };
        });

        const allExpenses = [...nationalExpenses, ...importExpenses];

        // Filter data
        const reportData = allExpenses.filter(e => {
          if (reportArea !== "ALL" && e.areaDestino !== reportArea) return false;
          if (reportType !== "ALL" && e.tipoArticulo !== reportType) return false;
          
          if (reportDateFrom) {
            const fromDate = new Date(reportDateFrom);
            fromDate.setHours(0, 0, 0, 0);
            if (e.fecha < fromDate) return false;
          }
          if (reportDateTo) {
            const toDate = new Date(reportDateTo);
            toDate.setHours(23, 59, 59, 999);
            if (e.fecha > toDate) return false;
          }
          return true;
        });

        // Compute total spents in ARS & USD
        let totalSpentARS = 0;
        let totalSpentUSD = 0;

        reportData.forEach(e => {
          if (e.moneda === "USD") {
            totalSpentUSD += e.monto;
          } else if (e.moneda === "EUR") {
            totalSpentUSD += e.monto * 1.1; // roughly
          } else {
            totalSpentARS += e.monto;
          }
        });

        const totalSpentEquivalentARS = reportData.reduce((acc, e) => acc + e.montoARS, 0);
        const ticketAverageEquivalentARS = reportData.length > 0 ? totalSpentEquivalentARS / reportData.length : 0;

        // Group by Area
        const areaGroups: Record<string, number> = {};
        reportData.forEach(e => {
          const area = e.areaDestino || "Sin área";
          areaGroups[area] = (areaGroups[area] || 0) + e.montoARS;
        });

        // Group by Item Type
        const typeGroups: Record<string, number> = {};
        reportData.forEach(e => {
          const type = e.tipoArticulo || "Sin tipo";
          typeGroups[type] = (typeGroups[type] || 0) + e.montoARS;
        });

        const colorsList = ["#0078D7", "#00B7C3", "#107C41", "#D83B01", "#8764B8", "#E81123", "#F2C811", "#0063B1"];

        return (
          <div className="space-y-6 printable-report animate-in fade-in duration-200">
            {/* Inject print-specific CSS */}
            <style dangerouslySetInnerHTML={{ __html: `
              @media print {
                /* Hide sidebar, headers, filters and action buttons */
                aside, header, nav, .no-print, .sub-tabs-nav, button, select, input, .theme-toggle {
                  display: none !important;
                }
                main, .printable-report, body {
                  background: white !important;
                  color: black !important;
                  padding: 0 !important;
                  margin: 0 !important;
                  width: 100% !important;
                  max-width: 100% !important;
                }
                .printable-report {
                  border: none !important;
                  box-shadow: none !important;
                }
                /* Print margins adjustment */
                @page {
                  margin: 1.5cm;
                }
                /* Avoid breaking pages inside graphs/tables */
                .page-break-avoid {
                  page-break-inside: avoid;
                }
              }
            `}} />

            {/* Toolbar / Filters (Hidden when printing) */}
            <div className="no-print bg-bg-card p-4 border border-border-custom rounded-xl shadow-md flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Área Destino</label>
                  <select
                    value={reportArea}
                    onChange={e => setReportArea(e.target.value)}
                    className="bg-bg-subtle border border-border-custom rounded px-2.5 py-1.5 text-xs text-text-primary outline-none cursor-pointer"
                  >
                    <option value="ALL">Todas las Áreas</option>
                    <option value="Laboratorio">Laboratorio</option>
                    <option value="Logística/despachos">Logística/despachos</option>
                    <option value="Operativa">Operativa</option>
                    <option value="Areas Comun">Areas Comun</option>
                    <option value="COMPRAS EXTERIOR">Compras Exterior</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Tipo de Artículo</label>
                  <select
                    value={reportType}
                    onChange={e => setReportType(e.target.value)}
                    className="bg-bg-subtle border border-border-custom rounded px-2.5 py-1.5 text-xs text-text-primary outline-none cursor-pointer"
                  >
                    <option value="ALL">Todos los Tipos</option>
                    <option value="Supermercado">Supermercado</option>
                    <option value="Laboratorio">Laboratorio</option>
                    <option value="Muebles / Útiles">Muebles / Útiles</option>
                    <option value="Herramientas">Herramientas</option>
                    <option value="Consumibles">Consumibles</option>
                    <option value="Gastos Fijos / Servicio">Gastos Fijos / Servicio</option>
                    <option value="Gastos importacion Argentina">Gastos importacion Argentina</option>
                    <option value="IMPORTACIÓN">Importaciones</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Desde
                  </label>
                  <input
                    type="date"
                    value={reportDateFrom}
                    onChange={e => setReportDateFrom(e.target.value)}
                    className="bg-bg-subtle border border-border-custom rounded px-2.5 py-1 text-xs text-text-primary outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Hasta
                  </label>
                  <input
                    type="date"
                    value={reportDateTo}
                    onChange={e => setReportDateTo(e.target.value)}
                    className="bg-bg-subtle border border-border-custom rounded px-2.5 py-1 text-xs text-text-primary outline-none"
                  />
                </div>
              </div>

              <button
                onClick={() => window.print()}
                className="bg-[#0078D7] hover:bg-[#005a9e] text-white px-4 py-2 rounded font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Printer className="w-4 h-4" /> Imprimir Reporte
              </button>
            </div>

            {/* Report Header for printing */}
            <div className="hidden print:flex items-center justify-between border-b-2 border-black pb-3 mb-5">
              <div className="flex items-center gap-3">
                <img 
                  src="/logo.png" 
                  alt="Aitue Logo" 
                  className="w-10 h-10 object-contain rounded"
                />
                <div>
                  <h1 className="text-lg font-black text-black tracking-wide leading-none">AITUE COMINCA S.A.</h1>
                  <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-1">Informe de Compras y Gastos (Nac. e Imp.)</p>
                </div>
              </div>
              <div className="text-right text-[9px] text-gray-500 leading-tight">
                <p><strong>Generado:</strong> {new Date().toLocaleDateString()}</p>
                <p><strong>Área:</strong> {reportArea === "ALL" ? "Todas" : reportArea}</p>
                <p><strong>Tipo:</strong> {reportType === "ALL" ? "Todos" : reportType}</p>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-bg-card border border-border-custom rounded-xl p-3.5 shadow-sm print:border-gray-300">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Gasto Total Acumulado</span>
                <div className="mt-1 space-y-0.5">
                  <p className="text-lg font-black text-[#0078D7]">${totalSpentARS.toLocaleString(undefined, { minimumFractionDigits: 2 })} ARS</p>
                  {totalSpentUSD > 0 && (
                    <p className="text-sm font-bold text-rose-400">U$S {totalSpentUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD</p>
                  )}
                </div>
              </div>
              <div className="bg-bg-card border border-border-custom rounded-xl p-3.5 shadow-sm print:border-gray-300">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Cantidad de Compras</span>
                <p className="text-xl font-black text-purple-500 mt-1">{reportData.length} transacciones</p>
              </div>
              <div className="bg-bg-card border border-border-custom rounded-xl p-3.5 shadow-sm print:border-gray-300">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Ticket Promedio (Equiv. ARS)</span>
                <p className="text-xl font-black text-emerald-500 mt-1">$ {ticketAverageEquivalentARS.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 page-break-avoid">
              
              {/* Chart: Gasto por Área */}
              <div className="bg-bg-card border border-border-custom rounded-xl p-4 shadow-sm print:border-gray-300">
                <h3 className="font-bold text-xs uppercase tracking-wider text-text-secondary mb-4 border-b border-border-custom pb-2">Distribución de Gastos por Área</h3>
                <div className="space-y-4">
                  {Object.keys(areaGroups).length > 0 ? (
                    Object.entries(areaGroups)
                      .sort((a, b) => b[1] - a[1])
                      .map(([area, val], idx) => {
                        const percent = totalSpentEquivalentARS > 0 ? (val / totalSpentEquivalentARS) * 100 : 0;
                        const color = colorsList[idx % colorsList.length];
                        return (
                          <div key={area} className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold">
                              <span className="text-text-primary">{area}</span>
                              <span className="text-text-secondary font-mono">${val.toLocaleString()} ({percent.toFixed(1)}%)</span>
                            </div>
                            <div className="w-full bg-bg-subtle h-3 rounded-full overflow-hidden border border-border-custom/50">
                              <div 
                                style={{ width: `${percent}%`, backgroundColor: color }} 
                                className="h-full rounded-full transition-all duration-500"
                              />
                            </div>
                          </div>
                        );
                      })
                  ) : (
                    <p className="text-xs text-text-muted italic py-6 text-center">Sin datos de gastos para graficar por área.</p>
                  )}
                </div>
              </div>

              {/* Chart: Gasto por Tipo de Artículo */}
              <div className="bg-bg-card border border-border-custom rounded-xl p-4 shadow-sm print:border-gray-300">
                <h3 className="font-bold text-xs uppercase tracking-wider text-text-secondary mb-4 border-b border-border-custom pb-2">Distribución de Gastos por Tipo de Artículo</h3>
                <div className="space-y-4">
                  {Object.keys(typeGroups).length > 0 ? (
                    Object.entries(typeGroups)
                      .sort((a, b) => b[1] - a[1])
                      .map(([type, val], idx) => {
                        const percent = totalSpentEquivalentARS > 0 ? (val / totalSpentEquivalentARS) * 100 : 0;
                        const color = colorsList[(idx + 2) % colorsList.length];
                        return (
                          <div key={type} className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold">
                              <span className="text-text-primary">{type}</span>
                              <span className="text-text-secondary font-mono">${val.toLocaleString()} ({percent.toFixed(1)}%)</span>
                            </div>
                            <div className="w-full bg-bg-subtle h-3 rounded-full overflow-hidden border border-border-custom/50">
                              <div 
                                style={{ width: `${percent}%`, backgroundColor: color }} 
                                className="h-full rounded-full transition-all duration-500"
                              />
                            </div>
                          </div>
                        );
                      })
                  ) : (
                    <p className="text-xs text-text-muted italic py-6 text-center">Sin datos de gastos para graficar por tipo de artículo.</p>
                  )}
                </div>
              </div>

            </div>

            {/* Detailed Table */}
            <div className="bg-bg-card border border-border-custom rounded-xl shadow-md overflow-hidden print:border-gray-300 page-break-avoid">
              <div className="p-4 bg-bg-subtle/40 border-b border-border-custom">
                <h3 className="font-bold text-xs uppercase tracking-wider text-text-secondary">Registro Detallado del Período</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border-custom font-bold uppercase tracking-wider text-text-muted bg-bg-subtle/50">
                      <th className="p-3">Solicitante</th>
                      <th className="p-3">Artículo</th>
                      <th className="p-3">Tipo Artículo</th>
                      <th className="p-3">Área Destino</th>
                      <th className="p-3">Fecha</th>
                      <th className="p-3 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-custom">
                    {reportData.length > 0 ? (
                      reportData.map((e) => (
                        <tr key={e.id} className="hover:bg-bg-subtle/30 transition-colors">
                          <td className="p-3 font-semibold text-text-primary">{e.solicitante}</td>
                          <td className="p-3 text-text-secondary font-medium">{e.articulo}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded font-mono font-bold text-[9px] uppercase border ${
                              e.esImportacion 
                                ? "bg-rose-500/10 text-rose-400 border-rose-500/20" 
                                : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                            }`}>
                              {e.tipoArticulo}
                            </span>
                          </td>
                          <td className="p-3 font-semibold text-text-secondary">{e.areaDestino}</td>
                          <td className="p-3 text-text-muted">{e.fecha.toLocaleDateString()}</td>
                          <td className="p-3 text-right font-bold text-text-primary">
                            {e.moneda === "USD" ? "U$S " : e.moneda === "EUR" ? "€ " : "$ "}
                            {e.monto.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-text-muted italic">
                          No hay transacciones registradas que coincidan con los filtros del informe.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        );
      })()}

      {/* Rejection comment modal */}
      {rejectingId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-card border border-border-custom rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-6 border-b border-border-custom bg-bg-subtle flex justify-between items-center">
              <h3 className="font-bold text-base text-text-primary flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" /> Rechazar Solicitud
              </h3>
              <button
                onClick={() => setRejectingId(null)}
                className="text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider">
                Motivo / Comentario del Rechazo (Obligatorio)
              </label>
              <textarea
                value={rejectionComment}
                onChange={(e) => setRejectionComment(e.target.value)}
                placeholder="Escriba el motivo por el cual se rechaza esta compra..."
                className="w-full bg-bg-subtle border border-border-custom rounded-md px-3 py-2 text-xs text-text-primary focus:border-red-500 outline-none min-h-[90px]"
                required
              />
            </div>
            <div className="p-4 border-t border-border-custom bg-bg-subtle flex justify-end gap-3">
              <button
                onClick={() => setRejectingId(null)}
                className="px-4 py-2 border border-border-custom rounded text-xs text-text-secondary hover:bg-bg-card transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (!rejectionComment.trim()) {
                    alert("Por favor ingrese un motivo.");
                    return;
                  }
                  handleUpdateStatus(rejectingId, "RECHAZADA", rejectionComment);
                }}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-semibold transition-colors cursor-pointer"
              >
                Rechazar Compra
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

