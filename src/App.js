// src/App.js
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './components/Login.jsx';
import Admin from './components/admin.jsx';
import Usuarios from './components/usuarios.jsx';
import Consulta from './components/consulta.jsx';
import Cliente from './components/cliente.jsx';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/usuarios" element={<Usuarios />} /> 
        <Route path="/consulta" element={<Consulta />} />
        <Route path="/cliente" element={<Cliente />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;