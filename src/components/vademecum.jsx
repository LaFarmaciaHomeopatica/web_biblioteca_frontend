// src/components/Vademecum.jsx
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  Container, Navbar, Nav, Spinner, Button, Row, Col, Card, Form, InputGroup
} from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../assets/vademecum.css';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.jpeg';
import { useAuth } from '../context/AuthContext';

const API_BASE   = `${window.location.origin}/backend/api`; // ✅ base correcta para API
const FILE_PROXY = `${API_BASE}/documentos/stream`;          // ✅ proxy que sirve PDFs

// Normaliza texto para búsqueda (sin tildes, minúsculas)
const norm = (s) =>
  (s || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

// Normaliza una ruta y construye la URL del proxy (fuerza "documentos/" minúscula)
const buildProxyUrl = (ruta) => {
  if (!ruta) return null;
  let rel = String(ruta).trim().replace(/\\/g, '/');

  // quita prefijos comunes
  rel = rel.replace(/^public\//i, '');
  rel = rel.replace(/^storage\//i, '');
  rel = rel.replace(/^\//, '');

  // fuerza primer segmento a "documentos" (minúscula)
  if (/^(documentos|Documentos)\//.test(rel)) {
    rel = rel.replace(/^Documentos\//, 'documentos/');
  } else if (!/^documentos\//.test(rel)) {
    rel = `documentos/${rel}`;
  }

  return `${FILE_PROXY}?path=${encodeURIComponent(rel)}`;
};

const Vademecum = () => {
  const navigate = useNavigate();
  const { token, logout } = useAuth(); // ✅ usamos token del contexto

  const [documentos, setDocumentos] = useState([]); // docs del backend (categoría vademecum)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  // 🔎 búsqueda local por nombre
  const [searchTerm, setSearchTerm] = useState('');

  // Carga inicial
  useEffect(() => {
    fetchDocumentos(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Trae del backend SOLO la categoría "vademecum"
  const fetchDocumentos = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const auth = token || localStorage.getItem('authToken');
      if (!auth) {
        setError('No autorizado. Por favor, inicia sesión.');
        setLoading(false);
        return;
      }

      const { data } = await axios.get(`${API_BASE}/documentos`, {
        params: { page, search: 'vademecum' },
        headers: { Authorization: `Bearer ${auth}`, Accept: 'application/json' },
      });

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

  // Filtra en el cliente por nombre
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

  const handleGoToVencimiento = () => navigate('/vencimiento');
  const handleGoToLaboratorios = () => navigate('/laboratorios');
  const handleGoToVademecum = () => navigate('/vademecum');
  const handleGoToCapacitacion = () => navigate('/capacitacion');
  const handleGoToDocumentos = () => navigate('/clientedoc');
  const handleLogout = async () => { await logout(); navigate('/'); };

  return (
    <div className="vademecum-layout">
      {/* HEADER */}
      <Navbar expand="lg" className="vademecum-header" variant="dark">
        <Container fluid>
          <Navbar.Brand className="d-flex align-items-center">
            <img src={logo} alt="Logo" width="40" height="40" className="me-2" />
            <span
              className="vademecum-title"
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
      <Container fluid className="vademecum-content">
        <Row className="mt-4">
          <Col xs={12}>
            <Card className="vademecum-card">
              <Card.Body>
                <h2 className="vademecum-title-main mb-4 text-center text-md-start">
                  Documentos - Vademécum
                </h2>

                {/* 🔎 Barra de búsqueda local por nombre */}
                <Row className="g-3 align-items-end mb-3">
                  <Col xs={12} md={6} lg={5}>
                    <Form.Label className="fw-semibold">Buscar dentro de Vademécum:</Form.Label>
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

                {/* Lista de documentos (filtrados en cliente) */}
                <div className="product-list">
                  {docsFiltrados.length > 0 ? (
                    docsFiltrados.map((doc, index) => (
                      <div className="product-card" key={index}>
                        <div className="product-info">
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
                    !loading && <p className="text-center">No hay documentos de Vademécum</p>
                  )}
                </div>

                {/* Paginación del conjunto base (categoría vademecum) */}
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
                      {loading ? <Spinner animation="border" size="sm" /> : `${currentPage} / ${lastPage}`}
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
      <footer className="vademecum-footer">
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

export default Vademecum;
