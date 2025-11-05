// src/components/laboratorios.jsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Container, Navbar, Nav, Button, Row, Col, Card, Spinner, Alert
} from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../assets/laboratorios.css';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.jpeg';
import { useAuth } from '../context/AuthContext';
import api from '../api/api';

const DEBUG_URLS = false; // ponlo en true para ver en consola las URLs calculadas

/** Imagen con fallback: primary -> backup -> logo */
const LabImage = ({ alt, primary, backup }) => {
  const [src, setSrc] = useState(primary || backup || null);
  const [triedBackup, setTriedBackup] = useState(false);

  const handleError = useCallback(() => {
    if (!triedBackup && backup && src !== backup) {
      setTriedBackup(true);
      setSrc(backup);
    } else {
      // último recurso
      setSrc(logo);
    }
  }, [backup, triedBackup, src]);

  if (!src) {
    // Sin rutas, muestra un relleno para mantener la card consistente
    return (
      <div
        className="laboratorio-img d-flex align-items-center justify-content-center"
        style={{ background: '#f9f9f9', height: 120 }}
      >
        <img
          src={logo}
          alt={alt}
          style={{ height: 60, objectFit: 'contain', opacity: 0.6 }}
        />
      </div>
    );
  }

  return (
    <Card.Img
      variant="top"
      src={src}
      alt={alt}
      className="laboratorio-img"
      style={{ height: 120, objectFit: 'contain', background: '#fff' }}
      loading="lazy"
      decoding="async"
      onError={handleError}
    />
  );
};

