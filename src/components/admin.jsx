import React from 'react';
import { Container, Navbar, Button, Row, Col } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../assets/admin.css';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.jpeg';

const Admin = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    navigate('/');
  };

  const handleConsulta = () => {
    navigate('/consulta');
  };

  const handleUsuarios = () => {
    navigate('/usuarios');
  };

  const handleDocumentos = () => {
    navigate('/documentos'); // ✅ Redirige a la vista Documentos
  };

  return (
    <div className="admin-layout">
      {/* Header */}
      <Navbar expand="lg" className="admin-header">
        <Container fluid>
          <Navbar.Brand className="d-flex align-items-center">
            <img
              src={logo}
              alt="Logo de la empresa"
              width="40"
              height="40"
              className="d-inline-block align-top me-2"
            />
            <span className="admin-title">BIBLIOTECALFH</span>
          </Navbar.Brand>
          <Button onClick={handleLogout} className="logout-button">
            <i className="bi bi-box-arrow-right me-1"></i> Salir
          </Button>
        </Container>
      </Navbar>

      {/* Body con botones */}
      <Container fluid className="admin-content text-center">
        <Row className="justify-content-center mt-5">
          <Col xs="auto">
            <Button className="me-3" onClick={handleConsulta}>
              <i className="bi bi-search me-1"></i> Consulta
            </Button>
            <Button className="me-3" onClick={handleUsuarios}>
              <i className="bi bi-people me-1"></i> Usuarios
            </Button>
            <Button onClick={handleDocumentos}>
              <i className="bi bi-file-earmark-text me-1"></i> Documentos
            </Button>
          </Col>
        </Row>
      </Container>

      {/* Footer */}
      <footer className="admin-footer">
        <Container fluid>
          <Row className="py-3">
            <Col md={12} className="text-center">
              <p className="mb-0">© 2025 Farmacia Homeopática - Todos los derechos reservados</p>
            </Col>
          </Row>
        </Container>
      </footer>
    </div>
  );
};

export default Admin;
