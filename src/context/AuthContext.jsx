import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true); // 👈 Importante para evitar flicker en rutas

  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    const storedUsuario = localStorage.getItem('authUsuario');

    if (storedToken && storedUsuario) {
      setToken(storedToken);
      setUsuario(JSON.parse(storedUsuario));
    }

    setLoading(false); // 👈 Ya cargó
  }, []);

  const login = (token, usuario) => {
    setToken(token);
    setUsuario(usuario);
    localStorage.setItem('authToken', token);
    localStorage.setItem('authUsuario', JSON.stringify(usuario));
  };

  const logout = () => {
    setToken(null);
    setUsuario(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUsuario');
  };

  return (
    <AuthContext.Provider value={{ token, usuario, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
