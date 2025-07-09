// src/App.js
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './components/Login.jsx';
import Admin from './components/admin.jsx'; // Cambiado a mayúscula

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/admin" element={<Admin />} /> {/* Cambiado a mayúscula */}
      </Routes>
    </BrowserRouter>
  );
};

export default App;