import React, { useEffect } from 'react';
import '../assets/login.css';

const Login = () => {  // ¡Cambiado a "Login" con mayúscula!
 useEffect(() => {
  const script = document.createElement('script');
  script.src = 'https://static-bundles.visme.co/forms/vismeforms-embed.js';
  script.async = true;
  script.onload = () => {
    // Opcional: Forzar la renderización del formulario después de cargar el script
    console.log('Script de Visme cargado');
  };
  document.body.appendChild(script);

  return () => {
    // Limpieza: Remover el script al desmontar el componente
    document.body.removeChild(script);
  };
}, []);

  return (
    <div style={{
      margin: 0,
      height: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: '#f0f0f0',
    }}>
      <div
        className="visme_d"
        data-title="Webinar Registration Form"
        data-url="g7ddqxx0-untitled-project?fullPage=true"
        data-domain="forms"
        data-full-page="true"
        data-min-height="100vh"
        data-form-id="133190"
        style={{ height: '200px' }}
      ></div>
    </div>
  );
};

export default Login;  // ¡Exporta "Login" con mayúscula!