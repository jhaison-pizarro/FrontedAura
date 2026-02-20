import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useCaja } from "../funciones/CajaContext";
import { NombreContexto } from "../App2";
import {
  Wallet,
  DollarSign,
  FileText,
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
    <div className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card principal */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Header */}
          <div className="bg-blue-200 p-4">
            <div className="flex items-center justify-center gap-3">
              <Wallet className="w-6 h-6 text-gray-700" />
              <h1 className="text-lg sm:text-xl font-bold text-gray-800">ABRIR CAJA</h1>
            </div>
            <p className="text-gray-600 text-sm text-center mt-1">
              Ingrese el saldo inicial para comenzar su turno
            </p>
          </div>

          {/* Info del empleado */}
          <div className="px-4 py-3 bg-gray-100 border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center">
                <span className="text-blue-700 font-semibold">
                  {usuario?.nombre?.charAt(0) || "U"}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-800 text-sm">{usuario?.nombre || "Usuario"}</p>
                <p className="text-xs text-gray-500 capitalize">{usuario?.perfil || "Empleado"}</p>
              </div>
            </div>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit(onSubmit)} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* Saldo inicial */}
            <div className="relative pt-2">
              <label className="absolute -top-1 left-3 bg-white px-2 text-xs font-medium text-gray-600 z-10 flex items-center gap-1">
                Saldo Inicial (Sencillo)
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
                    errors.saldo_inicial ? "border-red-300 bg-red-50" : "border-gray-300"
                  }`}
                  {...register("saldo_inicial", {
                    required: "El saldo inicial es requerido",
                    min: { value: 0, message: "El saldo no puede ser negativo" },
                  })}
                />
              </div>
              {errors.saldo_inicial && (
                <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.saldo_inicial.message}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Efectivo disponible para dar vueltos
              </p>
            </div>

            {/* Observaciones */}
            <div className="relative pt-2">
              <label className="absolute -top-1 left-3 bg-white px-2 text-xs font-medium text-gray-600 z-10">
                Observaciones
              </label>
              <div className="relative">
                <div className="absolute top-3 left-3 pointer-events-none">
                  <FileText className="w-5 h-5 text-gray-400" />
                </div>
                <textarea
                  rows="2"
                  placeholder="Notas adicionales..."
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none text-sm"
                  {...register("observaciones")}
                />
              </div>
            </div>

            {/* Preview del saldo */}
            {saldoInicial && parseFloat(saldoInicial) > 0 && (
              <div className="bg-blue-100 border border-blue-300 rounded-lg p-3">
                <div className="flex items-center gap-2 text-blue-700">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium text-sm">Saldo a registrar:</span>
                  <span className="text-lg font-bold">
                    S/ {parseFloat(saldoInicial).toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Botón submit */}
            <button
              type="submit"
              disabled={cargando}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cargando ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Abriendo caja...
                </>
              ) : (
                <>
                  Abrir Caja
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Nota informativa */}
        <div className="mt-4 text-center text-xs text-gray-500">
          <p>
            Debe abrir caja antes de registrar ventas o reservas
          </p>
        </div>
      </div>
    </div>
  );
}
