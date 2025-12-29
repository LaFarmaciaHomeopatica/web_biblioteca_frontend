// src/components/laboratorios.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  Container,
  Navbar,
  Nav,
  Button,
  Row,
  Col,
  Card,
  Spinner,
  Alert,
  InputGroup,
  Form,
} from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../assets/laboratorios.css';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.jpeg';
import placeholder from '../assets/placeholder.png';
import { useAuth } from '../context/AuthContext';
import api from '../api/api';

const DEBUG_URLS = false;

/** Imagen perezosa: solo carga cuando la card entra en pantalla */
const LazyLabImage = ({ alt, primary, backup }) => {
  const containerRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [src, setSrc] = useState(null);
  const [triedBackup, setTriedBackup] = useState(false);

  // Detecta cuando la card entra en el viewport
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
        rootMargin: '0px 0px 100px 0px', // precarga un poco antes de que aparezca
        threshold: 0.1,
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Cuando es visible, decide qué URL usar
  useEffect(() => {
    if (!isVisible) return;

    if (primary) {
      setSrc(primary);
    } else if (backup) {
      setSrc(backup);
    } else {
      setSrc(placeholder); // si no hay ninguna, queda blanco
    }
  }, [isVisible, primary, backup]);

  const handleError = () => {
    // Si falla la primaria, intenta backup
    if (!triedBackup && backup && src !== backup) {
      setTriedBackup(true);
      setSrc(backup);
    } else {
      setSrc(placeholder);
    }
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
        // Mientras no es visible o aún no se decidió src, mostramos placeholder blanco
        <img
          src={placeholder}
          alt={alt}
          style={{ height: 60, objectFit: 'contain', opacity: 1 }}
        />
      )}
    </div>
  );
};

/** Card de laboratorio (solo lectura) con tamaño fijo */
const LabCard = ({ lab, onClickLab }) => (
  <Card
    onClick={() => onClickLab(lab.nombre)}
    className="laboratorio-card h-100 shadow-sm"
    style={{ cursor: 'pointer', width: 260, maxWidth: '100%' }}
  >
    <LazyLabImage alt={lab.nombre} primary={lab.primary} backup={lab.backup} />
    <Card.Body className="p-2 text-center">
      <h6 className="laboratorio-nombre">{lab.nombre}</h6>
    </Card.Body>
  </Card>
);

