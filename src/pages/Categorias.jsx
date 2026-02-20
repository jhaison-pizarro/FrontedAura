import React, { useEffect, useState, useCallback } from "react";
import {
  Pencil,
  Trash2,
  ChevronRight,
  ChevronDown,
  FolderTree,
} from "lucide-react";
import { fetchAuth } from "../funciones/auth";
import { toast } from "sonner";
import VoiceMicButton from "../components/VoiceMicButton";
import { API_BASE_URL } from "../config";

export default function Categorias() {
  const [categorias, setCategorias] = useState([]);
  const [editId, setEditId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    padre_id: "",
  });
  const [errors, setErrors] = useState({});
  const [collapsed, setCollapsed] = useState(new Set());
  const [voiceConfirm, setVoiceConfirm] = useState(false);
  const [padreDropdownOpen, setPadreDropdownOpen] = useState(false);
  const [padreExpanded, setPadreExpanded] = useState(new Set());

  // Escuchar evento de voz para llenar el formulario
  useEffect(() => {
    const handleVoiceFill = (e) => {
      const data = e.detail;
      if (!data) return;
      setFormData((prev) => ({
        ...prev,
        nombre: data.nombre || prev.nombre,
        descripcion: data.descripcion || prev.descripcion,
      }));
      setErrors({});
      setVoiceConfirm(true);
    };
    window.addEventListener("voice:fill-category-form", handleVoiceFill);
    return () => window.removeEventListener("voice:fill-category-form", handleVoiceFill);
  }, []);

  // Contexto del formulario para el asistente de voz
  const getFormContext = useCallback(() => {
    const padreSeleccionado = formData.padre_id
      ? categorias.reduce((found, cat) => {
          if (found) return found;
          const id = cat.ID || cat.id;
          if (String(id) === String(formData.padre_id)) return cat.Nombre || cat.nombre;
          const subs = cat.SubCategorias || cat.subcategorias || [];
          for (const sub of subs) {
            if (String(sub.ID || sub.id) === String(formData.padre_id)) return sub.Nombre || sub.nombre;
          }
          return null;
        }, null)
      : null;
    return {
      formulario: "crear_categoria",
      padre: padreSeleccionado || "Sin categoría padre (raíz)",
      campos: { nombre: formData.nombre, descripcion: formData.descripcion },
    };
  }, [formData, categorias]);

  const toggleCollapse = (id) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // =====================
  // Fetch inicial
  // =====================
  const fetchCategorias = async () => {
    try {
      const res = await fetchAuth(`${API_BASE_URL}/categorias`);
      const json = await res.json();
      const data = json.categorias || json || [];
      setCategorias(data);
    } catch (err) {
      toast.error("Error cargando categorías");
    }
  };

  useEffect(() => {
    fetchCategorias();
  }, []);

  // =====================
  // Validación
  // =====================
  const validateForm = () => {
    const newErrors = {};
    if (!formData.nombre.trim()) {
      newErrors.nombre = "El nombre es requerido";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // =====================
  // Crear / Actualizar categoría
  // =====================
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const dataToSend = {
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion.trim(),
      };

      if (formData.padre_id && formData.padre_id !== "") {
        dataToSend.padre_id = parseInt(formData.padre_id);
      }

      const url = editId
        ? `${API_BASE_URL}/categorias/${editId}`
        : `${API_BASE_URL}/categorias`;

      const method = editId ? "PUT" : "POST";

      const response = await fetchAuth(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataToSend),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(editId ? "Categoría actualizada!" : "Categoría creada!");
        setFormData({ nombre: "", descripcion: "", padre_id: "" });
        setEditId(null);
        setErrors({});
        setVoiceConfirm(false);
        fetchCategorias();
      } else {
        toast.error(result.message || "No se pudo guardar");
      }
    } catch (err) {
      toast.error("Error guardando categoría");
    }
  };

  // =====================
  // Eliminar categoría
  // =====================
  const handleDelete = async () => {
    if (!confirmDelete) return;

    try {
      const response = await fetchAuth(
        `${API_BASE_URL}/categorias/${confirmDelete}`,
        {
          method: "DELETE",
        },
      );

      if (response.ok) {
        toast.success("Categoría eliminada!");
        fetchCategorias();
        setConfirmDelete(null);
      } else {
        const result = await response.json();
        toast.error(result.message || "No se pudo eliminar");
      }
    } catch (err) {
      toast.error("Error eliminando categoría");
    }
  };

  // =====================
  // Editar categoría
  // =====================
  const handleEdit = (cat) => {
    setFormData({
      nombre: cat.Nombre || cat.nombre || "",
      descripcion: cat.Descripcion || cat.descripcion || "",
      padre_id: cat.PadreID || cat.padre_id || "",
    });
    setEditId(cat.ID || cat.id);
    setErrors({});
  };

  // =====================
  // Handle input change
  // =====================
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Limpiar error del campo cuando el usuario escribe
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  // =====================
  // Render <option> recursivo
  // =====================
  const renderOptions = (cats, prefix = "") => {
    return cats.flatMap((cat) => {
      const id = cat.ID || cat.id;
      const nombre = cat.Nombre || cat.nombre;
      const subCats = cat.SubCategorias || cat.subcategorias || [];

      return [
        <option key={id} value={id}>
          {prefix + nombre}
        </option>,
        ...renderOptions(subCats, prefix + "-- "),
      ];
    });
  };

  // =====================
  // Render recursivo con colapso
  // =====================
  const renderCategorias = (cats, nivel = 0) => {
    return cats.map((cat) => {
      const id = cat.ID || cat.id;
      const nombre = cat.Nombre || cat.nombre;
      const descripcion = cat.Descripcion || cat.descripcion;
      const subCats = cat.SubCategorias || cat.subcategorias || [];
      const tieneHijas = subCats.length > 0;
      const estaColapsado = collapsed.has(id);

      return (
        <div key={id} className="mb-1.5">
          <div
            className={`p-2 border rounded-lg shadow-sm ${
              nivel === 0 ? "bg-sky-50" : "bg-white"
            }`}
            style={{ marginLeft: nivel * 20 }}
          >
            <div className="flex flex-wrap items-center justify-between gap-1 sm:gap-2">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                {tieneHijas ? (
                  <button
                    onClick={() => toggleCollapse(id)}
                    className="flex-shrink-0 p-0.5 rounded hover:bg-sky-200 transition-colors"
                    title={estaColapsado ? "Expandir" : "Colapsar"}
                  >
                    {estaColapsado ? (
                      <ChevronRight size={14} className="text-sky-700" />
                    ) : (
                      <ChevronDown size={14} className="text-sky-700" />
                    )}
                  </button>
                ) : (
                  <span className="w-5 flex-shrink-0" />
                )}
                <p className="font-semibold text-gray-800 truncate text-xs">
                  {nivel > 0 && "⤷ "}
                  {nombre}
                </p>
                {tieneHijas && (
                  <span className="text-[10px] text-sky-600 bg-sky-100 px-1.5 py-0.5 rounded-full flex-shrink-0">
                    {subCats.length}
                  </span>
                )}
                <p className="text-xs text-gray-500 break-words hidden sm:block">
                  {descripcion}
                </p>
              </div>

              <div className="flex gap-1.5 flex-shrink-0">
                <button
                  onClick={() => handleEdit(cat)}
                  className="px-2 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded flex items-center gap-1"
                  title="Editar"
                >
                  <Pencil size={12} />
                  <span className="text-xs hidden sm:inline">Editar</span>
                </button>
                <button
                  onClick={() => setConfirmDelete(id)}
                  className="px-2 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded flex items-center gap-1"
                  title="Eliminar"
                >
                  <Trash2 size={12} />
                  <span className="text-xs hidden sm:inline">Eliminar</span>
                </button>
              </div>
            </div>
          </div>

          {tieneHijas && !estaColapsado && (
            <div className="mt-1.5">{renderCategorias(subCats, nivel + 1)}</div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="p-4 bg-blue-50 min-h-screen text-sm">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-3 mb-4">
        <h1 className="text-xl font-bold flex items-center gap-2 text-gray-800">
          <FolderTree className="w-6 h-6" />
          CATEGORÍAS
        </h1>
      </div>

      {/* Grid responsive */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        {/* Columna izquierda: formulario */}
        <div className="bg-white rounded-lg shadow-md md:sticky md:top-4">
          {/* Header del formulario */}
          <div className="bg-blue-400 p-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex-1 text-center">
                {editId ? "✏️ EDITAR CATEGORÍA" : "➕ CREAR CATEGORÍA"}
              </h2>
              <VoiceMicButton
                accion="crear_categoria"
                getFormContext={getFormContext}
              />
            </div>
          </div>

          {/* Contenido del formulario */}
          <div className="p-4 bg-sky-50 space-y-3">

            {/* Categoría padre */}
            <div className="relative">
              <label className="absolute -top-2 left-3 bg-white px-1 text-xs font-medium text-gray-700 z-10">
                Categoría padre (opcional)
              </label>
              <button
                type="button"
                onClick={() => setPadreDropdownOpen((v) => !v)}
                className="w-full border rounded-lg p-1.5 text-xs bg-white text-left flex items-center justify-between"
              >
                <span className={formData.padre_id ? "text-gray-800" : "text-gray-500"}>
                  {formData.padre_id
                    ? (() => {
                        const buscar = (cats) => {
                          for (const c of cats || []) {
                            if (String(c.ID || c.id) === String(formData.padre_id))
                              return c.Nombre || c.nombre;
                            const sub = c.SubCategorias || c.subcategorias || [];
                            const found = buscar(sub);
                            if (found) return found;
                          }
                          return null;
                        };
                        return buscar(categorias) || "Categoría padre";
                      })()
                    : "Sin categoría padre (raíz)"}
                </span>
                <ChevronDown size={12} className="text-gray-400" />
              </button>
              {padreDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setPadreDropdownOpen(false)}
                  />
                  <div className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-52 overflow-y-auto">
                    <div
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, padre_id: "" }));
                        setPadreDropdownOpen(false);
                      }}
                      className={`px-3 py-1.5 text-xs cursor-pointer hover:bg-blue-50 ${
                        !formData.padre_id ? "bg-blue-100 font-semibold" : ""
                      }`}
                    >
                      Sin categoría padre (raíz)
                    </div>
                    {(() => {
                      const renderTree = (cats, nivel = 0) =>
                        (cats || []).map((cat) => {
                          const id = cat.ID || cat.id;
                          const nombre = cat.Nombre || cat.nombre || "Sin nombre";
                          const subCats = cat.SubCategorias || cat.subcategorias || [];
                          const tieneHijas = subCats.length > 0;
                          const isExpanded = padreExpanded.has(id);
                          const isEditing = editId && String(id) === String(editId);
                          if (isEditing) return null;
                          return (
                            <div key={id}>
                              <div
                                className={`flex items-center hover:bg-blue-50 ${
                                  String(formData.padre_id) === String(id) ? "bg-blue-100" : ""
                                }`}
                                style={{ paddingLeft: nivel * 14 }}
                              >
                                {tieneHijas ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPadreExpanded((prev) => {
                                        const next = new Set(prev);
                                        if (next.has(id)) next.delete(id);
                                        else next.add(id);
                                        return next;
                                      });
                                    }}
                                    className="px-1 py-1 text-gray-400 hover:text-gray-700 flex-shrink-0"
                                  >
                                    {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                                  </button>
                                ) : (
                                  <span className="w-4 flex-shrink-0" />
                                )}
                                <div
                                  onClick={() => {
                                    setFormData((prev) => ({ ...prev, padre_id: String(id) }));
                                    setPadreDropdownOpen(false);
                                  }}
                                  className={`flex-1 py-1.5 pr-2 text-xs cursor-pointer truncate ${
                                    nivel === 0 ? "font-medium text-gray-800" : "text-gray-600"
                                  } ${String(formData.padre_id) === String(id) ? "font-semibold" : ""}`}
                                >
                                  {nivel > 0 && "⤷ "}{nombre}
                                  {tieneHijas && (
                                    <span className="ml-1 text-[9px] text-blue-500 bg-blue-50 px-1 rounded-full">
                                      {subCats.length}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {tieneHijas && isExpanded && renderTree(subCats, nivel + 1)}
                            </div>
                          );
                        });
                      return renderTree(categorias);
                    })()}
                  </div>
                </>
              )}
            </div>

            {/* Nombre */}
            <div className="relative">
              <label className="absolute -top-2 left-3 bg-white px-1 text-xs font-medium text-gray-700">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleInputChange}
                className="w-full border rounded-lg p-1.5 text-xs"
              />
              {errors.nombre && (
                <span className="text-red-500 text-xs">{errors.nombre}</span>
              )}
            </div>

            {/* Descripción */}
            <div className="relative">
              <label className="absolute -top-2 left-3 bg-white px-1 text-xs font-medium text-gray-700">
                Descripción
              </label>
              <textarea
                name="descripcion"
                value={formData.descripcion}
                onChange={handleInputChange}
                className="w-full border rounded-lg p-1.5 text-xs"
                rows="2"
              />
            </div>

            {/* Banner de confirmación por voz */}
            {voiceConfirm && formData.nombre && (
              <div className="bg-green-50 border border-green-300 rounded-lg p-2">
                <p className="text-xs text-green-700 font-medium mb-1">Datos completados por voz:</p>
                <p className="text-xs text-green-800"><strong>Nombre:</strong> {formData.nombre}</p>
                {formData.descripcion && (
                  <p className="text-xs text-green-800"><strong>Descripción:</strong> {formData.descripcion}</p>
                )}
                <p className="text-xs text-green-800"><strong>Padre:</strong> {formData.padre_id ? "Subcategoría" : "Raíz"}</p>
                <p className="text-[10px] text-green-600 mt-1">Revisa y presiona Crear para guardar</p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleSubmit}
                id="btn-guardar-categoria"
                className="bg-sky-600 text-white px-3 py-1.5 rounded hover:bg-sky-700 font-medium text-xs"
              >
                {editId ? "Actualizar" : "Crear"}
              </button>
              {editId && (
                <button
                  onClick={() => {
                    setFormData({ nombre: "", descripcion: "", padre_id: "" });
                    setEditId(null);
                    setErrors({});
                    setVoiceConfirm(false);
                  }}
                  className="bg-gray-500 text-white px-3 py-1.5 rounded hover:bg-gray-600 text-xs"
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Columna derecha: lista */}
        <div className="md:col-span-2 bg-white p-4 rounded-lg shadow-md border border-sky-200 max-h-[calc(100vh-8rem)] overflow-y-auto">
          <div className="flex flex-wrap items-center justify-between mb-3 gap-2">
            <h3 className="text-base font-bold text-sky-700">
              Lista de Categorías
            </h3>
            {categorias.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (collapsed.size > 0) {
                    setCollapsed(new Set());
                  } else {
                    const allIds = new Set();
                    const collectIds = (cats) => {
                      cats.forEach((cat) => {
                        const id = cat.ID || cat.id;
                        const subCats =
                          cat.SubCategorias || cat.subcategorias || [];
                        if (subCats.length > 0) {
                          allIds.add(id);
                          collectIds(subCats);
                        }
                      });
                    };
                    collectIds(categorias);
                    setCollapsed(allIds);
                  }
                }}
                className="text-xs text-sky-700 hover:text-sky-800 hover:bg-sky-50 px-2 py-1 rounded transition-colors"
              >
                {collapsed.size > 0 ? "Expandir todo" : "Colapsar todo"}
              </button>
            )}
          </div>
          {categorias.length > 0 ? (
            <div className="space-y-1">
              {renderCategorias(categorias)}
            </div>
          ) : (
            <p className="text-gray-500 text-xs">
              No hay categorías registradas.
            </p>
          )}
        </div>
      </div>

      {/* Modal confirmación */}
      {confirmDelete && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white p-5 rounded shadow-lg text-center max-w-md mx-4">
            <h3 className="text-base font-bold mb-3">¿Eliminar categoría?</h3>
            <p className="mb-4 text-gray-600 text-xs">
              Esta acción también eliminará sus subcategorías y productos.
            </p>
            <button
              onClick={handleDelete}
              className="bg-red-600 text-white px-3 py-1.5 rounded mr-2 hover:bg-red-700 text-xs"
            >
              Sí, eliminar
            </button>
            <button
              onClick={() => setConfirmDelete(null)}
              className="bg-gray-500 text-white px-3 py-1.5 rounded hover:bg-gray-600 text-xs"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
