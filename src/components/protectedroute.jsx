// src/components/protectedroute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Uso:
 * <ProtectedRoute allowedRoles={['Administrador','Farmacéutico']}>
 *   <Componente />
 * </ProtectedRoute>
 *
 * - Normaliza roles (trim + lower-case) para comparar.
 * - Si no está autenticado => redirige a "/".
 * - Si no tiene rol permitido => redirige a "/".
 * - Si allowedRoles no se pasa o está vacío => permite el acceso.
 */
export const ProtectedRoute = ({ allowedRoles = [], children }) => {
  const { token, usuario, loading } = useAuth();

  // Mientras carga el estado de auth (ej. leyendo localStorage)
  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando sesión…</div>;
  }

  // No autenticado
  if (!token || !usuario) {
    return <Navigate to="/" replace />;
  }

  // Normalizar rol del usuario (acepta usuario.rol o usuario.role)
  const userRoleRaw = usuario?.rol ?? usuario?.role ?? '';
  const userRoleNorm = String(userRoleRaw).trim().toLowerCase();

  // Normalizar lista de roles permitidos
  const allowedNorm = (allowedRoles || []).map(r => String(r).trim().toLowerCase());

  // Si hay restricciones y el rol no está incluido, negar acceso
  if (allowedNorm.length > 0 && !allowedNorm.includes(userRoleNorm)) {
    return <Navigate to="/" replace />;
  }

  // Autorizado
  return children;
};
