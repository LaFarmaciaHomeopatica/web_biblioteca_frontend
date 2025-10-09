// src/components/clientedoc.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
  Container, Navbar, Nav, Button, Row, Col, Card, Form, Spinner, Modal, InputGroup
} from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../assets/clientedoc.css';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.jpeg';
import { useAuth } from '../context/AuthContext';

/* =========================
   API / ORIGEN
   ========================= */
const ORIGIN = window.location.origin;
// Usa REACT_APP_API_URL si existe; si no, /backend/api en tu dominio
const API_BASE = process.env.REACT_APP_API_URL || `${ORIGIN}/backend/api`;
// Endpoint proxy en backend (sirve desde Storage::disk('public'))
const FILE_PROXY = `${API_BASE}/documentos/stream`;

/* =========================
   Helpers para construir URL del proxy
   ========================= */
// Elige la mejor "ruta" del doc desde posibles campos
const pickRuta = (doc) => {
  const keys = ['ruta', 'path', 'archivo', 'file_path', 'storage_path'];
  for (const k of keys) {
    if (typeof doc?.[k] === 'string' && doc[k].trim()) return String(doc[k]).trim();
  }
  return '';
};

// Normaliza a "documentos/..." (minúscula) y arma la URL del proxy
const buildProxyUrl = (rawRuta) => {
  if (!rawRuta) return null;

  let rel = String(rawRuta).trim().replace(/\\/g, '/'); // backslashes -> slashes
  rel = rel.replace(/^public\//i, '');                  // quita public/
  rel = rel.replace(/^storage\//i, '');                 // quita storage/ (disk('public') no lo usa)
  rel = rel.replace(/^\//, '');                         // quita primer /

  // Asegura que arranque con 'documentos/' en minúscula
  if (/^Documentos\//.test(rel)) {
    rel = rel.replace(/^Documentos\//, 'documentos/');
  } else if (!/^documentos\//.test(rel)) {
    rel = `documentos/${rel}`;
  }

  return `${FILE_PROXY}?path=${encodeURIComponent(rel)}`;
};

/** axios preconfigurado */
const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { Accept: 'application/json' },
});
api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem('authToken');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

const Clientedoc = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [documentos, setDocumentos] = useState([]);
  const [loading, setLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  const [errorModal, setErrorModal] = useState({
    show: false, title: '', message: '', list: [], meta: null
  });
  const openErrorModal = (title, message, list = [], meta = null) =>
    setErrorModal({ show: true, title, message, list, meta });
  const closeErrorModal = () =>
    setErrorModal({ show: false, title: '', message: '', list: [], meta: null });

  const cancelTokenSourceRef = useRef(null);

  /* =========================
     Listar documentos
     ========================= */
  const fetchDocumentos = useCallback(
    async (page = 1, term = '') => {
      if (cancelTokenSourceRef.current) {
        cancelTokenSourceRef.current.cancel('Cancelado por nueva solicitud');
      }
      cancelTokenSourceRef.current = axios.CancelToken.source();

      setLoading(true);

      try {
        const cleanTerm = (term || '').trim();
        const { data } = await api.get('/documentos', {
          params: {
            page,
            ...(cleanTerm ? { search: cleanTerm } : {}),
          },
          cancelToken: cancelTokenSourceRef.current.token
        });

        setDocumentos(Array.isArray(data?.data) ? data.data : []);
        setCurrentPage(data?.current_page ?? page);
        setLastPage(data?.last_page ?? 1);
      } catch (err) {
        if (!axios.isCancel(err)) {
          const msg = err?.response?.data?.message || err?.message || 'Error al cargar los documentos';
          openErrorModal('No se pudo cargar', msg);
          console.error('Clientedoc API error:', err?.response?.data || err);
        }
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchDocumentos(1, '');
    return () => {
      if (cancelTokenSourceRef.current) {
        cancelTokenSourceRef.current.cancel('Componente desmontado');
      }
    };
  }, [fetchDocumentos]);

  // Debounce de búsqueda
  useEffect(() => {
    const id = setTimeout(() => {
      setCurrentPage(1);
      fetchDocumentos(1, searchTerm);
    }, 400);
    return () => clearTimeout(id);
  }, [searchTerm, fetchDocumentos]);

  /* =========================
     Abrir documento (Ver) — SIEMPRE por proxy para máxima rapidez
     ========================= */
  const handleOpenDoc = (doc) => {
    try {
      // Si el backend ya entrega una URL absoluta válida, úsala:
      if (doc?.url && /^https?:\/\//i.test(doc.url)) {
        window.open(doc.url, '_blank', 'noopener,noreferrer');
        return;
      }

      const ruta = pickRuta(doc);
      const url = buildProxyUrl(ruta);

      if (!url) {
        openErrorModal('Ruta inválida', 'El documento no tiene una ruta válida para abrir.');
        return;
      }

      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      openErrorModal('Error al abrir', e?.message || 'No se pudo abrir el documento.');
    }
  };

  /* =========================
     Navegación cabecera
     ========================= */
  const go = (path) => () => navigate(path);
  const handleLogout = async () => { await logout(); navigate('/'); };

  /* =========================
     Paginación
     ========================= */
  const handlePageChange = (newPage) => {
    if (!loading && newPage >= 1 && newPage <= lastPage) {
      setCurrentPage(newPage);
      fetchDocumentos(newPage, searchTerm);
    }
  };

  return (
    <div className="clientedoc-layout">
      {/* HEADER */}
      <Navbar expand="lg" className="clientedoc-header" variant="dark">
        <Container fluid>
          <Navbar.Brand className="d-flex align-items-center">
            <img src={logo} alt="Logo" width="40" height="40" className="me-2" />
            <span
              className="clientedoc-title"
              role="link"
              style={{ cursor: 'pointer'}}
              onClick={go('/cliente')}
              title="Ir a Productos"
            >
              BIBLIOTECALFH
            </span>
          </Navbar.Brand>

          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="ms-auto d-flex flex-column flex-lg-row gap-2 mt-3 mt-lg-0">
              <Button onClick={go('/vencimiento')}>
                <i className="bi bi-hourglass-split me-1"></i> Vencimiento
              </Button>
              <Button onClick={go('/laboratorios')}>
                <i className="bi bi-droplet me-1"></i> Laboratorios
              </Button>
              <Button onClick={go('/vademecum')}>
                <i className="bi bi-book me-1"></i> Vademécum
              </Button>
              <Button onClick={go('/capacitacion')}>
                <i className="bi bi-mortarboard me-1"></i> Capacitación
              </Button>
              <Button onClick={go('/clientedoc')}>
                <i className="bi bi-file-earmark-text me-1"></i> Documentos
              </Button>
              <Button onClick={go('/cliente')} variant="secondary">
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
      <Container fluid className="clientedoc-content">
        <Row className="mt-4">
          <Col xs={12}>
            <Card className="clientedoc-card">
              <Card.Body>
                <h2 className="clientedoc-title-main mb-4 text-center text-md-start">
                  Documentos PDF
                </h2>

                {/* 🔎 Barra de búsqueda igual a Capacitacion.jsx */}
                <Row className="g-3 align-items-end mb-3">
                  <Col xs={12} md={6} lg={5}>
                    <Form.Label className="fw-semibold">Buscar dentro de Documentos:</Form.Label>
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

                {loading && <div className="text-center mb-3">Cargando documentos...</div>}

                {/* GRID DE DOCUMENTOS */}
                <div className="document-list">
                  {documentos.length > 0 ? (
                    documentos.map((doc) => (
                      <div className="document-card" key={doc.id}>
                        <div className="document-info">
                          <p><strong>Nombre:</strong> {doc.nombre}</p>
                          <p>
                            <strong>Fecha:</strong>{' '}
                            {doc.fecha_subida
                              ? new Date(doc.fecha_subida).toLocaleDateString('es-ES')
                              : '-'}
                          </p>
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
                    !loading && <p className="text-center">No hay documentos disponibles</p>
                  )}
                </div>

                {/* Paginación */}
                {lastPage > 1 && (
                  <div className="pagination-wrapper mt-3 d-flex justify-content-center">
                    <button
                      className="pagination-btn"
                      onClick={() => handlePageChange(currentPage - 1)}
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
                      onClick={() => handlePageChange(currentPage + 1)}
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

      {/* MODAL ERROR (simple) */}
      <Modal show={errorModal.show} onHide={closeErrorModal} centered>
        <Modal.Header closeButton style={{ backgroundColor: '#dc3545', color: '#fff' }}>
          <Modal.Title>{errorModal.title || 'Atención'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div style={{ whiteSpace: 'pre-line', marginBottom: (errorModal.list?.length || errorModal.meta) ? 12 : 0 }}>
            {errorModal.message || 'Ha ocurrido un error.'}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={closeErrorModal}>
            Entendido
          </Button>
        </Modal.Footer>
      </Modal>

      {/* FOOTER */}
      <footer className="clientedoc-footer">
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

export default Clientedoc;
