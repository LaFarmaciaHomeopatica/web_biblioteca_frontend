// src/App.js
import React from "react";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/protectedroute.jsx";

// Componentes
import Login from "./components/login.jsx";
import Admin from "./components/admin.jsx";
import Usuarios from "./components/usuarios.jsx";
import Consulta from "./components/consulta.jsx";
import Cliente from "./components/cliente.jsx";
import Documentos from "./components/documentos.jsx";
import Clientedoc from "./components/clientedoc.jsx";
import Vademecum from "./components/vademecum.jsx";
import Capacitacion from "./components/capacitacion.jsx";
import Laboratorios from "./components/laboratorios.jsx";
import LaboratoriosAdmin from "./components/laboratoriosadmin.jsx";
import ProductoPorLaboratorio from "./components/productoporlaboratorio.jsx";
import ProductoPorLaboratorios from "./components/productoporlaboratorios.jsx";

// 🔁 CAMBIO: antes Vencimiento
import RegistroSanitarioCliente from "./components/registrosanitariocliente.jsx";

import RegistroSanitario from "./components/registrosanitario.jsx"; // ✅ Admin (antes vencimientoadmin)
import Trazabilidad from "./components/trazabilidad.jsx";
import Modulomedico from "./components/modulomedico.jsx"; // Admin
import Modulomedicocliente from "./components/modulomedicocliente.jsx"; // ✅ Cliente (solo visualizar)

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
            <ProtectedRoute allowedRoles={["Administrador"]}>
              <Admin />
            </ProtectedRoute>
          }
        />

        <Route
          path="/trazabilidad"
          element={
            <ProtectedRoute allowedRoles={["Administrador"]}>
              <Trazabilidad />
            </ProtectedRoute>
          }
        />

        <Route
          path="/usuarios"
          element={
            <ProtectedRoute allowedRoles={["Administrador"]}>
              <Usuarios />
            </ProtectedRoute>
          }
        />

        <Route
          path="/consulta"
          element={
            <ProtectedRoute allowedRoles={["Administrador"]}>
              <Consulta />
            </ProtectedRoute>
          }
        />

        <Route
          path="/documentos"
          element={
            <ProtectedRoute allowedRoles={["Administrador"]}>
              <Documentos />
            </ProtectedRoute>
          }
        />

        {/* Laboratorios Admin */}
        <Route
          path="/laboratoriosadmin"
          element={
            <ProtectedRoute allowedRoles={["Administrador"]}>
              <LaboratoriosAdmin />
            </ProtectedRoute>
          }
        />

        {/* ✅ Registros Sanitarios (antes VencimientoAdmin)
            Mantengo la misma ruta para no romper navegación existente. */}
        <Route
          path="/Registro-sanitario"
          element={
            <ProtectedRoute allowedRoles={["Administrador"]}>
              <RegistroSanitario />
            </ProtectedRoute>
          }
        />

        {/* Módulo Médico (solo admin) */}
        <Route
          path="/modulomedico"
          element={
            <ProtectedRoute allowedRoles={["Administrador"]}>
              <Modulomedico />
            </ProtectedRoute>
          }
        />

        {/* ✅ Módulo Médico Cliente (SOLO Farmacéutico y visitador medico) */}
        <Route
          path="/modulomedico-cliente"
          element={
            <ProtectedRoute allowedRoles={["Farmacéutico", "visitador medico"]}>
              <Modulomedicocliente />
            </ProtectedRoute>
          }
        />

        {/* Rutas protegidas para roles de campo */}
        <Route
          path="/cliente"
          element={
            <ProtectedRoute allowedRoles={["Farmacéutico", "visitador medico"]}>
              <Cliente />
            </ProtectedRoute>
          }
        />

        <Route
          path="/clientedoc"
          element={
            <ProtectedRoute allowedRoles={["Farmacéutico", "visitador medico"]}>
              <Clientedoc />
            </ProtectedRoute>
          }
        />

        <Route
          path="/vademecum"
          element={
            <ProtectedRoute allowedRoles={["Farmacéutico", "visitador medico"]}>
              <Vademecum />
            </ProtectedRoute>
          }
        />

        <Route
          path="/laboratorios"
          element={
            <ProtectedRoute allowedRoles={["Farmacéutico", "visitador medico"]}>
              <Laboratorios />
            </ProtectedRoute>
          }
        />

        <Route
          path="/capacitacion"
          element={
            <ProtectedRoute allowedRoles={["Farmacéutico", "visitador medico"]}>
              <Capacitacion />
            </ProtectedRoute>
          }
        />

        <Route
          path="/productoporlaboratorio/:laboratorioNombre"
          element={
            <ProtectedRoute allowedRoles={["Farmacéutico", "visitador medico"]}>
              <ProductoPorLaboratorio />
            </ProtectedRoute>
          }
        />

        {/* ✅ CAMBIO: antes /vencimiento */}
        <Route
          path="/registrosanitariocliente"
          element={
            <ProtectedRoute allowedRoles={["Farmacéutico", "visitador medico"]}>
              <RegistroSanitarioCliente />
            </ProtectedRoute>
          }
        />

        <Route
          path="/productoporlaboratorios/:laboratorioNombre"
          element={
            <ProtectedRoute allowedRoles={["administrador"]}>
              <ProductoPorLaboratorios />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
};

export default App;
