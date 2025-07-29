import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function ProtectedRoute({ children, allowedRoles = [] }) {
  const { isAuthenticated, user } = useAuth();

  // No autenticado → redirige a login
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Si hay roles permitidos y el usuario no tiene uno válido → redirige a inicio
  if (
    allowedRoles.length > 0 &&
    (!user || !allowedRoles.includes(user.rol))
  ) {
    return <Navigate to="/" replace />;
  }

  return children;
}
