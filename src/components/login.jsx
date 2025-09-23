import React, { useState } from 'react';
import axios from 'axios';
import '../assets/login.css';
import { useNavigate } from 'react-router-dom';
import imagenFondo from '../assets/loginfotoo.webp';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || 'https://bibliotecalfh.com/api';

  const redirigirPorRol = (rol) => {
    if (rol === 'Administrador') {
      navigate('/admin');
    } else if (['Farmacéutico', 'Vendedor', 'visitador medico'].includes(rol)) {
      navigate('/cliente');
    } else {
      navigate('/');
    }
  };

  // Mensajes de error lindos y específicos
  const prettyError = (err) => {
    // Sin respuesta (timeout/offline/etc)
    if (!err?.response) return 'No hay conexión con el servidor. Intenta nuevamente.';

    const status = err.response.status;
    const rawMsg = String(err.response?.data?.message || '').toLowerCase();
    const errors = err.response?.data?.errors;

    // 422: validaciones de backend (ej. Laravel)
    if (status === 422 && errors) {
      if (errors.email?.length) return errors.email[0];
      if (errors.password?.length) return errors.password[0];
    }

    // 401: credenciales incorrectas
    if (status === 401) {
      if (rawMsg.includes('password') || rawMsg.includes('contrase')) {
        return 'Clave incorrecta.';
      }
      if (rawMsg.includes('email') || rawMsg.includes('correo') || rawMsg.includes('user')) {
        return 'Correo incorrecto.';
      }
      return 'Correo o clave incorrectos.';
    }

    // 404: endpoint no encontrado
    if (status === 404) {
      return 'El endpoint de login no se encontró. Revisa tu .env o la URL del backend.';
    }

    // 5xx o cualquier otro
    if (!rawMsg || rawMsg === 'server error') {
      return 'No pudimos iniciar sesión. Intenta nuevamente.';
    }
    return err.response?.data?.message || 'No pudimos iniciar sesión. Intenta nuevamente.';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await axios.post(`${API_URL}/login`, { email, password });
      const { token, user } = data;

      login(token, user);
      setEmail('');
      setPassword('');

      setTimeout(() => redirigirPorRol(user.rol), 800);
    } catch (err) {
      setError(prettyError(err));
      // eslint-disable-next-line no-console
      console.error('Error en el login:', err?.response?.data || err);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loader-container">
        <div className="loader-spinner"></div>
        <p className="loading-quote">
          “Cuidamos tu salud con ciencia y corazón.”
          <span className="loading-dot">.</span>
          <span className="loading-dot">.</span>
          <span className="loading-dot">.</span>
        </p>
      </div>
    );
  }

  return (
    <div className="login-layout">
      <div className="login-card">
        {/* === Globo de error flotante sobre TODA la tarjeta === */}
        {error && (
          <div className="error-layer">
            <div className="error-toast" role="alert" aria-live="assertive">
              <div className="error-icon">!</div>
              <div className="error-body">
                <div className="error-title">No pudimos iniciar sesión</div>
                <div className="error-msg">{error}</div>
              </div>
              <button
                type="button"
                className="error-cta"
                onClick={() => setError('')}
              >
                Entendido
              </button>
            </div>
          </div>
        )}

        <div className="login-image">
          <img src={imagenFondo} alt="Fondo" />
        </div>

        <div className="login-form">
          <h2 className="login-title">Iniciar Sesión</h2>

          {/* (dejamos el mensaje simple oculto por CSS) */}
          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="input-box">
              <input
                type="email"
                placeholder="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
              />
            </div>

            <div className="input-box password-box">
              <input
                type={showPwd ? 'text' : 'password'}
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                aria-label={showPwd ? 'Ocultar clave' : 'Mostrar clave'}
                className="pwd-toggle"
                onClick={() => setShowPwd((v) => !v)}
              >
                {/* ojito SVG inline para no depender de librerías */}
                {showPwd ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M10.58 10.59A3 3 0 0012 15a3 3 0 002.41-1.22M9.88 4.26A10.92 10.92 0 0112 4c5 0 9.27 3.11 11 7.5-.52 1.3-1.29 2.47-2.25 3.47M6.06 6.06C4.25 7.35 2.94 9.18 2 11.5c1.2 3 5.14 7.5 10 7.5 1.34 0 2.62-.25 3.79-.72" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M1 12C2.73 7.61 7 4.5 12 4.5s9.27 3.11 11 7.5c-1.73 4.39-6 7.5-11 7.5S2.73 16.39 1 12z" stroke="currentColor" strokeWidth="2" fill="none"/>
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" fill="none"/>
                  </svg>
                )}
              </button>
            </div>

            <button type="submit" className="btn-login">
              Ingresar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
