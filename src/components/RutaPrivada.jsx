// src/components/RutaPrivada.jsx
import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import { NombreContexto } from "../App2";

/**
 * roles: array de strings con roles permitidos, ej: ["Administrador","Vendedor"]
 * Si roles = [] o no se pasa, se permite el acceso (útil para rutas públicas dentro del admin).
 */
export function RutaPrivada({ children, roles = [] }) {
  const { usuario } = useContext(NombreContexto);

  // Si no hay usuario, redirige al login
  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  // Si no se especificaron roles, cualquier usuario autenticado entra
  if (roles.length === 0) {
    return children;
  }

  // Normalizar roles (para evitar problemas de mayúsculas/minúsculas)
  const userRole = (usuario.perfil || "").toString().toLowerCase();
  const allowed = roles.map((r) => r.toLowerCase()).includes(userRole);

  if (!allowed) {
    // Usuario autenticado pero sin permiso → redirigir a una página segura
    return <Navigate to="/principal" replace />;
  }

  return children; // ✅ Usuario permitido
}

export default RutaPrivada;
