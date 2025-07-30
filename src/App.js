// src/App.js
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/protectedroute.jsx";

// Componentes
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
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* Ruta pública */}
          <Route path="/" element={<Login />} />

          {/* Rutas protegidas por rol */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['Administrador']}>
                <Admin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/usuarios"
            element={
              <ProtectedRoute allowedRoles={['Administrador']}>
                <Usuarios />
              </ProtectedRoute>
            }
          />
          <Route
            path="/consulta"
            element={
              <ProtectedRoute allowedRoles={['Administrador']}>
                <Consulta />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cliente"
            element={
              <ProtectedRoute allowedRoles={['Farmacéutico', 'Vendedor', 'visitador medico']}>
                <Cliente />
              </ProtectedRoute>
            }
          />
          <Route
            path="/documentos"
            element={
              <ProtectedRoute allowedRoles={['Administrador']}>
                <Documentos />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clientedoc"
            element={
              <ProtectedRoute allowedRoles={['Farmacéutico', 'Vendedor', 'visitador medico']}>
                <Clientedoc />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vademecum"
            element={
              <ProtectedRoute allowedRoles={['Farmacéutico', 'Vendedor', 'visitador medico']}>
                <Vademecum />
              </ProtectedRoute>
            }
          />
          <Route
            path="/laboratorios"
            element={
              <ProtectedRoute allowedRoles={['Farmacéutico', 'Vendedor', 'visitador medico']}>
                <Laboratorios />
              </ProtectedRoute>
            }
          />
          <Route
            path="/capacitacion"
            element={
              <ProtectedRoute allowedRoles={['Farmacéutico', 'Vendedor', 'visitador medico']}>
                <Capacitacion />
              </ProtectedRoute>
            }
          />
          <Route
            path="/productoporlaboratorio/:laboratorioNombre"
            element={
              <ProtectedRoute allowedRoles={['Farmacéutico', 'Vendedor', 'visitador medico']}>
                <ProductoPorLaboratorio />
              </ProtectedRoute>
            }
          />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
