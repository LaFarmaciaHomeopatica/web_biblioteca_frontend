import React, { useState } from 'react';
import axios from 'axios';
import '../assets/login.css'; // Mantén tu estilo base aquí
import { useNavigate } from 'react-router-dom';
import imagenFondo from '../assets/23102024-DSC04075.png';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false); // Estado de carga

  // Redirige según el rol del usuario
  const redirigirPorRol = (rol) => {
    if (rol === 'Administrador') {
      navigate('/admin');
    } else if (['Farmacéutico', 'Vendedor', 'visitador medico'].includes(rol)) {
      navigate('/cliente');
    } else {
      navigate('/');
    }
  };

  // Maneja el envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true); // Activa pantalla de carga

    try {
      const response = await axios.post('http://127.0.0.1:8000/api/login', {
        email,
        password,
      });

      localStorage.setItem('authToken', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      setEmail('');
      setPassword('');

      // Simula una pequeña pausa visual antes de redirigir
      setTimeout(() => {
        redirigirPorRol(response.data.user.rol);
      }, 1200); // 1.2 segundos

    } catch (err) {
      setLoading(false); // Detiene carga si hay error
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Ocurrió un error inesperado.');
      }
      console.error('Error en el login:', err);
    }
  };

  // PANTALLA DE CARGA personalizada
if (loading) {
  return (
    <div className="loader-container">
      <div className="loader-spinner"></div>
      <p className="loading-quote">“Cuidamos tu salud con ciencia y corazón.”
        <span className="loading-dot">.</span>
        <span className="loading-dot">.</span>
        <span className="loading-dot">.</span>
      </p>
    </div>
  );
}


  // FORMULARIO DE LOGIN
  return (
    <div className="login-layout">
      <div className="login-card">
        {/* Imagen de fondo al costado */}
        <div className="login-image">
          <img src={imagenFondo} alt="Fondo" />
        </div>

        {/* Formulario */}
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

            <button type="submit" className="btn-login">Ingresar</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;


