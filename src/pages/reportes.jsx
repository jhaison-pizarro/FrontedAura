import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { fetchAuth } from "../funciones/auth";
import { API_BASE_URL } from "../config";
import { jsPDF } from "jspdf";
import {
  FileText,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ShoppingCart,
  Calendar,
  Users,
  Package,
  UserCheck,
  Briefcase,
  DollarSign,
  Download,
  X,
  FolderOpen,
  Trash2,
} from "lucide-react";

// ─── Helpers ───
function fechaLocal(iso) {
  if (!iso) return "";
  return String(iso).split("T")[0];
}
function formatFecha(iso) {
  const f = fechaLocal(iso);
  if (!f) return "-";
  const [y, m, d] = f.split("-");
  return `${parseInt(d)}/${parseInt(m)}/${y}`;
}
function formatFechaHora(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yy} ${hh}:${mi}`;
}
function formatMoney(n) {
  return `S/ ${Number(n || 0).toFixed(2)}`;
}
function hoyStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function enRango(iso, desde, hasta) {
  const f = fechaLocal(iso);
  if (!f) return false;
  return f >= desde && f <= hasta;
}
function limpiarMotivo(m) {
  if (!m) return "-";
  return m.replace(/^ELIMINADO:\s*/i, "").trim() || "-";
}
function asArray(data) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    // Some APIs return { data: [...] } or similar
    for (const key of Object.keys(data)) {
      if (Array.isArray(data[key])) return data[key];
    }
  }
  return [];
}

// safeFetch at module level so it doesn't depend on component state
async function safeFetch(url) {
  try {
    const r = await fetchAuth(url);
    if (!r.ok) return [];
    const data = await r.json();
    return asArray(data);
  } catch {
    return [];
  }
}

const TABS = [
  { id: "ventas", label: "Ventas", icon: ShoppingCart, iconColor: "text-amber-600" },
  { id: "reservas", label: "Reservas Ind.", icon: Calendar, iconColor: "text-blue-600" },
  { id: "grupales", label: "Reservas Grup.", icon: Users, iconColor: "text-blue-600" },
  { id: "inventario", label: "Inventario", icon: Package, iconColor: "text-green-600" },
  { id: "clientes", label: "Clientes", icon: UserCheck, iconColor: "text-amber-600" },
  { id: "empleados", label: "Empleados", icon: Briefcase, iconColor: "text-blue-600" },
  { id: "caja", label: "Caja", icon: DollarSign, iconColor: "text-green-600" },
];

const ESTADOS_RESERVA = ["todos", "reservado", "listo", "entregado", "devuelto", "anulado"];

// ─── Componente principal ───
export default function Reportes() {
  const [tab, setTab] = useState("ventas");
  const [loading, setLoading] = useState(false);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(true);
  const [fechaDesde, setFechaDesde] = useState(hoyStr);
  const [fechaHasta, setFechaHasta] = useState(hoyStr);
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [categoriaNombre, setCategoriaNombre] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("todos");
  const [estadoReservaFiltro, setEstadoReservaFiltro] = useState("todos");
  const [showCatModal, setShowCatModal] = useState(false);
  const [categoriasExpandidas, setCategoriasExpandidas] = useState({});
  const [verEliminadosVentas, setVerEliminadosVentas] = useState(false);

  // Data
  const [ventas, setVentas] = useState([]);
  const [todasReservas, setTodasReservas] = useState([]);
  const [grupales, setGrupales] = useState([]);
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [metodosPago, setMetodosPago] = useState([]);
  const [modosPago, setModosPago] = useState([]);
  const [ventasEliminadas, setVentasEliminadas] = useState([]);
  const [reservasEliminadas, setReservasEliminadas] = useState([]);
  const [grupalesEliminadas, setGrupalesEliminadas] = useState([]);
  const [cajas, setCajas] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const [rV, rAllR, rG, rP, rCat, rCli, rEmp, rMet, rMod, rVE, rRE, rGE, rCajas] = await Promise.all([
        safeFetch(`${API_BASE_URL}/ventas`),
        safeFetch(`${API_BASE_URL}/reservas?incluir_grupales=true`),
        safeFetch(`${API_BASE_URL}/reservas-grupo`),
        safeFetch(`${API_BASE_URL}/productos`),
        safeFetch(`${API_BASE_URL}/categorias`),
        safeFetch(`${API_BASE_URL}/clientes`),
        safeFetch(`${API_BASE_URL}/empleados`),
        safeFetch(`${API_BASE_URL}/pagos`),
        safeFetch(`${API_BASE_URL}/modos-pago`),
        safeFetch(`${API_BASE_URL}/ventas/eliminados`),
        safeFetch(`${API_BASE_URL}/reservas/eliminados`),
        safeFetch(`${API_BASE_URL}/reservas-grupo/eliminados`),
        safeFetch(`${API_BASE_URL}/cajas`),
      ]);
      setVentas(rV);
      setTodasReservas(rAllR);
      setGrupales(rG);
      setProductos(rP);
      setCategorias(rCat);
      setClientes(rCli);
      setEmpleados(rEmp);
      setMetodosPago(rMet);
      setModosPago(rMod);
      setVentasEliminadas(rVE);
      setReservasEliminadas(rRE);
      setGrupalesEliminadas(rGE);
      setCajas(rCajas);
      setLoaded(true);
    } catch {
      toast.error("Error al cargar datos");
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // ─── Separar reservas individuales de miembros de grupo ───
  const reservasIndividuales = useMemo(
    () => todasReservas.filter((r) => !r.id_grupo_reservas && !r.IdGrupoReservas),
    [todasReservas]
  );
  const reservasGrupales = useMemo(
    () => todasReservas.filter((r) => r.id_grupo_reservas || r.IdGrupoReservas),
    [todasReservas]
  );

  // Separar eliminadas individuales (sin grupo)
  const reservasEliminadasInd = useMemo(
    () => reservasEliminadas.filter((r) => !r.id_grupo_reservas && !r.IdGrupoReservas),
    [reservasEliminadas]
  );

  // ─── Helper: get metodo pago name for a venta ───
  const getNombreMetodoPago = useCallback(
    (ventaId) => {
      const modos = modosPago.filter((m) => (m.id_venta || m.IdVenta) === ventaId);
      if (modos.length === 0) return "N/A";
      const nombres = modos.map((m) => {
        const met = metodosPago.find((p) => (p.ID || p.id) === (m.id_pago || m.IdPago));
        return met?.nombre || met?.Nombre || "Otro";
      });
      return [...new Set(nombres)].join(", ");
    },
    [modosPago, metodosPago]
  );

  // ─── DATOS FILTRADOS ───

  // Ventas
  const ventasFiltradas = useMemo(
    () => ventas.filter((v) => enRango(v.CreatedAt || v.created_at, fechaDesde, fechaHasta)),
    [ventas, fechaDesde, fechaHasta]
  );
  const ventasTotal = useMemo(() => ventasFiltradas.reduce((s, v) => s + Number(v.total || v.Total || 0), 0), [ventasFiltradas]);

  // Ventas eliminadas filtradas por fecha de eliminacion
  const ventasEliminadasFiltradas = useMemo(
    () => ventasEliminadas.filter((v) => enRango(v.DeletedAt || v.deleted_at, fechaDesde, fechaHasta)),
    [ventasEliminadas, fechaDesde, fechaHasta]
  );
  const ventasEliminadasTotal = useMemo(() => ventasEliminadasFiltradas.reduce((s, v) => s + Number(v.total || v.Total || 0), 0), [ventasEliminadasFiltradas]);

  // Reservas individuales
  const reservasFiltradas = useMemo(() => {
    if (estadoReservaFiltro === "anulado") {
      // Combinar: activas con estado="anulado" + eliminadas (soft-deleted)
      const activas = reservasIndividuales
        .filter((r) => enRango(r.CreatedAt || r.created_at, fechaDesde, fechaHasta))
        .filter((r) => (r.estado || r.Estado || "").toLowerCase() === "anulado");
      const eliminadas = reservasEliminadasInd
        .filter((r) => enRango(r.DeletedAt || r.deleted_at || r.CreatedAt || r.created_at, fechaDesde, fechaHasta))
        .map((r) => ({ ...r, _esEliminada: true }));
      return [...activas, ...eliminadas];
    }
    let arr = reservasIndividuales.filter((r) => enRango(r.CreatedAt || r.created_at, fechaDesde, fechaHasta));
    if (estadoReservaFiltro !== "todos") {
      arr = arr.filter((r) => (r.estado || r.Estado || "").toLowerCase() === estadoReservaFiltro);
    }
    return arr;
  }, [reservasIndividuales, reservasEliminadasInd, fechaDesde, fechaHasta, estadoReservaFiltro]);
  const reservasTotal = useMemo(() => reservasFiltradas.reduce((s, r) => s + Number(r.total || r.Total || 0), 0), [reservasFiltradas]);
  const reservasAdelanto = useMemo(() => reservasFiltradas.reduce((s, r) => s + Number(r.adelanto || r.Adelanto || 0), 0), [reservasFiltradas]);

  // Grupales - con miembros calculados
  const grupalesConMiembros = useMemo(() => {
    return grupales.map((g) => {
      const gId = g.ID || g.id;
      const miembros = reservasGrupales.filter(
        (r) => (r.id_grupo_reservas || r.IdGrupoReservas) === gId
      );
      const totalMonto = miembros.reduce((s, m) => s + Number(m.total || m.Total || 0), 0);
      const totalAdelanto = miembros.reduce((s, m) => s + Number(m.adelanto || m.Adelanto || 0), 0);
      return { ...g, _miembros: miembros, _total: totalMonto, _adelanto: totalAdelanto, _count: miembros.length };
    });
  }, [grupales, reservasGrupales]);

  const grupalesFiltradas = useMemo(() => {
    if (estadoReservaFiltro === "anulado") {
      const activas = grupalesConMiembros
        .filter((g) => enRango(g.CreatedAt || g.created_at || g.fecha_evento || g.FechaEvento, fechaDesde, fechaHasta))
        .filter((g) => (g.estado || g.Estado || "").toLowerCase() === "anulado");
      const eliminadas = grupalesEliminadas
        .filter((g) => enRango(g.DeletedAt || g.deleted_at || g.CreatedAt || g.created_at, fechaDesde, fechaHasta))
        .map((g) => ({ ...g, _esEliminada: true, _total: 0, _adelanto: 0, _count: 0 }));
      return [...activas, ...eliminadas];
    }
    let arr = grupalesConMiembros.filter((g) =>
      enRango(g.CreatedAt || g.created_at || g.fecha_evento || g.FechaEvento, fechaDesde, fechaHasta)
    );
    if (estadoReservaFiltro !== "todos") {
      arr = arr.filter((g) => (g.estado || g.Estado || "").toLowerCase() === estadoReservaFiltro);
    }
    return arr;
  }, [grupalesConMiembros, grupalesEliminadas, fechaDesde, fechaHasta, estadoReservaFiltro]);
  const grupalesTotalMonto = useMemo(() => grupalesFiltradas.reduce((s, g) => s + g._total, 0), [grupalesFiltradas]);
  const grupalesTotalAdelanto = useMemo(() => grupalesFiltradas.reduce((s, g) => s + g._adelanto, 0), [grupalesFiltradas]);

  // Inventario
  const productosFiltrados = useMemo(() => {
    if (!categoriaFiltro) return [];
    const catId = Number(categoriaFiltro);
    // Recoger todos los IDs descendientes recursivamente
    const catIds = new Set([catId]);
    function recogerHijos(cats) {
      for (const c of cats) {
        const id = c.ID || c.id;
        if (catIds.has(id)) {
          const sub = c.SubCategorias || c.subcategorias || [];
          sub.forEach((s) => catIds.add(s.ID || s.id));
          recogerHijos(sub);
        } else {
          const sub = c.SubCategorias || c.subcategorias || [];
          if (sub.length > 0) recogerHijos(sub);
        }
      }
    }
    recogerHijos(categorias);
    return productos.filter((p) => catIds.has(Number(p.categoria_id || p.CategoriaID)));
  }, [productos, categoriaFiltro, categorias]);
  const stockBajo = useMemo(() => productosFiltrados.filter((p) => Number(p.stock || p.Stock || 0) > 0 && Number(p.stock || p.Stock || 0) <= 3).length, [productosFiltrados]);
  const agotados = useMemo(() => productosFiltrados.filter((p) => Number(p.stock || p.Stock || 0) === 0).length, [productosFiltrados]);

  // Clientes
  const clientesFiltrados = useMemo(
    () => clientes.filter((c) => enRango(c.CreatedAt || c.created_at, fechaDesde, fechaHasta)),
    [clientes, fechaDesde, fechaHasta]
  );

  // Empleados
  const empleadosFiltrados = useMemo(() => {
    if (estadoFiltro === "todos") return empleados;
    return empleados.filter((e) => (e.Estado || e.estado || "").toLowerCase() === estadoFiltro);
  }, [empleados, estadoFiltro]);
  const empActivos = useMemo(() => empleados.filter((e) => (e.Estado || e.estado || "").toLowerCase() === "activo").length, [empleados]);
  const empInactivos = useMemo(() => empleados.filter((e) => (e.Estado || e.estado || "").toLowerCase() === "inactivo").length, [empleados]);

  // Cajas
  const cajasFiltradas = useMemo(
    () => cajas.filter((c) => enRango(c.fecha_apertura || c.FechaApertura, fechaDesde, fechaHasta)),
    [cajas, fechaDesde, fechaHasta]
  );
  const cajasTotalVentas = useMemo(() => cajasFiltradas.reduce((s, c) => s + Number(c.total_ventas || c.TotalVentas || 0), 0), [cajasFiltradas]);
  const cajasTotalReservas = useMemo(() => cajasFiltradas.reduce((s, c) => s + Number(c.total_reservas || c.TotalReservas || 0), 0), [cajasFiltradas]);
  const cajasTotalEfectivo = useMemo(() => cajasFiltradas.reduce((s, c) => s + Number(c.total_efectivo || c.TotalEfectivo || 0), 0), [cajasFiltradas]);

  // ─── Helpers ───
  const getOrigenCliente = useCallback(
    (clienteId) => {
      const tieneVenta = ventas.some((v) => (v.id_cliente || v.IdCliente) === clienteId);
      if (tieneVenta) return "Venta";
      const tieneReserva = todasReservas.some((r) => (r.id_cliente || r.IdCliente) === clienteId);
      if (tieneReserva) return "Reserva";
      return "Manual";
    },
    [ventas, todasReservas]
  );

  const getNombreCliente = useCallback(
    (clienteId) => {
      const cli = clientes.find((c) => (c.ID || c.id) === clienteId);
      if (!cli) return "-";
      return `${cli.nombre || cli.Nombre || ""} ${cli.apellidos || cli.Apellidos || ""}`.trim();
    },
    [clientes]
  );

  const getNombreCategoria = useCallback(
    (catId) => {
      const id = Number(catId);
      if (!id) return "-";
      // Buscar recursivamente en el arbol de categorias (incluye SubCategorias)
      function buscar(cats) {
        for (const c of cats) {
          if ((c.ID || c.id) === id) return c.nombre || c.Nombre || "-";
          const sub = c.SubCategorias || c.subcategorias || [];
          if (sub.length > 0) {
            const found = buscar(sub);
            if (found) return found;
          }
        }
        return null;
      }
      return buscar(categorias) || "-";
    },
    [categorias]
  );

  // ─── Category tree (recursive with SubCategorias) ───
  const toggleCategoria = (id) =>
    setCategoriasExpandidas((prev) => ({ ...prev, [id]: !prev[id] }));

  const seleccionarCategoria = (id, nombre) => {
    setCategoriaFiltro(id ? String(id) : "");
    setCategoriaNombre(nombre || "");
    setShowCatModal(false);
  };

  const renderCategoriasList = (cats = [], nivel = 0) =>
    cats.map((cat) => {
      const id = cat.ID || cat.id;
      const nombre = cat.Nombre || cat.nombre || "Sin nombre";
      const sub = cat.SubCategorias || cat.subcategorias || [];
      const tieneHijos = sub.length > 0;
      const estaExpandida = categoriasExpandidas[id] ?? false;
      const estaSeleccionada = String(categoriaFiltro) === String(id);

      return (
        <div key={id} className="mb-0.5" style={{ marginLeft: nivel * 10 }}>
          <div
            onClick={() => tieneHijos ? toggleCategoria(id) : seleccionarCategoria(id, nombre)}
            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border cursor-pointer transition-all duration-150 ${
              estaSeleccionada
                ? "bg-blue-500 text-white border-blue-500 shadow-sm"
                : tieneHijos
                  ? "bg-gray-50 border-gray-200 hover:bg-gray-100"
                  : "bg-white border-gray-200 hover:border-blue-400 hover:bg-blue-50"
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              {nivel > 0 && (
                <span className={`text-xs flex-shrink-0 ${estaSeleccionada ? "text-white/70" : "text-gray-400"}`}>↳</span>
              )}
              {tieneHijos && (
                <span className="flex-shrink-0 p-0.5">
                  {estaExpandida
                    ? <ChevronDown size={11} className="text-blue-600" />
                    : <ChevronRight size={11} className="text-blue-600" />}
                </span>
              )}
              <span className={`text-xs font-medium truncate ${estaSeleccionada ? "text-white" : tieneHijos ? "text-gray-600" : "text-gray-700"}`}>{nombre}</span>
            </div>
            {tieneHijos && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium text-blue-600 bg-blue-100">{sub.length}</span>
            )}
          </div>
          {tieneHijos && estaExpandida && (
            <div className="mt-0.5">{renderCategoriasList(sub, nivel + 1)}</div>
          )}
        </div>
      );
    });

  // ─── PDF EXPORT ───
  const exportarPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    const pageW = doc.internal.pageSize.getWidth();
    let y = 15;

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    const esAnulVentas = tab === "ventas" && verEliminadosVentas;
    const esAnulReservas = tab === "reservas" && estadoReservaFiltro === "anulado";
    const esAnulGrupales = tab === "grupales" && estadoReservaFiltro === "anulado";
    const titulo = esAnulVentas ? "REPORTE DE VENTAS ELIMINADAS"
      : esAnulReservas ? "REPORTE DE RESERVAS ANULADAS"
      : esAnulGrupales ? "REPORTE DE RESERVAS GRUPALES ANULADAS"
      : {
        ventas: "REPORTE DE VENTAS",
        reservas: "REPORTE DE RESERVAS INDIVIDUALES",
        grupales: "REPORTE DE RESERVAS GRUPALES",
        inventario: "REPORTE DE INVENTARIO",
        clientes: "REPORTE DE CLIENTES",
        empleados: "REPORTE DE EMPLEADOS",
        caja: "REPORTE DE CAJA",
      }[tab];
    doc.text(titulo, pageW / 2, y, { align: "center" });
    y += 8;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    if (tab !== "inventario" && tab !== "empleados") {
      doc.text(`Periodo: ${formatFecha(fechaDesde)} - ${formatFecha(fechaHasta)}`, pageW / 2, y, { align: "center" });
    } else if (tab === "inventario" && categoriaNombre) {
      doc.text(`Categoria: ${categoriaNombre}`, pageW / 2, y, { align: "center" });
    }
    y += 10;

    let headers = [];
    let rows = [];

    if (esAnulVentas) {
      headers = ["#", "Fecha Venta", "Fecha Eliminacion", "Eliminado Por", "Motivo", "Total"];
      ventasEliminadasFiltradas.forEach((v, i) => {
        rows.push([
          String(i + 1),
          formatFecha(v.CreatedAt || v.created_at),
          formatFecha(v.DeletedAt || v.deleted_at),
          v.anulado_por || v.AnuladoPor || "-",
          limpiarMotivo(v.motivo_anulacion || v.MotivoAnulacion),
          formatMoney(v.total || v.Total || 0),
        ]);
      });
      if (rows.length > 0) rows.push(["", "", "", "", "TOTAL ANULADO:", formatMoney(ventasEliminadasTotal)]);
    } else if (tab === "ventas") {
      headers = ["#", "Fecha", "Cliente", "DNI", "Met. Pago", "Total"];
      ventasFiltradas.forEach((v, i) => {
        const cli = v.cliente || clientes.find((c) => (c.ID || c.id) === (v.id_cliente || v.IdCliente));
        rows.push([
          String(i + 1),
          formatFecha(v.CreatedAt || v.created_at),
          cli ? `${cli.nombre || cli.Nombre || ""} ${cli.apellidos || cli.Apellidos || ""}`.trim() : "-",
          cli?.dni || cli?.DNI || "-",
          getNombreMetodoPago(v.ID || v.id),
          formatMoney(v.total || v.Total || 0),
        ]);
      });
      if (rows.length > 0) rows.push(["", "", "", "", "TOTALES:", formatMoney(ventasTotal)]);
    } else if (esAnulReservas) {
      headers = ["#", "Fecha", "Cliente", "Fecha Anulacion", "Anulado Por", "Motivo", "Total"];
      reservasFiltradas.forEach((r, i) => {
        const cli = r.cliente;
        const nombre = cli
          ? `${cli.nombre || cli.Nombre || ""} ${cli.apellidos || cli.Apellidos || ""}`.trim()
          : getNombreCliente(r.id_cliente || r.IdCliente);
        const fechaAnul = r._esEliminada
          ? formatFecha(r.DeletedAt || r.deleted_at)
          : formatFecha(r.UpdatedAt || r.updated_at);
        rows.push([
          String(i + 1),
          formatFecha(r.CreatedAt || r.created_at),
          nombre,
          fechaAnul,
          r.anulado_por || r.AnuladoPor || "-",
          limpiarMotivo(r.motivo_anulacion || r.MotivoAnulacion),
          formatMoney(r.total || r.Total || 0),
        ]);
      });
      if (rows.length > 0) rows.push(["", "", "", "", "", "TOTAL ANULADO:", formatMoney(reservasTotal)]);
    } else if (tab === "reservas") {
      headers = ["#", "Fecha", "Cliente", "Fecha Evento", "Estado", "Total", "Adelanto"];
      reservasFiltradas.forEach((r, i) => {
        const cli = r.cliente;
        const nombre = cli
          ? `${cli.nombre || cli.Nombre || ""} ${cli.apellidos || cli.Apellidos || ""}`.trim()
          : getNombreCliente(r.id_cliente || r.IdCliente);
        rows.push([
          String(i + 1),
          formatFecha(r.CreatedAt || r.created_at),
          nombre,
          formatFecha(r.fecha_evento || r.FechaEvento),
          (r.estado || r.Estado || "").toUpperCase(),
          formatMoney(r.total || r.Total || 0),
          formatMoney(r.adelanto || r.Adelanto || 0),
        ]);
      });
      if (rows.length > 0) rows.push(["", "", "", "", "TOTALES:", formatMoney(reservasTotal), formatMoney(reservasAdelanto)]);
    } else if (esAnulGrupales) {
      headers = ["#", "Grupo", "Responsable", "Fecha Anulacion", "Anulado Por", "Motivo", "Total", "Adelanto"];
      grupalesFiltradas.forEach((g, i) => {
        const resp = g.responsable || g.Responsable;
        const fechaAnul = g._esEliminada
          ? formatFecha(g.DeletedAt || g.deleted_at)
          : formatFecha(g.UpdatedAt || g.updated_at);
        rows.push([
          String(i + 1),
          g.nombre_grupo || g.NombreGrupo || "-",
          resp ? `${resp.nombre || resp.Nombre || ""} ${resp.apellidos || resp.Apellidos || ""}`.trim() : "-",
          fechaAnul,
          g.anulado_por || g.AnuladoPor || "-",
          limpiarMotivo(g.motivo_anulacion || g.MotivoAnulacion),
          formatMoney(g._total),
          formatMoney(g._adelanto),
        ]);
      });
      if (rows.length > 0) rows.push(["", "", "", "", "", "TOTAL ANULADO:", formatMoney(grupalesTotalMonto), formatMoney(grupalesTotalAdelanto)]);
    } else if (tab === "grupales") {
      headers = ["#", "Grupo", "Responsable", "Fecha Evento", "Miembros", "Estado", "Total", "Adelanto"];
      grupalesFiltradas.forEach((g, i) => {
        const resp = g.responsable || g.Responsable;
        rows.push([
          String(i + 1),
          g.nombre_grupo || g.NombreGrupo || "-",
          resp ? `${resp.nombre || resp.Nombre || ""} ${resp.apellidos || resp.Apellidos || ""}`.trim() : "-",
          formatFecha(g.fecha_evento || g.FechaEvento),
          String(g._count),
          (g.estado || g.Estado || "").toUpperCase(),
          formatMoney(g._total),
          formatMoney(g._adelanto),
        ]);
      });
      if (rows.length > 0) rows.push(["", "", "", "", "", "TOTALES:", formatMoney(grupalesTotalMonto), formatMoney(grupalesTotalAdelanto)]);
    } else if (tab === "inventario") {
      headers = ["#", "Producto", "Talla", "Modelo", "Color", "Categoria", "Estado", "Stock", "Precio"];
      productosFiltrados.forEach((p, i) => {
        const stock = Number(p.stock || p.Stock || 0);
        const estado = stock === 0 ? "Agotado" : stock <= 3 ? "Stock bajo" : "Disponible";
        rows.push([
          String(i + 1),
          p.nombre || p.Nombre || "-",
          p.talla || p.Talla || "-",
          p.modelo || p.Modelo || "-",
          p.color || p.Color || "-",
          getNombreCategoria(p.categoria_id || p.CategoriaID),
          estado,
          String(stock),
          formatMoney(p.precio_alquiler || p.PrecioAlquiler || p.precio_venta || p.PrecioVenta || 0),
        ]);
      });
    } else if (tab === "clientes") {
      headers = ["#", "Nombres", "DNI", "Telefono", "Correo", "Fecha Registro", "Origen"];
      clientesFiltrados.forEach((c, i) => {
        rows.push([
          String(i + 1),
          `${c.nombre || c.Nombre || ""} ${c.apellidos || c.Apellidos || ""}`.trim(),
          c.dni || c.DNI || "-",
          c.telefono || c.Telefono || "-",
          c.correo || c.Correo || "-",
          formatFecha(c.CreatedAt || c.created_at),
          getOrigenCliente(c.ID || c.id),
        ]);
      });
    } else if (tab === "empleados") {
      headers = ["#", "Nombres", "DNI", "Telefono", "Cargo", "Estado"];
      empleadosFiltrados.forEach((e, i) => {
        rows.push([
          String(i + 1),
          `${e.Nombre || e.nombre || ""} ${e.Apellidos || e.apellidos || ""}`.trim(),
          e.DNI || e.dni || "-",
          e.Telefono || e.telefono || "-",
          e.Perfil || e.perfil || "-",
          (e.Estado || e.estado || "").toUpperCase(),
        ]);
      });
    } else if (tab === "caja") {
      headers = ["#", "Empleado", "Apertura", "Cierre", "S.Inicial", "S.Final", "Ventas", "Reservas", "Efectivo", "Otros", "Dif.Arqueo", "Estado"];
      cajasFiltradas.forEach((c, i) => {
        const emp = c.empleado || c.Empleado;
        const nombreEmp = emp ? `${emp.Nombre || emp.nombre || ""} ${emp.Apellidos || emp.apellidos || ""}`.trim() : "-";
        const estado = (c.estado || c.Estado || "").toUpperCase();
        const dif = Number(c.diferencia_arqueo || c.DiferenciaArqueo || 0);
        rows.push([
          String(i + 1),
          nombreEmp,
          formatFechaHora(c.fecha_apertura || c.FechaApertura),
          c.fecha_cierre || c.FechaCierre ? formatFechaHora(c.fecha_cierre || c.FechaCierre) : "-",
          formatMoney(c.saldo_inicial || c.SaldoInicial || 0),
          c.saldo_final != null ? formatMoney(c.saldo_final) : c.SaldoFinal != null ? formatMoney(c.SaldoFinal) : "-",
          formatMoney(c.total_ventas || c.TotalVentas || 0),
          formatMoney(c.total_reservas || c.TotalReservas || 0),
          formatMoney(c.total_efectivo || c.TotalEfectivo || 0),
          formatMoney(c.total_otros_medios || c.TotalOtrosMedios || 0),
          dif === 0 ? "Cuadre" : formatMoney(dif),
          estado,
        ]);
      });
      if (rows.length > 0) rows.push(["", "", "", "", "", "TOTALES:", formatMoney(cajasTotalVentas), formatMoney(cajasTotalReservas), formatMoney(cajasTotalEfectivo), "", "", ""]);
    }

    if (rows.length === 0) {
      toast.error("No hay datos para exportar");
      return;
    }

    // Draw table
    const numCols = headers.length;
    const colW = (pageW - 20) / numCols;
    const startX = 10;
    const rowH = 8;

    doc.setFillColor(59, 130, 246);
    doc.rect(startX, y, pageW - 20, rowH, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    headers.forEach((h, i) => {
      doc.text(h, startX + i * colW + 2, y + 5.5);
    });
    y += rowH;

    doc.setTextColor(50, 50, 50);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);

    rows.forEach((row, ri) => {
      if (y > doc.internal.pageSize.getHeight() - 15) {
        doc.addPage();
        y = 15;
        doc.setFillColor(59, 130, 246);
        doc.rect(startX, y, pageW - 20, rowH, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        headers.forEach((h, i) => {
          doc.text(h, startX + i * colW + 2, y + 5.5);
        });
        y += rowH;
        doc.setTextColor(50, 50, 50);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
      }

      if (ri % 2 === 0) {
        doc.setFillColor(240, 245, 255);
        doc.rect(startX, y, pageW - 20, rowH, "F");
      }

      row.forEach((cell, ci) => {
        const txt = String(cell || "").substring(0, 30);
        doc.text(txt, startX + ci * colW + 2, y + 5.5);
      });
      y += rowH;
    });

    y += 5;
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(120, 120, 120);
    doc.text(`Total de registros: ${rows.length}`, startX, y);
    doc.text(`Generado: ${new Date().toLocaleString("es-PE")}`, pageW - 10, y, { align: "right" });

    doc.save(`reporte-${tab}-${hoyStr()}.pdf`);
    toast.success("PDF exportado correctamente");
  };

  // ─── RENDER ───
  const usaFechas = tab === "ventas" || tab === "reservas" || tab === "grupales" || tab === "clientes" || tab === "caja";
  const usaEstadoReserva = tab === "reservas" || tab === "grupales";

  return (
    <div className="p-3 md:p-5 space-y-4">
      {/* ─── HEADER ─── */}
      <div className="bg-white rounded-lg shadow-md p-3">
        <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2 text-gray-800">
          <FileText className="w-6 h-6 text-blue-600" />
          REPORTES
        </h1>
      </div>

      {/* ─── TABS + EXPORTAR ─── */}
      <div className="flex flex-wrap items-center gap-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-white" : t.iconColor}`} />
              {t.label}
            </button>
          );
        })}
        <div className="ml-auto">
          <button
            onClick={exportarPDF}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium shadow-sm"
          >
            <Download className="w-4 h-4" />
            Exportar PDF
          </button>
        </div>
      </div>

      {/* ─── FILTROS ─── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <button
          onClick={() => setFiltrosAbiertos(!filtrosAbiertos)}
          className="w-full flex items-center justify-between px-4 py-3 bg-blue-600 text-white font-semibold text-sm"
        >
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            FILTROS
          </div>
          {filtrosAbiertos ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {filtrosAbiertos && (
          <div className="p-4">
            <div className="flex flex-wrap items-end gap-4">
              {usaFechas && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Fecha Desde</label>
                    <input
                      type="date"
                      value={fechaDesde}
                      onChange={(e) => setFechaDesde(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Fecha Hasta</label>
                    <input
                      type="date"
                      value={fechaHasta}
                      onChange={(e) => setFechaHasta(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </>
              )}

              {tab === "ventas" && (
                <div className="flex items-center gap-2 self-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={verEliminadosVentas}
                      onChange={(e) => setVerEliminadosVentas(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm font-medium text-red-600 flex items-center gap-1">
                      <Trash2 className="w-3.5 h-3.5" />
                      Ver eliminados
                    </span>
                  </label>
                </div>
              )}

              {usaEstadoReserva && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
                  <select
                    value={estadoReservaFiltro}
                    onChange={(e) => setEstadoReservaFiltro(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[150px]"
                  >
                    {ESTADOS_RESERVA.map((e) => (
                      <option key={e} value={e}>
                        {e === "todos" ? "Todos" : e.charAt(0).toUpperCase() + e.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {tab === "inventario" && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Categoria</label>
                  <button
                    onClick={() => setShowCatModal(true)}
                    className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 min-w-[200px] text-left"
                  >
                    <FolderOpen className="w-4 h-4 text-gray-400" />
                    <span className={categoriaFiltro ? "text-gray-800" : "text-gray-400"}>
                      {categoriaNombre || "Seleccionar categoria"}
                    </span>
                  </button>
                </div>
              )}

              {tab === "empleados" && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
                  <select
                    value={estadoFiltro}
                    onChange={(e) => setEstadoFiltro(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[150px]"
                  >
                    <option value="todos">Todos</option>
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </div>
              )}

              <button
                onClick={cargarDatos}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                Actualizar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── SUMMARY CARDS ─── */}
      {loaded && (
        <>
          {tab === "ventas" && !verEliminadosVentas && (
            <div className="grid grid-cols-2 gap-4">
              <SummaryCard label="Total Registros" value={ventasFiltradas.length} border="border-blue-500" />
              <SummaryCard label="Total Monto" value={formatMoney(ventasTotal)} border="border-green-500" isGreen />
            </div>
          )}
          {tab === "ventas" && verEliminadosVentas && (
            <div className="grid grid-cols-2 gap-4">
              <SummaryCard label="Ventas Eliminadas" value={ventasEliminadasFiltradas.length} border="border-red-500" isRed />
              <SummaryCard label="Total Anulado" value={formatMoney(ventasEliminadasTotal)} border="border-red-500" isRed />
            </div>
          )}
          {tab === "reservas" && (
            <div className="grid grid-cols-4 gap-4">
              <SummaryCard label="Total Registros" value={reservasFiltradas.length} border="border-blue-500" />
              <SummaryCard label="Total Monto" value={formatMoney(reservasTotal)} border="border-green-500" isGreen />
              <SummaryCard label="Total Adelantos" value={formatMoney(reservasAdelanto)} border="border-green-500" isGreen />
              <SummaryCard label="Saldo Pendiente" value={formatMoney(reservasTotal - reservasAdelanto)} border="border-red-500" isRed />
            </div>
          )}
          {tab === "grupales" && (
            <div className="grid grid-cols-4 gap-4">
              <SummaryCard label="Total Registros" value={grupalesFiltradas.length} border="border-blue-500" />
              <SummaryCard label="Total Monto" value={formatMoney(grupalesTotalMonto)} border="border-green-500" isGreen />
              <SummaryCard label="Total Adelantos" value={formatMoney(grupalesTotalAdelanto)} border="border-green-500" isGreen />
              <SummaryCard label="Saldo Pendiente" value={formatMoney(grupalesTotalMonto - grupalesTotalAdelanto)} border="border-red-500" isRed />
            </div>
          )}
          {tab === "inventario" && (
            <div className="grid grid-cols-3 gap-4">
              <SummaryCard label="Total Productos" value={productosFiltrados.length} border="border-blue-500" />
              <SummaryCard label="Stock Bajo" value={stockBajo} border="border-amber-500" isAmber />
              <SummaryCard label="Agotados" value={agotados} border="border-red-500" isRed />
            </div>
          )}
          {tab === "clientes" && (
            <div className="grid grid-cols-1 gap-4">
              <SummaryCard label="Total Registros" value={clientesFiltrados.length} border="border-blue-500" />
            </div>
          )}
          {tab === "empleados" && (
            <div className="grid grid-cols-2 gap-4">
              <SummaryCard label="Activos" value={empActivos} border="border-green-500" isGreen />
              <SummaryCard label="Inactivos" value={empInactivos} border="border-red-500" isRed />
            </div>
          )}
          {tab === "caja" && (
            <div className="grid grid-cols-4 gap-4">
              <SummaryCard label="Total Cajas" value={cajasFiltradas.length} border="border-blue-500" />
              <SummaryCard label="Total Ventas" value={formatMoney(cajasTotalVentas)} border="border-green-500" isGreen />
              <SummaryCard label="Total Reservas" value={formatMoney(cajasTotalReservas)} border="border-green-500" isGreen />
              <SummaryCard label="Total Efectivo" value={formatMoney(cajasTotalEfectivo)} border="border-amber-500" isAmber />
            </div>
          )}
        </>
      )}

      {/* ─── TABLE ─── */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      ) : loaded ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Table section title */}
          <div className="bg-blue-100 px-4 py-2 text-center">
            <span className="text-sm font-bold text-blue-700 flex items-center justify-center gap-2">
              {tab === "ventas" && !verEliminadosVentas && <><ShoppingCart className="w-4 h-4" /> VENTAS - {ventasFiltradas.length} registros</>}
              {tab === "ventas" && verEliminadosVentas && <><Trash2 className="w-4 h-4 text-red-600" /> VENTAS ELIMINADAS - {ventasEliminadasFiltradas.length} registros</>}
              {tab === "reservas" && <><Calendar className="w-4 h-4" /> RESERVAS INDIVIDUALES - {reservasFiltradas.length} registros</>}
              {tab === "grupales" && <><Users className="w-4 h-4" /> RESERVAS GRUP. - {grupalesFiltradas.length} registros</>}
              {tab === "inventario" && <><Package className="w-4 h-4" /> INVENTARIO - {productosFiltrados.length} registros</>}
              {tab === "clientes" && <><UserCheck className="w-4 h-4" /> CLIENTES - {clientesFiltrados.length} registros</>}
              {tab === "empleados" && <><Briefcase className="w-4 h-4" /> EMPLEADOS - {empleadosFiltrados.length} registros</>}
              {tab === "caja" && <><DollarSign className="w-4 h-4" /> HISTORIAL DE CAJA - {cajasFiltradas.length} registros</>}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-blue-600 text-white">
                  <th className="px-3 py-2.5 text-left font-semibold text-xs">#</th>
                  {tab === "ventas" && !verEliminadosVentas && (
                    <>
                      <th className="px-3 py-2.5 text-left font-semibold text-xs">Fecha</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-xs">Cliente</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-xs">DNI</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-xs">Met. Pago</th>
                      <th className="px-3 py-2.5 text-right font-semibold text-xs">Total</th>
                    </>
                  )}
                  {tab === "ventas" && verEliminadosVentas && (
                    <>
                      <th className="px-3 py-2.5 text-left font-semibold text-xs">Fecha Venta</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-xs">Fecha Eliminacion</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-xs">Eliminado Por</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-xs">Motivo</th>
                      <th className="px-3 py-2.5 text-right font-semibold text-xs">Total</th>
                    </>
                  )}
                  {tab === "reservas" && estadoReservaFiltro !== "anulado" && (
                    <>
                      <th className="px-3 py-2.5 text-left font-semibold text-xs">Fecha</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-xs">Cliente</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-xs">Fecha Evento</th>
                      <th className="px-3 py-2.5 text-center font-semibold text-xs">Estado</th>
                      <th className="px-3 py-2.5 text-right font-semibold text-xs">Total</th>
                      <th className="px-3 py-2.5 text-right font-semibold text-xs">Adelanto</th>
                    </>
                  )}
                  {tab === "reservas" && estadoReservaFiltro === "anulado" && (
                    <>
                      <th className="px-3 py-2.5 text-left font-semibold text-xs">Fecha</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-xs">Cliente</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-xs">Fecha Anulacion</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-xs">Anulado Por</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-xs">Motivo</th>
                      <th className="px-3 py-2.5 text-right font-semibold text-xs">Total</th>
                    </>
                  )}
                  {tab === "grupales" && estadoReservaFiltro !== "anulado" && (
                    <>
                      <th className="px-3 py-2.5 text-left font-semibold text-xs">Grupo</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-xs">Responsable</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-xs">Fecha Evento</th>
                      <th className="px-3 py-2.5 text-center font-semibold text-xs">Miembros</th>
                      <th className="px-3 py-2.5 text-center font-semibold text-xs">Estado</th>
                      <th className="px-3 py-2.5 text-right font-semibold text-xs">Total</th>
                      <th className="px-3 py-2.5 text-right font-semibold text-xs">Adelanto</th>
                    </>
                  )}
                  {tab === "grupales" && estadoReservaFiltro === "anulado" && (
                    <>
                      <th className="px-3 py-2.5 text-left font-semibold text-xs">Grupo</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-xs">Responsable</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-xs">Fecha Anulacion</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-xs">Anulado Por</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-xs">Motivo</th>
                      <th className="px-3 py-2.5 text-right font-semibold text-xs">Total</th>
                      <th className="px-3 py-2.5 text-right font-semibold text-xs">Adelanto</th>
                    </>
                  )}
                  {tab === "inventario" && (
                    <>
                      <th className="px-3 py-2.5 text-left font-semibold text-xs">Producto</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-xs">Talla</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-xs">Modelo</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-xs">Color</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-xs">Categoria</th>
                      <th className="px-3 py-2.5 text-center font-semibold text-xs">Estado</th>
                      <th className="px-3 py-2.5 text-center font-semibold text-xs">Stock</th>
                      <th className="px-3 py-2.5 text-right font-semibold text-xs">Precio</th>
                    </>
                  )}
                  {tab === "clientes" && (
                    <>
                      <th className="px-3 py-2.5 text-left font-semibold text-xs">Nombres</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-xs">DNI</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-xs">Telefono</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-xs">Correo</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-xs">Fecha Registro</th>
                      <th className="px-3 py-2.5 text-center font-semibold text-xs">Origen</th>
                    </>
                  )}
                  {tab === "empleados" && (
                    <>
                      <th className="px-3 py-2.5 text-left font-semibold text-xs">Nombres</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-xs">DNI</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-xs">Telefono</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-xs">Cargo</th>
                      <th className="px-3 py-2.5 text-center font-semibold text-xs">Estado</th>
                    </>
                  )}
                  {tab === "caja" && (
                    <>
                      <th className="px-3 py-2.5 text-left font-semibold text-xs">Empleado</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-xs">Apertura</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-xs">Cierre</th>
                      <th className="px-3 py-2.5 text-right font-semibold text-xs">S. Inicial</th>
                      <th className="px-3 py-2.5 text-right font-semibold text-xs">S. Final</th>
                      <th className="px-3 py-2.5 text-right font-semibold text-xs">Ventas</th>
                      <th className="px-3 py-2.5 text-right font-semibold text-xs">Reservas</th>
                      <th className="px-3 py-2.5 text-right font-semibold text-xs">Efectivo</th>
                      <th className="px-3 py-2.5 text-right font-semibold text-xs">Otros</th>
                      <th className="px-3 py-2.5 text-center font-semibold text-xs">Dif. Arqueo</th>
                      <th className="px-3 py-2.5 text-center font-semibold text-xs">Estado</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {/* VENTAS NORMALES */}
                {tab === "ventas" && !verEliminadosVentas &&
                  ventasFiltradas.map((v, i) => {
                    const cli = v.cliente || clientes.find((c) => (c.ID || c.id) === (v.id_cliente || v.IdCliente));
                    return (
                      <tr key={v.ID || v.id || i} className={i % 2 === 0 ? "bg-white" : "bg-blue-50/30"}>
                        <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                        <td className="px-3 py-2">{formatFecha(v.CreatedAt || v.created_at)}</td>
                        <td className="px-3 py-2 font-medium">
                          {cli ? `${cli.nombre || cli.Nombre || ""} ${cli.apellidos || cli.Apellidos || ""}`.trim().toUpperCase() : "-"}
                        </td>
                        <td className="px-3 py-2">{cli?.dni || cli?.DNI || "-"}</td>
                        <td className="px-3 py-2">{getNombreMetodoPago(v.ID || v.id)}</td>
                        <td className="px-3 py-2 text-right font-semibold">{formatMoney(v.total || v.Total || 0)}</td>
                      </tr>
                    );
                  })}
                {tab === "ventas" && !verEliminadosVentas && ventasFiltradas.length > 0 && (
                  <tr className="bg-white border-t-2 border-gray-300">
                    <td colSpan={5} className="px-3 py-2 text-right font-bold text-gray-700">TOTALES:</td>
                    <td className="px-3 py-2 text-right font-bold text-gray-900">{formatMoney(ventasTotal)}</td>
                  </tr>
                )}

                {/* VENTAS ELIMINADAS */}
                {tab === "ventas" && verEliminadosVentas &&
                  ventasEliminadasFiltradas.map((v, i) => (
                    <tr key={v.ID || v.id || i} className={i % 2 === 0 ? "bg-white" : "bg-red-50/30"}>
                      <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                      <td className="px-3 py-2">{formatFecha(v.CreatedAt || v.created_at)}</td>
                      <td className="px-3 py-2">{formatFecha(v.DeletedAt || v.deleted_at)}</td>
                      <td className="px-3 py-2 font-medium">{v.anulado_por || v.AnuladoPor || "-"}</td>
                      <td className="px-3 py-2 text-xs">{limpiarMotivo(v.motivo_anulacion || v.MotivoAnulacion)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-red-600">{formatMoney(v.total || v.Total || 0)}</td>
                    </tr>
                  ))}
                {tab === "ventas" && verEliminadosVentas && ventasEliminadasFiltradas.length > 0 && (
                  <tr className="bg-white border-t-2 border-red-300">
                    <td colSpan={5} className="px-3 py-2 text-right font-bold text-red-700">TOTAL ANULADO:</td>
                    <td className="px-3 py-2 text-right font-bold text-red-700">{formatMoney(ventasEliminadasTotal)}</td>
                  </tr>
                )}

                {/* RESERVAS INDIVIDUALES - NORMAL */}
                {tab === "reservas" && estadoReservaFiltro !== "anulado" &&
                  reservasFiltradas.map((r, i) => {
                    const cli = r.cliente;
                    const nombre = cli
                      ? `${cli.nombre || cli.Nombre || ""} ${cli.apellidos || cli.Apellidos || ""}`.trim()
                      : getNombreCliente(r.id_cliente || r.IdCliente);
                    const est = (r.estado || r.Estado || "").toLowerCase();
                    return (
                      <tr key={r.ID || r.id || i} className={i % 2 === 0 ? "bg-white" : "bg-blue-50/30"}>
                        <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                        <td className="px-3 py-2">{formatFecha(r.CreatedAt || r.created_at)}</td>
                        <td className="px-3 py-2 font-medium">{nombre.toUpperCase()}</td>
                        <td className="px-3 py-2">{formatFecha(r.fecha_evento || r.FechaEvento)}</td>
                        <td className="px-3 py-2 text-center"><EstadoBadge estado={est} /></td>
                        <td className="px-3 py-2 text-right font-semibold">{formatMoney(r.total || r.Total || 0)}</td>
                        <td className="px-3 py-2 text-right">{formatMoney(r.adelanto || r.Adelanto || 0)}</td>
                      </tr>
                    );
                  })}
                {tab === "reservas" && estadoReservaFiltro !== "anulado" && reservasFiltradas.length > 0 && (
                  <tr className="bg-white border-t-2 border-gray-300">
                    <td colSpan={5} className="px-3 py-2 text-right font-bold text-gray-700">TOTALES:</td>
                    <td className="px-3 py-2 text-right font-bold text-gray-900">{formatMoney(reservasTotal)}</td>
                    <td className="px-3 py-2 text-right font-bold text-gray-900">{formatMoney(reservasAdelanto)}</td>
                  </tr>
                )}

                {/* RESERVAS INDIVIDUALES - ANULADAS */}
                {tab === "reservas" && estadoReservaFiltro === "anulado" &&
                  reservasFiltradas.map((r, i) => {
                    const cli = r.cliente;
                    const nombre = cli
                      ? `${cli.nombre || cli.Nombre || ""} ${cli.apellidos || cli.Apellidos || ""}`.trim()
                      : getNombreCliente(r.id_cliente || r.IdCliente);
                    const fechaAnul = r._esEliminada
                      ? formatFecha(r.DeletedAt || r.deleted_at)
                      : formatFecha(r.UpdatedAt || r.updated_at);
                    return (
                      <tr key={r.ID || r.id || i} className={i % 2 === 0 ? "bg-white" : "bg-red-50/30"}>
                        <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                        <td className="px-3 py-2">{formatFecha(r.CreatedAt || r.created_at)}</td>
                        <td className="px-3 py-2 font-medium">{nombre.toUpperCase()}</td>
                        <td className="px-3 py-2">{fechaAnul}</td>
                        <td className="px-3 py-2 font-medium">{r.anulado_por || r.AnuladoPor || "-"}</td>
                        <td className="px-3 py-2 text-xs">{limpiarMotivo(r.motivo_anulacion || r.MotivoAnulacion)}</td>
                        <td className="px-3 py-2 text-right font-semibold text-red-600">{formatMoney(r.total || r.Total || 0)}</td>
                      </tr>
                    );
                  })}
                {tab === "reservas" && estadoReservaFiltro === "anulado" && reservasFiltradas.length > 0 && (
                  <tr className="bg-white border-t-2 border-red-300">
                    <td colSpan={6} className="px-3 py-2 text-right font-bold text-red-700">TOTAL ANULADO:</td>
                    <td className="px-3 py-2 text-right font-bold text-red-700">{formatMoney(reservasTotal)}</td>
                  </tr>
                )}

                {/* GRUPALES - NORMAL */}
                {tab === "grupales" && estadoReservaFiltro !== "anulado" &&
                  grupalesFiltradas.map((g, i) => {
                    const resp = g.responsable || g.Responsable;
                    const est = (g.estado || g.Estado || "").toLowerCase();
                    return (
                      <tr key={g.ID || g.id || i} className={i % 2 === 0 ? "bg-white" : "bg-blue-50/30"}>
                        <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                        <td className="px-3 py-2 font-medium">{(g.nombre_grupo || g.NombreGrupo || "-").toUpperCase()}</td>
                        <td className="px-3 py-2">
                          {resp ? `${resp.nombre || resp.Nombre || ""} ${resp.apellidos || resp.Apellidos || ""}`.trim() : "-"}
                        </td>
                        <td className="px-3 py-2">{formatFecha(g.fecha_evento || g.FechaEvento)}</td>
                        <td className="px-3 py-2 text-center">{g._count}</td>
                        <td className="px-3 py-2 text-center"><EstadoBadge estado={est} /></td>
                        <td className="px-3 py-2 text-right font-semibold">{formatMoney(g._total)}</td>
                        <td className="px-3 py-2 text-right">{formatMoney(g._adelanto)}</td>
                      </tr>
                    );
                  })}
                {tab === "grupales" && estadoReservaFiltro !== "anulado" && grupalesFiltradas.length > 0 && (
                  <tr className="bg-white border-t-2 border-gray-300">
                    <td colSpan={6} className="px-3 py-2 text-right font-bold text-gray-700">TOTALES:</td>
                    <td className="px-3 py-2 text-right font-bold text-gray-900">{formatMoney(grupalesTotalMonto)}</td>
                    <td className="px-3 py-2 text-right font-bold text-gray-900">{formatMoney(grupalesTotalAdelanto)}</td>
                  </tr>
                )}

                {/* GRUPALES - ANULADAS */}
                {tab === "grupales" && estadoReservaFiltro === "anulado" &&
                  grupalesFiltradas.map((g, i) => {
                    const resp = g.responsable || g.Responsable;
                    const fechaAnul = g._esEliminada
                      ? formatFecha(g.DeletedAt || g.deleted_at)
                      : formatFecha(g.UpdatedAt || g.updated_at);
                    return (
                      <tr key={g.ID || g.id || i} className={i % 2 === 0 ? "bg-white" : "bg-red-50/30"}>
                        <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                        <td className="px-3 py-2 font-medium">{(g.nombre_grupo || g.NombreGrupo || "-").toUpperCase()}</td>
                        <td className="px-3 py-2">
                          {resp ? `${resp.nombre || resp.Nombre || ""} ${resp.apellidos || resp.Apellidos || ""}`.trim() : "-"}
                        </td>
                        <td className="px-3 py-2">{fechaAnul}</td>
                        <td className="px-3 py-2 font-medium">{g.anulado_por || g.AnuladoPor || "-"}</td>
                        <td className="px-3 py-2 text-xs">{limpiarMotivo(g.motivo_anulacion || g.MotivoAnulacion)}</td>
                        <td className="px-3 py-2 text-right font-semibold text-red-600">{formatMoney(g._total)}</td>
                        <td className="px-3 py-2 text-right text-red-600">{formatMoney(g._adelanto)}</td>
                      </tr>
                    );
                  })}
                {tab === "grupales" && estadoReservaFiltro === "anulado" && grupalesFiltradas.length > 0 && (
                  <tr className="bg-white border-t-2 border-red-300">
                    <td colSpan={6} className="px-3 py-2 text-right font-bold text-red-700">TOTAL ANULADO:</td>
                    <td className="px-3 py-2 text-right font-bold text-red-700">{formatMoney(grupalesTotalMonto)}</td>
                    <td className="px-3 py-2 text-right font-bold text-red-700">{formatMoney(grupalesTotalAdelanto)}</td>
                  </tr>
                )}

                {/* INVENTARIO */}
                {tab === "inventario" &&
                  productosFiltrados.map((p, i) => {
                    const stock = Number(p.stock || p.Stock || 0);
                    return (
                      <tr key={p.ID || p.id || i} className={i % 2 === 0 ? "bg-white" : "bg-blue-50/30"}>
                        <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                        <td className="px-3 py-2 font-medium">{p.nombre || p.Nombre || "-"}</td>
                        <td className="px-3 py-2">{p.talla || p.Talla || "-"}</td>
                        <td className="px-3 py-2">{p.modelo || p.Modelo || "-"}</td>
                        <td className="px-3 py-2">{p.color || p.Color || "-"}</td>
                        <td className="px-3 py-2">{getNombreCategoria(p.categoria_id || p.CategoriaID)}</td>
                        <td className="px-3 py-2 text-center">
                          {stock === 0 ? (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">Agotado</span>
                          ) : stock <= 3 ? (
                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">Stock bajo</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">Disponible</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center font-bold">{stock}</td>
                        <td className="px-3 py-2 text-right">{formatMoney(p.precio_alquiler || p.PrecioAlquiler || p.precio_venta || p.PrecioVenta || 0)}</td>
                      </tr>
                    );
                  })}

                {/* CLIENTES */}
                {tab === "clientes" &&
                  clientesFiltrados.map((c, i) => (
                    <tr key={c.ID || c.id || i} className={i % 2 === 0 ? "bg-white" : "bg-blue-50/30"}>
                      <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                      <td className="px-3 py-2 font-medium">
                        {`${c.nombre || c.Nombre || ""} ${c.apellidos || c.Apellidos || ""}`.trim().toUpperCase()}
                      </td>
                      <td className="px-3 py-2">{c.dni || c.DNI || "-"}</td>
                      <td className="px-3 py-2">{c.telefono || c.Telefono || "-"}</td>
                      <td className="px-3 py-2">{c.correo || c.Correo || "-"}</td>
                      <td className="px-3 py-2">{formatFecha(c.CreatedAt || c.created_at)}</td>
                      <td className="px-3 py-2 text-center"><OrigenBadge origen={getOrigenCliente(c.ID || c.id)} /></td>
                    </tr>
                  ))}

                {/* EMPLEADOS */}
                {tab === "empleados" &&
                  empleadosFiltrados.map((e, i) => {
                    const est = (e.Estado || e.estado || "").toLowerCase();
                    return (
                      <tr key={e.ID || e.id || i} className={i % 2 === 0 ? "bg-white" : "bg-blue-50/30"}>
                        <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                        <td className="px-3 py-2 font-medium">
                          {`${e.Nombre || e.nombre || ""} ${e.Apellidos || e.apellidos || ""}`.trim()}
                        </td>
                        <td className="px-3 py-2">{e.DNI || e.dni || "-"}</td>
                        <td className="px-3 py-2">{e.Telefono || e.telefono || "-"}</td>
                        <td className="px-3 py-2">{e.Perfil || e.perfil || "-"}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`px-3 py-1 rounded text-xs font-bold ${
                            est === "activo"
                              ? "bg-green-50 text-green-700 border-l-4 border-green-500"
                              : "bg-red-50 text-red-700 border-l-4 border-red-500"
                          }`}>
                            {est.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                {/* CAJA */}
                {tab === "caja" &&
                  cajasFiltradas.map((c, i) => {
                    const emp = c.empleado || c.Empleado;
                    const nombreEmp = emp
                      ? `${emp.Nombre || emp.nombre || ""} ${emp.Apellidos || emp.apellidos || ""}`.trim()
                      : "-";
                    const estado = (c.estado || c.Estado || "").toLowerCase();
                    const dif = Number(c.diferencia_arqueo || c.DiferenciaArqueo || 0);
                    return (
                      <tr key={c.ID || c.id || i} className={i % 2 === 0 ? "bg-white" : "bg-blue-50/30"}>
                        <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                        <td className="px-3 py-2 font-medium">{nombreEmp}</td>
                        <td className="px-3 py-2 text-xs">{formatFechaHora(c.fecha_apertura || c.FechaApertura)}</td>
                        <td className="px-3 py-2 text-xs">{c.fecha_cierre || c.FechaCierre ? formatFechaHora(c.fecha_cierre || c.FechaCierre) : "-"}</td>
                        <td className="px-3 py-2 text-right">{formatMoney(c.saldo_inicial || c.SaldoInicial || 0)}</td>
                        <td className="px-3 py-2 text-right">{c.saldo_final != null ? formatMoney(c.saldo_final) : c.SaldoFinal != null ? formatMoney(c.SaldoFinal) : "-"}</td>
                        <td className="px-3 py-2 text-right text-blue-700 font-medium">{formatMoney(c.total_ventas || c.TotalVentas || 0)}</td>
                        <td className="px-3 py-2 text-right text-blue-700 font-medium">{formatMoney(c.total_reservas || c.TotalReservas || 0)}</td>
                        <td className="px-3 py-2 text-right">{formatMoney(c.total_efectivo || c.TotalEfectivo || 0)}</td>
                        <td className="px-3 py-2 text-right">{formatMoney(c.total_otros_medios || c.TotalOtrosMedios || 0)}</td>
                        <td className="px-3 py-2 text-center">
                          {estado === "cerrada" ? (
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                              dif === 0
                                ? "bg-green-100 text-green-700"
                                : dif < 0
                                  ? "bg-red-100 text-red-700"
                                  : "bg-blue-100 text-blue-700"
                            }`}>
                              {dif === 0 ? "Cuadre" : formatMoney(dif)}
                            </span>
                          ) : "-"}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                            estado === "abierta"
                              ? "bg-green-100 text-green-700 border border-green-300"
                              : "bg-gray-100 text-gray-700 border border-gray-300"
                          }`}>
                            {estado.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                {tab === "caja" && cajasFiltradas.length > 0 && (
                  <tr className="bg-white border-t-2 border-gray-300">
                    <td colSpan={6} className="px-3 py-2 text-right font-bold text-gray-700">TOTALES:</td>
                    <td className="px-3 py-2 text-right font-bold text-blue-700">{formatMoney(cajasTotalVentas)}</td>
                    <td className="px-3 py-2 text-right font-bold text-blue-700">{formatMoney(cajasTotalReservas)}</td>
                    <td className="px-3 py-2 text-right font-bold text-gray-900">{formatMoney(cajasTotalEfectivo)}</td>
                    <td colSpan={3}></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* ─── MODAL CATEGORIAS ─── */}
      {showCatModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowCatModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-blue-600" />
                Seleccionar Categoria
              </h3>
              <button onClick={() => setShowCatModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-3">
              {/* Todas las categorias */}
              <div className="mb-1">
                <div
                  onClick={() => seleccionarCategoria("", "Todas las categorias")}
                  className={`flex items-center px-2.5 py-1.5 rounded-lg border cursor-pointer transition-all duration-150 ${
                    !categoriaFiltro
                      ? "bg-blue-500 text-white border-blue-500 shadow-sm"
                      : "bg-white border-gray-200 hover:border-blue-400 hover:bg-blue-50"
                  }`}
                >
                  <span className={`text-xs font-medium ${!categoriaFiltro ? "text-white" : "text-gray-700"}`}>
                    Todas las categorias
                  </span>
                </div>
              </div>
              {categorias.length === 0
                ? <p className="text-xs text-gray-400 px-2 py-4">Cargando...</p>
                : renderCategoriasList(categorias)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-componentes ───

function SummaryCard({ label, value, border, isGreen, isAmber, isRed }) {
  const valueColor = isGreen ? "text-green-600" : isAmber ? "text-amber-600" : isRed ? "text-red-600" : "text-blue-700";
  return (
    <div className={`bg-white rounded-lg p-4 border-l-4 ${border} shadow-sm min-w-[140px]`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
    </div>
  );
}

function EstadoBadge({ estado }) {
  const map = {
    reservado: "bg-green-100 text-green-700 border border-green-300",
    listo: "bg-yellow-100 text-yellow-700 border border-yellow-300",
    entregado: "bg-blue-100 text-blue-700 border border-blue-300",
    devuelto: "bg-purple-100 text-purple-700 border border-purple-300",
    anulado: "bg-red-100 text-red-700 border border-red-300",
    cancelado: "bg-gray-100 text-gray-700 border border-gray-300",
  };
  const cls = map[estado] || "bg-gray-100 text-gray-700";
  return (
    <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${cls}`}>
      {estado.toUpperCase()}
    </span>
  );
}

function OrigenBadge({ origen }) {
  const map = {
    Venta: "bg-blue-50 text-blue-700 border border-blue-200",
    Reserva: "bg-amber-50 text-amber-700 border border-amber-200",
    Manual: "bg-gray-50 text-gray-600 border border-gray-200",
  };
  return (
    <span className={`px-2.5 py-0.5 rounded text-xs font-medium ${map[origen] || map.Manual}`}>
      {origen}
    </span>
  );
}