const Laboratorios = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [loading, setLoading] = useState(false);
  const [labs, setLabs] = useState([]); // [{id, nombre, primary, backup}]
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // ===== helpers URL =====
  const sanitizeAbsUrl = useCallback((u) => {
    if (!u || typeof u !== 'string') return u;
    let out = u.trim();
    out = out.replace(/^(https?:\/\/[^/]+)\/(?:backend\/)+/i, '$1/backend/');
    out = out.replace(/([^:]\/)\/+/g, '$1');
    return out;
  }, []);

  const buildUrls = useCallback(
    (d) => {
      const baseApi = (api.defaults?.baseURL || '').replace(/\/+$/, ''); 
      const baseRoot = baseApi.replace(/\/api$/i, '');

      const hasAbs = (s) => typeof s === 'string' && /^https?:\/\//i.test(s);
      const hasRel = (s) => typeof s === 'string' && s.trim() !== '';

      let primary = null;
      let backup = null;

      if (hasAbs(d?.imagen_url)) {
        primary = sanitizeAbsUrl(d.imagen_url);
        if (hasRel(d?.imagen_path) || hasRel(d?.imagen)) {
          const rel = (d.imagen_path || d.imagen).trim();
          backup = sanitizeAbsUrl(
            `${baseApi}/laboratorios/imagen?path=${encodeURIComponent(rel)}`
          );
        } else if (hasAbs(d?.image_url)) {
          backup = sanitizeAbsUrl(d.image_url);
        }
      }

      else if (hasAbs(d?.image_url)) {
        primary = sanitizeAbsUrl(d.image_url);
        if (hasRel(d?.imagen_url)) {
          const rel = d.imagen_url.trim().replace(/^\/+/, '');
          backup = sanitizeAbsUrl(`${baseRoot}/${rel}`);
        } else if (hasRel(d?.imagen_path) || hasRel(d?.imagen)) {
          const rel = (d.imagen_path || d.imagen).trim();
          backup = sanitizeAbsUrl(
            `${baseApi}/laboratorios/imagen?path=${encodeURIComponent(rel)}`
          );
        }
      }
      // imagen_url relativa → absoluta (storage)
      else if (hasRel(d?.imagen_url)) {
        const rel = d.imagen_url.trim().replace(/^\/+/, '');
        primary = sanitizeAbsUrl(`${baseRoot}/${rel}`);
        if (hasRel(d?.imagen_path) || hasRel(d?.imagen)) {
          const relp = (d.imagen_path || d.imagen).trim();
          backup = sanitizeAbsUrl(
            `${baseApi}/laboratorios/imagen?path=${encodeURIComponent(relp)}`
          );
        } else if (hasAbs(d?.image_url)) {
          backup = sanitizeAbsUrl(d.image_url);
        }
      }
      // Último recurso: proxy por path
      else if (hasRel(d?.imagen_path) || hasRel(d?.imagen)) {
        const rel = (d.imagen_path || d.imagen).trim();
        primary = sanitizeAbsUrl(
          `${baseApi}/laboratorios/imagen?path=${encodeURIComponent(rel)}`
        );
      }

      if (DEBUG_URLS) {
        console.log(`[LAB ${d?.id} - ${d?.nombre}]`, { primary, backup });
      }

      return { primary, backup };
    },
    [sanitizeAbsUrl]
  );

  // === Navegación
  const handleLaboratorioClick = useCallback(
    (nombre) => {
      navigate(`/productoporlaboratorio/${encodeURIComponent(nombre)}`);
    },
    [navigate]
  );

  const handleGoToLaboratorios = useCallback(() => navigate('/laboratorios'), [navigate]);
  const handleGoToVademecum = useCallback(() => navigate('/vademecum'), [navigate]);
  const handleGoToCapacitacion = useCallback(() => navigate('/capacitacion'), [navigate]);
  const handleGoToDocs = useCallback(() => navigate('/clientedoc'), [navigate]);
  const handleGoToRegistroSanitariocliente = useCallback(() => navigate('/registrosanitariocliente'), [navigate]);
  const handleGoToModuloMedico = () => navigate('/modulomedico-cliente');
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
          backup,
        };
      });
      setLabs(normalized);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'No se pudieron cargar los laboratorios.';
      setError(msg);
      console.error('GET /laboratorios error:', err?.response?.data || err);
    } finally {
      setLoading(false);
    }
  }, [buildUrls]);

  useEffect(() => {
    fetchLabs();
  }, [fetchLabs]);

  // Filtro + orden alfabético
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const base = term
      ? labs.filter((l) => String(l.nombre || '').toLowerCase().includes(term))
      : labs;

    return [...base].sort((a, b) =>
      String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es', {
        sensitivity: 'base',
      })
    );
  }, [labs, search]);

  const onlyOne = filtered.length === 1;

  return (
    <div className="laboratorios-layout">
      {/* HEADER */}
      <Navbar expand="lg" className="consulta-header" variant="dark">
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

              <Button onClick={handleGoToModuloMedico}>
                <i className="bi bi-heart-pulse me-1"></i> Médicos
              </Button>
              <Button onClick={handleGoToRegistroSanitariocliente}>
                <i className="bi bi-hourglass-split me-1"></i> Registro Sanitario
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

        {/* Barra de búsqueda */}
        <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between my-3 gap-2">
          <InputGroup className="me-2" style={{ maxWidth: 520 }}>
            <InputGroup.Text>
              <i className="bi bi-search" />
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Buscar laboratorio..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </InputGroup>
        </div>

        {loading && (
          <div className="text-center my-3">
            <Spinner animation="border" size="sm" className="me-2" />
            Cargando…
          </div>
        )}

        {!loading && error && (
          <Alert variant="danger" className="my-3">
            {error}
          </Alert>
        )}

        {!loading && !error && filtered.length === 0 && (
          <Alert variant="info" className="my-3">
            No hay laboratorios aún. Pídele al administrador que cree algunos en Laboratorios
            Admin.
          </Alert>
        )}

        {/* LISTADO DE CARDS */}
        {filtered.length > 0 && (
          onlyOne ? (
            <Row className="g-4 justify-content-center">
              <Col xs="auto">
                <LabCard lab={filtered[0]} onClickLab={handleLaboratorioClick} />
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
                  <LabCard lab={lab} onClickLab={handleLaboratorioClick} />
                </Col>
              ))}
            </Row>
          )
        )}
      </Container>

      <footer className="documentos-footer text-center py-3">
        © 2025 La Farmacia Homeopática - Más alternativas, más servicio.
      </footer>
    </div>
  );
};

export default Laboratorios;
