import React, { useEffect, useState } from 'react';
import { Container, Navbar, Button, Row, Col, Card } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../assets/admin.css';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.jpeg';
import { useAuth } from '../context/AuthContext';

const Admin = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  // ====== Manejo de navegación ======
  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleConsulta = () => navigate('/consulta');
  const handleUsuarios = () => navigate('/usuarios');
  const handleDocumentos = () => navigate('/documentos');
  const handleVencimiento = () => navigate('/vencimiento-admin');
  const handleTrazabilidad = () => navigate('/trazabilidad');
  const handleLaboratoriosAdmin = () => navigate('/laboratoriosadmin'); // 🆕
  const handleBack = () => navigate(0); // recargar panel

  // ====== Reloj y fecha en vivo ======
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const horaFormateada = now.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const fechaFormateada = now.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // ====== Estilos ======
  const cardStyle = {
    border: '1px solid rgba(0,0,0,0.06)',
    borderRadius: 16,
    padding: 18,
    background: 'linear-gradient(180deg, #ffffff 0%, #f1f6fb 100%)',
    boxShadow: '0 6px 20px rgba(16,24,40,0.06)',
  };

  const iconWrap = (bg, color) => ({
    width: 46,
    height: 46,
    borderRadius: 12,
    background: bg,
    color,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 22,
  });

  return (
    <div className="admin-layout d-flex flex-column min-vh-100">
      {/* HEADER */}
      <Navbar expand="lg" className="admin-header">
        <Container fluid className="d-flex align-items-center justify-content-between">
          <Navbar.Brand className="d-flex align-items-center">
            <img
              src={logo}
              alt="Logo de la empresa"
              width="40"
              height="40"
              className="d-inline-block align-top me-2"
            />
            <span
              className="usuarios-title"
              role="link"
              style={{ cursor: 'pointer' }}
              title="Recargar panel de administración"
              onClick={handleBack}
            >
              BIBLIOTECALFH
            </span>
          </Navbar.Brand>

          <div className="d-flex align-items-center gap-3 ms-auto text-end">
            <div
              className="fw-bold d-block d-sm-none"
              style={{ color: 'white', fontSize: '0.85rem', lineHeight: '1.2' }}
            >
              <i className="bi bi-clock me-1"></i>
              {horaFormateada}
            </div>

            <div
              className="fw-bold d-none d-sm-block text-end"
              style={{ color: 'white', fontSize: '0.9rem', lineHeight: '1.2' }}
            >
              <div>{fechaFormateada}</div>
              <div>
                <i className="bi bi-clock me-1"></i>
                {horaFormateada}
              </div>
            </div>

            <Button onClick={handleLogout} className="logout-button">
              <i className="bi bi-box-arrow-right me-1"></i> Salir
            </Button>
          </div>
        </Container>
      </Navbar>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-grow-1">
        <Container className="py-4">
          <Row className="g-4">
            {/* Usuarios */}
            <Col xs={12} md={6} lg={3}>
              <Card className="border-0 h-100" style={cardStyle}>
                <Card.Body className="d-flex flex-column">
                  <div className="d-flex align-items-start mb-3">
                    <div style={iconWrap('rgba(13,110,253,0.12)', '#0d6efd')} className="me-3">
                      <i className="bi bi-people"></i>
                    </div>
                    <div>
                      <h5 className="mb-1">Usuarios</h5>
                      <div className="text-muted">Altas, permisos y administración</div>
                    </div>
                  </div>

                  <div className="text-muted mb-3" style={{ lineHeight: 1.6 }}>
                    Administra cuentas, roles y accesos del personal en la plataforma.
                  </div>

                  <div className="mt-auto d-flex justify-content-end">
                    <Button onClick={handleUsuarios} className="px-4">
                      Abrir <i className="bi bi-chevron-right ms-1"></i>
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            {/* Consulta */}
            <Col xs={12} md={6} lg={3}>
              <Card className="border-0 h-100" style={cardStyle}>
                <Card.Body className="d-flex flex-column">
                  <div className="d-flex align-items-start mb-3">
                    <div style={iconWrap('rgba(25,135,84,0.12)', '#198754')} className="me-3">
                      <i className="bi bi-search"></i>
                    </div>
                    <div>
                      <h5 className="mb-1">Consulta</h5>
                      <div className="text-muted">Gestión y búsqueda de productos</div>
                    </div>
                  </div>

                  <div className="text-muted mb-3" style={{ lineHeight: 1.6 }}>
                    Consulta, importa/exporta y actualiza el catálogo de productos.
                  </div>

                  <div className="mt-auto d-flex justify-content-end">
                    <Button onClick={handleConsulta} className="px-4">
                      Abrir <i className="bi bi-chevron-right ms-1"></i>
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            {/* Documentos */}
            <Col xs={12} md={6} lg={3}>
              <Card className="border-0 h-100" style={cardStyle}>
                <Card.Body className="d-flex flex-column">
                  <div className="d-flex align-items-start mb-3">
                    <div style={iconWrap('rgba(13,202,240,0.15)', '#0dcaf0')} className="me-3">
                      <i className="bi bi-file-earmark-text"></i>
                    </div>
                    <div>
                      <h5 className="mb-1">Documentos</h5>
                      <div className="text-muted">PDFs y material corporativo</div>
                    </div>
                  </div>

                  <div className="text-muted mb-3" style={{ lineHeight: 1.6 }}>
                    Sube, organiza y comparte documentos oficiales y de soporte.
                  </div>

                  <div className="mt-auto d-flex justify-content-end">
                    <Button onClick={handleDocumentos} className="px-4">
                      Abrir <i className="bi bi-chevron-right ms-1"></i>
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            {/* Vencimiento */}
            <Col xs={12} md={6} lg={3}>
              <Card className="border-0 h-100" style={cardStyle}>
                <Card.Body className="d-flex flex-column">
                  <div className="d-flex align-items-start mb-3">
                    <div style={iconWrap('rgba(255,193,7,0.18)', '#ffc107')} className="me-3">
                      <i className="bi bi-hourglass-split"></i>
                    </div>
                    <div>
                      <h5 className="mb-1">Vencimiento</h5>
                      <div className="text-muted">Productos próximos y vencidos</div>
                    </div>
                  </div>

                  <div className="text-muted mb-3" style={{ lineHeight: 1.6 }}>
                    Filtra y revisa lotes por fecha de vencimiento para acciones rápidas.
                  </div>

                  <div className="mt-auto d-flex justify-content-end">
                    <Button onClick={handleVencimiento} className="px-4">
                      Abrir <i className="bi bi-chevron-right ms-1"></i>
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            {/* 🆕 Trazabilidad */}
            <Col xs={12} md={6} lg={3}>
              <Card className="border-0 h-100" style={cardStyle}>
                <Card.Body className="d-flex flex-column">
                  <div className="d-flex align-items-start mb-3">
                    <div style={iconWrap('rgba(111,66,193,0.15)', '#6f42c1')} className="me-3">
                      <i className="bi bi-clipboard-data"></i>
                    </div>
                    <div>
                      <h5 className="mb-1">Trazabilidad</h5>
                      <div className="text-muted">Historial de acciones del sistema</div>
                    </div>
                  </div>

                  <div className="text-muted mb-3" style={{ lineHeight: 1.6 }}>
                    Consulta registros de modificaciones realizadas por usuarios administradores.
                  </div>

                  <div className="mt-auto d-flex justify-content-end">
                    <Button onClick={handleTrazabilidad} className="px-4">
                      Abrir <i className="bi bi-chevron-right ms-1"></i>
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            {/* 🆕 Laboratorios (admin) */}
            <Col xs={12} md={6} lg={3}>
              <Card className="border-0 h-100" style={cardStyle}>
                <Card.Body className="d-flex flex-column">
                  <div className="d-flex align-items-start mb-3">
                    <div style={iconWrap('rgba(0,163,224,0.15)', '#00A3E0')} className="me-3">
                      <i className="bi bi-droplet"></i>
                    </div>
                    <div>
                      <h5 className="mb-1">Laboratorios</h5>
                      <div className="text-muted">Crear, editar y eliminar laboratorios</div>
                    </div>
                  </div>

                  <div className="text-muted mb-3" style={{ lineHeight: 1.6 }}>
                    Gestiona el listado de laboratorios y sus imágenes para que se reflejen en el sitio.
                  </div>

                  <div className="mt-auto d-flex justify-content-end">
                    <Button onClick={handleLaboratoriosAdmin} className="px-4">
                      Abrir <i className="bi bi-chevron-right ms-1"></i>
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </main>

      {/* FOOTER */}
      <footer className="admin-footer">
        <Container fluid>
          <Row className="py-3">
            <Col md={12} className="text-center">
              <p className="mb-0">
                © 2025 La Farmacia Homeopática - Más alternativas, más servicio.
              </p>
            </Col>
          </Row>
        </Container>
      </footer>
    </div>
  );
};

export default Admin;
