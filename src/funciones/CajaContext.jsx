import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { fetchAuth, API_BASE_URL } from "./auth";

const CajaContext = createContext();

// Helpers para persistir en localStorage
const CAJA_CACHE_KEY = "caja_estado";

function leerCajaCache() {
  try {
    const raw = localStorage.getItem(CAJA_CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) { /* ignore */ }
  return null;
}

function guardarCajaCache(cajaAbierta, caja, cajaDiaAnterior) {
  try {
    localStorage.setItem(CAJA_CACHE_KEY, JSON.stringify({
      cajaAbierta,
      caja,
      cajaDiaAnterior,
      ts: Date.now()
    }));
  } catch (_) { /* ignore */ }
}

function limpiarCajaCache() {
  try { localStorage.removeItem(CAJA_CACHE_KEY); } catch (_) { /* ignore */ }
}

export function CajaProvider({ children }) {
  // Leer cache para tener estado inmediato en la primera carga
  const cache = leerCajaCache();

  const [cajaAbierta, setCajaAbierta] = useState(cache?.cajaAbierta || false);
  const [cajaActual, setCajaActual] = useState(cache?.caja || null);
  const [cajaDiaAnterior, setCajaDiaAnterior] = useState(cache?.cajaDiaAnterior || false);
  // Si hay cache, no mostrar loading (ya tenemos un estado válido)
  const [verificando, setVerificando] = useState(!cache);

  // Verificar estado de caja con el backend
  const verificarEstadoCaja = useCallback(async () => {
    try {
      // Solo mostrar loading si no hay cache
      if (!leerCajaCache()) setVerificando(true);

      const response = await fetchAuth(`${API_BASE_URL}/cajas/estado-empleado`);

      if (response.ok) {
        const data = await response.json();
        let esDiaAnterior = false;

        // Verificar si la caja es de un dia anterior
        // Comparar solo la parte YYYY-MM-DD del string ISO, sin conversión de timezone
        if (data.cajaAbierta && data.caja && data.caja.fecha_apertura) {
          const fechaAperturaStr = data.caja.fecha_apertura.split("T")[0]; // "2026-02-18"
          const hoy = new Date();
          const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
          esDiaAnterior = fechaAperturaStr !== hoyStr;
        }

        setCajaAbierta(data.cajaAbierta);
        setCajaActual(data.caja || null);
        setCajaDiaAnterior(esDiaAnterior);

        // Guardar en cache
        guardarCajaCache(data.cajaAbierta, data.caja || null, esDiaAnterior);
      } else {
        setCajaAbierta(false);
        setCajaActual(null);
        setCajaDiaAnterior(false);
        limpiarCajaCache();
      }
    } catch (error) {
      // Si falla el backend pero hay cache, mantener el estado del cache
      // Solo resetear si NO hay cache
      if (!leerCajaCache()) {
        setCajaAbierta(false);
        setCajaActual(null);
        setCajaDiaAnterior(false);
      }
    } finally {
      setVerificando(false);
    }
  }, []);

  // Abrir caja
  const abrirCaja = async (saldoInicial, observaciones = "") => {
    const response = await fetchAuth(`${API_BASE_URL}/cajas/abrir`, {
      method: "POST",
      body: JSON.stringify({
        saldo_inicial: parseFloat(saldoInicial),
        observaciones
      })
    });

    if (response.ok) {
      const caja = await response.json();
      setCajaAbierta(true);
      setCajaActual(caja);
      setCajaDiaAnterior(false);
      guardarCajaCache(true, caja, false);
      return caja;
    } else {
      const error = await response.text();
      throw new Error(error || "Error al abrir caja");
    }
  };

  // Cerrar caja
  const cerrarCaja = async (saldoFinal, observaciones = "") => {
    if (!cajaActual) throw new Error("No hay caja abierta");

    const response = await fetchAuth(`${API_BASE_URL}/cajas/${cajaActual.ID}/cerrar`, {
      method: "PUT",
      body: JSON.stringify({
        saldo_final: parseFloat(saldoFinal),
        observaciones
      })
    });

    if (response.ok) {
      const cajaCerrada = await response.json();
      setCajaAbierta(false);
      setCajaActual(null);
      setCajaDiaAnterior(false);
      limpiarCajaCache();
      return cajaCerrada;
    } else {
      const error = await response.text();
      throw new Error(error || "Error al cerrar caja");
    }
  };

  // Obtener reporte de caja
  const obtenerReporte = async (cajaId = null) => {
    const id = cajaId || (cajaActual ? cajaActual.ID : null);
    if (!id) throw new Error("No hay caja para obtener reporte");

    const response = await fetchAuth(`${API_BASE_URL}/cajas/${id}/reporte`);

    if (response.ok) {
      return await response.json();
    } else {
      throw new Error("Error al obtener reporte");
    }
  };

  // Verificar al montar el componente
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      verificarEstadoCaja();
    } else {
      setVerificando(false);
      limpiarCajaCache();
    }
  }, [verificarEstadoCaja]);

  return (
    <CajaContext.Provider value={{
      cajaAbierta,
      cajaActual,
      cajaDiaAnterior,
      verificando,
      verificarEstadoCaja,
      abrirCaja,
      cerrarCaja,
      obtenerReporte
    }}>
      {children}
    </CajaContext.Provider>
  );
}

export const useCaja = () => {
  const context = useContext(CajaContext);
  if (!context) {
    throw new Error("useCaja debe usarse dentro de un CajaProvider");
  }
  return context;
};

export default CajaContext;
