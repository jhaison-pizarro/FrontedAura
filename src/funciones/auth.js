// Funciones de autenticación y fetch con JWT

import { API_BASE_URL } from "../config";

// Obtener token del localStorage
export function getToken() {
  return localStorage.getItem("token");
}

// Guardar token en localStorage
export function setToken(token) {
  localStorage.setItem("token", token);
}

// Eliminar token
export function removeToken() {
  localStorage.removeItem("token");
}

// Guardar datos del usuario
export function setUsuario(usuario) {
  localStorage.setItem("usuario", JSON.stringify(usuario));
}

// Obtener datos del usuario
export function getUsuario() {
  const usuario = localStorage.getItem("usuario");
  if (!usuario || usuario === "undefined" || usuario === "null") {
    return null;
  }
  try {
    return JSON.parse(usuario);
  } catch (e) {
    return null;
  }
}

// Eliminar datos del usuario
export function removeUsuario() {
  localStorage.removeItem("usuario");
}

// Cerrar sesión completa
export function cerrarSesionStorage() {
  removeToken();
  removeUsuario();
}

// Fetch con autenticación JWT
export async function fetchAuth(url, options = {}) {
  const token = getToken();

  const headers = {
    ...options.headers,
  };

  // Solo agregar Authorization si hay token
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Solo agregar Content-Type si no es FormData
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Si el token expiró o es inválido, cerrar sesión
  if (response.status === 401) {
    const errorData = await response.json().catch(() => ({}));
    if (errorData.error && errorData.error.includes("Token")) {
      cerrarSesionStorage();
      window.location.href = "/";
    }
  }

  return response;
}

// Versión de axios con autenticación
export function getAuthHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export { API_BASE_URL };
