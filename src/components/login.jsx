import React, { useState } from 'react';
import '../assets/Login.css';
import imagenFondo from '../assets/22102024.png';

// Agregar Bootstrap vía CDN
const BootstrapLink = () => (
  <link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css"
    integrity="sha384-ENjdO4Dr2bkBIFxQpeoZ4xM1Q72v1W2N9mZ91r5HbWnB3jJE6M/tA7apgUOHh9xk"
    crossOrigin="anonymous"
  />
);

const Login = () => {
  const [isRegistering, setIsRegistering] = useState(false);

  return (
    <>
      <BootstrapLink />
      <div className={`container ${isRegistering ? 'active' : ''}`}>
        <div className="form-box login">
          <form>
            <h1>Iniciar Sesión</h1>
            <div className="input-box mb-3">
              <input
                type="email"
                className="form-control"
                placeholder="Correo"
                required
              />
            </div>
            <div className="input-box mb-3">
              <input
                type="password"
                className="form-control"
                placeholder="Contraseña"
                required
              />
            </div>
            <button className="btn" type="submit">
              Ingresar
            </button>
            <p className="forgot-link mt-3">
            </p>
          </form>
        </div>

        

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
          <div className="toggle-panel toggle-left text-center">
            <h1>Bienvenido de nuevo</h1>
            <p>¿Ya tienes cuenta? Inicia sesión aquí.</p>
            <button
              className="btn"
              onClick={() => setIsRegistering(false)}
              type="button"
            >
              Iniciar Sesión
            </button>
          </div>
          <div className="toggle-panel toggle-right text-center">
            <h1>¡Hola!</h1>
            <p>¿Eres nuevo? Regístrate aquí.</p>
            <button
              className="btn"
              onClick={() => setIsRegistering(true)}
              type="button"
            >
              Registrarse
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;
