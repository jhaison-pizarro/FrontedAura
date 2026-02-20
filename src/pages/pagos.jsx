// src/pages/pagos.jsx
import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import VoiceMicButton from "../components/VoiceMicButton";
import {
  CreditCard,
  DollarSign,
  Smartphone,
  Building2,
  Wallet,
  Archive,
} from "lucide-react";
import { fetchAuth } from "../funciones/auth";
import { API_BASE_URL } from "../config";

const API_BASE = API_BASE_URL;

export default function Pagos() {
  const [pagos, setPagos] = useState([]);
  const [pagosEliminados, setPagosEliminados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [editId, setEditId] = useState(null);
  const [confirmarEliminar, setConfirmarEliminar] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm();

  // ---------- Fetch inicial ----------
  useEffect(() => {
    fetchPagos();
    fetchPagosEliminados();
  }, []);

  // Listener para llenado de pago por voz
  useEffect(() => {
    const handleVoiceFill = async (e) => {
      const data = e.detail;
      if (!data) return;
      const campos = [{ key: "nombre" }, { key: "descripcion" }];
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
    };
    window.addEventListener("voice:fill-payment-form", handleVoiceFill);
    return () => window.removeEventListener("voice:fill-payment-form", handleVoiceFill);
  }, [setValue]);

  // Contexto del formulario para el asistente de voz
  const getFormContext = useCallback(() => {
    const campos = {
      nombre: watch("nombre") || "",
      descripcion: watch("descripcion") || "",
    };
    return { formulario: "crear_pago", campos };
  }, [watch]);

  // ---------- Obtener métodos de pago activos ----------
  async function fetchPagos() {
    try {
      setLoading(true);
      const response = await fetchAuth(`${API_BASE}/pagos`);
      const data = await response.json();
      setPagos(data || []);
    } catch (error) {
      toast.error("Error al cargar métodos de pago");
    } finally {
      setLoading(false);
    }
  }

  // ---------- Obtener métodos de pago eliminados ----------
  async function fetchPagosEliminados() {
    try {
      const response = await fetchAuth(`${API_BASE}/pagos/eliminados`);
      const data = await response.json();
      setPagosEliminados(data || []);
    } catch (error) {
    }
  }

  // ---------- Crear o actualizar método de pago ----------
  const onSubmit = async (data) => {
    try {
      setLoading(true);

      const url = editId ? `${API_BASE}/pagos/${editId}` : `${API_BASE}/pagos`;
      const method = editId ? "PUT" : "POST";

      const response = await fetchAuth(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Error al guardar");

      toast.success(
        editId
          ? "Método de pago actualizado!"
          : "Método de pago creado exitosamente!"
      );

      reset();
      setEditId(null);
      fetchPagos();
      fetchPagosEliminados();
    } catch (error) {
      toast.error("Error al guardar el método de pago");
    } finally {
      setLoading(false);
    }
  };

  // ---------- Editar método de pago ----------
  function handleEdit(pago) {
    setValue("nombre", pago.nombre || "");
    setValue("descripcion", pago.descripcion || "");
    setEditId(pago.ID || pago.id || null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ---------- Eliminar método de pago ----------
  function handleDelete(id) {
    if (!id) return;
    setConfirmarEliminar(id);
  }

  async function confirmarEliminarPago() {
    if (!confirmarEliminar) return;
    try {
      setLoading(true);
      const response = await fetchAuth(`${API_BASE}/pagos/${confirmarEliminar}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Error al eliminar");

      toast.success("Método de pago eliminado exitosamente");
      fetchPagos();
      fetchPagosEliminados();
    } catch (error) {
      toast.error("Error al eliminar el método de pago");
    } finally {
      setLoading(false);
      setConfirmarEliminar(null);
    }
  }

  // ---------- Iconos por tipo de pago ----------
  function getIconByName(nombre) {
    const lower = nombre.toLowerCase();
    if (lower.includes("efectivo"))
      return <DollarSign className="w-5 h-5 text-green-600" />;
    if (lower.includes("yape") || lower.includes("plin"))
      return <Smartphone className="w-5 h-5 text-purple-600" />;
    if (lower.includes("transferencia") || lower.includes("banco"))
      return <Building2 className="w-5 h-5 text-blue-600" />;
    if (lower.includes("tarjeta"))
      return <CreditCard className="w-5 h-5 text-orange-600" />;
    return <Wallet className="w-5 h-5 text-gray-600" />;
  }

  // ---------- Métodos predefinidos sugeridos ----------
  const metodosSugeridos = [
    { nombre: "Efectivo", descripcion: "Pago en efectivo" },
    { nombre: "Transferencia", descripcion: "Transferencia bancaria" },
    { nombre: "Yape", descripcion: "Pago por Yape" },
    { nombre: "Plin", descripcion: "Pago por Plin" },
    { nombre: "Tarjeta", descripcion: "Tarjeta de crédito/débito" },
  ];

  function handleAddSugerido(metodo) {
    setValue("nombre", metodo.nombre);
    setValue("descripcion", metodo.descripcion);
    setEditId(null);
  }

  const listaPagos = showDeleted ? pagosEliminados : pagos;

  // ---------- JSX ----------
  return (
    <div className="p-4 bg-blue-50 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-3 mb-4">
        <h1 className="text-xl font-bold flex items-center gap-2 text-gray-800">
          <CreditCard className="w-6 h-6" />
          MÉTODOS DE PAGO
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
      {/* PANEL IZQUIERDO: FORMULARIO (1 col) */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden md:col-span-1">
        <div className="bg-blue-400 p-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex-1 text-center">
              {editId ? "✏️ EDITAR MÉTODO DE PAGO" : "➕ NUEVO MÉTODO DE PAGO"}
            </h2>
            <VoiceMicButton accion="crear_pago" getFormContext={getFormContext} />
          </div>
        </div>
        <div className="p-4 bg-sky-50">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* NOMBRE */}
          <div className="relative">
            <label className="absolute -top-2 left-3 bg-sky-50 px-1 text-xs font-medium text-gray-700">
              Nombre del Método <span className="text-red-500">*</span>
            </label>
            <input
              {...register("nombre", {
                required: "El nombre es requerido",
                minLength: {
                  value: 2,
                  message: "Debe tener al menos 2 caracteres",
                },
              })}
              type="text"
              placeholder="Ej: Efectivo, Yape, Transferencia"
              className="w-full border rounded p-2 text-sm"
            />
            {errors.nombre && (
              <span className="text-red-500 text-xs">
                {errors.nombre.message}
              </span>
            )}
          </div>

          {/* DESCRIPCIÓN */}
          <div className="relative">
            <label className="absolute -top-2 left-3 bg-sky-50 px-1 text-xs font-medium text-gray-700">
              Descripción (opcional)
            </label>
            <textarea
              {...register("descripcion")}
              rows={3}
              placeholder="Ej: Pago en efectivo al momento de la entrega"
              className="w-full border rounded p-2 text-sm"
            />
          </div>

          {/* BOTONES */}
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              id="btn-guardar-pago"
              disabled={loading}
              className={`px-4 py-2 rounded text-white text-sm ${
                loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {loading
                ? "Guardando..."
                : editId
                ? "Actualizar método"
                : "Crear método"}
            </button>
            <button
              type="button"
              onClick={() => {
                reset();
                setEditId(null);
              }}
              className="px-4 py-2 rounded border bg-sky-200 hover:bg-gray-50 text-sm"
            >
              Limpiar
            </button>
          </div>
        </form>

        {/* MÉTODOS SUGERIDOS */}
        {!editId && pagos.length === 0 && (
          <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded">
            <h3 className="text-sm font-semibold text-blue-800 mb-3">
              💡 Métodos sugeridos
            </h3>
            <div className="space-y-2">
              {metodosSugeridos.map((metodo, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAddSugerido(metodo)}
                  className="w-full p-2 bg-white border border-blue-300 rounded hover:bg-blue-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    {getIconByName(metodo.nombre)}
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {metodo.nombre}
                      </p>
                      <p className="text-xs text-gray-600">
                        {metodo.descripcion}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
        </div>
      </div>

      {/* PANEL DERECHO: LISTA DE MÉTODOS DE PAGO (2 cols) */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden md:col-span-2">
        <div className="bg-blue-300 p-3">
          <h3 className="text-sm font-bold text-center text-white">
            {showDeleted ? "MÉTODOS ELIMINADOS" : "MÉTODOS DE PAGO ACTIVOS"}
          </h3>
        </div>
        <div className="p-3">
          <div className="flex flex-wrap items-center justify-end mb-3 gap-2">
          <button
            onClick={() => setShowDeleted(!showDeleted)}
            className={`flex items-center gap-2 px-3 py-1 rounded text-xs transition-colors ${
              showDeleted
                ? "bg-gray-500 text-white hover:bg-gray-600"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            <Archive className="w-4 h-4" />
            <span>{showDeleted ? "Ver Activos" : "Ver Eliminados"}</span>
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto space-y-1.5 pr-2">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
              <p className="mt-2 text-gray-600 text-sm">Cargando...</p>
            </div>
          ) : listaPagos.length === 0 ? (
            <div className="p-8 text-center">
              <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 text-sm">
                {showDeleted
                  ? "No hay métodos de pago eliminados"
                  : "No hay métodos de pago registrados"}
              </p>
            </div>
          ) : (
            listaPagos.map((pago) => {
              const pagoId = pago.ID || pago.id;
              return (
                <div
                  key={pagoId}
                  className="flex items-center justify-between p-2 border rounded bg-sky-50 shadow-sm hover:bg-sky-100 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg flex-shrink-0">
                      {getIconByName(pago.nombre)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm text-gray-800 truncate">
                        {pago.nombre}
                      </p>
                      <p className="text-xs text-gray-600 truncate">
                        {pago.descripcion || "Sin descripción"}
                      </p>
                    </div>
                  </div>

                  {!showDeleted && (
                    <div className="flex gap-1.5 flex-shrink-0 ml-3">
                      <button
                        onClick={() => handleEdit(pago)}
                        className="px-2.5 py-1 text-xs bg-yellow-500 hover:bg-yellow-600 text-white rounded"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(pagoId)}
                        className="px-2.5 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded"
                      >
                        Eliminar
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* ESTADÍSTICAS */}
        {!showDeleted && pagos.length > 0 && (
          <div className="mt-4 pt-3 border-t">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-green-50 p-3 rounded border border-green-200">
                <p className="text-xs text-green-800 font-medium">
                  Métodos Activos
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {pagos.length}
                </p>
              </div>
              <div className="bg-red-50 p-3 rounded border border-red-200">
                <p className="text-xs text-red-800 font-medium">
                  Métodos Eliminados
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {pagosEliminados.length}
                </p>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
      </div>

      {/* Modal de confirmación para eliminar */}
      {confirmarEliminar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-5">
            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                ¿Eliminar método de pago?
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Este método de pago será eliminado. Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmarEliminar(null)}
                  className="flex-1 py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarEliminarPago}
                  className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  Sí, eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
