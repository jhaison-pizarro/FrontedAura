import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useCaja } from "../funciones/CajaContext";
import { NombreContexto } from "../App2";
import {
  DollarSign,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export default function AbrirCaja() {
  const navigate = useNavigate();
  const { usuario } = useContext(NombreContexto);
  const { abrirCaja, cajaAbierta, verificando } = useCaja();
  const [cargando, setCargando] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm({
    defaultValues: {
      saldo_inicial: "",
      observaciones: "",
    },
  });

  const saldoInicial = watch("saldo_inicial");

  // Si ya tiene caja abierta, redirigir
  React.useEffect(() => {
    if (!verificando && cajaAbierta) {
      navigate("/reservas");
    }
  }, [cajaAbierta, verificando, navigate]);

  const onSubmit = async (data) => {
    setCargando(true);
    try {
      await abrirCaja(data.saldo_inicial, data.observaciones);
      toast.success("Caja abierta exitosamente");
      navigate("/reservas");
    } catch (error) {
      toast.error(error.message || "Error al abrir caja");
    } finally {
      setCargando(false);
    }
  };

  if (verificando) {
    return (
      <div className="flex items-center justify-center h-full min-h-[500px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center p-2">
      <div className="w-full max-w-sm">
        {/* Card principal */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Header */}
          <div className="bg-blue-400 p-2">
            <h1 className="text-sm font-bold text-center text-white">ABRIR CAJA</h1>
          </div>

          {/* Info del empleado */}
          <div className="px-3 py-2 bg-gray-50 border-b flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-blue-700 font-semibold text-sm">
                {usuario?.nombre?.charAt(0) || "U"}
              </span>
            </div>
            <div>
              <p className="font-medium text-gray-800 text-xs">{usuario?.nombre || "Usuario"}</p>
              <p className="text-[10px] text-gray-500 capitalize">{usuario?.perfil || "Empleado"}</p>
            </div>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit(onSubmit)} className="p-3 space-y-3 bg-sky-50">
            {/* Saldo inicial */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Saldo Inicial (Sencillo) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className={`w-full pl-8 pr-3 py-1.5 border rounded text-sm font-medium focus:ring-1 focus:ring-blue-400 focus:border-blue-400 ${
                    errors.saldo_inicial ? "border-red-300 bg-red-50" : "border-gray-300"
                  }`}
                  {...register("saldo_inicial", {
                    required: "El saldo inicial es requerido",
                    min: { value: 0, message: "El saldo no puede ser negativo" },
                  })}
                />
              </div>
              {errors.saldo_inicial && (
                <p className="mt-0.5 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.saldo_inicial.message}
                </p>
              )}
              <p className="mt-0.5 text-[10px] text-gray-500">
                Efectivo disponible para dar vueltos
              </p>
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Observaciones
              </label>
              <textarea
                rows="2"
                placeholder="Notas adicionales..."
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-blue-400 resize-none text-xs"
                {...register("observaciones")}
              />
            </div>

            {/* Preview del saldo */}
            {saldoInicial && parseFloat(saldoInicial) > 0 && (
              <div className="bg-blue-100 border border-blue-300 rounded p-2">
                <div className="flex items-center gap-2 text-blue-700">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="font-medium text-xs">Saldo a registrar:</span>
                  <span className="text-sm font-bold">
                    S/ {parseFloat(saldoInicial).toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Botón submit */}
            <button
              type="submit"
              disabled={cargando}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white font-bold rounded hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs"
            >
              {cargando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Abriendo caja...
                </>
              ) : (
                <>
                  Abrir Caja
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Nota informativa */}
        <div className="mt-2 text-center text-[10px] text-gray-500">
          <p>Debe abrir caja antes de registrar ventas o reservas</p>
        </div>
      </div>
    </div>
  );
}
