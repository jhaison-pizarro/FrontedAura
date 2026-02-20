import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { getToken, setToken, getUsuario, setUsuario as saveUsuario } from "../funciones/auth";
import { API_BASE_URL } from "../config";

const SucursalContext = createContext();

export function SucursalProvider({ children }) {
  const [sucursalActual, setSucursalActual] = useState(null);
  const [sucursales, setSucursales] = useState([]);
  const [cargando, setCargando] = useState(true);
  const fetchedRef = useRef(false);

  // Inicializar desde localStorage y fetch full sucursal data
  useEffect(() => {
    if (fetchedRef.current) return;
    const usuario = getUsuario();
    if (!usuario?.sucursal_id) {
      setCargando(false);
      return;
    }

    const sucId = usuario.sucursal_id;
    setSucursalActual({
      id: sucId,
      nombre: usuario.sucursal_nombre || "Sucursal",
    });
    setCargando(false);

    // Fetch full data
    const token = getToken();
    if (!token) return;
    fetchedRef.current = true;
    fetch(`${API_BASE_URL}/sucursales/${sucId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setSucursalActual({
            id: data.ID,
            nombre: data.nombre,
            direccion: data.direccion || "",
            telefono: data.telefono || "",
            regla_clientes: data.regla_clientes || "",
          });
        }
      })
  }, []);

  // Cargar lista de sucursales (solo para admin)
  const cargarSucursales = useCallback(async () => {
    try {
      const token = getToken();
      if (!token) return;

      const res = await fetch(`${API_BASE_URL}/sucursales`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setSucursales(data || []);
      }
    } catch (err) {
    }
  }, []);

  // Cambiar sucursal (genera nuevo JWT)
  const cambiarSucursal = useCallback(async (sucursalId) => {
    try {
      const token = getToken();
      if (!token) return false;

      const res = await fetch(`${API_BASE_URL}/auth/cambiar-sucursal`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sucursal_id: sucursalId }),
      });

      if (res.ok) {
        const data = await res.json();

        // Actualizar token
        setToken(data.token);

        // Actualizar usuario en localStorage
        const usuario = getUsuario();
        if (usuario) {
          usuario.sucursal_id = data.sucursal_id;
          usuario.sucursal_nombre = data.sucursal_nombre;
          saveUsuario(usuario);
        }

        // Fetch full sucursal data after switching
        try {
          const sucRes = await fetch(`${API_BASE_URL}/sucursales/${data.sucursal_id}`, {
            headers: { Authorization: `Bearer ${data.token}` },
          });
          if (sucRes.ok) {
            const sucData = await sucRes.json();
            setSucursalActual({
              id: sucData.ID,
              nombre: sucData.nombre,
              direccion: sucData.direccion || "",
              telefono: sucData.telefono || "",
              regla_clientes: sucData.regla_clientes || "",
            });
          } else {
            setSucursalActual({
              id: data.sucursal_id,
              nombre: data.sucursal_nombre,
            });
          }
        } catch {
          setSucursalActual({
            id: data.sucursal_id,
            nombre: data.sucursal_nombre,
          });
        }

        return true;
      }
      return false;
    } catch (err) {
      return false;
    }
  }, []);

  return (
    <SucursalContext.Provider
      value={{
        sucursalActual,
        sucursales,
        cargando,
        cargarSucursales,
        cambiarSucursal,
      }}
    >
      {children}
    </SucursalContext.Provider>
  );
}

export const useSucursal = () => {
  const context = useContext(SucursalContext);
  if (!context) {
    throw new Error("useSucursal debe usarse dentro de un SucursalProvider");
  }
  return context;
};

export default SucursalContext;
