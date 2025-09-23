// src/components/documentos.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
  Container, Navbar, Button, Spinner, Card, Modal, Form, ProgressBar
} from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../assets/documentos.css';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.jpeg';

/* =========================
   API / ORIGEN
   ========================= */
const ORIGIN    = window.location.origin;
const API_BASE  = process.env.REACT_APP_API_URL || `${ORIGIN}/backend/api`;
const FILE_PROXY = `${API_BASE}/documentos/stream`;

/* =========================
   Helpers
   ========================= */

// Toma la mejor "ruta" posible desde el objeto doc
const pickRuta = (doc) => {
  const keys = ['ruta', 'path', 'archivo', 'file_path', 'storage_path'];
  for (const k of keys) {
    if (typeof doc?.[k] === 'string' && doc[k].trim()) return String(doc[k]).trim();
  }
  return '';
};

// Normaliza a "documentos/..." en minúscula y genera URL del proxy
const buildProxyUrl = (rawRuta) => {
  if (!rawRuta) return null;

  let rel = String(rawRuta).trim().replace(/\\/g, '/');
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

/* axios configurado */
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

const Documentos = () => {
  const navigate = useNavigate();

  // Lista/paginación
  const [documentos, setDocumentos] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  // Modales de flujo
  const [showModal, setShowModal] = useState(false);          // Subir
  const [showEditModal, setShowEditModal] = useState(false);  // Editar nombre
  const [editingDoc, setEditingDoc] = useState(null);
  const [newDocName, setNewDocName] = useState('');

  // Archivos y progreso
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Flags generales
  const [loading, setLoading] = useState(false);

  // Búsqueda e instrucciones
  const [searchTerm, setSearchTerm] = useState('');
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);

  // Confirmar eliminación
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [docToDelete, setDocToDelete] = useState(null);

  // Modales bonitos de error/éxito
  const [errorModal, setErrorModal] = useState({ show: false, title: '', message: '' });
  const openErrorModal = (title, message) => setErrorModal({ show: true, title, message });
  const closeErrorModal = () => setErrorModal({ show: false, title: '', message: '' });

  const [successModal, setSuccessModal] = useState({ show: false, title: '', message: '' });
  const openSuccessModal = (title, message) => setSuccessModal({ show: true, title, message });
  const closeSuccessModal = () => setSuccessModal({ show: false, title: '', message: '' });

  // Cancelación de requests
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
          openErrorModal('Error al cargar', msg);
          console.error('Documentos API error:', err?.response?.data || err);
        }
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchDocumentos(currentPage, searchTerm);
    return () => {
      if (cancelTokenSourceRef.current) {
        cancelTokenSourceRef.current.cancel('Componente desmontado');
      }
    };
  }, [currentPage, searchTerm, fetchDocumentos]);

  // Debounce de búsqueda
  useEffect(() => {
    const id = setTimeout(() => {
      setCurrentPage(1);
      fetchDocumentos(1, searchTerm);
    }, 400);
    return () => clearTimeout(id);
  }, [searchTerm, fetchDocumentos]);

  /* =========================
     Subir documentos
     ========================= */
  const handleFileChange = (e) => {
    setSelectedFiles(Array.from(e.target.files || []));
  };

  const handleUpload = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      openErrorModal('No autorizado', 'Por favor, inicia sesión para subir documentos.');
      return;
    }
    if (selectedFiles.length === 0) return;

    setLoading(true);
    setUploadProgress(0);

    try {
      const fd = new FormData();
      selectedFiles.forEach((file) => fd.append('documentos[]', file));

      await api.post('/documentos/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          if (!evt.total) return;
          const progress = Math.round((evt.loaded / evt.total) * 100);
          setUploadProgress(progress);
        },
        timeout: 120000
      });

      openSuccessModal('Documentos subidos', `${selectedFiles.length} documento(s) subido(s) correctamente.`);
      setSelectedFiles([]);
      setShowModal(false);
      setUploadProgress(0);

      setCurrentPage(1);
      await fetchDocumentos(1, searchTerm);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Error al subir los documentos';
      openErrorModal('Error al subir', msg);
      console.error('Upload error:', err?.response?.data || err);
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     Eliminar documento
     ========================= */
  const requestDeleteDocument = (doc) => {
    setDocToDelete(doc);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!docToDelete) return;

    const token = localStorage.getItem('authToken');
    if (!token) {
      openErrorModal('No autorizado', 'Por favor, inicia sesión para eliminar documentos.');
      return;
    }

    setLoading(true);

    try {
      await api.delete(`/documentos/${docToDelete.id}`);

      openSuccessModal('Documento eliminado', `"${docToDelete.nombre}" se eliminó correctamente.`);
      const nextPage = currentPage > 1 && documentos.length === 1 ? currentPage - 1 : currentPage;
      setCurrentPage(nextPage);
      await fetchDocumentos(nextPage, searchTerm);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Error al eliminar el documento';
      openErrorModal('Error al eliminar', msg);
      console.error('Delete error:', err?.response?.data || err);
    } finally {
      setShowDeleteModal(false);
      setDocToDelete(null);
      setLoading(false);
    }
  };

  /* =========================
     Editar nombre
     ========================= */
  const handleEditClick = (doc) => {
    setEditingDoc(doc);
    setNewDocName(doc.nombre || '');
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      openErrorModal('No autorizado', 'Por favor, inicia sesión para editar documentos.');
      return;
    }
    if (!editingDoc || !newDocName.trim()) {
      openErrorModal('Nombre inválido', 'Debes ingresar un nombre para el documento.');
      return;
    }

    setLoading(true);

    try {
      await api.put(`/documentos/${editingDoc.id}`, { nombre: newDocName.trim() });
      openSuccessModal('Nombre actualizado', 'El documento se renombró correctamente.');
      setShowEditModal(false);
      await fetchDocumentos(currentPage, searchTerm);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Error al actualizar el documento';
      openErrorModal('Error al actualizar', msg);
      console.error('Update error:', err?.response?.data || err);
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     Paginación
     ========================= */
  const handlePageChange = (newPage) => {
    if (!loading && newPage >= 1 && newPage <= lastPage) {
      setCurrentPage(newPage);
    }
  };

  /* =========================
     Ver documento (siempre vía proxy)
     ========================= */
  const handleOpenDoc = (doc) => {
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
  };

  return (
    <div className="documentos-page">
      {/* HEADER */}
      <Navbar expand="lg" className="documentos-header">
        <Container fluid>
          <Navbar.Brand className="d-flex align-items-center">
            <img src={logo} alt="Logo" width="40" height="40" className="me-2" />
            <span
              className="documentos-title"
              role="link"
              style={{ cursor: 'pointer'}}
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
      <Container fluid className="documentos-content">
        <Card className="documentos-card">
          <Card.Body>
            <h2 className="documentos-title-main mb-4 text-center text-md-start">
              Gestión de Documentos
            </h2>

            <div className="d-flex flex-column flex-md-row gap-2 mb-4">
              <Button variant="info" onClick={() => setShowInstructionsModal(true)}>
                <i className="bi bi-info-circle me-2"></i> Instrucciones
              </Button>
              <Button onClick={() => setShowModal(true)} disabled={loading}>
                <i className="bi bi-upload me-2"></i> Cargar Documentos
              </Button>
              <Form.Control
                type="text"
                placeholder="Buscar por nombre"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {loading && (
              <div className="text-center mb-3">
                Cargando documentos...
              </div>
            )}

            <div className="document-list">
              {documentos.length > 0 ? (
                documentos.map((doc) => (
                  <div key={doc.id} className="document-card">
                    <div className="document-info">
                      <p><strong>{doc.nombre}</strong></p>
                      <p>Fecha: {doc.fecha_subida ? new Date(doc.fecha_subida).toLocaleDateString('es-ES') : '-'}</p>
                    </div>
                    <div className="card-actions">
                      <Button size="sm" variant="warning" onClick={() => handleEditClick(doc)}>Editar</Button>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleOpenDoc(doc)}
                      >
                        Ver
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => requestDeleteDocument(doc)}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center">No se encontraron documentos</p>
              )}
            </div>

            {lastPage > 1 && (
              <div className="pagination-wrapper mt-4 d-flex justify-content-center gap-2">
                <button
                  className="pagination-btn"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || loading}
                >
                  <i className="bi bi-chevron-left"></i>
                </button>
                <span className="pagination-info">
                  {loading ? <Spinner animation="border" size="sm" /> : `${currentPage} / ${lastPage}`}
                </span>
                <button
                  className="pagination-btn"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={lastPage === currentPage || loading}
                >
                  <i className="bi bi-chevron-right"></i>
                </button>
              </div>
            )}
          </Card.Body>
        </Card>
      </Container>

      {/* MODAL SUBIR */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Cargar Documentos</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Seleccionar archivos PDF</Form.Label>
            <Form.Control type="file" multiple accept=".pdf" onChange={handleFileChange} />
            {uploadProgress > 0 && (
              <ProgressBar now={uploadProgress} label={`${uploadProgress}%`} className="mt-3" />
            )}
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
          <Button variant="primary" onClick={handleUpload} disabled={loading || selectedFiles.length === 0}>
            {loading ? 'Subiendo...' : 'Subir Documentos'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* MODAL EDITAR */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Editar Documento</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Nuevo nombre</Form.Label>
            <Form.Control
              type="text"
              value={newDocName}
              onChange={(e) => setNewDocName(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancelar</Button>
          <Button variant="primary" onClick={handleSaveEdit} disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* MODAL INSTRUCCIONES */}
      <Modal show={showInstructionsModal} onHide={() => setShowInstructionsModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Instrucciones para Cargar Documentos</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Card className="shadow-sm border-0">
            <Card.Body>
              <h5 className="mb-3 text-primary">Pasos para subir correctamente tus documentos:</h5>
              <ul>
                <li>El archivo debe estar en formato <strong>PDF</strong>.</li>
                <li>Asegúrate de que el nombre del archivo sea claro y representativo.</li>
                <li>Puedes seleccionar varios archivos a la vez.</li>
                <li>No se aceptarán archivos con nombres duplicados ya cargados.</li>
                <li>Verifica tu conexión a internet antes de subir.</li>
              </ul>
              <p className="text-muted mt-3">
                Si tienes dudas, contacta con el administrador del sistema.
              </p>
            </Card.Body>
          </Card>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowInstructionsModal(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* MODAL CONFIRMAR ELIMINACIÓN */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirmar Eliminación</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {docToDelete ? (
            <p>
              ¿Estás seguro de que deseas eliminar el documento <b>{docToDelete.nombre}</b>?
            </p>
          ) : (
            <p>No hay documento seleccionado.</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleConfirmDelete} disabled={loading}>
            Eliminar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* MODAL ERROR BONITO */}
      <Modal show={errorModal.show} onHide={closeErrorModal} centered>
        <Modal.Header closeButton style={{ backgroundColor: '#dc3545', color: '#fff' }}>
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

      {/* MODAL ÉXITO BONITO */}
      <Modal show={successModal.show} onHide={closeSuccessModal} centered>
        <Modal.Header closeButton style={{ backgroundColor: '#198754', color: '#fff' }}>
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
      <footer className="documentos-footer text-center py-3">
        © 2025 La Farmacia Homeopática - Más alternativas, más servicio.
      </footer>
    </div>
  );
};

export default Documentos;
