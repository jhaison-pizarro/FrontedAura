import React from "react";
import { Navigate } from "react-router-dom";
import { useCaja } from "../funciones/CajaContext";
import { Loader2, Lock } from "lucide-react";

export function RutaConCaja({ children }) {
  const { cajaAbierta, cajaDiaAnterior, verificando } = useCaja();

  // Mientras verifica, mostrar loading
  if (verificando) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="text-gray-600">Verificando estado de caja...</span>
        </div>
      </div>
    );
  }

  // Si hay caja abierta pero de un dia anterior, forzar cierre
  if (cajaDiaAnterior) {
    return <Navigate to="/caja/cerrar" replace />;
  }

  // Si no hay caja abierta, redirigir a abrir caja
  if (!cajaAbierta) {
    return <Navigate to="/caja/abrir" replace />;
  }

  // Si hay caja abierta, renderizar el contenido
  return children;
}

// Componente alternativo que muestra mensaje en lugar de redirigir
export function RequiereCaja({ children, mensaje = "Debe abrir caja para acceder a esta sección" }) {
  const { cajaAbierta, verificando } = useCaja();

  if (verificando) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!cajaAbierta) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center p-8 bg-amber-50 border border-amber-200 rounded-xl max-w-md">
          <Lock className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-amber-800 mb-2">
            Caja no abierta
          </h3>
          <p className="text-amber-700 mb-4">{mensaje}</p>
          <a
            href="/caja/abrir"
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
          >
            Abrir Caja
          </a>
        </div>
      </div>
    );
  }

  return children;
}

export default RutaConCaja;
