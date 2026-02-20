import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useCaja } from "../funciones/CajaContext";
import { fechaLocalStr } from "../funciones/funciones";
import { NombreContexto } from "../App2";
import {
  Wallet,
  DollarSign,
  FileText,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Banknote,
  Clock,
  Printer,
  ArrowLeft,
  ShoppingCart,
  Calendar,
  Eye,
  ChevronDown,
  ChevronUp,
  Download,
  Search,
  History,
} from "lucide-react";
import jsPDF from "jspdf";
import { fetchAuth } from "../funciones/auth";
import { API_BASE_URL } from "../config";

const API_BASE = API_BASE_URL;

export default function CerrarCaja() {
  const navigate = useNavigate();
  const { usuario } = useContext(NombreContexto);
  const { cajaActual, cajaAbierta, cajaDiaAnterior, verificando, cerrarCaja, obtenerReporte } = useCaja();
  const [cargando, setCargando] = useState(false);
  const [cargandoReporte, setCargandoReporte] = useState(true);
  const [reporte, setReporte] = useState(null);
  const [cajaCerrada, setCajaCerrada] = useState(null);

  // Estados para reportes detallados
  const [ventasDelDia, setVentasDelDia] = useState([]);
  const [reservasDelDia, setReservasDelDia] = useState([]);
  const [modosPagoDelDia, setModosPagoDelDia] = useState([]);
  const [showVentas, setShowVentas] = useState(false);
  const [showReservas, setShowReservas] = useState(false);
  const [resumenMetodosPago, setResumenMetodosPago] = useState({});
  const [empresaConfig, setEmpresaConfig] = useState(null);

  // Estados para historial de cajas
  const [historialCajas, setHistorialCajas] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [fechaDesde, setFechaDesde] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return fechaLocalStr(d);
  });
  const [fechaHasta, setFechaHasta] = useState(() => fechaLocalStr());
  const [showHistorial, setShowHistorial] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm({
    defaultValues: {
      saldo_final: "",
      observaciones: "",
    },
  });

  const saldoFinal = watch("saldo_final");

  // Cargar configuración de empresa
  useEffect(() => {
    const cargarConfiguracion = async () => {
      try {
        const res = await fetchAuth(`${API_BASE}/configuracion`);
        if (res.ok) {
          const data = await res.json();
          setEmpresaConfig(data);
        }
      } catch (error) {
      }
    };
    cargarConfiguracion();
  }, []);

  // Cargar reporte al montar
  useEffect(() => {
    const cargarReporte = async () => {
      if (cajaActual) {
        try {
          setCargandoReporte(true);
          const data = await obtenerReporte(cajaActual.ID);
          setReporte(data);

          // Cargar ventas del día
          await cargarVentasDelDia();
          // Cargar reservas del día
          await cargarReservasDelDia();
          // Cargar modos de pago
          await cargarModosPagoDelDia();
        } catch (error) {
        } finally {
          setCargandoReporte(false);
        }
      }
    };

    if (!verificando && cajaAbierta && cajaActual) {
      cargarReporte();
    } else if (!verificando && !cajaAbierta) {
      setCargandoReporte(false);
    }
  }, [cajaActual, cajaAbierta, verificando, obtenerReporte, navigate]);

  // Función para cargar ventas del día
  async function cargarVentasDelDia() {
    try {
      const response = await fetchAuth(`${API_BASE}/ventas`);
      if (!response.ok) return;

      let ventas = await response.json();

      // Filtrar solo las ventas de hoy
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const manana = new Date(hoy);
      manana.setDate(manana.getDate() + 1);

      ventas = ventas.filter((venta) => {
        const fechaVenta = new Date(venta.CreatedAt || venta.created_at);
        return fechaVenta >= hoy && fechaVenta < manana;
      });

      // Ordenar por fecha más reciente
      ventas.sort((a, b) => new Date(b.CreatedAt || b.created_at) - new Date(a.CreatedAt || a.created_at));

      setVentasDelDia(ventas);
    } catch (error) {
    }
  }

  // Función para cargar reservas del día
  async function cargarReservasDelDia() {
    try {
      const response = await fetchAuth(`${API_BASE}/reservas`);
      if (!response.ok) return;

      let reservas = await response.json();

      // Filtrar solo las reservas creadas hoy
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const manana = new Date(hoy);
      manana.setDate(manana.getDate() + 1);

      reservas = reservas.filter((reserva) => {
        const fechaReserva = new Date(reserva.CreatedAt || reserva.created_at);
        return fechaReserva >= hoy && fechaReserva < manana;
      });

      // Ordenar por fecha más reciente
      reservas.sort((a, b) => new Date(b.CreatedAt || b.created_at) - new Date(a.CreatedAt || a.created_at));

      setReservasDelDia(reservas);
    } catch (error) {
    }
  }

  // Función para cargar modos de pago del día y calcular resumen
  async function cargarModosPagoDelDia() {
    try {
      // Obtener métodos de pago disponibles
      const resPagos = await fetchAuth(`${API_BASE}/pagos`);
      const metodosPago = await resPagos.json();

      // Obtener modos de pago (transacciones)
      const resModos = await fetchAuth(`${API_BASE}/modos-pago`);
      if (!resModos.ok) return;

      let modos = await resModos.json();

      // Filtrar solo los de hoy
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const manana = new Date(hoy);
      manana.setDate(manana.getDate() + 1);

      modos = modos.filter((modo) => {
        const fechaModo = new Date(modo.CreatedAt || modo.created_at);
        return fechaModo >= hoy && fechaModo < manana;
      });

      setModosPagoDelDia(modos);

      // Calcular resumen por método de pago
      const resumen = {};
      modos.forEach((modo) => {
        const metodoPago = metodosPago.find((m) => (m.ID || m.id) === modo.id_pago);
        const nombreMetodo = metodoPago?.nombre || "Otro";

        if (!resumen[nombreMetodo]) {
          resumen[nombreMetodo] = { total: 0, cantidad: 0 };
        }
        resumen[nombreMetodo].total += parseFloat(modo.monto || 0);
        resumen[nombreMetodo].cantidad += 1;
      });

      setResumenMetodosPago(resumen);
    } catch (error) {
    }
  }

  // Calcular diferencia de arqueo
  const calcularDiferencia = () => {
    if (!cajaActual || !saldoFinal) return null;
    const efectivoEsperado = cajaActual.saldo_inicial + (reporte?.resumen_por_medio?.efectivo || 0);
    const diferencia = parseFloat(saldoFinal) - efectivoEsperado;
    return {
      esperado: efectivoEsperado,
      contado: parseFloat(saldoFinal),
      diferencia,
    };
  };

  const arqueo = calcularDiferencia();

  const onSubmit = async (data) => {
    setCargando(true);
    try {
      const resultado = await cerrarCaja(data.saldo_final, data.observaciones);
      setCajaCerrada(resultado);
      toast.success("Caja cerrada exitosamente");
    } catch (error) {
      toast.error(error.message || "Error al cerrar caja");
    } finally {
      setCargando(false);
    }
  };

  const handleImprimir = () => {
    window.print();
  };

  // Función para generar PDF del reporte (usa cajaCerrada si existe, sino cajaActual)
  const generarPDF = () => {
    // Usar datos de cajaCerrada (post-cierre) o cajaActual (pre-cierre)
    const datosCaja = cajaCerrada || cajaActual;
    if (!datosCaja) {
      toast.error("No hay datos de caja para generar el reporte");
      return;
    }

    const doc = new jsPDF();
    const fechaHoy = new Date().toLocaleDateString("es-PE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const horaActual = new Date().toLocaleTimeString("es-PE", {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Configuración inicial
    let y = 15;
    const marginLeft = 20;
    const pageWidth = doc.internal.pageSize.getWidth();

    // HEADER - DATOS DE LA EMPRESA
    if (empresaConfig) {
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(empresaConfig.nombre_empresa || "EMPRESA", pageWidth / 2, y, { align: "center" });
      y += 6;

      if (empresaConfig.razon_social) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(empresaConfig.razon_social, pageWidth / 2, y, { align: "center" });
        y += 5;
      }

      if (empresaConfig.ruc) {
        doc.setFontSize(9);
        doc.text(`RUC: ${empresaConfig.ruc}`, pageWidth / 2, y, { align: "center" });
        y += 5;
      }

      if (empresaConfig.direccion) {
        doc.setFontSize(8);
        doc.text(empresaConfig.direccion, pageWidth / 2, y, { align: "center" });
        y += 5;
      }

      const contacto = [];
      if (empresaConfig.telefono) contacto.push(`Tel: ${empresaConfig.telefono}`);
      if (empresaConfig.correo) contacto.push(empresaConfig.correo);
      if (contacto.length > 0) {
        doc.setFontSize(8);
        doc.text(contacto.join(" | "), pageWidth / 2, y, { align: "center" });
        y += 5;
      }

      if (empresaConfig.sucursal) {
        doc.setFontSize(8);
        doc.text(`Sucursal: ${empresaConfig.sucursal}`, pageWidth / 2, y, { align: "center" });
        y += 5;
      }

      y += 3;
    }

    // Línea separadora
    doc.setDrawColor(150);
    doc.line(marginLeft, y, pageWidth - marginLeft, y);
    y += 8;

    // TÍTULO DEL REPORTE
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("REPORTE DE CIERRE DE CAJA", pageWidth / 2, y, { align: "center" });
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Fecha: ${fechaHoy} - Hora: ${horaActual}`, pageWidth / 2, y, { align: "center" });
    y += 6;
    doc.text(`Empleado: ${usuario?.nombre || "N/A"}`, pageWidth / 2, y, { align: "center" });
    y += 10;

    // Línea separadora
    doc.setDrawColor(200);
    doc.line(marginLeft, y, pageWidth - marginLeft, y);
    y += 10;

    // RESUMEN DE CAJA
    const saldoInicial = parseFloat(datosCaja.saldo_inicial || 0);
    const saldoFinalVal = parseFloat(datosCaja.saldo_final || 0);
    const totalVentasCaja = parseFloat(datosCaja.total_ventas || 0);
    const totalReservasCaja = parseFloat(datosCaja.total_reservas || 0);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("RESUMEN DE CAJA", marginLeft, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Saldo Inicial: S/ ${saldoInicial.toFixed(2)}`, marginLeft, y);
    y += 6;
    doc.text(`Saldo Final: S/ ${saldoFinalVal.toFixed(2)}`, marginLeft, y);
    y += 6;
    doc.text(`Total Ventas: S/ ${totalVentasCaja.toFixed(2)}`, marginLeft, y);
    y += 6;
    doc.text(`Total Reservas: S/ ${totalReservasCaja.toFixed(2)}`, marginLeft, y);
    y += 6;

    // Diferencia de arqueo
    if (cajaCerrada && cajaCerrada.diferencia_arqueo !== undefined) {
      const dif = cajaCerrada.diferencia_arqueo;
      doc.text(`Diferencia Arqueo: S/ ${Math.abs(dif).toFixed(2)} ${dif === 0 ? "(Cuadre perfecto)" : dif > 0 ? "(Sobrante)" : "(Faltante)"}`, marginLeft, y);
      y += 6;
    }
    y += 4;

    // RESUMEN POR MÉTODO DE PAGO
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("RESUMEN POR METODO DE PAGO", marginLeft, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    if (Object.keys(resumenMetodosPago).length > 0) {
      Object.entries(resumenMetodosPago).forEach(([metodo, data]) => {
        doc.text(`${metodo}: S/ ${data.total.toFixed(2)} (${data.cantidad} transacciones)`, marginLeft + 5, y);
        y += 6;
      });
      const totalRecaudado = Object.values(resumenMetodosPago).reduce((acc, data) => acc + data.total, 0);
      doc.setFont("helvetica", "bold");
      doc.text(`TOTAL RECAUDADO: S/ ${totalRecaudado.toFixed(2)}`, marginLeft + 5, y);
      y += 10;
    } else {
      doc.text("Sin pagos registrados", marginLeft + 5, y);
      y += 10;
    }

    // VENTAS DEL DÍA
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`VENTAS DEL DIA (${ventasDelDia.length})`, marginLeft, y);
    y += 8;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    if (ventasDelDia.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.text("ID", marginLeft + 5, y);
      doc.text("Cliente", marginLeft + 25, y);
      doc.text("Hora", marginLeft + 90, y);
      doc.text("Total", marginLeft + 120, y);
      y += 6;

      doc.setFont("helvetica", "normal");
      ventasDelDia.forEach((venta) => {
        if (y > 270) { doc.addPage(); y = 20; }
        const cliente = venta.cliente || venta.Cliente || {};
        const fecha = new Date(venta.CreatedAt || venta.created_at);
        const hora = fecha.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });

        doc.text(`#${venta.ID || venta.id}`, marginLeft + 5, y);
        doc.text((cliente.nombre || cliente.Nombre || "Cliente").substring(0, 25), marginLeft + 25, y);
        doc.text(hora, marginLeft + 90, y);
        doc.text(`S/ ${parseFloat(venta.total || venta.Total || 0).toFixed(2)}`, marginLeft + 120, y);
        y += 5;
      });

      const totalVentas = ventasDelDia.reduce((acc, v) => acc + parseFloat(v.total || v.Total || 0), 0);
      y += 3;
      doc.setFont("helvetica", "bold");
      doc.text(`TOTAL VENTAS: S/ ${totalVentas.toFixed(2)}`, marginLeft + 90, y);
      y += 10;
    } else {
      doc.text("Sin ventas registradas hoy", marginLeft + 5, y);
      y += 10;
    }

    // RESERVAS DEL DÍA
    if (y > 240) { doc.addPage(); y = 20; }

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`RESERVAS DEL DIA (${reservasDelDia.length})`, marginLeft, y);
    y += 8;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    if (reservasDelDia.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.text("ID", marginLeft + 5, y);
      doc.text("Cliente", marginLeft + 25, y);
      doc.text("Estado", marginLeft + 90, y);
      doc.text("Adelanto", marginLeft + 120, y);
      y += 6;

      doc.setFont("helvetica", "normal");
      reservasDelDia.forEach((reserva) => {
        if (y > 270) { doc.addPage(); y = 20; }
        const cliente = reserva.cliente || reserva.Cliente || {};
        const estado = reserva.estado || reserva.Estado || "pendiente";

        doc.text(`#${reserva.ID || reserva.id}`, marginLeft + 5, y);
        doc.text((cliente.nombre || cliente.Nombre || "Cliente").substring(0, 25), marginLeft + 25, y);
        doc.text(estado, marginLeft + 90, y);
        doc.text(`S/ ${parseFloat(reserva.adelanto || reserva.Adelanto || 0).toFixed(2)}`, marginLeft + 120, y);
        y += 5;
      });

      const totalReservas = reservasDelDia.reduce((acc, r) => acc + parseFloat(r.adelanto || r.Adelanto || 0), 0);
      y += 3;
      doc.setFont("helvetica", "bold");
      doc.text(`TOTAL ADELANTOS: S/ ${totalReservas.toFixed(2)}`, marginLeft + 90, y);
      y += 15;
    } else {
      doc.text("Sin reservas registradas hoy", marginLeft + 5, y);
      y += 15;
    }

    // TOTALES FINALES
    if (y > 250) { doc.addPage(); y = 20; }

    doc.setDrawColor(100);
    doc.line(marginLeft, y, pageWidth - marginLeft, y);
    y += 10;

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`Total Ventas: S/ ${totalVentasCaja.toFixed(2)}`, marginLeft, y);
    y += 7;
    doc.text(`Total Reservas: S/ ${totalReservasCaja.toFixed(2)}`, marginLeft, y);
    y += 7;
    doc.text(`Total Operaciones: ${ventasDelDia.length + reservasDelDia.length}`, marginLeft, y);
    y += 15;

    // Footer
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    const footerText = empresaConfig?.nombre_empresa
      ? `Documento generado automáticamente - ${empresaConfig.nombre_empresa}`
      : "Documento generado automáticamente - Sistema de Gestión";
    doc.text(footerText, pageWidth / 2, 285, { align: "center" });

    if (empresaConfig?.lema) {
      doc.setFontSize(7);
      doc.text(`"${empresaConfig.lema}"`, pageWidth / 2, 290, { align: "center" });
    }

    const nombreArchivo = `reporte_caja_${fechaLocalStr()}.pdf`;
    doc.save(nombreArchivo);
    toast.success("PDF descargado exitosamente");
  };

  // Función para generar PDF de una caja del historial
  const generarPDFHistorial = async (caja) => {
    const cajaId = caja.ID || caja.id;
    try {
      // Obtener reporte de esa caja específica
      let reporteCaja = null;
      try {
        reporteCaja = await obtenerReporte(cajaId);
      } catch {
        // Si no se puede obtener el reporte, continuar con datos básicos
      }

      const doc = new jsPDF();
      const fechaApertura = caja.fecha_apertura || caja.CreatedAt;
      const fechaCierre = caja.fecha_cierre;
      const fechaFormateada = fechaApertura
        ? new Date(fechaApertura).toLocaleDateString("es-PE", { year: "numeric", month: "long", day: "numeric" })
        : "N/A";

      let y = 15;
      const marginLeft = 20;
      const pageWidth = doc.internal.pageSize.getWidth();

      // HEADER - EMPRESA
      if (empresaConfig) {
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text(empresaConfig.nombre_empresa || "EMPRESA", pageWidth / 2, y, { align: "center" });
        y += 6;
        if (empresaConfig.razon_social) {
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          doc.text(empresaConfig.razon_social, pageWidth / 2, y, { align: "center" });
          y += 5;
        }
        if (empresaConfig.ruc) {
          doc.setFontSize(9);
          doc.text(`RUC: ${empresaConfig.ruc}`, pageWidth / 2, y, { align: "center" });
          y += 5;
        }
        if (empresaConfig.direccion) {
          doc.setFontSize(8);
          doc.text(empresaConfig.direccion, pageWidth / 2, y, { align: "center" });
          y += 5;
        }
        const contacto = [];
        if (empresaConfig.telefono) contacto.push(`Tel: ${empresaConfig.telefono}`);
        if (empresaConfig.correo) contacto.push(empresaConfig.correo);
        if (contacto.length > 0) {
          doc.setFontSize(8);
          doc.text(contacto.join(" | "), pageWidth / 2, y, { align: "center" });
          y += 5;
        }
        if (empresaConfig.sucursal) {
          doc.setFontSize(8);
          doc.text(`Sucursal: ${empresaConfig.sucursal}`, pageWidth / 2, y, { align: "center" });
          y += 5;
        }
        y += 3;
      }

      doc.setDrawColor(150);
      doc.line(marginLeft, y, pageWidth - marginLeft, y);
      y += 8;

      // TITULO
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("REPORTE DE CIERRE DE CAJA", pageWidth / 2, y, { align: "center" });
      y += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Fecha: ${fechaFormateada}`, pageWidth / 2, y, { align: "center" });
      y += 6;

      // Horarios de apertura y cierre
      if (fechaApertura) {
        const horaAp = new Date(fechaApertura).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
        const horaCi = fechaCierre && fechaCierre !== "0001-01-01T00:00:00Z"
          ? new Date(fechaCierre).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })
          : "N/A";
        doc.text(`Apertura: ${horaAp} - Cierre: ${horaCi}`, pageWidth / 2, y, { align: "center" });
        y += 10;
      }

      doc.setDrawColor(200);
      doc.line(marginLeft, y, pageWidth - marginLeft, y);
      y += 10;

      // RESUMEN DE CAJA
      const saldoInicial = parseFloat(caja.saldo_inicial || 0);
      const saldoFinalVal = parseFloat(caja.saldo_final || 0);
      const totalVentas = parseFloat(caja.total_ventas || 0);
      const totalReservas = parseFloat(caja.total_reservas || 0);

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("RESUMEN DE CAJA", marginLeft, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Saldo Inicial: S/ ${saldoInicial.toFixed(2)}`, marginLeft, y);
      y += 6;
      doc.text(`Saldo Final: S/ ${saldoFinalVal.toFixed(2)}`, marginLeft, y);
      y += 6;
      doc.text(`Total Ventas: S/ ${totalVentas.toFixed(2)}`, marginLeft, y);
      y += 6;
      doc.text(`Total Reservas: S/ ${totalReservas.toFixed(2)}`, marginLeft, y);
      y += 6;

      // Diferencia de arqueo
      const diferencia = parseFloat(caja.diferencia_arqueo || 0);
      if (diferencia !== 0 || saldoFinalVal > 0) {
        doc.text(`Diferencia Arqueo: S/ ${Math.abs(diferencia).toFixed(2)} ${diferencia === 0 ? "(Cuadre perfecto)" : diferencia > 0 ? "(Sobrante)" : "(Faltante)"}`, marginLeft, y);
        y += 6;
      }
      y += 4;

      // Observaciones
      if (caja.observaciones) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("OBSERVACIONES", marginLeft, y);
        y += 6;
        doc.setFont("helvetica", "normal");
        doc.text(caja.observaciones.substring(0, 100), marginLeft + 5, y);
        y += 10;
      }

      // RESUMEN POR MÉTODO DE PAGO (del reporte si existe)
      if (reporteCaja?.resumen_por_medio) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("RESUMEN POR METODO DE PAGO", marginLeft, y);
        y += 8;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        Object.entries(reporteCaja.resumen_por_medio).forEach(([metodo, monto]) => {
          if (parseFloat(monto) > 0) {
            doc.text(`${metodo}: S/ ${parseFloat(monto).toFixed(2)}`, marginLeft + 5, y);
            y += 6;
          }
        });
        y += 4;
      }

      // TOTALES
      doc.setDrawColor(100);
      doc.line(marginLeft, y, pageWidth - marginLeft, y);
      y += 10;

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`Total Ventas: S/ ${totalVentas.toFixed(2)}`, marginLeft, y);
      y += 7;
      doc.text(`Total Reservas: S/ ${totalReservas.toFixed(2)}`, marginLeft, y);
      y += 7;
      doc.text(`Total General: S/ ${(totalVentas + totalReservas).toFixed(2)}`, marginLeft, y);
      y += 15;

      // Footer
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      const footerText = empresaConfig?.nombre_empresa
        ? `Documento generado automáticamente - ${empresaConfig.nombre_empresa}`
        : "Documento generado automáticamente - Sistema de Gestión";
      doc.text(footerText, pageWidth / 2, 285, { align: "center" });

      if (empresaConfig?.lema) {
        doc.setFontSize(7);
        doc.text(`"${empresaConfig.lema}"`, pageWidth / 2, 290, { align: "center" });
      }

      const fechaArchivo = fechaApertura ? fechaLocalStr(new Date(fechaApertura)) : "historico";
      doc.save(`reporte_caja_${fechaArchivo}.pdf`);
      toast.success("PDF descargado exitosamente");
    } catch (error) {
      toast.error("Error al generar el PDF");
    }
  };

  // Cargar historial de cajas
  const cargarHistorial = async () => {
    setCargandoHistorial(true);
    try {
      const res = await fetchAuth(`${API_BASE}/cajas`);
      if (res.ok) {
        let cajas = await res.json();
        if (Array.isArray(cajas)) {
          cajas = cajas.filter((c) => {
            const fecha = (c.fecha_apertura || c.CreatedAt || "").substring(0, 10);
            const fechaCierre = c.fecha_cierre;
            const estaCerrada = !!fechaCierre && fechaCierre !== "0001-01-01T00:00:00Z";
            return estaCerrada && fecha >= fechaDesde && fecha <= fechaHasta;
          });
          cajas.sort((a, b) => new Date(b.fecha_apertura || b.CreatedAt) - new Date(a.fecha_apertura || a.CreatedAt));
          setHistorialCajas(cajas);
        }
      }
    } catch (error) {
    } finally {
      setCargandoHistorial(false);
    }
  };

  // Seccion de historial reutilizable
  const renderHistorial = () => (
    <div className="mt-3">
      <button
        onClick={() => {
          const nuevoEstado = !showHistorial;
          setShowHistorial(nuevoEstado);
          if (nuevoEstado && historialCajas.length === 0) {
            cargarHistorial();
          }
        }}
        className="w-full flex items-center justify-between p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-blue-600" />
          <span className="font-bold text-gray-800 text-xs">HISTORIAL DE CAJAS</span>
        </div>
        {showHistorial ? (
          <ChevronUp className="w-4 h-4 text-gray-600" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-600" />
        )}
      </button>

      {showHistorial && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden mt-1.5">
          {/* Filtros compactos */}
          <div className="bg-sky-50 p-2">
            <div className="flex flex-col sm:flex-row items-end gap-2">
              <div className="flex-1 w-full">
                <label className="block text-[10px] font-semibold mb-0.5 text-gray-600">Desde</label>
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs"
                />
              </div>
              <div className="flex-1 w-full">
                <label className="block text-[10px] font-semibold mb-0.5 text-gray-600">Hasta</label>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs"
                />
              </div>
              <button
                onClick={cargarHistorial}
                disabled={cargandoHistorial}
                className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 w-full sm:w-auto justify-center"
              >
                {cargandoHistorial ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Search className="w-3 h-3" />
                )}
                Buscar
              </button>
            </div>
          </div>

          {/* Tabla compacta */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-blue-600 text-white">
                <tr>
                  <th className="px-1.5 py-1 text-left text-[10px]">#</th>
                  <th className="px-1.5 py-1 text-left text-[10px]">Apertura</th>
                  <th className="px-1.5 py-1 text-left text-[10px]">Cierre</th>
                  <th className="px-1.5 py-1 text-right text-[10px]">S. Inicial</th>
                  <th className="px-1.5 py-1 text-right text-[10px]">S. Final</th>
                  <th className="px-1.5 py-1 text-center text-[10px]">Estado</th>
                  <th className="px-1.5 py-1 text-center text-[10px]">PDF</th>
                </tr>
              </thead>
              <tbody>
                {cargandoHistorial ? (
                  <tr>
                    <td colSpan={7} className="p-3 text-center">
                      <Loader2 className="w-4 h-4 animate-spin mx-auto text-blue-600" />
                    </td>
                  </tr>
                ) : historialCajas.length > 0 ? (
                  historialCajas.map((caja, idx) => {
                    const fechaAp = caja.fecha_apertura || caja.CreatedAt;
                    const fechaCi = caja.fecha_cierre;
                    const estaCerrada = !!fechaCi && fechaCi !== "0001-01-01T00:00:00Z";
                    return (
                      <tr key={caja.ID || caja.id || idx} className="border-b hover:bg-blue-50 text-xs">
                        <td className="px-1.5 py-1 text-gray-500">{idx + 1}</td>
                        <td className="px-1.5 py-1">
                          {fechaAp ? new Date(fechaAp).toLocaleString("es-PE", {
                            day: "2-digit", month: "2-digit", year: "2-digit",
                            hour: "2-digit", minute: "2-digit",
                          }) : "-"}
                        </td>
                        <td className="px-1.5 py-1">
                          {estaCerrada ? new Date(fechaCi).toLocaleString("es-PE", {
                            day: "2-digit", month: "2-digit", year: "2-digit",
                            hour: "2-digit", minute: "2-digit",
                          }) : "-"}
                        </td>
                        <td className="px-1.5 py-1 text-right font-medium">
                          S/ {parseFloat(caja.saldo_inicial || 0).toFixed(2)}
                        </td>
                        <td className="px-1.5 py-1 text-right font-medium">
                          {estaCerrada ? `S/ ${parseFloat(caja.saldo_final || 0).toFixed(2)}` : "-"}
                        </td>
                        <td className="px-1.5 py-1 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            estaCerrada
                              ? "bg-green-200 text-green-800"
                              : "bg-yellow-200 text-yellow-800"
                          }`}>
                            {estaCerrada ? "Cerrada" : "Abierta"}
                          </span>
                        </td>
                        <td className="px-1.5 py-1 text-center">
                          {estaCerrada && (
                            <button
                              onClick={() => generarPDFHistorial(caja)}
                              className="p-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                              title="Descargar PDF"
                            >
                              <Download className="w-3 h-3" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="p-3 text-center text-gray-500 text-xs">
                      No se encontraron cajas en el rango seleccionado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  if (verificando || cargandoReporte) {
    return (
      <div className="flex items-center justify-center h-full min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="text-gray-600">Cargando información de caja...</span>
        </div>
      </div>
    );
  }

  // Contenido principal segun estado
  const renderContenido = () => {
    // Si ya se cerró la caja, mostrar resumen final
    if (cajaCerrada) {
      return (
        <>
          {/* Banner de éxito compacto */}
          <div className="bg-green-100 border border-green-300 rounded-lg p-2.5 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div>
              <h2 className="font-bold text-green-800 text-xs">Caja cerrada exitosamente</h2>
              <p className="text-green-700 text-[11px]">El cierre se realizó correctamente</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-blue-200 p-2">
              <h2 className="text-xs font-bold text-center text-gray-800">RESUMEN DE CIERRE</h2>
            </div>

            <div className="p-3 space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-gray-100 rounded-lg p-2">
                  <p className="text-[10px] text-gray-500">Saldo Inicial</p>
                  <p className="text-sm font-bold text-gray-800">
                    S/ {cajaCerrada.saldo_inicial?.toFixed(2)}
                  </p>
                </div>
                <div className="bg-gray-100 rounded-lg p-2">
                  <p className="text-[10px] text-gray-500">Saldo Final</p>
                  <p className="text-sm font-bold text-gray-800">
                    S/ {cajaCerrada.saldo_final?.toFixed(2)}
                  </p>
                </div>
                <div className="bg-blue-100 rounded-lg p-2">
                  <p className="text-[10px] text-blue-600">Total Ventas</p>
                  <p className="text-sm font-bold text-blue-800">
                    S/ {cajaCerrada.total_ventas?.toFixed(2)}
                  </p>
                </div>
                <div className="bg-blue-100 rounded-lg p-2">
                  <p className="text-[10px] text-blue-600">Total Reservas</p>
                  <p className="text-sm font-bold text-blue-800">
                    S/ {cajaCerrada.total_reservas?.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Diferencia - compacta */}
              <div className={`rounded-lg p-2 flex items-center justify-between ${
                cajaCerrada.diferencia_arqueo === 0
                  ? "bg-green-100 border border-green-300"
                  : cajaCerrada.diferencia_arqueo > 0
                  ? "bg-blue-100 border border-blue-300"
                  : "bg-red-100 border border-red-300"
              }`}>
                <p className="text-xs font-medium">
                  {cajaCerrada.diferencia_arqueo === 0
                    ? "Cuadre perfecto"
                    : cajaCerrada.diferencia_arqueo > 0
                    ? "Sobrante"
                    : "Faltante"}
                </p>
                <p className={`text-sm font-bold ${
                  cajaCerrada.diferencia_arqueo === 0
                    ? "text-green-700"
                    : cajaCerrada.diferencia_arqueo > 0
                    ? "text-blue-700"
                    : "text-red-700"
                }`}>
                  S/ {Math.abs(cajaCerrada.diferencia_arqueo || 0).toFixed(2)}
                </p>
              </div>

              {/* Botones compactos */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleImprimir}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Imprimir
                </button>
                <button
                  onClick={generarPDF}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  PDF
                </button>
                <button
                  onClick={() => navigate("/reservas")}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs"
                >
                  Continuar
                </button>
              </div>
            </div>
          </div>
        </>
      );
    }

    // Si no hay caja abierta
    if (!cajaAbierta || !cajaActual) {
      return (
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <Wallet className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-700">No hay caja abierta</h2>
            <p className="text-sm text-gray-500">Debe abrir una caja antes de poder cerrarla.</p>
            <button
              onClick={() => navigate("/caja/abrir")}
              className="mt-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
            >
              Ir a Abrir Caja
            </button>
          </div>
        </div>
      );
    }

    // Formulario de cierre (caja abierta)
    return (
      <>
        {/* Banner de alerta si la caja es de un dia anterior */}
        {cajaDiaAnterior && cajaActual && (
          <div className="bg-red-100 border border-red-400 rounded-lg p-4 mb-4 flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-red-800 text-sm">Caja pendiente de cierre</h3>
              <p className="text-red-700 text-sm mt-1">
                Esta caja fue abierta el{" "}
                <span className="font-semibold">
                  {new Date(cajaActual.fecha_apertura).toLocaleDateString("es-PE", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>.
                Debe cerrarla antes de poder abrir una nueva caja para hoy.
              </p>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-4">
          {/* Panel izquierdo - Formulario de cierre */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-blue-200 p-3">
                <h2 className="text-sm font-bold text-center text-gray-800">
                  CERRAR CAJA
                </h2>
              </div>

              <div className="p-4 space-y-4">
                {/* Info de caja actual */}
                <div className="bg-gray-100 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2 text-gray-600 text-xs">
                    <Clock className="w-4 h-4" />
                    <span>Abierta: {new Date(cajaActual?.fecha_apertura).toLocaleString("es-PE")}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Saldo Inicial:</span>
                    <span className="text-lg font-bold text-blue-600">
                      S/ {cajaActual?.saldo_inicial?.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Efectivo esperado */}
                <div className="bg-blue-100 rounded-lg p-3">
                  <p className="text-xs text-gray-600 mb-1">Efectivo Esperado</p>
                  <p className="text-lg sm:text-xl font-bold text-blue-700">
                    S/ {((cajaActual?.saldo_inicial || 0) + (reporte?.resumen_por_medio?.efectivo || 0)).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Saldo inicial + Efectivo recibido
                  </p>
                </div>

                {/* Formulario */}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {/* Saldo final */}
                  <div className="relative pt-2">
                    <label className="absolute -top-1 left-3 bg-white px-2 text-xs font-medium text-gray-600 z-10 flex items-center gap-1">
                      Efectivo Contado
                      <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <DollarSign className="w-5 h-5 text-gray-400" />
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        className={`w-full pl-10 pr-4 py-3 border-2 rounded-lg text-lg font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                          errors.saldo_final ? "border-red-300 bg-red-50" : "border-gray-300"
                        }`}
                        {...register("saldo_final", {
                          required: "El saldo final es requerido",
                          min: { value: 0, message: "El saldo no puede ser negativo" },
                        })}
                      />
                    </div>
                    {errors.saldo_final && (
                      <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.saldo_final.message}
                      </p>
                    )}
                  </div>

                  {/* Diferencia (arqueo) */}
                  {arqueo && (
                    <div className={`rounded-lg p-3 ${
                      arqueo.diferencia === 0
                        ? "bg-green-100 border border-green-300"
                        : arqueo.diferencia > 0
                        ? "bg-blue-100 border border-blue-300"
                        : "bg-red-100 border border-red-300"
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        {arqueo.diferencia === 0 ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : arqueo.diferencia > 0 ? (
                          <TrendingUp className="w-5 h-5 text-blue-600" />
                        ) : (
                          <TrendingDown className="w-5 h-5 text-red-600" />
                        )}
                        <span className="font-medium text-sm">
                          {arqueo.diferencia === 0
                            ? "Cuadre perfecto"
                            : arqueo.diferencia > 0
                            ? "Sobrante"
                            : "Faltante"}
                        </span>
                      </div>
                      <p className={`text-xl font-bold ${
                        arqueo.diferencia === 0
                          ? "text-green-700"
                          : arqueo.diferencia > 0
                          ? "text-blue-700"
                          : "text-red-700"
                      }`}>
                        S/ {Math.abs(arqueo.diferencia).toFixed(2)}
                      </p>
                    </div>
                  )}

                  {/* Observaciones */}
                  <div className="relative pt-2">
                    <label className="absolute -top-1 left-3 bg-white px-2 text-xs font-medium text-gray-600 z-10">
                      Observaciones
                    </label>
                    <textarea
                      rows="2"
                      placeholder="Notas adicionales..."
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none text-sm"
                      {...register("observaciones")}
                    />
                  </div>

                  {/* Botones */}
                  <div className="flex gap-2 pt-2">
                    {!cajaDiaAnterior && (
                      <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="flex items-center justify-center gap-1 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Volver
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={cargando}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {cargando ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Cerrando...
                        </>
                      ) : (
                        <>
                          <X className="w-4 h-4" />
                          Cerrar Caja
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Panel derecho - Resumen del día */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-blue-200 p-3">
                <h2 className="text-sm font-bold text-center text-gray-800">
                  RESUMEN DEL DÍA
                </h2>
              </div>

              <div className="p-4 space-y-4">
                {/* Resumen por Método de Pago */}
                <div>
                  <h3 className="font-medium text-gray-700 mb-2 flex items-center gap-2 text-sm">
                    <CreditCard className="w-4 h-4" />
                    Resumen por Método de Pago
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Object.keys(resumenMetodosPago).length > 0 ? (
                      Object.entries(resumenMetodosPago).map(([metodo, data]) => (
                        <div key={metodo} className="flex items-center justify-between bg-gray-100 rounded-lg p-2 sm:p-3">
                          <div className="flex items-center gap-2">
                            {metodo.toLowerCase().includes("efectivo") ? (
                              <Banknote className="w-4 h-4 text-green-600" />
                            ) : metodo.toLowerCase().includes("yape") || metodo.toLowerCase().includes("plin") ? (
                              <CreditCard className="w-4 h-4 text-purple-600" />
                            ) : metodo.toLowerCase().includes("transferencia") ? (
                              <CreditCard className="w-4 h-4 text-blue-600" />
                            ) : (
                              <CreditCard className="w-4 h-4 text-gray-600" />
                            )}
                            <div>
                              <span className="font-medium text-xs">{metodo}</span>
                              <span className="text-xs text-gray-500 ml-1">({data.cantidad})</span>
                            </div>
                          </div>
                          <span className="font-bold text-sm text-green-600">S/ {data.total.toFixed(2)}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm text-center py-4 sm:col-span-2">
                        Sin pagos registrados
                      </p>
                    )}
                  </div>

                  {/* Total general */}
                  {Object.keys(resumenMetodosPago).length > 0 && (
                    <div className="flex items-center justify-between bg-blue-100 rounded-lg p-3 mt-2">
                      <span className="font-bold text-blue-800 text-sm">TOTAL RECAUDADO</span>
                      <span className="font-bold text-lg text-blue-800">
                        S/ {Object.values(resumenMetodosPago).reduce((acc, data) => acc + data.total, 0).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Ventas y Reservas en dos columnas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Ventas del día */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setShowVentas(!showVentas)}
                      className="w-full flex items-center justify-between p-3 bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4 text-blue-600" />
                        <span className="font-medium text-gray-800 text-sm">Ventas</span>
                        <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
                          {ventasDelDia.length}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-blue-600 text-sm">
                          S/ {ventasDelDia.reduce((acc, v) => acc + parseFloat(v.total || v.Total || 0), 0).toFixed(2)}
                        </span>
                        {showVentas ? (
                          <ChevronUp className="w-4 h-4 text-gray-600" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-600" />
                        )}
                      </div>
                    </button>

                    {showVentas && (
                      <div className="max-h-48 overflow-y-auto border-t">
                        {ventasDelDia.length > 0 ? (
                          ventasDelDia.map((venta) => {
                            const cliente = venta.cliente || venta.Cliente || {};
                            const fechaV = new Date(venta.CreatedAt || venta.created_at);
                            return (
                              <div key={venta.ID || venta.id} className="flex items-center justify-between p-2 border-b last:border-b-0 hover:bg-gray-50 text-xs">
                                <div>
                                  <div className="font-medium">Venta #{venta.ID || venta.id}</div>
                                  <div className="text-gray-500">
                                    {cliente.nombre || cliente.Nombre || "Cliente"} · {fechaV.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
                                  </div>
                                </div>
                                <span className="font-bold text-blue-600">
                                  S/ {parseFloat(venta.total || venta.Total || 0).toFixed(2)}
                                </span>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-gray-500 text-xs text-center py-4">Sin ventas hoy</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Reservas del día */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setShowReservas(!showReservas)}
                      className="w-full flex items-center justify-between p-3 bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        <span className="font-medium text-gray-800 text-sm">Reservas</span>
                        <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
                          {reservasDelDia.length}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-blue-600 text-sm">
                          S/ {reservasDelDia.reduce((acc, r) => acc + parseFloat(r.adelanto || r.Adelanto || 0), 0).toFixed(2)}
                        </span>
                        {showReservas ? (
                          <ChevronUp className="w-4 h-4 text-gray-600" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-600" />
                        )}
                      </div>
                    </button>

                    {showReservas && (
                      <div className="max-h-48 overflow-y-auto border-t">
                        {reservasDelDia.length > 0 ? (
                          reservasDelDia.map((reserva) => {
                            const cliente = reserva.cliente || reserva.Cliente || {};
                            const estado = reserva.estado || reserva.Estado || "pendiente";
                            return (
                              <div key={reserva.ID || reserva.id} className="flex items-center justify-between p-2 border-b last:border-b-0 hover:bg-gray-50 text-xs">
                                <div>
                                  <div className="font-medium flex items-center gap-1">
                                    #{reserva.ID || reserva.id}
                                    <span className={`text-xs px-1 py-0.5 rounded ${
                                      estado === "confirmado" ? "bg-green-100 text-green-700" :
                                      estado === "pendiente" ? "bg-yellow-100 text-yellow-700" :
                                      estado === "cancelado" ? "bg-red-100 text-red-700" :
                                      "bg-gray-100 text-gray-700"
                                    }`}>
                                      {estado}
                                    </span>
                                  </div>
                                  <div className="text-gray-500">
                                    {cliente.nombre || cliente.Nombre || "Cliente"}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-bold text-blue-600">
                                    S/ {parseFloat(reserva.adelanto || reserva.Adelanto || 0).toFixed(2)}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-gray-500 text-xs text-center py-4">Sin reservas hoy</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Total movimientos */}
                <div className="bg-gray-100 rounded-lg p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-600">Total de operaciones del día</p>
                    <p className="text-xs text-gray-500">
                      {ventasDelDia.length} ventas · {reservasDelDia.length} reservas
                    </p>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-gray-800 flex-shrink-0">
                    {ventasDelDia.length + reservasDelDia.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-blue-50 p-2 sm:p-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-3 mb-4">
          <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2 text-gray-800">
            <Wallet className="w-5 h-5 sm:w-6 sm:h-6" />
            CIERRE DE CAJA
          </h1>
        </div>

        {/* Contenido condicional */}
        {renderContenido()}

        {/* Historial de cajas - siempre visible */}
        {renderHistorial()}
      </div>
    </div>
  );
}
