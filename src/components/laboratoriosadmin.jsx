// src/components/laboratoriosadmin.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  Container, Navbar, Button, Row, Col, Card, Modal, Form, InputGroup, Spinner, Alert
} from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../assets/laboratorios.css';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.jpeg';
import api from '../api/api';

const PLACEHOLDER_IMG = '/assets/placeholder.png';

/** Imagen perezosa para panel admin: carga solo cuando la card entra en pantalla */
const LazyLabImage = ({ alt, srcUrl }) => {
  const containerRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [src, setSrc] = useState(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        root: null,
        rootMargin: '0px 0px 100px 0px',
        threshold: 0.1,
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    if (srcUrl) {
      setSrc(srcUrl);
    } else {
      setSrc(PLACEHOLDER_IMG);
    }
  }, [isVisible, srcUrl]);

  const handleError = () => {
    setSrc(PLACEHOLDER_IMG);
  };

  return (
    <div
      ref={containerRef}
      className="laboratorio-img d-flex align-items-center justify-content-center"
      style={{ background: '#ffffff', height: 120 }}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
          loading="lazy"
          onError={handleError}
        />
      ) : (
        <img
          src={PLACEHOLDER_IMG}
          alt={alt}
          style={{ height: 60, objectFit: 'contain', opacity: 0.6 }}
        />
      )}
    </div>
  );
};

/** Card de laboratorio reutilizable */
const LabCard = ({ lab, onClickLab, onEdit, onDelete }) => (
  <Card
    className="laboratorio-card h-100 shadow-sm"
    style={{ width: 260, maxWidth: '100%' }} // tamaño fijo de card
  >
    <div
      onClick={() => onClickLab(lab.nombre)}
      style={{ cursor: 'pointer' }}
      title={`Ver productos de ${lab.nombre}`}
    >
      {lab.imagen_url ? (
        <LazyLabImage alt={lab.nombre} srcUrl={lab.imagen_url} />
      ) : (
        <div className="laboratorio-img no-image d-flex align-items-center justify-content-center">
          <strong className="text-muted px-2">{lab.nombre}</strong>
        </div>
      )}
    </div>

    <Card.Body className="p-2 text-center">
      <h6 className="laboratorio-nombre mb-2" title={lab.nombre}>{lab.nombre}</h6>
      <div className="d-flex justify-content-center gap-2">
        <Button size="sm" variant="warning" onClick={() => onEdit(lab)} title="Editar">
          <i className="bi bi-pencil"></i>
        </Button>
        <Button size="sm" variant="danger" onClick={() => onDelete(lab)} title="Eliminar">
          <i className="bi bi-trash"></i>
        </Button>
      </div>
    </Card.Body>
  </Card>
);

