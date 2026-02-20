import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  FileText,
  Download,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { fetchAuth } from "../funciones/auth";
import { API_BASE_URL } from "../config";

const ITEMS_POR_PAGINA = 15;

export default function Reportes() {
  // Estados principales
  const [loading, setLoading] = useState(false);
  const [tipoReporte, setTipoReporte] = useState("ventas");
  const [paginaActual, setPaginaActual] = useState(1);

  // Filtros de fecha
  const [fechaDesde, setFechaDesde] = useState(() => {
    const h = new Date();
    h.setMonth(h.getMonth() - 1);
    return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}-${String(h.getDate()).padStart(2, "0")}`;
  });

  const [fechaHasta, setFechaHasta] = useState(() => {
    const h = new Date();
    return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}-${String(h.getDate()).padStart(2, "0")}`;
  });

  // Datos del reporte
  const [datosReporte, setDatosReporte] = useState([]);
  const [resumen, setResumen] = useState({});
  const [datosCargados, setDatosCargados] = useState(false);

  // Cargar reporte al cambiar fechas o tipo
  useEffect(() => {
    const timer = setTimeout(() => {
      if (datosCargados || tipoReporte) {
        buscarReporte();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [fechaDesde, fechaHasta, tipoReporte]);

  // Función para buscar reporte
  const buscarReporte = useCallback(async () => {
    setLoading(true);
    setDatosCargados(false);
    setPaginaActual(1);

    try {
      let endpoint = "";
      let datos = [];
      let resumenData = {};

      const params = new URLSearchParams({
        fecha_inicio: fechaDesde,
        fecha_fin: fechaHasta,
      });

      switch (tipoReporte) {
        case "ventas":
          endpoint = `${API_BASE_URL}/reportes/ventas?${params}`;
          break;
        case "reservas":
          endpoint = `${API_BASE_URL}/reportes/reservas?${params}`;
          break;
        case "productos":
          endpoint = `${API_BASE_URL}/reportes/productos-mas-vendidos?${params}`;
          break;
        case "metodos":
          endpoint = `${API_BASE_URL}/reportes/ingresos-por-metodo?${params}`;
          break;
        default:
          setLoading(false);
          return;
      }

      const res = await fetchAuth(endpoint);
      if (!res.ok) {
        toast.error("Error al cargar el reporte");
        setDatosReporte([]);
        setResumen({});
        setLoading(false);
        return;
      }

      const json = await res.json();
      datos = Array.isArray(json) ? json : json.datos || json.data || [];

      // Procesar datos según tipo de reporte
      if (tipoReporte === "ventas") {
        resumenData = {
          totalRegistros: datos.length,
          montoTotal: datos.reduce((s, d) => s + (parseFloat(d.total) || 0), 0),
        };
      } else if (tipoReporte === "reservas") {
        resumenData = {
          totalRegistros: datos.length,
          montoTotal: datos.reduce((s, d) => s + (parseFloat(d.total) || 0), 0),
          adelantoTotal: datos.reduce((s, d) => s + (parseFloat(d.adelanto) || 0), 0),
          saldoPendiente: datos.reduce((s, d) => s + ((parseFloat(d.total) || 0) - (parseFloat(d.adelanto) || 0)), 0),
        };
      } else if (tipoReporte === "productos") {
        resumenData = {
          totalProductos: datos.length,
          totalVendido: datos.reduce((s, d) => s + (parseFloat(d.total_generado) || 0), 0),
          cantidadTotal: datos.reduce((s, d) => s + (parseInt(d.cantidad_vendida) || 0), 0),
        };
      } else if (tipoReporte === "metodos") {
        resumenData = {
          totalMetodos: datos.length,
          totalTransacciones: datos.reduce((s, d) => s + (parseInt(d.cantidad_transacciones) || 0), 0),
          totalIngreso: datos.reduce((s, d) => s + (parseFloat(d.total_generado) || 0), 0),
        };
      }

      setDatosReporte(datos);
      setResumen(resumenData);
      setDatosCargados(true);
    } catch (error) {
      console.error("Error al obtener reporte:", error);
      toast.error("Error al cargar el reporte");
      setDatosReporte([]);
      setResumen({});
    } finally {
      setLoading(false);
    }
  }, [fechaDesde, fechaHasta, tipoReporte]);

  // Función para limpiar filtros
  const limpiarFiltros = () => {
    const h = new Date();
    h.setMonth(h.getMonth() - 1);
    setFechaDesde(`${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}-${String(h.getDate()).padStart(2, "0")}`);

    const ahora = new Date();
    setFechaHasta(`${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}`);
    setPaginaActual(1);
  };

  // Función para exportar a CSV
  const exportarCSV = () => {
    if (datosReporte.length === 0) {
      toast.error("No hay datos para exportar");
      return;
    }

    let csv = "";

    if (tipoReporte === "ventas") {
      csv = "Fecha,Cliente,Total,Método de Pago\n";
      datosReporte.forEach(row => {
        csv += `"${row.fecha || ''}","${row.cliente || ''}",${row.total || 0},"${row.metodo_pago || ''}"\n`;
      });
    } else if (tipoReporte === "reservas") {
      csv = "Fecha Evento,Cliente,Estado,Total,Adelanto,Pendiente\n";
      datosReporte.forEach(row => {
        const pendiente = (parseFloat(row.total) || 0) - (parseFloat(row.adelanto) || 0);
        csv += `"${row.fecha_evento || ''}","${row.cliente || ''}","${row.estado || ''}",${row.total || 0},${row.adelanto || 0},${pendiente}\n`;
      });
    } else if (tipoReporte === "productos") {
      csv = "Producto,Cantidad Vendida,Total Generado\n";
      datosReporte.forEach(row => {
        csv += `"${row.nombre || ''}",${row.cantidad_vendida || 0},${row.total_generado || 0}\n`;
      });
    } else if (tipoReporte === "metodos") {
      csv = "Método de Pago,Cantidad de Transacciones,Total Generado\n";
      datosReporte.forEach(row => {
        csv += `"${row.nombre || ''}",${row.cantidad_transacciones || 0},${row.total_generado || 0}\n`;
      });
    }

    // Crear blob y descargar
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `reporte-${tipoReporte}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Reporte exportado en CSV");
  };

  // Paginación
  const totalPaginas = Math.ceil(datosReporte.length / ITEMS_POR_PAGINA);
  const datosPaginados = datosReporte.slice(
    (paginaActual - 1) * ITEMS_POR_PAGINA,
    paginaActual * ITEMS_POR_PAGINA
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-8 h-8 text-yellow-600" />
          <h1 className="text-3xl font-bold text-gray-800">Reportes</h1>
        </div>
      </div>

      {/* Panel de Filtros */}
      <div className="bg-white rounded-xl shadow-md p-6 space-y-4 border-l-4 border-yellow-600">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-yellow-600" />
          <h2 className="text-lg font-bold text-gray-800">Filtros</h2>
        </div>

        {/* Filtros de fecha */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha Inicio
            </label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha Fin
            </label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Botones */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={buscarReporte}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 font-medium"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            {loading ? "Cargando..." : "Generar Reporte"}
          </button>
          <button
            onClick={limpiarFiltros}
            className="flex items-center justify-center gap-2 px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            <Trash2 size={16} />
            Limpiar Filtros
          </button>
        </div>
      </div>

      {/* Tabs de Reportes */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="flex border-b">
          {[
            { id: "ventas", label: "Ventas", icon: "🛒" },
            { id: "reservas", label: "Reservas", icon: "📅" },
            { id: "productos", label: "Productos Más Vendidos", icon: "📊" },
            { id: "metodos", label: "Ingresos por Método de Pago", icon: "💰" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setTipoReporte(tab.id);
                setPaginaActual(1);
              }}
              className={`flex-1 px-4 py-3 text-center font-medium transition-colors ${
                tipoReporte === tab.id
                  ? "bg-yellow-600 text-white"
                  : "bg-gray-50 text-gray-700 hover:bg-gray-100"
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Contenido del Reporte */}
        {datosCargados && (
          <div className="p-6 space-y-4">
            {/* Tarjetas de Resumen */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border-l-4 border-blue-500">
                <p className="text-xs text-gray-600 mb-1">
                  {tipoReporte === "ventas" && "Total de Ventas"}
                  {tipoReporte === "reservas" && "Total de Reservas"}
                  {tipoReporte === "productos" && "Productos Vendidos"}
                  {tipoReporte === "metodos" && "Métodos de Pago"}
                </p>
                <p className="text-2xl font-bold text-blue-700">{resumen.totalRegistros || 0}</p>
              </div>

              {tipoReporte === "ventas" && (
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border-l-4 border-green-500">
                  <p className="text-xs text-gray-600 mb-1">Monto Total</p>
                  <p className="text-2xl font-bold text-green-700">
                    S/ {(resumen.montoTotal || 0).toFixed(2)}
                  </p>
                </div>
              )}

              {tipoReporte === "reservas" && (
                <>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border-l-4 border-green-500">
                    <p className="text-xs text-gray-600 mb-1">Total Reservado</p>
                    <p className="text-2xl font-bold text-green-700">
                      S/ {(resumen.montoTotal || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border-l-4 border-orange-500">
                    <p className="text-xs text-gray-600 mb-1">Total Adelantado</p>
                    <p className="text-2xl font-bold text-orange-700">
                      S/ {(resumen.adelantoTotal || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border-l-4 border-red-500">
                    <p className="text-xs text-gray-600 mb-1">Pendiente de Cobro</p>
                    <p className="text-2xl font-bold text-red-700">
                      S/ {(resumen.saldoPendiente || 0).toFixed(2)}
                    </p>
                  </div>
                </>
              )}

              {tipoReporte === "productos" && (
                <>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border-l-4 border-purple-500">
                    <p className="text-xs text-gray-600 mb-1">Cantidad Total</p>
                    <p className="text-2xl font-bold text-purple-700">{resumen.cantidadTotal || 0}</p>
                  </div>
                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-lg border-l-4 border-indigo-500">
                    <p className="text-xs text-gray-600 mb-1">Total Generado</p>
                    <p className="text-2xl font-bold text-indigo-700">
                      S/ {(resumen.totalVendido || 0).toFixed(2)}
                    </p>
                  </div>
                </>
              )}

              {tipoReporte === "metodos" && (
                <>
                  <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-4 rounded-lg border-l-4 border-teal-500">
                    <p className="text-xs text-gray-600 mb-1">Total Transacciones</p>
                    <p className="text-2xl font-bold text-teal-700">{resumen.totalTransacciones || 0}</p>
                  </div>
                  <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 p-4 rounded-lg border-l-4 border-cyan-500">
                    <p className="text-xs text-gray-600 mb-1">Total Ingreso</p>
                    <p className="text-2xl font-bold text-cyan-700">
                      S/ {(resumen.totalIngreso || 0).toFixed(2)}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Botón de Exportar */}
            <div className="flex justify-end">
              <button
                onClick={exportarCSV}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors font-medium"
              >
                <Download size={16} />
                Exportar CSV
              </button>
            </div>

            {/* Tabla de Datos */}
            {datosReporte.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No hay datos disponibles para el período seleccionado</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gradient-to-r from-yellow-600 to-yellow-700 text-white">
                      <tr>
                        {tipoReporte === "ventas" && (
                          <>
                            <th className="px-4 py-3 text-left font-semibold">Fecha</th>
                            <th className="px-4 py-3 text-left font-semibold">Cliente</th>
                            <th className="px-4 py-3 text-left font-semibold">Método de Pago</th>
                            <th className="px-4 py-3 text-right font-semibold">Total</th>
                          </>
                        )}
                        {tipoReporte === "reservas" && (
                          <>
                            <th className="px-4 py-3 text-left font-semibold">Fecha Evento</th>
                            <th className="px-4 py-3 text-left font-semibold">Cliente</th>
                            <th className="px-4 py-3 text-left font-semibold">Estado</th>
                            <th className="px-4 py-3 text-right font-semibold">Total</th>
                            <th className="px-4 py-3 text-right font-semibold">Adelanto</th>
                            <th className="px-4 py-3 text-right font-semibold">Pendiente</th>
                          </>
                        )}
                        {tipoReporte === "productos" && (
                          <>
                            <th className="px-4 py-3 text-left font-semibold">Producto</th>
                            <th className="px-4 py-3 text-right font-semibold">Cantidad Vendida</th>
                            <th className="px-4 py-3 text-right font-semibold">Total Generado</th>
                          </>
                        )}
                        {tipoReporte === "metodos" && (
                          <>
                            <th className="px-4 py-3 text-left font-semibold">Método de Pago</th>
                            <th className="px-4 py-3 text-right font-semibold">Transacciones</th>
                            <th className="px-4 py-3 text-right font-semibold">Total Generado</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {datosPaginados.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                          {tipoReporte === "ventas" && (
                            <>
                              <td className="px-4 py-3">
                                {row.fecha ? new Date(row.fecha).toLocaleDateString() : "-"}
                              </td>
                              <td className="px-4 py-3">{row.cliente || "-"}</td>
                              <td className="px-4 py-3">
                                <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                                  {row.metodo_pago || "N/A"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right font-semibold text-green-700">
                                S/ {(parseFloat(row.total) || 0).toFixed(2)}
                              </td>
                            </>
                          )}
                          {tipoReporte === "reservas" && (
                            <>
                              <td className="px-4 py-3">
                                {row.fecha_evento ? new Date(row.fecha_evento).toLocaleDateString() : "-"}
                              </td>
                              <td className="px-4 py-3">{row.cliente || "-"}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                  row.estado?.toLowerCase() === "confirmado" ? "bg-green-100 text-green-700" :
                                  row.estado?.toLowerCase() === "cancelado" ? "bg-red-100 text-red-700" :
                                  "bg-yellow-100 text-yellow-700"
                                }`}>
                                  {row.estado || "Pendiente"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right font-semibold">
                                S/ {(parseFloat(row.total) || 0).toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-right text-blue-700">
                                S/ {(parseFloat(row.adelanto) || 0).toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-right text-orange-700 font-semibold">
                                S/ {((parseFloat(row.total) || 0) - (parseFloat(row.adelanto) || 0)).toFixed(2)}
                              </td>
                            </>
                          )}
                          {tipoReporte === "productos" && (
                            <>
                              <td className="px-4 py-3 font-medium">{row.nombre || "-"}</td>
                              <td className="px-4 py-3 text-right">{row.cantidad_vendida || 0}</td>
                              <td className="px-4 py-3 text-right font-semibold text-green-700">
                                S/ {(parseFloat(row.total_generado) || 0).toFixed(2)}
                              </td>
                            </>
                          )}
                          {tipoReporte === "metodos" && (
                            <>
                              <td className="px-4 py-3 font-medium">{row.nombre || "-"}</td>
                              <td className="px-4 py-3 text-right">{row.cantidad_transacciones || 0}</td>
                              <td className="px-4 py-3 text-right font-semibold text-green-700">
                                S/ {(parseFloat(row.total_generado) || 0).toFixed(2)}
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>

                    {/* Footer con totales */}
                    {(tipoReporte === "ventas" || tipoReporte === "reservas") && (
                      <tfoot className="bg-yellow-50 border-t-2 border-yellow-600 font-bold text-sm">
                        {tipoReporte === "ventas" && (
                          <tr>
                            <td colSpan={3} className="px-4 py-3 text-right">
                              TOTAL:
                            </td>
                            <td className="px-4 py-3 text-right text-green-700">
                              S/ {(resumen.montoTotal || 0).toFixed(2)}
                            </td>
                          </tr>
                        )}
                        {tipoReporte === "reservas" && (
                          <tr>
                            <td colSpan={3} className="px-4 py-3 text-right">
                              TOTALES:
                            </td>
                            <td className="px-4 py-3 text-right text-green-700">
                              S/ {(resumen.montoTotal || 0).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right text-blue-700">
                              S/ {(resumen.adelantoTotal || 0).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right text-orange-700">
                              S/ {(resumen.saldoPendiente || 0).toFixed(2)}
                            </td>
                          </tr>
                        )}
                      </tfoot>
                    )}
                  </table>
                </div>

                {/* Paginación */}
                {totalPaginas > 1 && (
                  <div className="flex items-center justify-between p-3 border-t bg-gray-50 rounded-b-lg">
                    <p className="text-xs text-gray-600">
                      Mostrando {(paginaActual - 1) * ITEMS_POR_PAGINA + 1} -{" "}
                      {Math.min(paginaActual * ITEMS_POR_PAGINA, datosReporte.length)} de{" "}
                      {datosReporte.length}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPaginaActual(Math.max(1, paginaActual - 1))}
                        disabled={paginaActual === 1}
                        className="p-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                          const pageNum = i + 1;
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setPaginaActual(pageNum)}
                              className={`px-2 py-1 rounded text-xs ${
                                paginaActual === pageNum
                                  ? "bg-yellow-600 text-white"
                                  : "border border-gray-300 hover:bg-gray-100"
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        onClick={() => setPaginaActual(Math.min(totalPaginas, paginaActual + 1))}
                        disabled={paginaActual === totalPaginas}
                        className="p-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Mensaje cuando no hay datos cargados */}
        {!datosCargados && !loading && (
          <div className="p-12 text-center text-gray-500">
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg">Selecciona los filtros y haz clic en "Generar Reporte"</p>
          </div>
        )}

        {/* Estado de carga */}
        {loading && (
          <div className="p-12 text-center">
            <div className="inline-block">
              <div className="w-8 h-8 border-4 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="mt-4 text-gray-600">Cargando reporte...</p>
          </div>
        )}
      </div>
    </div>
  );
}
