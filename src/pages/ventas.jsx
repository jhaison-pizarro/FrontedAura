import { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { fetchAuth } from "../funciones/auth";
import { API_BASE_URL } from "../config";
import {
  ShoppingCart,
  Plus,
  Trash2,
  Search,
  Printer,
  List,
  User,
  Package,
  Eye,
  ChevronDown,
  ChevronUp,
  Calendar,
  X,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { fechaLocalStr } from "../funciones/funciones";
import {
  filtrarReservasActivas,
  calcularStockDisponibleParaVenta,
  calcularStockConsumidoEnListaLocal,
} from "../funciones/stockDisponibilidad";
import { buildImageUrl } from "../funciones/imageUtils";
import { useSucursal } from "../context/SucursalContext";
import { useSessionState, useFormPersist } from "../funciones/useSessionState";

const API_BASE = API_BASE_URL;

export default function Ventas() {
  const { sucursalActual } = useSucursal();

  // ==================== PESTAÑAS ====================
  const [pestanaActiva, setPestanaActiva, clearPestana] = useSessionState("ventas_tab", "nueva");

  // ==================== DATOS ====================
  const [productos, setProductos] = useState([]);
  const [metodoPago, setMetodoPago] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [reservasActivas, setReservasActivas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [configEmpresa, setConfigEmpresa] = useState(null);

  // ==================== FORM NUEVA VENTA ====================
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
  } = useForm({
    defaultValues: {
      dni: "",
      nombre: "",
      apellidos: "",
      descripcion: "",
    },
  });
  const { clearFormPersist } = useFormPersist("ventas_rhf", { watch, setValue });

  // ==================== CARRITO ====================
  const [listaProductos, setListaProductos, clearCarrito] = useSessionState("ventas_carrito", []);
  const [searchNombre, setSearchNombre] = useState("");
  const [productosEncontrados, setProductosEncontrados] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [barcode, setBarcode] = useState("");
  const barcodeRef = useRef(null);

  // ==================== PAGO ====================
  const [pagosAgregados, setPagosAgregados, clearPagos] = useSessionState("ventas_pagos", []);
  const [showPagosModal, setShowPagosModal] = useState(false);
  const [montoRecibido, setMontoRecibido, clearMonto] = useSessionState("ventas_monto", "");

  // ==================== LISTA / FILTROS ====================
  const [filtroFechaDesde, setFiltroFechaDesde] = useState(fechaLocalStr());
  const [filtroFechaHasta, setFiltroFechaHasta] = useState(fechaLocalStr());
  const [filtroBusqueda, setFiltroBusqueda] = useState("");
  const [filtroDni, setFiltroDni] = useState("");
  const [ventaExpandida, setVentaExpandida] = useState(null);

  // ==================== MODALES ====================
  const [fotoAmpliada, setFotoAmpliada] = useState(null);
  const [ventaDetalle, setVentaDetalle] = useState(null);
  const [clienteId, setClienteId, clearClienteId] = useSessionState("ventas_clienteId", null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalData, setConfirmModalData] = useState(null);
  const [motivoAccion, setMotivoAccion] = useState("");
  const [editandoVentaId, setEditandoVentaId] = useState(null);

  // ==================== EFFECTS ====================
  useEffect(() => {
    fetchProductos();
    fetchMetodoPago();
    fetchVentas();
    fetchReservasParaStock();
    fetchConfigEmpresa();
  }, []);

  // ==================== FETCH ====================
  async function fetchProductos() {
    try {
      const res = await fetchAuth(`${API_BASE}/productos`);
      if (res.ok) setProductos(await res.json() || []);
    } catch { /* ignore */ }
  }

  async function fetchMetodoPago() {
    try {
      const res = await fetchAuth(`${API_BASE}/pagos`);
      if (res.ok) setMetodoPago(await res.json() || []);
    } catch { /* ignore */ }
  }

  async function fetchConfigEmpresa() {
    try {
      const res = await fetchAuth(`${API_BASE}/configuracion`);
      if (res.ok) setConfigEmpresa(await res.json());
    } catch { /* ignore */ }
  }

  async function fetchVentas() {
    setLoading(true);
    try {
      const res = await fetchAuth(`${API_BASE}/ventas`);
      if (res.ok) setVentas(await res.json() || []);
    } catch {
      toast.error("Error cargando ventas");
    } finally {
      setLoading(false);
    }
  }

  async function fetchReservasParaStock() {
    try {
      const res = await fetchAuth(`${API_BASE}/reservas?incluir_grupales=true`);
      if (res.ok) {
        const data = await res.json();
        setReservasActivas(filtrarReservasActivas(data || []));
      }
    } catch { /* ignore */ }
  }

  // ==================== CLIENTE ====================
  async function buscarCliente(dni) {
    if (!dni || !/^[0-9]{8}$/.test(dni)) {
      toast.warning("El DNI debe tener 8 dígitos numéricos");
      return;
    }
    setLoading(true);
    try {
      // Buscar en BD
      const res = await fetchAuth(`${API_BASE}/clientes`);
      const clientes = await res.json();
      const cliente = (clientes || []).find((c) => c.dni === dni);
      if (cliente) {
        setValue("nombre", cliente.nombre || "");
        setValue("apellidos", cliente.apellidos || "");
        setClienteId(cliente.ID || cliente.id);
        toast.success(`Cliente encontrado: ${cliente.nombre} ${cliente.apellidos}`);
        return;
      }
      // Buscar en RENIEC
      toast.info("Buscando en RENIEC...");
      const resR = await fetch("https://apiperu.dev/api/dni", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_DNI_API_TOKEN}`,
        },
        body: JSON.stringify({ dni }),
      });
      const result = await resR.json();
      if (result.success && result.data) {
        setValue("nombre", result.data.nombres || "");
        setValue("apellidos", `${result.data.apellido_paterno || ""} ${result.data.apellido_materno || ""}`.trim());
        toast.success("Datos obtenidos de RENIEC");
      } else {
        toast.info("No se encontraron datos");
      }
    } catch {
      toast.error("Error al buscar cliente");
    } finally {
      setLoading(false);
    }
  }

  // ==================== PRODUCTOS ====================
  function buscarProductosPorNombre(nombre) {
    if (!nombre || nombre.length < 2) {
      setProductosEncontrados([]);
      setShowSearchResults(false);
      return;
    }
    const terminoLower = nombre.toLowerCase();
    const encontrados = productos
      .filter((p) => p.nombre?.toLowerCase().includes(terminoLower))
      .sort((a, b) => {
        const aS = (a.nombre || "").toLowerCase().startsWith(terminoLower);
        const bS = (b.nombre || "").toLowerCase().startsWith(terminoLower);
        if (aS && !bS) return -1;
        if (!aS && bS) return 1;
        return (a.nombre || "").localeCompare(b.nombre || "");
      });
    setProductosEncontrados(encontrados.slice(0, 10));
    setShowSearchResults(true);
  }

  async function buscarProductoPorBarcode(code) {
    if (!code) return;
    try {
      const res = await fetchAuth(`${API_BASE}/productos/codigo/${code}`);
      if (res.ok) {
        const prod = await res.json();
        agregarProductoALista(prod);
      } else {
        toast.error("Producto no encontrado");
      }
    } catch {
      toast.error("Error al buscar producto");
    }
    setBarcode("");
  }

  function agregarProductoALista(prod) {
    const prodId = prod.ID || prod.id;
    const stockFisico = prod.stock ?? prod.Stock ?? 0;

    // Validar stock
    const infoStock = calcularStockDisponibleParaVenta(prodId, stockFisico, reservasActivas);
    const enListaLocal = calcularStockConsumidoEnListaLocal(prod.nombre, listaProductos.map((p) => ({ ...p, tipo: "individual" })));
    const disponibleReal = infoStock.stockReal - enListaLocal;

    if (disponibleReal <= 0) {
      toast.error(
        <div style={{ fontSize: "12px" }}>
          <strong>"{prod.nombre}" sin stock para venta</strong>
          <div style={{ marginTop: 4, color: "#666" }}>
            Stock: {stockFisico} | Reservado: {infoStock.unidadesReservadas}
            {enListaLocal > 0 && ` | Carrito: ${enListaLocal}`}
          </div>
          {infoStock.reservasFuturas?.length > 0 && (
            <div style={{ marginTop: 6, borderTop: "1px solid #eee", paddingTop: 4 }}>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>Reservas que ocupan stock:</div>
              {infoStock.reservasFuturas.map((rf, i) => {
                const fecha = rf.fecha ? String(rf.fecha).split("T")[0] : "Sin fecha";
                return (
                  <div key={i} style={{ paddingLeft: 4 }}>
                    • {rf.cantidad} unid. — {fecha}
                    {rf.esCombo && <span style={{ color: "#b45309" }}> (combo: {rf.comboNombre})</span>}
                    <span style={{ color: "#999" }}> — #{rf.idReserva}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>,
        { duration: 10000 }
      );
      return;
    }

    // Si ya está en la lista, incrementar cantidad
    const existente = listaProductos.find((p) => p.producto_id === prodId);
    if (existente) {
      if (existente.cantidad + 1 > disponibleReal + enListaLocal) {
        toast.error(`Stock insuficiente para "${prod.nombre}"`);
        return;
      }
      setListaProductos((prev) =>
        prev.map((p) =>
          p.producto_id === prodId
            ? { ...p, cantidad: p.cantidad + 1, subtotal: (p.cantidad + 1) * p.precio_venta }
            : p
        )
      );
    } else {
      setListaProductos((prev) => [
        ...prev,
        {
          producto_id: prodId,
          nombre: prod.nombre,
          precio_venta: parseFloat(prod.precio_venta || 0),
          cantidad: 1,
          subtotal: parseFloat(prod.precio_venta || 0),
          imagen: prod.imagen,
          talla: prod.talla,
          color: prod.color,
          modelo: prod.modelo,
          codigo_barras: prod.codigo_barras,
        },
      ]);
    }

    // Warning de reservas futuras
    if (infoStock.reservasFuturas && infoStock.reservasFuturas.length > 0) {
      const totalReservado = infoStock.reservasFuturas.reduce((s, r) => s + r.cantidad, 0);
      const detalleReservas = infoStock.reservasFuturas.map((r) => {
        const fechaStr = r.fecha ? new Date(r.fecha).toLocaleDateString("es-PE") : "sin fecha";
        return `  • Reserva #${r.idReserva} (${fechaStr}) — ${r.cantidad} unid.${r.esCombo ? " (combo)" : ""}`;
      }).join("\n");
      toast.warning(`"${prod.nombre}" tiene ${totalReservado} unidad(es) reservadas:\n${detalleReservas}`, { duration: 6000 });
    }

    toast.success(`"${prod.nombre}" agregado`);
    setSearchNombre("");
    setProductosEncontrados([]);
    setShowSearchResults(false);
  }

  function eliminarDeLista(productoId) {
    setListaProductos((prev) => prev.filter((p) => p.producto_id !== productoId));
  }

  function actualizarCantidad(productoId, nuevaCantidad) {
    if (nuevaCantidad <= 0) {
      eliminarDeLista(productoId);
      return;
    }

    // Validar stock antes de incrementar
    const item = listaProductos.find((p) => p.producto_id === productoId);
    if (!item) return;

    const prodData = productos.find((p) => (p.ID || p.id) === productoId);
    const stockFisico = prodData ? (prodData.stock ?? prodData.Stock ?? 0) : 0;
    const infoStock = calcularStockDisponibleParaVenta(productoId, stockFisico, reservasActivas);
    const enListaOtros = calcularStockConsumidoEnListaLocal(
      item.nombre,
      listaProductos.filter((p) => p.producto_id !== productoId).map((p) => ({ ...p, tipo: "individual" }))
    );
    const stockMax = infoStock.stockReal - enListaOtros;

    if (nuevaCantidad > stockMax) {
      toast.warning(`Stock insuficiente para "${item.nombre}". Disponible: ${Math.max(0, stockMax)}`);
      return;
    }

    setListaProductos((prev) =>
      prev.map((p) =>
        p.producto_id === productoId
          ? { ...p, cantidad: nuevaCantidad, subtotal: nuevaCantidad * p.precio_venta }
          : p
      )
    );
  }

  const totalVenta = listaProductos.reduce((sum, p) => sum + p.subtotal, 0);
  const totalPagos = pagosAgregados.reduce((sum, p) => sum + p.monto, 0);
  const faltaRegistrar = Math.max(0, totalVenta - totalPagos);
  const vuelto = montoRecibido ? Math.max(0, parseFloat(montoRecibido) - totalVenta) : 0;

  // ==================== FUNCIONES PAGOS ====================
  function agregarMetodoPago(metodo, monto, descripcion) {
    if (!monto || monto <= 0) {
      toast.warning("El monto debe ser mayor a 0");
      return;
    }
    if (totalPagos + parseFloat(monto) > totalVenta + 0.01) {
      toast.warning("El total de pagos no puede exceder el total a pagar");
      return;
    }
    setPagosAgregados((prev) => [...prev, {
      id: Date.now(),
      id_pago: metodo.ID || metodo.id,
      nombre: metodo.nombre,
      monto: parseFloat(monto),
      descripcion: descripcion || "",
    }]);
  }

  function removerMetodoPago(pagoId) {
    setPagosAgregados((prev) => prev.filter((p) => p.id !== pagoId));
  }

  // Auto-agregar Efectivo cuando se agregan productos
  function autoAgregarEfectivo(total) {
    const efectivo = metodoPago.find((m) => (m.nombre || "").toLowerCase().includes("efectivo"));
    if (efectivo && total > 0) {
      setPagosAgregados([{
        id: Date.now(),
        id_pago: efectivo.ID || efectivo.id,
        nombre: efectivo.nombre,
        monto: total,
        descripcion: "",
      }]);
    }
  }

  // Auto-agregar/actualizar Efectivo cuando cambia el total
  useEffect(() => {
    if (totalVenta > 0 && pagosAgregados.length === 0) {
      autoAgregarEfectivo(totalVenta);
    } else if (totalVenta > 0 && pagosAgregados.length === 1) {
      // Si solo hay un pago y es efectivo, actualizar su monto al nuevo total
      const unicoPago = pagosAgregados[0];
      const esEfectivo = (unicoPago.nombre || "").toLowerCase().includes("efectivo");
      if (esEfectivo && Math.abs(unicoPago.monto - totalVenta) > 0.01) {
        setPagosAgregados([{ ...unicoPago, monto: totalVenta }]);
      }
    } else if (totalVenta === 0) {
      setPagosAgregados([]);
    }
  }, [totalVenta]);

  // ==================== IMPRIMIR TICKET ====================
  function imprimirTicketVenta({ idVenta, clienteNombre, clienteDni, productos, pagos, total, fecha }) {
    const config = configEmpresa || {};
    const totalPagado = pagos.reduce((sum, p) => sum + (p.monto || 0), 0);
    const vuelto = Math.max(0, totalPagado - total);

    const contenido = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Ticket Venta #${idVenta}</title>
      <style>
        * { color: #000 !important; margin: 0; padding: 0; box-sizing: border-box; }
        @page { size: 68mm auto; margin: 0; }
        body {
          font-family: 'Calibri';
          font-size: 12px;
          width: 65mm;
          max-width: 65mm;
          margin: 0 auto;
          padding: 2mm 3mm;
          overflow: hidden;
          word-break: break-word;
          line-height: 1.3;
        }
        .center { text-align: center; }
        .line { border-top: 1px dashed #000; margin: 4px 0; }
        .line-double { border-top: 2px solid #000; margin: 4px 0; }
        .row { display: flex; justify-content: space-between; margin: 2px 0; }
        h2 { font-size: 14px; font-weight: bold; margin: 5px 0; }
        h3 { font-size: 12px; font-weight: bold; margin: 4px 0; }
        .empresa-nombre { font-size: 15px; font-weight: bold; text-transform: uppercase; }
        .empresa-info { font-size: 11px; }
        .producto { padding: 3px 0; border-bottom: 1px dotted #000; }
        .total-section { padding: 5px; margin-top: 5px; border: 1px solid #000; }
        .bold { font-weight: bold; }
        @media print {
          html, body { width: 65mm; margin: 0; padding: 1mm 2mm; overflow: hidden !important; }
        }
      </style>
    </head>
    <body>
      <!-- HEADER EMPRESA -->
      <div class="center">
        <div class="empresa-nombre">${config.nombre_empresa || 'MI EMPRESA'}</div>
        ${config.razon_social ? `<div class="empresa-info">${config.razon_social}</div>` : ''}
        ${config.ruc ? `<div class="empresa-info">RUC: ${config.ruc}</div>` : ''}
        ${sucursalActual?.nombre ? `<div class="empresa-info">Sucursal: ${sucursalActual.nombre}</div>` : ''}
        ${sucursalActual?.direccion ? `<div class="empresa-info">${sucursalActual.direccion}</div>` : ''}
        ${sucursalActual?.telefono ? `<div class="empresa-info">Tel: ${sucursalActual.telefono}</div>` : ''}
      </div>
      <div class="line"></div>

      <div class="center">
        <h2>COMPROBANTE DE VENTA</h2>
        <p style="font-size: 11px;">N° ${idVenta}</p>
      </div>
      <div class="line"></div>

      <div class="row"><span class="bold">CLIENTE:</span></div>
      <div>${clienteNombre || "Sin especificar"}</div>
      ${clienteDni ? `<div class="row"><span>DNI:</span><span>${clienteDni}</span></div>` : ''}
      <div class="row"><span>Fecha:</span><span>${(fecha ? new Date(fecha) : new Date()).toLocaleDateString("es-PE")}</span></div>
      <div class="row"><span>Hora:</span><span>${(fecha ? new Date(fecha) : new Date()).toLocaleTimeString("es-PE")}</span></div>

      <div class="line"></div>
      <div class="center"><h3>PRODUCTOS</h3></div>

      ${productos.map((p) => {
        const infoExtra = [p.talla ? 'T:' + p.talla : '', p.color ? 'C:' + p.color : ''].filter(Boolean).join(' | ');
        return `
        <div class="producto">
          <div>${p.nombre || "Producto"}</div>
          ${infoExtra ? `<div style="font-size:9px;">${infoExtra}</div>` : ''}
          <div class="row">
            <span>${p.cantidad || 1} x S/ ${Number(p.precio_venta || 0).toFixed(2)}</span>
            <span class="bold">S/ ${Number(p.subtotal || 0).toFixed(2)}</span>
          </div>
        </div>`;
      }).join("")}

      <div class="line-double"></div>
      <div class="total-section">
        <div class="row"><span class="bold">TOTAL:</span><span class="bold">S/ ${total.toFixed(2)}</span></div>
      </div>

      <div class="line"></div>
      <div class="center"><h3>PAGADO</h3></div>
      ${pagos.map((p) => `
        <div class="row">
          <span>${p.nombre || "Efectivo"}</span>
          <span>S/ ${(p.monto || 0).toFixed(2)}</span>
        </div>
      `).join("")}
      ${vuelto > 0 ? `
      <div class="line"></div>
      <div class="row"><span class="bold">VUELTO:</span><span class="bold">S/ ${vuelto.toFixed(2)}</span></div>
      ` : ''}

      <div class="line"></div>
      <div class="center" style="font-size: 10px;">
        ${config.lema ? `<div style="font-style:italic;margin:5px 0;">"${config.lema}"</div>` : ''}
        <p>¡Gracias por su compra!</p>
        ${config.sitio_web ? `<div style="font-size:9px;">${config.sitio_web}</div>` : ''}
        <p>Impreso: ${new Date().toLocaleString("es-PE")}</p>
      </div>

    </body>
    </html>`;

    const ventana = window.open("", "_blank", "width=400,height=600");
    if (!ventana) return;
    ventana.document.write(contenido);
    ventana.document.close();
    ventana.onload = () => {
      ventana.print();
    };
  }

  // ==================== GUARDAR VENTA ====================
  async function onSubmitVenta(data) {
    if (listaProductos.length === 0) {
      toast.error("Agregue al menos un producto");
      return;
    }
    if (pagosAgregados.length === 0) {
      toast.error("Debe agregar al menos un método de pago");
      return;
    }
    if (Math.abs(totalPagos - totalVenta) > 0.01) {
      toast.error(`El total de pagos (S/ ${totalPagos.toFixed(2)}) no coincide con el total a pagar (S/ ${totalVenta.toFixed(2)})`);
      return;
    }

    setSaving(true);
    try {
      const clienteNombre = `${data.nombre || ""} ${data.apellidos || ""}`.trim() || "Sin especificar";
      const clienteDni = data.dni || "";

      // Crear o encontrar cliente en la BD si tiene DNI y nombre
      let idClienteFinal = clienteId;
      if (!idClienteFinal && clienteDni && clienteNombre !== "Sin especificar") {
        // Buscar si ya existe por DNI
        try {
          const resClientes = await fetchAuth(`${API_BASE}/clientes`);
          if (resClientes.ok) {
            const clientes = await resClientes.json();
            const existente = (clientes || []).find((c) => c.dni === clienteDni);
            if (existente) {
              idClienteFinal = existente.ID || existente.id;
            }
          }
        } catch {}

        // Si no existe, crear cliente nuevo
        if (!idClienteFinal) {
          try {
            const resCliente = await fetchAuth(`${API_BASE}/clientes`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                nombre: data.nombre || "",
                apellidos: data.apellidos || "",
                dni: clienteDni,
              }),
            });
            if (resCliente.ok) {
              const clienteCreado = await resCliente.json();
              idClienteFinal = clienteCreado.ID || clienteCreado.id;
              setClienteId(idClienteFinal);
            }
          } catch {}
        }
      }

      const body = {
        id_cliente: idClienteFinal || 0,
        total: totalVenta,
        descripcion: data.descripcion || "",
      };

      let idVenta = editandoVentaId;

      if (editandoVentaId) {
        // ===== ACTUALIZAR VENTA EXISTENTE =====
        const res = await fetchAuth(`${API_BASE}/ventas/${editandoVentaId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          toast.error("Error al actualizar venta");
          return;
        }

        // Eliminar detalles anteriores y recrear
        const resDetalles = await fetchAuth(`${API_BASE}/detalles-venta/venta/${editandoVentaId}`);
        if (resDetalles.ok) {
          const detallesAnteriores = await resDetalles.json();
          for (const det of (detallesAnteriores || [])) {
            await fetchAuth(`${API_BASE}/detalles-venta/${det.ID || det.id}`, { method: "DELETE" });
          }
        }

        // Eliminar modos de pago anteriores y recrear
        const resModos = await fetchAuth(`${API_BASE}/modos-pago/venta/${editandoVentaId}`);
        if (resModos.ok) {
          const modosAnteriores = await resModos.json();
          for (const mp of (modosAnteriores || [])) {
            await fetchAuth(`${API_BASE}/modos-pago/${mp.ID || mp.id}`, { method: "DELETE" });
          }
        }
      } else {
        // ===== CREAR VENTA NUEVA (endpoint transaccional con stock) =====
        const ventaCompletaBody = {
          id_cliente: idClienteFinal || 0,
          total: totalVenta,
          descripcion: data.descripcion || "",
          detalles: listaProductos.map((p) => ({
            id_producto: p.producto_id,
            cantidad: p.cantidad,
            precio_unitario: p.precio_venta,
            total: p.subtotal,
            descripcion: p.nombre || "",
          })),
          modos_pago: pagosAgregados.map((pago) => ({
            id_pago: pago.id_pago,
            monto: pago.monto,
            descripcion: pago.descripcion || "",
          })),
        };

        const res = await fetchAuth(`${API_BASE}/ventas/completa`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(ventaCompletaBody),
        });

        if (!res.ok) {
          const result = await res.json().catch(() => ({}));
          if (res.status === 409) {
            toast.error(result.error || "Stock insuficiente para uno o más productos");
          } else {
            toast.error(result.error || result.message || "Error al registrar venta");
          }
          return;
        }

        const ventaCreada = await res.json();
        idVenta = ventaCreada.id || ventaCreada.ID || ventaCreada.data?.ID || ventaCreada.data?.id;
      }

      if (editandoVentaId && idVenta) {
        // Solo recrear detalles y pagos al EDITAR (el endpoint completa ya los crea para nuevas)
        for (const p of listaProductos) {
          await fetchAuth(`${API_BASE}/detalles-venta`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id_venta: idVenta,
              id_producto: p.producto_id,
              cantidad: p.cantidad,
              precio_unitario: p.precio_venta,
              total: p.subtotal,
              descripcion: p.nombre || "",
            }),
          });
        }

        for (const pago of pagosAgregados) {
          await fetchAuth(`${API_BASE}/modos-pago`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id_reserva: null,
              id_venta: idVenta,
              id_pago: pago.id_pago,
              monto: pago.monto,
              descripcion: pago.descripcion || "",
            }),
          });
        }
      }

      toast.success(editandoVentaId ? "Venta actualizada exitosamente" : "Venta registrada exitosamente");

      // Imprimir ticket solo si es nueva
      if (!editandoVentaId) {
        imprimirTicketVenta({
          idVenta: idVenta || "—",
          clienteNombre,
          clienteDni,
          productos: listaProductos,
          pagos: pagosAgregados,
          total: totalVenta,
          fecha: new Date(),
        });
      }

      limpiarFormulario();
      fetchVentas();
      fetchProductos();
      fetchReservasParaStock();
    } catch {
      toast.error(editandoVentaId ? "Error actualizando venta" : "Error registrando venta");
    } finally {
      setSaving(false);
    }
  }

  function limpiarFormulario() {
    reset();
    setListaProductos([]);
    setPagosAgregados([]);
    setMontoRecibido("");
    setSearchNombre("");
    setBarcode("");
    setClienteId(null);
    setEditandoVentaId(null);
    // Limpiar datos persistidos en sessionStorage
    clearCarrito();
    clearPagos();
    clearMonto();
    clearClienteId();
    clearFormPersist();
  }

  // ==================== EDITAR VENTA ====================
  function cargarVentaParaEditar(venta) {
    // Guardar datos antes de limpiar
    const vId = venta.ID || venta.id;
    const clienteObj = venta.cliente || null;
    const idClienteDirecto = venta.id_cliente || 0;
    const detallesVenta = venta.detalles || [];
    const modosVenta = venta.modos_pago || [];
    const descripcionVenta = venta.descripcion || "";

    limpiarFormulario();
    setEditandoVentaId(vId);

    // Cargar datos del cliente
    if (clienteObj) {
      setValue("dni", clienteObj.dni || "");
      setValue("nombre", clienteObj.nombre || "");
      setValue("apellidos", clienteObj.apellidos || "");
      setClienteId(clienteObj.ID || clienteObj.id || idClienteDirecto);
    } else if (idClienteDirecto > 0) {
      setClienteId(idClienteDirecto);
    }
    setValue("descripcion", descripcionVenta);

    // Cargar productos desde detalles enriquecidos
    const productosLista = detallesVenta.map((d) => {
      const prod = d.producto || {};
      return {
        producto_id: d.id_producto || prod.ID || prod.id,
        nombre: prod.nombre || d.descripcion || "Producto",
        precio_venta: parseFloat(d.precio_unitario || 0),
        cantidad: d.cantidad || 1,
        subtotal: parseFloat(d.total || 0),
        imagen: prod.imagen || "",
        talla: prod.talla || "",
        color: prod.color || "",
        modelo: prod.modelo || "",
        codigo_barras: prod.codigo_de_barras || "",
      };
    });
    setListaProductos(productosLista);

    // Cargar modos de pago (con id único para poder removerlos)
    const pagos = modosVenta.map((mp, idx) => ({
      id: Date.now() + idx,
      id_pago: mp.id_pago,
      nombre: mp.nombre_metodo || "Efectivo",
      monto: parseFloat(mp.monto || 0),
      descripcion: mp.descripcion || "",
    }));
    setPagosAgregados(pagos);

    // Cambiar a pestaña nueva
    setPestanaActiva("nueva");
  }

  // ==================== ELIMINAR VENTA ====================
  function eliminarVenta(ventaId) {
    setMotivoAccion("");
    setConfirmModalData({
      titulo: "Eliminar Venta",
      mensaje: `¿Estás seguro de eliminar la venta #${ventaId}? Esta acción quedará registrada para auditoría.`,
      tipo: "danger",
      conMotivo: true,
      onConfirm: async (motivo) => {
        if (!motivo || !motivo.trim()) {
          toast.warning("Debes indicar el motivo de la eliminación");
          return;
        }
        setShowConfirmModal(false);
        setConfirmModalData(null);
        try {
          const res = await fetchAuth(`${API_BASE}/ventas/${ventaId}?motivo=${encodeURIComponent(motivo.trim())}`, { method: "DELETE" });
          if (res.ok) {
            toast.success("Venta eliminada exitosamente");
            fetchVentas();
            fetchProductos();
          } else {
            toast.error("Error al eliminar");
          }
        } catch {
          toast.error("Error eliminando venta");
        }
      },
    });
    setShowConfirmModal(true);
  }

  // ==================== IMPRIMIR ====================
  function imprimirTicket(venta) {
    const vId = venta.ID || venta.id;
    const fechaV = venta.fecha || venta.CreatedAt || "";
    const now = fechaV ? new Date(fechaV) : new Date();
    const clienteObj = venta.cliente || {};
    imprimirTicketVenta({
      idVenta: vId,
      clienteNombre: clienteObj.nombre ? `${clienteObj.nombre} ${clienteObj.apellidos || ""}`.trim() : "Sin especificar",
      clienteDni: clienteObj.dni || "",
      productos: (venta.detalles || []).map((d) => {
        const prod = d.producto || {};
        return {
          nombre: prod.nombre || d.descripcion || "Producto",
          color: prod.color || "",
          talla: prod.talla || "",
          precio_venta: d.precio_unitario || 0,
          cantidad: d.cantidad || 1,
          subtotal: d.total || 0,
        };
      }),
      pagos: (venta.modos_pago || []).map((p) => ({
        nombre: p.nombre_metodo || "Efectivo",
        monto: parseFloat(p.monto || 0),
      })),
      total: parseFloat(venta.total || 0),
      fecha: now,
    });
  }

  // ==================== FILTROS LISTA ====================
  const busquedaTextoActiva = !!(filtroBusqueda || filtroDni);
  const ventasFiltradas = ventas.filter((v) => {
    if (filtroDni) {
      const doc = (v.cliente?.dni || "").toLowerCase();
      if (!doc.includes(filtroDni.toLowerCase())) return false;
    }
    if (filtroBusqueda) {
      const q = filtroBusqueda.toLowerCase();
      const nombre = v.cliente ? `${v.cliente.nombre || ""} ${v.cliente.apellidos || ""}`.toLowerCase() : "";
      const id = String(v.ID || v.id || "");
      if (!nombre.includes(q) && !id.includes(q)) return false;
    }
    if (!busquedaTextoActiva) {
      const fechaV = (v.fecha || v.CreatedAt || "").split("T")[0];
      if (filtroFechaDesde && fechaV < filtroFechaDesde) return false;
      if (filtroFechaHasta && fechaV > filtroFechaHasta) return false;
    }
    return true;
  });

  // ==================== RENDER ====================
  return (
    <div className="p-2 min-h-screen bg-blue-50">
      {/* Header + Tabs */}
      <div className="bg-white rounded-t-lg shadow-md px-3 pt-3 pb-0 border-b-2 border-blue-600">
        <div className="flex justify-between items-end gap-2">
          <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2 text-gray-800 pb-2">
            <ShoppingCart size={24} /> VENTAS
          </h1>
          <div className="flex gap-1">
            <button
              onClick={() => { if (pestanaActiva !== "nueva") limpiarFormulario(); setPestanaActiva("nueva"); }}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold rounded-t-lg translate-y-[2px] transition-all ${
                pestanaActiva === "nueva"
                  ? "bg-blue-600 text-white border-t-2 border-l-2 border-r-2 border-blue-600"
                  : "bg-gray-100 text-gray-600 border-t-2 border-l-2 border-r-2 border-gray-200 hover:bg-gray-200 hover:text-gray-800"
              }`}
            >
              <Plus size={15} /> {editandoVentaId ? `EDITANDO #${editandoVentaId}` : "NUEVA VENTA"}
            </button>
            <button
              onClick={() => { setPestanaActiva("lista"); fetchVentas(); }}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold rounded-t-lg translate-y-[2px] transition-all ${
                pestanaActiva === "lista"
                  ? "bg-blue-600 text-white border-t-2 border-l-2 border-r-2 border-blue-600"
                  : "bg-gray-100 text-gray-600 border-t-2 border-l-2 border-r-2 border-gray-200 hover:bg-gray-200 hover:text-gray-800"
              }`}
            >
              <List size={15} /> LISTA DE VENTAS
            </button>
          </div>
        </div>
      </div>

      {/* ===== PESTAÑA NUEVA ===== */}
      {pestanaActiva === "nueva" && (
        <div className="space-y-3 pt-3">
          <form onSubmit={handleSubmit(onSubmitVenta)}>

            {/* --- DATOS DEL CLIENTE --- */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden mb-3">
              <div className="bg-blue-400 p-2">
                <span className="font-bold text-white text-sm flex items-center gap-1.5">
                  <User size={14} /> DATOS DEL CLIENTE
                </span>
              </div>
              <div className="p-2 bg-sky-50">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative w-full sm:w-[160px] sm:flex-shrink-0">
                    <label className="absolute -top-2 left-2 bg-sky-50 px-1 text-[10px] font-medium text-gray-700 z-10">
                      DNI <span className="text-orange-500">*</span>
                    </label>
                    <div className="flex gap-1">
                      <input
                        {...register("dni")}
                        type="text"
                        maxLength={8}
                        placeholder="12345678"
                        className="w-full border rounded px-1.5 py-1 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => buscarCliente(watch("dni"))}
                        disabled={loading}
                        className="bg-green-500 rounded px-1.5 py-1 text-[10px] text-white hover:bg-green-600 disabled:bg-gray-400 whitespace-nowrap font-bold"
                      >
                        BUSCAR
                      </button>
                    </div>
                  </div>
                  <div className="relative flex-1">
                    <label className="absolute -top-2 left-2 bg-sky-50 px-1 text-[10px] font-medium text-gray-700 z-10">
                      Nombre <span className="text-orange-500">*</span>
                    </label>
                    <input
                      {...register("nombre", { required: "Requerido" })}
                      type="text"
                      placeholder="Juan Carlos"
                      className="w-full border rounded px-1.5 py-1 text-xs"
                    />
                  </div>
                  <div className="relative flex-1">
                    <label className="absolute -top-2 left-2 bg-sky-50 px-1 text-[10px] font-medium text-gray-700 z-10">
                      Apellidos <span className="text-orange-500">*</span>
                    </label>
                    <input
                      {...register("apellidos", { required: "Requerido" })}
                      type="text"
                      placeholder="Pérez García"
                      className="w-full border rounded px-1.5 py-1 text-xs"
                    />
                  </div>
                  <div className="relative flex-1">
                    <label className="absolute -top-2 left-2 bg-sky-50 px-1 text-[10px] font-medium text-gray-700 z-10">
                      Descripción
                    </label>
                    <input
                      {...register("descripcion")}
                      type="text"
                      placeholder="Descripción adicional"
                      className="w-full border rounded px-1.5 py-1 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* --- PRODUCTOS Y PAGO (grid 3 columnas) --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
              {/* PANEL DE CONTROL */}
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-blue-400 p-2">
                  <h1 className="text-sm font-bold text-center text-white">REGISTRO DE PRODUCTOS</h1>
                </div>
                <div className="p-2 bg-sky-50 space-y-2">
                  {/* Buscar por nombre */}
                  <div className="relative">
                    <label className="absolute -top-2 left-3 bg-sky-50 px-1 text-xs font-medium text-gray-700 z-10">Buscar por nombre</label>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={searchNombre}
                        onChange={(e) => { setSearchNombre(e.target.value); buscarProductosPorNombre(e.target.value); }}
                        onFocus={() => searchNombre.length >= 2 && setShowSearchResults(true)}
                        placeholder="Escriba el nombre del producto"
                        className="w-full border rounded px-1.5 py-1 text-xs"
                      />
                      {searchNombre && (
                        <button type="button" onClick={() => { setSearchNombre(""); setProductosEncontrados([]); setShowSearchResults(false); }} className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs">✕</button>
                      )}
                    </div>
                    {showSearchResults && productosEncontrados.length > 0 && (
                      <div className="absolute z-20 w-full mt-1 bg-white border-2 border-blue-300 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                        {productosEncontrados.map((prod) => (
                          <div
                            key={prod.ID || prod.id}
                            onClick={() => agregarProductoALista(prod)}
                            className="p-2 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 flex items-center gap-2"
                          >
                            {prod.imagen && (
                              <img src={buildImageUrl(prod.imagen)} alt={prod.nombre} className="w-10 h-10 object-cover rounded border" />
                            )}
                            <div className="flex-1">
                              <div className="font-medium text-xs">{prod.nombre}</div>
                              <div className="text-xs text-blue-600 font-bold">S/ {Number(prod.precio_venta || 0).toFixed(2)}</div>
                              <div className="text-xs text-gray-400">
                                {prod.talla && <>Talla: {prod.talla}</>}
                                {prod.talla && prod.color && <> | </>}
                                {prod.color && <>Color: {prod.color}</>}
                              </div>
                              {prod.codigo_barras && <div className="text-xs text-gray-400">Código: {prod.codigo_barras}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Código de barras */}
                  <div className="relative">
                    <label className="absolute -top-2 left-3 bg-sky-50 px-1 text-xs font-medium text-gray-700 z-10">Código de Barras</label>
                    <div className="flex gap-1">
                      <input
                        ref={barcodeRef}
                        type="text"
                        value={barcode}
                        onChange={(e) => setBarcode(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); buscarProductoPorBarcode(barcode); } }}
                        placeholder="Escanee o digite"
                        className="w-full border rounded px-1.5 py-1 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => buscarProductoPorBarcode(barcode)}
                        disabled={!barcode}
                        className="bg-green-500 text-white rounded px-2 py-1 text-xs hover:bg-green-600 disabled:bg-gray-400 font-bold"
                      >
                        Agregar
                      </button>
                    </div>
                  </div>

                  {/* Total a pagar */}
                  <div className="flex justify-between items-center border border-gray-300 rounded px-2 py-1.5 mt-2">
                    <span className="font-bold text-gray-700 text-xs">TOTAL A PAGAR:</span>
                    <span className="text-sm font-bold text-blue-700">S/ {totalVenta.toFixed(2)}</span>
                  </div>

                  {/* Monto recibido */}
                  <div className="relative mt-2">
                    <label className="absolute -top-2 left-2 bg-white px-1 text-[10px] font-medium text-gray-600 z-10">
                      Monto Recibido <span className="text-gray-400">(opcional)</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={montoRecibido}
                      onChange={(e) => setMontoRecibido(e.target.value)}
                      placeholder={totalVenta.toFixed(2)}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs"
                    />
                    <p className="text-[10px] text-gray-400 mt-0.5 italic">Solo si el cliente paga más para recibir vuelto</p>
                  </div>

                  {/* Vuelto */}
                  <div className="flex justify-between items-center border border-gray-300 rounded px-2 py-1.5 mt-1">
                    <span className="font-bold text-gray-700 text-xs">VUELTO:</span>
                    <span className="text-sm font-bold text-green-600">S/ {vuelto.toFixed(2)}</span>
                  </div>

                  {/* Pagos registrados + botón cambiar */}
                  {pagosAgregados.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <p className="text-[10px] font-bold text-gray-500">Métodos de pago registrados:</p>
                      {pagosAgregados.map((pago) => (
                        <div key={pago.id} className="flex justify-between items-center text-xs bg-sky-50 p-1.5 rounded">
                          <span>{pago.nombre}: S/ {pago.monto.toFixed(2)}</span>
                          <button type="button" onClick={() => removerMetodoPago(pago.id)} className="text-red-400 hover:text-red-600 font-bold">✕</button>
                        </div>
                      ))}
                      <div className="flex justify-between font-bold text-xs pt-1 border-t">
                        <span>Total pagos:</span>
                        <span>S/ {totalPagos.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => { setPagosAgregados([]); setShowPagosModal(true); }}
                    disabled={totalVenta === 0}
                    className="w-full mt-1 px-2 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 text-xs font-bold flex items-center justify-center gap-1"
                  >
                    💳 {pagosAgregados.length > 0 ? "Cambiar Método de Pago" : "Agregar Método de Pago"}
                  </button>

                  {/* Botón registrar/actualizar venta */}
                  <button
                    type="submit"
                    disabled={saving || listaProductos.length === 0}
                    className={`w-full mt-2 py-2 bg-white border-2 font-bold rounded text-sm transition-colors flex items-center justify-center gap-2 disabled:bg-gray-100 disabled:border-gray-300 disabled:text-gray-400 ${editandoVentaId ? "border-amber-500 text-amber-700 hover:bg-amber-50" : "border-green-500 text-green-700 hover:bg-green-50"}`}
                  >
                    {saving ? "GUARDANDO..." : editandoVentaId ? `✏ ACTUALIZAR VENTA #${editandoVentaId}` : "☑ REGISTRAR VENTA"}
                  </button>
                  {editandoVentaId && (
                    <button
                      type="button"
                      onClick={limpiarFormulario}
                      className="w-full mt-1 py-1.5 bg-gray-100 border border-gray-300 text-gray-600 font-medium rounded text-xs hover:bg-gray-200 transition-colors"
                    >
                      Cancelar edición
                    </button>
                  )}
                </div>
              </div>

              {/* TABLA DE PRODUCTOS */}
              <div className="col-span-1 md:col-span-2 bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-blue-300 p-2">
                  <h2 className="text-sm font-bold text-center text-white">LISTA DE PRODUCTOS ({listaProductos.length})</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-blue-500 text-white text-xs">
                        <th className="p-2 text-center">#</th>
                        <th className="p-2 text-left">Producto</th>
                        <th className="p-2 text-center">Cant.</th>
                        <th className="p-2 text-right">P.Unit.</th>
                        <th className="p-2 text-right">Subtotal</th>
                        <th className="p-2 text-center">Acc.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listaProductos.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-gray-400">
                            <Package size={24} className="mx-auto mb-1 opacity-40" />
                            Sin productos. Busque o escanee para agregar.
                          </td>
                        </tr>
                      ) : (
                        listaProductos.map((item, idx) => {
                          const imgUrl = buildImageUrl(item.imagen);
                          return (
                            <tr key={item.producto_id} className="border-b last:border-none hover:bg-blue-50">
                              <td className="p-2">{idx + 1}</td>
                              <td className="p-2">
                                <div className="flex items-center gap-2">
                                  {item.imagen && (
                                    <img
                                      src={imgUrl}
                                      alt={item.nombre}
                                      className="w-6 h-6 object-cover rounded border cursor-pointer hover:ring-2 hover:ring-blue-400"
                                      onClick={() => setFotoAmpliada(imgUrl)}
                                      title="Clic para ampliar"
                                    />
                                  )}
                                  <div>
                                    <div className="font-medium text-xs">{item.nombre}</div>
                                    {(item.talla || item.modelo || item.color) && (
                                      <div className="text-[10px] text-gray-500">
                                        {item.talla && <>Talla: {item.talla}</>}
                                        {item.talla && (item.modelo || item.color) && <> | </>}
                                        {item.modelo && <>Mod: {item.modelo}</>}
                                        {item.modelo && item.color && <> | </>}
                                        {item.color && <>Color: {item.color}</>}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="p-2">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => actualizarCantidad(item.producto_id, item.cantidad - 1)}
                                    disabled={item.cantidad <= 1}
                                    className="w-5 h-5 flex items-center justify-center bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 text-xs font-bold"
                                  >-</button>
                                  <span className="w-6 text-center text-xs font-medium">{item.cantidad}</span>
                                  <button
                                    type="button"
                                    onClick={() => actualizarCantidad(item.producto_id, item.cantidad + 1)}
                                    className="w-5 h-5 flex items-center justify-center bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-xs font-bold"
                                  >+</button>
                                </div>
                              </td>
                              <td className="p-2 text-right text-xs">S/ {item.precio_venta.toFixed(2)}</td>
                              <td className="p-2 text-right font-bold text-xs">S/ {item.subtotal.toFixed(2)}</td>
                              <td className="p-2 text-center">
                                <button type="button" onClick={() => eliminarDeLista(item.producto_id)} className="text-red-500 hover:text-red-700" title="Eliminar">
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ===== PESTAÑA LISTA ===== */}
      {pestanaActiva === "lista" && (
        <div className="space-y-3 pt-3">
          {/* Filtros */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-3">
            <div className="bg-blue-400 p-2">
              <span className="font-bold text-white text-sm flex items-center gap-1.5"><Search size={14} /> LISTA DE VENTAS</span>
            </div>
            <div className="p-3 bg-sky-50 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-12 gap-3">
                {/* Desde */}
                <div className={`relative lg:col-span-2 ${busquedaTextoActiva ? "opacity-40 pointer-events-none" : ""}`}>
                  <label className="absolute -top-2 left-2 bg-sky-50 px-1 text-[10px] font-medium text-gray-700 z-10">Desde</label>
                  <input type="date" value={filtroFechaDesde} onChange={(e) => setFiltroFechaDesde(e.target.value)} disabled={busquedaTextoActiva} className="w-full border rounded px-2 py-1.5 text-xs" />
                </div>
                {/* Hasta */}
                <div className={`relative lg:col-span-2 ${busquedaTextoActiva ? "opacity-40 pointer-events-none" : ""}`}>
                  <label className="absolute -top-2 left-2 bg-sky-50 px-1 text-[10px] font-medium text-gray-700 z-10">Hasta</label>
                  <input type="date" value={filtroFechaHasta} onChange={(e) => setFiltroFechaHasta(e.target.value)} disabled={busquedaTextoActiva} className="w-full border rounded px-2 py-1.5 text-xs" />
                </div>
                {/* Buscar cliente */}
                <div className="relative lg:col-span-3">
                  <label className="absolute -top-2 left-2 bg-sky-50 px-1 text-[10px] font-medium text-gray-700 z-10">Buscar cliente</label>
                  <input type="text" placeholder="Nombre / ID..." value={filtroBusqueda} onChange={(e) => setFiltroBusqueda(e.target.value)} className={`w-full border rounded px-2 py-1.5 text-xs pr-7 ${filtroBusqueda.trim() ? "border-blue-500 bg-blue-50" : ""}`} />
                  {filtroBusqueda.trim() && (
                    <button onClick={() => setFiltroBusqueda("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm z-10" title="Limpiar">✕</button>
                  )}
                </div>
                {/* DNI */}
                <div className="relative lg:col-span-2">
                  <label className="absolute -top-2 left-2 bg-sky-50 px-1 text-[10px] font-medium text-gray-700 z-10">DNI Cliente</label>
                  <input type="text" placeholder="8 dígitos..." value={filtroDni} onChange={(e) => setFiltroDni(e.target.value)} maxLength={8} className={`w-full border rounded px-2 py-1.5 text-xs pr-7 ${filtroDni.trim() ? "border-blue-500 bg-blue-50" : ""}`} />
                  {filtroDni.trim() && (
                    <button onClick={() => setFiltroDni("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm" title="Limpiar">✕</button>
                  )}
                </div>
                {/* Botones */}
                <div className="flex items-end lg:col-span-3 gap-2">
                  <button type="button" onClick={fetchVentas} disabled={loading} className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-medium disabled:opacity-50">Buscar</button>
                  <button type="button" onClick={fetchVentas} disabled={loading} className="flex-1 px-3 py-1.5 bg-gray-600 text-white rounded hover:bg-gray-700 text-xs font-medium disabled:opacity-50">Actualizar</button>
                  <button
                    type="button"
                    onClick={() => {
                      const hoy = fechaLocalStr();
                      setFiltroFechaDesde(hoy);
                      setFiltroFechaHasta(hoy);
                      setFiltroBusqueda("");
                      setFiltroDni("");
                      fetchVentas();
                    }}
                    disabled={loading}
                    className="flex-1 px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-xs font-medium disabled:opacity-50"
                  >Hoy</button>
                </div>
              </div>

              {/* Resumen */}
              <div className="text-xs text-gray-500">
                Mostrando {ventasFiltradas.length} de {ventas.length} ventas
                {filtroBusqueda && ` | Búsqueda: "${filtroBusqueda}"`}
                {filtroDni && ` | DNI: ${filtroDni}`}
                {busquedaTextoActiva && " (sin filtro de fechas)"}
                {!busquedaTextoActiva && filtroFechaDesde && ` | Desde: ${filtroFechaDesde}`}
                {!busquedaTextoActiva && filtroFechaHasta && ` | Hasta: ${filtroFechaHasta}`}
              </div>
            </div>
          </div>

          {/* Tabla de ventas */}
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              Cargando...
            </div>
          ) : ventasFiltradas.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">No hay ventas que coincidan con los filtros</div>
          ) : (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-blue-400 text-white">
                    <tr>
                      <th className="px-2 py-2 text-left text-[10px] font-medium uppercase">#</th>
                      <th className="px-2 py-2 text-left text-[10px] font-medium uppercase">Fecha</th>
                      <th className="px-2 py-2 text-left text-[10px] font-medium uppercase">Cliente</th>
                      <th className="px-2 py-2 text-left text-[10px] font-medium uppercase">DNI</th>
                      <th className="px-2 py-2 text-right text-[10px] font-medium uppercase">Total</th>
                      <th className="px-2 py-2 text-center text-[10px] font-medium uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {ventasFiltradas.map((venta, idx) => {
                      const vId = venta.ID || venta.id;
                      const totalV = parseFloat(venta.total || 0);
                      const fechaV = venta.fecha || venta.CreatedAt || "";
                      return (
                        <tr key={vId} className={`${idx % 2 === 0 ? "bg-white" : "bg-blue-50/30"} hover:bg-blue-50 transition-colors`}>
                          <td className="px-2 py-2 font-bold text-gray-400">#{vId}</td>
                          <td className="px-2 py-2 whitespace-nowrap">
                            <span className="text-[10px]">{fechaV ? new Date(fechaV).toLocaleDateString() : "—"}</span>
                            <br />
                            <span className="text-[9px] text-gray-400">{fechaV ? new Date(fechaV).toLocaleTimeString() : ""}</span>
                          </td>
                          <td className="px-2 py-2 font-medium text-gray-800">{venta.cliente ? `${venta.cliente.nombre || ""} ${venta.cliente.apellidos || ""}`.trim() : "Sin especificar"}</td>
                          <td className="px-2 py-2 text-gray-500">{venta.cliente?.dni || "—"}</td>
                          <td className="px-2 py-2 text-right font-bold text-green-700">S/ {totalV.toFixed(2)}</td>
                          <td className="px-2 py-2">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => setVentaDetalle(venta)} className="p-1.5 bg-teal-500 hover:bg-teal-600 text-white rounded" title="Ver detalle">
                                <Eye size={12} />
                              </button>
                              <button onClick={() => cargarVentaParaEditar(venta)} className="p-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded" title="Editar">
                                <Pencil size={12} />
                              </button>
                              <button onClick={() => imprimirTicket(venta)} className="p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded" title="Imprimir">
                                <Printer size={12} />
                              </button>
                              <button onClick={() => eliminarVenta(vId)} className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded" title="Eliminar">
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Resumen inferior */}
              <div className="bg-blue-50 px-3 py-2 flex justify-between items-center border-t">
                <span className="text-xs text-gray-600">Ventas: {ventasFiltradas.length}</span>
                <span className="text-xs font-bold text-gray-800">Total: S/ {ventasFiltradas.reduce((sum, v) => sum + parseFloat(v.total || 0), 0).toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== MODAL DETALLE VENTA ===== */}
      {ventaDetalle && (() => {
        const vId = ventaDetalle.ID || ventaDetalle.id;
        const fechaV = ventaDetalle.fecha || ventaDetalle.CreatedAt || "";
        const detalles = ventaDetalle.detalles || [];
        const totalV = parseFloat(ventaDetalle.total || 0);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-4">
            <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
              <div className="bg-blue-400 px-4 py-2.5 flex justify-between items-center">
                <h3 className="text-sm font-bold text-white">Detalle de Venta #{vId}</h3>
                <button onClick={() => setVentaDetalle(null)} className="text-white/80 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 overflow-y-auto flex-1 space-y-3">
                {/* Info general */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-gray-500">Cliente:</span> <strong>{ventaDetalle.cliente ? `${ventaDetalle.cliente.nombre || ""} ${ventaDetalle.cliente.apellidos || ""}`.trim() : "Sin especificar"}</strong></div>
                  <div><span className="text-gray-500">DNI:</span> <strong>{ventaDetalle.cliente?.dni || "—"}</strong></div>
                  <div><span className="text-gray-500">Fecha:</span> <strong>{fechaV ? new Date(fechaV).toLocaleDateString() : "—"}</strong></div>
                  <div><span className="text-gray-500">Hora:</span> <strong>{fechaV ? new Date(fechaV).toLocaleTimeString() : "—"}</strong></div>
                </div>

                {/* Productos */}
                <div>
                  <p className="text-xs font-bold text-gray-700 mb-2">Productos ({detalles.length})</p>
                  <div className="space-y-2">
                    {detalles.map((d, idx) => {
                      const prod = d.producto || {};
                      const imagen = prod.imagen || d.imagen;
                      return (
                        <div key={idx} className="flex items-center gap-3 bg-sky-50 rounded-lg p-2 border border-blue-100">
                          {imagen ? (
                            <img
                              src={buildImageUrl(imagen)}
                              alt={prod.nombre || d.descripcion}
                              className="w-12 h-12 object-cover rounded border border-blue-300 flex-shrink-0 cursor-pointer hover:scale-110 transition-transform"
                              onClick={() => setFotoAmpliada(buildImageUrl(imagen))}
                            />
                          ) : (
                            <div className="w-12 h-12 bg-blue-100 rounded border border-blue-200 flex items-center justify-center flex-shrink-0">
                              <Package className="w-5 h-5 text-blue-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-xs text-gray-800 truncate">{prod.nombre || d.descripcion || "Producto"}</p>
                            <p className="text-[10px] text-gray-500">
                              {[prod.modelo && `M:${prod.modelo}`, prod.color, prod.talla && `T:${prod.talla}`].filter(Boolean).join(" | ")}
                            </p>
                            <p className="text-[10px] text-gray-500">{d.cantidad} x S/ {parseFloat(d.precio_unitario || 0).toFixed(2)}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-bold text-xs text-green-700">S/ {parseFloat(d.total || 0).toFixed(2)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Pagos */}
                {ventaDetalle.modos_pago && ventaDetalle.modos_pago.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gray-700 mb-1">Métodos de pago</p>
                    <div className="space-y-1">
                      {ventaDetalle.modos_pago.map((p, idx) => (
                        <div key={idx} className="flex justify-between text-xs bg-gray-50 p-1.5 rounded">
                          <span>{p.nombre_metodo || "—"}</span>
                          <span className="font-bold">S/ {parseFloat(p.monto || 0).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Total */}
                <div className="flex justify-between items-center bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <span className="font-bold text-sm text-gray-700">TOTAL:</span>
                  <span className="font-bold text-lg text-blue-700">S/ {totalV.toFixed(2)}</span>
                </div>
              </div>

              {/* Acciones del modal */}
              <div className="p-3 border-t flex gap-2">
                <button onClick={() => { imprimirTicket(ventaDetalle); }} className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-bold flex items-center justify-center gap-1">
                  <Printer size={14} /> Imprimir Ticket
                </button>
                <button onClick={() => setVentaDetalle(null)} className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded text-xs font-medium border hover:bg-gray-200">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ===== MODAL FOTO AMPLIADA ===== */}
      {fotoAmpliada && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4"
          onClick={() => setFotoAmpliada(null)}
        >
          <div className="relative max-w-lg max-h-[80vh]">
            <button
              onClick={() => setFotoAmpliada(null)}
              className="absolute -top-3 -right-3 bg-white rounded-full p-1 shadow-lg hover:bg-gray-100 z-10"
            >
              <X size={18} />
            </button>
            <img
              src={fotoAmpliada}
              alt="Foto ampliada"
              className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* ===== MODAL PAGOS ===== */}
      {showPagosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-4">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header azul */}
            <div className="bg-blue-400 px-4 py-2.5 flex justify-between items-center">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                💳 Registrar Método de Pago
              </h3>
              {faltaRegistrar <= 0 && (
                <button onClick={() => setShowPagosModal(false)} className="text-white/80 hover:text-white">
                  <X size={18} />
                </button>
              )}
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {/* Resumen */}
              <div className="bg-gray-50 rounded p-2.5 space-y-1 text-xs border">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total a pagar:</span>
                  <span className="font-bold text-blue-700">S/ {totalVenta.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Ya registrado:</span>
                  <span className="font-bold text-green-600">S/ {totalPagos.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-1 mt-1">
                  <span className="font-bold text-gray-800">Falta registrar:</span>
                  <span className={`font-bold ${faltaRegistrar > 0 ? "text-red-600" : "text-green-600"}`}>S/ {faltaRegistrar.toFixed(2)}</span>
                </div>
              </div>

              {/* Pagos registrados (lista acumulativa) */}
              {pagosAgregados.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-500 mb-1">Pagos registrados:</p>
                  <div className="space-y-1">
                    {pagosAgregados.map((pago) => (
                      <div key={pago.id} className="flex justify-between items-center text-xs bg-sky-50 p-1.5 rounded">
                        <span>{pago.nombre}{pago.descripcion ? ` - ${pago.descripcion}` : ""}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-green-700">S/ {pago.monto.toFixed(2)}</span>
                          <button type="button" onClick={() => removerMetodoPago(pago.id)} className="text-red-400 hover:text-red-600 font-bold">✕</button>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between font-bold text-xs pt-1 border-t">
                      <span>Total pagos:</span>
                      <span>S/ {totalPagos.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Formulario agregar (solo si falta registrar) */}
              {faltaRegistrar > 0 && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.target);
                    const metodo = metodoPago.find((m) => (m.ID || m.id) == formData.get("id_pago"));
                    if (metodo) {
                      agregarMetodoPago(metodo, formData.get("monto"), formData.get("descripcion"));
                      e.target.reset();
                    }
                  }}
                >
                  <div className="space-y-2">
                    <div className="relative">
                      <label className="absolute -top-2 left-2 bg-white px-1 text-[10px] font-medium text-gray-600 z-10">Método de Pago</label>
                      <select name="id_pago" required className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs">
                        <option value="">Seleccione método...</option>
                        {metodoPago.map((metodo) => (
                          <option key={metodo.ID || metodo.id} value={metodo.ID || metodo.id}>{metodo.nombre}</option>
                        ))}
                      </select>
                    </div>
                    <div className="relative">
                      <label className="absolute -top-2 left-2 bg-white px-1 text-[10px] font-medium text-gray-600 z-10">Monto</label>
                      <div className="flex gap-1">
                        <input type="number" name="monto" step="0.01" required placeholder="0.00" className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs" />
                        <button
                          type="button"
                          onClick={(e) => {
                            const input = e.target.closest("div").querySelector("input[name='monto']");
                            if (input) input.value = faltaRegistrar.toFixed(2);
                          }}
                          className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-xs font-bold whitespace-nowrap border border-blue-300"
                        >
                          Todo
                        </button>
                      </div>
                    </div>
                    <div className="relative">
                      <label className="absolute -top-2 left-2 bg-white px-1 text-[10px] font-medium text-gray-600 z-10">Descripción (opcional)</label>
                      <input type="text" name="descripcion" placeholder="N° operación, referencia, etc." className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs" />
                    </div>
                  </div>
                  <button type="submit" className="w-full mt-3 px-3 py-2 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700">
                    + Agregar Pago
                  </button>
                </form>
              )}

              {/* Mensaje de completado + botón cerrar */}
              {faltaRegistrar <= 0 && pagosAgregados.length > 0 && (
                <div className="text-center space-y-2">
                  <p className="text-xs text-green-600 font-bold">✓ Monto completado</p>
                  <button type="button" onClick={() => setShowPagosModal(false)} className="w-full px-3 py-2 bg-green-600 text-white rounded text-xs font-bold hover:bg-green-700">
                    Cerrar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL CONFIRMAR ELIMINAR ===== */}
      {showConfirmModal && confirmModalData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden">
            <div className={`p-4 ${confirmModalData.tipo === "danger" ? "bg-red-500" : "bg-blue-500"}`}>
              <h3 className="text-lg font-semibold text-white">{confirmModalData.titulo}</h3>
            </div>
            <div className="p-5">
              <p className="text-gray-700 text-sm mb-3 whitespace-pre-line">{confirmModalData.mensaje}</p>
              {confirmModalData.conMotivo && (
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Motivo (obligatorio):</label>
                  <textarea
                    value={motivoAccion}
                    onChange={(e) => setMotivoAccion(e.target.value)}
                    placeholder="Ej: Error de registro, cliente solicitó anulación..."
                    className="w-full border rounded px-2 py-1.5 text-xs resize-none focus:ring-2 focus:ring-red-300 focus:border-red-400"
                    rows={2}
                  />
                </div>
              )}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => { setShowConfirmModal(false); setConfirmModalData(null); }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => confirmModalData.onConfirm(motivoAccion)}
                  className="px-4 py-2 text-white rounded-lg font-medium text-sm bg-red-600 hover:bg-red-700"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
