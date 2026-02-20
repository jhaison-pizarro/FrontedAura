import React, { useEffect, useState, useCallback } from "react";
import {
  Building,
  Pencil,
  Trash2,
  MapPin,
  Phone,
  Archive,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { fetchAuth, API_BASE_URL } from "../funciones/auth";
import { toast } from "sonner";
import VoiceMicButton from "../components/VoiceMicButton";
import { useSucursal } from "../context/SucursalContext";

export default function Sucursales() {
  const [sucursales, setSucursales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [formData, setFormData] = useState({
    nombre: "",
    direccion: "",
    telefono: "",
    regla_clientes: "",
  });
  const [errors, setErrors] = useState({});
  const [voiceConfirm, setVoiceConfirm] = useState(false);
  const { cargarSucursales: refreshContext } = useSucursal();

  const fetchSucursales = async () => {
    try {
      setLoading(true);
      const res = await fetchAuth(`${API_BASE_URL}/sucursales`);
      if (res.ok) {
        const data = await res.json();
        setSucursales(data || []);
      }
    } catch (err) {
      toast.error("Error al cargar sucursales");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSucursales();
  }, []);

  // Escuchar evento de voz para llenar el formulario
  useEffect(() => {
    const handleVoiceFill = (e) => {
      const data = e.detail;
      if (!data) return;
      setFormData((prev) => ({
        ...prev,
        nombre: data.nombre || prev.nombre,
        direccion: data.direccion || prev.direccion,
        telefono: data.telefono || prev.telefono,
        regla_clientes: data.regla_clientes || prev.regla_clientes,
      }));
      setErrors({});
      setVoiceConfirm(true);
    };
    window.addEventListener("voice:fill-sucursal-form", handleVoiceFill);
    return () => window.removeEventListener("voice:fill-sucursal-form", handleVoiceFill);
  }, []);

  // Contexto del formulario para el asistente de voz
  const getFormContext = useCallback(() => {
    const camposFaltantes = [];
    if (!formData.nombre.trim()) camposFaltantes.push("nombre");
    if (!formData.direccion.trim()) camposFaltantes.push("direccion");
    if (!formData.telefono.trim()) camposFaltantes.push("telefono");
    if (!formData.regla_clientes.trim()) camposFaltantes.push("regla_clientes");
    return {
      formulario: "crear_sucursal",
      campos: {
        nombre: formData.nombre,
        direccion: formData.direccion,
        telefono: formData.telefono,
        regla_clientes: formData.regla_clientes,
      },
      camposFaltantes,
      editando: !!editId,
    };
  }, [formData, editId]);

  const validate = () => {
    const e = {};
    if (!formData.nombre.trim()) e.nombre = "El nombre es requerido";
    if (!formData.direccion.trim()) e.direccion = "La direccion es requerida";
    if (!formData.telefono.trim()) e.telefono = "El telefono es requerido";
    else if (!/^[0-9]{9}$/.test(formData.telefono)) e.telefono = "Debe tener 9 dígitos numéricos";
    if (!formData.regla_clientes.trim()) e.regla_clientes = "La regla es requerida";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const url = editId
        ? `${API_BASE_URL}/sucursales/${editId}`
        : `${API_BASE_URL}/sucursales`;
      const method = editId ? "PUT" : "POST";


      const res = await fetchAuth(url, {
        method,
        body: JSON.stringify(formData),
      });


      if (res.ok) {
        toast.success(editId ? "Sucursal actualizada" : "Sucursal creada");
        resetForm();
        setVoiceConfirm(false);
        fetchSucursales();
        refreshContext();
      } else {
        const errText = await res.text();
        toast.error(errText || "Error al guardar");
      }
    } catch (err) {
      toast.error("Error de conexion: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetchAuth(`${API_BASE_URL}/sucursales/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Sucursal desactivada");
        setConfirmDelete(null);
        fetchSucursales();
        refreshContext();
      } else {
        const err = await res.text();
        toast.error(err || "Error al desactivar");
      }
    } catch (err) {
      toast.error("Error de conexion");
    }
  };

  const handleEdit = (s) => {
    setEditId(s.ID);
    setFormData({
      nombre: s.nombre || "",
      direccion: s.direccion || "",
      telefono: s.telefono || "",
      estado: s.estado || "activa",
      regla_clientes: s.regla_clientes || "",
    });
    setErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetForm = () => {
    setEditId(null);
    setFormData({ nombre: "", direccion: "", telefono: "", regla_clientes: "" });
    setErrors({});
  };

  const activas = sucursales.filter((s) => s.estado === "activa");
  const inactivas = sucursales.filter((s) => s.estado === "inactiva");

  return (
    <div className="p-4 bg-blue-50 min-h-screen text-sm">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-3 mb-4">
        <h1 className="text-xl font-bold flex items-center gap-2 text-gray-800">
          <Building className="w-6 h-6" />
          SUCURSALES
        </h1>
      </div>

      {/* Grid: formulario izquierda, lista derecha */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        {/* Columna izquierda: formulario */}
        <div className="bg-white rounded-lg shadow-md md:sticky md:top-4 overflow-hidden">
          <div className="bg-blue-400 p-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex-1 text-center">
                {editId ? "EDITAR SUCURSAL" : "NUEVA SUCURSAL"}
              </h2>
              <VoiceMicButton
                accion="crear_sucursal"
                getFormContext={getFormContext}
              />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-4 bg-sky-50 space-y-3">
            {/* Nombre */}
            <div className="relative">
              <label className="absolute -top-2 left-3 bg-white px-1 text-xs font-medium text-gray-700 z-10">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) =>
                  setFormData({ ...formData, nombre: e.target.value })
                }
                className={`w-full border rounded-lg p-1.5 text-xs ${
                  errors.nombre ? "border-red-400" : ""
                }`}
                placeholder="Nombre de la sucursal"
              />
              {errors.nombre && (
                <span className="text-red-500 text-xs">{errors.nombre}</span>
              )}
            </div>

            {/* Direccion */}
            <div className="relative">
              <label className="absolute -top-2 left-3 bg-white px-1 text-xs font-medium text-gray-700 z-10">
                Direccion <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.direccion}
                onChange={(e) =>
                  setFormData({ ...formData, direccion: e.target.value })
                }
                className={`w-full border rounded-lg p-1.5 text-xs ${
                  errors.direccion ? "border-red-400" : ""
                }`}
                placeholder="Av. Ejemplo 123"
              />
              {errors.direccion && (
                <span className="text-red-500 text-xs">{errors.direccion}</span>
              )}
            </div>

            {/* Telefono */}
            <div className="relative">
              <label className="absolute -top-2 left-3 bg-white px-1 text-xs font-medium text-gray-700 z-10">
                Telefono <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.telefono}
                maxLength={9}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, "");
                  setFormData({ ...formData, telefono: val });
                }}
                className={`w-full border rounded-lg p-1.5 text-xs ${
                  errors.telefono ? "border-red-400" : ""
                }`}
                placeholder="987654321"
              />
              {errors.telefono && (
                <span className="text-red-500 text-xs">{errors.telefono}</span>
              )}
            </div>

            {/* Regla para Clientes */}
            <div className="relative">
              <label className="absolute -top-2 left-3 bg-white px-1 text-xs font-medium text-gray-700 z-10">
                Regla para Clientes <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.regla_clientes}
                onChange={(e) =>
                  setFormData({ ...formData, regla_clientes: e.target.value })
                }
                className={`w-full border rounded-lg p-1.5 text-xs ${
                  errors.regla_clientes ? "border-red-400" : ""
                }`}
                rows={3}
                placeholder="Ej: Los productos deben ser devueltos en las mismas condiciones..."
              />
              {errors.regla_clientes && (
                <span className="text-red-500 text-xs">{errors.regla_clientes}</span>
              )}
            </div>

            {/* Estado (solo en edicion) */}
            {editId && (
              <div className="relative">
                <label className="absolute -top-2 left-3 bg-white px-1 text-xs font-medium text-gray-700 z-10">
                  Estado
                </label>
                <select
                  value={formData.estado || "activa"}
                  onChange={(e) =>
                    setFormData({ ...formData, estado: e.target.value })
                  }
                  className="w-full border rounded-lg p-1.5 text-xs"
                >
                  <option value="activa">Activa</option>
                  <option value="inactiva">Inactiva</option>
                </select>
              </div>
            )}

            {/* Banner de confirmacion por voz */}
            {voiceConfirm && formData.nombre && (
              <div className="bg-green-50 border border-green-300 rounded-lg p-2">
                <p className="text-xs text-green-700 font-medium mb-1">Datos completados por voz:</p>
                <p className="text-xs text-green-800"><strong>Nombre:</strong> {formData.nombre}</p>
                {formData.direccion && (
                  <p className="text-xs text-green-800"><strong>Direccion:</strong> {formData.direccion}</p>
                )}
                {formData.telefono && (
                  <p className="text-xs text-green-800"><strong>Telefono:</strong> {formData.telefono}</p>
                )}
                {formData.regla_clientes && (
                  <p className="text-xs text-green-800"><strong>Regla:</strong> {formData.regla_clientes}</p>
                )}
                <p className="text-[10px] text-green-600 mt-1">Revisa y presiona {editId ? "Actualizar" : "Crear"} para guardar</p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                id="btn-guardar-sucursal"
                className="bg-sky-600 text-white px-3 py-1.5 rounded hover:bg-sky-700 font-medium text-xs"
              >
                {editId ? "Actualizar" : "Crear"}
              </button>
              {editId && (
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setVoiceConfirm(false);
                  }}
                  className="bg-gray-500 text-white px-3 py-1.5 rounded hover:bg-gray-600 text-xs"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Columna derecha: lista de sucursales */}
        <div className="md:col-span-2 bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-blue-300 p-3">
            <h3 className="text-sm font-bold text-center text-white">
              LISTA DE SUCURSALES
            </h3>
          </div>

          <div className="p-3">
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                <p className="mt-2 text-gray-600 text-sm">Cargando...</p>
              </div>
            ) : sucursales.length === 0 ? (
              <div className="p-8 text-center">
                <Building className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 text-sm">
                  No hay sucursales registradas
                </p>
              </div>
            ) : (
              <div className="max-h-[70vh] overflow-y-auto space-y-1.5 pr-2">
                {/* Activas */}
                {activas.map((s) => (
                  <div
                    key={s.ID}
                    className="flex items-center justify-between p-2 border rounded bg-sky-50 shadow-sm hover:bg-sky-100 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg flex-shrink-0">
                        <Building className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm text-gray-800 truncate">
                            {s.nombre}
                          </p>
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700 flex-shrink-0">
                            <CheckCircle className="w-2.5 h-2.5" />
                            Activa
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                          {s.direccion && (
                            <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              {s.direccion}
                            </p>
                          )}
                          {s.telefono && (
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <Phone className="w-3 h-3 flex-shrink-0" />
                              {s.telefono}
                            </p>
                          )}
                        </div>
                        {s.regla_clientes && (
                          <p className="text-xs text-gray-400 truncate mt-0.5">
                            Regla: {s.regla_clientes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-1.5 flex-shrink-0 ml-3">
                      <button
                        onClick={() => handleEdit(s)}
                        className="px-2.5 py-1 text-xs bg-yellow-500 hover:bg-yellow-600 text-white rounded"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setConfirmDelete(s.ID)}
                        className="px-2.5 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded"
                      >
                        Desactivar
                      </button>
                    </div>
                  </div>
                ))}

                {/* Inactivas */}
                {inactivas.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 mt-3 mb-1">
                      <Archive className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-xs font-semibold text-gray-500">
                        Inactivas ({inactivas.length})
                      </span>
                    </div>
                    {inactivas.map((s) => (
                      <div
                        key={s.ID}
                        className="flex items-center justify-between p-2 border rounded bg-gray-50 shadow-sm opacity-60"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="flex items-center justify-center w-10 h-10 bg-gray-200 rounded-lg flex-shrink-0">
                            <Building className="w-5 h-5 text-gray-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm text-gray-600 truncate">
                                {s.nombre}
                              </p>
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-200 text-gray-600 flex-shrink-0">
                                <XCircle className="w-2.5 h-2.5" />
                                Inactiva
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleEdit(s)}
                          className="px-2.5 py-1 text-xs bg-yellow-500 hover:bg-yellow-600 text-white rounded flex-shrink-0 ml-3"
                        >
                          Reactivar
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* Estadisticas */}
            {!loading && sucursales.length > 0 && (
              <div className="mt-4 pt-3 border-t">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-green-50 p-3 rounded border border-green-200">
                    <p className="text-xs text-green-800 font-medium">
                      Sucursales Activas
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      {activas.length}
                    </p>
                  </div>
                  <div className="bg-red-50 p-3 rounded border border-red-200">
                    <p className="text-xs text-red-800 font-medium">
                      Sucursales Inactivas
                    </p>
                    <p className="text-2xl font-bold text-red-600">
                      {inactivas.length}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal confirmacion eliminar */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-5">
            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-7 h-7 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Desactivar sucursal?
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                La sucursal sera marcada como inactiva. Podras reactivarla
                despues.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDelete(confirmDelete)}
                  className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  Si, desactivar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
