import React, { createContext, useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import Admin from "./Admin";
import { Login } from "./pages/login";
import { SignUp } from "./pages/Registro";
import { getUsuario, cerrarSesionStorage } from "./funciones/auth";
import { limpiarFormulariosGuardados } from "./funciones/useSessionState";
import { CajaProvider } from "./funciones/CajaContext";
import { SucursalProvider } from "./context/SucursalContext";

export const NombreContexto = createContext();

export function App2() {
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const usuarioGuardado = getUsuario();
    if (usuarioGuardado) {
      setUsuario(usuarioGuardado);
    }
    setLoading(false);
  }, []);

  const iniciarSesion = (usuarioData) => {
    setUsuario(usuarioData);
  };

  const actualizarUsuario = (cambios) => {
    setUsuario((prev) => {
      const updated = { ...prev, ...cambios };
      import("./funciones/auth").then(({ setUsuario: saveUsuario }) => saveUsuario(updated));
      return updated;
    });
  };

  const cerrarSesion = () => {
    cerrarSesionStorage();
    limpiarFormulariosGuardados();
    setUsuario(null);
    window.location.href = "/";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Toaster richColors position="top-right" />
      <NombreContexto.Provider value={{ usuario, iniciarSesion, cerrarSesion, actualizarUsuario }}>
        {usuario ? (
          <SucursalProvider>
            <CajaProvider>
              <Admin />
            </CajaProvider>
          </SucursalProvider>
        ) : (
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/registro" element={<SignUp />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </NombreContexto.Provider>
    </BrowserRouter>
  );
}
