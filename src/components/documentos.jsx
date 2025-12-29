// src/components/documentos.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
  Container,
  Navbar,
  Button,
  Spinner,
  Card,
  Modal,
  Form,
  ProgressBar,
  Tabs,
  Tab,
  InputGroup
} from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../assets/documentos.css';
import '../assets/clientedoc.css';
import '../assets/consulta.css';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.jpeg';

/* =========================
   API / ORIGEN
   ========================= */
const ORIGIN = window.location.origin;
const API_BASE = process.env.REACT_APP_API_URL || `${ORIGIN}/backend/api`;
const FILE_PROXY = `${API_BASE}/documentos/stream`;   // PDFs
const VIDEO_PROXY = `${API_BASE}/videos/stream`;      // Videos

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

/* axios configurado */
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

/* =========================
   Helper trazabilidad
   ========================= */
async function logAccion(accion) {
  try {
    await api.post('/trazabilidad', { accion });
  } catch (e) {
    console.warn('No se pudo registrar trazabilidad:', e?.response?.data || e?.message);
  }
}

const Documentos = () => {
  const navigate = useNavigate();

  const [activeKey, setActiveKey] = useState('docs');

  // Documentos
  const [documentos, setDocumentos] = useState([]);
  const [docCurrentPage, setDocCurrentPage] = useState(1);
  const [docLastPage, setDocLastPage] = useState(1);

  // Videos
  const [videos, setVideos] = useState([]);
  const [vidCurrentPage, setVidCurrentPage] = useState(1);
  const [vidLastPage, setVidLastPage] = useState(1);

  // Modales
  const [showModalUploadDoc, setShowModalUploadDoc] = useState(false);
  const [showModalUploadVid, setShowModalUploadVid] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // { tipo: 'doc'|'vid', id, nombre }
  const [newName, setNewName] = useState('');
  const [editProductCode, setEditProductCode] = useState(''); // código de producto al editar

  const [showDocInstructionsModal, setShowDocInstructionsModal] = useState(false);
  const [showVidInstructionsModal, setShowVidInstructionsModal] = useState(false);

  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoToPlay, setVideoToPlay] = useState(null); // {nombre, url}

  // Archivos y progreso
  const [selectedFilesDocs, setSelectedFilesDocs] = useState([]);
  const [selectedFilesVids, setSelectedFilesVids] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Código de producto para asociar documentos al subir
  const [docProductCode, setDocProductCode] = useState('');

  // Flags generales
  const [loading, setLoading] = useState(false);

  // Búsqueda
  const [searchDoc, setSearchDoc] = useState('');
  const [searchVid, setSearchVid] = useState('');

  // Confirmar eliminación
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null); // {tipo:'doc'|'vid', id, nombre}

  // Modales error/éxito
  const [errorModal, setErrorModal] = useState({ show: false, title: '', message: '' });
  const openErrorModal = (title, message) => setErrorModal({ show: true, title, message });
  const closeErrorModal = () => setErrorModal({ show: false, title: '', message: '' });

  const [successModal, setSuccessModal] = useState({ show: false, title: '', message: '' });
  const openSuccessModal = (title, message) => setSuccessModal({ show: true, title, message });
  const closeSuccessModal = () => setSuccessModal({ show: false, title: '', message: '' });

  const cancelTokenSourceRef = useRef(null);

  /* =========================
     Listar documentos
     ========================= */
  const fetchDocumentos = useCallback(
    async (page = 1, term = '') => {
      if (cancelTokenSourceRef.current) {
        cancelTokenSourceRef.current.cancel('Cancelado por nueva solicitud (docs)');
      }
      cancelTokenSourceRef.current = axios.CancelToken.source();
      setLoading(true);
      try {
        const cleanTerm = (term || '').trim();
        const { data } = await api.get('/documentos', {
          params: { page, ...(cleanTerm ? { search: cleanTerm } : {}) },
          cancelToken: cancelTokenSourceRef.current.token
        });
        setDocumentos(Array.isArray(data?.data) ? data.data : []);
        setDocCurrentPage(data?.current_page ?? page);
        setDocLastPage(data?.last_page ?? 1);
      } catch (err) {
        if (!axios.isCancel(err)) {
          const msg = err?.response?.data?.message || err?.message || 'Error al cargar los documentos';
          openErrorModal('Error al cargar', msg);
          console.error('Documentos API error:', err?.response?.data || err);
        }
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /* =========================
     Listar videos
     ========================= */
  const fetchVideos = useCallback(
    async (page = 1, term = '') => {
      if (cancelTokenSourceRef.current) {
        cancelTokenSourceRef.current.cancel('Cancelado por nueva solicitud (videos)');
      }
      cancelTokenSourceRef.current = axios.CancelToken.source();
      setLoading(true);
      try {
        const cleanTerm = (term || '').trim();
        const { data } = await api.get('/videos', {
          params: { page, ...(cleanTerm ? { search: cleanTerm } : {}) },
          cancelToken: cancelTokenSourceRef.current.token
        });
        setVideos(Array.isArray(data?.data) ? data.data : []);
        setVidCurrentPage(data?.current_page ?? page);
        setVidLastPage(data?.last_page ?? 1);
      } catch (err) {
        if (!axios.isCancel(err)) {
          const msg = err?.response?.data?.message || err?.message || 'Error al cargar los videos';
          openErrorModal('Error al cargar', msg);
          console.error('Videos API error:', err?.response?.data || err);
        }
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (activeKey === 'docs') fetchDocumentos(1, searchDoc);
    if (activeKey === 'videos') fetchVideos(1, searchVid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey]);

  useEffect(() => {
    const id = setTimeout(() => {
      if (activeKey === 'docs') {
        setDocCurrentPage(1);
        fetchDocumentos(1, searchDoc);
      }
    }, 400);
    return () => clearTimeout(id);
  }, [searchDoc, fetchDocumentos, activeKey]);

  useEffect(() => {
    const id = setTimeout(() => {
      if (activeKey === 'videos') {
        setVidCurrentPage(1);
        fetchVideos(1, searchVid);
      }
    }, 400);
    return () => clearTimeout(id);
  }, [searchVid, fetchVideos, activeKey]);

  useEffect(() => {
    return () => {
      if (cancelTokenSourceRef.current) {
        cancelTokenSourceRef.current.cancel('Componente desmontado');
      }
    };
  }, []);

  /* =========================
     Subir documentos
     ========================= */
  const handleFileChangeDocs = (e) => {
    setSelectedFilesDocs(Array.from(e.target.files || []));
  };

  const handleUploadDocs = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      openErrorModal('No autorizado', 'Por favor, inicia sesión para subir documentos.');
      return;
    }
    if (selectedFilesDocs.length === 0) return;

    setLoading(true);
    setUploadProgress(0);

    try {
      const fd = new FormData();
      selectedFilesDocs.forEach((file) => fd.append('documentos[]', file));

      // código de producto opcional
      if (docProductCode.trim()) {
        fd.append('producto_codigo', docProductCode.trim());
        fd.append('codigo_producto', docProductCode.trim()); // por si el backend usa este nombre
      }

      await api.post('/documentos/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          if (!evt.total) return;
          const progress = Math.round((evt.loaded / evt.total) * 100);
          setUploadProgress(progress);
        },
        timeout: 120000
      });

      const nombres = selectedFilesDocs.map(f => f.name).join(', ');
      await logAccion(`Subió documento(s): ${nombres}`);

      openSuccessModal('Documentos subidos', `${selectedFilesDocs.length} documento(s) subido(s) correctamente.`);
      setSelectedFilesDocs([]);
      setDocProductCode('');
      setShowModalUploadDoc(false);
      setUploadProgress(0);

      setDocCurrentPage(1);
      await fetchDocumentos(1, searchDoc);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Error al subir los documentos';
      openErrorModal('Error al subir', msg);
      console.error('Upload docs error:', err?.response?.data || err);
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     Subir videos
     ========================= */
  const handleFileChangeVids = (e) => {
    setSelectedFilesVids(Array.from(e.target.files || []));
  };

  const handleUploadVids = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      openErrorModal('No autorizado', 'Por favor, inicia sesión para subir videos.');
      return;
    }
    if (selectedFilesVids.length === 0) return;

    setLoading(true);
    setUploadProgress(0);

    try {
      const fd = new FormData();
      selectedFilesVids.forEach((file) => fd.append('videos[]', file));

      await api.post('/videos/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          if (!evt.total) return;
          const progress = Math.round((evt.loaded / evt.total) * 100);
          setUploadProgress(progress);
        },
        timeout: 180000
      });

      const nombres = selectedFilesVids.map(f => f.name).join(', ');
      await logAccion(`Subió video(s): ${nombres}`);

      openSuccessModal('Videos subidos', `${selectedFilesVids.length} video(s) subido(s) correctamente.`);
      setSelectedFilesVids([]);
      setShowModalUploadVid(false);
      setUploadProgress(0);

      setVidCurrentPage(1);
      await fetchVideos(1, searchVid);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Error al subir los videos';
      openErrorModal('Error al subir', msg);
      console.error('Upload videos error:', err?.response?.data || err);
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     Eliminar (doc o video)
     ========================= */
  const requestDelete = (tipo, item) => {
    setItemToDelete({ tipo, id: item.id, nombre: item.nombre });
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;

    const token = localStorage.getItem('authToken');
    if (!token) {
      openErrorModal('No autorizado', 'Por favor, inicia sesión para eliminar.');
      return;
    }

    setLoading(true);

    try {
      if (itemToDelete.tipo === 'doc') {
        await api.delete(`/documentos/${itemToDelete.id}`);

        await logAccion(`Eliminó documento ID ${itemToDelete.id}: ${itemToDelete.nombre}`);

        openSuccessModal('Documento eliminado', `"${itemToDelete.nombre}" se eliminó correctamente.`);
        const next = docCurrentPage > 1 && documentos.length === 1 ? docCurrentPage - 1 : docCurrentPage;
        setDocCurrentPage(next);
        await fetchDocumentos(next, searchDoc);
      } else {
        await api.delete(`/videos/${itemToDelete.id}`);

        await logAccion(`Eliminó video ID ${itemToDelete.id}: ${itemToDelete.nombre}`);

        openSuccessModal('Video eliminado', `"${itemToDelete.nombre}" se eliminó correctamente.`);
        const next = vidCurrentPage > 1 && videos.length === 1 ? vidCurrentPage - 1 : vidCurrentPage;
        setVidCurrentPage(next);
        await fetchVideos(next, searchVid);
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Error al eliminar';
      openErrorModal('Error al eliminar', msg);
      console.error('Delete error:', err?.response?.data || err);
    } finally {
      setShowDeleteModal(false);
      setItemToDelete(null);
      setLoading(false);
    }
  };

  /* =========================
     Editar nombre (doc o video) + código producto
     ========================= */
  const handleEditClick = (tipo, item) => {
    setEditingItem({ tipo, id: item.id, nombre: item.nombre });

    setNewName(item.nombre || '');

    const codigoAsociado =
      item.producto?.codigo ||
      item.producto_codigo ||
      item.codigo_producto ||
      '';

    setEditProductCode(codigoAsociado);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      openErrorModal('No autorizado', 'Por favor, inicia sesión para editar.');
      return;
    }
    if (!editingItem || !newName.trim()) {
      openErrorModal('Nombre inválido', 'Debes ingresar un nombre.');
      return;
    }

    setLoading(true);
    try {
      if (editingItem.tipo === 'doc') {
        const codigoTrim = editProductCode.trim();
        const payload = {
          nombre: newName.trim(),
          producto_codigo: codigoTrim || null,
          codigo_producto: codigoTrim || null
        };

        await api.put(`/documentos/${editingItem.id}`, payload);

        await logAccion(
          `Actualizó documento ID ${editingItem.id} a nombre "${newName.trim()}"` +
            (codigoTrim ? ` y código de producto ${codigoTrim}` : ' sin código de producto')
        );

        openSuccessModal('Documento actualizado', 'El documento se actualizó correctamente.');
        await fetchDocumentos(docCurrentPage, searchDoc);
      } else {
        await api.put(`/videos/${editingItem.id}`, { nombre: newName.trim() });

        await logAccion(`Renombró video ID ${editingItem.id} a: "${newName.trim()}"`);

        openSuccessModal('Video actualizado', 'El video se renombró correctamente.');
        await fetchVideos(vidCurrentPage, searchVid);
      }
      setShowEditModal(false);
      setEditingItem(null);
      setEditProductCode('');
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Error al actualizar el elemento';
      openErrorModal('Error al actualizar', msg);
      console.error('Update error:', err?.response?.data || err);
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     Paginación
     ========================= */
  const handleDocPageChange = (newPage) => {
    if (!loading && newPage >= 1 && newPage <= docLastPage) {
      setDocCurrentPage(newPage);
      fetchDocumentos(newPage, searchDoc);
    }
  };
  const handleVidPageChange = (newPage) => {
    if (!loading && newPage >= 1 && newPage <= vidLastPage) {
      setVidCurrentPage(newPage);
      fetchVideos(newPage, searchVid);
    }
  };

  /* =========================
     Ver documento
     ========================= */
  const handleOpenDoc = (doc) => {
    if (doc?.url && /^https?:\/\//i.test(doc.url)) {
      window.open(doc.url, '_blank', 'noopener,noreferrer');
      return;
    }
    const url = buildProxyUrlDoc(pickRuta(doc));
    if (!url) return openErrorModal('Ruta inválida', 'El documento no tiene una ruta válida para abrir.');
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  /* =========================
     Ver video
     ========================= */
  const handleOpenVideo = (vid) => {
    if (vid?.url && /^https?:\/\//i.test(vid.url)) {
      setVideoToPlay({ nombre: vid.nombre, url: vid.url });
      setShowVideoModal(true);
      return;
    }
    const url = buildProxyUrlVideo(pickRuta(vid));
    if (!url) return openErrorModal('Ruta inválida', 'El video no tiene una ruta válida para reproducir.');
    setVideoToPlay({ nombre: vid.nombre, url });
    setShowVideoModal(true);
  };

  /* =========================
     Render
     ========================= */
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
              title="Ir al panel de administración"
              onClick={() => navigate('/admin')}
            >
              BIBLIOTECALFH
            </span>
          </Navbar.Brand>
          <Button onClick={() => navigate('/admin')} className="logout-button">
            <i className="bi bi-arrow-left-circle me-1"></i> Volver
          </Button>
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
              {/* TAB DOCUMENTOS */}
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

                <div className="d-flex flex-wrap gap-2 mb-3">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowModalUploadDoc(true)}
                  >
                    <i className="bi bi-upload me-1"></i> Cargar Documentos (PDF)
                  </Button>
                  <Button
                    variant="info"
                    size="sm"
                    onClick={() => setShowDocInstructionsModal(true)}
                  >
                    <i className="bi bi-info-circle me-1"></i> Instrucciones
                  </Button>
                </div>

                {loading && (
                  <div className="text-center mb-3">Cargando documentos...</div>
                )}

                <div className="product-list">
                  {documentos.length > 0 ? (
                    documentos.map((doc) => {
                      const prodNombre =
                        doc.producto?.nombre ||
                        doc.producto_nombre ||
                        doc.nombre_producto ||
                        '';
                      const prodCodigo =
                        doc.producto?.codigo ||
                        doc.producto_codigo ||
                        doc.codigo_producto ||
                        '';

                      return (
                        <div className="product-card" key={doc.id}>
                          <div className="product-info text-start">
                            <p>
                              <strong>Nombre:</strong> {doc.nombre}
                            </p>
                            <p>Fecha: {formatFecha(doc)}</p>

                            {(prodNombre || prodCodigo) && (
                              <p className="mt-1">
                                <strong>Producto asociado:</strong>{' '}
                                {prodNombre
                                  ? `${prodNombre} (${prodCodigo})`
                                  : `Código ${prodCodigo}`}
                              </p>
                            )}
                          </div>
                          <div className="card-actions">
                            <div className="d-flex w-100 justify-content-center gap-2">
                              <Button
                                size="sm"
                                variant="warning"
                                onClick={() => handleEditClick('doc', doc)}
                              >
                                Editar
                              </Button>
                              <Button
                                size="sm"
                                variant="primary"
                                className="btn-ver"
                                style={{ width: 'auto' }}
                                onClick={() => handleOpenDoc(doc)}
                              >
                                Ver
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => requestDelete('doc', doc)}
                              >
                                Eliminar
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    !loading && (
                      <p className="text-center">No se encontraron documentos</p>
                    )
                  )}
                </div>

                {docLastPage > 1 && (
                  <div className="pagination-wrapper mt-4 d-flex justify-content-center align-items-center gap-2">
                    <button
                      className="pagination-btn"
                      onClick={() => handleDocPageChange(1)}
                      disabled={docCurrentPage === 1 || loading}
                      aria-label="Primera página"
                      title="Primera página"
                    >
                      <i className="bi bi-skip-backward-fill"></i>
                    </button>
                    <button
                      className="pagination-btn"
                      onClick={() => handleDocPageChange(docCurrentPage - 1)}
                      disabled={docCurrentPage === 1 || loading}
                      aria-label="Página anterior"
                      title="Página anterior"
                    >
                      <i className="bi bi-chevron-left"></i>
                    </button>
                    <span className="pagination-info">
                      {loading ? (
                        <Spinner animation="border" size="sm" />
                      ) : (
                        `${docCurrentPage} / ${docLastPage}`
                      )}
                    </span>
                    <button
                      className="pagination-btn"
                      onClick={() => handleDocPageChange(docCurrentPage + 1)}
                      disabled={docCurrentPage === docLastPage || loading}
                      aria-label="Página siguiente"
                      title="Página siguiente"
                    >
                      <i className="bi bi-chevron-right"></i>
                    </button>
                    <button
                      className="pagination-btn"
                      onClick={() => handleDocPageChange(docLastPage)}
                      disabled={docCurrentPage === docLastPage || loading}
                      aria-label="Última página"
                      title="Última página"
                    >
                      <i className="bi bi-skip-forward-fill"></i>
                    </button>
                  </div>
                )}
              </Tab>

              {/* TAB VIDEOS */}
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

                <div className="d-flex flex-wrap gap-2 mb-3">
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => setShowModalUploadVid(true)}
                  >
                    <i className="bi bi-cloud-arrow-up me-1"></i> Cargar Videos (.mp4, .webm, .ogg)
                  </Button>
                  <Button
                    variant="info"
                    size="sm"
                    onClick={() => setShowVidInstructionsModal(true)}
                  >
                    <i className="bi bi-info-circle me-1"></i> Instrucciones
                  </Button>
                </div>

                {loading && (
                  <div className="text-center mb-3">Cargando videos...</div>
                )}

                <div className="product-list">
                  {videos.length > 0 ? (
                    videos.map((vid) => (
                      <div className="product-card" key={vid.id}>
                        <div className="product-info text-start">
                          <p>
                            <strong>Nombre:</strong> {vid.nombre}
                          </p>
                          <p>Fecha: {formatFecha(vid)}</p>
                        </div>
                        <div className="card-actions">
                          <div className="d-flex w-100 justify-content-center gap-2">
                            <Button
                              size="sm"
                              variant="warning"
                              onClick={() => handleEditClick('vid', vid)}
                            >
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="primary"
                              className="btn-ver"
                              style={{ width: 'auto' }}
                              onClick={() => handleOpenVideo(vid)}
                            >
                              <i className="bi bi-play-circle me-1"></i> Ver
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => requestDelete('vid', vid)}
                            >
                              Eliminar
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    !loading && (
                      <p className="text-center">No se encontraron videos</p>
                    )
                  )}
                </div>

                {vidLastPage > 1 && (
                  <div className="pagination-wrapper mt-4 d-flex justify-content-center align-items-center gap-2">
                    <button
                      className="pagination-btn"
                      onClick={() => handleVidPageChange(1)}
                      disabled={vidCurrentPage === 1 || loading}
                      aria-label="Primera página"
                      title="Primera página"
                    >
                      <i className="bi bi-skip-backward-fill"></i>
                    </button>
                    <button
                      className="pagination-btn"
                      onClick={() => handleVidPageChange(vidCurrentPage - 1)}
                      disabled={vidCurrentPage === 1 || loading}
                      aria-label="Página anterior"
                      title="Página anterior"
                    >
                      <i className="bi bi-chevron-left"></i>
                    </button>
                    <span className="pagination-info">
                      {loading ? (
                        <Spinner animation="border" size="sm" />
                      ) : (
                        `${vidCurrentPage} / ${vidLastPage}`
                      )}
                    </span>
                    <button
                      className="pagination-btn"
                      onClick={() => handleVidPageChange(vidCurrentPage + 1)}
                      disabled={vidCurrentPage === vidLastPage || loading}
                      aria-label="Página siguiente"
                      title="Página siguiente"
                    >
                      <i className="bi bi-chevron-right"></i>
                    </button>
                    <button
                      className="pagination-btn"
                      onClick={() => handleVidPageChange(vidLastPage)}
                      disabled={vidCurrentPage === vidLastPage || loading}
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

      {/* MODAL SUBIR DOCUMENTOS */}
      <Modal show={showModalUploadDoc} onHide={() => setShowModalUploadDoc(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Cargar Documentos (PDF)</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {/* Código de producto */}
          <Form.Group className="mb-3">
            <Form.Label>Código de producto (opcional)</Form.Label>
            <Form.Control
              type="text"
              placeholder="Ej: 12345"
              value={docProductCode}
              onChange={(e) => setDocProductCode(e.target.value)}
            />
            <Form.Text className="text-muted">
              Si ingresas el código, el documento quedará asociado a ese producto.
            </Form.Text>
          </Form.Group>

          <Form.Group>
            <Form.Label>Seleccionar archivos PDF</Form.Label>
            <Form.Control
              type="file"
              multiple
              accept=".pdf,application/pdf"
              onChange={handleFileChangeDocs}
            />
            {uploadProgress > 0 && (
              <ProgressBar
                now={uploadProgress}
                label={`${uploadProgress}%`}
                className="mt-3"
              />
            )}
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModalUploadDoc(false)}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleUploadDocs}
            disabled={loading || selectedFilesDocs.length === 0}
          >
            {loading ? 'Subiendo...' : 'Subir Documentos'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* MODAL SUBIR VIDEOS */}
      <Modal show={showModalUploadVid} onHide={() => setShowModalUploadVid(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Cargar Videos</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Seleccionar videos (.mp4, .webm, .ogg)</Form.Label>
            <Form.Control
              type="file"
              multiple
              accept="video/mp4,video/webm,video/ogg"
              onChange={handleFileChangeVids}
            />
            {uploadProgress > 0 && (
              <ProgressBar
                now={uploadProgress}
                label={`${uploadProgress}%`}
                className="mt-3"
              />
            )}
            <div className="text-muted mt-2" style={{ fontSize: '0.9rem' }}>
              Tamaño máximo recomendado por archivo: 200 MB.
            </div>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModalUploadVid(false)}>
            Cancelar
          </Button>
          <Button
            variant="success"
            onClick={handleUploadVids}
            disabled={loading || selectedFilesVids.length === 0}
          >
            {loading ? 'Subiendo...' : 'Subir Videos'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* MODAL EDITAR (doc o video) */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {editingItem?.tipo === 'vid' ? 'Editar Video' : 'Editar Documento'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Nuevo nombre</Form.Label>
            <Form.Control
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </Form.Group>

          {editingItem?.tipo === 'doc' && (
            <Form.Group>
              <Form.Label>Código de producto (opcional)</Form.Label>
              <Form.Control
                type="text"
                placeholder="Ej: 12345"
                value={editProductCode}
                onChange={(e) => setEditProductCode(e.target.value)}
              />
              <Form.Text className="text-muted">
                Si ingresas el código, el documento quedará asociado a ese producto. Si lo dejas vacío,
                se eliminará la asociación.
              </Form.Text>
            </Form.Group>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSaveEdit} disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* MODAL CONFIRMAR ELIMINACIÓN */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirmar Eliminación</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {itemToDelete ? (
            <p>
              ¿Estás seguro de que deseas eliminar{' '}
              {itemToDelete.tipo === 'doc' ? 'el documento' : 'el video'}{' '}
              <b>{itemToDelete.nombre}</b>?
            </p>
          ) : (
            <p>No hay elemento seleccionado.</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowDeleteModal(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirmDelete}
            disabled={loading}
          >
            Eliminar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* MODAL VER VIDEO */}
      <Modal show={showVideoModal} onHide={() => setShowVideoModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{videoToPlay?.nombre || 'Reproductor'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {videoToPlay?.url ? (
            <video
              src={videoToPlay.url}
              controls
              style={{ width: '100%', borderRadius: 8, outline: 'none' }}
              preload="metadata"
            />
          ) : (
            <div className="text-center text-muted">No se pudo cargar el video.</div>
          )}
        </Modal.Body>
      </Modal>

      {/* MODAL INSTRUCCIONES: DOCUMENTOS */}
      <Modal
        show={showDocInstructionsModal}
        onHide={() => setShowDocInstructionsModal(false)}
        centered
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Instrucciones para Documentos (PDF)</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Card className="shadow-sm border-0">
            <Card.Body>
              <h5 className="mb-3 text-primary">Recomendaciones</h5>
              <ul>
                <li>
                  El archivo debe estar en formato <strong>PDF</strong>.
                </li>
                <li>Nombre de los archivos en mayúscula sostenida</li>
                <li>Nomenclatura de archivos:</li>
                <li>- Ficha técnica: FT Nombre lab nombre producto</li>
                <li>- Registro Sanitario: RS Nombre lab nombre producto</li>
                <li>
                  Si quieres que el documento aparezca en <strong>Capacitación</strong>, incluye la
                  palabra <code>capacitacion</code> en el nombre del archivo.
                </li>
                <li>
                  Si quieres que el documento aparezca en <strong>Vademécum</strong>, incluye la
                  palabra <code>vademecum</code> en el nombre del archivo.
                </li>
                <li>Puedes seleccionar varios archivos a la vez.</li>
                <li>No se aceptarán nombres duplicados ya cargados.</li>
              </ul>
              <p className="text-muted mb-0 mt-2">
                Si tienes dudas, contacta con el administrador del sistema.
              </p>
            </Card.Body>
          </Card>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDocInstructionsModal(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* MODAL INSTRUCCIONES: VIDEOS */}
      <Modal
        show={showVidInstructionsModal}
        onHide={() => setShowVidInstructionsModal(false)}
        centered
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Instrucciones para Videos</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Card className="shadow-sm border-0">
            <Card.Body>
              <h5 className="mb-3 text-success">Recomendaciones</h5>
              <ul>
                <li>
                  Formatos permitidos: <strong>MP4</strong>, <strong>WEBM</strong>,{' '}
                  <strong>OGG</strong>.
                </li>
                <li>
                  Tamaño recomendado por archivo: hasta <strong>~200 MB</strong>.
                </li>
                <li>Evita nombres con espacios dobles o caracteres extraños.</li>
              </ul>
              <p className="text-muted mb-0 mt-2">
                Si tienes dudas, contacta con el administrador del sistema.
              </p>
            </Card.Body>
          </Card>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowVidInstructionsModal(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
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
          <div style={{ whiteSpace: 'pre-line' }}>
            {errorModal.message || 'Ha ocurrido un error.'}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={closeErrorModal}>
            Entendido
          </Button>
        </Modal.Footer>
      </Modal>

      {/* MODAL ÉXITO */}
      <Modal show={successModal.show} onHide={closeSuccessModal} centered>
        <Modal.Header
          closeButton
          style={{ backgroundColor: '#198754', color: '#fff' }}
        >
          <Modal.Title>{successModal.title || 'Operación exitosa'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div style={{ whiteSpace: 'pre-line' }}>
            {successModal.message || 'La operación se realizó correctamente.'}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="success" onClick={closeSuccessModal}>
            Perfecto
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

export default Documentos;
