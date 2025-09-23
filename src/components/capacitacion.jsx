// src/components/Capacitacion.jsx
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  Container, Navbar, Nav, Button, Row, Col, Card, Spinner, Form, InputGroup
} from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../assets/capacitacion.css';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.jpeg';
import { useAuth } from '../context/AuthContext';

const API_BASE = `${window.location.origin}/backend/api`; // ✅ backend publicado
const FILE_PROXY = `${API_BASE}/documentos/stream`;        // ✅ proxy para PDFs

// Normaliza texto para búsqueda (sin tildes, minúsculas)
const norm = (s) =>
  (s || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

// Normaliza una ruta y construye la URL del proxy
const buildProxyUrl = (ruta) => {
  if (!ruta) return null;
  let rel = String(ruta).trim().replace(/\\/g, '/');
  // quitar prefijos comunes
  rel = rel.replace(/^public\//i, '');
  rel = rel.replace(/^storage\//i, '');
  rel = rel.replace(/^\//, '');

  // forzar primer segmento a "documentos" (minúscula)
  if (/^(documentos|Documentos)\//.test(rel)) {
    rel = rel.replace(/^Documentos\//, 'documentos/');
  } else if (!/^documentos\//.test(rel)) {
    rel = `documentos/${rel}`;
  }

  return `${FILE_PROXY}?path=${encodeURIComponent(rel)}`;
};

const Capacitacion = () => {
  const navigate = useNavigate();
  const { token, logout } = useAuth();

  const [documentos, setDocumentos] = useState([]);   // docs de la página (servidor)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  // 🔎 barra de búsqueda (filtra por nombre en el cliente)
  const [searchTerm, setSearchTerm] = useState('');

  // Carga inicial
  useEffect(() => {
    fetchDocumentos(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cargar desde backend solo la categoría "capacitacion"
  const fetchDocumentos = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      if (!token) {
        setError('No autorizado. Por favor, inicia sesión.');
        setLoading(false);
        return;
      }

      const { data } = await axios.get(
        `${API_BASE}/documentos`,
        {
          params: { page, search: 'capacitacion' },
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
        }
      );

      const items = Array.isArray(data?.data) ? data.data : [];
      setDocumentos(items);
      setCurrentPage(Number(data?.current_page) || page);
      setLastPage(Number(data?.last_page) || 1);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error al cargar documentos:', err?.response?.data || err);
      setError(err?.response?.data?.message || 'Error al cargar los documentos');
    } finally {
      setLoading(false);
    }
  };

  // Resultado filtrado en el cliente por nombre
  const docsFiltrados = useMemo(() => {
    const q = norm(searchTerm);
    if (!q) return documentos;
    return documentos.filter((doc) => norm(doc?.nombre).includes(q));
  }, [documentos, searchTerm]);

  const handleOpenDoc = (doc) => {
    const url = buildProxyUrl(doc?.ruta);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      alert('El documento no tiene un archivo disponible.');
    }
  };

  const handleGoToCapacitacion = () => navigate('/capacitacion');
  const handleGoToVademecum   = () => navigate('/vademecum');
  const handleGoToDocumentos  = () => navigate('/clientedoc');
  const handleGoToLaboratorios= () => navigate('/laboratorios');
  const handleGoToVencimiento = () => navigate('/vencimiento');

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="capacitacion-layout">
      {/* HEADER */}
      <Navbar expand="lg" className="capacitacion-header" variant="dark">
        <Container fluid>
          <Navbar.Brand className="d-flex align-items-center">
            <img src={logo} alt="Logo" width="40" height="40" className="me-2" />
            <span
              className="capacitacion-title"
              role="link"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate('/cliente')}
              title="Ir a Productos"
            >
              BIBLIOTECALFH
            </span>
          </Navbar.Brand>

          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="ms-auto d-flex flex-column flex-lg-row gap-2 mt-3 mt-lg-0">
              <Button onClick={handleGoToVencimiento}>
                <i className="bi bi-hourglass-split me-1"></i> Vencimiento
              </Button>
              <Button onClick={handleGoToLaboratorios}>
                <i className="bi bi-droplet me-1"></i> Laboratorios
              </Button>
              <Button onClick={handleGoToVademecum}>
                <i className="bi bi-book me-1"></i> Vademécum
              </Button>
              <Button onClick={handleGoToCapacitacion}>
                <i className="bi bi-mortarboard me-1"></i> Capacitación
              </Button>
              <Button onClick={handleGoToDocumentos}>
                <i className="bi bi-file-earmark-text me-1"></i> Documentos
              </Button>
              <Button onClick={() => navigate('/cliente')} variant="secondary">
                <i className="bi bi-box-seam me-1"></i> Productos
              </Button>
              <Button onClick={handleLogout} className="logout-button" variant="danger">
                <i className="bi bi-box-arrow-right me-1"></i> Salir
              </Button>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      {/* CONTENIDO */}
      <Container fluid className="capacitacion-content">
        <Row className="mt-4">
          <Col xs={12}>
            <Card className="capacitacion-card">
              <Card.Body>
                <h2 className="capacitacion-title-main mb-4 text-center text-md-start">
                  Documentos - Capacitación
                </h2>

                {/* 🔎 Barra de búsqueda (filtra por nombre dentro de la categoría) */}
                <Row className="g-3 align-items-end mb-3">
                  <Col xs={12} md={6} lg={5}>
                    <Form.Label className="fw-semibold">Buscar dentro de Capacitación:</Form.Label>
                    <InputGroup>
                      <Form.Control
                        type="text"
                        placeholder="Escribe el nombre del documento…"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      {searchTerm && (
                        <Button
                          variant="outline-secondary"
                          onClick={() => setSearchTerm('')}
                          title="Limpiar"
                        >
                          <i className="bi bi-x-lg" />
                        </Button>
                      )}
                    </InputGroup>
                  </Col>
                </Row>

                {loading && (
                  <div className="text-center mb-3">
                    <Spinner animation="border" size="sm" className="me-2" />
                    Cargando documentos...
                  </div>
                )}
                {error && <div className="alert alert-danger">{error}</div>}

                <div className="document-list">
                  {docsFiltrados.length > 0 ? (
                    docsFiltrados.map((doc, index) => (
                      <div className="document-card" key={index}>
                        <div className="document-info">
                          <p><strong>Nombre:</strong> {doc?.nombre ?? '-'}</p>
                        </div>
                        <div className="card-actions">
                          <Button
                            variant="primary"
                            size="sm"
                            className="btn-ver"
                            onClick={() => handleOpenDoc(doc)}
                          >
                            Ver
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    !loading && <p className="text-center">No hay documentos de Capacitación</p>
                  )}
                </div>

                {/* Paginación (del conjunto base Capacitacion) */}
                {lastPage > 1 && (
                  <div className="pagination-wrapper mt-3 d-flex justify-content-center">
                    <button
                      className="pagination-btn"
                      onClick={() => fetchDocumentos(currentPage - 1)}
                      disabled={currentPage === 1 || loading}
                    >
                      <i className="bi bi-chevron-left"></i>
                    </button>
                    <span className="pagination-info">
                      {loading ? (
                        <Spinner animation="border" size="sm" />
                      ) : (
                        `${currentPage} / ${lastPage}`
                      )}
                    </span>
                    <button
                      className="pagination-btn"
                      onClick={() => fetchDocumentos(currentPage + 1)}
                      disabled={currentPage === lastPage || loading}
                    >
                      <i className="bi bi-chevron-right"></i>
                    </button>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* FOOTER */}
      <footer className="capacitacion-footer">
        <Container fluid>
          <Row className="py-3">
            <Col md={12} className="text-center">
              <p className="mb-0">© 2025 La Farmacia Homeopática - Más alternativas, más servicio.</p>
            </Col>
          </Row>
        </Container>
      </footer>
    </div>
  );
};

export default Capacitacion;
