import React from 'react';
import { Container, Navbar, Nav, Button, Row, Col, Card } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../assets/admin.css';
import { useNavigate } from 'react-router-dom';

const Admin = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    navigate('/login');
  };

  return (
    <div className="admin-layout">
      {/* Header con botones */}
      <Navbar expand="lg" className="admin-header">
        <Container fluid>
          <Navbar.Brand href="#" className="d-flex align-items-center">
            <i className="bi bi-shield-lock me-2"></i>
            Panel Administrativo
          </Navbar.Brand>
          
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              <Nav.Link href="#" className="nav-button">Usuarios</Nav.Link>
              <Nav.Link href="#" className="nav-button">Productos</Nav.Link>
              <Nav.Link href="#" className="nav-button">Ventas</Nav.Link>
              <Nav.Link href="#" className="nav-button">Reportes</Nav.Link>
            </Nav>
            
            <Button 
              onClick={handleLogout}
              className="logout-button"
            >
              <i className="bi bi-box-arrow-right me-1"></i> Salir
            </Button>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      {/* Contenido Principal */}
      <Container fluid className="admin-content">
        <Row className="mt-4">
          <Col>
            <Card className="admin-card">
              <Card.Body>
                <h4>Bienvenido, Administrador</h4>
                <p>Selecciona una opción del menú superior.</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Footer */}
    <footer className="admin-footer">
  <Container fluid className="footer-container">
    {/* ... contenido del footer ... */}
  </Container>
</footer>
    </div>
  );
};

export default Admin;