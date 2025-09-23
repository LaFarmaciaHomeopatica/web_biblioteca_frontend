// src/components/protectedroute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ allowedRoles, children }) => {
  const { token, usuario, loading } = useAuth();

  // Mientras carga el token desde localStorage
  if (loading) {
    return <div>Cargando sesión...</div>; // aquí puedes poner un spinner
  }

  // Si no hay token o usuario después de cargar, redirige al login
  if (!token || !usuario) {
    return <Navigate to="/" replace />;
  }

  // Si hay usuario pero su rol no está permitido, lo manda al inicio
  if (allowedRoles && !allowedRoles.includes(usuario.rol)) {
    return <Navigate to="/" replace />;
  }

  // Si todo está bien, muestra el contenido protegido
  return children;
};