const Laboratorios = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [loading, setLoading] = useState(false);
  const [labs, setLabs] = useState([]);        // [{id, nombre, primary, backup}]
  const [error, setError] = useState('');

  // ===== helpers URL =====
  const sanitizeAbsUrl = useCallback((u) => {
    if (!u || typeof u !== 'string') return u;
    let out = u.trim();
    // Corrige /backend/backend/ duplicado al inicio del path
    out = out.replace(/^(https?:\/\/[^/]+)\/(?:backend\/)+/i, '$1/backend/');
    // Colapsa slashes repetidos (sin tocar https://)
    out = out.replace(/([^:]\/)\/+/g, '$1');
    return out;
  }, []);

  /**
   * Para cada item, calculamos:
   *  - primary: lo más estable (preferimos imagen estática /backend/storage/...)
   *  - backup: la alternativa (proxy ?path=... o viceversa)
   */
  const buildUrls = useCallback((d) => {
    const baseApi  = (api.defaults?.baseURL || '').replace(/\/+$/, '');   // .../backend/api
    const baseRoot = baseApi.replace(/\/api$/i, '');                      // .../backend

    const hasAbs = (s) => typeof s === 'string' && /^https?:\/\//i.test(s);
    const hasRel = (s) => typeof s === 'string' && s.trim() !== '';

    let primary = null;
    let backup  = null;

    // 1) Preferir imagen estática absoluta si viene
    if (hasAbs(d?.imagen_url)) {
      primary = sanitizeAbsUrl(d.imagen_url);
      if (hasRel(d?.imagen_path) || hasRel(d?.imagen)) {
        const rel = (d.imagen_path || d.imagen).trim();
        backup = sanitizeAbsUrl(`${baseApi}/laboratorios/imagen?path=${encodeURIComponent(rel)}`);
      } else if (hasAbs(d?.image_url)) {
        backup = sanitizeAbsUrl(d.image_url);
      }
    }
    // 2) Si no, usar image_url absoluta (proxy) como primary
    else if (hasAbs(d?.image_url)) {
      primary = sanitizeAbsUrl(d.image_url);
      if (hasRel(d?.imagen_url)) {
        const rel = d.imagen_url.trim().replace(/^\/+/, '');
        backup = sanitizeAbsUrl(`${baseRoot}/${rel}`);
      } else if (hasRel(d?.imagen_path) || hasRel(d?.imagen)) {
        const rel = (d.imagen_path || d.imagen).trim();
        backup = sanitizeAbsUrl(`${baseApi}/laboratorios/imagen?path=${encodeURIComponent(rel)}`);
      }
    }
    // 3) imagen_url relativa → absoluta (storage)
    else if (hasRel(d?.imagen_url)) {
      const rel = d.imagen_url.trim().replace(/^\/+/, '');
      primary = sanitizeAbsUrl(`${baseRoot}/${rel}`);
      if (hasRel(d?.imagen_path) || hasRel(d?.imagen)) {
        const relp = (d.imagen_path || d.imagen).trim();
        backup = sanitizeAbsUrl(`${baseApi}/laboratorios/imagen?path=${encodeURIComponent(relp)}`);
      } else if (hasAbs(d?.image_url)) {
        backup = sanitizeAbsUrl(d.image_url);
      }
    }
    // 4) Último recurso: proxy por path
    else if (hasRel(d?.imagen_path) || hasRel(d?.imagen)) {
      const rel = (d.imagen_path || d.imagen).trim();
      primary = sanitizeAbsUrl(`${baseApi}/laboratorios/imagen?path=${encodeURIComponent(rel)}`);
    }

    if (DEBUG_URLS) {
      // eslint-disable-next-line no-console
      console.log(`[LAB ${d?.id} - ${d?.nombre}]`, { primary, backup });
    }

    return { primary, backup };
  }, [sanitizeAbsUrl]);

  // === Navegación
  const handleLaboratorioClick = useCallback((nombre) => {
    navigate(`/productoporlaboratorio/${encodeURIComponent(nombre)}`);
  }, [navigate]);

  const handleGoToLaboratorios = useCallback(() => navigate('/laboratorios'), [navigate]);
  const handleGoToVademecum = useCallback(() => navigate('/vademecum'), [navigate]);
  const handleGoToCapacitacion = useCallback(() => navigate('/capacitacion'), [navigate]);
  const handleGoToDocs = useCallback(() => navigate('/clientedoc'), [navigate]);
  const handleGoToVencimiento = useCallback(() => navigate('/vencimiento'), [navigate]);
  const handleLogout = useCallback(async () => {
    await logout();
    navigate('/');
  }, [logout, navigate]);

  // === Carga desde backend
  const fetchLabs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/laboratorios'); // público
      const list = Array.isArray(data) ? data : [];
      const normalized = list.map((d) => {
        const { primary, backup } = buildUrls(d);
        return {
          id: d.id,
          nombre: d.nombre,
          primary,
          backup
        };
      });
      setLabs(normalized);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'No se pudieron cargar los laboratorios.';
      setError(msg);
      // eslint-disable-next-line no-console
      console.error('GET /laboratorios error:', err?.response?.data || err);
    } finally {
      setLoading(false);
    }
  }, [buildUrls]);

  useEffect(() => {
    fetchLabs();
  }, [fetchLabs]);

  // Orden alfabético
  const ordered = useMemo(() => {
    return [...labs].sort((a, b) =>
      String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es', { sensitivity: 'base' })
    );
  }, [labs]);

  return (
    <div className="laboratorios-layout">
      {/* HEADER */}
      <Navbar expand="lg" className="cliente-header" variant="dark">
        <Container fluid>
          <Navbar.Brand className="d-flex align-items-center">
            <img src={logo} alt="Logo" width="40" height="40" className="me-2" />
            <span
              className="cliente-title"
              role="link"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate('/cliente')}
              title="Ir a Productos"
            >
              BIBLIOTECALFH
            </span>
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="navbarResponsive" />
          <Navbar.Collapse id="navbarResponsive" className="justify-content-end">
            <Nav className="d-flex flex-column flex-lg-row gap-2">
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
              <Button onClick={handleGoToDocs}>
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
      <Container fluid className="laboratorios-content px-3 px-md-5">
        <h2 className="laboratorios-title text-center my-4">Laboratorios</h2>

        {loading && (
          <div className="text-center my-3">
            <Spinner animation="border" size="sm" className="me-2" />
            Cargando…
          </div>
        )}

        {!loading && error && (
          <Alert variant="danger" className="my-3">{error}</Alert>
        )}

        {!loading && !error && ordered.length === 0 && (
          <Alert variant="info" className="my-3">
            No hay laboratorios aún. Pídele al administrador que cree algunos en Laboratorios Admin.
          </Alert>
        )}

        <Row className="g-4">
          {ordered.map((lab) => (
            <Col key={lab.id} xs={6} sm={4} md={3} lg={2}>
              <Card
                onClick={() => handleLaboratorioClick(lab.nombre)}
                className="laboratorio-card h-100 shadow-sm"
                style={{ cursor: 'pointer' }}
              >
                <LabImage alt={lab.nombre} primary={lab.primary} backup={lab.backup} />
                <Card.Body className="p-2 text-center">
                  <h6 className="laboratorio-nombre">{lab.nombre}</h6>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </Container>

      <footer className="documentos-footer text-center py-3">
        © 2025 La Farmacia Homeopática - Más alternativas, más servicio.
      </footer>
    </div>
  );
};

export default Laboratorios;
