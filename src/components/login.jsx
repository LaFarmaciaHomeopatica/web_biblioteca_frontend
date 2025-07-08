import React, { useState } from 'react';
import axios from 'axios';
import '../assets/login.css';
import imagenFondo from '../assets/22102024.png';  // Import de imagen

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await axios.post('http://localhost:8000/api/login', {
        email,
        password
      });

      localStorage.setItem('authToken', response.data.token);
      console.log('Login exitoso', response.data);
    } catch (err) {
      setError('Credenciales incorrectas');
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
            borderRadius: '10px'
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
