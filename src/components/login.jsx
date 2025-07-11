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

  // Aquí defines la función redirigirPorRol
  const redirigirPorRol = (rol) => {
    if (rol === 'Administrador') {
      navigate('/admin'); // ruta para admin
    } else if (rol === 'Farmacéutico') {
      navigate('/cliente');
    } else if (rol === 'Vendedor') {
      navigate('/cliente');
    } else {
      navigate('/');  // ruta genérica o error
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

      // Rediriges según rol
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
    <div className="container">
      {/* Imagen de fondo */}
      <div className="toggle-box">
        <img
          src={imagenFondo}
          alt="Fondo de login"
          className="imagen-fondo"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: '1px'
          }}
        />
      </div>

      {/* Formulario */}
      <div className="form-box">
        <form onSubmit={handleSubmit}>
          <h2>Iniciar Sesión</h2>
          {error && <div className="error-message">{error}</div>}
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
          <button type="submit" className="btn">Ingresar</button>
        </form>
      </div>
    </div>
  );
};

export default Login;
