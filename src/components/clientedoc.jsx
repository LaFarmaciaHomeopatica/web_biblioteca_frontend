// src/components/clientedoc.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
  Container,
  Navbar,
  Nav,
  Button,
  Card,
  Form,
  Spinner,
  Modal,
  InputGroup,
  Tabs,
  Tab
} from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../assets/clientedoc.css';
import '../assets/consulta.css'; 
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.jpeg';
import { useAuth } from '../context/AuthContext';

/* =========================
   API / ORIGEN
   ========================= */
const ORIGIN = window.location.origin;
const API_BASE = process.env.REACT_APP_API_URL || `${ORIGIN}/backend/api`;
const FILE_PROXY = `${API_BASE}/documentos/stream`;
const VIDEO_PROXY = `${API_BASE}/videos/stream`;

/* =========================
   Helpers
   ========================= */
const pickRuta = (obj) => {
  const keys = ['ruta', 'path', 'archivo', 'file_path', 'storage_path'];
  for (const k of keys) {
    if (typeof obj?.[k] === 'string' && obj[k].trim()) return String(obj[k]).trim();
  }
  return '';
};

const formatFecha = (item) => {
  const raw =
    item?.fecha_subida ||
    item?.fecha ||
    item?.created_at ||
    item?.updated_at ||
    null;

  if (!raw) return '-';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('es-ES');
};

