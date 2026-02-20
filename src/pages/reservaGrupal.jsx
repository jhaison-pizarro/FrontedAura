import React, { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import {
  Calendar,
  List,
  Plus,
  User,
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
  Users,
  UserPlus,
  ChevronDown,
  ChevronUp,
  Camera,
  Upload,
  FileText,
  XCircle,
  Mic,
} from "lucide-react";
import { fetchAuth } from "../funciones/auth";
import { fechaLocalStr, comprimirImagen, formatFechaDDMMYYYY } from "../funciones/funciones";
import { toast } from "sonner";
import {
  filtrarReservasActivas,
  calcularStockDisponiblePorFecha,
  calcularStockConsumidoEnListaLocal,
  calcularStockConsumidoEnOtrosMiembros,
} from "../funciones/stockDisponibilidad";
import VoiceMicButton from "../components/VoiceMicButton";
import { API_BASE_URL } from "../config";
import { buildImageUrl } from "../funciones/imageUtils";
import { useSucursal } from "../context/SucursalContext";

const API_BASE = API_BASE_URL;

export function ReservaGrupal() {
  const { sucursalActual } = useSucursal();

  // ==================== ESTADO DE PESTAÑAS ====================
  const [pestanaActiva, setPestanaActiva] = useState("nueva");
  const [grupoEnEdicion, setGrupoEnEdicion] = useState(null);
  const [grabandoNombreGrupo, setGrabandoNombreGrupo] = useState(false);
  const [grabandoDireccion, setGrabandoDireccion] = useState(false);

  // ==================== ESTADOS PARA DATOS ====================
  const [reservasGrupales, setReservasGrupales] = useState([]);
  const [configEmpresa, setConfigEmpresa] = useState(null);
  const [combos, setCombos] = useState([]);
  const [metodosPago, setMetodosPago] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(false);

  // ==================== ESTADOS DEL GRUPO ====================
  const [responsable, setResponsable] = useState(null);
  const [miembrosGrupo, setMiembrosGrupo] = useState([]);
  const [clienteExistenteResponsable, setClienteExistenteResponsable] =
    useState(null);

  // ==================== ESTADOS DEL MIEMBRO ACTUAL ====================
  const [clienteExistenteMiembro, setClienteExistenteMiembro] = useState(null);
  const [datosReniecMiembro, setDatosReniecMiembro] = useState(null);
  const [productosSeleccionados, setProductosSeleccionados] = useState([]);
  const productosSeleccionadosRef = useRef([]);
  const [pagosAgregados, setPagosAgregados] = useState([]);
  const [costoTotal, setCostoTotal] = useState(0);
  const [adelanto, setAdelanto] = useState(0);
  const [barcode, setBarcode] = useState("");
  const [barcodeCombo, setBarcodeCombo] = useState("");

  // ==================== ESTADOS MODALES ====================
  const [showResponsableModal, setShowResponsableModal] = useState(false);
  const [showCombosModal, setShowCombosModal] = useState(false);
  const [showComboScanModal, setShowComboScanModal] = useState(false);
  const [showPagosModal, setShowPagosModal] = useState(false);
  const [showModalDetalle, setShowModalDetalle] = useState(false);
  const [comboActivo, setComboActivo] = useState(null);
  const [productosComboIngresados, setProductosComboIngresados] = useState([]);
  const [grupoDetalle, setGrupoDetalle] = useState(null);

  // ==================== ESTADOS FILTROS ====================
  const [filtroFechaDesde, setFiltroFechaDesde] = useState("");
  const [filtroFechaHasta, setFiltroFechaHasta] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroBusqueda, setFiltroBusqueda] = useState("");
  const [showSugerenciasGrupo, setShowSugerenciasGrupo] = useState(false);
  const [filtroDniResponsable, setFiltroDniResponsable] = useState("");

  // ==================== ESTADOS BÚSQUEDA PRODUCTOS ====================
  const [searchNombre, setSearchNombre] = useState("");
  const [productosEncontrados, setProductosEncontrados] = useState([]);
  const [searchNombreCombo, setSearchNombreCombo] = useState("");
  const [productosEncontradosCombo, setProductosEncontradosCombo] = useState(
    [],
  );
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Estados para búsqueda de productos DENTRO del combo (modal escaneo)
  const [searchProductoCombo, setSearchProductoCombo] = useState("");
  const [productosComboEncontrados, setProductosComboEncontrados] = useState([]);
  const [showProductoComboResults, setShowProductoComboResults] = useState(false);

  // ==================== ESTADOS EXPANDIR MIEMBROS ====================
  const [miembroExpandido, setMiembroExpandido] = useState(null);
  const [grupoExpandidoEnLista, setGrupoExpandidoEnLista] = useState(null);
  const [miembroEnEdicion, setMiembroEnEdicion] = useState(null);
  const [expandedCombo, setExpandedCombo] = useState(null);

  // ==================== ESTADO RESERVAS PARA VALIDACIÓN CRUZADA ====================
  const [todasLasReservas, setTodasLasReservas] = useState([]);

  // ==================== ESTADOS MODAL CONFIRMACIÓN ====================
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalData, setConfirmModalData] = useState(null);
  const [motivoAccion, setMotivoAccion] = useState("");

  // Helper para mostrar alertas de stock como modal
  const mostrarAlertaStock = (mensaje, tipo = "warning") => {
    setConfirmModalData({
      titulo: tipo === "error" ? "Stock No Disponible" : "Advertencia de Stock",
      mensaje,
      tipo: tipo === "error" ? "danger" : "warning",
      soloAceptar: true,
    });
    setShowConfirmModal(true);
  };

  // Helper para construir mensaje detallado de reservas del día siguiente
  function buildMensajeDiaSiguiente(nombreProducto, reservasDiaSiguiente) {
    const totalDiaSiguiente = reservasDiaSiguiente.reduce((sum, r) => sum + r.cantidad, 0);
    const detalleReservas = reservasDiaSiguiente.map((r) => {
      const cliente = r.cliente;
      const nombreCliente = cliente
        ? `${cliente.nombre || cliente.Nombre || ""} ${cliente.apellidos || cliente.Apellidos || ""}`.trim()
        : "Cliente desconocido";
      return `  • Reserva #${r.idReserva} — ${nombreCliente} (${r.cantidad} unid.)`;
    }).join("\n");
    return `"${nombreProducto}" tiene ${totalDiaSiguiente} unidad(es) alquiladas para el día siguiente:\n${detalleReservas}\n\nAsegúrese de que el cliente devuelva a tiempo.`;
  }

  // ==================== ESTADOS MODAL EDITAR MIEMBRO INDIVIDUAL ====================
  const [showModalEditarMiembro, setShowModalEditarMiembro] = useState(false);
  const [miembroParaEditar, setMiembroParaEditar] = useState(null);

  // ==================== ESTADOS IMAGEN CLIENTE (MIEMBRO) ====================
  const [imagenMiembro, setImagenMiembro] = useState(null);
  const [imagenMiembroPreview, setImagenMiembroPreview] = useState(null);
  const [fotoAmpliada, setFotoAmpliada] = useState(null);
  const imagenMiembroInputRef = useRef(null);
  const imagenMiembroCamaraRef = useRef(null);

  // ==================== ESTADOS MODAL COMPLETAR PAGO ====================
  const [showPagoCompletarModal, setShowPagoCompletarModal] = useState(false);
  const [pagoCompletarData, setPagoCompletarData] = useState(null);
  const [showPagoGrupoModal, setShowPagoGrupoModal] = useState(false);
  const [pagoGrupoData, setPagoGrupoData] = useState(null);

  // ==================== ESTADOS IMAGEN RESPONSABLE ====================
  const [imagenResponsable, setImagenResponsable] = useState(null);
  const [imagenResponsablePreview, setImagenResponsablePreview] =
    useState(null);
  const imagenResponsableInputRef = useRef(null);
  const imagenResponsableCamaraRef = useRef(null);
  const showResponsableModalRef = useRef(false);

  // ==================== FORMS ====================
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm({
    defaultValues: {
      nombreGrupo: "",
      descripcionGrupo: "",
      estadoGrupo: "reservado",
    },
  });

  const {
    register: registerResponsable,
    handleSubmit: handleSubmitResponsable,
    formState: { errors: errorsResponsable },
    reset: resetResponsable,
    setValue: setValueResponsable,
    watch: watchResponsable,
  } = useForm();

  const {
    register: registerMiembro,
    handleSubmit: handleSubmitMiembro,
    formState: { errors: errorsMiembro },
    reset: resetMiembro,
    setValue: setValueMiembro,
    watch: watchMiembro,
  } = useForm({
    defaultValues: {
      estadoMiembro: "reservado",
      fechaEvento: "",
    },
  });

  // ==================== FETCH CONFIG EMPRESA ====================
  async function fetchConfigEmpresa() {
    try {
      const res = await fetchAuth(`${API_BASE}/configuracion`);
      if (res.ok) {
        const data = await res.json();
        setConfigEmpresa(data);
      }
    } catch (err) {
    }
  }

  // ==================== EFFECTS ====================
  useEffect(() => {
    fetchCombos();
    fetchMetodosPago();
    fetchReservasGrupales();
    fetchProductos();
    fetchTodasLasReservas();
    fetchConfigEmpresa();

    // Establecer fecha de hoy por defecto
    const hoy = fechaLocalStr();
    setFiltroFechaDesde(hoy);
    setFiltroFechaHasta(hoy);
  }, []);

  useEffect(() => {
    if (datosReniecMiembro) {
      setValueMiembro("nombre", datosReniecMiembro.nombres || "");
      setValueMiembro(
        "apellidos",
        `${datosReniecMiembro.apellido_paterno || ""} ${datosReniecMiembro.apellido_materno || ""}`,
      );
    }
  }, [datosReniecMiembro, setValueMiembro]);

  // Mantener ref sincronizado con estado del modal responsable
  useEffect(() => {
    showResponsableModalRef.current = showResponsableModal;
  }, [showResponsableModal]);

  // Listener para llenado de cliente por voz (miembro o responsable)
  useEffect(() => {
    const handleVoiceClientFill = async (e) => {
      const data = e.detail;
      if (!data) return;

      const esResponsable = showResponsableModalRef.current;
      const setVal = esResponsable ? setValueResponsable : setValueMiembro;
      const tipoCliente = esResponsable ? "responsable" : "miembro";

      const campos = [
        { key: "dni", label: "DNI" },
        { key: "telefono", label: "Teléfono" },
        { key: "direccion", label: "Dirección" },
        { key: "correo", label: "Correo" },
        { key: "descripcion", label: "Descripción" },
        { key: "nombre", label: "Nombre" },
        { key: "apellidos", label: "Apellidos" },
      ];

      // Buscar dentro del contenedor correcto para la animación visual
      const contenedor = esResponsable
        ? document.querySelector('[data-form="responsable"]')
        : document.querySelector('[data-form="miembro"]') || document;

      for (const campo of campos) {
        if (data[campo.key] !== undefined && data[campo.key] !== "") {
          setVal(campo.key, String(data[campo.key]));
          const el = contenedor?.querySelector(`[name="${campo.key}"]`) || document.querySelector(`[name="${campo.key}"]`);
          if (el) {
            el.classList.add("voice-filling");
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
          await new Promise((r) => setTimeout(r, 250));
          if (el) el.classList.remove("voice-filling");
        }
      }

      if (data.dni && /^[0-9]{8}$/.test(data.dni)) {
        const keysEnviados = Object.keys(data).filter(k => data[k] !== undefined && data[k] !== "");
        const esModificacionSoloDni = keysEnviados.length === 1 && keysEnviados[0] === "dni";
        if (!esModificacionSoloDni) {
          const camposProtegidos = keysEnviados.filter(k => k !== "dni");
          setTimeout(() => buscarCliente(data.dni, tipoCliente, camposProtegidos), 400);
        }
      }
    };

    window.addEventListener("voice:fill-client-form", handleVoiceClientFill);
    return () => window.removeEventListener("voice:fill-client-form", handleVoiceClientFill);
  }, [setValueMiembro, setValueResponsable]);

  useEffect(() => {
    productosSeleccionadosRef.current = productosSeleccionados;
  }, [productosSeleccionados]);

  useEffect(() => {
    const total = productosSeleccionados.reduce(
      (sum, item) =>
        sum +
        (item.tipo === "combo"
          ? Number(item.precio_oferta || 0) * (item.cantidad || 1)
          : Number(item.precio_alquiler || 0) * (item.cantidad || 1)),
      0,
    );
    setCostoTotal(total);
  }, [productosSeleccionados]);

  // Contexto del formulario de miembro para VoiceMicButton
  const getClientFormContext = useCallback(() => {
    const campos = {
      dni: watchMiembro("dni") || "",
      nombre: watchMiembro("nombre") || "",
      apellidos: watchMiembro("apellidos") || "",
      telefono: watchMiembro("telefono") || "",
      direccion: watchMiembro("direccion") || "",
      correo: watchMiembro("correo") || "",
      descripcion: watchMiembro("descripcion") || "",
    };
    return { formulario: "registrar_cliente", campos };
  }, [watchMiembro]);

  // Contexto del formulario de responsable para VoiceMicButton
  const getResponsableFormContext = useCallback(() => {
    const campos = {
      dni: watchResponsable("dni") || "",
      nombre: watchResponsable("nombre") || "",
      apellidos: watchResponsable("apellidos") || "",
      telefono: watchResponsable("telefono") || "",
      direccion: watchResponsable("direccion") || "",
      correo: watchResponsable("correo") || "",
    };
    return { formulario: "registrar_cliente", campos };
  }, [watchResponsable]);

  // Variable de fecha del grupo (para validación cruzada)
  const fechaEventoGrupo = watch("fechaEventoGrupo");

  // Re-validar productos cuando cambia la fecha del grupo (con debounce)
  useEffect(() => {
    if (!fechaEventoGrupo || productosSeleccionados.length === 0) return;

    const timeout = setTimeout(() => {
      const productosValidados = [];
      let huboEliminados = false;
      const mensajesStock = [];

      for (const item of productosSeleccionados) {
        if (item.tipo === "individual" && item.id_producto) {
          const consumidoPorOtros = calcularStockConsumidoEnListaLocal(
            item.nombre, productosSeleccionados, item.id
          ) + calcularStockConsumidoEnOtrosMiembros(item.nombre, miembrosGrupo, miembroEnEdicion);

          const disponibilidad = calcularStockDisponiblePorFecha(
            item.id_producto, item.stock || 0, fechaEventoGrupo, todasLasReservas, null
          );
          const maxDisponible = disponibilidad.stockDisponible - consumidoPorOtros;

          if (maxDisponible <= 0) {
            huboEliminados = true;
            mensajesStock.push(`"${item.nombre}" eliminado: no disponible para ${fechaEventoGrupo} (reservado: ${disponibilidad.unidadesReservadas})`);
            continue;
          }
          if ((item.cantidad || 1) > maxDisponible) {
            mensajesStock.push(`"${item.nombre}" ajustado a ${maxDisponible} unidades para ${fechaEventoGrupo}`);
            productosValidados.push({ ...item, cantidad: maxDisponible });
            continue;
          }
        }
        productosValidados.push(item);
      }

      if (huboEliminados || productosValidados.length !== productosSeleccionados.length) {
        setProductosSeleccionados(productosValidados);
      }

      if (mensajesStock.length > 0) {
        mostrarAlertaStock(mensajesStock.join("\n"), huboEliminados ? "error" : "warning");
      }
    }, 500);

    return () => clearTimeout(timeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaEventoGrupo]);

  // ==================== FETCH FUNCTIONS ====================
  async function fetchCombos() {
    try {
      const res = await fetchAuth(`${API_BASE}/combos`);
      const data = await res.json();
      setCombos(data.combos || data || []);
    } catch (err) {
    }
  }

  async function fetchMetodosPago() {
    try {
      const res = await fetchAuth(`${API_BASE}/pagos`);
      const data = await res.json();
      setMetodosPago(data || []);
    } catch (err) {
    }
  }

  async function fetchProductos() {
    try {
      const res = await fetchAuth(`${API_BASE}/productos`);
      const data = await res.json();
      setProductos(data || []);
    } catch (err) {
    }
  }

  // Obtener todas las reservas activas para validación cruzada de stock por fecha
  async function fetchTodasLasReservas() {
    try {
      const res = await fetchAuth(`${API_BASE}/reservas?incluir_grupales=true`);
      if (res.ok) {
        const data = await res.json();
        setTodasLasReservas(filtrarReservasActivas(data));
      }
    } catch (err) {
    }
  }

  async function fetchReservasGrupales() {
    try {
      setLoading(true);
      const res = await fetchAuth(`${API_BASE}/reservas-grupo`);
      const grupos = await res.json();

      // Para cada grupo, obtener sus reservas (miembros)
      const gruposConMiembros = await Promise.all(
        (grupos || []).map(async (grupo) => {
          try {
            const resReservas = await fetchAuth(
              `${API_BASE}/reservas?id_grupo=${grupo.ID || grupo.id}`,
            );
            const reservas = await resReservas.json();

            // Para cada reserva, cargar sus detalles completos
            const miembrosConDetalles = await Promise.all(
              (reservas || []).map(async (reserva) => {
                const reservaId = reserva.ID || reserva.id;

                // Si ya tiene detalles, usarlos; si no, cargarlos del endpoint individual
                let detalles = reserva.detalles || reserva.Detalles || [];

                // Si no hay detalles, intentar cargarlos del endpoint individual
                if (detalles.length === 0 && reservaId) {
                  try {
                    const resDetalle = await fetchAuth(
                      `${API_BASE}/reservas/${reservaId}`,
                    );
                    const dataDetalle = await resDetalle.json();
                    detalles = dataDetalle.detalles || dataDetalle.Detalles || [];
                  } catch (errDetalle) {
                  }
                }

                return {
                  ...reserva,
                  ID: reservaId,
                  id_cliente: reserva.id_cliente || reserva.IdCliente,
                  fecha_evento: reserva.fecha_evento || reserva.FechaEvento,
                  estado: reserva.estado || reserva.Estado,
                  total: parseFloat(reserva.total || reserva.Total || 0),
                  adelanto: parseFloat(reserva.adelanto || reserva.Adelanto || 0),
                  descripcion: reserva.descripcion || reserva.Descripcion || '',
                  cliente: reserva.cliente || reserva.Cliente || null,
                  // ⭐ Detalles normalizados (productos/combos)
                  detalles: detalles,
                };
              }),
            );

            return {
              ...grupo,
              miembros: miembrosConDetalles,
            };
          } catch (err) {
            return { ...grupo, miembros: [] };
          }
        }),
      );

      setReservasGrupales(gruposConMiembros);
    } catch (err) {
      setReservasGrupales([]);
    } finally {
      setLoading(false);
    }
  }

  // ==================== FUNCIONES IMAGEN CLIENTE ====================
  function handleImagenMiembroChange(e) {
    const file = e.target.files && e.target.files[0];
    if (file) {
      setImagenMiembro(file);
      setImagenMiembroPreview(URL.createObjectURL(file));
    }
  }

  function handleImagenResponsableChange(e) {
    const file = e.target.files && e.target.files[0];
    if (file) {
      setImagenResponsable(file);
      setImagenResponsablePreview(URL.createObjectURL(file));
    }
  }

  // ==================== FUNCIONES CLIENTE ====================
  async function buscarClienteEnBD(dni, tipo = "miembro", camposProtegidos = []) {
    if (!dni || !/^[0-9]{8}$/.test(dni)) {
      toast.warning("El DNI debe tener 8 dígitos numéricos");
      return false;
    }

    setLoading(true);
    try {
      const response = await fetchAuth(`${API_BASE}/clientes`);
      const clientes = await response.json();
      const cliente = clientes.find((c) => c.dni === dni);

      if (cliente) {
        if (tipo === "responsable") {
          setClienteExistenteResponsable(cliente);
          if (!camposProtegidos.includes("nombre")) setValueResponsable("nombre", cliente.nombre || "");
          if (!camposProtegidos.includes("apellidos")) setValueResponsable("apellidos", cliente.apellidos || "");
          if (!camposProtegidos.includes("telefono")) setValueResponsable("telefono", cliente.telefono || "");
          if (!camposProtegidos.includes("correo")) setValueResponsable("correo", cliente.correo || "");
          if (!camposProtegidos.includes("direccion")) setValueResponsable("direccion", cliente.direccion || "");
        } else {
          setClienteExistenteMiembro(cliente);
          if (!camposProtegidos.includes("nombre")) setValueMiembro("nombre", cliente.nombre || "");
          if (!camposProtegidos.includes("apellidos")) setValueMiembro("apellidos", cliente.apellidos || "");
          if (!camposProtegidos.includes("telefono")) setValueMiembro("telefono", cliente.telefono || "");
          if (!camposProtegidos.includes("correo")) setValueMiembro("correo", cliente.correo || "");
          if (!camposProtegidos.includes("direccion")) setValueMiembro("direccion", cliente.direccion || "");
        }
        return true;
      } else {
        toast.info("Cliente no encontrado. Puede buscar en RENIEC.");
        return false;
      }
    } catch (error) {
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function consultaReniec(dni, tipo = "miembro") {
    if (!dni || !/^[0-9]{8}$/.test(dni)) {
      toast.warning("El DNI debe tener 8 dígitos numéricos");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("https://apiperu.dev/api/dni", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_DNI_API_TOKEN}`,
        },
        body: JSON.stringify({ dni }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        const nombres = result.data.nombres || "";
        const apellidos = `${result.data.apellido_paterno || ""} ${result.data.apellido_materno || ""}`;

        if (tipo === "responsable") {
          setValueResponsable("nombre", nombres);
          setValueResponsable("apellidos", apellidos);
          setClienteExistenteResponsable(null);
        } else {
          setDatosReniecMiembro(result.data);
          setClienteExistenteMiembro(null);
        }
      } else {
        toast.info("No se encontraron datos en RENIEC");
      }
    } catch (error) {
      toast.error("Error al consultar RENIEC");
    } finally {
      setLoading(false);
    }
  }

  async function buscarCliente(dni, tipo = "miembro", camposProtegidos = []) {
    const encontrado = await buscarClienteEnBD(dni, tipo, camposProtegidos);
    if (!encontrado) {
      toast.info("Cliente no encontrado en BD. Buscando en RENIEC...");
      await consultaReniec(dni, tipo);
    }
  }

  // ==================== FUNCIONES RESPONSABLE ====================
  const onSubmitResponsable = async (data) => {
    try {
      setLoading(true);
      let clienteResponsable;

      if (clienteExistenteResponsable) {
        clienteResponsable = clienteExistenteResponsable;
      } else {
        // Crear nuevo cliente - usar FormData si hay imagen
        let response;
        if (imagenResponsable) {
          const formData = new FormData();
          formData.append("nombre", data.nombre);
          formData.append("apellidos", data.apellidos);
          formData.append("dni", data.dni);
          formData.append("telefono", data.telefono);
          formData.append("correo", data.correo || "");
          formData.append("direccion", data.direccion || "");
          formData.append("imagen", await comprimirImagen(imagenResponsable));

          response = await fetchAuth(`${API_BASE}/clientes`, {
            method: "POST",
            body: formData,
          });
        } else {
          response = await fetchAuth(`${API_BASE}/clientes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              nombre: data.nombre,
              apellidos: data.apellidos,
              dni: data.dni,
              telefono: data.telefono,
              correo: data.correo || "",
              direccion: data.direccion || "",
            }),
          });
        }

        if (!response.ok) throw new Error("Error al crear cliente");
        clienteResponsable = await response.json();
      }

      setResponsable(clienteResponsable);
      setShowResponsableModal(false);
      resetResponsable();
      setClienteExistenteResponsable(null);
      setImagenResponsable(null);
      setImagenResponsablePreview(null);
    } catch (error) {
      toast.error("Error al asignar responsable");
    } finally {
      setLoading(false);
    }
  };

  // ==================== FUNCIÓN IMAGEN ====================

  // ==================== FUNCIONES PRODUCTOS ====================
  async function agregarProductoPorCodigo(codigo) {
    if (!codigo.trim()) return;

    // Validar que la fecha del grupo esté seleccionada
    if (!fechaEventoGrupo) {
      toast.warning("Debe seleccionar la fecha del evento del grupo antes de agregar productos");
      setBarcode("");
      return;
    }

    try {
      setLoading(true);

      // Re-fetch reservas frescas antes de validar
      await fetchTodasLasReservas();

      const response = await fetchAuth(
        `${API_BASE}/productos/codigo/${codigo}`,
      );

      if (!response.ok) {
        toast.info("Producto no encontrado");
        setBarcode("");
        return;
      }

      const producto = await response.json();

      if (productosSeleccionados.some((p) => p.codigo_barras === codigo)) {
        toast.warning("El producto ya está en la lista");
        setBarcode("");
        return;
      }

      // Validación cruzada por fecha
      const stockActual = producto.stock || 0;
      const disponibilidadFecha = calcularStockDisponiblePorFecha(
        producto.ID || producto.id, stockActual, fechaEventoGrupo, todasLasReservas, null
      );
      const stockOriginal = disponibilidadFecha.stockOriginal || stockActual;

      if (stockOriginal <= 0) {
        mostrarAlertaStock(`El producto "${producto.nombre}" no tiene stock disponible`);
        setBarcode("");
        return;
      }

      if (!disponibilidadFecha.disponible) {
        mostrarAlertaStock(
          `"${producto.nombre}" no disponible para ${fechaEventoGrupo}.\nStock: ${stockOriginal}, reservado esa fecha: ${disponibilidadFecha.unidadesReservadas}`,
          "error"
        );
        setBarcode("");
        return;
      }

      const yaConsumido = calcularStockConsumidoEnLista(producto.nombre);
      const stockPorFecha = disponibilidadFecha.stockDisponible - yaConsumido;

      if (stockPorFecha <= 0) {
        mostrarAlertaStock(
          `"${producto.nombre}" sin stock para ${fechaEventoGrupo}.\nDisponible: ${disponibilidadFecha.stockDisponible}, usado en grupo: ${yaConsumido}`,
          "error"
        );
        setBarcode("");
        return;
      }

      if (disponibilidadFecha.reservasDiaSiguiente.length > 0) {
        mostrarAlertaStock(buildMensajeDiaSiguiente(producto.nombre, disponibilidadFecha.reservasDiaSiguiente));
      }

      const productoParaLista = {
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
      };

      setProductosSeleccionados((prev) => [...prev, productoParaLista]);
      setExpandedCombo(null);
      setBarcode("");
    } catch (error) {
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

    try {
      const terminoLower = nombre.toLowerCase();
      const encontrados = productos
        .filter((p) => p.nombre?.toLowerCase().includes(terminoLower))
        .sort((a, b) => {
          const aNombre = (a.nombre || "").toLowerCase();
          const bNombre = (b.nombre || "").toLowerCase();
          const aStarts = aNombre.startsWith(terminoLower);
          const bStarts = bNombre.startsWith(terminoLower);
          if (aStarts && !bStarts) return -1;
          if (!aStarts && bStarts) return 1;
          return aNombre.localeCompare(bNombre);
        });
      setProductosEncontrados(encontrados.slice(0, 10));
      setShowSearchResults(true);
    } catch (error) {
    }
  }

  async function agregarProductoDesdeNombre(producto) {
    // Validar que la fecha del grupo esté seleccionada
    if (!fechaEventoGrupo) {
      toast.warning("Debe seleccionar la fecha del evento del grupo antes de agregar productos");
      return;
    }

    // Re-fetch reservas frescas antes de validar
    await fetchTodasLasReservas();

    const productoId = producto.ID || producto.id;
    const codigoBarras = producto.codigo_barras || `temp-${productoId}`;

    if (productosSeleccionados.some((p) => p.id_producto === productoId)) {
      toast.warning("El producto ya está en la lista");
      return;
    }

    // Validación cruzada por fecha (recupera stock original)
    const stockActual = producto.stock || 0;
    const disponibilidadFecha = calcularStockDisponiblePorFecha(
      productoId, stockActual, fechaEventoGrupo, todasLasReservas, null
    );
    const stockOriginal = disponibilidadFecha.stockOriginal || stockActual;

    if (stockOriginal <= 0) {
      mostrarAlertaStock(`El producto "${producto.nombre}" no tiene stock disponible`);
      return;
    }

    if (!disponibilidadFecha.disponible) {
      toast.error(
        `"${producto.nombre}" no disponible para ${fechaEventoGrupo}. ` +
        `Stock: ${stockOriginal}, reservado esa fecha: ${disponibilidadFecha.unidadesReservadas}`
      );
      return;
    }

    const yaConsumido = calcularStockConsumidoEnLista(producto.nombre);
    if (disponibilidadFecha.stockDisponible - yaConsumido <= 0) {
      toast.error(
        `"${producto.nombre}" sin stock para ${fechaEventoGrupo}. ` +
        `Disponible: ${disponibilidadFecha.stockDisponible}, usado en grupo: ${yaConsumido}`
      );
      return;
    }

    if (disponibilidadFecha.reservasDiaSiguiente.length > 0) {
      mostrarAlertaStock(buildMensajeDiaSiguiente(producto.nombre, disponibilidadFecha.reservasDiaSiguiente));
    }

    const productoParaLista = {
      id: `prod-${productoId}-${Date.now()}`,
      id_producto: productoId,
      codigo_barras: codigoBarras,
      nombre: producto.nombre,
      imagen: producto.imagen,
      precio_alquiler: Number(producto.precio_alquiler || 0),
      stock: stockOriginal,
      talla: producto.talla || "",
      modelo: producto.modelo || "",
      color: producto.color || "",
      tipo: "individual",
      cantidad: 1,
    };

    setProductosSeleccionados((prev) => [...prev, productoParaLista]);
    setExpandedCombo(null);
    setSearchNombre("");
    setProductosEncontrados([]);
    setShowSearchResults(false);
  }

  // ==================== FUNCIONES COMBOS ====================
  async function agregarCombo(combo) {
    if (
      productosSeleccionados.some(
        (p) => p.id === `combo-${combo.ID || combo.id}`,
      )
    ) {
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

      // Re-fetch reservas frescas antes de validar
      await fetchTodasLasReservas();

      const response = await fetchAuth(
        `${API_BASE}/productos/codigo/${codigo}`,
      );

      if (!response.ok) {
        toast.info("Producto no encontrado");
        setBarcodeCombo("");
        return;
      }

      const producto = await response.json();
      const productosDelCombo = comboActivo.productos || [];
      const productoEsDelCombo = productosDelCombo.some(
        (p) => p.nombre?.toLowerCase() === producto.nombre?.toLowerCase(),
      );

      if (!productoEsDelCombo) {
        toast.warning(
          `El producto "${producto.nombre}" no pertenece a este combo`,
        );
        setBarcodeCombo("");
        return;
      }

      // Validar duplicado por nombre (no solo por código)
      if (productosComboIngresados.some((p) => p.nombre.toLowerCase() === producto.nombre.toLowerCase())) {
        toast.warning(`Ya se escaneó un "${producto.nombre}" para este combo. Debe escanear productos diferentes.`);
        setBarcodeCombo("");
        return;
      }

      // Validar stock con recuperación de stock original
      const stockActual = producto.stock || 0;
      const disponibilidadFecha = fechaEventoGrupo
        ? calcularStockDisponiblePorFecha(producto.ID || producto.id, stockActual, fechaEventoGrupo, todasLasReservas, null)
        : null;
      const stockOriginal = disponibilidadFecha?.stockOriginal || stockActual;
      const yaConsumido = calcularStockConsumidoEnLista(producto.nombre);

      // Función para agregar el producto al combo
      const agregarAlCombo = () => {
        const productoParaCombo = {
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
        };
        setProductosComboIngresados((prev) => [...prev, productoParaCombo]);
        setBarcodeCombo("");
      };

      if (stockOriginal <= 0) {
        mostrarAlertaStock(`El producto "${producto.nombre}" no tiene stock disponible (stock: ${stockOriginal}). No se puede agregar al combo.`, "error");
        setBarcodeCombo("");
        return;
      }

      if (disponibilidadFecha) {
        const stockPorFecha = disponibilidadFecha.stockDisponible - yaConsumido;
        if (stockPorFecha <= 0) {
          mostrarAlertaStock(`"${producto.nombre}" no disponible para ${fechaEventoGrupo}.\nStock: ${stockOriginal}, reservado esa fecha: ${disponibilidadFecha.unidadesReservadas}, usado en grupo: ${yaConsumido}`, "error");
          setBarcodeCombo("");
          return;
        }
      } else if (stockOriginal - yaConsumido <= 0) {
        mostrarAlertaStock(`"${producto.nombre}" ya no tiene stock disponible.\nStock: ${stockOriginal}, ya usado en grupo: ${yaConsumido}`, "error");
        setBarcodeCombo("");
        return;
      }

      agregarAlCombo();
    } catch (error) {
      toast.error("Error al buscar el producto");
    } finally {
      setLoading(false);
    }
  }

  // Buscar productos del combo por nombre (versión simple)
  async function buscarProductosDelComboPorNombre(termino) {
    if (!termino.trim() || !comboActivo) {
      setProductosEncontradosCombo([]);
      return;
    }

    try {
      const productosDelCombo = comboActivo.productos || [];
      const terminoLower = termino.toLowerCase();

      // Filtrar solo los productos que pertenecen al combo
      const resultados = productosDelCombo.filter((producto) =>
        producto.nombre.toLowerCase().includes(terminoLower),
      );

      setProductosEncontradosCombo(resultados);
    } catch (error) {
    }
  }

  // Función para buscar productos por nombre dentro del combo (muestra TODOS los productos)
  async function buscarProductosParaCombo(termino) {
    if (!termino.trim() || !comboActivo) {
      setProductosComboEncontrados([]);
      setShowProductoComboResults(false);
      return;
    }

    try {
      const response = await fetchAuth(`${API_BASE}/productos`);
      if (!response.ok) {
        return;
      }

      const todosProductos = await response.json();
      const terminoLower = termino.toLowerCase();

      // Filtrar todos los productos que coinciden con la búsqueda (como la búsqueda principal)
      const resultados = todosProductos.filter((prod) => {
        // Ya escaneado?
        const yaEscaneado = productosComboIngresados.some(
          (p) => (p.id_producto || 0) === (prod.ID || prod.id)
        );
        if (yaEscaneado) return false;

        // Coincide con el término de búsqueda
        return (
          (prod.nombre || "").toLowerCase().includes(terminoLower) ||
          (prod.codigo_barras || "").toLowerCase().includes(terminoLower)
        );
      });

      setProductosComboEncontrados(resultados);
      setShowProductoComboResults(true);
    } catch (error) {
    }
  }

  // Función para agregar producto del combo desde búsqueda por nombre (con datos completos)
  async function agregarProductoComboDesdeNombre(producto) {
    if (!comboActivo) return;

    // Re-fetch reservas frescas antes de validar
    await fetchTodasLasReservas();

    // Verificar si ya está escaneado (por nombre)
    if (productosComboIngresados.some((p) => (p.nombre || "").toLowerCase() === (producto.nombre || "").toLowerCase())) {
      toast.warning(`Ya se escaneó un "${producto.nombre}" para este combo. Debe escanear productos diferentes.`);
      return;
    }

    const productosDelCombo = comboActivo.productos || [];
    const productoEsDelCombo = productosDelCombo.some(
      (p) => (p.nombre || "").toLowerCase() === (producto.nombre || "").toLowerCase()
    );

    if (!productoEsDelCombo) {
      toast.warning(`El producto "${producto.nombre}" no pertenece a este combo`);
      return;
    }

    // Validar stock con recuperación de stock original
    const stockActual = producto.stock || 0;
    const disponibilidadFecha = fechaEventoGrupo
      ? calcularStockDisponiblePorFecha(producto.ID || producto.id, stockActual, fechaEventoGrupo, todasLasReservas, null)
      : null;
    const stockOriginal = disponibilidadFecha?.stockOriginal || stockActual;
    const yaConsumido = calcularStockConsumidoEnLista(producto.nombre);

    // Función para agregar el producto al combo
    const agregarAlCombo = () => {
      const productoParaCombo = {
        id: `combo-prod-${Date.now()}-${Math.random()}`,
        id_producto: producto.ID || producto.id,
        codigo_barras: producto.codigo_barras || "",
        nombre: producto.nombre,
        precio_alquiler: Number(producto.precio_alquiler || 0),
        stock: stockOriginal,
        talla: producto.talla || "",
        modelo: producto.modelo || "",
        color: producto.color || "",
        imagen: producto.imagen,
        tipo: "combo-producto",
      };

      setProductosComboIngresados((prev) => {
        const nuevos = [...prev, productoParaCombo];
        if (nuevos.length >= productosDelCombo.length) {
          setTimeout(() => toast.success(`Combo "${comboActivo.nombre}" completado!`), 500);
        }
        return nuevos;
      });
      setSearchProductoCombo("");
      setProductosComboEncontrados([]);
      setShowProductoComboResults(false);
      toast.success(`${producto.nombre} agregado al combo`);
    };

    if (stockOriginal <= 0) {
      mostrarAlertaStock(`El producto "${producto.nombre}" no tiene stock disponible (stock: ${stockOriginal}). No se puede agregar al combo.`, "error");
      return;
    }

    if (disponibilidadFecha) {
      const stockPorFecha = disponibilidadFecha.stockDisponible - yaConsumido;
      if (stockPorFecha <= 0) {
        mostrarAlertaStock(`"${producto.nombre}" no disponible para ${fechaEventoGrupo}.\nStock: ${stockOriginal}, reservado esa fecha: ${disponibilidadFecha.unidadesReservadas}, usado en grupo: ${yaConsumido}`, "error");
        return;
      }
    } else if (stockOriginal - yaConsumido <= 0) {
      mostrarAlertaStock(`"${producto.nombre}" ya no tiene stock disponible.\nStock: ${stockOriginal}, ya usado en grupo: ${yaConsumido}`, "error");
      return;
    }

    agregarAlCombo();
  }

  // Agregar producto del combo desde búsqueda por nombre
  async function agregarProductoDelComboDesdeNombre(productoDelCombo) {
    if (!comboActivo) return;

    // Verificar si ya fue escaneado
    const yaEscaneado = productosComboIngresados.some(
      (p) => p.nombre?.toLowerCase() === productoDelCombo.nombre?.toLowerCase(),
    );

    if (yaEscaneado) {
      toast.warning("Este producto ya fue agregado al combo");
      return;
    }

    try {
      setLoading(true);

      // Re-fetch reservas frescas antes de validar
      await fetchTodasLasReservas();

      // Buscar el producto completo en la base de datos por nombre
      const response = await fetchAuth(`${API_BASE}/productos`);
      if (!response.ok) {
        throw new Error("Error al obtener productos");
      }

      const todosLosProductos = await response.json();
      const productoEncontrado = todosLosProductos.find(
        (p) =>
          p.nombre?.toLowerCase() === productoDelCombo.nombre?.toLowerCase(),
      );

      if (!productoEncontrado) {
        toast.info("Producto no encontrado en inventario");
        return;
      }

      // Validar stock con recuperación de stock original
      const stockActual = productoEncontrado.stock || 0;
      const disponibilidadFecha = fechaEventoGrupo
        ? calcularStockDisponiblePorFecha(productoEncontrado.ID || productoEncontrado.id, stockActual, fechaEventoGrupo, todasLasReservas, null)
        : null;
      const stockOriginal = disponibilidadFecha?.stockOriginal || stockActual;
      const yaConsumido = calcularStockConsumidoEnLista(productoEncontrado.nombre);

      // Función para agregar el producto al combo
      const agregarAlCombo = () => {
        const productoParaCombo = {
          id: `combo-prod-${Date.now()}-${Math.random()}`,
          id_producto: productoEncontrado.ID || productoEncontrado.id,
          codigo_barras:
            productoEncontrado.codigo_barras || `temp-${productoEncontrado.ID}`,
          nombre: productoEncontrado.nombre,
          talla: productoEncontrado.talla || "",
          modelo: productoEncontrado.modelo || "",
          color: productoEncontrado.color || "",
          stock: stockOriginal,
          imagen: productoEncontrado.imagen,
          tipo: "combo-producto",
        };
        setProductosComboIngresados((prev) => [...prev, productoParaCombo]);
        setSearchNombreCombo("");
        setProductosEncontradosCombo([]);
      };

      if (stockOriginal <= 0) {
        mostrarAlertaStock(`El producto "${productoEncontrado.nombre}" no tiene stock disponible (stock: ${stockOriginal}).`, "error");
        return;
      }

      if (disponibilidadFecha) {
        const stockPorFecha = disponibilidadFecha.stockDisponible - yaConsumido;
        if (stockPorFecha <= 0) {
          mostrarAlertaStock(`"${productoEncontrado.nombre}" no disponible para ${fechaEventoGrupo}.\nStock: ${stockOriginal}, reservado esa fecha: ${disponibilidadFecha.unidadesReservadas}, usado en grupo: ${yaConsumido}`, "error");
          return;
        }
      } else if (stockOriginal - yaConsumido <= 0) {
        mostrarAlertaStock(`"${productoEncontrado.nombre}" ya no tiene stock disponible.\nStock: ${stockOriginal}, ya usado en grupo: ${yaConsumido}`, "error");
        return;
      }

      agregarAlCombo();
    } catch (error) {
      toast.error("Error al agregar el producto al combo");
    } finally {
      setLoading(false);
    }
  }

  function completarCombo() {
    if (!comboActivo || productosComboIngresados.length === 0) return;

    // Validar que se hayan escaneado todos los productos únicos del combo
    const productosDelCombo = comboActivo.productos || [];
    const productosFaltantes = productosDelCombo.filter((prodCombo) => {
      return !productosComboIngresados.some(
        (escaneado) => escaneado.nombre.toLowerCase() === prodCombo.nombre.toLowerCase()
      );
    });

    const finalizarCombo = () => {
      const comboCompleto = {
        id: `combo-${comboActivo.ID || comboActivo.id}-${Date.now()}`,
        id_combo: comboActivo.ID || comboActivo.id,
        nombre: comboActivo.nombre,
        precio_oferta: Number(comboActivo.precio_oferta || 0),
        tipo: "combo",
        cantidad: 1,
        productos_escaneados: [...productosComboIngresados],
      };

      setProductosSeleccionados((prev) => [...prev, comboCompleto]);
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
        mensaje: `Faltan productos por escanear:\n${nombres}\n\n¿Desea agregar el combo de todos modos?`,
        tipo: "warning",
        soloAceptar: false,
        onConfirm: () => { setShowConfirmModal(false); setConfirmModalData(null); finalizarCombo(); },
      });
      setShowConfirmModal(true);
      return;
    }

    finalizarCombo();
  }

  function removerProducto(productId) {
    setProductosSeleccionados((prev) => prev.filter((p) => p.id !== productId));
  }

  // Función para calcular cuánto stock de un producto ya se consume
  // Incluye: lista actual del miembro + otros miembros del grupo (no guardados)
  function calcularStockConsumidoEnLista(nombreProducto, excluirItemId = null) {
    const consumidoLocal = calcularStockConsumidoEnListaLocal(
      nombreProducto, productosSeleccionadosRef.current, excluirItemId
    );
    const consumidoOtrosMiembros = calcularStockConsumidoEnOtrosMiembros(
      nombreProducto, miembrosGrupo, miembroEnEdicion
    );
    return consumidoLocal + consumidoOtrosMiembros;
  }

  // Función para actualizar cantidad de un producto
  function actualizarCantidad(productId, nuevaCantidad) {
    const cantidad = parseInt(nuevaCantidad) || 1;

    setProductosSeleccionados((prev) =>
      prev.map((item) => {
        if (item.id === productId) {
          if (cantidad < 1) {
            return { ...item, cantidad: 1 };
          }

          // Combos: validar stock cruzado de cada producto escaneado
          if (item.tipo === "combo") {
            if (item.productos_escaneados && item.productos_escaneados.length > 0) {
              for (const prod of item.productos_escaneados) {
                const consumidoPorOtros = calcularStockConsumidoEnLista(prod.nombre, item.id);
                let stockMax = (prod.stock || 0) - consumidoPorOtros;

                // Validación cruzada por fecha
                if (fechaEventoGrupo && prod.id_producto) {
                  const disponibilidadFecha = calcularStockDisponiblePorFecha(
                    prod.id_producto, prod.stock || 0, fechaEventoGrupo, todasLasReservas, null
                  );
                  stockMax = disponibilidadFecha.stockDisponible - consumidoPorOtros;
                }

                if (cantidad > stockMax) {
                  toast.warning(
                    `No se puede aumentar. "${prod.nombre}" tiene stock disponible: ${Math.max(0, stockMax)}`
                  );
                  return { ...item, cantidad: Math.max(1, stockMax) };
                }
              }
            }
            return { ...item, cantidad };
          }

          // Individual: validar stock cruzado + fecha
          const consumidoPorOtros = calcularStockConsumidoEnLista(item.nombre, item.id);
          let stockMax = (item.stock || 1) - consumidoPorOtros;

          // Validación cruzada por fecha
          if (fechaEventoGrupo && item.id_producto) {
            const disponibilidadFecha = calcularStockDisponiblePorFecha(
              item.id_producto, item.stock || 0, fechaEventoGrupo, todasLasReservas, null
            );
            stockMax = disponibilidadFecha.stockDisponible - consumidoPorOtros;
          }

          if (cantidad > stockMax) {
            mostrarAlertaStock(`Stock insuficiente. "${item.nombre}" disponible: ${Math.max(0, stockMax)}`);
            return { ...item, cantidad: Math.max(1, stockMax) };
          }
          return { ...item, cantidad };
        }
        return item;
      })
    );
  }

  // ==================== FUNCIONES PAGOS ====================
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

    const nuevoPago = {
      id: Date.now(),
      id_pago: metodoPago.ID || metodoPago.id,
      nombre: metodoPago.nombre,
      monto: parseFloat(monto),
      descripcion: descripcion || "",
    };

    setPagosAgregados((prev) => [...prev, nuevoPago]);
  }

  function removerMetodoPago(pagoId) {
    setPagosAgregados((prev) => prev.filter((p) => p.id !== pagoId));
  }

  // ==================== FUNCIONES MIEMBRO ====================
  const onSubmitMiembro = (data) => {
    if (!fechaEventoGrupo) {
      toast.warning(
        "Debe ingresar la fecha del evento del grupo en la parte superior",
      );
      return;
    }

    if (productosSeleccionados.length === 0) {
      toast.warning("Debe agregar al menos un producto o combo");
      return;
    }

    if (pagosAgregados.length === 0) {
      toast.warning("Debe agregar al menos un método de pago");
      return;
    }

    const totalPagos = pagosAgregados.reduce((sum, p) => sum + p.monto, 0);
    if (totalPagos !== adelanto) {
      toast.warning("El total de pagos debe ser igual al adelanto");
      return;
    }

    // Validar que el DNI no esté duplicado en la lista de miembros
    const dniIngresado = data.dni?.trim();
    if (dniIngresado) {
      const miembroDuplicado = miembrosGrupo.find((m) => m.dni === dniIngresado);
      if (miembroDuplicado) {
        toast.error(`El cliente con DNI ${dniIngresado} ya está en la lista del grupo (${miembroDuplicado.nombre} ${miembroDuplicado.apellidos}). No se puede agregar el mismo cliente dos veces.`);
        return;
      }
    }

    const nuevoMiembro = {
      id: Date.now(),
      clienteExistente: clienteExistenteMiembro,
      dni: data.dni,
      nombre: data.nombre,
      apellidos: data.apellidos,
      telefono: data.telefono,
      correo: data.correo || "",
      direccion: data.direccion || "",
      fechaEvento: fechaEventoGrupo, // Usa la fecha del grupo
      estado: data.estadoMiembro,
      descripcion: data.descripcionMiembro || "",
      productos: [...productosSeleccionados],
      pagos: [...pagosAgregados],
      adelanto: adelanto,
      total: costoTotal,
      saldo: costoTotal - adelanto,
      // Guardar imagen para crear cliente con foto
      imagenFile: imagenMiembro,
      imagenPreview: imagenMiembroPreview,
    };

    setMiembrosGrupo((prev) => [...prev, nuevoMiembro]);

    // Limpiar formulario del miembro
    resetMiembro();
    setProductosSeleccionados([]);
    setPagosAgregados([]);
    setAdelanto(0);
    setCostoTotal(0);
    setDatosReniecMiembro(null);
    setClienteExistenteMiembro(null);
    setBarcode("");
    setMiembroEnEdicion(null); // Limpiar modo edición
    setImagenMiembro(null);
    setImagenMiembroPreview(null);
  };

  function removerMiembro(miembroId) {
    setMiembrosGrupo((prev) => prev.filter((m) => m.id !== miembroId));
  }

  function editarMiembro(miembro) {
    // Cargar datos del miembro en el formulario
    setValueMiembro("dni", miembro.dni);
    setValueMiembro("nombre", miembro.nombre);
    setValueMiembro("apellidos", miembro.apellidos);
    setValueMiembro("telefono", miembro.telefono);
    setValueMiembro("correo", miembro.correo || "");
    setValueMiembro("direccion", miembro.direccion || "");
    setValueMiembro("estadoMiembro", miembro.estado);
    setValueMiembro("descripcionMiembro", miembro.descripcion || "");

    setProductosSeleccionados([...miembro.productos]);
    setPagosAgregados([...miembro.pagos]);
    setAdelanto(miembro.adelanto);
    setCostoTotal(miembro.total);
    setClienteExistenteMiembro(miembro.clienteExistente);

    // Marcar que estamos editando
    setMiembroEnEdicion(miembro.id);

    // Remover de la lista (se volverá a agregar al guardar)
    setMiembrosGrupo((prev) => prev.filter((m) => m.id !== miembro.id));

    // Scroll al formulario de miembro
    setTimeout(() => {
      document
        .getElementById("formulario-miembro")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  function cambiarEstadoMiembro(miembroId, nuevoEstado) {
    const miembro = miembrosGrupo.find((m) => m.id === miembroId);
    const nombreMiembro = miembro?.clienteNombre || miembro?.nombre || "este miembro";
    const estadoActual = (miembro?.estado || "reservado").toUpperCase();

    setConfirmModalData({
      titulo: "Cambiar Estado",
      mensaje: `¿Cambiar el estado de "${nombreMiembro}" de "${estadoActual}" a "${nuevoEstado.toUpperCase()}"?`,
      tipo: "info",
      onConfirm: () => {
        setShowConfirmModal(false);
        setConfirmModalData(null);
        setMiembrosGrupo((prev) =>
          prev.map((m) => (m.id === miembroId ? { ...m, estado: nuevoEstado } : m)),
        );
      },
    });
    setShowConfirmModal(true);
  }

  // Función para abrir el modal del responsable con datos precargados si ya existe
  function abrirModalResponsable() {
    // Si ya hay un responsable asignado, precargar sus datos en el formulario
    if (responsable) {
      setValueResponsable("dni", responsable.dni || responsable.DNI || "");
      setValueResponsable(
        "nombre",
        responsable.nombre || responsable.Nombre || "",
      );
      setValueResponsable(
        "apellidos",
        responsable.apellidos || responsable.Apellidos || "",
      );
      setValueResponsable(
        "telefono",
        responsable.telefono || responsable.Telefono || "",
      );
      setValueResponsable(
        "direccion",
        responsable.direccion || responsable.Direccion || "",
      );
      // Marcar como cliente existente
      setClienteExistenteResponsable(responsable);
    } else {
      // Si no hay responsable, limpiar el formulario
      resetResponsable();
      setClienteExistenteResponsable(null);
    }
    setImagenResponsable(null);
    setImagenResponsablePreview(null);
    setShowResponsableModal(true);
  }

  // ==================== FUNCIÓN GUARDAR GRUPO ====================
  function fechaInputToISO(fechaString) {
    if (!fechaString) return null;
    return `${fechaString}T00:00:00Z`;
  }

  const onSubmitGrupo = async (data) => {
    if (!responsable) {
      toast.warning("Debe asignar un responsable del grupo");
      return;
    }

    if (miembrosGrupo.length === 0) {
      toast.warning("Debe agregar al menos un miembro al grupo");
      return;
    }

    try {
      setLoading(true);

      // Validación de stock por fecha antes de guardar (datos frescos)
      const fechaGrupo = data.fechaEventoGrupo;
      if (fechaGrupo) {
        const [resReservasFrescas, resProductosFrescos] = await Promise.all([
          fetchAuth(`${API_BASE}/reservas?incluir_grupales=true`),
          fetchAuth(`${API_BASE}/productos`),
        ]);
        const reservasFrescas = resReservasFrescas.ok
          ? filtrarReservasActivas(await resReservasFrescas.json())
          : [];
        const productosFrescos = resProductosFrescos.ok
          ? await resProductosFrescos.json()
          : [];

        // Acumular consumo de TODOS los miembros del grupo por producto
        const consumoPorProducto = {};
        for (const miembro of miembrosGrupo) {
          for (const item of miembro.productos || []) {
            if (item.tipo !== "individual") continue;
            const key = item.id_producto;
            consumoPorProducto[key] = (consumoPorProducto[key] || 0) + (item.cantidad || 1);
          }
        }

        const productosConProblema = [];
        for (const [idProd, cantidadTotal] of Object.entries(consumoPorProducto)) {
          const idProducto = parseInt(idProd);
          const prodFresco = productosFrescos.find(
            (p) => (p.ID || p.id) === idProducto
          );
          if (!prodFresco) continue;
          const stockActual = prodFresco.stock || 0;
          const disponibilidad = calcularStockDisponiblePorFecha(
            idProducto, stockActual, fechaGrupo, reservasFrescas, null
          );
          if (cantidadTotal > disponibilidad.stockDisponible) {
            productosConProblema.push(
              `"${prodFresco.nombre}": necesitas ${cantidadTotal}, disponible: ${disponibilidad.stockDisponible}`
            );
          }
        }
        if (productosConProblema.length > 0) {
          mostrarAlertaStock(
            `Stock insuficiente para la fecha ${fechaGrupo}:\n${productosConProblema.join("\n")}`,
            "error"
          );
          setLoading(false);
          return;
        }
      }

      const grupoData = {
        responsable_id: responsable.ID || responsable.id,
        nombre_grupo: data.nombreGrupo,
        fecha_evento: fechaInputToISO(data.fechaEventoGrupo),
        estado: data.estadoGrupo,
        descripcion: data.descripcionGrupo || "",
      };

      let idGrupo;

      // ========== MODO EDICIÓN ==========
      if (grupoEnEdicion) {
        // Actualizar el grupo existente
        const grupoResponse = await fetchAuth(
          `${API_BASE}/reservas-grupo/${grupoEnEdicion}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(grupoData),
          },
        );

        if (!grupoResponse.ok) throw new Error("Error al actualizar grupo");
        idGrupo = grupoEnEdicion;

        // Para cada miembro, verificar si es existente (actualizar) o nuevo (crear)
        for (const miembro of miembrosGrupo) {
          let idCliente;

          // Obtener o crear cliente
          if (miembro.clienteExistente) {
            idCliente =
              miembro.clienteExistente.ID || miembro.clienteExistente.id;

            // Actualizar datos del cliente si hay datos nuevos
            const datosActualizar = {};
            if (miembro.telefono && miembro.telefono !== (miembro.clienteExistente.telefono || "")) {
              datosActualizar.telefono = miembro.telefono;
            }
            if (miembro.direccion && miembro.direccion !== (miembro.clienteExistente.direccion || "")) {
              datosActualizar.direccion = miembro.direccion;
            }
            if (miembro.correo && miembro.correo !== (miembro.clienteExistente.correo || "")) {
              datosActualizar.correo = miembro.correo;
            }
            if (miembro.nombre && miembro.nombre !== (miembro.clienteExistente.nombre || "")) {
              datosActualizar.nombre = miembro.nombre;
            }
            if (miembro.apellidos && miembro.apellidos !== (miembro.clienteExistente.apellidos || "")) {
              datosActualizar.apellidos = miembro.apellidos;
            }

            if (miembro.imagenFile) {
              const formData = new FormData();
              Object.entries(datosActualizar).forEach(([key, value]) => {
                formData.append(key, value);
              });
              formData.append("imagen", await comprimirImagen(miembro.imagenFile));
              try {
                await fetchAuth(`${API_BASE}/clientes/${idCliente}`, {
                  method: "PUT",
                  body: formData,
                });
              } catch (e) {
              }
            } else if (Object.keys(datosActualizar).length > 0) {
              try {
                await fetchAuth(`${API_BASE}/clientes/${idCliente}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(datosActualizar),
                });
              } catch (e) {
              }
            }
          } else {
            const resClientes = await fetchAuth(`${API_BASE}/clientes`);
            const clientes = await resClientes.json();
            const clienteExiste = clientes.find((c) => c.dni === miembro.dni);

            if (clienteExiste) {
              idCliente = clienteExiste.ID || clienteExiste.id;
            } else {
              // Crear cliente - usar FormData si tiene imagen
              let clienteResponse;
              if (miembro.imagenFile) {
                const formData = new FormData();
                formData.append("nombre", miembro.nombre);
                formData.append("apellidos", miembro.apellidos);
                formData.append("dni", miembro.dni);
                formData.append("telefono", miembro.telefono);
                formData.append("correo", miembro.correo || "");
                formData.append("direccion", miembro.direccion || "");
                formData.append("imagen", await comprimirImagen(miembro.imagenFile));

                clienteResponse = await fetchAuth(`${API_BASE}/clientes`, {
                  method: "POST",
                  body: formData,
                });
              } else {
                clienteResponse = await fetchAuth(`${API_BASE}/clientes`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    nombre: miembro.nombre,
                    apellidos: miembro.apellidos,
                    dni: miembro.dni,
                    telefono: miembro.telefono,
                    correo: miembro.correo || "",
                    direccion: miembro.direccion || "",
                  }),
                });
              }
              if (!clienteResponse.ok)
                throw new Error("Error al crear cliente");
              const clienteCreado = await clienteResponse.json();
              idCliente = clienteCreado.ID || clienteCreado.id;
            }
          }

          const reservaData = {
            id_cliente: idCliente,
            id_empleado: 1,
            id_pago: miembro.pagos[0]?.id_pago || 1,
            id_grupo_reservas: idGrupo,
            fecha_evento: fechaInputToISO(miembro.fechaEvento),
            descripcion: miembro.descripcion || "",
            adelanto: miembro.adelanto,
            estado: miembro.estado,
            total: miembro.total,
          };

          let idReserva;

          // Si el miembro tiene idReservaOriginal, actualizar; sino, crear
          if (miembro.idReservaOriginal) {
            const reservaResponse = await fetchAuth(
              `${API_BASE}/reservas/${miembro.idReservaOriginal}`,
              {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(reservaData),
              },
            );
            if (!reservaResponse.ok)
              throw new Error("Error al actualizar reserva");
            idReserva = miembro.idReservaOriginal;
          } else {
            const reservaResponse = await fetchAuth(`${API_BASE}/reservas`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(reservaData),
            });
            if (!reservaResponse.ok) throw new Error("Error al crear reserva");
            const reservaCreada = await reservaResponse.json();
            idReserva = reservaCreada.ID || reservaCreada.id;

            // Solo crear detalles para reservas nuevas
            for (const item of miembro.productos) {
              const precioUnitario = item.tipo === "combo" ? item.precio_oferta : item.precio_alquiler;
              const cantidad = item.cantidad || 1;
              const detalleData = {
                id_reserva: idReserva,
                id_producto:
                  item.tipo === "individual" ? item.id_producto : null,
                id_combo: item.tipo === "combo" ? item.id_combo : null,
                cantidad: cantidad,
                precio_unitario: precioUnitario,
                total: precioUnitario * cantidad,
                descripcion: item.descripcion || "",
              };
              const detalleResponse = await fetchAuth(`${API_BASE}/detalles-reserva`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(detalleData),
              });

              // Si es combo, crear registros DetalleComboReserva para cada producto escaneado
              if (item.tipo === "combo" && item.productos_escaneados) {
                const detalleCreado = await detalleResponse.json();
                const idDetalleReserva = detalleCreado.ID || detalleCreado.id;

                for (const prod of item.productos_escaneados) {
                  await fetchAuth(`${API_BASE}/detalles-combo-reserva`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      id_detalle_reserva: idDetalleReserva,
                      id_producto: prod.id_producto,
                      cantidad: 1,
                      descripcion: "",
                    }),
                  });
                }
              }
            }

            // Solo crear modos de pago para reservas nuevas
            for (const pago of miembro.pagos) {
              if (!pago.id.toString().startsWith("pago_existente_")) {
                const modoPagoData = {
                  id_reserva: idReserva,
                  id_venta: null,
                  id_pago: pago.id_pago,
                  monto: pago.monto,
                  descripcion: pago.descripcion || "",
                };
                await fetchAuth(`${API_BASE}/modos-pago`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(modoPagoData),
                });
              }
            }
          }
        }

        toast.success("Reserva grupal actualizada exitosamente");
      } else {
        // ========== MODO CREACIÓN ==========
        const grupoResponse = await fetchAuth(`${API_BASE}/reservas-grupo`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(grupoData),
        });

        if (!grupoResponse.ok) throw new Error("Error al crear grupo");
        const grupoCreado = await grupoResponse.json();
        idGrupo = grupoCreado.ID || grupoCreado.id;

        // Para cada miembro, crear cliente (si no existe) y reserva
        for (const miembro of miembrosGrupo) {
          let idCliente;

          if (miembro.clienteExistente) {
            idCliente =
              miembro.clienteExistente.ID || miembro.clienteExistente.id;

            // Actualizar datos del cliente si hay datos nuevos
            const datosActualizar = {};
            if (miembro.telefono && miembro.telefono !== (miembro.clienteExistente.telefono || "")) {
              datosActualizar.telefono = miembro.telefono;
            }
            if (miembro.direccion && miembro.direccion !== (miembro.clienteExistente.direccion || "")) {
              datosActualizar.direccion = miembro.direccion;
            }
            if (miembro.correo && miembro.correo !== (miembro.clienteExistente.correo || "")) {
              datosActualizar.correo = miembro.correo;
            }
            if (miembro.nombre && miembro.nombre !== (miembro.clienteExistente.nombre || "")) {
              datosActualizar.nombre = miembro.nombre;
            }
            if (miembro.apellidos && miembro.apellidos !== (miembro.clienteExistente.apellidos || "")) {
              datosActualizar.apellidos = miembro.apellidos;
            }

            if (miembro.imagenFile) {
              const formData = new FormData();
              Object.entries(datosActualizar).forEach(([key, value]) => {
                formData.append(key, value);
              });
              formData.append("imagen", await comprimirImagen(miembro.imagenFile));
              try {
                await fetchAuth(`${API_BASE}/clientes/${idCliente}`, {
                  method: "PUT",
                  body: formData,
                });
              } catch (e) {
              }
            } else if (Object.keys(datosActualizar).length > 0) {
              try {
                await fetchAuth(`${API_BASE}/clientes/${idCliente}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(datosActualizar),
                });
              } catch (e) {
              }
            }
          } else {
            const resClientes = await fetchAuth(`${API_BASE}/clientes`);
            const clientes = await resClientes.json();
            const clienteExiste = clientes.find((c) => c.dni === miembro.dni);

            if (clienteExiste) {
              idCliente = clienteExiste.ID || clienteExiste.id;
            } else {
              // Crear cliente - usar FormData si tiene imagen
              let clienteResponse;
              if (miembro.imagenFile) {
                const formData = new FormData();
                formData.append("nombre", miembro.nombre);
                formData.append("apellidos", miembro.apellidos);
                formData.append("dni", miembro.dni);
                formData.append("telefono", miembro.telefono);
                formData.append("correo", miembro.correo || "");
                formData.append("direccion", miembro.direccion || "");
                formData.append("imagen", await comprimirImagen(miembro.imagenFile));

                clienteResponse = await fetchAuth(`${API_BASE}/clientes`, {
                  method: "POST",
                  body: formData,
                });
              } else {
                clienteResponse = await fetchAuth(`${API_BASE}/clientes`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    nombre: miembro.nombre,
                    apellidos: miembro.apellidos,
                    dni: miembro.dni,
                    telefono: miembro.telefono,
                    correo: miembro.correo || "",
                    direccion: miembro.direccion || "",
                  }),
                });
              }

              if (!clienteResponse.ok)
                throw new Error("Error al crear cliente");
              const clienteCreado = await clienteResponse.json();
              idCliente = clienteCreado.ID || clienteCreado.id;
            }
          }

          const reservaData = {
            id_cliente: idCliente,
            id_empleado: 1,
            id_pago: miembro.pagos[0]?.id_pago || 1,
            id_grupo_reservas: idGrupo,
            fecha_evento: fechaInputToISO(miembro.fechaEvento),
            descripcion: miembro.descripcion || "",
            adelanto: miembro.adelanto,
            estado: miembro.estado,
            total: miembro.total,
          };

          const reservaResponse = await fetchAuth(`${API_BASE}/reservas`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(reservaData),
          });

          if (!reservaResponse.ok) throw new Error("Error al crear reserva");
          const reservaCreada = await reservaResponse.json();
          const idReserva = reservaCreada.ID || reservaCreada.id;

          // Crear detalles de la reserva (productos)
          for (const item of miembro.productos) {
            const precioUnitario = item.tipo === "combo" ? item.precio_oferta : item.precio_alquiler;
            const cantidad = item.cantidad || 1;
            const detalleData = {
              id_reserva: idReserva,
              id_producto: item.tipo === "individual" ? item.id_producto : null,
              id_combo: item.tipo === "combo" ? item.id_combo : null,
              cantidad: cantidad,
              precio_unitario: precioUnitario,
              total: precioUnitario * cantidad,
              descripcion: item.descripcion || "",
            };

            const detalleResponse = await fetchAuth(`${API_BASE}/detalles-reserva`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(detalleData),
            });

            // Si es combo, crear registros DetalleComboReserva para cada producto escaneado
            if (item.tipo === "combo" && item.productos_escaneados) {
              const detalleCreado = await detalleResponse.json();
              const idDetalleReserva = detalleCreado.ID || detalleCreado.id;

              for (const prod of item.productos_escaneados) {
                await fetchAuth(`${API_BASE}/detalles-combo-reserva`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    id_detalle_reserva: idDetalleReserva,
                    id_producto: prod.id_producto,
                    cantidad: 1,
                    descripcion: "",
                  }),
                });
              }
            }
          }

          // Crear modos de pago
          for (const pago of miembro.pagos) {
            const modoPagoData = {
              id_reserva: idReserva,
              id_venta: null,
              id_pago: pago.id_pago,
              monto: pago.monto,
              descripcion: pago.descripcion || "",
            };

            await fetchAuth(`${API_BASE}/modos-pago`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(modoPagoData),
            });
          }
        }

        toast.success("Reserva grupal guardada exitosamente");
      }

      // Limpiar todo
      reset();
      setResponsable(null);
      setMiembrosGrupo([]);
      setProductosSeleccionados([]);
      setPagosAgregados([]);
      setAdelanto(0);
      setCostoTotal(0);
      setGrupoEnEdicion(null);
      setClienteExistenteResponsable(null);

      // Recargar lista y cambiar a pestaña lista
      fetchReservasGrupales();
      setPestanaActiva("lista");
    } catch (error) {
      toast.error("Error al guardar la reserva grupal");
    } finally {
      setLoading(false);
    }
  };

  // ==================== FUNCIONES LISTA ====================
  function eliminarGrupo(grupoId) {
    setMotivoAccion("");
    setConfirmModalData({
      titulo: "Eliminar grupo",
      mensaje: "¿Eliminar este grupo y todas sus reservas? Los pagos realizados se mantendrán como ingreso.",
      tipo: "danger",
      conMotivo: true,
      onConfirm: async (motivo) => {
        if (!motivo || !motivo.trim()) { toast.warning("Debes indicar el motivo de la eliminación"); return; }
        setShowConfirmModal(false);
        setConfirmModalData(null);
        try {
          setLoading(true);

          const grupo = reservasGrupales.find((g) => (g.ID || g.id) === grupoId);
          if (grupo && grupo.miembros) {
            for (const miembro of grupo.miembros) {
              await fetchAuth(`${API_BASE}/reservas/${miembro.ID || miembro.id}?motivo=${encodeURIComponent(motivo.trim())}`, {
                method: "DELETE",
              });
            }
          }

          const response = await fetchAuth(
            `${API_BASE}/reservas-grupo/${grupoId}?motivo=${encodeURIComponent(motivo.trim())}`,
            {
              method: "DELETE",
            },
          );

          if (!response.ok) throw new Error("Error al eliminar");

          toast.success("Grupo eliminado exitosamente");
          fetchReservasGrupales();
        } catch (error) {
          toast.error("Error al eliminar el grupo");
        } finally {
          setLoading(false);
        }
      },
    });
    setShowConfirmModal(true);
  }

  function anularGrupo(grupoId) {
    setMotivoAccion("");
    setConfirmModalData({
      titulo: "Anular Grupo",
      mensaje: "¿Anular este grupo y todas sus reservas? Se revertirán los pagos realizados y quedará como registro histórico.",
      tipo: "danger",
      conMotivo: true,
      onConfirm: async (motivo) => {
        if (!motivo || !motivo.trim()) { toast.warning("Debes indicar el motivo de la anulación"); return; }
        setShowConfirmModal(false);
        setConfirmModalData(null);
        try {
          setLoading(true);

          const grupo = reservasGrupales.find((g) => (g.ID || g.id) === grupoId);
          if (grupo && grupo.miembros) {
            for (const miembro of grupo.miembros) {
              const miembroEstado = (miembro.estado || "").toLowerCase();
              if (miembroEstado === "reservado" || miembroEstado === "listo") {
                await fetchAuth(`${API_BASE}/reservas/${miembro.ID || miembro.id}/estado`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ estado: "anulado", motivo: motivo.trim() }),
                });
              }
            }
          }

          // Anular el grupo directamente con motivo
          await fetchAuth(`${API_BASE}/reservas-grupo/${grupoId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...(grupo || {}),
              estado: "anulado",
              motivo_anulacion: motivo.trim(),
            }),
          });

          toast.success("Grupo anulado exitosamente. Los pagos han sido revertidos.");
          fetchReservasGrupales();
        } catch (error) {
          toast.error("Error al anular el grupo");
        } finally {
          setLoading(false);
        }
      },
    });
    setShowConfirmModal(true);
  }

  function eliminarMiembroDelGrupo(miembroId, grupoId) {
    setMotivoAccion("");
    setConfirmModalData({
      titulo: "Anular Miembro",
      mensaje: "¿Anular esta reserva individual? Se revertirán los pagos realizados y quedará como registro histórico.",
      tipo: "danger",
      conMotivo: true,
      onConfirm: async (motivo) => {
        if (!motivo || !motivo.trim()) { toast.warning("Debes indicar el motivo de la anulación"); return; }
        setShowConfirmModal(false);
        setConfirmModalData(null);
        try {
          setLoading(true);

          await fetchAuth(`${API_BASE}/reservas/${miembroId}/estado`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ estado: "anulado", motivo: motivo.trim() }),
          });

          toast.success("Miembro anulado exitosamente. Los pagos han sido revertidos.");
          fetchReservasGrupales();
        } catch (error) {
          toast.error("Error al anular el miembro");
        } finally {
          setLoading(false);
        }
      },
    });
    setShowConfirmModal(true);
  }

  function cambiarEstadoGrupo(grupoId, nuevoEstado) {
    const grupo = reservasGrupales.find((g) => (g.ID || g.id) === grupoId);
    if (!grupo) return;

    // Interceptar cambio a "entregado": verificar pagos de TODOS los miembros
    if (nuevoEstado === "entregado") {
      const miembrosPendientes = (grupo.miembros || [])
        .filter(m => {
          const saldo = parseFloat(m.total || 0) - parseFloat(m.adelanto || 0);
          return saldo > 0.01;
        })
        .map(m => {
          const total = parseFloat(m.total || 0);
          const adelantoM = parseFloat(m.adelanto || 0);
          const efectivo = metodosPago.find(
            mp => (mp.nombre || mp.Nombre || "").toLowerCase().includes("efectivo")
          );
          return {
            id: m.ID || m.id,
            nombre: `${m.cliente?.nombre || m.cliente?.Nombre || ""} ${m.cliente?.apellidos || m.cliente?.Apellidos || ""}`.trim() || `Miembro #${m.ID || m.id}`,
            total,
            adelanto: adelantoM,
            saldo: total - adelantoM,
            metodoPagoId: efectivo ? String(efectivo.ID || efectivo.id) : "",
            miembroData: m,
          };
        });

      if (miembrosPendientes.length > 0) {
        setPagoGrupoData({
          grupoId,
          grupoNombre: grupo.nombre_grupo || grupo.NombreGrupo || "",
          miembrosPendientes,
          grupoData: grupo,
        });
        setShowPagoGrupoModal(true);
        return;
      }
    }

    const estadoActual = (grupo.estado || "reservado").toUpperCase();
    setConfirmModalData({
      titulo: "Cambiar Estado del Grupo",
      mensaje: `¿Está seguro de cambiar el estado del grupo "${grupo.nombre_grupo || grupo.NombreGrupo || ""}" de "${estadoActual}" a "${nuevoEstado.toUpperCase()}"?`,
      tipo: "info",
      onConfirm: async () => {
        setShowConfirmModal(false);
        setConfirmModalData(null);
        try {
          const response = await fetchAuth(
            `${API_BASE}/reservas-grupo/${grupoId}`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...grupo,
                estado: nuevoEstado,
              }),
            },
          );

          if (!response.ok) throw new Error("Error");
          toast.success(`Estado del grupo cambiado a: ${nuevoEstado.toUpperCase()}`);
          fetchReservasGrupales();
        } catch (error) {
          toast.error("Error al cambiar estado");
        }
      },
    });
    setShowConfirmModal(true);
  }

  async function completarPagosGrupoYEntregar() {
    if (!pagoGrupoData) return;
    const { grupoId, miembrosPendientes, grupoData } = pagoGrupoData;

    // Validar que todos tengan método de pago seleccionado
    const sinMetodo = miembrosPendientes.filter(m => !m.metodoPagoId);
    if (sinMetodo.length > 0) {
      toast.warning("Seleccione método de pago para todos los miembros");
      return;
    }

    try {
      setLoading(true);

      // Procesar cada miembro pendiente
      for (const miembro of miembrosPendientes) {
        // 1. Crear registro de pago
        const pagoRes = await fetchAuth(`${API_BASE}/modos-pago`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id_reserva: miembro.id,
            id_pago: parseInt(miembro.metodoPagoId),
            monto: miembro.saldo,
            descripcion: "Pago restante al entregar grupo",
          }),
        });
        if (!pagoRes.ok) throw new Error(`Error al registrar pago de ${miembro.nombre}`);

        // 2. Actualizar miembro: adelanto = total + estado = entregado
        const resUpdate = await fetchAuth(`${API_BASE}/reservas/${miembro.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...miembro.miembroData,
            adelanto: miembro.total,
            estado: "entregado",
          }),
        });
        if (!resUpdate.ok) throw new Error(`Error al actualizar ${miembro.nombre}`);
      }

      // 3. Cambiar estado del grupo
      const grupoRes = await fetchAuth(`${API_BASE}/reservas-grupo/${grupoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...grupoData,
          estado: "entregado",
        }),
      });
      if (!grupoRes.ok) throw new Error("Error al actualizar estado del grupo");

      toast.success("Pagos registrados y grupo cambiado a ENTREGADO");
      setShowPagoGrupoModal(false);
      setPagoGrupoData(null);
      fetchReservasGrupales();
    } catch (error) {
      toast.error(error.message || "Error al completar pagos del grupo");
    } finally {
      setLoading(false);
    }
  }

  async function verDetalleGrupo(grupo) {
    setGrupoDetalle(grupo);
    setShowModalDetalle(true);
  }

  // ==================== FUNCIONES EDITAR MIEMBRO INDIVIDUAL ====================
  function abrirModalEditarMiembro(miembro) {
    setMiembroParaEditar({
      ...miembro,
      id: miembro.ID || miembro.id,
      cliente: miembro.cliente || {},
      estado: miembro.estado || "reservado",
      adelanto: miembro.adelanto || 0,
      total: miembro.total || 0,
      descripcion: miembro.descripcion || "",
    });
    setShowModalEditarMiembro(true);
  }

  async function guardarEdicionMiembro() {
    if (!miembroParaEditar) return;

    try {
      setLoading(true);
      const miembroId = miembroParaEditar.id;

      // Actualizar la reserva (miembro)
      const response = await fetchAuth(`${API_BASE}/reservas/${miembroId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_cliente:
            miembroParaEditar.cliente?.ID ||
            miembroParaEditar.cliente?.id ||
            miembroParaEditar.id_cliente,
          id_empleado: miembroParaEditar.id_empleado || 1,
          id_pago: miembroParaEditar.id_pago || 1,
          id_grupo_reservas: miembroParaEditar.id_grupo_reservas,
          fecha_evento: miembroParaEditar.fecha_evento,
          descripcion: miembroParaEditar.descripcion,
          adelanto: miembroParaEditar.adelanto,
          estado: miembroParaEditar.estado,
          total: miembroParaEditar.total,
        }),
      });

      if (!response.ok) throw new Error("Error al actualizar miembro");

      toast.success("Miembro actualizado exitosamente");
      setShowModalEditarMiembro(false);
      setMiembroParaEditar(null);
      fetchReservasGrupales();
    } catch (error) {
      toast.error("Error al actualizar el miembro");
    } finally {
      setLoading(false);
    }
  }

  function cambiarEstadoMiembroEnLista(miembroId, nuevoEstado, grupoId) {
    // Buscar el miembro en el grupo
    const grupo = reservasGrupales.find((g) => (g.ID || g.id) === grupoId);
    if (!grupo) return;

    const miembro = grupo.miembros.find((m) => (m.ID || m.id) === miembroId);
    if (!miembro) return;

    const nombreMiembro = `${miembro.cliente?.nombre || miembro.cliente?.Nombre || ""} ${miembro.cliente?.apellidos || miembro.cliente?.Apellidos || ""}`.trim();
    const estadoActual = (miembro.estado || "reservado").toUpperCase();

    // Interceptar cambio a "entregado": verificar pago completo
    if (nuevoEstado === "entregado") {
      const total = parseFloat(miembro.total || 0);
      const adelantoActual = parseFloat(miembro.adelanto || 0);
      const saldo = total - adelantoActual;

      if (saldo > 0.01) {
        const efectivo = metodosPago.find(
          m => (m.nombre || m.Nombre || "").toLowerCase().includes("efectivo")
        );
        setPagoCompletarData({
          reservaId: miembroId,
          grupoId,
          clienteNombre: nombreMiembro || `Miembro #${miembroId}`,
          total,
          adelanto: adelantoActual,
          saldo,
          metodoPagoId: efectivo ? String(efectivo.ID || efectivo.id) : "",
          descripcion: "Pago restante al entregar",
          miembroData: miembro,
        });
        setShowPagoCompletarModal(true);
        return;
      }
    }

    setConfirmModalData({
      titulo: "Cambiar Estado del Miembro",
      mensaje: `¿Está seguro de cambiar el estado de "${nombreMiembro || "este miembro"}" de "${estadoActual}" a "${nuevoEstado.toUpperCase()}"?`,
      tipo: "info",
      onConfirm: async () => {
        setShowConfirmModal(false);
        setConfirmModalData(null);
        try {
          const response = await fetchAuth(`${API_BASE}/reservas/${miembroId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...miembro,
              estado: nuevoEstado,
            }),
          });

          if (!response.ok) throw new Error("Error");
          toast.success(`Estado del miembro cambiado a: ${nuevoEstado.toUpperCase()}`);
          fetchReservasGrupales();
        } catch (error) {
          toast.error("Error al cambiar estado del miembro");
        }
      },
    });
    setShowConfirmModal(true);
  }

  async function completarPagoYEntregarMiembro() {
    if (!pagoCompletarData) return;
    const { reservaId, saldo, metodoPagoId, miembroData } = pagoCompletarData;
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

      // 2. Actualizar miembro: adelanto + monto pagado, estado = entregado
      const resUpdate = await fetchAuth(`${API_BASE}/reservas/${reservaId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...miembroData,
          adelanto: parseFloat(miembroData.adelanto || 0) + montoAPagar,
          estado: "entregado",
        }),
      });
      if (!resUpdate.ok) throw new Error("Error al actualizar miembro");

      toast.success("Pago registrado y estado cambiado a ENTREGADO");
      setShowPagoCompletarModal(false);
      setPagoCompletarData(null);
      fetchReservasGrupales();
    } catch (error) {
      toast.error("Error al completar el pago");
    } finally {
      setLoading(false);
    }
  }

  // Función para editar un grupo existente - carga todos los datos en el formulario
  async function editarGrupo(grupo) {
    try {
      setLoading(true);
      const grupoId = grupo.ID || grupo.id;

      // Cargar datos del grupo en el formulario
      setValue("nombreGrupo", grupo.nombre_grupo || grupo.NombreGrupo || "");
      setValue(
        "descripcionGrupo",
        grupo.descripcion || grupo.Descripcion || "",
      );
      setValue("estadoGrupo", grupo.estado?.toLowerCase() || "reservado");

      // Cargar fecha del evento
      const fechaEvento = grupo.fecha_evento || grupo.FechaEvento;
      if (fechaEvento) {
        setValue("fechaEventoGrupo", fechaEvento.split("T")[0]);
      }

      // Cargar responsable
      if (grupo.responsable) {
        setResponsable({
          id: grupo.responsable.ID || grupo.responsable.id,
          nombre: grupo.responsable.nombre || grupo.responsable.Nombre,
          apellidos: grupo.responsable.apellidos || grupo.responsable.Apellidos,
          dni: grupo.responsable.dni || grupo.responsable.DNI,
          telefono: grupo.responsable.telefono || grupo.responsable.Telefono,
        });
        setClienteExistenteResponsable(grupo.responsable);
      }

      // Convertir miembros del grupo al formato del estado miembrosGrupo
      const miembrosConvertidos = [];
      for (const miembro of grupo.miembros || []) {
        const cliente = miembro.cliente || {};
        const detalles = miembro.detalles || [];

        // Convertir detalles a productos
        const productosDelMiembro = detalles
          .map((det, idx) => {
            if (det.combo) {
              return {
                id: `combo_${det.combo.ID || det.combo.id}_${idx}`,
                id_combo: det.combo.ID || det.combo.id,
                nombre: det.combo.nombre || det.combo.Nombre,
                precio_oferta: det.total || det.precio_unitario || 0,
                tipo: "combo",
                imagen: det.combo.imagen || null,
              };
            } else if (det.producto) {
              return {
                id: `prod_${det.producto.ID || det.producto.id}_${idx}`,
                id_producto: det.producto.ID || det.producto.id,
                nombre: det.producto.nombre || det.producto.Nombre,
                precio_alquiler: det.total || det.precio_unitario || 0,
                tipo: "individual",
                imagen: det.producto.imagen || null,
                stock: det.producto.stock || 0,
              };
            }
            return null;
          })
          .filter(Boolean);

        // Crear objeto de pago genérico basado en el adelanto
        const pagosDelMiembro = [];
        if (miembro.adelanto > 0) {
          pagosDelMiembro.push({
            id: `pago_existente_${miembro.ID || miembro.id}`,
            id_pago: miembro.id_pago || 1,
            nombre: "Pago registrado",
            monto: miembro.adelanto || 0,
            descripcion: "",
          });
        }

        miembrosConvertidos.push({
          id: miembro.ID || miembro.id, // Usar el ID real de la reserva
          idReservaOriginal: miembro.ID || miembro.id, // Guardar para actualizar
          clienteExistente: cliente,
          dni: cliente.dni || cliente.DNI || "",
          nombre: cliente.nombre || cliente.Nombre || "",
          apellidos: cliente.apellidos || cliente.Apellidos || "",
          telefono: cliente.telefono || cliente.Telefono || "",
          correo: cliente.correo || cliente.Correo || "",
          direccion: cliente.direccion || cliente.Direccion || "",
          fechaEvento: miembro.fecha_evento?.split("T")[0] || "",
          estado: miembro.estado?.toLowerCase() || "reservado",
          descripcion: miembro.descripcion || "",
          productos: productosDelMiembro,
          pagos: pagosDelMiembro,
          adelanto: miembro.adelanto || 0,
          total: miembro.total || 0,
          saldo: (miembro.total || 0) - (miembro.adelanto || 0),
        });
      }

      // Setear miembros en el estado
      setMiembrosGrupo(miembrosConvertidos);

      // Marcar que estamos editando un grupo
      setGrupoEnEdicion(grupoId);

      // Cambiar a pestaña nueva
      setPestanaActiva("nueva");

      // Scroll al inicio
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      toast.error("Error al cargar los datos del grupo");
    } finally {
      setLoading(false);
    }
  }

  // ==================== FUNCIONES IMPRESIÓN ====================

  // Ticket resumen del grupo (70mm)
  function imprimirTicketGrupo(grupo) {
    const config = configEmpresa || {};
    const responsableNombre = grupo.responsable
      ? `${grupo.responsable.nombre || grupo.responsable.Nombre} ${grupo.responsable.apellidos || grupo.responsable.Apellidos}`
      : "N/A";

    const totalGrupo = (grupo.miembros || []).reduce(
      (sum, m) => sum + (m.total || 0),
      0,
    );
    const adelantoGrupo = (grupo.miembros || []).reduce(
      (sum, m) => sum + (m.adelanto || 0),
      0,
    );

    const contenido = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Ticket Grupal</title>
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
          .line { border-top: 1px dashed #000; margin: 3px 0; }
          .row { display: flex; justify-content: space-between; }
          h2 { font-size: 14px; font-weight: bold; margin: 5px 0; }
          .empresa-nombre { font-size: 15px; font-weight: bold; text-transform: uppercase; }
          .empresa-info { font-size: 11px; }
          .miembro { margin: 5px 0; padding: 3px 0; border-bottom: 1px dotted #000; }
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
          <h2>RESERVA GRUPAL</h2>
          <p>${grupo.nombre_grupo || grupo.NombreGrupo || "Sin nombre"}</p>
        </div>
        <div class="line"></div>
        <div class="row"><span>FECHA EVENTO:</span><span>${formatFechaDDMMYYYY(grupo.fecha_evento || grupo.FechaEvento)}</span></div>
        <div class="row"><span>RESPONSABLE:</span></div>
        <div>${responsableNombre}</div>
        <div class="line"></div>
        <div class="center"><strong>MIEMBROS (${(grupo.miembros || []).length})</strong></div>
        ${(grupo.miembros || [])
          .map(
            (m, i) => {
              const detalles = m.detalles || [];
              return `
          <div class="miembro">
            <div><strong>${i + 1}. ${m.cliente?.nombre || m.cliente?.Nombre || "N/A"} ${m.cliente?.apellidos || m.cliente?.Apellidos || ""}</strong></div>
            ${detalles.map(det => {
              const prod = det.producto || det.Producto || {};
              const combo = det.combo || det.Combo || null;
              const esCombo = !!combo;
              const productosCombo = det.productos_del_combo || det.ProductosDelCombo || [];

              if (esCombo) {
                return `
                <div style="margin:3px 0;font-size:10px;border:1px solid #000;padding:2px 3px;">
                  <div style="font-weight:bold;">COMBO: ${combo.nombre || combo.Nombre || "Combo"} x${det.cantidad || 1} — S/ ${parseFloat(det.total || 0).toFixed(2)}</div>
                  ${productosCombo.length > 0 ? productosCombo.map(prodC => {
                    const attrC = [prodC.talla ? 'T:' + prodC.talla : '', prodC.modelo ? 'M:' + prodC.modelo : '', prodC.color ? 'C:' + prodC.color : ''].filter(Boolean).join(' | ');
                    return `<div style="margin:1px 0;font-size:9px;padding-left:5px;">· ${prodC.nombre || prodC.Nombre || "Producto"}${attrC ? ' (' + attrC + ')' : ''}</div>`;
                  }).join("") : ''}
                </div>`;
              }

              const nombre = prod.nombre || prod.Nombre || "Producto";
              const talla = prod.talla || prod.Talla || '';
              const modelo = prod.modelo || prod.Modelo || '';
              const color = prod.color || prod.Color || '';
              const infoExtra = [talla ? 'T:' + talla : '', modelo ? 'M:' + modelo : '', color ? 'C:' + color : ''].filter(Boolean).join(' | ');
              return `
              <div style="margin:2px 0;font-size:10px;">
                - ${nombre} x${det.cantidad || 1}
                ${infoExtra ? `<br><span style="font-size:9px;">&nbsp;&nbsp;${infoExtra}</span>` : ''}
              </div>`;
            }).join("")}
            <div class="row"><span>Total:</span><span>S/ ${(m.total || 0).toFixed(2)}</span></div>
            <div class="row"><span>Adelanto:</span><span>S/ ${(m.adelanto || 0).toFixed(2)}</span></div>
          </div>
        `;
            },
          )
          .join("")}
        <div class="line"></div>
        <div class="row"><strong>TOTAL GRUPO:</strong><strong>S/ ${totalGrupo.toFixed(2)}</strong></div>
        <div class="row"><strong>ADELANTO GRUPO:</strong><strong>S/ ${adelantoGrupo.toFixed(2)}</strong></div>
        <div class="row"><strong>SALDO GRUPO:</strong><strong>S/ ${(totalGrupo - adelantoGrupo).toFixed(2)}</strong></div>
        <div class="line"></div>
        <div class="center">
          ${config.lema ? `<div style="font-style:italic;margin:5px 0;font-size:10px;">"${config.lema}"</div>` : ''}
          <p>¡Gracias por su preferencia!</p>
          ${config.sitio_web ? `<div style="font-size:9px;">${config.sitio_web}</div>` : ''}
          <div style="font-size:9px;">Impreso: ${new Date().toLocaleString("es-PE")}</div>
        </div>

        ${sucursalActual?.regla_clientes ? `
        <div style="font-size: 10px; text-align: justify; margin-top: 8px; padding-top: 5px; border-top: 1px dashed #000; line-height: 1.3;">
          ${sucursalActual.regla_clientes}
        </div>
        ` : ''}
      </body>
      </html>
    `;

    const ventana = window.open("", "_blank", "width=400,height=600");
    ventana.document.write(contenido);
    ventana.document.close();
    ventana.onload = () => {
      ventana.print();
    };
  }

  // Ticket individual para un miembro específico (70mm)
  function imprimirTicketMiembro(grupo, miembro) {
    const config = configEmpresa || {};
    const clienteNombre = `${miembro.cliente?.nombre || miembro.cliente?.Nombre || "N/A"} ${miembro.cliente?.apellidos || miembro.cliente?.Apellidos || ""}`;
    const clienteDni = miembro.cliente?.dni || miembro.cliente?.DNI || "N/A";
    const detalles = miembro.detalles || [];

    const contenido = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Ticket Individual - ${clienteNombre}</title>
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
          .producto-nombre { }
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
          <h2>COMPROBANTE INDIVIDUAL</h2>
          <p style="font-size: 10px;">Reserva Grupal: ${grupo.nombre_grupo || grupo.NombreGrupo || "Sin nombre"}</p>
        </div>
        <div class="line"></div>

        <div class="row"><span class="bold">CLIENTE:</span></div>
        <div>${clienteNombre}</div>
        <div class="row"><span>DNI:</span><span>${clienteDni}</span></div>
        <div class="row"><span>Teléfono:</span><span>${miembro.cliente?.telefono || miembro.cliente?.Telefono || "N/A"}</span></div>

        <div class="line"></div>
        <div class="row"><span>FECHA EVENTO:</span><span>${formatFechaDDMMYYYY(grupo.fecha_evento || grupo.FechaEvento)}</span></div>

        <div class="line"></div>
        <div class="center"><h3>PRODUCTOS/SERVICIOS</h3></div>

        ${detalles.length > 0 ? detalles.map((det) => {
          const prod = det.producto || det.Producto || {};
          const combo = det.combo || det.Combo || null;
          const esCombo = !!combo;
          const productosCombo = det.productos_del_combo || det.ProductosDelCombo || [];

          if (esCombo) {
            return `
            <div style="border:1px solid #000;padding:3px;margin:3px 0;">
              <div class="producto-nombre">COMBO: ${combo.nombre || combo.Nombre || "Combo"}</div>
              <div class="row">
                <span>${det.cantidad || 1} x S/ ${(det.precio_unitario || det.total / (det.cantidad || 1) || 0).toFixed(2)}</span>
                <span class="bold">S/ ${(det.total || 0).toFixed(2)}</span>
              </div>
              ${productosCombo.length > 0 ? `<div style="margin-top:2px;padding-left:3px;border-top:1px dotted #000;">
                ${productosCombo.map(prodC => {
                  const attrC = [prodC.talla ? 'T:' + prodC.talla : '', prodC.modelo ? 'M:' + prodC.modelo : '', prodC.color ? 'C:' + prodC.color : ''].filter(Boolean).join(' | ');
                  return `<div style="font-size:9px;margin:1px 0;">· ${prodC.nombre || prodC.Nombre || "Producto"}${attrC ? ' (' + attrC + ')' : ''}</div>`;
                }).join("")}
              </div>` : ''}
            </div>`;
          }

          const talla = prod.talla || prod.Talla || '';
          const modelo = prod.modelo || prod.Modelo || '';
          const color = prod.color || prod.Color || '';
          const detallesProd = [talla ? 'T:' + talla : '', modelo ? 'M:' + modelo : '', color ? 'C:' + color : ''].filter(Boolean).join(' | ');
          return `
          <div class="producto">
            <div class="producto-nombre">${prod.nombre || prod.Nombre || "Producto"}</div>
            ${detallesProd ? `<div style="font-size:9px;">${detallesProd}</div>` : ''}
            <div class="row">
              <span>${det.cantidad || 1} x S/ ${(det.precio_unitario || det.total / (det.cantidad || 1) || 0).toFixed(2)}</span>
              <span class="bold">S/ ${(det.total || 0).toFixed(2)}</span>
            </div>
          </div>
        `}).join("") : "<p class='center'>Sin productos</p>"}

        <div class="line-double"></div>
        <div class="total-section">
          <div class="row"><span class="bold">TOTAL:</span><span class="bold">S/ ${(miembro.total || 0).toFixed(2)}</span></div>
          <div class="row"><span>ADELANTO:</span><span>S/ ${(miembro.adelanto || 0).toFixed(2)}</span></div>
          <div class="row" style="text-decoration: underline;"><span class="bold">SALDO PENDIENTE:</span><span class="bold">S/ ${((miembro.total || 0) - (miembro.adelanto || 0)).toFixed(2)}</span></div>
        </div>

        <div class="line"></div>
        <div class="center" style="font-size: 10px;">
          <p>Estado: ${miembro.estado || "Pendiente"}</p>
          ${config.lema ? `<div style="font-style:italic;margin:5px 0;">"${config.lema}"</div>` : ''}
          <p>¡Gracias por su preferencia!</p>
          ${config.sitio_web ? `<div style="font-size:9px;">${config.sitio_web}</div>` : ''}
          <p>Impreso: ${new Date().toLocaleString("es-PE")}</p>
        </div>

        ${sucursalActual?.regla_clientes ? `
        <div style="font-size: 10px; text-align: justify; margin-top: 8px; padding-top: 5px; border-top: 1px dashed #000; line-height: 1.3;">
          ${sucursalActual.regla_clientes}
        </div>
        ` : ''}
      </body>
      </html>
    `;

    const ventana = window.open("", "_blank", "width=400,height=600");
    ventana.document.write(contenido);
    ventana.document.close();
    ventana.onload = () => {
      ventana.print();
    };
  }

  // Reporte completo del grupo en formato PDF/A4
  function imprimirReporteGrupal(grupo) {
    const responsable = grupo.responsable || {};
    const responsableNombre = `${responsable.nombre || responsable.Nombre || "N/A"} ${responsable.apellidos || responsable.Apellidos || ""}`;
    const miembros = grupo.miembros || [];

    const totalGrupo = miembros.reduce((sum, m) => sum + (m.total || 0), 0);
    const adelantoGrupo = miembros.reduce((sum, m) => sum + (m.adelanto || 0), 0);
    const saldoGrupo = totalGrupo - adelantoGrupo;

    const contenido = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Reporte Grupal - ${grupo.nombre_grupo || grupo.NombreGrupo}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          * { box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            font-size: 11px;
            line-height: 1.4;
            color: #333;
            max-width: 210mm;
            margin: 0 auto;
            padding: 10mm;
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 15px;
            margin-bottom: 20px;
          }
          .header h1 {
            color: #1e40af;
            margin: 0;
            font-size: 24px;
          }
          .header .subtitle {
            color: #6b7280;
            font-size: 14px;
            margin-top: 5px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
          }
          .info-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 15px;
          }
          .info-box h3 {
            color: #1e40af;
            margin: 0 0 10px 0;
            font-size: 13px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 5px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
          }
          .info-row .label { color: #6b7280; }
          .info-row .value { font-weight: 600; }

          .resumen-financiero {
            background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
            color: white;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            text-align: center;
          }
          .resumen-item h4 {
            margin: 0;
            font-size: 11px;
            opacity: 0.9;
          }
          .resumen-item .amount {
            font-size: 20px;
            font-weight: bold;
            margin-top: 5px;
          }

          .miembros-section h2 {
            color: #1e40af;
            font-size: 16px;
            margin-bottom: 15px;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 8px;
          }

          .miembro-card {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            margin-bottom: 15px;
            overflow: hidden;
            page-break-inside: avoid;
          }
          .miembro-header {
            background: #f1f5f9;
            padding: 10px 15px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #e2e8f0;
          }
          .miembro-header .nombre {
            font-weight: bold;
            color: #1e40af;
          }
          .miembro-header .estado {
            padding: 3px 10px;
            border-radius: 15px;
            font-size: 10px;
            font-weight: bold;
          }
          .estado-pendiente { background: #fef3c7; color: #92400e; }
          .estado-confirmado { background: #d1fae5; color: #065f46; }
          .estado-entregado { background: #dbeafe; color: #1e40af; }

          .miembro-body { padding: 15px; }
          .miembro-info {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin-bottom: 10px;
            font-size: 10px;
          }

          .productos-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
            margin-top: 10px;
          }
          .productos-table th {
            background: #f1f5f9;
            padding: 8px;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
          }
          .productos-table td {
            padding: 8px;
            border-bottom: 1px solid #f1f5f9;
          }
          .productos-table .text-right { text-align: right; }

          .miembro-totales {
            background: #f8fafc;
            padding: 10px 15px;
            display: flex;
            justify-content: flex-end;
            gap: 30px;
            border-top: 1px solid #e2e8f0;
          }
          .miembro-totales .total-item {
            text-align: right;
          }
          .miembro-totales .label { font-size: 10px; color: #6b7280; }
          .miembro-totales .value { font-weight: bold; font-size: 13px; }
          .miembro-totales .saldo { color: #dc2626; }

          .footer {
            margin-top: 30px;
            text-align: center;
            color: #6b7280;
            font-size: 10px;
            border-top: 1px solid #e2e8f0;
            padding-top: 15px;
          }

          .toolbar {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #1e40af;
            color: white;
            padding: 8px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            z-index: 9999;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          }
          .toolbar button {
            background: white;
            color: #1e40af;
            border: none;
            padding: 6px 16px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 12px;
            cursor: pointer;
          }
          .toolbar button:hover { background: #e0e7ff; }
          .toolbar .title { font-size: 13px; font-weight: 600; }
          body { padding-top: 50px; }
          @media print {
            body { padding: 0; }
            .miembro-card { break-inside: avoid; }
            .toolbar { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="toolbar">
          <span class="title">Reporte Grupal - ${grupo.nombre_grupo || grupo.NombreGrupo || ""}</span>
          <button onclick="window.print()">Descargar PDF</button>
        </div>
        <div class="header">
          <h1>REPORTE DE RESERVA GRUPAL</h1>
          <div class="subtitle">${grupo.nombre_grupo || grupo.NombreGrupo || "Sin nombre"}</div>
        </div>

        <div class="info-grid">
          <div class="info-box">
            <h3>Información del Grupo</h3>
            <div class="info-row">
              <span class="label">ID Grupo:</span>
              <span class="value">#${grupo.ID || grupo.id}</span>
            </div>
            <div class="info-row">
              <span class="label">Fecha del Evento:</span>
              <span class="value">${formatFechaDDMMYYYY(grupo.fecha_evento || grupo.FechaEvento)}</span>
            </div>
            <div class="info-row">
              <span class="label">Estado:</span>
              <span class="value">${grupo.estado || "Pendiente"}</span>
            </div>
            <div class="info-row">
              <span class="label">Total Miembros:</span>
              <span class="value">${miembros.length}</span>
            </div>
          </div>

          <div class="info-box">
            <h3>Responsable del Grupo</h3>
            <div class="info-row">
              <span class="label">Nombre:</span>
              <span class="value">${responsableNombre}</span>
            </div>
            <div class="info-row">
              <span class="label">DNI:</span>
              <span class="value">${responsable.dni || responsable.DNI || "N/A"}</span>
            </div>
            <div class="info-row">
              <span class="label">Teléfono:</span>
              <span class="value">${responsable.telefono || responsable.Telefono || "N/A"}</span>
            </div>
            <div class="info-row">
              <span class="label">Correo:</span>
              <span class="value">${responsable.correo || responsable.Correo || "N/A"}</span>
            </div>
          </div>
        </div>

        <div class="resumen-financiero">
          <div class="resumen-item">
            <h4>TOTAL GRUPO</h4>
            <div class="amount">S/ ${totalGrupo.toFixed(2)}</div>
          </div>
          <div class="resumen-item">
            <h4>ADELANTO RECIBIDO</h4>
            <div class="amount">S/ ${adelantoGrupo.toFixed(2)}</div>
          </div>
          <div class="resumen-item">
            <h4>SALDO PENDIENTE</h4>
            <div class="amount">S/ ${saldoGrupo.toFixed(2)}</div>
          </div>
        </div>

        <div class="miembros-section">
          <h2>Detalle de Miembros (${miembros.length})</h2>

          ${miembros.map((m, i) => {
            const cliente = m.cliente || {};
            const detalles = m.detalles || [];
            const estadoClass = (m.estado || "pendiente").toLowerCase() === "confirmado"
              ? "estado-confirmado"
              : (m.estado || "pendiente").toLowerCase() === "entregado"
                ? "estado-entregado"
                : "estado-pendiente";

            return `
              <div class="miembro-card">
                <div class="miembro-header">
                  <span class="nombre">${i + 1}. ${cliente.nombre || cliente.Nombre || "N/A"} ${cliente.apellidos || cliente.Apellidos || ""}</span>
                  <span class="estado ${estadoClass}">${m.estado || "Pendiente"}</span>
                </div>
                <div class="miembro-body">
                  <div class="miembro-info">
                    <div><strong>DNI:</strong> ${cliente.dni || cliente.DNI || "N/A"}</div>
                    <div><strong>Teléfono:</strong> ${cliente.telefono || cliente.Telefono || "N/A"}</div>
                    <div><strong>Correo:</strong> ${cliente.correo || cliente.Correo || "N/A"}</div>
                  </div>

                  ${detalles.length > 0 ? `
                    <table class="productos-table">
                      <thead>
                        <tr>
                          <th>Producto/Servicio</th>
                          <th>Talla</th>
                          <th>Modelo</th>
                          <th>Color</th>
                          <th class="text-right">Cant.</th>
                          <th class="text-right">P. Unit.</th>
                          <th class="text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${detalles.map(det => {
                          const prod = det.producto || det.Producto || {};
                          const nombre = prod.nombre || prod.Nombre || det.combo?.nombre || det.combo?.Nombre || "Producto";
                          const talla = prod.talla || prod.Talla || '-';
                          const modelo = prod.modelo || prod.Modelo || '-';
                          const color = prod.color || prod.Color || '-';
                          return `
                          <tr>
                            <td>${nombre}</td>
                            <td>${talla}</td>
                            <td>${modelo}</td>
                            <td>${color}</td>
                            <td class="text-right">${det.cantidad || 1}</td>
                            <td class="text-right">S/ ${(det.precio_unitario || det.total / (det.cantidad || 1) || 0).toFixed(2)}</td>
                            <td class="text-right">S/ ${(det.total || 0).toFixed(2)}</td>
                          </tr>
                        `}).join("")}
                      </tbody>
                    </table>
                  ` : "<p>Sin productos asignados</p>"}
                </div>
                <div class="miembro-totales">
                  <div class="total-item">
                    <div class="label">TOTAL</div>
                    <div class="value">S/ ${(m.total || 0).toFixed(2)}</div>
                  </div>
                  <div class="total-item">
                    <div class="label">ADELANTO</div>
                    <div class="value">S/ ${(m.adelanto || 0).toFixed(2)}</div>
                  </div>
                  <div class="total-item">
                    <div class="label">SALDO</div>
                    <div class="value saldo">S/ ${((m.total || 0) - (m.adelanto || 0)).toFixed(2)}</div>
                  </div>
                </div>
              </div>
            `;
          }).join("")}
        </div>

        <div class="footer">
          <p>Reporte generado el ${new Date().toLocaleString("es-PE")}</p>
          <p>Este documento es un comprobante interno de la reserva grupal.</p>
        </div>
      </body>
      </html>
    `;

    const ventana = window.open("", "_blank");
    ventana.document.write(contenido);
    ventana.document.close();
  }

  // ==================== FILTRAR GRUPOS ====================
  // Si hay búsqueda por nombre de grupo o DNI, se omiten los filtros de fecha
  const busquedaTextoActiva = !!(filtroBusqueda || filtroDniResponsable);

  const gruposFiltrados = reservasGrupales.filter((grupo) => {
    // Filtro por estado del grupo (siempre activo)
    if (
      filtroEstado !== "todos" &&
      grupo.estado?.toLowerCase() !== filtroEstado.toLowerCase()
    ) {
      return false;
    }

    // Filtro por DNI del responsable (búsqueda parcial en tiempo real)
    if (filtroDniResponsable) {
      const dniResponsable =
        grupo.responsable?.dni || grupo.responsable?.DNI || "";
      if (!dniResponsable.includes(filtroDniResponsable)) {
        return false;
      }
    }

    // Filtro por nombre del grupo (búsqueda en tiempo real)
    if (filtroBusqueda) {
      const busqueda = filtroBusqueda.toLowerCase();
      const nombreGrupo = (
        grupo.nombre_grupo ||
        grupo.NombreGrupo ||
        ""
      ).toLowerCase();

      if (!nombreGrupo.includes(busqueda)) {
        return false;
      }
    }

    // Filtro por fecha del evento del grupo (solo si NO hay búsqueda por texto/DNI)
    if (!busquedaTextoActiva && (filtroFechaDesde || filtroFechaHasta)) {
      const fechaEventoGrupo =
        grupo.fecha_evento?.split("T")[0] || grupo.FechaEvento?.split("T")[0];

      if (fechaEventoGrupo) {
        if (filtroFechaDesde && fechaEventoGrupo < filtroFechaDesde)
          return false;
        if (filtroFechaHasta && fechaEventoGrupo > filtroFechaHasta)
          return false;
      }
    }

    return true;
  });

  // ==================== CÁLCULOS TOTALES GRUPO ====================
  const totalGrupoActual = miembrosGrupo.reduce((sum, m) => sum + m.total, 0);
  const adelantoGrupoActual = miembrosGrupo.reduce(
    (sum, m) => sum + m.adelanto,
    0,
  );
  const saldoGrupoActual = totalGrupoActual - adelantoGrupoActual;

  // ==================== SUGERENCIAS DE BÚSQUEDA ====================
  const sugerenciasGrupo = (() => {
    if (!filtroBusqueda.trim() || !showSugerenciasGrupo) return [];
    const busqueda = filtroBusqueda.toLowerCase();
    const nombres = new Map();
    reservasGrupales.forEach((grupo) => {
      const nombre = grupo.nombre_grupo || grupo.NombreGrupo || "";
      if (nombre && nombre.toLowerCase().includes(busqueda) && !nombres.has(nombre.toLowerCase())) {
        nombres.set(nombre.toLowerCase(), { nombre, id: grupo.ID || grupo.id, fecha: grupo.fecha_evento?.split("T")[0] || grupo.FechaEvento?.split("T")[0] || "" });
      }
    });
    return Array.from(nombres.values()).slice(0, 8);
  })();

  // ==================== RENDER ====================
  return (
    <div className="p-2 min-h-screen bg-blue-50">
      {/* HEADER CON PESTAÑAS */}
      <div className="bg-white rounded-lg shadow-md p-3 mb-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <Users size={24} /> RESERVAS GRUPALES
          </h1>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => {
                if (pestanaActiva !== "nueva") {
                  setGrupoEnEdicion(null);
                  reset();
                  setResponsable(null);
                  setMiembrosGrupo([]);
                  setProductosSeleccionados([]);
                  setPagosAgregados([]);
                  setAdelanto(0);
                  setCostoTotal(0);
                }
                setPestanaActiva("nueva");
              }}
              className={`flex items-center gap-1 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold ${
                pestanaActiva === "nueva"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              <Plus size={16} /> NUEVA RESERVA
            </button>
            <button
              onClick={() => {
                setPestanaActiva("lista");
                fetchReservasGrupales();
              }}
              className={`flex items-center gap-1 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold ${
                pestanaActiva === "lista"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              <List size={16} /> LISTA DE RESERVAS GRUPALES
            </button>
          </div>
        </div>
      </div>

      {/* ==================== PESTAÑA NUEVA ==================== */}
      {pestanaActiva === "nueva" && (
        <div className="space-y-3">
          {/* DATOS DEL GRUPO */}
          <div
            className={`rounded-lg p-4 ${grupoEnEdicion ? "bg-yellow-100 border-2 border-yellow-400" : "bg-blue-200"}`}
          >
            <h2 className="font-bold text-sm mb-4 flex items-center gap-2 text-center justify-center">
              <Users size={16} />{" "}
              {grupoEnEdicion
                ? `EDITANDO GRUPO #${grupoEnEdicion}`
                : "DATOS DEL GRUPO"}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 lg:grid-cols-12 gap-4">
              <div className="relative md:col-span-2 lg:col-span-3">
                <label
                  className={`absolute -top-2 left-3 px-1 text-xs font-medium text-gray-700 z-10 ${grupoEnEdicion ? "bg-yellow-100" : "bg-blue-200"}`}
                >
                  Nombre del Grupo <span className="text-orange-500">*</span>
                </label>
                <div className="flex gap-1">
                  <input
                    type="text"
                    placeholder="Ej: Promoción 2024 - Colegio San Martín"
                    {...register("nombreGrupo", {
                      required: "El nombre es requerido",
                    })}
                    className="w-full border rounded px-2 py-1.5 text-xs"
                  />
                  <button
                    type="button"
                    title={grabandoNombreGrupo ? "Detener" : "Dictar nombre"}
                    className={`px-1.5 rounded border flex-shrink-0 transition-colors ${grabandoNombreGrupo ? "bg-red-500 text-white border-red-500 animate-pulse" : "bg-gray-50 text-gray-500 border-gray-300 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"}`}
                    onClick={() => {
                      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                      if (!SpeechRecognition) { toast.error("Tu navegador no soporta reconocimiento de voz"); return; }
                      if (grabandoNombreGrupo) { setGrabandoNombreGrupo(false); return; }
                      const recognition = new SpeechRecognition();
                      recognition.lang = "es-PE";
                      recognition.interimResults = false;
                      recognition.maxAlternatives = 1;
                      recognition.onresult = (e) => {
                        const texto = e.results[0][0].transcript;
                        const actual = watch("nombreGrupo") || "";
                        setValue("nombreGrupo", actual ? actual + " " + texto : texto, { shouldValidate: true });
                        setGrabandoNombreGrupo(false);
                      };
                      recognition.onerror = () => { setGrabandoNombreGrupo(false); toast.error("Error al reconocer voz"); };
                      recognition.onend = () => { setGrabandoNombreGrupo(false); };
                      setGrabandoNombreGrupo(true);
                      recognition.start();
                    }}
                  >
                    <Mic className="w-3.5 h-3.5" />
                  </button>
                </div>
                {errors.nombreGrupo && (
                  <span className="text-red-500 text-xs">
                    {errors.nombreGrupo.message}
                  </span>
                )}
              </div>
              <div className="relative md:col-span-1 lg:col-span-2">
                <label
                  className={`absolute -top-2 left-3 px-1 text-xs font-medium text-gray-700 z-10 ${grupoEnEdicion ? "bg-yellow-100" : "bg-blue-200"}`}
                >
                  Fecha del Evento <span className="text-orange-500">*</span>
                </label>
                <input
                  type="date"
                  {...register("fechaEventoGrupo", {
                    required: "La fecha es requerida",
                  })}
                  min={fechaLocalStr()}
                  className="w-full border rounded px-2 py-1.5 text-xs"
                />
                {errors.fechaEventoGrupo && (
                  <span className="text-red-500 text-xs">
                    {errors.fechaEventoGrupo.message}
                  </span>
                )}
              </div>
              <div className="relative md:col-span-2 lg:col-span-3">
                <label
                  className={`absolute -top-2 left-3 px-1 text-xs font-medium text-gray-700 z-10 ${grupoEnEdicion ? "bg-yellow-100" : "bg-blue-200"}`}
                >
                  Descripción
                </label>
                <input
                  type="text"
                  placeholder="Descripción adicional"
                  {...register("descripcionGrupo")}
                  className="w-full border rounded px-2 py-1.5 text-xs"
                />
              </div>
              <div className="relative md:col-span-1 lg:col-span-2">
                <label
                  className={`absolute -top-2 left-3 px-1 text-xs font-medium text-gray-700 z-10 ${grupoEnEdicion ? "bg-yellow-100" : "bg-blue-200"}`}
                >
                  Estado del Grupo
                </label>
                <select
                  {...register("estadoGrupo")}
                  className="w-full border rounded px-2 py-1.5 text-xs"
                >
                  <option value="reservado">RESERVADO</option>
                  <option value="listo">LISTO</option>
                  <option value="entregado">ENTREGADO</option>
                  <option value="devuelto">DEVUELTO</option>
                </select>
              </div>
              <div className="relative md:col-span-2 lg:col-span-2">
                <label
                  className={`absolute -top-2 left-3 px-1 text-xs font-medium text-gray-700 z-10 ${grupoEnEdicion ? "bg-yellow-100" : "bg-blue-200"}`}
                >
                  Responsable <span className="text-orange-500">*</span>
                </label>
                <div className="flex gap-2">
                  {responsable ? (
                    <div className="flex-1 border rounded px-2 py-1.5 text-xs bg-green-100 font-medium truncate">
                      {responsable.nombre} {responsable.apellidos} -{" "}
                      {responsable.dni}
                    </div>
                  ) : (
                    <div className="flex-1 border rounded px-2 py-1.5 text-xs bg-gray-100 text-gray-500">
                      Sin asignar
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={abrirModalResponsable}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 flex-shrink-0"
                  >
                    <UserPlus size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* RESUMEN DEL GRUPO */}
          {miembrosGrupo.length > 0 && (
            <div className="bg-green-100 rounded-lg p-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <h3 className="font-bold text-sm">
                  RESUMEN DEL GRUPO ({miembrosGrupo.length} miembros)
                </h3>
                <div className="flex gap-2 sm:gap-4 text-sm flex-wrap">
                  <span>
                    <strong>Total:</strong> S/ {totalGrupoActual.toFixed(2)}
                  </span>
                  <span>
                    <strong>Adelanto:</strong> S/{" "}
                    {adelantoGrupoActual.toFixed(2)}
                  </span>
                  <span className="text-red-600">
                    <strong>Saldo:</strong> S/ {saldoGrupoActual.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* FORMULARIO AGREGAR MIEMBRO */}
          <div id="formulario-miembro" data-form="miembro" className="space-y-3">
            {/* SECCIÓN 1: DATOS DEL CLIENTE (similar a reservas.jsx) */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-blue-400 p-2 flex items-center justify-between">
                <span className="font-bold text-white text-sm">
                  {miembroEnEdicion
                    ? "✏️ EDITAR MIEMBRO"
                    : "➕ REGISTRO DE CLIENTE - MIEMBRO"}
                </span>
                <VoiceMicButton accion="registrar_cliente" getFormContext={getClientFormContext} />
              </div>
              <div className="p-2 bg-sky-50">
                <div className="flex justify-between items-center mb-2">
                {clienteExistenteMiembro && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded">
                      Cliente existente:{" "}
                      {clienteExistenteMiembro.nombre ||
                        clienteExistenteMiembro.Nombre}{" "}
                      {clienteExistenteMiembro.apellidos ||
                        clienteExistenteMiembro.Apellidos}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setClienteExistenteMiembro(null);
                        resetMiembro();
                      }}
                      className="text-xs bg-red-500 text-white px-2 py-0.5 rounded hover:bg-red-600"
                    >
                      Nuevo Cliente
                    </button>
                  </div>
                )}
              </div>

              {/* Fila 1: DNI (angosto) + Nombre + Apellidos */}
              <div className="flex flex-col sm:flex-row gap-2 mb-2">
                <div className="relative w-full sm:w-[140px] sm:flex-shrink-0">
                  <label className="absolute -top-2 left-2 bg-sky-50 px-1 text-[10px] font-medium text-gray-700 z-10">
                    DNI <span className="text-orange-500">*</span>
                  </label>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      placeholder="12345678"
                      maxLength={8}
                      {...registerMiembro("dni", {
                        required: "DNI requerido",
                        pattern: { value: /^[0-9]{8}$/, message: "8 dígitos" },
                      })}
                      className="w-full border rounded px-1.5 py-1 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => buscarCliente(watchMiembro("dni"), "miembro")}
                      disabled={loading}
                      className="bg-green-500 rounded px-1.5 py-1 text-[10px] text-white hover:bg-green-600 disabled:bg-gray-400 whitespace-nowrap font-bold"
                    >
                      🔍
                    </button>
                  </div>
                  {errorsMiembro.dni && <span className="text-red-500 text-[10px]">{errorsMiembro.dni.message}</span>}
                </div>

                <div className="relative flex-1">
                  <label className="absolute -top-2 left-2 bg-sky-50 px-1 text-[10px] font-medium text-gray-700 z-10">
                    Nombre <span className="text-orange-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Juan Carlos"
                    {...registerMiembro("nombre", {
                      required: "Nombre requerido",
                      minLength: { value: 2, message: "Mín 2" },
                    })}
                    className="w-full border rounded px-1.5 py-1 text-xs"
                  />
                  {errorsMiembro.nombre && <span className="text-red-500 text-[10px]">{errorsMiembro.nombre.message}</span>}
                </div>

                <div className="relative flex-1">
                  <label className="absolute -top-2 left-2 bg-sky-50 px-1 text-[10px] font-medium text-gray-700 z-10">
                    Apellidos <span className="text-orange-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Pérez García"
                    {...registerMiembro("apellidos", { required: "Requerido" })}
                    className="w-full border rounded px-1.5 py-1 text-xs"
                  />
                  {errorsMiembro.apellidos && <span className="text-red-500 text-[10px]">{errorsMiembro.apellidos.message}</span>}
                </div>
              </div>

              {/* Fila 2: Teléfono (angosto) + Dirección (ancho) + Estado */}
              <div className="flex flex-col sm:flex-row gap-2 mb-2">
                <div className="relative w-full sm:w-[120px] sm:flex-shrink-0">
                  <label className="absolute -top-2 left-2 bg-sky-50 px-1 text-[10px] font-medium text-gray-700 z-10">
                    Teléfono <span className="text-orange-500">*</span>
                  </label>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      placeholder="987654321"
                      maxLength={9}
                      {...registerMiembro("telefono", {
                        required: "Requerido",
                        pattern: { value: /^[0-9]{9}$/, message: "9 dígitos" },
                      })}
                      className="w-full border rounded px-1.5 py-1 text-xs"
                    />
                    <button type="button" onClick={() => { const n = (watchMiembro("telefono") || "").replace(/\D/g, ""); if (n.length === 9) window.location.href = `tel:+51${n}`; }} className="text-blue-500 text-xs px-0.5">📞</button>
                  </div>
                  {errorsMiembro.telefono && <span className="text-red-500 text-[10px]">{errorsMiembro.telefono.message}</span>}
                </div>

                <div className="relative flex-1">
                  <label className="absolute -top-2 left-2 bg-sky-50 px-1 text-[10px] font-medium text-gray-700 z-10">
                    Dirección <span className="text-orange-500">*</span>
                  </label>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      placeholder="Dirección completa y referencia"
                      {...registerMiembro("direccion", { required: "Requerida" })}
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
                          const actual = watchMiembro("direccion") || "";
                          setValueMiembro("direccion", actual ? actual + " " + texto : texto, { shouldValidate: true });
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
                  {errorsMiembro.direccion && <span className="text-red-500 text-[10px]">{errorsMiembro.direccion.message}</span>}
                </div>

                <div className="relative w-full sm:w-[110px] sm:flex-shrink-0">
                  <label className="absolute -top-2 left-2 bg-sky-50 px-1 text-[10px] font-medium text-gray-700 z-10">
                    Estado
                  </label>
                  <select
                    {...registerMiembro("estadoMiembro")}
                    className="w-full border rounded px-1.5 py-1 text-xs"
                  >
                    <option value="reservado">RESERVADO</option>
                    <option value="listo">LISTO</option>
                    <option value="entregado">ENTREGADO</option>
                    <option value="devuelto">DEVUELTO</option>
                  </select>
                </div>
              </div>

              {/* Fila 3: Foto compacta - clic para ampliar */}
              <div className="flex items-center gap-1">
                <input type="file" accept="image/*" ref={imagenMiembroInputRef} onChange={handleImagenMiembroChange} className="hidden" />
                <button type="button" onClick={() => imagenMiembroInputRef.current?.click()} className="bg-blue-500 text-white px-1.5 py-1 rounded text-[10px] hover:bg-blue-600" title="Seleccionar archivo">
                  <Upload size={12} />
                </button>
                <label className="bg-green-500 text-white px-1.5 py-1 rounded text-[10px] hover:bg-green-600 cursor-pointer inline-flex items-center" title="Tomar foto">
                  <Camera size={12} />
                  <input type="file" accept="image/*" capture="environment" ref={imagenMiembroCamaraRef} onChange={handleImagenMiembroChange} className="hidden" />
                </label>
                {imagenMiembroPreview && (
                  <div className="relative">
                    <img src={imagenMiembroPreview} alt="Preview" className="w-8 h-8 object-cover rounded border cursor-pointer hover:ring-2 hover:ring-blue-400" onClick={() => setFotoAmpliada(imagenMiembroPreview)} title="Clic para ampliar" />
                    <button type="button" onClick={() => { setImagenMiembro(null); setImagenMiembroPreview(null); }} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center text-[8px]">×</button>
                  </div>
                )}
                {!imagenMiembroPreview && clienteExistenteMiembro?.imagen && (
                  <div className="relative flex items-center gap-1">
                    <img src={buildImageUrl(clienteExistenteMiembro.imagen)} alt="Cliente" className="w-8 h-8 object-cover rounded border cursor-pointer hover:ring-2 hover:ring-blue-400" onClick={() => setFotoAmpliada(buildImageUrl(clienteExistenteMiembro.imagen))} title="Clic para ampliar" />
                    <span className="text-[10px] text-gray-500">Actual</span>
                  </div>
                )}
                {!imagenMiembroPreview && !clienteExistenteMiembro?.imagen && <span className="text-[10px] text-gray-400">Foto</span>}
              </div>
              </div>
            </div>

            {/* SECCIÓN 2: PRODUCTOS Y PAGOS (grid de 3 columnas como reservas.jsx) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {/* PANEL DE CONTROL - PRODUCTOS */}
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-blue-400 p-2">
                  <h1 className="text-sm font-bold text-center text-white">
                    REGISTRO DE PRODUCTOS
                  </h1>
                </div>
                <div className="p-2 bg-sky-50">
                {/* Búsqueda por nombre */}
                <div className="mb-3">
                  <div className="relative">
                    <label className="absolute -top-2 left-3 bg-white px-1 text-xs font-medium text-gray-700">
                      🔍 Buscar por nombre
                    </label>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={searchNombre}
                        onChange={(e) => {
                          setSearchNombre(e.target.value);
                          buscarProductosPorNombre(e.target.value);
                        }}
                        placeholder="Escriba el nombre del producto"
                        className="w-full border rounded px-2 py-1 text-xs"
                      />
                      {searchNombre && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchNombre("");
                            setProductosEncontrados([]);
                            setShowSearchResults(false);
                          }}
                          className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {showSearchResults && productosEncontrados.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-60 overflow-y-auto">
                        {productosEncontrados.map((producto) => (
                          <div
                            key={producto.ID || producto.id}
                            onClick={() => agregarProductoDesdeNombre(producto)}
                            className="p-2 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 flex items-center gap-2"
                          >
                            {producto.imagen && (
                              <img
                                src={buildImageUrl(producto.imagen)}
                                alt={producto.nombre}
                                className="w-8 h-8 object-cover rounded border"
                              />
                            )}
                            <div className="flex-1">
                              <div className="font-medium text-xs">
                                {producto.nombre}
                              </div>
                              <div className="text-xs text-gray-500">
                                Stock: {producto.stock || 0} | S/{" "}
                                {Number(producto.precio_alquiler || 0).toFixed(
                                  2,
                                )}
                              </div>
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
                    <label className="absolute -top-2 left-3 bg-white px-1 text-xs font-medium text-gray-700">
                      Código de barras
                    </label>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={barcode}
                        onChange={(e) => setBarcode(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && barcode.trim()) {
                            e.preventDefault();
                            agregarProductoPorCodigo(barcode);
                          }
                        }}
                        placeholder="Escanee o digite el código"
                        className="w-full border rounded px-2 py-1 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          barcode && agregarProductoPorCodigo(barcode)
                        }
                        disabled={!barcode || loading}
                        className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 text-xs whitespace-nowrap"
                      >
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
                  <button
                    type="button"
                    onClick={() => setShowCombosModal(true)}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1 text-xs"
                  >
                    📦 Seleccionar Combo
                  </button>
                </div>

                {/* Resumen de costos */}
                <div className="space-y-2 bg-blue-100 p-2 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs">PRECIO TOTAL:</span>
                    <span className="text-sm font-bold">
                      S/ {costoTotal.toFixed(2)}
                    </span>
                  </div>

                  <div className="relative">
                    <label className="absolute -top-2 left-3 bg-sky-50 px-1 text-xs font-medium text-gray-700">
                      Adelanto
                    </label>
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
                          // Automáticamente agregar/actualizar Efectivo
                          if (nuevoAdelanto > 0) {
                            const efectivo = metodosPago.find(
                              (m) => (m.nombre || m.Nombre || "").toLowerCase().includes("efectivo")
                            );
                            if (efectivo) {
                              setPagosAgregados([{
                                id: Date.now(),
                                id_pago: efectivo.ID || efectivo.id,
                                nombre: efectivo.nombre || efectivo.Nombre,
                                monto: nuevoAdelanto,
                                descripcion: "",
                              }]);
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
                          // Automáticamente agregar Efectivo con el total
                          const efectivo = metodosPago.find(
                            (m) => (m.nombre || m.Nombre || "").toLowerCase().includes("efectivo")
                          );
                          if (efectivo && costoTotal > 0) {
                            setPagosAgregados([{
                              id: Date.now(),
                              id_pago: efectivo.ID || efectivo.id,
                              nombre: efectivo.nombre || efectivo.Nombre,
                              monto: costoTotal,
                              descripcion: "",
                            }]);
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

                  {/* Botón para agregar/cambiar métodos de pago */}
                  <button
                    type="button"
                    onClick={() => setShowPagosModal(true)}
                    disabled={adelanto === 0}
                    className="w-full px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 text-xs"
                  >
                    💳 Agregar Método de Pago
                  </button>

                  {/* Lista de pagos agregados */}
                  {pagosAgregados.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs font-bold">Pagos registrados:</p>
                      {pagosAgregados.map((pago) => (
                        <div
                          key={pago.id}
                          className="flex justify-between items-center text-xs bg-white p-1 rounded"
                        >
                          <span>
                            {pago.nombre}: S/ {pago.monto.toFixed(2)}
                          </span>
                          <button
                            onClick={() => removerMetodoPago(pago.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <div className="flex justify-between font-bold text-xs pt-1 border-t">
                        <span>Total pagos:</span>
                        <span>
                          S/{" "}
                          {pagosAgregados
                            .reduce((sum, p) => sum + p.monto, 0)
                            .toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-sm font-bold text-red-600">
                    <span>DEBE:</span>
                    <span>S/ {(costoTotal - adelanto).toFixed(2)}</span>
                  </div>
                </div>

                {/* Botón agregar/actualizar miembro */}
                <button
                  type="button"
                  onClick={handleSubmitMiembro(onSubmitMiembro)}
                  disabled={loading || productosSeleccionados.length === 0}
                  className={`w-full mt-3 px-3 py-2 text-white rounded text-sm font-bold disabled:bg-gray-400 ${
                    miembroEnEdicion
                      ? "bg-yellow-600 hover:bg-yellow-700"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {miembroEnEdicion ? (
                    <>
                      <Edit size={14} className="inline mr-1" /> ACTUALIZAR
                      MIEMBRO
                    </>
                  ) : (
                    <>
                      <UserPlus size={14} className="inline mr-1" /> AGREGAR
                      MIEMBRO AL GRUPO
                    </>
                  )}
                </button>
                {miembroEnEdicion && (
                  <button
                    type="button"
                    onClick={() => {
                      resetMiembro();
                      setProductosSeleccionados([]);
                      setPagosAgregados([]);
                      setAdelanto(0);
                      setMiembroEnEdicion(null);
                      setClienteExistenteMiembro(null);
                    }}
                    className="w-full mt-1 px-3 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
                  >
                    Cancelar edición
                  </button>
                )}
                </div>
              </div>

              {/* LISTA DE PRODUCTOS */}
              <div className="col-span-1 md:col-span-2 bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-blue-300 p-2">
                  <h2 className="text-sm font-bold text-center text-white">
                    LISTA DE PRODUCTOS ({productosSeleccionados.length})
                  </h2>
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
                        {productosSeleccionados.map((item, index) => (
                          <React.Fragment key={item.id}>
                          <tr
                            className="border-b last:border-none hover:bg-blue-50"
                          >
                            <td className="p-2">{index + 1}</td>
                            <td className="p-2">
                              <div className="flex items-center gap-2">
                                {item.imagen && (
                                  <img
                                    src={buildImageUrl(item.imagen)}
                                    alt={item.nombre}
                                    className="w-6 h-6 object-cover rounded border cursor-pointer hover:ring-2 hover:ring-blue-400"
                                    onClick={() => setFotoAmpliada(buildImageUrl(item.imagen))}
                                    title="Clic para ampliar"
                                  />
                                )}
                                <div>
                                  <div className="font-medium text-xs">
                                    {item.nombre}
                                  </div>
                                  {item.tipo !== "combo" && (item.talla || item.modelo || item.color) && (
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
                                  onClick={() =>
                                    actualizarCantidad(item.id, (item.cantidad || 1) - 1)
                                  }
                                  disabled={(item.cantidad || 1) <= 1}
                                  className="w-5 h-5 flex items-center justify-center bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold"
                                >
                                  -
                                </button>
                                <span className="w-6 text-center text-xs font-medium">
                                  {item.cantidad || 1}
                                </span>
                                <button
                                  onClick={() =>
                                    actualizarCantidad(item.id, (item.cantidad || 1) + 1)
                                  }
                                  className="w-5 h-5 flex items-center justify-center bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold"
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td className="p-2">
                              {item.tipo === "combo" ? (
                                <button
                                  onClick={() => setExpandedCombo(expandedCombo === item.id ? null : item.id)}
                                  className="px-2 py-0.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-1"
                                >
                                  COMBO {expandedCombo === item.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                </button>
                              ) : (
                                <span className="px-2 py-0.5 text-xs bg-green-500 text-white rounded">
                                  INDIVIDUAL
                                </span>
                              )}
                            </td>
                            <td className="p-2 text-right text-xs">
                              S/{" "}
                              {(item.tipo === "combo"
                                ? item.precio_oferta
                                : item.precio_alquiler
                              ).toFixed(2)}
                            </td>
                            <td className="p-2 font-bold text-xs text-right">
                              S/{" "}
                              {(
                                (item.tipo === "combo"
                                  ? item.precio_oferta
                                  : item.precio_alquiler) * (item.cantidad || 1)
                              ).toFixed(2)}
                            </td>
                            <td className="p-2 text-center">
                              <button
                                onClick={() => removerProducto(item.id)}
                                className="px-2 py-0.5 text-xs text-white bg-red-500 rounded hover:bg-red-600"
                              >
                                Eliminar
                              </button>
                            </td>
                          </tr>
                          {/* Detalle expandido del combo */}
                          {item.tipo === "combo" && expandedCombo === item.id && item.productos_escaneados && (
                            <tr>
                              <td colSpan="7" className="p-0">
                                <div className="bg-blue-50 p-2 border-t border-blue-200">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="bg-blue-100">
                                        <th className="p-1 text-left">Producto</th>
                                        <th className="p-1 text-center">Talla</th>
                                        <th className="p-1 text-center">Modelo</th>
                                        <th className="p-1 text-center">Color</th>
                                        <th className="p-1 text-center">Stock</th>
                                        <th className="p-1 text-center">Código</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {item.productos_escaneados.map((prod, idx) => (
                                        <tr key={idx} className="border-t border-blue-100">
                                          <td className="p-1">{prod.nombre}</td>
                                          <td className="p-1 text-center">{prod.talla || "-"}</td>
                                          <td className="p-1 text-center">{prod.modelo || "-"}</td>
                                          <td className="p-1 text-center">{prod.color || "-"}</td>
                                          <td className="p-1 text-center">{prod.stock || 0}</td>
                                          <td className="p-1 text-center">{prod.codigo_barras || "-"}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                      <Package size={40} />
                      <p className="mt-2 text-sm">Sin productos agregados</p>
                      <p className="text-xs">
                        Escanee o busque productos para agregar
                      </p>
                    </div>
                  )}
                </div>
                </div>
              </div>
            </div>
          </div>

          {/* LISTA DE MIEMBROS AGREGADOS */}
          {miembrosGrupo.length > 0 && (
            <div className="bg-white rounded-lg shadow p-3">
              <h2 className="font-bold text-sm mb-2">
                MIEMBROS DEL GRUPO ({miembrosGrupo.length})
              </h2>
              <div className="space-y-2">
                {miembrosGrupo.map((miembro, index) => (
                  <div
                    key={miembro.id}
                    className="border-2 border-blue-300 rounded-lg p-2 bg-blue-50"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-xs font-bold">
                            #{index + 1}
                          </span>
                          <span className="font-bold text-sm">
                            {miembro.nombre} {miembro.apellidos}
                          </span>
                          <span className="text-xs text-gray-500">
                            DNI: {miembro.dni}
                          </span>
                          {/* Estado editable */}
                          <select
                            value={miembro.estado}
                            onChange={(e) =>
                              cambiarEstadoMiembro(miembro.id, e.target.value)
                            }
                            className={`text-xs px-2 py-0.5 rounded font-bold ${
                              miembro.estado === "reservado"
                                ? "bg-yellow-200"
                                : miembro.estado === "listo"
                                  ? "bg-blue-200"
                                  : miembro.estado === "entregado"
                                    ? "bg-green-200"
                                    : "bg-orange-200"
                            }`}
                          >
                            <option value="reservado">RESERVADO</option>
                            <option value="listo">LISTO</option>
                            <option value="entregado">ENTREGADO</option>
                            <option value="devuelto">DEVUELTO</option>
                          </select>
                        </div>
                        <div className="flex gap-2 sm:gap-4 mt-1 text-xs flex-wrap">
                          <span>Total: S/ {miembro.total.toFixed(2)}</span>
                          <span>
                            Adelanto: S/ {miembro.adelanto.toFixed(2)}
                          </span>
                          <span className="text-red-600">
                            Saldo: S/ {miembro.saldo.toFixed(2)}
                          </span>
                        </div>

                        {/* Expandir/Colapsar detalles */}
                        <button
                          onClick={() =>
                            setMiembroExpandido(
                              miembroExpandido === miembro.id
                                ? null
                                : miembro.id,
                            )
                          }
                          className="text-blue-600 text-xs underline mt-1 flex items-center gap-1"
                        >
                          {miembroExpandido === miembro.id ? (
                            <>
                              <ChevronUp size={12} /> Ocultar detalles
                            </>
                          ) : (
                            <>
                              <ChevronDown size={12} /> Ver detalles (
                              {miembro.productos.length} productos)
                            </>
                          )}
                        </button>

                        {miembroExpandido === miembro.id && (
                          <div className="mt-2 bg-white rounded border text-xs overflow-hidden">
                            {/* Productos */}
                            <table className="w-full">
                              <thead>
                                <tr className="bg-gray-100 text-[10px]">
                                  <th className="p-1 text-left">Producto</th>
                                  <th className="p-1 text-center">Cant.</th>
                                  <th className="p-1 text-center">Tipo</th>
                                  <th className="p-1 text-right">Precio</th>
                                  <th className="p-1 text-right">Subtotal</th>
                                </tr>
                              </thead>
                              <tbody>
                                {miembro.productos.map((prod, idx) => (
                                  <React.Fragment key={idx}>
                                    <tr className={`border-b ${prod.tipo === "combo" ? "bg-purple-50" : "hover:bg-blue-50"}`}>
                                      <td className="p-1">
                                        <div className="flex items-center gap-1">
                                          {prod.imagen && (
                                            <img
                                              src={buildImageUrl(prod.imagen)}
                                              alt={prod.nombre}
                                              className="w-6 h-6 object-cover rounded border cursor-pointer hover:ring-2 hover:ring-blue-400"
                                              onClick={() => setFotoAmpliada(buildImageUrl(prod.imagen))}
                                            />
                                          )}
                                          <div>
                                            <div className="font-medium">{prod.tipo === "combo" ? `🎁 ${prod.nombre}` : prod.nombre}</div>
                                            {prod.tipo !== "combo" && (prod.talla || prod.modelo || prod.color) && (
                                              <div className="text-[10px] text-gray-500">
                                                {prod.talla && <>Talla: {prod.talla}</>}
                                                {prod.talla && (prod.modelo || prod.color) && <> | </>}
                                                {prod.modelo && <>Mod: {prod.modelo}</>}
                                                {prod.modelo && prod.color && <> | </>}
                                                {prod.color && <>Color: {prod.color}</>}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </td>
                                      <td className="p-1 text-center">{prod.cantidad || 1}</td>
                                      <td className="p-1 text-center">
                                        {prod.tipo === "combo" ? (
                                          <span className="px-1 py-0.5 bg-purple-500 text-white rounded text-[10px]">COMBO</span>
                                        ) : (
                                          <span className="px-1 py-0.5 bg-green-500 text-white rounded text-[10px]">INDIVIDUAL</span>
                                        )}
                                      </td>
                                      <td className="p-1 text-right">S/ {(prod.tipo === "combo" ? prod.precio_oferta : prod.precio_alquiler)?.toFixed(2)}</td>
                                      <td className="p-1 text-right font-bold">S/ {((prod.tipo === "combo" ? prod.precio_oferta : prod.precio_alquiler) * (prod.cantidad || 1))?.toFixed(2)}</td>
                                    </tr>
                                    {/* Productos del combo */}
                                    {prod.tipo === "combo" && prod.productos_escaneados && prod.productos_escaneados.length > 0 && (
                                      <tr>
                                        <td colSpan="5" className="p-0">
                                          <div className="bg-purple-50 border-l-4 border-purple-400 ml-2 mb-1">
                                            {prod.productos_escaneados.map((pe, peIdx) => (
                                              <div key={peIdx} className="flex items-center gap-1 p-1 border-b border-purple-100 last:border-none">
                                                {pe.imagen && (
                                                  <img
                                                    src={buildImageUrl(pe.imagen)}
                                                    alt={pe.nombre}
                                                    className="w-5 h-5 object-cover rounded border cursor-pointer hover:ring-2 hover:ring-purple-400"
                                                    onClick={() => setFotoAmpliada(buildImageUrl(pe.imagen))}
                                                  />
                                                )}
                                                <span className="font-medium">{pe.nombre}</span>
                                                {(pe.talla || pe.modelo || pe.color) && (
                                                  <span className="text-[10px] text-gray-500">
                                                    ({[pe.talla && `T: ${pe.talla}`, pe.modelo && `M: ${pe.modelo}`, pe.color && `C: ${pe.color}`].filter(Boolean).join(" | ")})
                                                  </span>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </React.Fragment>
                                ))}
                              </tbody>
                            </table>
                            {/* Pagos */}
                            {miembro.pagos && miembro.pagos.length > 0 && (
                              <div className="border-t p-2 bg-gray-50">
                                <strong className="text-[10px] text-gray-600">Pagos:</strong>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {miembro.pagos.map((pago, idx) => (
                                    <span key={idx} className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-[10px]">
                                      {pago.nombre}: S/ {pago.monto.toFixed(2)}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => editarMiembro(miembro)}
                          className="px-3 py-1 bg-yellow-500 text-white rounded text-xs hover:bg-yellow-600 flex items-center gap-1"
                          title="Editar miembro"
                        >
                          <Edit size={14} /> Editar
                        </button>
                        <button
                          onClick={() => removerMiembro(miembro.id)}
                          className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 flex items-center gap-1"
                          title="Eliminar miembro"
                        >
                          <Trash2 size={14} /> Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BOTÓN GUARDAR GRUPO */}
          <div
            className={`flex justify-center gap-3 py-3 rounded-lg ${grupoEnEdicion ? "bg-yellow-200" : "bg-slate-400"}`}
          >
            {grupoEnEdicion && (
              <button
                type="button"
                onClick={() => {
                  setConfirmModalData({
                    titulo: "Cancelar edición",
                    mensaje: "¿Cancelar la edición? Se perderán los cambios no guardados.",
                    tipo: "danger",
                    onConfirm: () => {
                      setShowConfirmModal(false);
                      setConfirmModalData(null);
                      setGrupoEnEdicion(null);
                      reset();
                      setResponsable(null);
                      setMiembrosGrupo([]);
                      setProductosSeleccionados([]);
                      setPagosAgregados([]);
                      setAdelanto(0);
                      setCostoTotal(0);
                      setClienteExistenteResponsable(null);
                    },
                  });
                  setShowConfirmModal(true);
                }}
                className="px-6 py-2 bg-gray-500 text-white rounded-xl font-bold hover:bg-gray-600"
              >
                CANCELAR EDICIÓN
              </button>
            )}
            <button
              onClick={handleSubmit(onSubmitGrupo)}
              disabled={loading || miembrosGrupo.length === 0 || !responsable}
              className={`px-6 py-2 text-white rounded-xl font-bold disabled:bg-gray-400 ${
                grupoEnEdicion
                  ? "bg-yellow-600 hover:bg-yellow-700"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {loading
                ? "GUARDANDO..."
                : grupoEnEdicion
                  ? "ACTUALIZAR GRUPO"
                  : "GUARDAR RESERVA GRUPAL"}
            </button>
          </div>
        </div>
      )}

      {/* ==================== PESTAÑA LISTA ==================== */}
      {pestanaActiva === "lista" && (
        <div className="bg-blue-100 rounded-lg shadow p-3">
          {/* Filtros */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-12 gap-3 mb-3">
              {/* Fecha Desde */}
              <div className={`relative lg:col-span-2 ${busquedaTextoActiva ? "opacity-40 pointer-events-none" : ""}`}>
                <label className="absolute -top-2 left-3 bg-white px-1 text-xs font-medium text-gray-700">
                  Desde
                </label>
                <input
                  type="date"
                  value={filtroFechaDesde}
                  onChange={(e) => setFiltroFechaDesde(e.target.value)}
                  disabled={busquedaTextoActiva}
                  className="w-full border rounded px-2 py-1.5 text-xs"
                />
              </div>

              {/* Fecha Hasta */}
              <div className={`relative lg:col-span-2 ${busquedaTextoActiva ? "opacity-40 pointer-events-none" : ""}`}>
                <label className="absolute -top-2 left-3 bg-white px-1 text-xs font-medium text-gray-700">
                  Hasta
                </label>
                <input
                  type="date"
                  value={filtroFechaHasta}
                  onChange={(e) => setFiltroFechaHasta(e.target.value)}
                  disabled={busquedaTextoActiva}
                  className="w-full border rounded px-2 py-1.5 text-xs"
                />
              </div>

              {/* Búsqueda por nombre del grupo */}
              <div className="relative lg:col-span-3">
                <label className="absolute -top-2 left-3 bg-white px-1 text-xs font-medium text-gray-700 z-10">
                  Buscar grupo
                </label>
                <input
                  type="text"
                  placeholder="Nombre del grupo..."
                  value={filtroBusqueda}
                  onChange={(e) => {
                    setFiltroBusqueda(e.target.value);
                    setShowSugerenciasGrupo(true);
                  }}
                  onFocus={() => setShowSugerenciasGrupo(true)}
                  onBlur={() => setTimeout(() => setShowSugerenciasGrupo(false), 200)}
                  autoComplete="off"
                  className={`w-full border rounded px-2 py-1.5 text-xs pr-7 ${filtroBusqueda.trim() ? 'border-blue-500 bg-blue-50' : ''}`}
                />
                {filtroBusqueda.trim() && (
                  <button
                    onClick={() => { setFiltroBusqueda(""); setShowSugerenciasGrupo(false); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm z-10"
                    title="Limpiar búsqueda"
                  >
                    ✕
                  </button>
                )}
                {/* Dropdown de sugerencias */}
                {sugerenciasGrupo.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                    {sugerenciasGrupo.map((sug, idx) => {
                      const busqueda = filtroBusqueda.toLowerCase();
                      const nombreLower = sug.nombre.toLowerCase();
                      const matchIndex = nombreLower.indexOf(busqueda);
                      return (
                        <button
                          key={idx}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setFiltroBusqueda(sug.nombre);
                            setShowSugerenciasGrupo(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 flex items-center justify-between gap-2 transition-colors"
                        >
                          <span className="text-xs text-gray-800 truncate">
                            {matchIndex >= 0 ? (
                              <>
                                {sug.nombre.slice(0, matchIndex)}
                                <span className="font-bold text-blue-600">{sug.nombre.slice(matchIndex, matchIndex + filtroBusqueda.length)}</span>
                                {sug.nombre.slice(matchIndex + filtroBusqueda.length)}
                              </>
                            ) : sug.nombre}
                          </span>
                          {sug.fecha && (
                            <span className="text-[10px] text-gray-400 whitespace-nowrap">{sug.fecha}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* DNI del Responsable */}
              <div className="relative lg:col-span-2">
                <label className="absolute -top-2 left-3 bg-white px-1 text-xs font-medium text-gray-700">
                  DNI Responsable
                </label>
                <input
                  type="text"
                  placeholder="8 dígitos..."
                  value={filtroDniResponsable}
                  onChange={(e) => setFiltroDniResponsable(e.target.value)}
                  maxLength={8}
                  className={`w-full border rounded px-2 py-1.5 text-xs pr-7 ${filtroDniResponsable.trim() ? 'border-blue-500 bg-blue-50' : ''}`}
                />
                {filtroDniResponsable.trim() && (
                  <button
                    onClick={() => setFiltroDniResponsable("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                    title="Limpiar DNI"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Botones de acción */}
              <div className="flex items-end lg:col-span-3 gap-2">
                <button
                  onClick={fetchReservasGrupales}
                  disabled={loading}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Buscar"
                >
                  🔍
                </button>
                <button
                  onClick={fetchReservasGrupales}
                  disabled={loading}
                  className="flex-1 px-3 py-1.5 bg-gray-600 text-white rounded hover:bg-gray-700 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Refrescar datos desde el servidor"
                >
                  Refrescar
                </button>
                <button
                  onClick={() => {
                    const hoy = fechaLocalStr();
                    setFiltroFechaDesde(hoy);
                    setFiltroFechaHasta(hoy);
                    setFiltroBusqueda("");
                    setFiltroDniResponsable("");
                    setFiltroEstado("todos");
                    fetchReservasGrupales();
                  }}
                  disabled={loading}
                  className="flex-1 px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Mostrar solo las reservas de hoy"
                >
                  Hoy
                </button>
              </div>

            </div>

            {/* Filtros por estado */}
            <div className="flex gap-2 flex-wrap mb-2">
              <button
                onClick={() => setFiltroEstado("todos")}
                className={`px-3 py-1 text-xs rounded capitalize ${
                  filtroEstado === "todos"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Todos los estados
              </button>
              {["reservado", "listo", "entregado", "devuelto", "anulado"].map(
                (estado) => (
                  <button
                    key={estado}
                    onClick={() => setFiltroEstado(estado)}
                    className={`px-3 py-1 text-xs rounded capitalize ${
                      filtroEstado === estado
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    {estado}
                  </button>
                )
              )}
            </div>

            {/* Resumen de resultados */}
            <div className="text-xs text-gray-500">
              Mostrando {gruposFiltrados.length} de {reservasGrupales.length}{" "}
              grupos
              {filtroBusqueda && ` | Grupo: "${filtroBusqueda}"`}
              {filtroDniResponsable && ` | DNI: ${filtroDniResponsable}`}
              {busquedaTextoActiva && " (sin filtro de fechas)"}
              {!busquedaTextoActiva && filtroFechaDesde && ` | Desde: ${filtroFechaDesde}`}
              {!busquedaTextoActiva && filtroFechaHasta && ` | Hasta: ${filtroFechaHasta}`}
              {filtroEstado !== "todos" && ` | Estado: ${filtroEstado.toUpperCase()}`}
            </div>
          </div>

          {/* Tabla de grupos */}
          {loading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : gruposFiltrados.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay reservas grupales
            </div>
          ) : (
            <div className="space-y-2">
              {gruposFiltrados.map((grupo) => {
                const grupoId = grupo.ID || grupo.id;
                const totalGrupo = (grupo.miembros || []).reduce(
                  (sum, m) => sum + (m.total || 0),
                  0,
                );
                const adelantoGrupo = (grupo.miembros || []).reduce(
                  (sum, m) => sum + (m.adelanto || 0),
                  0,
                );
                const isExpanded = grupoExpandidoEnLista === grupoId;

                return (
                  <div
                    key={grupoId}
                    className="border-2 border-blue-300 rounded-lg overflow-hidden"
                  >
                    {/* Header del grupo */}
                    <div className="bg-blue-50 p-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                          <span className="font-bold text-sm">
                            {grupo.nombre_grupo ||
                              grupo.NombreGrupo ||
                              "Sin nombre"}
                          </span>
                          <span className="text-xs bg-blue-100 px-2 py-0.5 rounded">
                            {(grupo.miembros || []).length} miembros
                          </span>
                          {grupo.estado?.toLowerCase() === "anulado" ? (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded font-bold bg-red-200 text-red-800">
                              <XCircle className="w-3 h-3" /> ANULADO
                            </span>
                          ) : (
                            <select
                              value={grupo.estado?.toLowerCase() || "reservado"}
                              onChange={(e) =>
                                cambiarEstadoGrupo(grupoId, e.target.value)
                              }
                              className={`text-xs px-2 py-1 rounded font-bold ${
                                grupo.estado?.toLowerCase() === "reservado"
                                  ? "bg-yellow-200"
                                  : grupo.estado?.toLowerCase() === "listo"
                                    ? "bg-blue-200"
                                    : grupo.estado?.toLowerCase() === "entregado"
                                      ? "bg-green-200"
                                      : "bg-orange-200"
                              }`}
                            >
                              <option value="reservado">RESERVADO</option>
                              <option value="listo">LISTO</option>
                              <option value="entregado">ENTREGADO</option>
                              <option value="devuelto">DEVUELTO</option>
                            </select>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 mt-1 flex gap-2 sm:gap-4 flex-wrap">
                          <span>
                            <strong>Responsable:</strong>{" "}
                            {grupo.responsable
                              ? `${grupo.responsable.nombre || grupo.responsable.Nombre} ${grupo.responsable.apellidos || grupo.responsable.Apellidos}`
                              : "N/A"}
                          </span>
                          <span>
                            <strong>Fecha Evento:</strong>{" "}
                            {formatFechaDDMMYYYY(grupo.fecha_evento || grupo.FechaEvento)}
                          </span>
                        </div>
                        <div className="flex gap-2 sm:gap-4 mt-1 text-xs flex-wrap">
                          <span>Total: S/ {totalGrupo.toFixed(2)}</span>
                          <span>Adelanto: S/ {adelantoGrupo.toFixed(2)}</span>
                          <span className="text-red-600">
                            Saldo: S/ {(totalGrupo - adelantoGrupo).toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setGrupoExpandidoEnLista(isExpanded ? null : grupoId)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                          title="Ver miembros"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => verDetalleGrupo(grupo)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                          title="Ver detalle"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => imprimirTicketGrupo(grupo)}
                          className="p-1.5 text-teal-600 hover:bg-teal-50 rounded"
                          title="Imprimir"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => editarGrupo(grupo)}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                          title="Editar grupo"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => anularGrupo(grupoId)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                          title="Anular grupo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Miembros expandidos */}
                    {isExpanded && (grupo.miembros || []).length > 0 && (
                      <div className="bg-white p-1 overflow-x-auto">
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
                            {(grupo.miembros || []).map((miembro, idx) => {
                              const miembroId = miembro.ID || miembro.id;
                              const detalles = miembro.detalles || [];
                              const isMiembroExpanded =
                                miembroExpandido === `${grupoId}-${miembroId}`;

                              return (
                                <>
                                  <tr
                                    key={miembroId}
                                    className="border-b hover:bg-blue-50"
                                  >
                                    <td className="px-1.5 py-1 font-bold">{idx + 1}</td>
                                    <td className="px-1.5 py-1">
                                      {miembro.cliente
                                        ? `${miembro.cliente.nombre || miembro.cliente.Nombre} ${miembro.cliente.apellidos || miembro.cliente.Apellidos}`
                                        : "N/A"}
                                    </td>
                                    <td className="px-1.5 py-1">
                                      {miembro.cliente?.dni ||
                                        miembro.cliente?.DNI ||
                                        "N/A"}
                                    </td>
                                    <td className="px-1.5 py-1">
                                      {miembro.cliente?.telefono ||
                                        miembro.cliente?.Telefono ||
                                        "N/A"}
                                    </td>
                                    <td className="px-1.5 py-1">
                                      {formatFechaDDMMYYYY(miembro.fecha_evento)}
                                    </td>
                                    <td className="px-1.5 py-1">
                                      <select
                                        value={
                                          miembro.estado?.toLowerCase() ||
                                          "reservado"
                                        }
                                        onChange={(e) =>
                                          cambiarEstadoMiembroEnLista(
                                            miembroId,
                                            e.target.value,
                                            grupoId,
                                          )
                                        }
                                        className={`text-[10px] px-1.5 py-0.5 rounded font-medium cursor-pointer ${
                                          miembro.estado?.toLowerCase() ===
                                          "reservado"
                                            ? "bg-yellow-100"
                                            : miembro.estado?.toLowerCase() ===
                                                "listo"
                                              ? "bg-blue-100"
                                              : miembro.estado?.toLowerCase() ===
                                                  "entregado"
                                                ? "bg-green-100"
                                                : "bg-orange-100"
                                        }`}
                                      >
                                        <option value="reservado">RESERVADO</option>
                                        <option value="listo">LISTO</option>
                                        <option value="entregado">ENTREGADO</option>
                                        <option value="devuelto">DEVUELTO</option>
                                      </select>
                                    </td>
                                    <td className="px-1.5 py-1 text-right font-medium">
                                      S/ {(miembro.total || 0).toFixed(2)}
                                    </td>
                                    <td className="px-1.5 py-1 text-right">
                                      S/ {(miembro.adelanto || 0).toFixed(2)}
                                    </td>
                                    <td className="px-1.5 py-1 text-right text-red-600">
                                      S/ {((miembro.total || 0) - (miembro.adelanto || 0)).toFixed(2)}
                                    </td>
                                    <td className="px-1.5 py-1 text-center">
                                      <div className="flex items-center justify-center gap-0.5">
                                        <button
                                          onClick={() => setMiembroExpandido(isMiembroExpanded ? null : `${grupoId}-${miembroId}`)}
                                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                          title="Ver productos"
                                        >
                                          <Eye className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => imprimirTicketMiembro(grupo, miembro)}
                                          className="p-1 text-teal-600 hover:bg-teal-50 rounded"
                                          title="Imprimir ticket individual"
                                        >
                                          <Printer className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => editarGrupo(grupo)}
                                          className="p-1 text-amber-600 hover:bg-amber-50 rounded"
                                          title="Editar grupo completo"
                                        >
                                          <Edit className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => eliminarMiembroDelGrupo(miembroId, grupoId)}
                                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                                          title="Eliminar miembro"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                  {/* Fila expandida con productos del miembro */}
                                  {isMiembroExpanded && (
                                    <tr key={`${miembroId}-detalles`}>
                                      <td colSpan={10} className="p-0">
                                        <div className="bg-blue-50 px-2 py-1.5 border-l-4 border-blue-400">
                                          {/* Info del cliente */}
                                          <div className="bg-white rounded px-2 py-1 text-[10px] mb-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-gray-600">
                                            {miembro.cliente?.direccion && (
                                              <span><strong>Dir:</strong> {miembro.cliente.direccion}</span>
                                            )}
                                            {miembro.cliente?.correo && (
                                              <span><strong>Correo:</strong> {miembro.cliente.correo}</span>
                                            )}
                                            {miembro.descripcion && (
                                              <span><strong>Notas:</strong> {miembro.descripcion}</span>
                                            )}
                                          </div>

                                          {/* Productos */}
                                          <h5 className="font-medium text-[10px] mb-1 text-gray-500 uppercase tracking-wide">
                                            Productos ({detalles.length})
                                          </h5>
                                          {detalles.length > 0 ? (
                                            <div className="space-y-1">
                                              {detalles.map((det, i) => {
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
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== MODALES ==================== */}

      {/* Modal Responsable */}
      {showResponsableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg shadow-md w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="bg-blue-400 p-2 flex items-center justify-between rounded-t-lg">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">
                  ASIGNAR RESPONSABLE DEL GRUPO
                </span>
                <VoiceMicButton accion="registrar_cliente" getFormContext={getResponsableFormContext} />
              </div>
              <button
                onClick={() => {
                  setShowResponsableModal(false);
                  resetResponsable();
                  setClienteExistenteResponsable(null);
                }}
                className="text-white/80 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-3 sm:p-4 bg-sky-50 rounded-b-lg">
              {clienteExistenteResponsable && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded">
                    Cliente existente: {clienteExistenteResponsable.nombre || clienteExistenteResponsable.Nombre} {clienteExistenteResponsable.apellidos || clienteExistenteResponsable.Apellidos}
                  </span>
                  <button type="button" onClick={() => setClienteExistenteResponsable(null)} className="text-xs text-red-500 hover:text-red-700">✕ Limpiar</button>
                </div>
              )}

              <form onSubmit={handleSubmitResponsable(onSubmitResponsable)} data-form="responsable">
                <div className="space-y-2">
                  {/* DNI + Buscar */}
                  <div className="relative">
                    <label className="absolute -top-2 left-2 bg-sky-50 px-1 text-[10px] font-medium text-gray-700 z-10">
                      DNI <span className="text-orange-500">*</span>
                    </label>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        placeholder="12345678"
                        maxLength={8}
                        {...registerResponsable("dni", {
                          required: "DNI requerido",
                          pattern: { value: /^[0-9]{8}$/, message: "8 dígitos" },
                        })}
                        className="w-full border rounded px-1.5 py-1 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => buscarCliente(watchResponsable("dni"), "responsable")}
                        disabled={loading}
                        className="bg-green-500 rounded px-1.5 py-1 text-[10px] text-white hover:bg-green-600 disabled:bg-gray-400 whitespace-nowrap font-bold"
                      >
                        🔍
                      </button>
                    </div>
                    {errorsResponsable.dni && <span className="text-red-500 text-[10px]">{errorsResponsable.dni.message}</span>}
                  </div>

                  {/* Nombre + Apellidos */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <label className="absolute -top-2 left-2 bg-sky-50 px-1 text-[10px] font-medium text-gray-700 z-10">
                        Nombre <span className="text-orange-500">*</span>
                      </label>
                      <input type="text" placeholder="Juan Carlos" {...registerResponsable("nombre", { required: "Requerido" })} className="w-full border rounded px-2 py-1 text-xs" />
                    </div>
                    <div className="relative">
                      <label className="absolute -top-2 left-2 bg-sky-50 px-1 text-[10px] font-medium text-gray-700 z-10">
                        Apellidos <span className="text-orange-500">*</span>
                      </label>
                      <input type="text" placeholder="Pérez García" {...registerResponsable("apellidos", { required: "Requerido" })} className="w-full border rounded px-2 py-1 text-xs" />
                    </div>
                  </div>

                  {/* Teléfono + Dirección */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <label className="absolute -top-2 left-2 bg-sky-50 px-1 text-[10px] font-medium text-gray-700 z-10">
                        Teléfono <span className="text-orange-500">*</span>
                      </label>
                      <div className="flex gap-1">
                        <input type="text" placeholder="987654321" maxLength={9} {...registerResponsable("telefono", { required: "Requerido", pattern: { value: /^[0-9]{9}$/, message: "9 dígitos numéricos" } })} className="w-full border rounded px-1.5 py-1 text-xs" />
                        <button type="button" onClick={() => { const n = (watchResponsable("telefono") || "").replace(/\D/g, ""); if (n.length === 9) window.location.href = `tel:+51${n}`; }} className="text-blue-500 text-xs px-0.5">📞</button>
                      </div>
                      {errorsResponsable.telefono && <span className="text-red-500 text-[10px]">{errorsResponsable.telefono.message}</span>}
                    </div>
                    <div className="relative">
                      <label className="absolute -top-2 left-2 bg-sky-50 px-1 text-[10px] font-medium text-gray-700 z-10">
                        Dirección <span className="text-orange-500">*</span>
                      </label>
                      <input type="text" placeholder="Dirección y referencia" {...registerResponsable("direccion", { required: "Requerido" })} className="w-full border rounded px-2 py-1 text-xs" />
                      {errorsResponsable.direccion && <span className="text-red-500 text-[10px]">{errorsResponsable.direccion.message}</span>}
                    </div>
                  </div>

                  {/* Foto compacta */}
                  <div className="flex items-center gap-1">
                    <input type="file" accept="image/*" ref={imagenResponsableInputRef} onChange={handleImagenResponsableChange} className="hidden" />
                    <button type="button" onClick={() => imagenResponsableInputRef.current?.click()} className="bg-blue-500 text-white px-1.5 py-1 rounded text-[10px] hover:bg-blue-600">
                      <Upload size={12} />
                    </button>
                    <label className="bg-green-500 text-white px-1.5 py-1 rounded text-[10px] hover:bg-green-600 cursor-pointer inline-flex items-center" title="Tomar foto">
                      <Camera size={12} />
                      <input type="file" accept="image/*" capture="environment" ref={imagenResponsableCamaraRef} onChange={handleImagenResponsableChange} className="hidden" />
                    </label>
                    {imagenResponsablePreview && (
                      <div className="relative">
                        <img src={imagenResponsablePreview} alt="Preview" className="w-8 h-8 object-cover rounded border cursor-pointer hover:ring-2 hover:ring-blue-400" onClick={() => setFotoAmpliada(imagenResponsablePreview)} title="Clic para ampliar" />
                        <button type="button" onClick={() => { setImagenResponsable(null); setImagenResponsablePreview(null); }} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center text-[8px]">x</button>
                      </div>
                    )}
                    {!imagenResponsablePreview && clienteExistenteResponsable?.imagen && (
                      <div className="relative flex items-center gap-1">
                        <img src={buildImageUrl(clienteExistenteResponsable.imagen)} alt="Responsable" className="w-8 h-8 object-cover rounded border cursor-pointer hover:ring-2 hover:ring-blue-400" onClick={() => setFotoAmpliada(buildImageUrl(clienteExistenteResponsable.imagen))} title="Clic para ampliar" />
                        <span className="text-[10px] text-gray-500">Actual</span>
                      </div>
                    )}
                    {!imagenResponsablePreview && !clienteExistenteResponsable?.imagen && <span className="text-[10px] text-gray-400">Foto</span>}
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowResponsableModal(false);
                      resetResponsable();
                      setClienteExistenteResponsable(null);
                    }}
                    className="px-4 py-2 bg-gray-500 text-white rounded text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-bold disabled:bg-gray-400"
                  >
                    {loading ? "..." : "Asignar"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Miembro Individual */}
      {showModalEditarMiembro && miembroParaEditar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl p-3 sm:p-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-yellow-600">
                <Edit size={20} className="inline mr-2" />
                Editar Miembro
              </h3>
              <button
                onClick={() => {
                  setShowModalEditarMiembro(false);
                  setMiembroParaEditar(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            {/* Datos del cliente (solo lectura) */}
            <div className="bg-blue-50 rounded p-3 mb-4">
              <h4 className="text-sm font-bold mb-2 text-blue-700">
                Datos del Cliente
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="font-semibold">Nombre:</span>{" "}
                  {miembroParaEditar.cliente?.nombre ||
                    miembroParaEditar.cliente?.Nombre ||
                    "N/A"}{" "}
                  {miembroParaEditar.cliente?.apellidos ||
                    miembroParaEditar.cliente?.Apellidos ||
                    ""}
                </div>
                <div>
                  <span className="font-semibold">DNI:</span>{" "}
                  {miembroParaEditar.cliente?.dni ||
                    miembroParaEditar.cliente?.DNI ||
                    "N/A"}
                </div>
                <div>
                  <span className="font-semibold">Teléfono:</span>{" "}
                  {miembroParaEditar.cliente?.telefono ||
                    miembroParaEditar.cliente?.Telefono ||
                    "N/A"}
                </div>
              </div>
            </div>

            {/* Campos editables */}
            <div className="space-y-4">
              {/* Estado */}
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Estado del Miembro
                </label>
                <select
                  value={miembroParaEditar.estado?.toLowerCase() || "reservado"}
                  onChange={(e) =>
                    setMiembroParaEditar({
                      ...miembroParaEditar,
                      estado: e.target.value,
                    })
                  }
                  className={`w-full border rounded px-3 py-2 text-sm font-bold ${
                    miembroParaEditar.estado?.toLowerCase() === "reservado"
                      ? "bg-yellow-100"
                      : miembroParaEditar.estado?.toLowerCase() === "listo"
                        ? "bg-blue-100"
                        : miembroParaEditar.estado?.toLowerCase() ===
                            "entregado"
                          ? "bg-green-100"
                          : "bg-orange-100"
                  }`}
                >
                  <option value="reservado">RESERVADO</option>
                  <option value="listo">LISTO</option>
                  <option value="entregado">ENTREGADO</option>
                  <option value="devuelto">DEVUELTO</option>
                </select>
              </div>

              {/* Adelanto */}
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Adelanto (S/)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={miembroParaEditar.total || 0}
                  value={miembroParaEditar.adelanto || 0}
                  onChange={(e) => {
                    let val = parseFloat(e.target.value) || 0;
                    const totalMiembro = miembroParaEditar.total || 0;
                    if (val > totalMiembro) val = totalMiembro;
                    if (val < 0) val = 0;
                    setMiembroParaEditar({
                      ...miembroParaEditar,
                      adelanto: val,
                    });
                  }}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>

              {/* Total */}
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Total (S/)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={miembroParaEditar.total || 0}
                  onChange={(e) =>
                    setMiembroParaEditar({
                      ...miembroParaEditar,
                      total: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>

              {/* Saldo calculado */}
              <div className="bg-red-50 rounded p-3">
                <span className="font-semibold">Saldo pendiente: </span>
                <span className="text-red-600 font-bold text-lg">
                  S/{" "}
                  {(
                    (miembroParaEditar.total || 0) -
                    (miembroParaEditar.adelanto || 0)
                  ).toFixed(2)}
                </span>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Descripción / Notas
                </label>
                <textarea
                  value={miembroParaEditar.descripcion || ""}
                  onChange={(e) =>
                    setMiembroParaEditar({
                      ...miembroParaEditar,
                      descripcion: e.target.value,
                    })
                  }
                  rows={3}
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="Notas adicionales sobre este miembro..."
                />
              </div>

              {/* Productos del miembro (solo lectura) */}
              {miembroParaEditar.detalles &&
                miembroParaEditar.detalles.length > 0 && (
                  <div className="bg-blue-50 rounded p-3">
                    <h4 className="text-sm font-bold mb-2 text-blue-700">
                      📦 Productos ({miembroParaEditar.detalles.length})
                    </h4>
                    <div className="space-y-2">
                      {miembroParaEditar.detalles.map((det, i) => {
                        const combo = det.combo || det.Combo;
                        const producto = det.producto || det.Producto;
                        const precio = det.total || det.Total || det.precio_unitario || det.PrecioUnitario || 0;
                        const cantidad = det.cantidad || det.Cantidad || 1;
                        const esCombo = !!combo;
                        const productosCombo = det.productos_del_combo || det.ProductosDelCombo || [];

                        if (esCombo) {
                          return (
                            <div key={i} className="rounded border border-purple-200 bg-purple-50">
                              <div className="flex items-center justify-between px-2 py-1.5 text-xs border-b border-purple-200">
                                <span className="text-purple-700 font-bold">🎁 {combo.nombre || combo.Nombre || "Combo"}</span>
                                <span className="font-bold">x{cantidad} — S/ {parseFloat(precio).toFixed(2)}</span>
                              </div>
                              {productosCombo.length > 0 ? (
                                <div className="px-2 py-1.5 space-y-1">
                                  {productosCombo.map((prodC, j) => {
                                    const imgCombo = buildImageUrl(prodC.imagen || prodC.Imagen);
                                    const attrCombo = [
                                      prodC.talla ? `T: ${prodC.talla}` : '',
                                      prodC.modelo ? `M: ${prodC.modelo}` : '',
                                      prodC.color ? `C: ${prodC.color}` : '',
                                    ].filter(Boolean).join(' | ');
                                    return (
                                      <div key={j} className="flex items-center gap-2 text-xs bg-white rounded px-1.5 py-1 border border-purple-100">
                                        {imgCombo ? (
                                          <img src={imgCombo} alt={prodC.nombre} className="w-8 h-8 object-cover rounded border flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-blue-400" onClick={() => setFotoAmpliada(imgCombo)} title="Clic para ampliar" onError={(e) => { e.target.style.display = 'none'; }} />
                                        ) : (
                                          <div className="w-8 h-8 bg-gray-100 rounded border flex items-center justify-center flex-shrink-0">
                                            <Package className="w-3 h-3 text-gray-400" />
                                          </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                          <span className="font-medium text-[11px]">{prodC.nombre || prodC.Nombre}</span>
                                          {attrCombo && <div className="text-[10px] text-gray-500">{attrCombo}</div>}
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
                          <div key={i} className="rounded border border-blue-100 bg-white">
                            <div className="flex items-center gap-2 px-2 py-1.5 text-xs">
                              {imgSrc ? (
                                <img src={imgSrc} alt={producto?.nombre || 'Producto'} className="w-8 h-8 object-cover rounded border flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-blue-400" onClick={() => setFotoAmpliada(imgSrc)} title="Clic para ampliar" onError={(e) => { e.target.style.display = 'none'; }} />
                              ) : (
                                <div className="w-8 h-8 bg-gray-100 rounded border flex items-center justify-center flex-shrink-0">
                                  <Package className="w-4 h-4 text-gray-400" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <span className="font-medium">{producto?.nombre || producto?.Nombre || "Producto"}</span>
                                {atributos && <div className="text-[10px] text-gray-500">{atributos}</div>}
                              </div>
                              <span className="font-bold flex-shrink-0">x{cantidad} — S/ {parseFloat(precio).toFixed(2)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <button
                type="button"
                onClick={() => {
                  setShowModalEditarMiembro(false);
                  setMiembroParaEditar(null);
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded font-bold hover:bg-gray-600"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={guardarEdicionMiembro}
                disabled={loading}
                className="px-6 py-2 bg-yellow-500 text-white rounded font-bold hover:bg-yellow-600 disabled:bg-gray-400"
              >
                {loading ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pagos */}
      {showPagosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-3 sm:p-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-bold">Agregar Método de Pago</h3>
              <button
                onClick={() => setShowPagosModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const metodoPago = metodosPago.find(
                  (m) => (m.ID || m.id) == formData.get("id_pago"),
                );
                if (metodoPago) {
                  agregarMetodoPago(
                    metodoPago,
                    formData.get("monto"),
                    formData.get("descripcion"),
                  );
                  e.target.reset();
                }
              }}
            >
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold">
                    Método de Pago *
                  </label>
                  <select
                    name="id_pago"
                    required
                    className="w-full border rounded px-3 py-2 text-sm"
                  >
                    <option value="">Seleccione...</option>
                    {metodosPago.map((metodo) => (
                      <option
                        key={metodo.ID || metodo.id}
                        value={metodo.ID || metodo.id}
                      >
                        {metodo.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold">Monto <span className="text-orange-500">*</span></label>
                  <input
                    type="number"
                    name="monto"
                    step="0.01"
                    required
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold">Descripción</label>
                  <input
                    type="text"
                    name="descripcion"
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setShowPagosModal(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded text-sm"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-bold"
                >
                  Agregar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Combos */}
      {showCombosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-3 bg-blue-400 text-white flex justify-between items-center rounded-t-lg">
              <h3 className="text-lg font-bold">Seleccionar Combo</h3>
              <button
                onClick={() => setShowCombosModal(false)}
                className="hover:bg-blue-500 p-1 rounded"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-3 max-h-96 overflow-y-auto">
              {combos.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No hay combos disponibles
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {combos.map((combo) => {
                    const comboId = combo.ID || combo.id;
                    const nombres = (combo.productos || [])
                      .map((p) => p.nombre)
                      .filter(Boolean);
                    return (
                      <div
                        key={comboId}
                        className="border rounded-lg p-3 hover:bg-blue-50"
                      >
                        <h4 className="font-bold text-sm mb-1">
                          {combo.nombre}
                        </h4>
                        <p className="text-xs text-gray-600 mb-2">
                          {combo.descripcion}
                        </p>
                        {nombres.length > 0 && (
                          <div className="mb-2 text-xs">
                            <p className="font-semibold">Productos:</p>
                            {nombres.map((nombre, idx) => (
                              <div key={idx}>• {nombre}</div>
                            ))}
                          </div>
                        )}
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-bold text-blue-600">
                            S/ {Number(combo.precio_oferta || 0).toFixed(2)}
                          </span>
                          <button
                            onClick={() => agregarCombo(combo)}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                          >
                            Escanear
                          </button>
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

      {/* Modal Escanear Combo */}
      {showComboScanModal && comboActivo && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black bg-opacity-50 p-2 pt-4 sm:p-4 sm:pt-6">
          <div className="bg-white rounded-lg w-full max-w-2xl h-[92vh] overflow-hidden flex flex-col">
            {/* Header azul */}
            <div className="p-3 bg-blue-400 text-white flex justify-between items-center rounded-t-lg flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold">
                  Agregando Productos: {comboActivo.nombre}
                </h3>
                <p className="text-xs text-blue-50">
                  Productos agregados: {productosComboIngresados.length} /{" "}
                  {(comboActivo.productos || []).length}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowComboScanModal(false);
                  setComboActivo(null);
                  setProductosComboIngresados([]);
                  setBarcodeCombo("");
                  setSearchNombreCombo("");
                  setProductosEncontradosCombo([]);
                  setSearchProductoCombo("");
                  setProductosComboEncontrados([]);
                  setShowProductoComboResults(false);
                }}
                className="hover:bg-blue-500 p-1 rounded"
              >
                <X size={20} />
              </button>
            </div>

            {/* Contenido scrolleable */}
            <div className="p-3 sm:p-4 overflow-y-auto flex-1">

            <div className="mb-3">
              <h4 className="font-semibold mb-2 text-sm">
                Productos del combo:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(comboActivo.productos || []).map((prod, idx) => {
                  const yaEscaneado = productosComboIngresados.some(
                    (p) =>
                      p.nombre?.toLowerCase() === prod.nombre?.toLowerCase(),
                  );
                  const escaneado = yaEscaneado
                    ? productosComboIngresados.find(
                        (p) => p.nombre?.toLowerCase() === prod.nombre?.toLowerCase()
                      )
                    : null;
                  const imgUrl = escaneado
                    ? buildImageUrl(escaneado.imagen)
                    : null;

                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-2 p-2 rounded text-xs ${
                        yaEscaneado
                          ? "bg-green-100 text-green-800"
                          : "bg-blue-100 text-gray-600"
                      }`}
                    >
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={prod.nombre}
                          className="w-10 h-10 object-cover rounded border flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-blue-400"
                          onClick={() => setFotoAmpliada(imgUrl)}
                          title="Clic para ampliar"
                        />
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
                <label className="absolute -top-2 left-3 bg-white px-1 text-xs font-medium text-gray-700 z-10">
                  Buscar por nombre
                </label>
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={searchProductoCombo}
                    onChange={(e) => {
                      setSearchProductoCombo(e.target.value);
                      buscarProductosParaCombo(e.target.value);
                    }}
                    placeholder="Escriba el nombre del producto"
                    className="w-full border rounded px-1.5 py-1 text-xs focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none"
                  />
                  {searchProductoCombo && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchProductoCombo("");
                        setProductosComboEncontrados([]);
                        setShowProductoComboResults(false);
                      }}
                      className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs flex-shrink-0"
                    >
                      ✕
                    </button>
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
                          <img
                            src={buildImageUrl(producto.imagen)}
                            alt={producto.nombre}
                            className="w-10 h-10 object-cover rounded border"
                          />
                        )}
                        <div className="flex-1">
                          <div className="font-medium text-xs">
                            {producto.nombre}
                          </div>
                          <div className="text-xs text-gray-500">
                            S/ {Number(producto.precio_alquiler || 0).toFixed(2)}
                          </div>
                          <div className="text-xs text-gray-400">
                            {producto.talla && <>Talla: {producto.talla}</>}
                            {producto.talla && (producto.modelo || producto.color) && <> | </>}
                            {producto.modelo && <>Modelo: {producto.modelo}</>}
                            {producto.modelo && producto.color && <> | </>}
                            {producto.color && <>Color: {producto.color}</>}
                          </div>
                          {producto.codigo_barras && (
                            <div className="text-xs text-gray-400">
                              Codigo: {producto.codigo_barras}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {showProductoComboResults && productosComboEncontrados.length === 0 && searchProductoCombo && (
                  <div className="absolute z-20 w-full mt-1 bg-white border-2 border-orange-200 rounded-lg shadow-xl p-3">
                    <p className="text-xs text-gray-500 text-center">
                      No se encontraron productos con "{searchProductoCombo}"
                    </p>
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
              <label className="absolute -top-2 left-3 bg-white px-1 text-xs font-medium text-gray-700 z-10">
                Código de barras
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={barcodeCombo}
                  onChange={(e) => setBarcodeCombo(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && barcodeCombo.trim()) {
                      e.preventDefault();
                      agregarProductoAlCombo(barcodeCombo);
                    }
                  }}
                  placeholder="Escanee o digite el código"
                  className="flex-1 border rounded px-1.5 py-1 text-xs focus:ring-2 focus:ring-green-300 focus:border-green-400 outline-none"
                />
                  <button
                    onClick={() => agregarProductoAlCombo(barcodeCombo)}
                    disabled={!barcodeCombo || loading}
                    className="px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 disabled:bg-gray-400"
                  >
                    {loading ? "..." : "Agregar"}
                  </button>
                </div>
            </div>

            {/* Productos agregados */}
            {productosComboIngresados.length > 0 && (
              <div className="mb-3">
                <h4 className="font-semibold mb-1 text-sm">
                  Productos agregados:
                </h4>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {productosComboIngresados.map((prod, idx) => {
                    const imgUrl = buildImageUrl(prod.imagen);
                    return (
                      <div key={idx} className="flex items-center gap-2 p-1.5 bg-green-50 rounded border border-green-200">
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={prod.nombre}
                            className="w-10 h-10 object-cover rounded border flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-blue-400"
                            onClick={() => setFotoAmpliada(imgUrl)}
                            title="Clic para ampliar"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-100 rounded border flex items-center justify-center text-[9px] text-gray-400 flex-shrink-0">
                            Sin img
                          </div>
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
                          <div className="text-[10px] text-gray-400">
                            Código: {prod.codigo_barras || "-"}
                          </div>
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
                onClick={() => {
                  setShowComboScanModal(false);
                  setComboActivo(null);
                  setProductosComboIngresados([]);
                  setBarcodeCombo("");
                  setSearchNombreCombo("");
                  setProductosEncontradosCombo([]);
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
              >
                Cancelar
              </button>
              <button
                onClick={completarCombo}
                disabled={productosComboIngresados.length < (comboActivo.productos || []).length}
                className="px-6 py-2 bg-blue-600 text-white rounded text-sm font-bold hover:bg-blue-700 disabled:bg-gray-400"
              >
                {productosComboIngresados.length >=
                (comboActivo.productos || []).length
                  ? "✅ Completar Combo"
                  : `⏳ Faltan ${(comboActivo.productos || []).length - productosComboIngresados.length} producto(s)`}
              </button>
            </div>
            </div>{/* cierre contenido scrolleable */}
          </div>
        </div>
      )}

      {/* Modal Ver Detalle Grupo */}
      {showModalDetalle && grupoDetalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-3 border-b flex justify-between items-center bg-blue-600 text-white">
              <h3 className="text-lg font-bold">
                Detalle: {grupoDetalle.nombre_grupo || grupoDetalle.NombreGrupo}
              </h3>
              <button
                onClick={() => setShowModalDetalle(false)}
                className="hover:bg-blue-700 p-1 rounded"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-3 overflow-y-auto max-h-[70vh]">
              {/* Info del grupo */}
              <div className="bg-gray-50 rounded px-3 py-2 mb-2 text-[11px]">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  <div>
                    <span className="text-gray-400">Responsable</span>
                    <p className="font-medium text-gray-800">
                      {grupoDetalle.responsable
                        ? `${grupoDetalle.responsable.nombre || grupoDetalle.responsable.Nombre} ${grupoDetalle.responsable.apellidos || grupoDetalle.responsable.Apellidos}`
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400">Fecha Evento</span>
                    <p className="font-medium text-gray-800">
                      {formatFechaDDMMYYYY(grupoDetalle.fecha_evento || grupoDetalle.FechaEvento)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400">Estado</span>
                    <p className="font-medium text-gray-800 uppercase">{grupoDetalle.estado}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Miembros</span>
                    <p className="font-medium text-gray-800">{(grupoDetalle.miembros || []).length}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-400">Descripción</span>
                    <p className="text-gray-800">{grupoDetalle.descripcion || "-"}</p>
                  </div>
                </div>
              </div>

              {/* Resumen financiero */}
              <div className="flex gap-3 mb-2 text-[11px]">
                <div className="flex-1 bg-gray-50 rounded px-2 py-1.5 text-center">
                  <span className="text-gray-400">Total</span>
                  <p className="font-bold text-gray-800">
                    S/ {(grupoDetalle.miembros || []).reduce((sum, m) => sum + (m.total || 0), 0).toFixed(2)}
                  </p>
                </div>
                <div className="flex-1 bg-gray-50 rounded px-2 py-1.5 text-center">
                  <span className="text-gray-400">Adelanto</span>
                  <p className="font-bold text-gray-800">
                    S/ {(grupoDetalle.miembros || []).reduce((sum, m) => sum + (m.adelanto || 0), 0).toFixed(2)}
                  </p>
                </div>
                <div className="flex-1 bg-gray-50 rounded px-2 py-1.5 text-center">
                  <span className="text-gray-400">Saldo</span>
                  <p className="font-bold text-red-600">
                    S/ {((grupoDetalle.miembros || []).reduce((sum, m) => sum + (m.total || 0), 0) - (grupoDetalle.miembros || []).reduce((sum, m) => sum + (m.adelanto || 0), 0)).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Lista de miembros */}
              <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium mb-1">
                Miembros ({(grupoDetalle.miembros || []).length})
              </p>
              <div className="space-y-1.5">
                {(grupoDetalle.miembros || []).map((miembro, idx) => {
                  const detalles = miembro.detalles || [];
                  return (
                    <div
                      key={miembro.ID || miembro.id}
                      className="border border-gray-200 rounded overflow-hidden"
                    >
                      {/* Header del miembro */}
                      <div className="bg-gray-50 px-2 py-1.5">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-1">
                          <div className="text-[11px]">
                            <span className="bg-blue-500 text-white px-1.5 py-0.5 rounded text-[10px] font-medium mr-1.5">
                              {idx + 1}
                            </span>
                            <span className="font-medium text-gray-800">
                              {miembro.cliente
                                ? `${miembro.cliente.nombre || miembro.cliente.Nombre} ${miembro.cliente.apellidos || miembro.cliente.Apellidos}`
                                : "N/A"}
                            </span>
                            <span className="text-[10px] text-gray-400 ml-1.5">
                              DNI: {miembro.cliente?.dni || miembro.cliente?.DNI || "N/A"}
                            </span>
                            <span className="text-[10px] text-gray-400 ml-1.5">
                              Tel: {miembro.cliente?.telefono || "N/A"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                imprimirTicketMiembro(grupoDetalle, miembro);
                              }}
                              className="p-1 bg-green-500 text-white rounded hover:bg-green-600"
                              title="Imprimir ticket individual"
                            >
                              <Printer size={11} />
                            </button>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                miembro.estado?.toLowerCase() === "reservado"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : miembro.estado?.toLowerCase() === "listo"
                                    ? "bg-blue-100 text-blue-700"
                                    : miembro.estado?.toLowerCase() === "entregado"
                                      ? "bg-green-100 text-green-700"
                                      : "bg-orange-100 text-orange-700"
                              }`}
                            >
                              {miembro.estado?.toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="mt-1 text-[10px] flex flex-wrap gap-x-3 gap-y-0.5 text-gray-500">
                          <span>Fecha: <strong className="text-gray-700">{formatFechaDDMMYYYY(miembro.fecha_evento)}</strong></span>
                          <span>Total: <strong className="text-gray-700">S/ {(miembro.total || 0).toFixed(2)}</strong></span>
                          <span>Adel: <strong className="text-gray-700">S/ {(miembro.adelanto || 0).toFixed(2)}</strong></span>
                          <span>Saldo: <strong className="text-red-600">S/ {((miembro.total || 0) - (miembro.adelanto || 0)).toFixed(2)}</strong></span>
                        </div>
                      </div>

                      {/* Productos del miembro */}
                      {detalles.length > 0 && (
                        <div className="bg-white px-2 py-1.5 border-t border-gray-100">
                          <p className="text-[9px] text-gray-400 uppercase tracking-wide mb-1">
                            Productos ({detalles.length})
                          </p>
                          <div className="space-y-1">
                            {detalles.map((det, i) => {
                              const esCombo = !!det.combo;
                              const imgSrc = !esCombo ? buildImageUrl(det.producto?.imagen || det.producto?.Imagen) : null;
                              const atributos = det.producto ? [
                                det.producto.talla ? `T: ${det.producto.talla}` : '',
                                det.producto.modelo ? `M: ${det.producto.modelo}` : '',
                                det.producto.color ? `C: ${det.producto.color}` : '',
                              ].filter(Boolean).join(' | ') : '';
                              const productosCombo = det.productos_del_combo || det.ProductosDelCombo || [];

                              return (
                              <div key={i} className={`rounded border ${esCombo ? 'border-gray-200 bg-gray-50' : 'border-gray-100 bg-white'}`}>
                                {/* Producto individual */}
                                {!esCombo && (
                                  <div className="flex items-center gap-1.5 px-1.5 py-1 text-[11px]">
                                    {imgSrc ? (
                                      <img src={imgSrc} alt={det.producto?.nombre || 'Producto'} className="w-7 h-7 object-cover rounded border flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-blue-400" onClick={() => setFotoAmpliada(imgSrc)} title="Clic para ampliar" onError={(e) => { e.target.style.display = 'none'; }} />
                                    ) : (
                                      <div className="w-7 h-7 bg-gray-100 rounded border flex items-center justify-center flex-shrink-0">
                                        <Package className="w-3 h-3 text-gray-400" />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <span className="font-medium text-[11px] text-gray-800">{det.producto?.nombre || `Producto #${det.id_producto}`}</span>
                                      {atributos && <div className="text-[9px] text-gray-400">{atributos}</div>}
                                    </div>
                                    <span className="font-medium text-gray-600 flex-shrink-0 text-[11px]">
                                      S/ {(det.total || det.precio_unitario || 0).toFixed(2)}
                                    </span>
                                  </div>
                                )}

                                {/* Combo con productos */}
                                {esCombo && (
                                  <>
                                    <div className="flex items-center justify-between px-1.5 py-1 text-[11px] border-b border-gray-200 bg-gray-100">
                                      <span className="text-gray-700 font-medium">{det.combo.nombre}</span>
                                      <span className="font-medium text-gray-600">
                                        S/ {(det.total || det.precio_unitario || 0).toFixed(2)}
                                      </span>
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
                                                <span className="font-medium text-[10px] text-gray-700">{prodC.nombre}</span>
                                                {attrCombo && <div className="text-[9px] text-gray-400">{attrCombo}</div>}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <div className="px-1.5 py-0.5 text-[9px] text-gray-400">
                                        Sin detalle de productos del combo
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-3 border-t flex gap-2 flex-wrap">
                <button
                  onClick={() => imprimirTicketGrupo(grupoDetalle)}
                  className="px-3 py-2 bg-green-600 text-white rounded text-xs font-bold hover:bg-green-700 flex items-center gap-1"
                  title="Ticket resumen del grupo (80mm)"
                >
                  <Printer size={14} /> Ticket Resumen
                </button>
                <button
                  onClick={() => imprimirReporteGrupal(grupoDetalle)}
                  className="px-3 py-2 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 flex items-center gap-1"
                  title="Reporte completo en PDF (A4)"
                >
                  <FileText size={14} /> Reporte Completo
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Completar Pago para Entregar (Miembro Individual) */}
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
                <label className="text-sm font-medium text-gray-700 mb-1 block">Metodo de Pago</label>
                <select
                  value={pagoCompletarData.metodoPagoId}
                  onChange={(e) => setPagoCompletarData(prev => ({...prev, metodoPagoId: e.target.value}))}
                  className="w-full border rounded px-3 py-2 text-sm"
                >
                  <option value="">Seleccionar...</option>
                  {metodosPago.map(m => (
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
                  onChange={(e) => setPagoCompletarData(prev => ({...prev, monto: parseFloat(e.target.value) || 0}))}
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
                  onClick={completarPagoYEntregarMiembro}
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

      {/* Modal Completar Pagos del Grupo */}
      {showPagoGrupoModal && pagoGrupoData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-amber-500 to-orange-500">
              <h3 className="text-lg font-semibold text-white">Completar Pagos del Grupo</h3>
              <p className="text-amber-100 text-sm">{pagoGrupoData.grupoNombre}</p>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-600 mb-3">
                Los siguientes miembros tienen saldo pendiente. Debe completar el pago antes de entregar:
              </p>

              <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                {pagoGrupoData.miembrosPendientes.map((miembro, idx) => (
                  <div key={miembro.id} className="bg-gray-50 p-3 rounded border">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-sm">{idx + 1}. {miembro.nombre}</span>
                      <span className="font-bold text-red-600">S/ {miembro.saldo.toFixed(2)}</span>
                    </div>
                    <div className="flex gap-2 text-xs text-gray-500 mb-2">
                      <span>Total: S/ {miembro.total.toFixed(2)}</span>
                      <span>|</span>
                      <span>Adelanto: S/ {miembro.adelanto.toFixed(2)}</span>
                    </div>
                    <select
                      value={miembro.metodoPagoId}
                      onChange={(e) => {
                        setPagoGrupoData(prev => ({
                          ...prev,
                          miembrosPendientes: prev.miembrosPendientes.map(m =>
                            m.id === miembro.id ? { ...m, metodoPagoId: e.target.value } : m
                          ),
                        }));
                      }}
                      className="w-full border rounded px-2 py-1 text-xs"
                    >
                      <option value="">Seleccionar método...</option>
                      {metodosPago.map(m => (
                        <option key={m.ID || m.id} value={m.ID || m.id}>
                          {m.nombre || m.Nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="bg-red-50 p-3 rounded border border-red-200 mb-4 text-center">
                <p className="text-xs text-gray-500">Total saldo pendiente del grupo</p>
                <p className="font-bold text-xl text-red-600">
                  S/ {pagoGrupoData.miembrosPendientes.reduce((sum, m) => sum + m.saldo, 0).toFixed(2)}
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => { setShowPagoGrupoModal(false); setPagoGrupoData(null); }}
                  className="px-4 py-2 border text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={completarPagosGrupoYEntregar}
                  disabled={pagoGrupoData.miembrosPendientes.some(m => !m.metodoPagoId) || loading}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium text-sm disabled:bg-gray-400"
                >
                  {loading ? "Procesando..." : "Registrar Pagos y Entregar Grupo"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN / ALERTA */}
      {showConfirmModal && confirmModalData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden">
            <div className={`p-4 ${confirmModalData.tipo === "danger" ? "bg-red-500" : confirmModalData.tipo === "warning" ? "bg-yellow-500" : "bg-blue-500"}`}>
              <h3 className="text-lg font-semibold text-white">
                {confirmModalData.titulo}
              </h3>
            </div>
            <div className="p-5">
              <p className="text-gray-700 text-sm mb-3 whitespace-pre-line">{confirmModalData.mensaje}</p>
              {confirmModalData.conMotivo && (
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Motivo (obligatorio):</label>
                  <textarea
                    value={motivoAccion}
                    onChange={(e) => setMotivoAccion(e.target.value)}
                    placeholder="Ej: Cliente solicitó cancelación, error de registro..."
                    className="w-full border rounded px-2 py-1.5 text-xs resize-none focus:ring-2 focus:ring-red-300 focus:border-red-400"
                    rows={2}
                  />
                </div>
              )}
              <div className="flex gap-3 justify-end">
                {!confirmModalData.soloAceptar && (
                  <button
                    onClick={() => {
                      setShowConfirmModal(false);
                      setConfirmModalData(null);
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  onClick={confirmModalData.soloAceptar ? () => { setShowConfirmModal(false); setConfirmModalData(null); } : () => confirmModalData.onConfirm(motivoAccion)}
                  className={`px-4 py-2 text-white rounded-lg font-medium text-sm ${
                    confirmModalData.tipo === "danger"
                      ? "bg-red-600 hover:bg-red-700"
                      : confirmModalData.tipo === "warning"
                        ? "bg-yellow-600 hover:bg-yellow-700"
                        : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {confirmModalData.soloAceptar ? "Aceptar" : "Confirmar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .voice-filling {
          outline: 2px solid #3b82f6 !important;
          background-color: #eff6ff !important;
          transition: all 0.2s ease;
        }
      `}</style>

      {/* Modal foto ampliada */}
      {fotoAmpliada && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70] p-4" onClick={() => setFotoAmpliada(null)}>
          <div className="relative max-w-2xl max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            <img src={fotoAmpliada} alt="Foto ampliada" className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" />
            <button
              type="button"
              onClick={() => setFotoAmpliada(null)}
              className="absolute -top-3 -right-3 bg-red-500 hover:bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg shadow-lg"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
