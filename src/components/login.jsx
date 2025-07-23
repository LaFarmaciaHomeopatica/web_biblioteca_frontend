import React, { useState } from 'react';
import axios from 'axios';
import '../assets/login.css';
import { useNavigate } from 'react-router-dom';
import imagenFondo from '../assets/23102024-DSC04075.png';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

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

    try {
      const response = await axios.post('http://127.0.0.1:8000/api/login', { email, password });

      localStorage.setItem('authToken', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      setEmail('');
      setPassword('');

      redirigirPorRol(response.data.user.rol);

    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('Ocurrió un error inesperado.');
      }
      console.error('Error en el login:', err);
    }
  };

  return (
    <div className="login-layout">
      <div className="login-card">
        {/* Imagen (siempre visible) */}
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
