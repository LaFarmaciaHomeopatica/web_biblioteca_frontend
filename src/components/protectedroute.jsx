// src/components/protectedroute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ allowedRoles, children }) => {
  const { token, usuario, loading } = useAuth();

  if (loading) return <div>Cargando sesión...</div>;

  if (!token || !usuario) {
    return <Navigate to="/" replace />;
  }

  if (!allowedRoles.includes(usuario.rol)) {
    return <Navigate to="/" replace />;
  }

  return children;
};
