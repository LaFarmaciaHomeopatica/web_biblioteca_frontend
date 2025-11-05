// src/api/api.js
import axios from "axios";

/**
 * BASE de la API:
 * - Usa REACT_APP_API_URL si está definida (producción/staging).
 * - Si no, cae a /backend/api relativo al dominio actual (útil en cPanel).
 *
 * Ejemplo .env:
 *   REACT_APP_API_URL=https://tu-dominio.com/backend/api
 */
const FALLBACK_BASE = `${window.location.origin}/backend/api`;
const API_BASE =
  (process.env.REACT_APP_API_URL && process.env.REACT_APP_API_URL.trim()) ||
  FALLBACK_BASE;

// Crea la instancia principal de Axios
const api = axios.create({
  baseURL: API_BASE,
  timeout: 20000, // 20s
  headers: {
    Accept: "application/json",
  },
});

// ===== Interceptor de REQUEST =====
// Inyecta automáticamente el token Bearer si existe en localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Útil para Laravel en algunos entornos
    config.headers["X-Requested-With"] = "XMLHttpRequest";
    return config;
  },
  (error) => Promise.reject(error)
);

// ===== Interceptor de RESPONSE =====
// Si el backend responde 401, limpia credenciales del front para evitar loops
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      // Limpieza local (opcional: tu AuthContext también lo hace)
      localStorage.removeItem("authToken");
      localStorage.removeItem("authUsuario"); // por si lo usas
      localStorage.removeItem("user");        // compatibilidad con otros módulos
      // NO navegamos aquí porque este módulo no conoce el router.
      // Deja que el componente que hizo la request maneje la redirección.
    }
    return Promise.reject(error);
  }
);

export default api;
export { API_BASE };