const Laboratoriosadmin = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [labs, setLabs] = useState([]);
  const [search, setSearch] = useState('');

  const [showEditModal, setShowEditModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [current, setCurrent] = useState({ id: null, nombre: '', file: null, preview: '' });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState({ show: false, title: '', message: '' });
  const openSuccess = useCallback((title, message) => setSuccess({ show: true, title, message }), []);
  const closeSuccess = useCallback(() => setSuccess({ show: false, title: '', message: '' }), []);

  // ========= trazabilidad =========
  const logAction = useCallback(async (accion, meta = {}) => {
    try {
      await api.post('/trazabilidad', {
        modulo: 'Laboratorios',
        accion,
        meta
      });
    } catch {
      // silencioso
    }
  }, []);

  const handleLaboratorioClick = useCallback((nombre) => {
    navigate(`/productoporlaboratorios/${encodeURIComponent(nombre)}`);
  }, [navigate]);

  const handleBackToAdmin = useCallback(() => navigate('/admin'), [navigate]);

  // ========== Cargar laboratorios ==========
  const fetchLabs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/laboratorios');
      const list = Array.isArray(data) ? data : [];

      const normalized = list.map((d) => ({
        id: d.id,
        nombre: d.nombre,
        imagen_url: d.imagen_url || d.image_url || null,
      }));

      setLabs(normalized);
    } catch (err
    ) {
      const status = err?.response?.status;
      const msg = status === 401
        ? 'Sesión expirada. Inicia sesión nuevamente.'
        : (err?.response?.data?.message || err?.message || 'No se pudieron cargar los laboratorios.');
      setError(msg);
      await logAction('Error al cargar laboratorios', { error: msg });
    } finally {
      setLoading(false);
    }
  }, [logAction]);

  useEffect(() => {
    fetchLabs();
  }, [fetchLabs]);

  // Filtro
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return labs;
    return labs.filter(l => String(l?.nombre || '').toLowerCase().includes(term));
  }, [labs, search]);

  // Crear / Editar
  const openCreate = useCallback(() => {
    setEditMode(false);
    setCurrent({ id: null, nombre: '', file: null, preview: '' });
    setShowEditModal(true);
    setError('');
  }, []);

  const openEdit = useCallback((lab) => {
    setEditMode(true);
    setCurrent({
      id: lab.id,
      nombre: lab.nombre || '',
      file: null,
      preview: lab.imagen_url || '',
    });
    setShowEditModal(true);
    setError('');
  }, []);

  const handleImageChange = useCallback((e) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    if (!/^image\//i.test(file.type)) {
      setError('El archivo seleccionado no es una imagen.');
      return;
    }
    setCurrent(prev => ({ ...prev, file }));
    const reader = new FileReader();
    reader.onload = () => setCurrent(prev => ({ ...prev, preview: String(reader.result || '') }));
    reader.readAsDataURL(file);
  }, []);

  const handleSave = useCallback(async () => {
    const nombreTrim = (current.nombre || '').trim();
    if (!nombreTrim) {
      setError('El nombre es obligatorio.');
      return;
    }

    const exists = labs.some(l =>
      l.id !== current.id &&
      String(l.nombre).trim().toLowerCase() === nombreTrim.toLowerCase()
    );
    if (exists) {
      setError(`Ya existe un laboratorio con el nombre "${nombreTrim}".`);
      return;
    }

    try {
      setLoading(true);
      setError('');

      if (editMode) {
        // EDITAR
        if (!current.file) {
          // Solo nombre
          try {
            await api.put(`/laboratorios/${current.id}`, { nombre: nombreTrim });
          } catch (err) {
            if (err?.response && [404, 405].includes(err.response.status)) {
              await api.post(`/laboratorios/${current.id}`, { nombre: nombreTrim });
            } else { throw err; }
          }

          await logAction(
            `Editó el laboratorio "${nombreTrim}" (solo nombre)`,
            { id: current.id, nombre: nombreTrim }
          );
        } else {
          // Nombre + imagen
          const fd = new FormData();
          fd.append('nombre', nombreTrim);
          fd.append('imagen', current.file);
          try {
            await api.put(`/laboratorios/${current.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
          } catch (err) {
            if (err?.response && [404, 405].includes(err.response.status)) {
              await api.post(`/laboratorios/${current.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            } else { throw err; }
          }

          await logAction(
            `Editó el laboratorio "${nombreTrim}" (con imagen)`,
            { id: current.id, nombre: nombreTrim }
          );
        }
        openSuccess('Laboratorio actualizado', `Se actualizó "${nombreTrim}" correctamente.`);
      } else {
        // CREAR
        const fd = new FormData();
        fd.append('nombre', nombreTrim);
        if (current.file) fd.append('imagen', current.file);

        await api.post('/laboratorios', fd, { headers: { 'Content-Type': 'multipart/form-data' } });

        await logAction(
          `Creó el laboratorio "${nombreTrim}"`,
          { nombre: nombreTrim }
        );

        openSuccess('Laboratorio creado', `Se creó "${nombreTrim}" correctamente.`);
      }

      setShowEditModal(false);
      setCurrent({ id: null, nombre: '', file: null, preview: '' });
      await fetchLabs();
    } catch (err) {
      let msg = 'No se pudo guardar el laboratorio.';
      if (err?.response?.status === 422) {
        const errors = err.response.data?.errors;
        msg = errors ? Object.values(errors).flat().join('\n') : (err.response.data?.message || msg);
      } else if (err?.response?.status === 401) {
        msg = 'Sesión expirada. Inicia sesión nuevamente.';
      } else {
        msg = err?.response?.data?.message || err?.message || msg;
      }
      setError(msg);
      await logAction(
        `Error al guardar laboratorio "${nombreTrim}"`,
        { error: msg, id: current.id || null, nombre: nombreTrim }
      );
    } finally {
      setLoading(false);
    }
  }, [current, editMode, labs, fetchLabs, openSuccess, logAction]);

  // Eliminar
  const requestDelete = useCallback((lab) => {
    setToDelete(lab);
    setShowDeleteModal(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!toDelete) return;
    try {
      setLoading(true);
      await api.delete(`/laboratorios/${toDelete.id}`);
      setShowDeleteModal(false);

      await logAction(
        `Eliminó el laboratorio "${toDelete.nombre}" (ID ${toDelete.id})`,
        { id: toDelete.id, nombre: toDelete.nombre }
      );

      setToDelete(null);
      openSuccess('Laboratorio eliminado', `"${toDelete.nombre}" fue eliminado correctamente.`);
      await fetchLabs();
    } catch (err) {
      const status = err?.response?.status;
      let msg = err?.response?.data?.message || err?.message || 'No se pudo eliminar el laboratorio.';
      if (status === 401) msg = 'Sesión expirada. Inicia sesión nuevamente.';
      setError(msg);
      await logAction(
        `Error al eliminar laboratorio "${toDelete?.nombre}"`,
        { error: msg, id: toDelete?.id, nombre: toDelete?.nombre }
      );
    } finally {
      setLoading(false);
    }
  }, [toDelete, fetchLabs, openSuccess, logAction]);

  const onlyOne = filtered.length === 1;

  return (
    <div className="laboratorios-layout">
      {/* HEADER (solo botón Volver) */}
      <Navbar expand="lg" className="consulta-header" variant="dark">
        <Container fluid>
          <Navbar.Brand className="d-flex align-items-center">
            <img src={logo} alt="Logo" width="40" height="40" className="me-2" />
            <span
              className="consulta-title"
              role="link"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate('/admin')}
              title="Ir al panel de administración"
            >
              BIBLIOTECALFH
            </span>
          </Navbar.Brand>

          <div className="ms-auto">
            <Button variant="secondary" onClick={handleBackToAdmin}>
              <i className="bi bi-arrow-left-circle me-1" /> Volver
            </Button>
          </div>
        </Container>
      </Navbar>

      {/* CONTENIDO */}
      <Container fluid className="laboratorios-content px-3 px-md-5">
        <h2 className="laboratorios-title text-center my-4">LABORATORIOS</h2>

        <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between my-3 gap-2">
          <InputGroup className="me-2" style={{ maxWidth: 520 }}>
            <InputGroup.Text><i className="bi bi-search" /></InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Buscar laboratorio..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </InputGroup>

          <Button className="btn-new-lab d-inline-flex align-items-center" onClick={openCreate}>
            <i className="bi bi-plus-circle me-2"></i> Nuevo laboratorio
          </Button>
        </div>

        {loading && (
          <div className="text-center my-3">
            <Spinner animation="border" size="sm" className="me-2" />
            Cargando…
          </div>
        )}

        {!loading && error && <Alert variant="danger" className="my-3">{error}</Alert>}

        {!loading && !error && filtered.length === 0 && (
          <Alert variant="info" className="my-3">
            No hay laboratorios. Crea el primero con el botón “Nuevo laboratorio”.
          </Alert>
        )}

        {/* LISTADO DE CARDS */}
        {filtered.length > 0 && (
          onlyOne ? (
            // Caso 1 laboratorio: card centrada y grande
            <Row className="g-4 justify-content-center">
              <Col xs="auto">
                <LabCard
                  lab={filtered[0]}
                  onClickLab={handleLaboratorioClick}
                  onEdit={openEdit}
                  onDelete={requestDelete}
                />
              </Col>
            </Row>
          ) : (
            // Varios laboratorios: grid normal
            <Row className="g-4">
              {filtered.map((lab) => (
                <Col
                  key={lab.id}
                  xs={12}
                  sm={6}
                  md={4}
                  lg={3}
                  xl={2}
                  className="d-flex justify-content-center"
                >
                  <LabCard
                    lab={lab}
                    onClickLab={handleLaboratorioClick}
                    onEdit={openEdit}
                    onDelete={requestDelete}
                  />
                </Col>
              ))}
            </Row>
          )
        )}
      </Container>

      {/* MODAL CREAR / EDITAR */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{editMode ? 'Editar laboratorio' : 'Nuevo laboratorio'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger" className="mb-3">{error}</Alert>}
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Nombre</Form.Label>
              <Form.Control
                type="text"
                value={current.nombre}
                onChange={(e) => setCurrent(prev => ({ ...prev, nombre: e.target.value }))}
                placeholder="Ej: BOIRON"
              />
            </Form.Group>

            <Form.Group>
              <Form.Label>Imagen (opcional)</Form.Label>
              <Form.Control type="file" accept="image/*" onChange={handleImageChange} />
              {current.preview && (
                <div className="mt-3 d-flex justify-content-center">
                  <img
                    src={current.preview}
                    alt="preview"
                    style={{
                      maxWidth: 260,
                      maxHeight: 150,
                      objectFit: 'contain',
                      border: '1px solid #eee',
                      borderRadius: 8,
                      background: '#fff',
                      padding: 8
                    }}
                  />
                </div>
              )}
              <Form.Text className="text-muted">
                Se sube al servidor y quedará disponible en producción.
              </Form.Text>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer className="d-flex gap-2">
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancelar</Button>
          <Button variant="primary" onClick={handleSave} disabled={loading}>
            {loading ? 'Guardando…' : (editMode ? 'Guardar cambios' : 'Crear')}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* MODAL CONFIRMAR ELIMINACIÓN */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Eliminar laboratorio</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {toDelete ? (
            <p>¿Seguro que quieres eliminar <b>{toDelete.nombre}</b>?</p>
          ) : (
            'No hay laboratorio seleccionado.'
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancelar</Button>
          <Button variant="danger" onClick={handleConfirmDelete} disabled={loading}>
            {loading ? 'Eliminando…' : 'Eliminar'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* MODAL ÉXITO */}
      <Modal show={success.show} onHide={closeSuccess} centered>
        <Modal.Header closeButton style={{ backgroundColor: '#198754', color: '#fff' }}>
          <Modal.Title>{success.title || 'Éxito'}</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ whiteSpace: 'pre-line' }}>
          {success.message || 'Operación realizada correctamente.'}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="success" onClick={closeSuccess}>Perfecto</Button>
        </Modal.Footer>
      </Modal>

      {/* FOOTER */}
      <footer className="documentos-footer text-center py-3">
        © 2025 La Farmacia Homeopática - Más alternativas, más servicio.
      </footer>
    </div>
  );
};

export default Laboratoriosadmin;
