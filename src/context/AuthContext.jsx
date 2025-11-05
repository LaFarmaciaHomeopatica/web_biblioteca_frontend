// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);

  // Carga inicial desde localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    const storedUsuario = localStorage.getItem('authUsuario');

    if (storedToken && storedUsuario) {
      setToken(storedToken);
      try {
        setUsuario(JSON.parse(storedUsuario));
      } catch {
        // Si por alguna razón el JSON está corrupto, lo limpiamos
        localStorage.removeItem('authUsuario');
      }
    }

    setLoading(false);
  }, []);

  // Login: guarda token/usuario y reinicia cronómetro de inactividad
  const login = (newToken, newUsuario) => {
    setToken(newToken);
    setUsuario(newUsuario);

    localStorage.setItem('authToken', newToken);
    localStorage.setItem('authUsuario', JSON.stringify(newUsuario));
    localStorage.setItem('lastActivity', String(Date.now())); // ← importante
  };

  // Logout: avisa al backend y limpia todo local (incluye lastActivity)
  const logout = async () => {
    try {
      const authToken = localStorage.getItem('authToken');
      await axios.post(
        `${process.env.REACT_APP_API_URL}/logout`,
        {},
        {
          headers: {
            Authorization: authToken ? `Bearer ${authToken}` : undefined,
            Accept: 'application/json',
          },
        }
      );
    } catch (error) {
      // Si el token ya expiró o hay error de red, igual limpiamos local
      // eslint-disable-next-line no-console
      console.error('Error al cerrar sesión en backend:', error);
    } finally {
      setToken(null);
      setUsuario(null);

      localStorage.removeItem('authToken');
      localStorage.removeItem('authUsuario');
      localStorage.removeItem('lastActivity'); // ← evita autologout inmediato tras re-login
    }
  };

  return (
    <AuthContext.Provider value={{ token, usuario, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
