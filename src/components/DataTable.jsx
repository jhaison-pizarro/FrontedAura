import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function DataTable({
  title = "Tabla",
  columns = [],
  data = [],
  pageSize = 10,
  enableSearch = true,
  showBackButton = false,
  onBack,
  externalSearch = null, // Opcional: búsqueda externa
  externalPage = null, // Opcional: página externa
  onPageChange = null, // Opcional: callback cuando cambia página
  loading = false, // Mostrar loader si está cargando
}) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // 🔄 Sincronizar búsqueda externa si se pasa
  useEffect(() => {
    if (externalSearch !== null) setSearch(externalSearch);
  }, [externalSearch]);

  // 🔄 Sincronizar página externa si se pasa
  useEffect(() => {
    if (externalPage !== null) setPage(externalPage);
  }, [externalPage]);

  // 🔍 Filtrar datos según búsqueda
  const filteredData = useMemo(() => {
    if (!search) return data;
    return data.filter((row) =>
      Object.values(row).join(" ").toLowerCase().includes(search.toLowerCase())
    );
  }, [data, search]);

  // 📑 Paginación
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = filteredData.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  // 🔄 Manejar cambio de página
  const handlePageChange = (newPage) => {
    setPage(newPage);
    if (onPageChange) onPageChange(newPage);
  };

  return (
    <div className="p-4 bg-white shadow-md rounded-lg">
      {/* Header con título y volver */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        {showBackButton && (
          <button
            onClick={() => (onBack ? onBack() : navigate("/"))}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            Volver
          </button>
        )}
      </div>

      {/* Buscador */}
      {enableSearch && (
        <input
          type="text"
          placeholder="Buscar..."
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
            if (onPageChange) onPageChange(1);
          }}
          className="mb-3 w-full p-2 border rounded-md"
        />
      )}

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full border border-gray-200">
          <thead>
            <tr className="bg-gray-100">
              {columns.map((col, idx) => (
                <th key={idx} className="p-2 border-b text-left">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="p-4 text-center text-gray-500"
                >
                  Cargando datos...
                </td>
              </tr>
            ) : paginatedData.length > 0 ? (
              paginatedData.map((row, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-gray-50">
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} className="p-2 border-b">
                      {col.accessor ? row[col.accessor] : col.cell?.(row)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="p-4 text-center text-gray-500"
                >
                  No se encontraron datos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Controles de paginación */}
      <div className="flex justify-between items-center mt-4">
        <p className="text-sm text-gray-500">
          Página {page} de {totalPages || 1}
        </p>
        <div className="space-x-2">
          <button
            onClick={() => handlePageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
          >
            Anterior
          </button>
          <button
            onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
            disabled={page === totalPages || totalPages === 0}
            className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}
