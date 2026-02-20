import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  FileText,
  Download,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { fetchAuth } from "../funciones/auth";
import jsPDF from "jspdf";
import { fechaLocalStr } from "../funciones/funciones";
import { API_BASE_URL } from "../config";
const ITEMS_POR_PAGINA = 15;

export default function Reportes() {
  const [loading, setLoading] = useState(false);
  const [tipoReporte, setTipoReporte] = useState("ventas");
  const [mostrarFiltros, setMostrarFiltros] = useState(true);
  const [paginaActual, setPaginaActual] = useState(1);
  const [datosCargados, setDatosCargados] = useState(false);

  const [fechaDesde, setFechaDesde] = useState(() => {
    const h = new Date();
    return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}-${String(h.getDate()).padStart(2, "0")}`;
  });
  const [fechaHasta, setFechaHasta] = useState(() => {
    const h = new Date();
    return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}-${String(h.getDate()).padStart(2, "0")}`;
  });
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const [catExpanded, setCatExpanded] = useState(new Set());
  const [refDataReady, setRefDataReady] = useState(false);

  // Datos de referencia (se cargan una sola vez)
  const [clientes, setClientes] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [categorias, setCategorias] = useState([]);

  // Datos del reporte activo (se cargan bajo demanda)
  const [datosReporte, setDatosReporte] = useState([]);
  const [resumen, setResumen] = useState({});

  // Vista de eliminados (toggle)
  const [verEliminados, setVerEliminados] = useState(false);
  const [datosEliminados, setDatosEliminados] = useState([]);

  // Cargar datos de referencia al iniciar
  useEffect(() => {
    cargarDatosReferencia();
  }, []);

  // ==================== DATOS DE REFERENCIA ====================
  async function cargarDatosReferencia() {
    try {
      let clientesData = [];
      let empleadosData = [];
      let categoriasData = [];

      try {
        const res = await fetchAuth(`${API_BASE_URL}/clientes`);
        if (res.ok) {
          const json = await res.json();
          clientesData = Array.isArray(json)
            ? json
            : json.clientes || json.data || [];
        }
      } catch (e) {
        console.warn("Error cargando clientes:", e);
      }

      try {
        const res = await fetchAuth(`${API_BASE_URL}/empleados`);
        if (res.ok) {
          const json = await res.json();
          empleadosData = Array.isArray(json)
            ? json
            : json.empleados || json.data || [];
        }
      } catch (e) {
        console.warn("Error cargando empleados:", e);
      }

      try {
        const res = await fetchAuth(`${API_BASE_URL}/categorias`);
        if (res.ok) {
          const json = await res.json();
          categoriasData = Array.isArray(json)
            ? json
            : json.categorias || json.data || [];
        }
      } catch (e) {
        console.warn("Error cargando categorias:", e);
      }












  async function fetchEliminados() {
    setLoading(true);
    setPaginaActual(1);

    const clientesMap = {};
    (clientes || []).forEach((c) => {
      if (!c) return;
      const id = c.ID || c.id;
      if (id) clientesMap[id] = c;
    });

    const extraerFechaStr = (f) => {
      if (!f) return "";
      try {
        const d = new Date(f);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      } catch { return ""; }
    };

    try {
      let endpoint = "";
      if (tipoReporte === "ventas") endpoint = `${API_BASE_URL}/ventas/eliminados`;
      else if (tipoReporte === "reservas_ind") endpoint = `${API_BASE_URL}/reservas/eliminados`;
      else if (tipoReporte === "reservas_grup") endpoint = `${API_BASE_URL}/reservas-grupo/eliminados`;
      else { setLoading(false); return; }

      const res = await fetchAuth(endpoint);
      if (!res.ok) { setDatosEliminados([]); setLoading(false); return; }
      let rawData = await res.json();
      rawData = Array.isArray(rawData) ? rawData : [];

      let datos = [];

      if (tipoReporte === "ventas") {
        datos = rawData.filter((v) => {
          const deletedAt = v.DeletedAt || v.deleted_at;
          if (!deletedAt || deletedAt === "0001-01-01T00:00:00Z") return false;
          const fechaStr = extraerFechaStr(deletedAt);
          return fechaStr >= fechaDesde && fechaStr <= fechaHasta;
        }).map((v) => {
          const clienteObj = v.cliente || v.Cliente || clientesMap[v.id_cliente || v.IdCliente || v.cliente_id] || {};
          const clienteNombre = `${clienteObj.nombre || clienteObj.Nombre || ""} ${clienteObj.apellidos || clienteObj.Apellidos || ""}`.trim() || "Sin cliente";
          const clienteDni = clienteObj.dni || clienteObj.DNI || "N/A";
          return {
            id: v.ID || v.id,
            fecha: v.CreatedAt || v.created_at,
            cliente: clienteNombre,
            dniCliente: clienteDni,
            metodoPago: "-",
            total: parseFloat(v.total || v.Total || 0),
            motivo: v.motivo_anulacion || v.MotivoAnulacion || "Sin motivo",
            eliminadoPor: v.anulado_por || v.AnuladoPor || "-",
            fechaEliminacion: v.DeletedAt || v.deleted_at,
          };
        });
      } else if (tipoReporte === "reservas_ind") {
        datos = rawData.filter((r) => {
          const deletedAt = r.DeletedAt || r.deleted_at;
          if (!deletedAt || deletedAt === "0001-01-01T00:00:00Z") return false;
          const idGrupo = r.id_grupo || r.IdGrupo || 0;
          if (idGrupo > 0) return false;
          const fechaStr = extraerFechaStr(deletedAt);
          return fechaStr >= fechaDesde && fechaStr <= fechaHasta;
        }).map((r) => {
          const clienteObj = r.cliente || r.Cliente || clientesMap[r.id_cliente || r.IdCliente] || {};
          const clienteNombre = `${clienteObj.nombre || clienteObj.Nombre || ""} ${clienteObj.apellidos || clienteObj.Apellidos || ""}`.trim() || "Sin cliente";
          const clienteDni = clienteObj.dni || clienteObj.DNI || "N/A";
          return {
            id: r.ID || r.id,
            fecha: r.fecha_evento || r.FechaEvento || r.CreatedAt || r.created_at,
            cliente: clienteNombre,
            dniCliente: clienteDni,
            estado: (r.estado || r.Estado || "eliminado").toLowerCase(),
            total: parseFloat(r.total || r.Total || 0),
            adelanto: parseFloat(r.adelanto || r.Adelanto || 0),
            motivo: r.motivo_anulacion || r.MotivoAnulacion || "Sin motivo",
            eliminadoPor: r.anulado_por || r.AnuladoPor || "-",
            fechaEliminacion: r.DeletedAt || r.deleted_at,
          };
        });
      } else if (tipoReporte === "reservas_grup") {
        datos = rawData.filter((g) => {
          const deletedAt = g.DeletedAt || g.deleted_at;
          if (!deletedAt || deletedAt === "0001-01-01T00:00:00Z") return false;
          const fechaStr = extraerFechaStr(deletedAt);
          return fechaStr >= fechaDesde && fechaStr <= fechaHasta;
        }).map((g) => {
          const responsable = g.responsable || g.Responsable || {};
          const responsableNombre = `${responsable.nombre || responsable.Nombre || ""} ${responsable.apellidos || responsable.Apellidos || ""}`.trim() || "N/A";
          return {
            id: g.ID || g.id,
            fecha: g.fecha_evento || g.FechaEvento || g.CreatedAt || g.created_at,
            nombreGrupo: g.nombre_grupo || g.NombreGrupo || "Sin nombre",
            responsable: responsableNombre,
            estado: (g.estado || g.Estado || "eliminado").toLowerCase(),
            total: 0,
            adelanto: 0,
            cantidadMiembros: (g.miembros || []).length,
            motivo: g.motivo_anulacion || g.MotivoAnulacion || "Sin motivo",
            eliminadoPor: g.anulado_por || g.AnuladoPor || "-",
            fechaEliminacion: g.DeletedAt || g.deleted_at,
          };
        });
      }

      datos.sort((a, b) => new Date(b.fechaEliminacion) - new Date(a.fechaEliminacion));
      setDatosEliminados(datos);
    } catch (error) {
      console.error("Error al obtener eliminados:", error);
      toast.error("Error al cargar registros eliminados");
      setDatosEliminados([]);
    } finally {
      setLoading(false);
    }
  }

  // ==================== BUSCAR REPORTE ====================
  const buscarReporte = useCallback(async () => {
    setLoading(true);
    setDatosCargados(false);






























































































































































































































































































































































































































































































































































      buscarReporte();
    }, 500);
    return () => clearTimeout(timer);
  }, [buscarReporte, refDataReady]);

  // ==================== PAGINACION ====================
  const datosActivos = verEliminados ? datosEliminados : datosReporte;
  const resumenActivo = verEliminados
    ? {
        totalRegistros: datosEliminados.length,
        montoTotal: datosEliminados.reduce((s, d) => s + (d.total || 0), 0),
        adelantoTotal: datosEliminados.reduce((s, d) => s + (d.adelanto || 0), 0),
        saldoPendiente: datosEliminados.reduce((s, d) => s + ((d.total || 0) - (d.adelanto || 0)), 0),
      }
    : resumen;
  const totalPaginas = Math.ceil(datosActivos.length / ITEMS_POR_PAGINA);
  const datosPaginados = datosActivos.slice(
    (paginaActual - 1) * ITEMS_POR_PAGINA,
    paginaActual * ITEMS_POR_PAGINA,
  );
    setDatosEliminados([]);
  // Limpiar datos al cambiar de tab
  function cambiarTab(nuevoTipo) {
    setTipoReporte(nuevoTipo);
    setFiltroEstado("");
    setFiltroCategoria("");
    setPaginaActual(1);
    setVerEliminados(false);
    setDatosEliminados([]);
  }

  // ==================== EXPORTAR PDF ====================
  function exportarPDF() {
































          `S/ ${(v.total || 0).toFixed(2)}`,
        ]);
        totalesRow = [
          "",
          "",
          "",
          "",
          "TOTAL:",
          `S/ ${(resumen.montoTotal || 0).toFixed(2)}`,
        ];
        break;
      case "reservas_ind":
        columnas = [
          "#",
          "Cliente",
          "DNI",
          "Fecha Evento",
          "Estado",
          "Total",
          "Adelanto",
        ];
        filas = datosReporte.map((r, i) => [
          i + 1,
          r.cliente,
          r.dniCliente,
          formatFechaPDF(r.fecha),
          (r.estado || "pendiente").toUpperCase(),
          `S/ ${(r.total || 0).toFixed(2)}`,
          `S/ ${(r.adelanto || 0).toFixed(2)}`,
        ]);
        totalesRow = [
          "",
          "",
          "",
          "",
          "TOTALES:",
          `S/ ${(resumen.montoTotal || 0).toFixed(2)}`,
          `S/ ${(resumen.adelantoTotal || 0).toFixed(2)}`,
        ];
        break;
      case "reservas_grup":
        columnas = [
          "#",
          "Grupo",
          "Responsable",
          "Fecha Evento",
          "Miembros",
          "Estado",
          "Total",
          "Adelanto",























































































































































































































































































































































































































































































































































              {/* Boton Actualizar */}
              <div>
                <button
                  onClick={buscarReporte}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-300 disabled:opacity-50"
                >
                  <RefreshCw
                    size={16}
                    className={loading ? "animate-spin" : ""}
                  />
                  {loading ? "Cargando..." : "Actualizar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Contenido del reporte */}
      <>
        {/* Tarjetas Resumen */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-white p-3 rounded-lg shadow-md border-l-4 border-blue-500">
            <p className="text-xs text-gray-500">Total Registros</p>
            <p className="text-xl font-bold">{resumen.totalRegistros || 0}</p>
          </div>
      {/* Contenido del reporte */}
      <>
        {/* Tarjetas Resumen */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-white p-3 rounded-lg shadow-md border-l-4 border-blue-500">
            <p className="text-xs text-gray-500">Total Registros</p>
            <p className="text-xl font-bold">{resumen.totalRegistros || 0}</p>
          </div>

          {tipoReporte === "ventas" && (
            <div className="bg-white p-3 rounded-lg shadow-md border-l-4 border-green-500">
              <p className="text-xs text-gray-500">Monto Total</p>
              <p className="text-xl font-bold text-green-600">
                S/ {(resumen.montoTotal || 0).toFixed(2)}
              </p>
            </div>
          )}

          {(tipoReporte === "reservas_ind" ||
            tipoReporte === "reservas_grup") && (
            <>
              <div className="bg-white p-3 rounded-lg shadow-md border-l-4 border-green-500">
                <p className="text-xs text-gray-500">Total Monto</p>
                <p className="text-xl font-bold">
                  S/ {(resumen.montoTotal || 0).toFixed(2)}
                </p>
              </div>
              <div className="bg-white p-3 rounded-lg shadow-md border-l-4 border-orange-500">
                <p className="text-xs text-gray-500">Total Adelantos</p>
                <p className="text-xl font-bold text-orange-600">
                  S/ {(resumen.adelantoTotal || 0).toFixed(2)}
                </p>
              </div>
              <div className="bg-white p-3 rounded-lg shadow-md border-l-4 border-red-500">
                <p className="text-xs text-gray-500">Saldo Pendiente</p>
                <p className="text-xl font-bold text-red-600">
                  S/ {(resumen.saldoPendiente || 0).toFixed(2)}
                </p>
              </div>
            </>
          )}

          {tipoReporte === "productos" && (
            <>
              <div className="bg-white p-3 rounded-lg shadow-md border-l-4 border-green-500">
                <p className="text-xs text-gray-500">Stock Total</p>
                <p className="text-xl font-bold">
                  {resumen.stockTotal || 0} uds
                </p>
              </div>
              <div className="bg-white p-3 rounded-lg shadow-md border-l-4 border-yellow-500">
                <p className="text-xs text-gray-500">Stock Bajo</p>
                <p className="text-xl font-bold text-yellow-600">
                  {resumen.stockBajo || 0}
                </p>
              </div>
              <div className="bg-white p-3 rounded-lg shadow-md border-l-4 border-red-500">
                <p className="text-xs text-gray-500">Agotados</p>
                <p className="text-xl font-bold text-red-600">
                  {resumen.agotados || 0}
                </p>
              </div>
            </>
          )}

          {tipoReporte === "empleados" && (
            <>
              <div className="bg-white p-3 rounded-lg shadow-md border-l-4 border-green-500">
                <p className="text-xs text-gray-500">Activos</p>
                <p className="text-xl font-bold text-green-600">
                  {resumen.activos || 0}
                </p>
              </div>
              <div className="bg-white p-3 rounded-lg shadow-md border-l-4 border-red-500">
                <p className="text-xs text-gray-500">Inactivos</p>
                <p className="text-xl font-bold text-red-600">
                  {resumen.inactivos || 0}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Toggle: registros activos / eliminados */}
        {(tipoReporte === "ventas" || tipoReporte === "reservas_ind" || tipoReporte === "reservas_grup") && (
          <div className="flex justify-end mb-1">
            <button
              onClick={() => {
                if (!verEliminados) {
                  fetchEliminados();
















































































































































































































































































































                  {/* Footer totales */}
                  {(tipoReporte === "ventas" ||
                    tipoReporte === "reservas_ind" ||
                    tipoReporte === "reservas_grup") && (
                    <tfoot className="bg-blue-100 font-bold text-sm">
                      {tipoReporte === "ventas" && (
                        <tr>
                          <td colSpan={5} className="p-2 text-right">
                            TOTAL:
                  {(tipoReporte === "ventas" ||
                    tipoReporte === "reservas_ind" ||
                    tipoReporte === "reservas_grup") && (
                    <tfoot className="bg-blue-100 font-bold text-sm">
                      {tipoReporte === "ventas" && (
                        <tr>
                          <td colSpan={5} className="p-2 text-right">
                            TOTAL:
                          </td>
                          <td className="p-2 text-right">
                            S/ {(resumen.montoTotal || 0).toFixed(2)}
                          </td>
                        </tr>
                      )}
                      {tipoReporte === "reservas_ind" && (
                        <tr>
                          <td colSpan={5} className="p-2 text-right">
                            TOTALES:
                          </td>
                          <td className="p-2 text-right">
                            S/ {(resumen.montoTotal || 0).toFixed(2)}
                          </td>
                          <td className="p-2 text-right">
                            S/ {(resumen.adelantoTotal || 0).toFixed(2)}
                          </td>
                        </tr>
                      )}
                      {tipoReporte === "reservas_grup" && (
                        <tr>
                          <td colSpan={6} className="p-2 text-right">
                            TOTALES:
                          </td>
                          <td className="p-2 text-right">
                            S/ {(resumen.montoTotal || 0).toFixed(2)}
                          </td>
                          <td className="p-2 text-right">
                            S/ {(resumen.adelantoTotal || 0).toFixed(2)}
                          </td>
                        </tr>
                      )}
                    </tfoot>
                  )}
                </table>
              </div>

              {/* Paginacion */}
              {totalPaginas > 1 && (
                <div className="flex items-center justify-between flex-wrap gap-2 p-3 border-t bg-gray-50">
                  <p className="text-xs text-gray-500">
                    Mostrando {(paginaActual - 1) * ITEMS_POR_PAGINA + 1} -{" "}



































































































































































































                                : "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );