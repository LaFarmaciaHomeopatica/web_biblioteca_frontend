import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    const storedUsuario = localStorage.getItem('authUsuario');

    if (storedToken && storedUsuario) {
      setToken(storedToken);
      setUsuario(JSON.parse(storedUsuario));
    }

    setLoading(false);
  }, []);

  const login = (token, usuario) => {
    setToken(token);
    setUsuario(usuario);
    localStorage.setItem('authToken', token);
    localStorage.setItem('authUsuario', JSON.stringify(usuario));
  };

  const logout = async () => {
    try {
await axios.post('http://127.0.0.1:8000/api/logout', {}, {
  headers: {
    Authorization: `Bearer ${localStorage.getItem('authToken')}`,
  },
});
    } catch (error) {
      console.error('Error al cerrar sesión en backend:', error);
    }

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
