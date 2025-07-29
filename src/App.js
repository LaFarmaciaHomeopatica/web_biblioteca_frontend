// src/App.js
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// ✅ Importación de componentes
import Login from './components/login.jsx';
import Admin from './components/admin.jsx';
import Usuarios from './components/usuarios.jsx';
import Consulta from './components/consulta.jsx';
import Cliente from './components/cliente.jsx';
import Documentos from './components/documentos.jsx'; 
import Clientedoc from './components/clientedoc.jsx'; 
import Vademecum from './components/vademecum.jsx'; 
import Capacitacion from './components/capacitacion.jsx';
import Laboratorios from './components/laboratorios.jsx';
import ProductoPorLaboratorio from './components/productoporlaboratorio.jsx';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* ✅ Rutas principales */}
        <Route path="/" element={<Login />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/usuarios" element={<Usuarios />} /> 
        <Route path="/consulta" element={<Consulta />} />
        <Route path="/cliente" element={<Cliente />} />
        <Route path="/documentos" element={<Documentos />} />
        <Route path="/clientedoc" element={<Clientedoc />} />
        <Route path="/vademecum" element={<Vademecum />} />
        <Route path="/laboratorios" element={<Laboratorios />} /> 
        <Route path="/capacitacion" element={<Capacitacion />} /> 
        
        {/* ✅ Ruta dinámica para productos filtrados por laboratorio */}
        <Route path="/productoporlaboratorio/:laboratorioNombre" element={<ProductoPorLaboratorio />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
