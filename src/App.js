// src/App.js
import React from 'react';
import { Routes, Route } from 'react-router-dom';
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
import LaboratoriosAdmin from './components/laboratoriosadmin.jsx'; // ✅ Nuevo import
import ProductoPorLaboratorio from './components/productoporlaboratorio.jsx';
import ProductoPorLaboratorios from './components/productoporlaboratorios.jsx';
import Vencimiento from './components/vencimiento.jsx';
import VencimientoAdmin from './components/vencimientoadmin.jsx';
import Trazabilidad from './components/trazabilidad.jsx';

const App = () => {
  return (
    <AuthProvider>
      <Routes>

        {/* Ruta pública */}
        <Route path="/" element={<Login />} />

        {/* Rutas protegidas para ADMIN */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['Administrador']}>
              <Admin />
            </ProtectedRoute>
          }
        />

        <Route
          path="/trazabilidad"
          element={
            <ProtectedRoute allowedRoles={['Administrador']}>
              <Trazabilidad />
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
          path="/documentos"
          element={
            <ProtectedRoute allowedRoles={['Administrador']}>
              <Documentos />
            </ProtectedRoute>
          }
        />

        {/* ✅ Nueva ruta Laboratorios Admin */}
        <Route
          path="/laboratoriosadmin"
          element={
            <ProtectedRoute allowedRoles={['Administrador']}>
              <LaboratoriosAdmin />
            </ProtectedRoute>
          }
        />

        {/* ✅ Vencimiento exclusivo para Admin */}
        <Route
          path="/vencimiento-admin"
          element={
            <ProtectedRoute allowedRoles={['Administrador']}>
              <VencimientoAdmin />
            </ProtectedRoute>
          }
        />

        {/* Rutas protegidas para roles de campo */}
        <Route
          path="/cliente"
          element={
            <ProtectedRoute allowedRoles={['Farmacéutico', 'Vendedor', 'visitador medico']}>
              <Cliente />
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

        <Route
          path="/productoporlaboratorios/:laboratorioNombre"
          element={
            <ProtectedRoute allowedRoles={['administrador']}>
              <ProductoPorLaboratorios />
            </ProtectedRoute>
          }
        />

        {/* ✅ Vencimiento para roles de campo */}
        <Route
          path="/vencimiento"
          element={
            <ProtectedRoute allowedRoles={['Farmacéutico', 'visitador medico']}>
              <Vencimiento />
            </ProtectedRoute>
          }
        />

      </Routes>
    </AuthProvider>
  );
};

export default App;
