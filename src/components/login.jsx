import React, { useState } from 'react';
import axios from 'axios';
import '../assets/login.css';
import { useNavigate } from 'react-router-dom';
import imagenFondo from '../assets/23102024-DSC04075.png';
import { useAuth } from '../context/AuthContext'; // ✅ Importa el hook de autenticación

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth(); // ✅ Accede al método de login del contexto

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const redirigirPorRol = (rol) => {
    if (rol === 'Administrador') {
      navigate('/admin');
    } else if (['Farmacéutico', 'Vendedor', 'visitador medico'].includes(rol)) {
      navigate('/cliente');
    } else {
      navigate('/');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('http://127.0.0.1:8000/api/login', {
        email,
        password,
      });

      const { token, user } = response.data;

      // ✅ Guarda en el contexto global (también guarda en localStorage internamente)
      login(token, user);

      setEmail('');
      setPassword('');

      setTimeout(() => {
        redirigirPorRol(user.rol);
      }, 1200);
    } catch (err) {
      setLoading(false);
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Ocurrió un error inesperado.');
      }
      console.error('Error en el login:', err);
    }
  };

  // ✅ Pantalla de carga personalizada
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

  // ✅ Formulario de login
  return (
    <div className="login-layout">
      <div className="login-card">
        <div className="login-image">
          <img src={imagenFondo} alt="Fondo" />
        </div>

        <div className="login-form">
          <h2 className="login-title">Iniciar Sesión</h2>
          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="input-box">
              <input
                type="email"
                placeholder="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="input-box">
              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
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