const buildProxyUrlDoc = (rawRuta) => {
  if (!rawRuta) return null;
  let rel = String(rawRuta).trim().replace(/\\/g, '/');
  rel = rel.replace(/^public\//i, '').replace(/^storage\//i, '').replace(/^\//, '');
  if (/^Documentos\//.test(rel)) rel = rel.replace(/^Documentos\//, 'documentos/');
  else if (!/^documentos\//.test(rel)) rel = `documentos/${rel}`;
  return `${FILE_PROXY}?path=${encodeURIComponent(rel)}`;
};

const buildProxyUrlVideo = (rawRuta) => {
  if (!rawRuta) return null;
  let rel = String(rawRuta).trim().replace(/\\/g, '/');
  rel = rel.replace(/^public\//i, '').replace(/^storage\//i, '').replace(/^\//, '');
  if (/^Videos\//.test(rel)) rel = rel.replace(/^Videos\//, 'videos/');
  else if (!/^videos\//.test(rel)) rel = `videos/${rel}`;
  return `${VIDEO_PROXY}?path=${encodeURIComponent(rel)}`;
};

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { Accept: 'application/json' }
});
api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem('authToken');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

const Clientedoc = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [activeKey, setActiveKey] = useState('docs');

  // Documentos
  const [documentos, setDocumentos] = useState([]);
  const [searchDoc, setSearchDoc] = useState('');
  const [currentPageDoc, setCurrentPageDoc] = useState(1);
  const [lastPageDoc, setLastPageDoc] = useState(1);

  // Videos
  const [videos, setVideos] = useState([]);
  const [searchVid, setSearchVid] = useState('');
  const [currentPageVid, setCurrentPageVid] = useState(1);
  const [lastPageVid, setLastPageVid] = useState(1);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoToPlay, setVideoToPlay] = useState(null);

  const [loading, setLoading] = useState(false);

  const [errorModal, setErrorModal] = useState({ show: false, title: '', message: '' });
  const openErrorModal = (title, message) => setErrorModal({ show: true, title, message });
  const closeErrorModal = () => setErrorModal({ show: false, title: '', message: '' });

  const cancelTokenSourceRef = useRef(null);

  /* ======== Fetch documentos ======== */
  const fetchDocumentos = useCallback(async (page = 1, term = '') => {
    if (cancelTokenSourceRef.current) cancelTokenSourceRef.current.cancel();
    cancelTokenSourceRef.current = axios.CancelToken.source();

    setLoading(true);
    try {
      const cleanTerm = term.trim();
      const { data } = await api.get('/documentos', {
        params: { page, ...(cleanTerm ? { search: cleanTerm } : {}) },
        cancelToken: cancelTokenSourceRef.current.token
      });
      setDocumentos(Array.isArray(data?.data) ? data.data : []);
      setCurrentPageDoc(data?.current_page ?? page);
      setLastPageDoc(data?.last_page ?? 1);
    } catch (err) {
      if (!axios.isCancel(err)) {
        openErrorModal('Error al cargar', err?.response?.data?.message || err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  /* ======== Fetch videos ======== */
  const fetchVideos = useCallback(async (page = 1, term = '') => {
    if (cancelTokenSourceRef.current) cancelTokenSourceRef.current.cancel();
    cancelTokenSourceRef.current = axios.CancelToken.source();

    setLoading(true);
    try {
      const cleanTerm = term.trim();
      const { data } = await api.get('/videos', {
        params: { page, ...(cleanTerm ? { search: cleanTerm } : {}) },
        cancelToken: cancelTokenSourceRef.current.token
      });
      setVideos(Array.isArray(data?.data) ? data.data : []);
      setCurrentPageVid(data?.current_page ?? page);
      setLastPageVid(data?.last_page ?? 1);
    } catch (err) {
      if (!axios.isCancel(err)) {
        openErrorModal('Error al cargar', err?.response?.data?.message || err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Inicial y cambio de pestaña — incluye searchDoc/searchVid
  useEffect(() => {
    if (activeKey === 'docs') fetchDocumentos(1, searchDoc);
    if (activeKey === 'videos') fetchVideos(1, searchVid);
  }, [activeKey, fetchDocumentos, fetchVideos, searchDoc, searchVid]);

  // Debounce búsquedas
  useEffect(() => {
    const id = setTimeout(() => {
      if (activeKey === 'docs') fetchDocumentos(1, searchDoc);
    }, 400);
    return () => clearTimeout(id);
  }, [searchDoc, activeKey, fetchDocumentos]);

  useEffect(() => {
    const id = setTimeout(() => {
      if (activeKey === 'videos') fetchVideos(1, searchVid);
    }, 400);
    return () => clearTimeout(id);
  }, [searchVid, activeKey, fetchVideos]);

  useEffect(() => {
    return () => {
      if (cancelTokenSourceRef.current) {
        cancelTokenSourceRef.current.cancel();
      }
    };
  }, []);

  /* ======== Abrir documento ======== */
  const handleOpenDoc = (doc) => {
    const url =
      doc?.url && /^https?:\/\//i.test(doc.url)
        ? doc.url
        : buildProxyUrlDoc(pickRuta(doc));
    if (!url) return openErrorModal('Ruta inválida', 'No se puede abrir el documento.');
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  /* ======== Abrir video ======== */
  const handleOpenVideo = (vid) => {
    const url =
      vid?.url && /^https?:\/\//i.test(vid.url)
        ? vid.url
        : buildProxyUrlVideo(pickRuta(vid));
    if (!url) return openErrorModal('Ruta inválida', 'No se puede reproducir el video.');
    setVideoToPlay({ nombre: vid.nombre, url });
    setShowVideoModal(true);
  };

  /* ======== Paginación ======== */
  const handlePageChangeDocs = (p) => {
    if (!loading && p >= 1 && p <= lastPageDoc) {
      setCurrentPageDoc(p);
      fetchDocumentos(p, searchDoc);
    }
  };
  const handlePageChangeVids = (p) => {
    if (!loading && p >= 1 && p <= lastPageVid) {
      setCurrentPageVid(p);
      fetchVideos(p, searchVid);
    }
  };

  const go = (path) => () => navigate(path);

  const handleGoToModuloMedico = () => navigate('/modulomedico-cliente');

  const handleLogout = async () => {
    await logout();
    navigate('/');
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
              style={{ cursor: 'pointer' }}
              onClick={go('/cliente')}
            >
              BIBLIOTECALFH
            </span>
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="ms-auto d-flex flex-column flex-lg-row gap-2 mt-3 mt-lg-0">
              <Button onClick={handleGoToModuloMedico}>
                <i className="bi bi-heart-pulse me-1"></i> Médicos
              </Button>
              <Button onClick={go('/registrosanitariocliente')}>
                <i className="bi bi-hourglass-split me-1"></i> Registro Sanitario
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
      <Container fluid className="consulta-content px-3 px-md-5">
        <Card className="consulta-card mt-4">
          <Card.Body>
            <h2 className="consulta-title-main mb-4 text-center text-md-start">
              Documentos y Videos
            </h2>

            <Tabs
              activeKey={activeKey}
              onSelect={(k) => setActiveKey(k || 'docs')}
              className="mb-3"
            >
              {/* DOCUMENTOS */}
              <Tab eventKey="docs" title="Documentos">
                <Form className="d-flex flex-column flex-md-row mb-4 gap-2">
                  <InputGroup>
                    <Form.Control
                      type="text"
                      placeholder="Buscar documento..."
                      value={searchDoc}
                      onChange={(e) => setSearchDoc(e.target.value)}
                    />
                    {searchDoc && (
                      <Button
                        variant="outline-secondary"
                        onClick={() => setSearchDoc('')}
                      >
                        <i className="bi bi-x-lg"></i>
                      </Button>
                    )}
                  </InputGroup>
                </Form>

                {loading && (
                  <div className="text-center mb-3">Cargando documentos...</div>
                )}

                {/* Lista de tarjetas */}
                <div className="product-list">
                  {documentos.length > 0 ? (
                    documentos.map((doc) => (
                      <div
                        className="product-card"
                        key={doc.id}
                      >
                        <div className="product-info text-start">
                          <p>
                            <strong>Nombre:</strong> {doc.nombre}
                          </p>
                          <p>Fecha: {formatFecha(doc)}</p>
                        </div>
                        <div className="card-actions">
                          <Button
                            size="sm"
                            variant="primary"
                            className="btn-ver"
                            onClick={() => handleOpenDoc(doc)}
                          >
                            <i className="bi bi-eye me-1"></i> Ver
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    !loading && (
                      <p className="text-center">No hay documentos disponibles</p>
                    )
                  )}
                </div>

                {lastPageDoc > 1 && (
                  <div className="pagination-wrapper mt-4 d-flex justify-content-center align-items-center gap-2">
                    <button
                      className="pagination-btn"
                      onClick={() => handlePageChangeDocs(1)}
                      disabled={currentPageDoc === 1 || loading}
                      aria-label="Primera página"
                      title="Primera página"
                    >
                      <i className="bi bi-skip-backward-fill"></i>
                    </button>
                    <button
                      className="pagination-btn"
                      onClick={() => handlePageChangeDocs(currentPageDoc - 1)}
                      disabled={currentPageDoc === 1 || loading}
                      aria-label="Página anterior"
                      title="Página anterior"
                    >
                      <i className="bi bi-chevron-left"></i>
                    </button>
                    <span className="pagination-info">
                      {loading ? (
                        <Spinner animation="border" size="sm" />
                      ) : (
                        `${currentPageDoc} / ${lastPageDoc}`
                      )}
                    </span>
                    <button
                      className="pagination-btn"
                      onClick={() =>
                        handlePageChangeDocs(currentPageDoc + 1)
                      }
                      disabled={currentPageDoc === lastPageDoc || loading}
                      aria-label="Página siguiente"
                      title="Página siguiente"
                    >
                      <i className="bi bi-chevron-right"></i>
                    </button>
                    <button
                      className="pagination-btn"
                      onClick={() => handlePageChangeDocs(lastPageDoc)}
                      disabled={currentPageDoc === lastPageDoc || loading}
                      aria-label="Última página"
                      title="Última página"
                    >
                      <i className="bi bi-skip-forward-fill"></i>
                    </button>
                  </div>
                )}
              </Tab>

              {/* VIDEOS */}
              <Tab eventKey="videos" title="Videos">
                <Form className="d-flex flex-column flex-md-row mb-4 gap-2">
                  <InputGroup>
                    <Form.Control
                      type="text"
                      placeholder="Buscar video..."
                      value={searchVid}
                      onChange={(e) => setSearchVid(e.target.value)}
                    />
                    {searchVid && (
                      <Button
                        variant="outline-secondary"
                        onClick={() => setSearchVid('')}
                      >
                        <i className="bi bi-x-lg"></i>
                      </Button>
                    )}
                  </InputGroup>
                </Form>

                {loading && (
                  <div className="text-center mb-3">Cargando videos...</div>
                )}

                <div className="product-list">
                  {videos.length > 0 ? (
                    videos.map((vid) => (
                      <div
                        className="product-card"
                        key={vid.id}
                      >
                        <div className="product-info text-start">
                          <p>
                            <strong>Nombre:</strong> {vid.nombre}
                          </p>
                          <p>Fecha: {formatFecha(vid)}</p>
                        </div>
                        <div className="card-actions">
                          <Button
                            size="sm"
                            variant="primary"
                            className="btn-ver"
                            onClick={() => handleOpenVideo(vid)}
                          >
                            <i className="bi bi-play-circle me-1"></i> Ver
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    !loading && (
                      <p className="text-center">No hay videos disponibles</p>
                    )
                  )}
                </div>

                {lastPageVid > 1 && (
                  <div className="pagination-wrapper mt-4 d-flex justify-content-center align-items-center gap-2">
                    <button
                      className="pagination-btn"
                      onClick={() => handlePageChangeVids(1)}
                      disabled={currentPageVid === 1 || loading}
                      aria-label="Primera página"
                      title="Primera página"
                    >
                      <i className="bi bi-skip-backward-fill"></i>
                    </button>
                    <button
                      className="pagination-btn"
                      onClick={() => handlePageChangeVids(currentPageVid - 1)}
                      disabled={currentPageVid === 1 || loading}
                      aria-label="Página anterior"
                      title="Página anterior"
                    >
                      <i className="bi bi-chevron-left"></i>
                    </button>
                    <span className="pagination-info">
                      {loading ? (
                        <Spinner animation="border" size="sm" />
                      ) : (
                        `${currentPageVid} / ${lastPageVid}`
                      )}
                    </span>
                    <button
                      className="pagination-btn"
                      onClick={() =>
                        handlePageChangeVids(currentPageVid + 1)
                      }
                      disabled={currentPageVid === lastPageVid || loading}
                      aria-label="Página siguiente"
                      title="Página siguiente"
                    >
                      <i className="bi bi-chevron-right"></i>
                    </button>
                    <button
                      className="pagination-btn"
                      onClick={() => handlePageChangeVids(lastPageVid)}
                      disabled={currentPageVid === lastPageVid || loading}
                      aria-label="Última página"
                      title="Última página"
                    >
                      <i className="bi bi-skip-forward-fill"></i>
                    </button>
                  </div>
                )}
              </Tab>
            </Tabs>
          </Card.Body>
        </Card>
      </Container>

      {/* MODAL REPRODUCTOR DE VIDEO */}
      <Modal
        show={showVideoModal}
        onHide={() => setShowVideoModal(false)}
        centered
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>{videoToPlay?.nombre || 'Reproductor'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {videoToPlay?.url ? (
            <video
              src={videoToPlay.url}
              controls
              style={{ width: '100%', borderRadius: 8 }}
              preload="metadata"
            />
          ) : (
            <div className="text-center text-muted">
              No se pudo cargar el video.
            </div>
          )}
        </Modal.Body>
      </Modal>

      {/* MODAL ERROR */}
      <Modal show={errorModal.show} onHide={closeErrorModal} centered>
        <Modal.Header
          closeButton
          style={{ backgroundColor: '#dc3545', color: '#fff' }}
        >
          <Modal.Title>{errorModal.title || 'Atención'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {errorModal.message || 'Ha ocurrido un error.'}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={closeErrorModal}>
            Entendido
          </Button>
        </Modal.Footer>
      </Modal>

      {/* FOOTER */}
      <footer className="clientedoc-footer text-center py-3">
        © 2025 La Farmacia Homeopática - Más alternativas, más servicio.
      </footer>
    </div>
  );
};

export default Clientedoc;
