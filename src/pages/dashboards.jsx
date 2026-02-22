import { useState, useEffect, useMemo } from "react";
import { fetchAuth } from "../funciones/auth";
import { API_BASE_URL } from "../config";
import {
  DollarSign,
  ShoppingCart,
  Calendar,
  ClipboardList,
  UserPlus,
  PackageCheck,
  RotateCcw,
  PackageX,
  AlertTriangle,
  Clock,
  Truck,
  RefreshCw,
  TrendingUp,
  Bell,
  CreditCard,
  BarChart3,
  Users,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

// ─── Helpers de fecha ───
function hoyStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function inicioSemana() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const lunes = new Date(d);
  lunes.setDate(diff);
  return `${lunes.getFullYear()}-${String(lunes.getMonth() + 1).padStart(2, "0")}-${String(lunes.getDate()).padStart(2, "0")}`;
}

function inicioMes() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function inicioAnio() {
  return `${new Date().getFullYear()}-01-01`;
}

function fechaLocal(isoStr) {
  if (!isoStr) return "";
  return String(isoStr).split("T")[0];
}

function enRango(fechaISO, desde, hasta) {
  const f = fechaLocal(fechaISO);
  if (!f) return false;
  return f >= desde && f <= hasta;
}

function formatMoney(n) {
  return `S/ ${Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const DIAS_SEMANA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DIAS_CORTO = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function fechaCompletaHoy() {
  const d = new Date();
  return `${DIAS_SEMANA[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

function nombreDia(fechaStr) {
  const [y, m, d] = fechaStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return DIAS_CORTO[dt.getDay()];
}

function formatFechaCorta(fechaStr) {
  if (!fechaStr) return "";
  const [, m, d] = fechaStr.split("-");
  return `${d}/${m}`;
}

// ─── Colores ───
const DONUT_COLORS = {
  reservado: "#3B82F6",
  listo: "#F59E0B",
  entregado: "#10B981",
  devuelto: "#8B5CF6",
  anulado: "#EF4444",
};

const CHART_VENTAS = "#6366F1";
const CHART_ADELANTOS = "#EC4899";

const PERIODO_LABELS = {
  hoy: "Hoy",
  semana: "Última semana",
  mes: "Este mes",
  anio: "Este año",
};

// ─── Componente Dashboard ───
export default function Dashboards() {
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState("semana");
  const [top5Modo, setTop5Modo] = useState("ventas"); // "ventas" | "reservas"

  // Data cruda
  const [ventas, setVentas] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [modosPago, setModosPago] = useState([]);
  const [metodosPago, setMetodosPago] = useState([]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [rVentas, rReservas, rProductos, rClientes, rEmpleados, rModosPago, rMetodos] =
        await Promise.all([
          fetchAuth(`${API_BASE_URL}/ventas`).then((r) => (r.ok ? r.json() : [])),
          fetchAuth(`${API_BASE_URL}/reservas?incluir_grupales=true`).then((r) => (r.ok ? r.json() : [])),
          fetchAuth(`${API_BASE_URL}/productos`).then((r) => (r.ok ? r.json() : [])),
          fetchAuth(`${API_BASE_URL}/clientes`).then((r) => (r.ok ? r.json() : [])),
          fetchAuth(`${API_BASE_URL}/empleados`).then((r) => (r.ok ? r.json() : [])),
          fetchAuth(`${API_BASE_URL}/modos-pago`).then((r) => (r.ok ? r.json() : [])),
          fetchAuth(`${API_BASE_URL}/pagos`).then((r) => (r.ok ? r.json() : [])),
        ]);
      setVentas(rVentas || []);
      setReservas(rReservas || []);
      setProductos(rProductos || []);
      setClientes(rClientes || []);
      setEmpleados(rEmpleados || []);
      setModosPago(rModosPago || []);
      setMetodosPago(rMetodos || []);
    } catch {
      /* silently fail */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // ─── Rango de fechas según periodo ───
  const { desde, hasta } = useMemo(() => {
    const h = hoyStr();
    switch (periodo) {
      case "hoy":
        return { desde: h, hasta: h };
      case "semana":
        return { desde: inicioSemana(), hasta: h };
      case "mes":
        return { desde: inicioMes(), hasta: h };
      case "anio":
        return { desde: inicioAnio(), hasta: h };
      default:
        return { desde: h, hasta: h };
    }
  }, [periodo]);

  // ─── Datos filtrados por periodo ───
  const ventasFiltradas = useMemo(
    () => ventas.filter((v) => enRango(v.CreatedAt || v.created_at, desde, hasta)),
    [ventas, desde, hasta]
  );
  const reservasFiltradas = useMemo(
    () => reservas.filter((r) => enRango(r.CreatedAt || r.created_at, desde, hasta)),
    [reservas, desde, hasta]
  );
  const clientesFiltrados = useMemo(
    () => clientes.filter((c) => enRango(c.CreatedAt || c.created_at, desde, hasta)),
    [clientes, desde, hasta]
  );

  // ─── MÉTRICAS PRINCIPALES ───
  const totalVentas = useMemo(
    () => ventasFiltradas.reduce((s, v) => s + Number(v.total || v.Total || 0), 0),
    [ventasFiltradas]
  );
  const totalAdelantos = useMemo(
    () => reservasFiltradas.reduce((s, r) => s + Number(r.adelanto || r.Adelanto || 0), 0),
    [reservasFiltradas]
  );
  const ingresosTotales = totalVentas + totalAdelantos;

  const saldosPendientes = useMemo(() => {
    return reservas
      .filter((r) => {
        const est = (r.estado || r.Estado || "").toLowerCase();
        return est === "reservado" || est === "listo";
      })
      .reduce((s, r) => {
        const total = Number(r.total || r.Total || 0);
        const adelanto = Number(r.adelanto || r.Adelanto || 0);
        return s + Math.max(0, total - adelanto);
      }, 0);
  }, [reservas]);

  // ─── STATS ROW ───
  const clientesNuevos = clientesFiltrados.length;
  const entregas = useMemo(
    () => reservasFiltradas.filter((r) => (r.estado || r.Estado || "").toLowerCase() === "entregado").length,
    [reservasFiltradas]
  );
  const devoluciones = useMemo(
    () => reservasFiltradas.filter((r) => (r.estado || r.Estado || "").toLowerCase() === "devuelto").length,
    [reservasFiltradas]
  );
  const stockBajo = useMemo(
    () => productos.filter((p) => Number(p.stock || p.Stock || 0) <= 3 && Number(p.stock || p.Stock || 0) > 0).length,
    [productos]
  );
  const reservasVencidas = useMemo(() => {
    const hoy = hoyStr();
    return reservas.filter((r) => {
      const est = (r.estado || r.Estado || "").toLowerCase();
      const fecha = fechaLocal(r.fecha_evento || r.FechaEvento);
      return fecha < hoy && (est === "reservado" || est === "listo");
    }).length;
  }, [reservas]);

  // ─── ALERTAS ───
  const productosSinStock = useMemo(
    () => productos.filter((p) => Number(p.stock || p.Stock || 0) === 0),
    [productos]
  );
  const entregasPendientesHoy = useMemo(() => {
    const hoy = hoyStr();
    return reservas.filter((r) => {
      const est = (r.estado || r.Estado || "").toLowerCase();
      const fecha = fechaLocal(r.fecha_evento || r.FechaEvento);
      return fecha === hoy && (est === "reservado" || est === "listo");
    });
  }, [reservas]);
  const listaReservasVencidas = useMemo(() => {
    const hoy = hoyStr();
    return reservas.filter((r) => {
      const est = (r.estado || r.Estado || "").toLowerCase();
      const fecha = fechaLocal(r.fecha_evento || r.FechaEvento);
      return fecha < hoy && (est === "reservado" || est === "listo");
    });
  }, [reservas]);

  // ─── CHART: Ingresos agrupados según periodo ───
  const datosGrafico = useMemo(() => {
    if (periodo === "hoy") {
      // Un solo punto
      let venTotal = 0, adTotal = 0;
      ventasFiltradas.forEach((v) => { venTotal += Number(v.total || v.Total || 0); });
      reservasFiltradas.forEach((r) => { adTotal += Number(r.adelanto || r.Adelanto || 0); });
      return [{ label: "Hoy", ventas: venTotal, adelantos: adTotal }];
    }

    if (periodo === "semana") {
      // 7 días individuales
      const map = {};
      const start = new Date(desde + "T00:00:00");
      const end = new Date(hasta + "T00:00:00");
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        map[key] = { fecha: key, ventas: 0, adelantos: 0 };
      }
      ventasFiltradas.forEach((v) => { const f = fechaLocal(v.CreatedAt || v.created_at); if (map[f]) map[f].ventas += Number(v.total || v.Total || 0); });
      reservasFiltradas.forEach((r) => { const f = fechaLocal(r.CreatedAt || r.created_at); if (map[f]) map[f].adelantos += Number(r.adelanto || r.Adelanto || 0); });
      return Object.values(map).sort((a, b) => a.fecha.localeCompare(b.fecha)).map((d) => ({
        ...d,
        label: `${nombreDia(d.fecha)} ${formatFechaCorta(d.fecha)}`,
      }));
    }

    if (periodo === "mes") {
      // Agrupar en 4 semanas completas del mes
      const semanas = [];
      const start = new Date(desde + "T00:00:00");
      const y = start.getFullYear();
      const m = start.getMonth();
      const ultimoDia = new Date(y, m + 1, 0).getDate();
      const finMes = `${y}-${String(m + 1).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;
      let semStart = new Date(start);
      let semIdx = 1;
      while (semStart <= new Date(finMes + "T00:00:00")) {
        const semEnd = new Date(semStart);
        semEnd.setDate(semEnd.getDate() + 6);
        if (semEnd > new Date(finMes + "T00:00:00")) semEnd.setTime(new Date(finMes + "T00:00:00").getTime());
        const sKey = `${semStart.getFullYear()}-${String(semStart.getMonth() + 1).padStart(2, "0")}-${String(semStart.getDate()).padStart(2, "0")}`;
        const eKey = `${semEnd.getFullYear()}-${String(semEnd.getMonth() + 1).padStart(2, "0")}-${String(semEnd.getDate()).padStart(2, "0")}`;
        semanas.push({ label: `Sem ${semIdx}`, desde: sKey, hasta: eKey, ventas: 0, adelantos: 0 });
        semStart.setDate(semStart.getDate() + 7);
        semIdx++;
      }
      ventasFiltradas.forEach((v) => {
        const f = fechaLocal(v.CreatedAt || v.created_at);
        const sem = semanas.find((s) => f >= s.desde && f <= s.hasta);
        if (sem) sem.ventas += Number(v.total || v.Total || 0);
      });
      reservasFiltradas.forEach((r) => {
        const f = fechaLocal(r.CreatedAt || r.created_at);
        const sem = semanas.find((s) => f >= s.desde && f <= s.hasta);
        if (sem) sem.adelantos += Number(r.adelanto || r.Adelanto || 0);
      });
      return semanas;
    }

    // Año → agrupar por meses
    const mesesMap = {};
    for (let m = 0; m < 12; m++) {
      const y = new Date().getFullYear();
      const key = `${y}-${String(m + 1).padStart(2, "0")}`;
      mesesMap[key] = { label: MESES[m].charAt(0).toUpperCase() + MESES[m].slice(1, 3), mes: key, ventas: 0, adelantos: 0 };
    }
    ventasFiltradas.forEach((v) => {
      const f = fechaLocal(v.CreatedAt || v.created_at);
      const mKey = f.substring(0, 7);
      if (mesesMap[mKey]) mesesMap[mKey].ventas += Number(v.total || v.Total || 0);
    });
    reservasFiltradas.forEach((r) => {
      const f = fechaLocal(r.CreatedAt || r.created_at);
      const mKey = f.substring(0, 7);
      if (mesesMap[mKey]) mesesMap[mKey].adelantos += Number(r.adelanto || r.Adelanto || 0);
    });
    return Object.values(mesesMap);
  }, [ventasFiltradas, reservasFiltradas, desde, hasta, periodo]);

  // ─── TOP 5 PRODUCTOS ───
  const top5Productos = useMemo(() => {
    const map = {};
    ventasFiltradas.forEach((v) => {
      const detalles = v.detalles || v.Detalles || [];
      detalles.forEach((d) => {
        const idProd = d.id_producto || d.IdProducto;
        const cant = Number(d.cantidad || d.Cantidad || 0);
        if (!idProd) return;
        if (!map[idProd]) {
          const prod = productos.find((p) => (p.ID || p.id) === idProd);
          map[idProd] = { nombre: prod?.nombre || prod?.Nombre || `Producto ${idProd}`, cantidad: 0 };
        }
        map[idProd].cantidad += cant;
      });
    });
    return Object.values(map)
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);
  }, [ventasFiltradas, productos]);

  const top5ProductosReservas = useMemo(() => {
    const map = {};
    reservasFiltradas.forEach((r) => {
      const detalles = r.detalles || r.Detalles || [];
      detalles.forEach((d) => {
        const idProd = d.id_producto || d.IdProducto;
        const cant = Number(d.cantidad || d.Cantidad || 0);
        if (!idProd) return;
        if (!map[idProd]) {
          const prod = productos.find((p) => (p.ID || p.id) === idProd);
          map[idProd] = { nombre: prod?.nombre || prod?.Nombre || `Producto ${idProd}`, cantidad: 0 };
        }
        map[idProd].cantidad += cant;
      });
    });
    return Object.values(map)
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);
  }, [reservasFiltradas, productos]);

  const top5Data = top5Modo === "ventas" ? top5Productos : top5ProductosReservas;

  // ─── ESTADO DE RESERVAS (donut) ───
  const estadoReservas = useMemo(() => {
    const map = { reservado: 0, listo: 0, entregado: 0, devuelto: 0, anulado: 0 };
    reservasFiltradas.forEach((r) => {
      const est = (r.estado || r.Estado || "").toLowerCase();
      if (map[est] !== undefined) map[est]++;
    });
    return Object.entries(map)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value, color: DONUT_COLORS[name] }));
  }, [reservasFiltradas]);

  // ─── MÉTODOS DE PAGO ───
  const distribucionPagos = useMemo(() => {
    const map = {};
    const ventaIds = new Set(ventasFiltradas.map((v) => v.ID || v.id));
    const reservaIds = new Set(reservasFiltradas.map((r) => r.ID || r.id));

    modosPago.forEach((mp) => {
      const idVenta = mp.id_venta || mp.IdVenta;
      const idReserva = mp.id_reserva || mp.IdReserva;
      if (idVenta && !ventaIds.has(idVenta)) return;
      if (idReserva && !reservaIds.has(idReserva)) return;
      if (!idVenta && !idReserva) return;

      const idPago = mp.id_pago || mp.IdPago;
      const monto = Number(mp.monto || mp.Monto || 0);
      const metodo = metodosPago.find((m) => (m.ID || m.id) === idPago);
      const nombre = metodo?.nombre || metodo?.Nombre || "Otro";

      if (!map[nombre]) map[nombre] = { nombre, total: 0, count: 0 };
      map[nombre].total += monto;
      map[nombre].count++;
    });

    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [modosPago, metodosPago, ventasFiltradas, reservasFiltradas]);

  // ─── TOP 5 EMPLEADOS ───
  const top5Empleados = useMemo(() => {
    const map = {};
    ventasFiltradas.forEach((v) => {
      const idEmp = v.id_empleado || v.IdEmpleado;
      if (!idEmp) return;
      if (!map[idEmp]) {
        const emp = empleados.find((e) => (e.ID || e.id) === idEmp);
        map[idEmp] = {
          nombre: emp ? `${emp.nombre || emp.Nombre} ${emp.apellidos || emp.Apellidos || ""}`.trim() : `Empleado ${idEmp}`,
          ventas: 0,
          total: 0,
        };
      }
      map[idEmp].ventas++;
      map[idEmp].total += Number(v.total || v.Total || 0);
    });
    return Object.values(map)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [ventasFiltradas, empleados]);

  const periodoLabel = PERIODO_LABELS[periodo];

  // ─── RENDER ───
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-5 space-y-5 max-w-[1400px] mx-auto">
      {/* ─── HEADER + FILTROS ─── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800">Dashboard</h1>
            <p className="text-xs text-gray-500">Resumen general del negocio - {fechaCompletaHoy()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="hoy">Hoy</option>
            <option value="semana">Última semana</option>
            <option value="mes">Este mes</option>
            <option value="anio">Este año</option>
          </select>
          <button
            onClick={cargarDatos}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 text-sm font-medium shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>
        </div>
      </div>

      {/* ─── TARJETAS DE INGRESOS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Ingresos Totales - VERDE */}
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-3 right-3 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <p className="text-green-100 text-xs font-medium uppercase tracking-wide">Ingresos Totales</p>
          <p className="text-2xl md:text-3xl font-bold mt-1">{formatMoney(ingresosTotales)}</p>
          <p className="text-green-200 text-xs mt-2 leading-relaxed">
            Ventas: {formatMoney(totalVentas)} + Adelantos reservas: {formatMoney(totalAdelantos)} - {periodoLabel}
          </p>
        </div>

        {/* Ventas - AZUL OSCURO */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-800 text-white rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-3 right-3 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <ShoppingCart className="w-6 h-6 text-white" />
          </div>
          <p className="text-blue-200 text-xs font-medium uppercase tracking-wide">Ventas</p>
          <p className="text-2xl md:text-3xl font-bold mt-1">{formatMoney(totalVentas)}</p>
          <p className="text-blue-200 text-xs mt-2">{ventasFiltradas.length} venta(s) - {periodoLabel}</p>
        </div>

        {/* Reservas (Adelantos) - CELESTE SUAVE */}
        <div className="bg-gradient-to-br from-sky-500 to-blue-600 text-white rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-3 right-3 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <p className="text-sky-100 text-xs font-medium uppercase tracking-wide">Reservas (Adelantos)</p>
          <p className="text-2xl md:text-3xl font-bold mt-1">{formatMoney(totalAdelantos)}</p>
          <p className="text-sky-100 text-xs mt-2">{reservasFiltradas.length} reserva(s) - {periodoLabel}</p>
        </div>

        {/* Saldos Pendientes - NARANJA */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-700 text-white rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-3 right-3 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <ClipboardList className="w-6 h-6 text-white" />
          </div>
          <p className="text-orange-100 text-xs font-medium uppercase tracking-wide">Saldos Pendientes</p>
          <p className="text-2xl md:text-3xl font-bold mt-1">{formatMoney(saldosPendientes)}</p>
          <p className="text-orange-200 text-xs mt-2">Por cobrar de reservas activas</p>
        </div>
      </div>

      {/* ─── STATS ROW ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatMini icon={UserPlus} label="Clientes nuevos" value={clientesNuevos} iconColor="text-blue-600" bg="bg-white" />
        <StatMini icon={PackageCheck} label={`Entregas - ${periodoLabel}`} value={entregas} iconColor="text-sky-600" bg="bg-blue-50" />
        <StatMini icon={RotateCcw} label={`Devoluciones - ${periodoLabel}`} value={devoluciones} iconColor="text-violet-600" bg="bg-violet-50" />
        <StatMini icon={PackageX} label="Stock bajo" value={stockBajo} iconColor="text-amber-600" bg="bg-amber-50" />
        <StatMini icon={AlertTriangle} label="Reservas vencidas" value={reservasVencidas} iconColor="text-red-500" bg="bg-red-50" />
      </div>

      {/* ─── ALERTAS Y NOTIFICACIONES ─── */}
      {(productosSinStock.length > 0 || entregasPendientesHoy.length > 0 || listaReservasVencidas.length > 0) && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-5 h-5 text-gray-600" />
            <h2 className="text-sm font-semibold text-gray-700">Alertas y Notificaciones</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {productosSinStock.length > 0 && (
              <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-red-500 border-y border-r border-y-gray-200 border-r-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <PackageX className="w-5 h-5 text-red-500" />
                  <span className="text-gray-800 font-bold text-sm">Productos sin stock</span>
                </div>
                <p className="text-gray-500 text-xs">{productosSinStock.length} producto(s) agotados</p>
              </div>
            )}
            {entregasPendientesHoy.length > 0 && (
              <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-amber-500 border-y border-r border-y-gray-200 border-r-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <Truck className="w-5 h-5 text-amber-500" />
                  <span className="text-gray-800 font-bold text-sm">Entregas pendientes hoy</span>
                </div>
                <p className="text-gray-500 text-xs">{entregasPendientesHoy.length} reserva(s) por entregar</p>
              </div>
            )}
            {listaReservasVencidas.length > 0 && (
              <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-orange-500 border-y border-r border-y-gray-200 border-r-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-5 h-5 text-orange-500" />
                  <span className="text-gray-800 font-bold text-sm">Reservas vencidas</span>
                </div>
                <p className="text-gray-500 text-xs">{listaReservasVencidas.length} reserva(s) sin devolver</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── GRÁFICO: INGRESOS ─── */}
      <div className="bg-white rounded-xl p-5 shadow-md border border-gray-200">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-indigo-600" />
          {periodo === "hoy" ? "Ingresos de Hoy" : periodo === "semana" ? "Ingresos por Día" : periodo === "mes" ? "Ingresos por Semana" : "Ingresos por Mes"}
        </h2>
        {datosGrafico.length === 0 ? (
          <p className="text-gray-400 text-center py-12">Sin datos para el periodo seleccionado</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={datosGrafico}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `S/${v}`} />
              <Tooltip
                formatter={(value, name) => [formatMoney(value), name]}
                labelStyle={{ fontWeight: "bold" }}
                contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
              />
              <Legend />
              <Line type="monotone" dataKey="ventas" stroke={CHART_VENTAS} strokeWidth={2.5} dot={{ r: 4 }} name="Ventas" />
              <Line type="monotone" dataKey="adelantos" stroke={CHART_ADELANTOS} strokeWidth={2.5} dot={{ r: 4 }} name="Adelantos" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ─── ROW: TOP 5 PRODUCTOS + ESTADO DE RESERVAS ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl p-5 shadow-md border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-indigo-600" />
              Top 5 Productos
            </h2>
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setTop5Modo("ventas")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  top5Modo === "ventas"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Ventas
              </button>
              <button
                onClick={() => setTop5Modo("reservas")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  top5Modo === "reservas"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Reservas
              </button>
            </div>
          </div>
          {top5Data.length === 0 ? (
            <p className="text-gray-400 text-center py-12">
              Sin {top5Modo === "ventas" ? "ventas" : "reservas"} en este periodo
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={top5Data} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="nombre" width={120} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${v} unidades`, "Cantidad"]} />
                <Bar dataKey="cantidad" fill={top5Modo === "ventas" ? "#6366F1" : "#3B82F6"} radius={[0, 6, 6, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl p-5 shadow-md border border-gray-200">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Estado de Reservas
          </h2>
          {estadoReservas.length === 0 ? (
            <p className="text-gray-400 text-center py-12">Sin reservas en este periodo</p>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={estadoReservas}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {estadoReservas.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, name) => [`${v} reservas`, name]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2 min-w-[140px]">
                {estadoReservas.map((e) => (
                  <div key={e.name} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: e.color }} />
                    <span className="text-gray-600">{e.name}</span>
                    <span className="ml-auto font-bold text-gray-800">{e.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── ROW: MÉTODOS DE PAGO + TOP 5 EMPLEADOS ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl p-5 shadow-md border border-gray-200">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-600" />
            Métodos de Pago
          </h2>
          {distribucionPagos.length === 0 ? (
            <p className="text-gray-400 text-center py-12">Sin pagos registrados</p>
          ) : (
            <div className="space-y-3">
              {distribucionPagos.map((mp, i) => {
                const totalPagos = distribucionPagos.reduce((s, x) => s + x.total, 0);
                const pct = totalPagos > 0 ? (mp.total / totalPagos) * 100 : 0;
                const barColors = ["bg-indigo-500", "bg-pink-500", "bg-emerald-500", "bg-amber-500", "bg-blue-500", "bg-cyan-500"];
                const barColor = barColors[i % barColors.length];
                return (
                  <div key={mp.nombre}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-700">{mp.nombre}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500">{mp.count} pagos</span>
                        <span className="text-sm font-bold text-gray-800">{formatMoney(mp.total)}</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div className={`h-2.5 rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl p-5 shadow-md border border-gray-200">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Top 5 Empleados
          </h2>
          {top5Empleados.length === 0 ? (
            <p className="text-gray-400 text-center py-12">Sin ventas registradas</p>
          ) : (
            <div className="space-y-3">
              {top5Empleados.map((emp, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                    i === 0 ? "bg-yellow-500" : i === 1 ? "bg-gray-400" : i === 2 ? "bg-amber-700" : "bg-slate-300"
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{emp.nombre}</p>
                    <p className="text-xs text-gray-500">{emp.ventas} ventas</p>
                  </div>
                  <span className="text-sm font-bold text-indigo-600">{formatMoney(emp.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-Componente: Stat Mini ───
function StatMini({ icon: Icon, label, value, iconColor, bg }) {
  return (
    <div className={`${bg} rounded-xl p-3 flex items-center gap-3 border border-gray-200 shadow-sm`}>
      <Icon className={`w-8 h-8 ${iconColor} flex-shrink-0`} />
      <div className="min-w-0">
        <p className="text-xl font-bold text-gray-800">{value}</p>
        <p className="text-[11px] text-gray-500 leading-tight">{label}</p>
      </div>
    </div>
  );
}
