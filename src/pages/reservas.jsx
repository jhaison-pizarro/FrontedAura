import React, { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import {
  Calendar,
  List,
  Plus,
  Package,
  Eye,
  Trash2,
  Clock,
  CheckCircle,
  Truck,
  RotateCcw,
  X,
  Edit,
  Printer,
  User,
  ChevronDown,
  ChevronUp,
  Camera,
  Upload,
  Search,
  Mic,
  AlertCircle,
} from "lucide-react";
import { fetchAuth } from "../funciones/auth";
import { fechaLocalStr, comprimirImagen, formatFechaDDMMYYYY } from "../funciones/funciones";
import { toast } from "sonner";
import {
  filtrarReservasActivas,
  calcularStockDisponiblePorFecha,
  calcularStockConsumidoEnListaLocal,
  buildMensajeDiaSiguiente,
} from "../funciones/stockDisponibilidad";
import VoiceMicButton from "../components/VoiceMicButton";
import { API_BASE_URL } from "../config";
import { buildImageUrl } from "../funciones/imageUtils";
import { useSucursal } from "../context/SucursalContext";
import { useSessionState, useFormPersist } from "../funciones/useSessionState";

const API_BASE = API_BASE_URL;

// Normalizar texto: sin acentos, sin mayúsculas, sin espacios extra
const norm = (str) => (str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export default function Reservas() {
  const { sucursalActual } = useSucursal();

  // ==================== PESTAÑAS ====================
  const [pestanaActiva, setPestanaActiva, clearPestana] = useSessionState("reservas_tab", "nueva");
  const [grabandoDireccion, setGrabandoDireccion] = useState(false);

  // ==================== DATOS ====================
  const [reservas, setReservas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [combos, setCombos] = useState([]);
  const [metodosPago, setMetodosPago] = useState([]);
  const [configEmpresa, setConfigEmpresa] = useState(null);
  const [todasLasReservas, setTodasLasReservas] = useState([]);
  const [loading, setLoading] = useState(false);

  // ==================== CLIENTE ====================
  const [clienteExistente, setClienteExistente, clearCliente] = useSessionState("reservas_cliente", null);
  const [imagenCliente, setImagenCliente] = useState(null);
  const [imagenClientePreview, setImagenClientePreview] = useState(null);
  const imagenClienteInputRef = useRef(null);
  const imagenClienteCamaraRef = useRef(null);

  // ==================== PRODUCTOS ====================
  const [productosSeleccionados, setProductosSeleccionados, clearProductos] = useSessionState("reservas_productos", []);
  const productosSeleccionadosRef = useRef([]);
  const [barcode, setBarcode] = useState("");
  const [searchNombre, setSearchNombre] = useState("");
  const [productosEncontrados, setProductosEncontrados] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [costoTotal, setCostoTotal] = useState(0);
  const [expandedCombo, setExpandedCombo] = useState(null);

  // ==================== COMBOS ====================
  const [showCombosModal, setShowCombosModal] = useState(false);
  const [showComboScanModal, setShowComboScanModal] = useState(false);
  const [comboActivo, setComboActivo] = useState(null);
  const [productosComboIngresados, setProductosComboIngresados] = useState([]);
  const [barcodeCombo, setBarcodeCombo] = useState("");
  const [searchProductoCombo, setSearchProductoCombo] = useState("");
  const [productosComboEncontrados, setProductosComboEncontrados] = useState([]);
  const [showProductoComboResults, setShowProductoComboResults] = useState(false);

  // ==================== PAGOS ====================
  const [pagosAgregados, setPagosAgregados, clearPagos] = useSessionState("reservas_pagos", []);
  const [adelanto, setAdelanto, clearAdelanto] = useSessionState("reservas_adelanto", 0);
  const [showPagosModal, setShowPagosModal] = useState(false);

  // ==================== EDICIÓN ====================
  const [editingId, setEditingId] = useState(null);

  // ==================== LISTA / FILTROS ====================
  const [filtroFechaDesde, setFiltroFechaDesde] = useState("");
  const [filtroFechaHasta, setFiltroFechaHasta] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroBusqueda, setFiltroBusqueda] = useState("");
  const [filtroDni, setFiltroDni] = useState("");
  const [reservaExpandida, setReservaExpandida] = useState(null);
  const [detalleExpandido, setDetalleExpandido] = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  // ==================== MODALES ====================
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalData, setConfirmModalData] = useState(null);
  const [motivoAccion, setMotivoAccion] = useState("");
  const [fotoAmpliada, setFotoAmpliada] = useState(null);
  const [showPagoCompletarModal, setShowPagoCompletarModal] = useState(false);
  const [pagoCompletarData, setPagoCompletarData] = useState(null);
  const [estadoDropdownId, setEstadoDropdownId] = useState(null);
  const [estadoDropdownPos, setEstadoDropdownPos] = useState({});

  // ==================== FORM ====================
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm({
    defaultValues: {
      dni: "",
      nombre: "",
      apellidos: "",
      telefono: "",
      correo: "",
      direccion: "",
      fechaEvento: "",
      estado: "reservado",
      descripcion: "",
    },
  });
  const { clearFormPersist } = useFormPersist("reservas_rhf", { watch, setValue });

  const fechaEvento = watch("fechaEvento");


  // ==================== EFFECTS ====================
  useEffect(() => {
    fetchData();
    const hoy = fechaLocalStr();
    setFiltroFechaDesde(hoy);
    setFiltroFechaHasta(hoy);
  }, []);

  useEffect(() => {
    productosSeleccionadosRef.current = productosSeleccionados;
  }, [productosSeleccionados]);

  useEffect(() => {
    const total = productosSeleccionados.reduce(
      (sum, item) =>
        sum +
        (item.tipo === "combo"
          ? Number(item.precio_oferta || 0)
          : Number(item.precio_alquiler || 0)) *
          (item.cantidad || 1),
      0,
    );
    setCostoTotal(total);
  }, [productosSeleccionados]);

  // Re-validar productos cuando cambia la fecha (igual que reservaGrupal)
  useEffect(() => {
    if (!fechaEvento || productosSeleccionados.length === 0) return;
    const timeout = setTimeout(() => {
      const validados = [];
      let huboEliminados = false;
      const mensajes = [];

      for (const item of productosSeleccionados) {
        if (item.tipo === "individual" && item.id_producto) {
          const consumidoLocal = calcularStockConsumidoEnListaLocal(
            item.nombre, productosSeleccionadosRef.current, item.id
          );
          const disp = calcularStockDisponiblePorFecha(
            item.id_producto, item.stock || 0, fechaEvento, todasLasReservas, editingId
          );
          const maxDisp = disp.stockDisponible - consumidoLocal;
          if (maxDisp <= 0) {
            huboEliminados = true;
            mensajes.push(`"${item.nombre}" eliminado: no disponible para ${fechaEvento}`);
            continue;
          }
          if ((item.cantidad || 1) > maxDisp) {
            mensajes.push(`"${item.nombre}" ajustado a ${maxDisp} unidades`);
            validados.push({ ...item, cantidad: maxDisp });
            continue;
          }
        }
        validados.push(item);
      }

      if (huboEliminados || validados.length !== productosSeleccionados.length) {
        setProductosSeleccionados(validados);
      }
      if (mensajes.length > 0) {
        mostrarAlertaStock(mensajes.join("\n"), huboEliminados ? "error" : "warning");
      }
    }, 500);
    return () => clearTimeout(timeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaEvento]);

  // Listener voz (llenado de cliente)
  useEffect(() => {
    const handleVoiceClientFill = async (e) => {
      const data = e.detail;
      if (!data) return;
      const campos = [
        { key: "dni" }, { key: "nombre" }, { key: "apellidos" },
        { key: "telefono" }, { key: "correo" }, { key: "direccion" },
        { key: "descripcion" }, { key: "fechaEvento" }, { key: "estado" },
      ];
      for (const campo of campos) {
        if (data[campo.key] !== undefined && data[campo.key] !== "") {
          setValue(campo.key, String(data[campo.key]));
          const el = document.querySelector(`[name="${campo.key}"]`);
          if (el) {
            el.classList.add("voice-filling");
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
          await new Promise((r) => setTimeout(r, 250));
          if (el) el.classList.remove("voice-filling");
        }
      }
      if (data.dni && /^[0-9]{8}$/.test(data.dni)) {
        const keysEnviados = Object.keys(data).filter((k) => data[k] !== undefined && data[k] !== "");
        if (!(keysEnviados.length === 1 && keysEnviados[0] === "dni")) {
          setTimeout(() => buscarCliente(data.dni), 400);
        }
      }
    };
    window.addEventListener("voice:fill-client-form", handleVoiceClientFill);
    return () => window.removeEventListener("voice:fill-client-form", handleVoiceClientFill);
  }, [setValue]);

  // ==================== HELPERS ====================
  const mostrarAlertaStock = (mensaje, tipo = "warning") => {
    setConfirmModalData({
      titulo: tipo === "error" ? "Stock No Disponible" : "Advertencia de Stock",
      mensaje,
      tipo: tipo === "error" ? "danger" : "warning",
      soloAceptar: true,
    });
    setShowConfirmModal(true);
  };

  function fechaInputToISO(f) {
    if (!f) return null;
    return `${f}T00:00:00Z`;
  }

  function calcularStockConsumidoEnLista(nombreProducto, excluirItemId = null) {
    return calcularStockConsumidoEnListaLocal(
      nombreProducto, productosSeleccionadosRef.current, excluirItemId
    );
  }

  // ==================== FETCH ====================
  async function fetchData() {
    setLoading(true);
    try {
      await Promise.all([
        fetchReservas(),
        fetchProductos(),
        fetchCombos(),
        fetchMetodosPago(),
        fetchTodasLasReservas(),
        fetchConfigEmpresa(),
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchReservas() {
    try {
      const res = await fetchAuth(`${API_BASE}/reservas`);
      if (res.ok) {
        const data = await res.json();
        setReservas(data || []);
      }
    } catch (err) {}
  }

  async function fetchProductos() {
    try {
      const res = await fetchAuth(`${API_BASE}/productos`);
      if (res.ok) setProductos(await res.json() || []);
    } catch (err) {}
  }

  async function fetchCombos() {
    try {
      const res = await fetchAuth(`${API_BASE}/combos`);
      if (res.ok) {
        const data = await res.json();
        setCombos(data.combos || data || []);
      }
    } catch (err) {}
  }

  async function fetchMetodosPago() {
    try {
      const res = await fetchAuth(`${API_BASE}/pagos`);
      if (res.ok) setMetodosPago(await res.json() || []);
    } catch (err) {}
  }

  async function fetchTodasLasReservas() {
    try {
      const res = await fetchAuth(`${API_BASE}/reservas?incluir_grupales=true`);
      if (res.ok) {
        const data = await res.json();
        const filtradas = filtrarReservasActivas(data);
        setTodasLasReservas(filtradas);
        return filtradas;
      }
    } catch (err) {}
    return todasLasReservas;
  }

  async function fetchConfigEmpresa() {
    try {
      const res = await fetchAuth(`${API_BASE}/configuracion`);
      if (res.ok) setConfigEmpresa(await res.json());
    } catch (err) {}
  }

  async function fetchDetalleReserva(reservaId) {
    setLoadingDetalle(true);
    try {
      const res = await fetchAuth(`${API_BASE}/reservas/${reservaId}`);
      if (res.ok) {
        const data = await res.json();
        setDetalleExpandido(data);
      }
    } catch (err) {
      toast.error("Error al cargar detalle");
    } finally {
      setLoadingDetalle(false);
    }
  }

  // ==================== CLIENTE ====================
  async function buscarClienteEnBD(dni) {
    if (!dni || !/^[0-9]{8}$/.test(dni)) {
      toast.warning("El DNI debe tener 8 dígitos numéricos");
      return false;
    }
    setLoading(true);
    try {
      const res = await fetchAuth(`${API_BASE}/clientes`);
      const clientes = await res.json();
      const cliente = clientes.find((c) => c.dni === dni);
      if (cliente) {
        setClienteExistente(cliente);
        setValue("nombre", cliente.nombre || "");
        setValue("apellidos", cliente.apellidos || "");
        setValue("telefono", cliente.telefono || "");
        setValue("correo", cliente.correo || "");
        setValue("direccion", cliente.direccion || "");
        toast.success(`Cliente encontrado: ${cliente.nombre} ${cliente.apellidos}`);
        return true;
      } else {
        toast.info("Cliente no encontrado en BD");
        return false;
      }
    } catch (err) {
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function consultaReniec(dni) {
    if (!dni || !/^[0-9]{8}$/.test(dni)) {
      toast.warning("El DNI debe tener 8 dígitos");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("https://apiperu.dev/api/dni", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_DNI_API_TOKEN}`,
        },
        body: JSON.stringify({ dni }),
      });
      const result = await res.json();
      if (result.success && result.data) {
        setValue("nombre", result.data.nombres || "");
        setValue(
          "apellidos",
          `${result.data.apellido_paterno || ""} ${result.data.apellido_materno || ""}`.trim(),
        );
        setClienteExistente(null);
        toast.success("Datos obtenidos de RENIEC");
      } else {
        toast.info("No se encontraron datos en RENIEC");
      }
    } catch (err) {
      toast.error("Error al consultar RENIEC");
    } finally {
      setLoading(false);
    }
  }

  async function buscarCliente(dni) {
    const encontrado = await buscarClienteEnBD(dni);
    if (!encontrado) {
      toast.info("Buscando en RENIEC...");
      await consultaReniec(dni);
    }
  }

  function handleImagenClienteChange(e) {
    const file = e.target.files && e.target.files[0];
    if (file) {
      setImagenCliente(file);
      setImagenClientePreview(URL.createObjectURL(file));
    }
  }

  // ==================== PRODUCTOS ====================
  async function agregarProductoPorCodigo(codigo) {
    if (!codigo.trim()) return;
    if (!fechaEvento) {
      toast.warning("Debe seleccionar la fecha del evento antes de agregar productos");
      setBarcode("");
      return;
    }
    try {
      setLoading(true);
      const reservasFrescas = await fetchTodasLasReservas();
      const res = await fetchAuth(`${API_BASE}/productos/codigo/${codigo}`);
      if (!res.ok) {
        toast.info("Producto no encontrado");
        setBarcode("");
        return;
      }
      const producto = await res.json();

      if (productosSeleccionados.some((p) => p.codigo_barras === codigo)) {
        toast.warning("El producto ya está en la lista");
        setBarcode("");
        return;
      }

      const stockActual = producto.stock || 0;
      const disp = calcularStockDisponiblePorFecha(
        producto.ID || producto.id, stockActual, fechaEvento, reservasFrescas, editingId
      );
      const stockOriginal = disp.stockOriginal || stockActual;

      if (stockOriginal <= 0) {
        mostrarAlertaStock(`"${producto.nombre}" no tiene stock disponible`);
        setBarcode("");
        return;
      }
      if (!disp.disponible) {
        mostrarAlertaStock(
          `"${producto.nombre}" no disponible para ${fechaEvento}.\nStock: ${stockOriginal}, reservado esa fecha: ${disp.unidadesReservadas}`,
          "error"
        );
        setBarcode("");
        return;
      }
      const yaConsumido = calcularStockConsumidoEnLista(producto.nombre);
      if (disp.stockDisponible - yaConsumido <= 0) {
        mostrarAlertaStock(
          `"${producto.nombre}" sin stock disponible.\nDisponible: ${disp.stockDisponible}, ya en lista: ${yaConsumido}`,
          "error"
        );
        setBarcode("");
        return;
      }

      // Alerta de reservas del día siguiente
      if (disp.reservasDiaSiguiente && disp.reservasDiaSiguiente.length > 0) {
        mostrarAlertaStock(buildMensajeDiaSiguiente(producto.nombre, disp.reservasDiaSiguiente), "warning");
      }

      setProductosSeleccionados((prev) => [
        ...prev,
        {
          id: `prod-${producto.ID || producto.id}-${Date.now()}`,
          id_producto: producto.ID || producto.id,
          codigo_barras: codigo,
          nombre: producto.nombre,
          imagen: producto.imagen,
          precio_alquiler: Number(producto.precio_alquiler || 0),
          stock: stockOriginal,
          talla: producto.talla || "",
          modelo: producto.modelo || "",
          color: producto.color || "",
          tipo: "individual",
          cantidad: 1,
        },
      ]);
      setBarcode("");
    } catch (err) {
      toast.error("Error al buscar el producto");
    } finally {
      setLoading(false);
    }
  }

  async function buscarProductosPorNombre(nombre) {
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

  async function agregarProductoDesdeNombre(producto) {
    if (!fechaEvento) {
      toast.warning("Debe seleccionar la fecha del evento antes de agregar productos");
      return;
    }
    const reservasFrescas = await fetchTodasLasReservas();
    const productoId = producto.ID || producto.id;

    if (productosSeleccionados.some((p) => p.id_producto === productoId)) {
      toast.warning("El producto ya está en la lista");
      return;
    }

    const stockActual = producto.stock || 0;
    const disp = calcularStockDisponiblePorFecha(
      productoId, stockActual, fechaEvento, reservasFrescas, editingId
    );
    const stockOriginal = disp.stockOriginal || stockActual;

    if (stockOriginal <= 0) {
      mostrarAlertaStock(`"${producto.nombre}" no tiene stock disponible`);
      return;
    }
    if (!disp.disponible) {
      toast.error(`"${producto.nombre}" no disponible para ${fechaEvento}. Stock: ${stockOriginal}, reservado: ${disp.unidadesReservadas}`);
      return;
    }
    const yaConsumido = calcularStockConsumidoEnLista(producto.nombre);
    if (disp.stockDisponible - yaConsumido <= 0) {
      toast.error(`"${producto.nombre}" sin stock. Disponible: ${disp.stockDisponible}, ya en lista: ${yaConsumido}`);
      return;
    }

    // Alerta de reservas del día siguiente
    if (disp.reservasDiaSiguiente && disp.reservasDiaSiguiente.length > 0) {
      mostrarAlertaStock(buildMensajeDiaSiguiente(producto.nombre, disp.reservasDiaSiguiente), "warning");
    }

    setProductosSeleccionados((prev) => [
      ...prev,
      {
        id: `prod-${productoId}-${Date.now()}`,
        id_producto: productoId,
        codigo_barras: producto.codigo_barras || `temp-${productoId}`,
        nombre: producto.nombre,
        imagen: producto.imagen,
        precio_alquiler: Number(producto.precio_alquiler || 0),
        stock: stockOriginal,
        talla: producto.talla || "",
        modelo: producto.modelo || "",
        color: producto.color || "",
        tipo: "individual",
        cantidad: 1,
      },
    ]);
    setSearchNombre("");
    setProductosEncontrados([]);
    setShowSearchResults(false);
  }

  function actualizarCantidad(productId, nuevaCantidad) {
    const cantidad = parseInt(nuevaCantidad) || 1;
    setProductosSeleccionados((prev) =>
      prev.map((item) => {
        if (item.id !== productId) return item;
        if (cantidad < 1) return { ...item, cantidad: 1 };

        if (item.tipo === "combo") {
          if (item.productos_escaneados?.length > 0) {
            for (const prod of item.productos_escaneados) {
              const consumidoPorOtros = calcularStockConsumidoEnLista(prod.nombre, item.id);
              let stockMax = (prod.stock || 0) - consumidoPorOtros;
              if (fechaEvento && prod.id_producto) {
                const d = calcularStockDisponiblePorFecha(
                  prod.id_producto, prod.stock || 0, fechaEvento, todasLasReservas, editingId
                );
                stockMax = d.stockDisponible - consumidoPorOtros;
              }
              if (cantidad > stockMax) {
                toast.warning(`Stock insuficiente. "${prod.nombre}" disponible: ${Math.max(0, stockMax)}`);
                return { ...item, cantidad: Math.max(1, stockMax) };
              }
            }
          }
          return { ...item, cantidad };
        }

        const consumidoPorOtros = calcularStockConsumidoEnLista(item.nombre, item.id);
        let stockMax = (item.stock || 1) - consumidoPorOtros;
        if (fechaEvento && item.id_producto) {
          const d = calcularStockDisponiblePorFecha(
            item.id_producto, item.stock || 0, fechaEvento, todasLasReservas, editingId
          );
          stockMax = d.stockDisponible - consumidoPorOtros;
        }
        if (cantidad > stockMax) {
          mostrarAlertaStock(`Stock insuficiente. "${item.nombre}" disponible: ${Math.max(0, stockMax)}`);
          return { ...item, cantidad: Math.max(1, stockMax) };
        }
        return { ...item, cantidad };
      })
    );
  }

  function removerProducto(productId) {
    setProductosSeleccionados((prev) => prev.filter((p) => p.id !== productId));
  }

  // ==================== COMBOS ====================
  function agregarCombo(combo) {
    if (productosSeleccionados.some((p) => p.id === `combo-${combo.ID || combo.id}`)) {
      toast.warning("Este combo ya está en la lista");
      return;
    }
    setComboActivo(combo);
    setProductosComboIngresados([]);
    setShowCombosModal(false);
    setShowComboScanModal(true);
  }

  async function agregarProductoAlCombo(codigo) {
    if (!codigo.trim() || !comboActivo) return;
    try {
      setLoading(true);
      const reservasFrescas = await fetchTodasLasReservas();
      const res = await fetchAuth(`${API_BASE}/productos/codigo/${codigo}`);
      if (!res.ok) {
        toast.info("Producto no encontrado");
        setBarcodeCombo("");
        return;
      }
      const producto = await res.json();
      const productosDelCombo = comboActivo.productos || [];
      const esDelCombo = productosDelCombo.some(
        (p) => norm(p.nombre) === norm(producto.nombre)
      );
      if (!esDelCombo) {
        toast.warning(`"${producto.nombre}" no pertenece a este combo`);
        setBarcodeCombo("");
        return;
      }
      if (productosComboIngresados.some((p) => norm(p.nombre) === norm(producto.nombre))) {
        toast.warning(`Ya se escaneó "${producto.nombre}" para este combo`);
        setBarcodeCombo("");
        return;
      }
      const stockActual = producto.stock || 0;
      const disp = fechaEvento
        ? calcularStockDisponiblePorFecha(producto.ID || producto.id, stockActual, fechaEvento, reservasFrescas, editingId)
        : null;
      const stockOriginal = disp?.stockOriginal || stockActual;
      const yaConsumido = calcularStockConsumidoEnLista(producto.nombre);

      if (stockOriginal <= 0) {
        mostrarAlertaStock(`"${producto.nombre}" no tiene stock disponible`, "error");
        setBarcodeCombo("");
        return;
      }
      if (disp && disp.stockDisponible - yaConsumido <= 0) {
        mostrarAlertaStock(
          `"${producto.nombre}" no disponible para ${fechaEvento}.\nStock: ${stockOriginal}, reservado: ${disp.unidadesReservadas}, en lista: ${yaConsumido}`,
          "error"
        );
        setBarcodeCombo("");
        return;
      }

      setProductosComboIngresados((prev) => [
        ...prev,
        {
          id: `combo-prod-${Date.now()}-${Math.random()}`,
          id_producto: producto.ID || producto.id,
          codigo_barras: codigo,
          nombre: producto.nombre,
          talla: producto.talla || "",
          modelo: producto.modelo || "",
          color: producto.color || "",
          stock: stockOriginal,
          imagen: producto.imagen,
          tipo: "combo-producto",
        },
      ]);
      setBarcodeCombo("");
    } catch (err) {
      toast.error("Error al buscar producto");
    } finally {
      setLoading(false);
    }
  }

  async function agregarProductoComboDesdeNombre(producto) {
    if (!comboActivo) return;
    const reservasFrescas = await fetchTodasLasReservas();

    if (productosComboIngresados.some((p) => norm(p.nombre) === norm(producto.nombre))) {
      toast.warning(`Ya se escaneó "${producto.nombre}" para este combo`);
      return;
    }
    const productosDelCombo = comboActivo.productos || [];
    const esDelCombo = productosDelCombo.some(
      (p) => norm(p.nombre) === norm(producto.nombre)
    );
    if (!esDelCombo) {
      toast.warning(`"${producto.nombre}" no pertenece a este combo`);
      return;
    }

    const stockActual = producto.stock || 0;
    const disp = fechaEvento
      ? calcularStockDisponiblePorFecha(producto.ID || producto.id, stockActual, fechaEvento, reservasFrescas, editingId)
      : null;
    const stockOriginal = disp?.stockOriginal || stockActual;
    const yaConsumido = calcularStockConsumidoEnLista(producto.nombre);

    if (stockOriginal <= 0) {
      mostrarAlertaStock(`"${producto.nombre}" no tiene stock disponible`, "error");
      return;
    }
    if (disp && disp.stockDisponible - yaConsumido <= 0) {
      mostrarAlertaStock(
        `"${producto.nombre}" no disponible para ${fechaEvento}.\nStock: ${stockOriginal}, reservado: ${disp.unidadesReservadas}`,
        "error"
      );
      return;
    }

    setProductosComboIngresados((prev) => [
      ...prev,
      {
        id: `combo-prod-${Date.now()}-${Math.random()}`,
        id_producto: producto.ID || producto.id,
        codigo_barras: producto.codigo_barras || "",
        nombre: producto.nombre,
        talla: producto.talla || "",
        modelo: producto.modelo || "",
        color: producto.color || "",
        stock: stockOriginal,
        imagen: producto.imagen,
        tipo: "combo-producto",
      },
    ]);
    setSearchProductoCombo("");
    setProductosComboEncontrados([]);
    setShowProductoComboResults(false);
    toast.success(`${producto.nombre} agregado al combo`);
  }

  function buscarProductosParaCombo(termino) {
    if (!termino.trim() || !comboActivo) {
      setProductosComboEncontrados([]);
      setShowProductoComboResults(false);
      return;
    }
    const terminoLower = termino.toLowerCase();
    const productosDelCombo = comboActivo.productos || [];
    const resultados = productosDelCombo
      .filter((p) => {
        const yaEscaneado = productosComboIngresados.some(
          (pi) => pi.nombre.toLowerCase() === p.nombre.toLowerCase()
        );
        return !yaEscaneado && p.nombre.toLowerCase().includes(terminoLower);
      })
      .sort((a, b) => {
        const aS = a.nombre.toLowerCase().startsWith(terminoLower);
        const bS = b.nombre.toLowerCase().startsWith(terminoLower);
        if (aS && !bS) return -1;
        if (!aS && bS) return 1;
        return a.nombre.localeCompare(b.nombre);
      });
    setProductosComboEncontrados(resultados);
    setShowProductoComboResults(true);
  }

  function finalizarCombo() {
    const productosDelCombo = comboActivo.productos || [];
    const productosFaltantes = productosDelCombo.filter(
      (p) => !productosComboIngresados.some(
        (pi) => pi.nombre.toLowerCase() === p.nombre.toLowerCase()
      )
    );

    const agregarComboFinalizado = () => {
      setProductosSeleccionados((prev) => [
        ...prev,
        {
          id: `combo-${comboActivo.ID || comboActivo.id}-${Date.now()}`,
          id_combo: comboActivo.ID || comboActivo.id,
          nombre: comboActivo.nombre,
          precio_oferta: Number(comboActivo.precio_oferta || 0),
          tipo: "combo",
          cantidad: 1,
          productos_escaneados: [...productosComboIngresados],
        },
      ]);
      setExpandedCombo(null);
      setShowComboScanModal(false);
      setComboActivo(null);
      setProductosComboIngresados([]);
      setBarcodeCombo("");
    };

    if (productosFaltantes.length > 0) {
      const nombres = productosFaltantes.map((p) => p.nombre).join(", ");
      setConfirmModalData({
        titulo: "Productos Faltantes",
        mensaje: `Faltan por escanear: ${nombres}\n\n¿Agregar el combo de todos modos?`,
        tipo: "warning",
        soloAceptar: false,
        onConfirm: () => {
          setShowConfirmModal(false);
          setConfirmModalData(null);
          agregarComboFinalizado();
        },
      });
      setShowConfirmModal(true);
    } else {
      agregarComboFinalizado();
    }
  }

  // ==================== PAGOS ====================
  function agregarMetodoPago(metodoPago, monto, descripcion) {
    if (!monto || monto <= 0) {
      toast.warning("El monto debe ser mayor a 0");
      return;
    }
    const totalPagos = pagosAgregados.reduce((sum, p) => sum + p.monto, 0);
    if (totalPagos + parseFloat(monto) > adelanto) {
      toast.warning("El total de pagos no puede exceder el adelanto");
      return;
    }
    setPagosAgregados((prev) => [
      ...prev,
      {
        id: Date.now(),
        id_pago: metodoPago.ID || metodoPago.id,
        nombre: metodoPago.nombre,
        monto: parseFloat(monto),
        descripcion: descripcion || "",
      },
    ]);
  }

  function removerMetodoPago(pagoId) {
    setPagosAgregados((prev) => prev.filter((p) => p.id !== pagoId));
  }

  // ==================== GUARDAR ====================
  const onSubmitReserva = async (data) => {
    const nombreCompleto = `${data.nombre || ""} ${data.apellidos || ""}`.trim();
    if (!nombreCompleto) {
      toast.warning("Debe ingresar el nombre del cliente");
      return;
    }
    if (!data.fechaEvento) {
      toast.warning("Debe seleccionar la fecha del evento");
      return;
    }
    if (productosSeleccionados.length === 0) {
      toast.warning("Debe agregar al menos un producto o combo");
      return;
    }
    if (!adelanto || adelanto <= 0) {
      toast.warning("El adelanto debe ser mayor a 0 para registrar la reserva");
      return;
    }
    if (adelanto > 0 && pagosAgregados.length === 0) {
      toast.warning("Debe agregar al menos un método de pago para el adelanto");
      return;
    }
    if (adelanto > 0) {
      const totalPagos = pagosAgregados.reduce((sum, p) => sum + p.monto, 0);
      if (Math.abs(totalPagos - adelanto) > 0.01) {
        toast.warning("El total de pagos debe ser igual al adelanto");
        return;
      }
    }

    try {
      setLoading(true);

      // Validación final de stock
      if (data.fechaEvento) {
        const [resReservasFrescas, resProductosFrescos] = await Promise.all([
          fetchAuth(`${API_BASE}/reservas?incluir_grupales=true`),
          fetchAuth(`${API_BASE}/productos`),
        ]);
        const reservasFrescas = resReservasFrescas.ok
          ? filtrarReservasActivas(await resReservasFrescas.json())
          : [];
        const productosFrescos = resProductosFrescos.ok ? await resProductosFrescos.json() : [];

        const consumoPorProducto = {};
        for (const item of productosSeleccionados) {
          if (item.tipo !== "individual") continue;
          const key = item.id_producto;
          consumoPorProducto[key] = (consumoPorProducto[key] || 0) + (item.cantidad || 1);
        }

        const problemasStock = [];
        for (const [idProd, cant] of Object.entries(consumoPorProducto)) {
          const idProducto = parseInt(idProd);
          const prodFresco = productosFrescos.find((p) => (p.ID || p.id) === idProducto);
          if (!prodFresco) continue;
          const disp = calcularStockDisponiblePorFecha(
            idProducto, prodFresco.stock || 0, data.fechaEvento, reservasFrescas, editingId
          );
          if (cant > disp.stockDisponible) {
            problemasStock.push(`"${prodFresco.nombre}": necesitas ${cant}, disponible: ${disp.stockDisponible}`);
          }
        }
        if (problemasStock.length > 0) {
          mostrarAlertaStock(`Stock insuficiente para ${data.fechaEvento}:\n${problemasStock.join("\n")}`, "error");
          setLoading(false);
          return;
        }
      }

      // Crear o reutilizar cliente
      let idCliente;
      if (clienteExistente) {
        idCliente = clienteExistente.ID || clienteExistente.id;
        // Actualizar datos si cambiaron (incluye campos que ventas pudo no tener)
        const datosActualizar = {};
        if (data.nombre && data.nombre !== (clienteExistente.nombre || "")) datosActualizar.nombre = data.nombre;
        if (data.apellidos && data.apellidos !== (clienteExistente.apellidos || "")) datosActualizar.apellidos = data.apellidos;
        if (data.telefono && data.telefono !== (clienteExistente.telefono || "")) datosActualizar.telefono = data.telefono;
        if (data.correo && data.correo !== (clienteExistente.correo || "")) datosActualizar.correo = data.correo;
        if (data.direccion && data.direccion !== (clienteExistente.direccion || "")) datosActualizar.direccion = data.direccion;
        if (Object.keys(datosActualizar).length > 0 || imagenCliente) {
          if (imagenCliente) {
            const formData = new FormData();
            Object.entries(datosActualizar).forEach(([k, v]) => formData.append(k, v));
            formData.append("imagen", await comprimirImagen(imagenCliente));
            await fetchAuth(`${API_BASE}/clientes/${idCliente}`, { method: "PUT", body: formData });
          } else if (Object.keys(datosActualizar).length > 0) {
            await fetchAuth(`${API_BASE}/clientes/${idCliente}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(datosActualizar),
            });
          }
        }
      } else {
        // Verificar si ya existe por DNI antes de crear
        if (data.dni) {
          const resClientes = await fetchAuth(`${API_BASE}/clientes`);
          const clientes = await resClientes.json();
          const clienteExisteBD = clientes.find((c) => c.dni === data.dni);
          if (clienteExisteBD) {
            idCliente = clienteExisteBD.ID || clienteExisteBD.id;
          }
        }

        if (!idCliente) {
          let resCliente;
          if (imagenCliente) {
            const formData = new FormData();
            formData.append("nombre", data.nombre);
            formData.append("apellidos", data.apellidos || "");
            formData.append("dni", data.dni || "");
            formData.append("telefono", data.telefono || "");
            formData.append("correo", data.correo || "");
            formData.append("direccion", data.direccion || "");
            formData.append("imagen", await comprimirImagen(imagenCliente));
            resCliente = await fetchAuth(`${API_BASE}/clientes`, { method: "POST", body: formData });
          } else {
            resCliente = await fetchAuth(`${API_BASE}/clientes`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                nombre: data.nombre,
                apellidos: data.apellidos || "",
                dni: data.dni || "",
                telefono: data.telefono || "",
                correo: data.correo || "",
                direccion: data.direccion || "",
              }),
            });
          }
          if (!resCliente.ok) throw new Error("Error al crear cliente");
          const clienteCreado = await resCliente.json();
          idCliente = clienteCreado.ID || clienteCreado.id;
        }
      }

      const reservaData = {
        id_cliente: idCliente,
        id_empleado: 1,
        id_pago: pagosAgregados[0]?.id_pago || 1,
        fecha_evento: fechaInputToISO(data.fechaEvento),
        descripcion: data.descripcion || "",
        adelanto: adelanto,
        estado: data.estado,
        total: costoTotal,
      };

      let idReserva;

      if (editingId) {
        // EDICIÓN: actualizar header
        const resUpdate = await fetchAuth(`${API_BASE}/reservas/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reservaData),
        });
        if (!resUpdate.ok) throw new Error("Error al actualizar reserva");
        idReserva = editingId;

        // Eliminar detalles anteriores (y sus combo-detalles)
        const resDetallesAnt = await fetchAuth(`${API_BASE}/detalles-reserva/reserva/${editingId}`);
        if (resDetallesAnt.ok) {
          const detallesAnt = await resDetallesAnt.json();
          for (const det of (detallesAnt || [])) {
            const detId = det.ID || det.id;
            // Si es combo, eliminar sus detalles-combo primero
            if (det.id_combo || det.IdCombo) {
              try {
                const resCombosDet = await fetchAuth(`${API_BASE}/detalles-combo-reserva/detalle/${detId}`);
                if (resCombosDet.ok) {
                  const combosDet = await resCombosDet.json();
                  for (const cd of (combosDet || [])) {
                    await fetchAuth(`${API_BASE}/detalles-combo-reserva/${cd.ID || cd.id}`, { method: "DELETE" });
                  }
                }
              } catch {}
            }
            await fetchAuth(`${API_BASE}/detalles-reserva/${detId}`, { method: "DELETE" });
          }
        }

        // Recrear detalles con los datos actuales
        for (const item of productosSeleccionados) {
          const precioUnit = item.tipo === "combo" ? item.precio_oferta : item.precio_alquiler;
          const cantidad = item.cantidad || 1;
          const detalleRes = await fetchAuth(`${API_BASE}/detalles-reserva`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id_reserva: idReserva,
              id_producto: item.tipo === "individual" ? item.id_producto : null,
              id_combo: item.tipo === "combo" ? item.id_combo : null,
              cantidad,
              precio_unitario: precioUnit,
              total: precioUnit * cantidad,
              descripcion: "",
            }),
          });

          if (item.tipo === "combo" && item.productos_escaneados) {
            const detalleCreado = await detalleRes.json();
            const idDetalle = detalleCreado.ID || detalleCreado.id;
            for (const prod of item.productos_escaneados) {
              await fetchAuth(`${API_BASE}/detalles-combo-reserva`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  id_detalle_reserva: idDetalle,
                  id_producto: prod.id_producto,
                  cantidad: 1,
                  descripcion: "",
                }),
              });
            }
          }
        }

        // Eliminar modos de pago anteriores y recrear
        try {
          const resModosAnt = await fetchAuth(`${API_BASE}/modos-pago/reserva/${editingId}`);
          if (resModosAnt.ok) {
            const modosAnt = await resModosAnt.json();
            for (const mp of (modosAnt || [])) {
              await fetchAuth(`${API_BASE}/modos-pago/${mp.ID || mp.id}`, { method: "DELETE" });
            }
          }
        } catch {}

        for (const pago of pagosAgregados) {
          await fetchAuth(`${API_BASE}/modos-pago`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id_reserva: idReserva,
              id_venta: null,
              id_pago: pago.id_pago,
              monto: pago.monto,
              descripcion: pago.descripcion || "",
            }),
          });
        }

        toast.success("Reserva actualizada exitosamente");
      } else {
        // CREACIÓN
        const resReserva = await fetchAuth(`${API_BASE}/reservas`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reservaData),
        });
        if (!resReserva.ok) throw new Error("Error al crear reserva");
        const reservaCreada = await resReserva.json();
        idReserva = reservaCreada.ID || reservaCreada.id;

        // Crear detalles
        for (const item of productosSeleccionados) {
          const precioUnit = item.tipo === "combo" ? item.precio_oferta : item.precio_alquiler;
          const cantidad = item.cantidad || 1;
          const detalleRes = await fetchAuth(`${API_BASE}/detalles-reserva`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id_reserva: idReserva,
              id_producto: item.tipo === "individual" ? item.id_producto : null,
              id_combo: item.tipo === "combo" ? item.id_combo : null,
              cantidad,
              precio_unitario: precioUnit,
              total: precioUnit * cantidad,
              descripcion: "",
            }),
          });

          // Si es combo, crear detalle_combo_reserva por cada producto escaneado
          if (item.tipo === "combo" && item.productos_escaneados) {
            const detalleCreado = await detalleRes.json();
            const idDetalle = detalleCreado.ID || detalleCreado.id;
            for (const prod of item.productos_escaneados) {
              await fetchAuth(`${API_BASE}/detalles-combo-reserva`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  id_detalle_reserva: idDetalle,
                  id_producto: prod.id_producto,
                  cantidad: 1,
                  descripcion: "",
                }),
              });
            }
          }
        }

        // Crear modos de pago
        for (const pago of pagosAgregados) {
          await fetchAuth(`${API_BASE}/modos-pago`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id_reserva: idReserva,
              id_venta: null,
              id_pago: pago.id_pago,
              monto: pago.monto,
              descripcion: pago.descripcion || "",
            }),
          });
        }

        toast.success("Reserva registrada exitosamente");

        // Imprimir ticket automáticamente al crear
        const reservaParaTicket = {
          ID: idReserva,
          id_cliente: idCliente,
          fecha_evento: data.fechaEvento,
          estado: data.estado || "reservado",
          total: costoTotal,
          adelanto: adelanto,
          descripcion: data.descripcion || "",
          cliente: {
            nombre: data.nombre || "",
            apellidos: data.apellidos || "",
            dni: data.dni || "",
            telefono: data.telefono || "",
          },
          detalles: productosSeleccionados.map((item) => {
            if (item.tipo === "combo") {
              return {
                cantidad: item.cantidad || 1,
                total: (item.precio_oferta || 0) * (item.cantidad || 1),
                combo: { nombre: item.nombre },
                productos_del_combo: (item.productos_escaneados || []).map((pe) => ({
                  nombre: pe.nombre || "",
                  talla: pe.talla || "",
                  modelo: pe.modelo || "",
                  color: pe.color || "",
                })),
              };
            }
            return {
              cantidad: item.cantidad || 1,
              precio_unitario: item.precio_alquiler || 0,
              total: (item.precio_alquiler || 0) * (item.cantidad || 1),
              producto: {
                nombre: item.nombre || "",
                talla: item.talla || "",
                modelo: item.modelo || "",
                color: item.color || "",
              },
            };
          }),
        };
        imprimirTicket(reservaParaTicket);
      }

      limpiarFormulario();
      await Promise.all([fetchReservas(), fetchTodasLasReservas()]);
      setPestanaActiva("lista");
    } catch (err) {
      toast.error(err.message || "Error al guardar la reserva");
    } finally {
      setLoading(false);
    }
  };

  function limpiarFormulario() {
    reset();
    setClienteExistente(null);
    setImagenCliente(null);
    setImagenClientePreview(null);
    setProductosSeleccionados([]);
    setPagosAgregados([]);
    setAdelanto(0);
    setCostoTotal(0);
    setBarcode("");
    setSearchNombre("");
    setProductosEncontrados([]);
    setShowSearchResults(false);
    setEditingId(null);
    // Limpiar datos persistidos en sessionStorage
    clearCliente();
    clearProductos();
    clearPagos();
    clearAdelanto();
    clearFormPersist();
  }

  // ==================== CARGAR RESERVA PARA EDITAR ====================
  async function abrirEditModal(reserva) {
    limpiarFormulario();

    const rId = reserva.ID || reserva.id;
    setEditingId(rId);
    setPestanaActiva("nueva");
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Fetch completo de la reserva (detalles enriquecidos + modos de pago + cliente)
    try {
      const res = await fetchAuth(`${API_BASE}/reservas/${rId}`);
      if (!res.ok) throw new Error("Error al cargar reserva");
      const data = await res.json();

      const reservaData = data.reserva || data;
      const cliente = data.cliente || reservaData.cliente || reservaData.Cliente || {};
      const detalles = data.detalles || reservaData.detalles || [];
      const modosPagoRaw = data.modos_pago || reservaData.modos_pago || [];

      // Cargar datos del cliente
      setValue("dni", cliente.dni || cliente.DNI || "");
      setValue("nombre", cliente.nombre || cliente.Nombre || "");
      setValue("apellidos", cliente.apellidos || cliente.Apellidos || "");
      setValue("telefono", cliente.telefono || cliente.Telefono || "");
      setValue("correo", cliente.correo || cliente.Correo || "");
      setValue("direccion", cliente.direccion || cliente.Direccion || "");
      setClienteExistente(cliente);
      if (cliente.imagen) {
        setImagenClientePreview(buildImageUrl(cliente.imagen));
      }

      // Cargar fecha y estado (usar split para evitar desfase de timezone)
      const fechaRaw = reservaData.fecha_evento || reservaData.FechaEvento || reservaData.fecha_reserva || "";
      if (fechaRaw) {
        const fechaStr = String(fechaRaw).split("T")[0];
        if (/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
          setValue("fechaEvento", fechaStr);
        } else {
          const d = new Date(fechaRaw);
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          const dd = String(d.getDate()).padStart(2, "0");
          setValue("fechaEvento", `${yyyy}-${mm}-${dd}`);
        }
      }
      setValue("estado", reservaData.estado || "reservado");
      setValue("descripcion", reservaData.descripcion || reservaData.Descripcion || "");

      // Cargar adelanto
      setAdelanto(parseFloat(reservaData.adelanto || 0));

      // Cargar productos desde detalles enriquecidos
      const productosLista = detalles.map((det) => {
        const prod = det.producto || {};
        const combo = det.combo || {};
        const esCombo = !!(det.id_combo || det.IdCombo);

        if (esCombo) {
          return {
            id: `combo-${det.id_combo || combo.ID || combo.id}-${Date.now()}-${Math.random()}`,
            id_combo: det.id_combo || combo.ID || combo.id,
            nombre: combo.nombre || det.descripcion || "Combo",
            precio_oferta: parseFloat(det.precio_unitario || 0),
            tipo: "combo",
            cantidad: det.cantidad || 1,
            productos_escaneados: det.productos_del_combo || combo.productos || [],
          };
        }

        return {
          id: `prod-${det.id_producto || prod.ID || prod.id}-${Date.now()}-${Math.random()}`,
          id_producto: det.id_producto || prod.ID || prod.id,
          codigo_barras: prod.codigo_de_barras || prod.codigo_barras || "",
          nombre: prod.nombre || det.descripcion || "Producto",
          imagen: prod.imagen || "",
          precio_alquiler: parseFloat(det.precio_unitario || 0),
          stock: prod.stock || 0,
          talla: prod.talla || "",
          modelo: prod.modelo || "",
          color: prod.color || "",
          tipo: "individual",
          cantidad: det.cantidad || 1,
        };
      });
      setProductosSeleccionados(productosLista);

      // Calcular costo total
      setCostoTotal(parseFloat(reservaData.total || 0));

      // Cargar pagos existentes con formato compatible al formulario
      let pagos = [];
      if (modosPagoRaw && modosPagoRaw.length > 0) {
        pagos = modosPagoRaw.map((mp, idx) => ({
          id: mp.ID || mp.id || Date.now() + idx,
          id_pago: mp.id_pago || mp.IdPago,
          nombre: mp.nombre_metodo || mp.NombreMetodo || mp.nombre || "Método de pago",
          monto: parseFloat(mp.monto || 0),
          descripcion: mp.descripcion || "",
        }));
      } else if (parseFloat(reservaData.adelanto || 0) > 0) {
        // Fallback: reconstruir pago desde los datos de la reserva
        const idPagoReserva = reservaData.id_pago || reservaData.IdPago;
        const metodoEncontrado = metodosPago.find((m) => (m.ID || m.id) === idPagoReserva);
        pagos = [{
          id: Date.now(),
          id_pago: idPagoReserva,
          nombre: metodoEncontrado?.nombre || metodoEncontrado?.Nombre || "Método de pago",
          monto: parseFloat(reservaData.adelanto || 0),
          descripcion: "",
        }];
      }
      setPagosAgregados(pagos);
    } catch (error) {
      toast.error("Error al cargar los datos de la reserva");
      setEditingId(null);
    }
  }


  // ==================== CAMBIAR ESTADO CON CONFIRMACIÓN ====================
  async function cambiarEstadoReserva(reservaId, nuevoEstado) {
    const reserva = reservas.find((r) => (r.ID || r.id) === reservaId);
    if (!reserva) return;

    const cliente = reserva.cliente || reserva.Cliente || {};
    const nombreCliente = `${cliente.nombre || cliente.Nombre || ""} ${cliente.apellidos || cliente.Apellidos || ""}`.trim() || `Reserva #${reservaId}`;
    const estadoActual = (reserva.estado || "reservado").toUpperCase();

    // No permitir retroceder estados
    const secuencia = ["reservado", "listo", "entregado", "devuelto"];
    const idxActual = secuencia.indexOf((reserva.estado || "reservado").toLowerCase());
    const idxNuevo = secuencia.indexOf(nuevoEstado);
    if (idxNuevo <= idxActual) {
      toast.warning("No se puede retroceder a un estado anterior");
      return;
    }

    // Si cambia a "entregado": verificar reservas del día siguiente
    if (nuevoEstado === "entregado") {
      const reservasFrescas = await fetchTodasLasReservas();
      const detalles = reserva.detalles || reserva.Detalles || [];
      const fechaReserva = reserva.fecha_evento || reserva.FechaEvento || reserva.fecha_reserva || reserva.FechaReserva || "";
      const alertasDiaSiguiente = [];

      for (const det of detalles) {
        const idProd = det.id_producto || det.IdProducto || det.producto_id;
        const nombreProd = det.producto?.nombre || det.nombre || det.descripcion || "Producto";
        const stockProd = det.producto?.stock ?? 0;
        if (!idProd || !fechaReserva) continue;

        const disp = calcularStockDisponiblePorFecha(idProd, stockProd, fechaReserva, reservasFrescas, reservaId);
        if (disp.reservasDiaSiguiente && disp.reservasDiaSiguiente.length > 0) {
          alertasDiaSiguiente.push(buildMensajeDiaSiguiente(nombreProd, disp.reservasDiaSiguiente));
        }
      }

      if (alertasDiaSiguiente.length > 0) {
        mostrarAlertaStock(alertasDiaSiguiente.join("\n\n"), "warning");
      }

      // Verificar pago completo
      const total = parseFloat(reserva.total || 0);
      const adelantoActual = parseFloat(reserva.adelanto || 0);
      const saldo = total - adelantoActual;

      if (saldo > 0.01) {
        const efectivo = metodosPago.find(
          (m) => (m.nombre || m.Nombre || "").toLowerCase().includes("efectivo")
        );
        setPagoCompletarData({
          reservaId,
          clienteNombre: nombreCliente,
          total,
          adelanto: adelantoActual,
          saldo,
          metodoPagoId: efectivo ? String(efectivo.ID || efectivo.id) : "",
          descripcion: "Pago restante al entregar",
          reservaData: reserva,
        });
        setShowPagoCompletarModal(true);
        return;
      }
    }

    // Confirmación normal para otros cambios de estado
    setConfirmModalData({
      titulo: "Cambiar Estado de Reserva",
      mensaje: `¿Está seguro de cambiar el estado de "${nombreCliente}" de "${estadoActual}" a "${nuevoEstado.toUpperCase()}"?`,
      tipo: "info",
      onConfirm: async () => {
        setShowConfirmModal(false);
        setConfirmModalData(null);
        try {
          const response = await fetchAuth(`${API_BASE}/reservas/${reservaId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...reserva,
              estado: nuevoEstado,
            }),
          });
          if (!response.ok) throw new Error("Error");
          toast.success(`Estado cambiado a: ${nuevoEstado.toUpperCase()}`);
          await fetchReservas();
        } catch (error) {
          toast.error("Error al cambiar estado");
        }
      },
    });
    setShowConfirmModal(true);
  }

  // ==================== COMPLETAR PAGO Y ENTREGAR ====================
  async function completarPagoYEntregarReserva() {
    if (!pagoCompletarData) return;
    const { reservaId, saldo, metodoPagoId, reservaData } = pagoCompletarData;
    const montoAPagar = pagoCompletarData.monto ?? saldo;

    if (!metodoPagoId) {
      toast.warning("Seleccione un método de pago");
      return;
    }

    try {
      setLoading(true);

      // 1. Crear registro de pago
      const pagoRes = await fetchAuth(`${API_BASE}/modos-pago`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_reserva: reservaId,
          id_pago: parseInt(metodoPagoId),
          monto: montoAPagar,
          descripcion: "Pago restante al entregar",
        }),
      });
      if (!pagoRes.ok) throw new Error("Error al registrar pago");

      // 2. Actualizar reserva: adelanto + monto pagado, estado = entregado
      const resUpdate = await fetchAuth(`${API_BASE}/reservas/${reservaId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...reservaData,
          adelanto: parseFloat(reservaData.adelanto || 0) + montoAPagar,
          estado: "entregado",
        }),
      });
      if (!resUpdate.ok) throw new Error("Error al actualizar reserva");

      toast.success("Pago registrado y estado cambiado a ENTREGADO");
      setShowPagoCompletarModal(false);
      setPagoCompletarData(null);
      await fetchReservas();
    } catch (error) {
      toast.error("Error al completar el pago");
    } finally {
      setLoading(false);
    }
  }

  // ==================== ELIMINAR ====================
  function confirmarEliminar(reservaId) {
    setMotivoAccion("");
    setConfirmModalData({
      titulo: "Eliminar Reserva",
      mensaje: `¿Está seguro de eliminar la reserva #${reservaId}? Esta acción quedará registrada para auditoría.`,
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
          setLoading(true);
          const res = await fetchAuth(`${API_BASE}/reservas/${reservaId}?motivo=${encodeURIComponent(motivo.trim())}`, { method: "DELETE" });
          if (res.ok) {
            toast.success("Reserva eliminada exitosamente");
            await fetchReservas();
            if (reservaExpandida === reservaId) setReservaExpandida(null);
          } else {
            toast.error("Error al eliminar");
          }
        } catch (err) {
          toast.error("Error al eliminar");
        } finally {
          setLoading(false);
        }
      },
    });
    setShowConfirmModal(true);
  }

  // ==================== IMPRIMIR ====================
  function imprimirTicket(reserva) {
    const config = configEmpresa || {};
    const cliente = detalleExpandido?.cliente || reserva.cliente || reserva.Cliente || {};
    const clienteNombre = `${cliente.nombre || cliente.Nombre || "N/A"} ${cliente.apellidos || cliente.Apellidos || ""}`.trim();
    const clienteDni = cliente.dni || cliente.DNI || "N/A";
    const detalles = detalleExpandido?.detalles || reserva.detalles || [];

    const contenido = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Ticket Reserva</title>
  <style>
    * { color: #000 !important; margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: 68mm auto; margin: 0; }
    body { font-family: 'Calibri'; font-size: 12px; width: 65mm; max-width: 65mm; margin: 0 auto; padding: 2mm 3mm; word-break: break-word; line-height: 1.3; }
    .center { text-align: center; }
    .line { border-top: 1px dashed #000; margin: 4px 0; }
    .row { display: flex; justify-content: space-between; margin: 2px 0; }
    h2 { font-size: 14px; font-weight: bold; margin: 5px 0; }
    .empresa-nombre { font-size: 15px; font-weight: bold; text-transform: uppercase; }
    .empresa-info { font-size: 11px; }
    .producto { padding: 3px 0; border-bottom: 1px dotted #000; }
    @media print { html, body { width: 65mm; margin: 0; padding: 1mm 2mm; } }
  </style>
</head>
<body>
  <div class="center">
    <div class="empresa-nombre">${config.nombre_empresa || "MI EMPRESA"}</div>
    ${config.razon_social ? `<div class="empresa-info">${config.razon_social}</div>` : ""}
    ${config.ruc ? `<div class="empresa-info">RUC: ${config.ruc}</div>` : ""}
    ${sucursalActual?.nombre ? `<div class="empresa-info">Sucursal: ${sucursalActual.nombre}</div>` : ""}
    ${sucursalActual?.direccion ? `<div class="empresa-info">${sucursalActual.direccion}</div>` : ""}
  </div>
  <div class="line"></div>
  <div class="center"><h2>RESERVA INDIVIDUAL</h2><div style="font-size:10px;">N° ${reserva.ID || reserva.id}</div></div>
  <div class="line"></div>
  <div><strong>CLIENTE:</strong></div>
  <div>${clienteNombre}</div>
  <div class="row"><span>DNI:</span><span>${clienteDni}</span></div>
  ${cliente.telefono ? `<div class="row"><span>Tel:</span><span>${cliente.telefono}</span></div>` : ""}
  <div class="line"></div>
  <div class="row"><span>FECHA EVENTO:</span><span>${formatFechaDDMMYYYY(reserva.fecha_evento || reserva.FechaEvento)}</span></div>
  <div class="row"><span>ESTADO:</span><span>${(reserva.estado || "reservado").toUpperCase()}</span></div>
  <div class="line"></div>
  <div class="center"><strong>PRODUCTOS/SERVICIOS</strong></div>
  ${detalles.length > 0 ? detalles.map((det) => {
    const prod = det.producto || det.Producto || {};
    const combo = det.combo || det.Combo || null;
    const esCombo = !!combo;
    const prodsCombo = det.productos_del_combo || det.ProductosDelCombo || [];
    if (esCombo) {
      return `<div class="producto">
        <div><strong>COMBO: ${combo.nombre || "Combo"} x${det.cantidad || 1} — S/ ${parseFloat(det.total || 0).toFixed(2)}</strong></div>
        ${prodsCombo.map((pc) => {
          const attr = [pc.talla ? "T:" + pc.talla : "", pc.modelo ? "M:" + pc.modelo : "", pc.color ? "C:" + pc.color : ""].filter(Boolean).join(" | ");
          return `<div style="font-size:10px;padding-left:5px;">· ${pc.nombre || ""}${attr ? " (" + attr + ")" : ""}</div>`;
        }).join("")}
      </div>`;
    }
    const nombre = prod.nombre || prod.Nombre || "Producto";
    const talla = prod.talla || ""; const modelo = prod.modelo || ""; const color = prod.color || "";
    const attr = [talla ? "T:" + talla : "", modelo ? "M:" + modelo : "", color ? "C:" + color : ""].filter(Boolean).join(" | ");
    return `<div class="producto">
      <div class="row"><span>${nombre} x${det.cantidad || 1}</span><span>S/ ${parseFloat(det.total || 0).toFixed(2)}</span></div>
      ${attr ? `<div style="font-size:10px;">${attr}</div>` : ""}
    </div>`;
  }).join("") : "<div>Sin productos registrados</div>"}
  <div class="line"></div>
  <div class="row"><strong>TOTAL:</strong><strong>S/ ${parseFloat(reserva.total || 0).toFixed(2)}</strong></div>
  <div class="row"><span>Adelanto:</span><span>S/ ${parseFloat(reserva.adelanto || 0).toFixed(2)}</span></div>
  <div class="row"><strong>SALDO:</strong><strong>S/ ${(parseFloat(reserva.total || 0) - parseFloat(reserva.adelanto || 0)).toFixed(2)}</strong></div>
  <div class="line"></div>
  <div class="center">
    ${config.lema ? `<div style="font-style:italic;font-size:10px;">"${config.lema}"</div>` : ""}
    <p>¡Gracias por su preferencia!</p>
    <div style="font-size:9px;">Impreso: ${new Date().toLocaleString("es-PE")}</div>
  </div>
  ${sucursalActual?.regla_clientes ? `<div style="font-size:10px;text-align:justify;margin-top:8px;padding-top:5px;border-top:1px dashed #000;">${sucursalActual.regla_clientes}</div>` : ""}
</body>
</html>`;

    const ventana = window.open("", "_blank", "width=400,height=600");
    ventana.document.write(contenido);
    ventana.document.close();
    ventana.onload = () => ventana.print();
  }

  // ==================== FILTROS LISTA ====================
  const busquedaTextoActiva = !!(filtroBusqueda || filtroDni);
  const reservasFiltradas = reservas.filter((r) => {
    if (filtroEstado !== "todos" && (r.estado || "").toLowerCase() !== filtroEstado) return false;
    const cliente = r.cliente || r.Cliente || {};
    if (filtroDni) {
      const dniCliente = (cliente.dni || "").toLowerCase();
      if (!dniCliente.includes(filtroDni.toLowerCase())) return false;
    }
    if (filtroBusqueda) {
      const q = filtroBusqueda.toLowerCase();
      const nombreCliente = `${cliente.nombre || ""} ${cliente.apellidos || ""}`.toLowerCase();
      const dni = (cliente.dni || "").toLowerCase();
      const id = String(r.ID || r.id || "");
      if (!nombreCliente.includes(q) && !dni.includes(q) && !id.includes(q)) return false;
    }
    if (!busquedaTextoActiva) {
      const fechaR = (r.fecha_evento || r.FechaEvento || "").split("T")[0];
      if (filtroFechaDesde && fechaR < filtroFechaDesde) return false;
      if (filtroFechaHasta && fechaR > filtroFechaHasta) return false;
    }
    return true;
  });

  // ==================== BADGE ESTADO ====================
  function getEstadoBadge(estado) {
    const e = (estado || "").toLowerCase();
    const badges = {
      reservado: { bg: "bg-blue-100", text: "text-blue-700", icon: Clock },
      listo: { bg: "bg-teal-100", text: "text-teal-700", icon: CheckCircle },
      entregado: { bg: "bg-teal-100", text: "text-teal-700", icon: Truck },
      devuelto: { bg: "bg-blue-100", text: "text-blue-700", icon: RotateCcw },
    };
    return badges[e] || badges.reservado;
  }

  // ==================== VOICE CONTEXT ====================
  const getClientFormContext = useCallback(() => {
    return {
      formulario: "registrar_cliente",
      campos: {
        dni: watch("dni") || "",
        nombre: watch("nombre") || "",
        apellidos: watch("apellidos") || "",
        telefono: watch("telefono") || "",
        direccion: watch("direccion") || "",
        correo: watch("correo") || "",
        descripcion: watch("descripcion") || "",
        fechaEvento: watch("fechaEvento") || "",
        estado: watch("estado") || "reservado",
      },
    };
  }, [watch]);

  // ==================== RENDER ====================
  return (
    <div className="p-2 min-h-screen bg-blue-50">
      {/* ===== HEADER CON TABS ===== */}
      <div className="bg-white rounded-t-lg shadow-md px-3 pt-3 pb-0 border-b-2 border-blue-600">
        <div className="flex justify-between items-end gap-2">
          <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2 text-gray-800 pb-2">
            <Calendar size={24} /> RESERVAS INDIVIDUALES
          </h1>
          <div className="flex gap-1">
            <button
              onClick={() => setPestanaActiva("nueva")}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold rounded-t-lg translate-y-[2px] transition-all ${
                pestanaActiva === "nueva"
                  ? "bg-blue-600 text-white border-t-2 border-l-2 border-r-2 border-blue-600"
                  : "bg-gray-100 text-gray-600 border-t-2 border-l-2 border-r-2 border-gray-200 hover:bg-gray-200 hover:text-gray-800"
              }`}
            >
              <Plus size={15} /> NUEVA RESERVA
            </button>
            <button
              onClick={() => { setPestanaActiva("lista"); fetchReservas(); fetchTodasLasReservas(); }}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold rounded-t-lg translate-y-[2px] transition-all ${
                pestanaActiva === "lista"
                  ? "bg-blue-600 text-white border-t-2 border-l-2 border-r-2 border-blue-600"
                  : "bg-gray-100 text-gray-600 border-t-2 border-l-2 border-r-2 border-gray-200 hover:bg-gray-200 hover:text-gray-800"
              }`}
            >
              <List size={15} /> LISTA DE RESERVAS
            </button>
          </div>
        </div>
      </div>

      {/* ===== PESTAÑA NUEVA ===== */}
      {pestanaActiva === "nueva" && (
        <div className="space-y-3 pt-3">
          <form onSubmit={handleSubmit(onSubmitReserva)}>

            {/* --- DATOS DE LA RESERVA (arriba del cliente) --- */}
            <div className="bg-blue-200 rounded-lg p-3 mb-3">
              <div className="flex gap-3">
                <div className="relative">
                  <label className="absolute -top-2 left-3 bg-blue-200 px-1 text-xs font-medium text-gray-700 z-10">
                    Fecha evento: <span className="text-orange-500">*</span>
                  </label>
                  <input
                    {...register("fechaEvento", { required: "Requerida" })}
                    type="date"
                    min={fechaLocalStr()}
                    className="w-full border rounded px-2 py-1.5 text-xs"
                  />
                  {errors.fechaEvento && <span className="text-red-500 text-xs">{errors.fechaEvento.message}</span>}
                </div>
                <div className="relative">
                  <label className="absolute -top-2 left-3 bg-blue-200 px-1 text-xs font-medium text-gray-700 z-10">
                    Estado:
                  </label>
                  <select
                    {...register("estado")}
                    className="w-full border rounded px-2 py-1.5 text-xs"
                  >
                    <option value="reservado">Reservado</option>
                    <option value="listo">Listo</option>
                    <option value="entregado">Entregado</option>
                    <option value="devuelto">Devuelto</option>
                  </select>
                </div>
              </div>
            </div>

            {/* --- DATOS DEL CLIENTE --- */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden mb-3">
              <div className="bg-blue-400 p-2 flex items-center justify-between">
                <span className="font-bold text-white text-sm flex items-center gap-1.5">
                  <User size={14} /> REGISTRO DE CLIENTE
                </span>
                <VoiceMicButton accion="registrar_cliente" getFormContext={getClientFormContext} />
              </div>
              <div className="p-2 bg-sky-50">
                <div className="flex justify-between items-center mb-2">
                  {clienteExistente && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded">
                        Cliente existente: {clienteExistente.nombre} {clienteExistente.apellidos}
                      </span>
                      <button type="button" onClick={() => { setClienteExistente(null); reset(); }} className="text-xs bg-red-500 text-white px-2 py-0.5 rounded hover:bg-red-600">
                        Nuevo Cliente
                      </button>
                    </div>
                  )}
                </div>

              {/* Fila 1: DNI + Nombre + Apellidos */}
              <div className="flex flex-col sm:flex-row gap-2 mb-2">
                <div className="relative w-full sm:w-[140px] sm:flex-shrink-0">
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
                      🔍
                    </button>
                  </div>
                </div>
                <div className="relative flex-1">
                  <label className="absolute -top-2 left-2 bg-sky-50 px-1 text-[10px] font-medium text-gray-700 z-10">
                    Nombre <span className="text-orange-500">*</span>
                  </label>
                  <input
                    {...register("nombre", { required: "Nombre requerido" })}
                    type="text"
                    placeholder="Juan Carlos"
                    className="w-full border rounded px-1.5 py-1 text-xs"
                  />
                  {errors.nombre && <span className="text-red-500 text-[10px]">{errors.nombre.message}</span>}
                </div>
                <div className="relative flex-1">
                  <label className="absolute -top-2 left-2 bg-sky-50 px-1 text-[10px] font-medium text-gray-700 z-10">
                    Apellidos <span className="text-orange-500">*</span>
                  </label>
                  <input
                    {...register("apellidos", { required: "Apellidos requeridos" })}
                    type="text"
                    placeholder="Pérez García"
                    className="w-full border rounded px-1.5 py-1 text-xs"
                  />
                </div>
              </div>

              {/* Fila 2: Teléfono + Dirección + Estado */}
              <div className="flex flex-col sm:flex-row gap-2 mb-2">
                <div className="relative w-full sm:w-[120px] sm:flex-shrink-0">
                  <label className="absolute -top-2 left-2 bg-sky-50 px-1 text-[10px] font-medium text-gray-700 z-10">
                    Teléfono <span className="text-orange-500">*</span>
                  </label>
                  <div className="flex gap-1">
                    <input
                      {...register("telefono", { required: "Teléfono requerido" })}
                      type="text"
                      maxLength={9}
                      placeholder="987654321"
                      className="w-full border rounded px-1.5 py-1 text-xs"
                    />
                    <button type="button" onClick={() => { const n = (watch("telefono") || "").replace(/\D/g, ""); if (n.length === 9) window.location.href = `tel:+51${n}`; }} className="text-blue-500 text-xs px-0.5">📞</button>
                  </div>
                </div>
                <div className="relative flex-1">
                  <label className="absolute -top-2 left-2 bg-sky-50 px-1 text-[10px] font-medium text-gray-700 z-10">
                    Dirección <span className="text-orange-500">*</span>
                  </label>
                  <div className="flex gap-1">
                    <input
                      {...register("direccion", { required: "Dirección requerida" })}
                      type="text"
                      placeholder="Dirección completa y referencia"
                      className="w-full border rounded px-1.5 py-1 text-xs"
                    />
                    <button
                      type="button"
                      title={grabandoDireccion ? "Detener" : "Dictar dirección"}
                      className={`px-1.5 rounded border flex-shrink-0 transition-colors ${grabandoDireccion ? "bg-red-500 text-white border-red-500 animate-pulse" : "bg-gray-50 text-gray-500 border-gray-300 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"}`}
                      onClick={() => {
                        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                        if (!SpeechRecognition) { toast.error("Tu navegador no soporta reconocimiento de voz"); return; }
                        if (grabandoDireccion) { setGrabandoDireccion(false); return; }
                        const recognition = new SpeechRecognition();
                        recognition.lang = "es-PE";
                        recognition.interimResults = false;
                        recognition.maxAlternatives = 1;
                        recognition.onresult = (e) => {
                          const texto = e.results[0][0].transcript;
                          const actual = watch("direccion") || "";
                          setValue("direccion", actual ? actual + " " + texto : texto, { shouldValidate: true });
                          setGrabandoDireccion(false);
                        };
                        recognition.onerror = () => { setGrabandoDireccion(false); toast.error("Error al reconocer voz"); };
                        recognition.onend = () => { setGrabandoDireccion(false); };
                        setGrabandoDireccion(true);
                        recognition.start();
                      }}
                    >
                      <Mic className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {errors.direccion && <span className="text-red-500 text-[10px]">{errors.direccion.message}</span>}
                </div>
                <div className="relative w-full sm:w-[150px] sm:flex-shrink-0">
                  <label className="absolute -top-2 left-2 bg-sky-50 px-1 text-[10px] font-medium text-gray-700 z-10">
                    Correo
                  </label>
                  <input
                    {...register("correo")}
                    type="email"
                    placeholder="correo@mail.com"
                    className="w-full border rounded px-1.5 py-1 text-xs"
                  />
                </div>
              </div>

              {/* Fila 4: Foto compacta */}
              <div className="flex items-center gap-1">
                <input type="file" accept="image/*" ref={imagenClienteInputRef} onChange={handleImagenClienteChange} className="hidden" />
                <button type="button" onClick={() => imagenClienteInputRef.current?.click()} className="bg-blue-500 text-white px-1.5 py-1 rounded text-[10px] hover:bg-blue-600" title="Seleccionar archivo">
                  <Upload size={12} />
                </button>
                <label className="bg-green-500 text-white px-1.5 py-1 rounded text-[10px] hover:bg-green-600 cursor-pointer inline-flex items-center" title="Tomar foto">
                  <Camera size={12} />
                  <input type="file" accept="image/*" capture="environment" ref={imagenClienteCamaraRef} onChange={handleImagenClienteChange} className="hidden" />
                </label>
                {imagenClientePreview && (
                  <div className="relative">
                    <img src={imagenClientePreview} alt="Preview" className="w-8 h-8 object-cover rounded border cursor-pointer hover:ring-2 hover:ring-blue-400" onClick={() => setFotoAmpliada(imagenClientePreview)} title="Clic para ampliar" />
                    <button type="button" onClick={() => { setImagenCliente(null); setImagenClientePreview(null); }} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center text-[8px]">×</button>
                  </div>
                )}
                {!imagenClientePreview && clienteExistente?.imagen && (
                  <div className="relative flex items-center gap-1">
                    <img src={buildImageUrl(clienteExistente.imagen)} alt="Cliente" className="w-8 h-8 object-cover rounded border cursor-pointer hover:ring-2 hover:ring-blue-400" onClick={() => setFotoAmpliada(buildImageUrl(clienteExistente.imagen))} title="Clic para ampliar" />
                    <span className="text-[10px] text-gray-500">Actual</span>
                  </div>
                )}
                {!imagenClientePreview && !clienteExistente?.imagen && <span className="text-[10px] text-gray-400">Foto</span>}
              </div>
              </div>
            </div>

            {/* --- PRODUCTOS Y PAGOS (grid 3 columnas como reservaGrupal) --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
              {/* PANEL DE CONTROL - PRODUCTOS */}
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-blue-400 p-2">
                  <h1 className="text-sm font-bold text-center text-white">REGISTRO DE PRODUCTOS</h1>
                </div>
                <div className="p-2 bg-sky-50">

                {!fechaEvento && (
                  <div className="mb-2 flex items-center gap-2 px-2 py-1.5 bg-yellow-50 border border-yellow-300 rounded text-[10px] text-yellow-700">
                    <AlertCircle size={12} /> Seleccione fecha del evento
                  </div>
                )}

                {/* Búsqueda por nombre */}
                <div className="mb-3">
                  <div className="relative">
                    <label className="absolute -top-2 left-3 bg-white px-1 text-xs font-medium text-gray-700">🔍 Buscar por nombre</label>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={searchNombre}
                        onChange={(e) => { setSearchNombre(e.target.value); buscarProductosPorNombre(e.target.value); }}
                        onFocus={() => searchNombre.length >= 2 && setShowSearchResults(true)}
                        placeholder="Escriba el nombre del producto"
                        className="w-full border rounded px-2 py-1 text-xs"
                      />
                      {searchNombre && (
                        <button type="button" onClick={() => { setSearchNombre(""); setProductosEncontrados([]); setShowSearchResults(false); }} className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs">✕</button>
                      )}
                    </div>
                    {showSearchResults && productosEncontrados.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-60 overflow-y-auto">
                        {productosEncontrados.map((producto) => (
                          <div key={producto.ID || producto.id} onClick={() => agregarProductoDesdeNombre(producto)} className="p-2 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 flex items-center gap-2">
                            {producto.imagen && <img src={buildImageUrl(producto.imagen)} alt={producto.nombre} className="w-8 h-8 object-cover rounded border" />}
                            <div className="flex-1">
                              <div className="font-medium text-xs">{producto.nombre}</div>
                              <div className="text-xs text-gray-500">Stock: {producto.stock || 0} | S/ {Number(producto.precio_alquiler || 0).toFixed(2)}</div>
                              <div className="text-xs text-gray-400">
                                {producto.talla && <>Talla: {producto.talla}</>}
                                {producto.talla && (producto.modelo || producto.color) && <> | </>}
                                {producto.modelo && <>Modelo: {producto.modelo}</>}
                                {producto.modelo && producto.color && <> | </>}
                                {producto.color && <>Color: {producto.color}</>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Escáner de código de barras */}
                <div className="mb-3">
                  <div className="relative">
                    <label className="absolute -top-2 left-3 bg-white px-1 text-xs font-medium text-gray-700">Código de barras</label>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={barcode}
                        onChange={(e) => setBarcode(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && barcode.trim()) { e.preventDefault(); agregarProductoPorCodigo(barcode); } }}
                        placeholder="Escanee o digite el código"
                        className="w-full border rounded px-2 py-1 text-xs"
                      />
                      <button type="button" onClick={() => barcode && agregarProductoPorCodigo(barcode)} disabled={!barcode || loading} className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 text-xs whitespace-nowrap">
                        {loading ? "..." : "Agregar"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Separador */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 h-px bg-gray-300"></div>
                  <span className="text-xs text-gray-500">o</span>
                  <div className="flex-1 h-px bg-gray-300"></div>
                </div>

                {/* Botón de combos */}
                <div className="flex justify-center mb-3">
                  <button type="button" onClick={() => setShowCombosModal(true)} className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1 text-xs">
                    📦 Seleccionar Combo
                  </button>
                </div>

                {/* Resumen de costos */}
                <div className="space-y-2 bg-blue-100 p-2 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs">PRECIO TOTAL:</span>
                    <span className="text-sm font-bold">S/ {costoTotal.toFixed(2)}</span>
                  </div>

                  <div className="relative">
                    <label className="absolute -top-2 left-3 bg-sky-50 px-1 text-xs font-medium text-gray-700">Adelanto</label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={costoTotal}
                        value={adelanto}
                        onChange={(e) => {
                          let nuevoAdelanto = parseFloat(e.target.value) || 0;
                          if (nuevoAdelanto > costoTotal) nuevoAdelanto = costoTotal;
                          if (nuevoAdelanto < 0) nuevoAdelanto = 0;
                          setAdelanto(nuevoAdelanto);
                          if (nuevoAdelanto > 0) {
                            const efectivo = metodosPago.find((m) => (m.nombre || m.Nombre || "").toLowerCase().includes("efectivo"));
                            if (efectivo) {
                              setPagosAgregados([{ id: Date.now(), id_pago: efectivo.ID || efectivo.id, nombre: efectivo.nombre || efectivo.Nombre, monto: nuevoAdelanto, descripcion: "" }]);
                            }
                          } else {
                            setPagosAgregados([]);
                          }
                        }}
                        className="flex-1 border rounded px-2 py-1 text-xs"
                        disabled={productosSeleccionados.length === 0}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setAdelanto(costoTotal);
                          const efectivo = metodosPago.find((m) => (m.nombre || m.Nombre || "").toLowerCase().includes("efectivo"));
                          if (efectivo && costoTotal > 0) {
                            setPagosAgregados([{ id: Date.now(), id_pago: efectivo.ID || efectivo.id, nombre: efectivo.nombre || efectivo.Nombre, monto: costoTotal, descripcion: "" }]);
                          }
                          toast.success("Pago total aplicado");
                        }}
                        disabled={productosSeleccionados.length === 0 || costoTotal === 0}
                        className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 text-xs font-bold whitespace-nowrap"
                      >
                        PAGAR TODO
                      </button>
                    </div>
                  </div>

                  {/* Pagos registrados */}
                  {pagosAgregados.length > 0 && (
                    <div className="mt-1 space-y-1">
                      <p className="text-[10px] font-bold text-gray-500">Métodos de pago registrados:</p>
                      {pagosAgregados.map((pago) => (
                        <div key={pago.id} className="flex justify-between items-center text-xs bg-white p-1.5 rounded border">
                          <span>{pago.nombre}: S/ {pago.monto.toFixed(2)}</span>
                          <button type="button" onClick={() => removerMetodoPago(pago.id)} className="text-red-400 hover:text-red-600 font-bold">✕</button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Botón agregar/cambiar método de pago */}
                  <button
                    type="button"
                    onClick={() => setShowPagosModal(true)}
                    disabled={adelanto === 0}
                    className="w-full mt-1 px-2 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    💳 {pagosAgregados.length > 0 ? "Cambiar Método de Pago" : "Agregar Método de Pago"}
                  </button>

                  <div className="flex justify-between items-center text-sm font-bold text-red-600">
                    <span>DEBE:</span>
                    <span>S/ {(costoTotal - adelanto).toFixed(2)}</span>
                  </div>
                </div>

                {/* Botón guardar reserva */}
                <button
                  type="submit"
                  disabled={loading || productosSeleccionados.length === 0}
                  className={`w-full mt-3 px-3 py-2 text-white rounded text-sm font-bold disabled:bg-gray-400 ${editingId ? "bg-yellow-600 hover:bg-yellow-700" : "bg-blue-600 hover:bg-blue-700"}`}
                >
                  {loading ? "Guardando..." : editingId ? "✏️ ACTUALIZAR RESERVA" : "💾 GUARDAR RESERVA"}
                </button>
                {editingId && (
                  <button type="button" onClick={limpiarFormulario} className="w-full mt-1 px-3 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600">
                    Cancelar edición
                  </button>
                )}
                </div>
              </div>

              {/* LISTA DE PRODUCTOS (tabla) */}
              <div className="col-span-1 md:col-span-2 bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-blue-300 p-2">
                  <h2 className="text-sm font-bold text-center text-white">LISTA DE PRODUCTOS ({productosSeleccionados.length})</h2>
                </div>
                <div className="p-2">
                <div className="overflow-x-auto overflow-y-auto max-h-80">
                  {productosSeleccionados.length > 0 ? (
                    <table className="w-full border border-gray-300 rounded-md text-xs min-w-[550px]">
                      <thead className="bg-blue-500 text-white">
                        <tr>
                          <th className="p-2 text-left">#</th>
                          <th className="p-2 text-left">Producto</th>
                          <th className="p-2 text-center">Cantidad</th>
                          <th className="p-2 text-left">Tipo</th>
                          <th className="p-2 text-right">Precio</th>
                          <th className="p-2 text-right">Subtotal</th>
                          <th className="p-2 text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productosSeleccionados.map((item, index) => {
                          const imgUrl = buildImageUrl(item.imagen);
                          const isCombo = item.tipo === "combo";
                          const precioUnit = isCombo ? item.precio_oferta : item.precio_alquiler;
                          return (
                            <React.Fragment key={item.id}>
                              <tr className="border-b last:border-none hover:bg-blue-50">
                                <td className="p-2">{index + 1}</td>
                                <td className="p-2">
                                  <div className="flex items-center gap-2">
                                    {item.imagen && <img src={imgUrl} alt={item.nombre} className="w-6 h-6 object-cover rounded border cursor-pointer hover:ring-2 hover:ring-blue-400" onClick={() => setFotoAmpliada(imgUrl)} title="Clic para ampliar" />}
                                    <div>
                                      <div className="font-medium text-xs">{item.nombre}</div>
                                      {!isCombo && (item.talla || item.modelo || item.color) && (
                                        <div className="text-[10px] text-gray-500">
                                          {item.talla && <>Talla: {item.talla}</>}
                                          {item.talla && (item.modelo || item.color) && <> | </>}
                                          {item.modelo && <>Mod: {item.modelo}</>}
                                          {item.modelo && item.color && <> | </>}
                                          {item.color && <>Color: {item.color}</>}
                                        </div>
                                      )}
                                      {isCombo && (
                                        <button type="button" onClick={() => setExpandedCombo(expandedCombo === item.id ? null : item.id)} className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5">
                                          {expandedCombo === item.id ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                                          {item.productos_escaneados?.length || 0} productos
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="p-2">
                                  <div className="flex items-center justify-center gap-1">
                                    <button type="button" onClick={() => actualizarCantidad(item.id, (item.cantidad || 1) - 1)} disabled={(item.cantidad || 1) <= 1} className="w-5 h-5 flex items-center justify-center bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 text-xs font-bold">-</button>
                                    <span className="w-6 text-center text-xs font-medium">{item.cantidad || 1}</span>
                                    <button type="button" onClick={() => actualizarCantidad(item.id, (item.cantidad || 1) + 1)} className="w-5 h-5 flex items-center justify-center bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-xs font-bold">+</button>
                                  </div>
                                </td>
                                <td className="p-2">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${isCombo ? "bg-blue-100 text-blue-700" : "bg-blue-100 text-blue-700"}`}>
                                    {isCombo ? "Combo" : "Individual"}
                                  </span>
                                </td>
                                <td className="p-2 text-right">S/ {Number(precioUnit || 0).toFixed(2)}</td>
                                <td className="p-2 text-right font-bold">S/ {(Number(precioUnit || 0) * (item.cantidad || 1)).toFixed(2)}</td>
                                <td className="p-2 text-center">
                                  <button type="button" onClick={() => removerProducto(item.id)} className="text-red-500 hover:text-red-700" title="Eliminar">
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              </tr>
                              {isCombo && expandedCombo === item.id && item.productos_escaneados && (
                                <tr>
                                  <td colSpan={7} className="bg-blue-50 px-4 py-2">
                                    <div className="space-y-1">
                                      {item.productos_escaneados.map((prod, pidx) => {
                                        const pImgUrl = buildImageUrl(prod.imagen);
                                        return (
                                          <div key={pidx} className="flex items-center gap-2 px-1 py-0.5 bg-white rounded border border-blue-100">
                                            {pImgUrl ? <img src={pImgUrl} alt={prod.nombre} className="w-6 h-6 object-cover rounded flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-blue-400" onClick={() => setFotoAmpliada(pImgUrl)} /> : <Package size={10} className="text-gray-400 flex-shrink-0" />}
                                            <span className="text-xs text-gray-700 flex-1">{prod.nombre}</span>
                                            {(prod.talla || prod.modelo || prod.color) && (
                                              <span className="text-[10px] text-gray-500">
                                                {[prod.talla && `T:${prod.talla}`, prod.modelo && `M:${prod.modelo}`, prod.color && `C:${prod.color}`].filter(Boolean).join(" | ")}
                                              </span>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-center text-gray-400 text-xs py-8">Sin productos. Escanea o busca para agregar.</p>
                  )}
                </div>
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
              <span className="font-bold text-white text-sm flex items-center gap-1.5"><Search size={14} /> LISTA DE RESERVAS INDIVIDUALES</span>
            </div>
            <div className="p-3 bg-sky-50 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-12 gap-3">
                {/* Desde */}
                <div className={`relative lg:col-span-2 ${busquedaTextoActiva ? "opacity-40 pointer-events-none" : ""}`}>
                  <label className="absolute -top-2 left-2 bg-sky-50 px-1 text-[10px] font-medium text-gray-700 z-10">Desde</label>
                  <input
                    type="date"
                    value={filtroFechaDesde}
                    onChange={(e) => setFiltroFechaDesde(e.target.value)}
                    disabled={busquedaTextoActiva}
                    className="w-full border rounded px-2 py-1.5 text-xs"
                  />
                </div>
                {/* Hasta */}
                <div className={`relative lg:col-span-2 ${busquedaTextoActiva ? "opacity-40 pointer-events-none" : ""}`}>
                  <label className="absolute -top-2 left-2 bg-sky-50 px-1 text-[10px] font-medium text-gray-700 z-10">Hasta</label>
                  <input
                    type="date"
                    value={filtroFechaHasta}
                    onChange={(e) => setFiltroFechaHasta(e.target.value)}
                    disabled={busquedaTextoActiva}
                    className="w-full border rounded px-2 py-1.5 text-xs"
                  />
                </div>
                {/* Buscar cliente */}
                <div className="relative lg:col-span-3">
                  <label className="absolute -top-2 left-2 bg-sky-50 px-1 text-[10px] font-medium text-gray-700 z-10">Buscar cliente</label>
                  <input
                    type="text"
                    placeholder="Nombre / ID..."
                    value={filtroBusqueda}
                    onChange={(e) => setFiltroBusqueda(e.target.value)}
                    className={`w-full border rounded px-2 py-1.5 text-xs pr-7 ${filtroBusqueda.trim() ? "border-blue-500 bg-blue-50" : ""}`}
                  />
                  {filtroBusqueda.trim() && (
                    <button
                      onClick={() => setFiltroBusqueda("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm z-10"
                      title="Limpiar búsqueda"
                    >✕</button>
                  )}
                </div>
                {/* DNI */}
                <div className="relative lg:col-span-2">
                  <label className="absolute -top-2 left-2 bg-sky-50 px-1 text-[10px] font-medium text-gray-700 z-10">DNI Cliente</label>
                  <input
                    type="text"
                    placeholder="8 dígitos..."
                    value={filtroDni}
                    onChange={(e) => setFiltroDni(e.target.value)}
                    maxLength={8}
                    className={`w-full border rounded px-2 py-1.5 text-xs pr-7 ${filtroDni.trim() ? "border-blue-500 bg-blue-50" : ""}`}
                  />
                  {filtroDni.trim() && (
                    <button
                      onClick={() => setFiltroDni("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                      title="Limpiar DNI"
                    >✕</button>
                  )}
                </div>
                {/* Botones */}
                <div className="flex items-end lg:col-span-3 gap-2">
                  <button
                    type="button"
                    onClick={fetchReservas}
                    disabled={loading}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-medium disabled:opacity-50"
                    title="Buscar"
                  >
                    Buscar
                  </button>
                  <button
                    type="button"
                    onClick={fetchReservas}
                    disabled={loading}
                    className="flex-1 px-3 py-1.5 bg-gray-600 text-white rounded hover:bg-gray-700 text-xs font-medium disabled:opacity-50"
                    title="Refrescar datos"
                  >
                    Actualizar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const hoy = fechaLocalStr();
                      setFiltroFechaDesde(hoy);
                      setFiltroFechaHasta(hoy);
                      setFiltroBusqueda("");
                      setFiltroDni("");
                      setFiltroEstado("todos");
                      fetchReservas();
                    }}
                    disabled={loading}
                    className="flex-1 px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-xs font-medium disabled:opacity-50"
                    title="Mostrar solo las reservas de hoy"
                  >
                    Hoy
                  </button>
                </div>
              </div>

              {/* Filtros por estado */}
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setFiltroEstado("todos")}
                  className={`px-3 py-1 text-xs rounded capitalize ${
                    filtroEstado === "todos"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  Todos
                </button>
                {["reservado", "listo", "entregado", "devuelto"].map((estado) => (
                  <button
                    key={estado}
                    type="button"
                    onClick={() => setFiltroEstado(estado)}
                    className={`px-3 py-1 text-xs rounded capitalize ${
                      filtroEstado === estado
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    {estado}
                  </button>
                ))}
              </div>

              {/* Resumen */}
              <div className="text-xs text-gray-500">
                Mostrando {reservasFiltradas.length} de {reservas.length} reservas
                {filtroBusqueda && ` | Búsqueda: "${filtroBusqueda}"`}
                {filtroDni && ` | DNI: ${filtroDni}`}
                {busquedaTextoActiva && " (sin filtro de fechas)"}
                {!busquedaTextoActiva && filtroFechaDesde && ` | Desde: ${filtroFechaDesde}`}
                {!busquedaTextoActiva && filtroFechaHasta && ` | Hasta: ${filtroFechaHasta}`}
                {filtroEstado !== "todos" && ` | Estado: ${filtroEstado.toUpperCase()}`}
              </div>
            </div>
          </div>

          {/* Tabla */}
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              Cargando...
            </div>
          ) : reservasFiltradas.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">No hay reservas que coincidan con los filtros</div>
          ) : (
            <div className="overflow-x-auto overflow-y-visible">
              <table className="w-full text-[11px] min-w-[700px]">
                <thead className="bg-blue-500 text-white">
                  <tr>
                    <th className="px-1.5 py-1 text-left">#</th>
                    <th className="px-1.5 py-1 text-left">Cliente</th>
                    <th className="px-1.5 py-1 text-left">DNI</th>
                    <th className="px-1.5 py-1 text-left">Tel.</th>
                    <th className="px-1.5 py-1 text-left">Fecha</th>
                    <th className="px-1.5 py-1 text-left">Estado</th>
                    <th className="px-1.5 py-1 text-right">Total</th>
                    <th className="px-1.5 py-1 text-right">Adel.</th>
                    <th className="px-1.5 py-1 text-right">Saldo</th>
                    <th className="px-1.5 py-1 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {reservasFiltradas.map((reserva, idx) => {
                    const rId = reserva.ID || reserva.id;
                    const cliente = reserva.cliente || reserva.Cliente || {};
                    const clienteNombre = `${cliente.nombre || cliente.Nombre || "Sin nombre"} ${cliente.apellidos || cliente.Apellidos || ""}`.trim();
                    const fechaEvR = formatFechaDDMMYYYY(reserva.fecha_evento || reserva.FechaEvento);
                    const total = parseFloat(reserva.total || reserva.Total || 0);
                    const adelantoR = parseFloat(reserva.adelanto || reserva.Adelanto || 0);
                    const isExpanded = reservaExpandida === rId;

                    return (
                      <React.Fragment key={rId}>
                        <tr className="border-b hover:bg-blue-50">
                          <td className="px-1.5 py-1 font-bold">{idx + 1}</td>
                          <td className="px-1.5 py-1">{clienteNombre}</td>
                          <td className="px-1.5 py-1">{cliente.dni || cliente.DNI || "N/A"}</td>
                          <td className="px-1.5 py-1">{cliente.telefono || cliente.Telefono || "N/A"}</td>
                          <td className="px-1.5 py-1">{fechaEvR}</td>
                          <td className="px-1.5 py-1">
                            {(() => {
                              const secuencia = ["reservado", "listo", "entregado", "devuelto"];
                              const colores = {
                                reservado: { bg: "bg-yellow-400", ring: "ring-yellow-300", text: "text-yellow-700", bgLight: "bg-yellow-50" },
                                listo: { bg: "bg-blue-500", ring: "ring-blue-300", text: "text-blue-700", bgLight: "bg-blue-50" },
                                entregado: { bg: "bg-green-600", ring: "ring-green-400", text: "text-green-700", bgLight: "bg-green-50" },
                                devuelto: { bg: "bg-orange-500", ring: "ring-orange-300", text: "text-orange-700", bgLight: "bg-orange-50" },
                              };
                              const estadoActual = (reserva.estado || "reservado").toLowerCase();
                              const idxActual = secuencia.indexOf(estadoActual);
                              const isDropdownOpen = estadoDropdownId === rId;
                              return (
                                <div className="flex items-center gap-1">
                                  {/* Stepper visual */}
                                  <div className="flex items-center gap-0">
                                    {secuencia.map((est, i) => {
                                      const isCompleted = i < idxActual;
                                      const isCurrent = i === idxActual;
                                      return (
                                        <React.Fragment key={est}>
                                          {i > 0 && (
                                            <div className={`w-2 h-[2px] ${i <= idxActual ? "bg-green-400" : "bg-gray-300"}`} />
                                          )}
                                          <div
                                            className={`w-[16px] h-[16px] rounded-full text-[7px] font-bold flex items-center justify-center flex-shrink-0 ${
                                              isCompleted
                                                ? "bg-green-500 text-white"
                                                : isCurrent
                                                  ? `${colores[est].bg} text-white ring-1 ${colores[est].ring}`
                                                  : "bg-gray-200 text-gray-400"
                                            }`}
                                            title={est.charAt(0).toUpperCase() + est.slice(1)}
                                          >
                                            {isCompleted ? "✓" : est[0].toUpperCase()}
                                          </div>
                                        </React.Fragment>
                                      );
                                    })}
                                  </div>
                                  {/* Botón para dropdown */}
                                  <div className="relative">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        if (isDropdownOpen) {
                                          setEstadoDropdownId(null);
                                        } else {
                                          const rect = e.currentTarget.getBoundingClientRect();
                                          const spaceBelow = window.innerHeight - rect.bottom;
                                          const openUp = spaceBelow < 180;
                                          setEstadoDropdownPos({
                                            top: openUp ? undefined : rect.bottom + 4,
                                            bottom: openUp ? (window.innerHeight - rect.top + 4) : undefined,
                                            left: Math.min(rect.left, window.innerWidth - 180),
                                          });
                                          setEstadoDropdownId(rId);
                                        }
                                      }}
                                      className="p-0.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                      title="Cambiar estado"
                                    >
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })()}
                          </td>
                          <td className="px-1.5 py-1 text-right font-medium">S/ {total.toFixed(2)}</td>
                          <td className="px-1.5 py-1 text-right">S/ {adelantoR.toFixed(2)}</td>
                          <td className="px-1.5 py-1 text-right text-red-600">S/ {(total - adelantoR).toFixed(2)}</td>
                          <td className="px-1.5 py-1 text-center">
                            <div className="flex items-center justify-center gap-0.5">
                              <button
                                onClick={async () => {
                                  if (isExpanded) {
                                    setReservaExpandida(null);
                                    setDetalleExpandido(null);
                                  } else {
                                    setReservaExpandida(rId);
                                    await fetchDetalleReserva(rId);
                                  }
                                }}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                title="Ver productos"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => imprimirTicket(reserva)}
                                className="p-1 text-teal-600 hover:bg-teal-50 rounded"
                                title="Imprimir ticket"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => abrirEditModal(reserva)}
                                className="p-1 text-amber-600 hover:bg-amber-50 rounded"
                                title="Editar reserva"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => confirmarEliminar(rId)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                title="Eliminar"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {/* Fila expandida con productos */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={10} className="p-0">
                              <div className="bg-blue-50 px-2 py-1.5 border-l-4 border-blue-400">
                                {loadingDetalle ? (
                                  <p className="text-center text-xs text-gray-500 py-2">Cargando detalle...</p>
                                ) : detalleExpandido ? (
                                  <>
                                    {/* Info del cliente */}
                                    <div className="bg-white rounded px-2 py-1 text-[10px] mb-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-gray-600">
                                      {(detalleExpandido.cliente?.direccion || detalleExpandido.Cliente?.direccion) && (
                                        <span><strong>Dir:</strong> {detalleExpandido.cliente?.direccion || detalleExpandido.Cliente?.direccion}</span>
                                      )}
                                      {(detalleExpandido.cliente?.correo || detalleExpandido.Cliente?.correo) && (
                                        <span><strong>Correo:</strong> {detalleExpandido.cliente?.correo || detalleExpandido.Cliente?.correo}</span>
                                      )}
                                      {(detalleExpandido.descripcion || detalleExpandido.Descripcion) && (
                                        <span><strong>Notas:</strong> {detalleExpandido.descripcion || detalleExpandido.Descripcion}</span>
                                      )}
                                    </div>

                                    {/* Productos */}
                                    <h5 className="font-medium text-[10px] mb-1 text-gray-500 uppercase tracking-wide">
                                      Productos ({(detalleExpandido.detalles || detalleExpandido.Detalles || []).length})
                                    </h5>
                                    {(detalleExpandido.detalles || detalleExpandido.Detalles || []).length > 0 ? (
                                      <div className="space-y-1">
                                        {(detalleExpandido.detalles || detalleExpandido.Detalles || []).map((det, i) => {
                                          const combo = det.combo || det.Combo;
                                          const producto = det.producto || det.Producto;
                                          const precio = det.total || det.Total || det.precio_unitario || det.PrecioUnitario || 0;
                                          const cantidad = det.cantidad || det.Cantidad || 1;
                                          const esCombo = !!combo;
                                          const productosCombo = det.productos_del_combo || det.ProductosDelCombo || [];

                                          if (esCombo) {
                                            return (
                                              <div key={i} className="rounded border border-gray-200 bg-gray-50">
                                                <div className="flex items-center justify-between px-1.5 py-1 text-[11px] border-b border-gray-200 bg-gray-100">
                                                  <span className="text-gray-700 font-medium">{combo.nombre || combo.Nombre || "Combo"}</span>
                                                  <span className="font-medium text-gray-600">x{cantidad} — S/ {parseFloat(precio).toFixed(2)}</span>
                                                </div>
                                                {productosCombo.length > 0 ? (
                                                  <div className="px-1.5 py-1 space-y-0.5">
                                                    {productosCombo.map((prodC, j) => {
                                                      const imgCombo = buildImageUrl(prodC.imagen || prodC.Imagen);
                                                      const attrCombo = [
                                                        prodC.talla ? `T: ${prodC.talla}` : '',
                                                        prodC.modelo ? `M: ${prodC.modelo}` : '',
                                                        prodC.color ? `C: ${prodC.color}` : '',
                                                      ].filter(Boolean).join(' | ');
                                                      return (
                                                        <div key={j} className="flex items-center gap-1.5 text-[10px] bg-white rounded px-1 py-0.5 border border-gray-100">
                                                          {imgCombo ? (
                                                            <img src={imgCombo} alt={prodC.nombre} className="w-7 h-7 object-cover rounded border flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-blue-400" onClick={() => setFotoAmpliada(imgCombo)} title="Clic para ampliar" onError={(e) => { e.target.style.display = 'none'; }} />
                                                          ) : (
                                                            <div className="w-7 h-7 bg-gray-100 rounded border flex items-center justify-center flex-shrink-0">
                                                              <Package className="w-3 h-3 text-gray-400" />
                                                            </div>
                                                          )}
                                                          <div className="flex-1 min-w-0">
                                                            <span className="font-medium text-[10px]">{prodC.nombre || prodC.Nombre}</span>
                                                            {attrCombo && <div className="text-[9px] text-gray-400">{attrCombo}</div>}
                                                          </div>
                                                        </div>
                                                      );
                                                    })}
                                                  </div>
                                                ) : (
                                                  <div className="px-2 py-1 text-[10px] text-gray-400">Sin detalle de productos del combo</div>
                                                )}
                                              </div>
                                            );
                                          }

                                          // Producto individual
                                          const imgSrc = producto ? buildImageUrl(producto.imagen || producto.Imagen) : null;
                                          const atributos = producto ? [
                                            producto.talla ? `T: ${producto.talla}` : '',
                                            producto.modelo ? `M: ${producto.modelo}` : '',
                                            producto.color ? `C: ${producto.color}` : '',
                                          ].filter(Boolean).join(' | ') : '';

                                          return (
                                            <div key={i} className="rounded border border-gray-100 bg-white">
                                              <div className="flex items-center gap-1.5 px-1.5 py-1 text-[11px]">
                                                {imgSrc ? (
                                                  <img src={imgSrc} alt={producto?.nombre || 'Producto'} className="w-7 h-7 object-cover rounded border flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-blue-400" onClick={() => setFotoAmpliada(imgSrc)} title="Clic para ampliar" onError={(e) => { e.target.style.display = 'none'; }} />
                                                ) : (
                                                  <div className="w-7 h-7 bg-gray-100 rounded border flex items-center justify-center flex-shrink-0">
                                                    <Package className="w-3 h-3 text-gray-400" />
                                                  </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                  <span className="font-medium text-[11px]">{producto?.nombre || producto?.Nombre || det.nombre_producto || "Producto"}</span>
                                                  {atributos && <div className="text-[9px] text-gray-400">{atributos}</div>}
                                                </div>
                                                <span className="font-medium text-gray-600 flex-shrink-0">x{cantidad} — S/ {parseFloat(precio).toFixed(2)}</span>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <p className="text-gray-500 text-xs">Sin productos registrados</p>
                                    )}
                                  </>
                                ) : (
                                  <p className="text-xs text-gray-500 text-center py-2">No hay detalles disponibles</p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===== MODAL SELECCIONAR COMBO ===== */}
      {showCombosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-3 bg-blue-400 text-white flex justify-between items-center rounded-t-lg">
              <h3 className="text-lg font-bold">Seleccionar Combo</h3>
              <button onClick={() => setShowCombosModal(false)} className="hover:bg-blue-500 p-1 rounded"><X size={20} /></button>
            </div>
            <div className="p-3 max-h-96 overflow-y-auto">
              {combos.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No hay combos disponibles</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {combos.map((combo) => {
                    const comboId = combo.ID || combo.id;
                    const nombres = (combo.productos || []).map((p) => p.nombre).filter(Boolean);
                    return (
                      <div key={comboId} className="border rounded-lg p-3 hover:bg-blue-50">
                        <h4 className="font-bold text-sm mb-1">{combo.nombre}</h4>
                        <p className="text-xs text-gray-600 mb-2">{combo.descripcion}</p>
                        {nombres.length > 0 && (
                          <div className="mb-2 text-xs">
                            <p className="font-semibold">Productos:</p>
                            {nombres.map((nombre, idx) => (
                              <div key={idx}>• {nombre}</div>
                            ))}
                          </div>
                        )}
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-bold text-blue-600">S/ {Number(combo.precio_oferta || 0).toFixed(2)}</span>
                          <button onClick={() => agregarCombo(combo)} className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">Escanear</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL ESCANEAR COMBO ===== */}
      {showComboScanModal && comboActivo && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black bg-opacity-50 p-2 pt-4 sm:p-4 sm:pt-6">
          <div className="bg-white rounded-lg w-full max-w-2xl h-[92vh] overflow-hidden flex flex-col">
            {/* Header azul */}
            <div className="p-3 bg-blue-400 text-white flex justify-between items-center rounded-t-lg flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold">Agregando Productos: {comboActivo.nombre}</h3>
                <p className="text-xs text-blue-50">
                  Productos agregados: {productosComboIngresados.length} / {(comboActivo.productos || []).length}
                </p>
              </div>
              <button
                onClick={() => { setShowComboScanModal(false); setComboActivo(null); setProductosComboIngresados([]); setBarcodeCombo(""); setSearchProductoCombo(""); setProductosComboEncontrados([]); }}
                className="hover:bg-blue-500 p-1 rounded"
              ><X size={20} /></button>
            </div>

            {/* Contenido scrolleable */}
            <div className="p-3 sm:p-4 overflow-y-auto flex-1">

            {/* Productos del combo */}
            <div className="mb-3">
              <h4 className="font-semibold mb-2 text-sm">Productos del combo:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(comboActivo.productos || []).map((prod, idx) => {
                  const yaEscaneado = productosComboIngresados.some(
                    (p) => p.nombre?.toLowerCase() === prod.nombre?.toLowerCase()
                  );
                  const escaneado = yaEscaneado
                    ? productosComboIngresados.find((p) => p.nombre?.toLowerCase() === prod.nombre?.toLowerCase())
                    : null;
                  const imgUrl = escaneado ? buildImageUrl(escaneado.imagen) : null;
                  return (
                    <div key={idx} className={`flex items-center gap-2 p-2 rounded text-xs ${yaEscaneado ? "bg-green-100 text-green-800" : "bg-blue-100 text-gray-600"}`}>
                      {imgUrl ? (
                        <img src={imgUrl} alt={prod.nombre} className="w-10 h-10 object-cover rounded border flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-blue-400" onClick={() => setFotoAmpliada(imgUrl)} title="Clic para ampliar" />
                      ) : (
                        <div className="w-10 h-10 bg-gray-200 rounded border flex items-center justify-center text-[9px] text-gray-400 flex-shrink-0">
                          {yaEscaneado ? "✅" : "⏳"}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-medium">{prod.nombre}</div>
                        {escaneado && (escaneado.talla || escaneado.color || escaneado.modelo) && (
                          <div className="text-[10px] text-gray-500">
                            {escaneado.talla ? `T: ${escaneado.talla}` : ""}
                            {escaneado.talla && escaneado.color ? " · " : ""}
                            {escaneado.color ? `C: ${escaneado.color}` : ""}
                            {(escaneado.talla || escaneado.color) && escaneado.modelo ? " · " : ""}
                            {escaneado.modelo ? `M: ${escaneado.modelo}` : ""}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Búsqueda por nombre */}
            <div className="mb-3">
              <div className="relative">
                <label className="absolute -top-2 left-3 bg-white px-1 text-xs font-medium text-gray-700 z-10">Buscar por nombre</label>
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={searchProductoCombo}
                    onChange={(e) => { setSearchProductoCombo(e.target.value); buscarProductosParaCombo(e.target.value); }}
                    placeholder="Escriba el nombre del producto"
                    className="w-full border rounded px-1.5 py-1 text-xs focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none"
                  />
                  {searchProductoCombo && (
                    <button type="button" onClick={() => { setSearchProductoCombo(""); setProductosComboEncontrados([]); setShowProductoComboResults(false); }} className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs flex-shrink-0">✕</button>
                  )}
                </div>

                {/* Resultados de búsqueda */}
                {showProductoComboResults && productosComboEncontrados.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white border-2 border-blue-300 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {productosComboEncontrados.map((producto) => (
                      <div
                        key={producto.ID || producto.id}
                        onClick={() => agregarProductoComboDesdeNombre(producto)}
                        className="p-2 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 flex items-center gap-2"
                      >
                        {producto.imagen && (
                          <img src={buildImageUrl(producto.imagen)} alt={producto.nombre} className="w-10 h-10 object-cover rounded border" />
                        )}
                        <div className="flex-1">
                          <div className="font-medium text-xs">{producto.nombre}</div>
                          <div className="text-xs text-gray-500">S/ {Number(producto.precio_alquiler || 0).toFixed(2)}</div>
                          <div className="text-xs text-gray-400">
                            {producto.talla && <>Talla: {producto.talla}</>}
                            {producto.talla && (producto.modelo || producto.color) && <> | </>}
                            {producto.modelo && <>Modelo: {producto.modelo}</>}
                            {producto.modelo && producto.color && <> | </>}
                            {producto.color && <>Color: {producto.color}</>}
                          </div>
                          {producto.codigo_barras && (
                            <div className="text-xs text-gray-400">Codigo: {producto.codigo_barras}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {showProductoComboResults && productosComboEncontrados.length === 0 && searchProductoCombo && (
                  <div className="absolute z-20 w-full mt-1 bg-white border-2 border-orange-200 rounded-lg shadow-xl p-3">
                    <p className="text-xs text-gray-500 text-center">No se encontraron productos con "{searchProductoCombo}"</p>
                  </div>
                )}
              </div>
            </div>

            {/* Separador */}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 h-px bg-gray-300"></div>
              <span className="text-xs text-gray-500">o escanear código</span>
              <div className="flex-1 h-px bg-gray-300"></div>
            </div>

            {/* Escanear código de barras */}
            <div className="mb-3 relative">
              <label className="absolute -top-2 left-3 bg-white px-1 text-xs font-medium text-gray-700 z-10">Código de barras</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={barcodeCombo}
                  onChange={(e) => setBarcodeCombo(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && barcodeCombo.trim()) { e.preventDefault(); agregarProductoAlCombo(barcodeCombo); } }}
                  placeholder="Escanee o digite el código"
                  className="flex-1 border rounded px-1.5 py-1 text-xs focus:ring-2 focus:ring-green-300 focus:border-green-400 outline-none"
                  autoFocus
                />
                <button onClick={() => agregarProductoAlCombo(barcodeCombo)} disabled={!barcodeCombo || loading} className="px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 disabled:bg-gray-400">
                  {loading ? "..." : "Agregar"}
                </button>
              </div>
            </div>

            {/* Productos agregados */}
            {productosComboIngresados.length > 0 && (
              <div className="mb-3">
                <h4 className="font-semibold mb-1 text-sm">Productos agregados:</h4>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {productosComboIngresados.map((prod, idx) => {
                    const imgUrl = buildImageUrl(prod.imagen);
                    return (
                      <div key={idx} className="flex items-center gap-2 p-1.5 bg-green-50 rounded border border-green-200">
                        {imgUrl ? (
                          <img src={imgUrl} alt={prod.nombre} className="w-10 h-10 object-cover rounded border flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-blue-400" onClick={() => setFotoAmpliada(imgUrl)} title="Clic para ampliar" />
                        ) : (
                          <div className="w-10 h-10 bg-gray-100 rounded border flex items-center justify-center text-[9px] text-gray-400 flex-shrink-0">Sin img</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-xs">{prod.nombre}</div>
                          <div className="text-[10px] text-gray-500">
                            {prod.talla ? `Talla: ${prod.talla}` : ""}
                            {prod.talla && prod.color ? " · " : ""}
                            {prod.color ? `Color: ${prod.color}` : ""}
                            {(prod.talla || prod.color) && prod.modelo ? " · " : ""}
                            {prod.modelo ? `Modelo: ${prod.modelo}` : ""}
                          </div>
                          <div className="text-[10px] text-gray-400">Código: {prod.codigo_barras || "-"}</div>
                        </div>
                        <span className="text-green-600 text-xs flex-shrink-0">✅</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Botones de acción */}
            <div className="flex justify-between gap-2">
              <button
                onClick={() => { setShowComboScanModal(false); setComboActivo(null); setProductosComboIngresados([]); setBarcodeCombo(""); setSearchProductoCombo(""); setProductosComboEncontrados([]); }}
                className="px-4 py-2 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
              >Cancelar</button>
              <button
                onClick={finalizarCombo}
                disabled={productosComboIngresados.length < (comboActivo.productos || []).length}
                className="px-6 py-2 bg-blue-600 text-white rounded text-sm font-bold hover:bg-blue-700 disabled:bg-gray-400"
              >
                {productosComboIngresados.length >= (comboActivo.productos || []).length
                  ? "✅ Completar Combo"
                  : `⏳ Faltan ${(comboActivo.productos || []).length - productosComboIngresados.length} producto(s)`}
              </button>
            </div>
            </div>{/* cierre contenido scrolleable */}
          </div>
        </div>
      )}

      {/* ===== DROPDOWN ESTADO FIXED ===== */}
      {estadoDropdownId && (() => {
        const reserva = reservas.find((r) => (r.ID || r.id) === estadoDropdownId);
        if (!reserva) return null;
        const secuencia = ["reservado", "listo", "entregado", "devuelto"];
        const colores = {
          reservado: { bg: "bg-yellow-400", text: "text-yellow-700", bgLight: "bg-yellow-50" },
          listo: { bg: "bg-blue-500", text: "text-blue-700", bgLight: "bg-blue-50" },
          entregado: { bg: "bg-green-600", text: "text-green-700", bgLight: "bg-green-50" },
          devuelto: { bg: "bg-orange-500", text: "text-orange-700", bgLight: "bg-orange-50" },
        };
        const estadoActual = (reserva.estado || "reservado").toLowerCase();
        const idxActual = secuencia.indexOf(estadoActual);
        return (
          <>
            <div className="fixed inset-0 z-[70]" onClick={() => setEstadoDropdownId(null)} />
            <div
              className="fixed z-[80] bg-white rounded-lg shadow-xl border border-gray-200 py-1 w-44"
              style={{
                top: estadoDropdownPos.top != null ? estadoDropdownPos.top : undefined,
                bottom: estadoDropdownPos.bottom != null ? estadoDropdownPos.bottom : undefined,
                left: estadoDropdownPos.left,
              }}
            >
              {secuencia.map((est, i) => {
                const isCompleted = i < idxActual;
                const isCurrent = i === idxActual;
                const isFuture = i > idxActual;
                const color = colores[est];
                return (
                  <button
                    key={est}
                    type="button"
                    disabled={!isFuture}
                    onClick={() => {
                      setEstadoDropdownId(null);
                      if (isFuture) cambiarEstadoReserva(estadoDropdownId, est);
                    }}
                    className={`w-full px-3 py-1.5 text-left text-[11px] flex items-center gap-2 ${
                      isFuture ? "hover:bg-blue-50 cursor-pointer" : "opacity-60 cursor-default"
                    } ${isCurrent ? color.bgLight : ""}`}
                  >
                    <span className={`w-4 h-4 rounded-full text-[7px] font-bold flex items-center justify-center flex-shrink-0 ${
                      isCompleted ? "bg-green-500 text-white" : isCurrent ? `${color.bg} text-white` : "bg-gray-200 text-gray-400"
                    }`}>
                      {isCompleted ? "✓" : (i + 1)}
                    </span>
                    <span className={`font-medium ${isCurrent ? color.text : isFuture ? "text-gray-700" : "text-gray-400"}`}>
                      {est.charAt(0).toUpperCase() + est.slice(1)}
                    </span>
                    {isCurrent && <span className="ml-auto text-[9px] text-gray-400">actual</span>}
                  </button>
                );
              })}
            </div>
          </>
        );
      })()}

      {/* ===== MODAL PAGOS ===== */}
      {showPagosModal && (() => {
        const totalPagosModal = pagosAgregados.reduce((sum, p) => sum + p.monto, 0);
        const faltaRegistrar = Math.max(0, adelanto - totalPagosModal);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-4" onClick={() => setShowPagosModal(false)}>
            <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              {/* Header azul */}
              <div className="bg-blue-400 px-4 py-2.5 flex justify-between items-center">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  💳 Registrar Método de Pago
                </h3>
                <button onClick={() => setShowPagosModal(false)} className="text-white/80 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 overflow-y-auto flex-1 space-y-3">
                {/* Resumen */}
                <div className="bg-gray-50 rounded p-2.5 space-y-1 text-xs border">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Adelanto:</span>
                    <span className="font-bold text-blue-700">S/ {adelanto.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ya registrado:</span>
                    <span className="font-bold text-green-600">S/ {totalPagosModal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 mt-1">
                    <span className="font-bold text-gray-800">Falta registrar:</span>
                    <span className={`font-bold ${faltaRegistrar > 0 ? "text-red-600" : "text-green-600"}`}>S/ {faltaRegistrar.toFixed(2)}</span>
                  </div>
                </div>

                {/* Pagos registrados */}
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
                        <span>S/ {totalPagosModal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Formulario (solo si falta registrar) */}
                {faltaRegistrar > 0 && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.target);
                      const metodo = metodosPago.find((m) => (m.ID || m.id) == formData.get("id_pago"));
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
                          {metodosPago.map((metodo) => (
                            <option key={metodo.ID || metodo.id} value={metodo.ID || metodo.id}>{metodo.nombre || metodo.Nombre}</option>
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

                {/* Completado */}
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
        );
      })()}

      {/* ===== MODAL CONFIRMACIÓN ===== */}
      {showConfirmModal && confirmModalData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className={`flex items-center gap-2 mb-4 ${confirmModalData.tipo === "danger" ? "text-red-600" : confirmModalData.tipo === "warning" ? "text-yellow-600" : "text-blue-600"}`}>
              <AlertCircle size={24} />
              <h3 className="font-bold text-lg">{confirmModalData.titulo}</h3>
            </div>
            <p className="text-gray-700 text-sm mb-5 whitespace-pre-line">{confirmModalData.mensaje}</p>
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
            <div className="flex gap-2">
              {!confirmModalData.soloAceptar && (
                <button
                  onClick={() => { confirmModalData.conMotivo ? confirmModalData.onConfirm?.(motivoAccion) : confirmModalData.onConfirm?.(); }}
                  className={`flex-1 py-2 font-bold rounded text-white text-sm ${confirmModalData.tipo === "danger" ? "bg-red-600 hover:bg-red-700" : confirmModalData.tipo === "info" ? "bg-blue-600 hover:bg-blue-700" : "bg-yellow-500 hover:bg-yellow-600"}`}
                >
                  Confirmar
                </button>
              )}
              <button
                onClick={() => { setShowConfirmModal(false); setConfirmModalData(null); }}
                className={`${confirmModalData.soloAceptar ? "flex-1" : "flex-1"} py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium rounded text-sm`}
              >
                {confirmModalData.soloAceptar ? "Entendido" : "Cancelar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL COMPLETAR PAGO PARA ENTREGAR ===== */}
      {showPagoCompletarModal && pagoCompletarData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-amber-500 to-orange-500">
              <h3 className="text-lg font-semibold text-white">Completar Pago para Entregar</h3>
              <p className="text-amber-100 text-sm">{pagoCompletarData.clienteNombre}</p>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-gray-50 p-2 rounded text-center">
                  <p className="text-xs text-gray-500">Total</p>
                  <p className="font-bold">S/ {pagoCompletarData.total.toFixed(2)}</p>
                </div>
                <div className="bg-green-50 p-2 rounded text-center">
                  <p className="text-xs text-gray-500">Adelanto</p>
                  <p className="font-bold text-green-600">S/ {pagoCompletarData.adelanto.toFixed(2)}</p>
                </div>
                <div className="bg-red-50 p-2 rounded text-center">
                  <p className="text-xs text-gray-500">Saldo</p>
                  <p className="font-bold text-lg text-red-600">S/ {pagoCompletarData.saldo.toFixed(2)}</p>
                </div>
              </div>
              <div className="mb-3">
                <label className="text-sm font-medium text-gray-700 mb-1 block">Método de Pago</label>
                <select
                  value={pagoCompletarData.metodoPagoId}
                  onChange={(e) => setPagoCompletarData((prev) => ({ ...prev, metodoPagoId: e.target.value }))}
                  className="w-full border rounded px-3 py-2 text-sm"
                >
                  <option value="">Seleccionar...</option>
                  {metodosPago.map((m) => (
                    <option key={m.ID || m.id} value={m.ID || m.id}>
                      {m.nombre || m.Nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 mb-1 block">Monto a pagar</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={pagoCompletarData.saldo}
                  value={pagoCompletarData.monto ?? pagoCompletarData.saldo}
                  onChange={(e) => setPagoCompletarData((prev) => ({ ...prev, monto: parseFloat(e.target.value) || 0 }))}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => { setShowPagoCompletarModal(false); setPagoCompletarData(null); }}
                  className="px-4 py-2 border text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={completarPagoYEntregarReserva}
                  disabled={!pagoCompletarData.metodoPagoId || loading}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium text-sm disabled:bg-gray-400"
                >
                  {loading ? "Procesando..." : "Registrar Pago y Entregar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== FOTO AMPLIADA ===== */}
      {fotoAmpliada && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70] p-4" onClick={() => setFotoAmpliada(null)}>
          <div className="relative max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setFotoAmpliada(null)} className="absolute -top-10 right-0 text-white hover:text-gray-300">
              <X size={28} />
            </button>
            <img src={fotoAmpliada} alt="Ampliar" className="w-full rounded-lg shadow-2xl object-contain max-h-[80vh]" />
          </div>
        </div>
      )}
    </div>
  );
}

