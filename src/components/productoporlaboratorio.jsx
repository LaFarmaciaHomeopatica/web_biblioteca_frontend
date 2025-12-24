// src/components/ProductoPorLaboratorio.jsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import axios from 'axios';
import {
  Container,
  Navbar,
  Form,
  FormControl,
  Button,
  Card,
  Modal,
  Spinner,
  Row,
  Col,
  Nav,
  Alert,
} from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../assets/consulta.css';
import { useNavigate, useParams } from 'react-router-dom';
import logo from '../assets/logo.jpeg';

const API_BASE = '/backend/api';
const PAGE_SIZE = 20;

const ProductoPorLaboratorio = () => {
  const navigate = useNavigate();
  const { laboratorioNombre } = useParams();

  // ✅ Formatear precios
  const formatearPrecio = (valor) => {
    if (valor == null || valor === '') return '';
    return parseFloat(valor).toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  // ✅ Formatear IVA igual que en Cliente: 0.19 -> 19%
  const formatearIVA = (valor) => {
    if (valor === null || valor === undefined || valor === '') return '';

    const texto = String(valor).trim();
    const match = texto.match(/[\d.,]+/);
    if (!match) return texto;

    let numero = parseFloat(match[0].replace(',', '.'));
    if (Number.isNaN(numero)) return texto;

    if (numero > 0 && numero < 1) {
      numero = numero * 100;
    }

    const entero = Math.round(numero);
    return `${entero}%`;
  };

  const mostrarPrecio = (valor) => {
    const f = formatearPrecio(valor);
    return f ? `$ ${f}` : '';
  };

  const normalizarCodigosAsociados = (val) => {
    if (val === null || val === undefined) return [];
    if (Array.isArray(val)) {
      return Array.from(new Set(val.map((x) => String(x ?? '').trim()).filter(Boolean)));
    }
    const raw = String(val ?? '').trim();
    if (!raw) return [];
    const parts = raw
      .split(/[\n,;]+/g)
      .map((x) => String(x ?? '').trim())
      .filter(Boolean);
    return Array.from(new Set(parts));
  };

  // States
  const [searchTerm, setSearchTerm] = useState('');
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [viewingProduct, setViewingProduct] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  // 📄 Estado para documentos asociados
  const [productoDocumentos, setProductoDocumentos] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState(null);

  // ✅ Productos asociados (reemplazo)
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [relatedError, setRelatedError] = useState(null);
  const productosAllCacheRef = useRef(null);

  // ✅ Evitar bucles/race conditions en paginación (ignorando respuestas viejas)
  const reqIdRef = useRef(0);

  const handleBack = () => navigate('/laboratorios');

  // ✅ Fetch productos
  const fetchProductos = useCallback(
    async (page = 1) => {
      if (!laboratorioNombre) return;

      const reqId = ++reqIdRef.current;

      setLoading(true);
      setError(null);
      try {
        let url = `${API_BASE}/productos/laboratorio/${encodeURIComponent(
          laboratorioNombre
        )}?page=${page}`;
        if (searchTerm.trim() !== '') {
          url += `&search=${encodeURIComponent(searchTerm.trim())}`;
        }
        const response = await axios.get(url);

        // ✅ Si llegó una respuesta vieja, la ignoramos
        if (reqId !== reqIdRef.current) return;

        setProductos(response.data?.data || []);
        setCurrentPage(response.data?.current_page ?? page);
        setLastPage(response.data?.last_page ?? 1);
      } catch (err) {
        if (reqId !== reqIdRef.current) return;
        setError('Error al cargar productos por laboratorio');
      } finally {
        if (reqId !== reqIdRef.current) return;
        setLoading(false);
      }
    },
    [laboratorioNombre, searchTerm]
  );

  useEffect(() => {
    fetchProductos(currentPage);
  }, [currentPage, fetchProductos]);

  useEffect(() => {
    setCurrentPage(1);
    fetchProductos(1);
  }, [fetchProductos]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  // ✅ Fetch documentos asociados a un producto
  const fetchDocumentosProducto = useCallback(async (productoId) => {
    if (!productoId) return;
    setDocsLoading(true);
    setDocsError(null);

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No hay sesión activa para consultar documentos.');
      }

      const resp = await axios.get(`${API_BASE}/documentos`, {
        params: {
          producto_id: productoId,
          per_page: 10,
        },
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      const docsArray = Array.isArray(resp.data?.data)
        ? resp.data.data
        : Array.isArray(resp.data)
          ? resp.data
          : [];

      setProductoDocumentos(docsArray);
    } catch (err) {
      console.error(
        'Error cargando documentos del producto:',
        err?.response?.data || err?.message || err
      );
      setDocsError('No fue posible cargar los documentos asociados.');
      setProductoDocumentos([]);
    } finally {
      setDocsLoading(false);
    }
  }, []);

  // ✅ Fetch productos asociados (reemplazo)
  const fetchProductosAsociados = useCallback(async (producto) => {
    setRelatedProducts([]);
    setRelatedError(null);

    const codigos = normalizarCodigosAsociados(
      producto?.productos_asociados ?? producto?.productos_relacionados
    );
    if (!producto || codigos.length === 0) return;

    setRelatedLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('No hay sesión activa para consultar productos asociados.');

      if (!productosAllCacheRef.current) {
        const resp = await axios.get(`${API_BASE}/productos-all`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        });
        productosAllCacheRef.current = Array.isArray(resp.data) ? resp.data : [];
      }

      const all = productosAllCacheRef.current || [];
      const setCodes = new Set(codigos.map((c) => String(c).trim()));
      const encontrados = all.filter((p) => setCodes.has(String(p?.codigo ?? '').trim()));

      const mapByCode = new Map(encontrados.map((p) => [String(p?.codigo ?? '').trim(), p]));
      const ordered = codigos.map((c) => mapByCode.get(String(c).trim())).filter(Boolean);

      setRelatedProducts(ordered);
    } catch (err) {
      console.error('Error cargando productos asociados:', err?.response?.data || err?.message || err);
      setRelatedError('No fue posible cargar los productos asociados.');
      setRelatedProducts([]);
    } finally {
      setRelatedLoading(false);
    }
  }, []);

  // Abrir documento individual
  const handleOpenDocumento = (doc) => {
    if (!doc?.ruta) return;
    const url = `/backend/api/documentos/stream?path=${encodeURIComponent(doc.ruta)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleViewClick = (producto) => {
    setViewingProduct(producto);
    setShowViewModal(true);
    fetchDocumentosProducto(producto.id);
    fetchProductosAsociados(producto);
  };

  const handleOpenRelatedProduct = (p) => {
    if (!p) return;
    setViewingProduct(p);
    fetchDocumentosProducto(p.id);
    fetchProductosAsociados(p);
  };

  // ✅ Controladores de paginación (sin llamar fetch aquí para evitar doble-request + bucles)
  const handlePageChange = (newPage) => {
    if (!loading && newPage >= 1 && newPage <= lastPage) {
      setCurrentPage(newPage);
    }
  };

  const handleCloseModal = () => {
    setShowViewModal(false);
    setViewingProduct(null);

    setProductoDocumentos([]);
    setDocsError(null);
    setDocsLoading(false);

    setRelatedProducts([]);
    setRelatedError(null);
    setRelatedLoading(false);
  };

  // ✅ Texto “Mostrando X - Y ...” (solo visual)
  const showing = useMemo(() => {
    const start = productos.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
    const end = (currentPage - 1) * PAGE_SIZE + (productos?.length || 0);
    const totalKnown = end; // sabemos como mínimo lo que llevamos cargado
    return { start, end, totalKnown };
  }, [currentPage, productos]);

  return (
    <div className="consulta-layout">
      {/* HEADER */}
      <Navbar expand="lg" className="consulta-header">
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
          <Navbar.Toggle aria-controls="navbarResponsive" />
          <Navbar.Collapse id="navbarResponsive" className="justify-content-end">
            <Nav className="d-flex flex-column flex-lg-row gap-2">
              <Button onClick={() => navigate('/modulomedico-cliente')}>
                <i className="bi bi-heart-pulse me-1"></i> Módulo Médico
              </Button>
              <Button onClick={() => navigate('/registrosanitariocliente')}>
                <i className="bi bi-hourglass-split me-1"></i> Registro Sanitario
              </Button>
              <Button onClick={() => navigate('/laboratorios')}>
                <i className="bi bi-droplet me-1"></i> Laboratorios
              </Button>
              <Button onClick={() => navigate('/vademecum')}>
                <i className="bi bi-book me-1"></i> Vademécum
              </Button>
              <Button onClick={() => navigate('/capacitacion')}>
                <i className="bi bi-mortarboard me-1"></i> Capacitación
              </Button>
              <Button onClick={() => navigate('/clientedoc')}>
                <i className="bi bi-file-earmark-text me-1"></i> Documentos
              </Button>
              <Button onClick={() => navigate('/cliente')} variant="secondary">
                <i className="bi bi-box-seam me-1"></i> Productos
              </Button>
              <Button onClick={() => navigate('/')} className="logout-button" variant="danger">
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
              Productos del Laboratorio:{' '}
              <span className="text-break" style={{ color: '#0857b3' }}>
                {laboratorioNombre}
              </span>
            </h2>

            {/* PANEL SUPERIOR estilo Consulta/RS */}
            <div className="rs-filters-panel mb-3">
              <Row className="g-2 align-items-end">
                {/* ✅ Búsqueda a la izquierda */}
                <Col xs={12} lg>
                  <Row className="g-2 align-items-end">
                    <Col xs={12}>
                      <Form.Label className="fw-semibold mb-1">Búsqueda</Form.Label>
                      <Form className="d-flex gap-2">
                        <FormControl
                          type="text"
                          placeholder="Buscar dentro de este laboratorio..."
                          value={searchTerm}
                          onChange={handleSearchChange}
                        />
                      </Form>
                    </Col>
                  </Row>
                </Col>

                {/* ✅ Botón volver a la derecha (como al inicio) */}
                <Col xs={12} lg="auto" className="ms-lg-auto d-flex justify-content-end">
                  <div className="d-flex flex-wrap gap-2">
                    <Button onClick={handleBack} variant="secondary">
                      <i className="bi bi-arrow-left-circle me-1"></i> Volver
                    </Button>
                  </div>
                </Col>
              </Row>
            </div>

            {/* ESTADOS */}
            {loading && (
              <div className="text-center mb-3">
                <Spinner animation="border" size="sm" className="me-2" />
                Cargando productos...
              </div>
            )}
            {error && <Alert variant="danger">{error}</Alert>}

            {/* LISTADO EN GRID UNIFORME (igual a Consulta/Cliente) */}
            <Row className="g-3 rs-grid">
              {productos.length > 0 ? (
                productos.map((producto, index) => {
                  const inactive = producto.estado_producto?.toLowerCase() === 'inactivo';
                  return (
                    <Col
                      key={producto.id ?? producto.codigo ?? index}
                      xs={12}
                      sm={6}
                      lg={4}
                      xl={3}
                      className="d-flex"
                    >
                      <div className={`rs-card w-100 ${inactive ? 'rs-card--inactive' : ''}`}>
                        <div className="rs-card-body">
                          {/* ✅ Nombre estilo RS (sin negrilla) */}
                          <div className="rs-name text-break">
                            {producto.nombre || '-'}
                          </div>

                          <div className="rs-line text-break">
                            <strong>Laboratorio:</strong> {producto.laboratorio || '-'}
                          </div>

                          <div className="rs-line">
                            <strong>Precio Público con IVA:</strong>{' '}
                            {mostrarPrecio(producto.precio_publico) || '-'}
                          </div>

                          <div className="rs-line">
                            <strong>Precio Médico con IVA:</strong>{' '}
                            {mostrarPrecio(producto.precio_medico) || '-'}
                          </div>

                          <div className="mt-auto d-flex gap-2 flex-wrap justify-content-center">
                            <Button size="sm" variant="info" onClick={() => handleViewClick(producto)}>
                              Ver
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Col>
                  );
                })
              ) : (
                !loading && (
                  <Col xs={12}>
                    <p className="text-center mb-0">
                      No hay productos disponibles para este laboratorio
                    </p>
                  </Col>
                )
              )}
            </Row>

            {/* PAGINACIÓN estilo RS */}
            {lastPage > 1 && (
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mt-3 gap-2">
                <div style={{ fontSize: '0.95rem' }}>
                  Mostrando{' '}
                  <strong>
                    {productos.length === 0 ? 0 : showing.start}
                    {' - '}
                    {showing.end}
                  </strong>{' '}
                  de <strong>{(currentPage < lastPage) ? `más de ${showing.totalKnown}` : showing.totalKnown}</strong>
                </div>

                <div className="d-flex gap-2 flex-wrap justify-content-center">
                  <Button
                    variant="outline-light"
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1 || loading}
                    title="Primera página"
                  >
                    ⏮
                  </Button>

                  <Button
                    variant="outline-light"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1 || loading}
                    title="Página anterior"
                  >
                    ◀
                  </Button>

                  <Button variant="light" disabled title="Página actual">
                    {loading ? <Spinner animation="border" size="sm" /> : `${currentPage} / ${lastPage}`}
                  </Button>

                  <Button
                    variant="outline-light"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === lastPage || loading}
                    title="Página siguiente"
                  >
                    ▶
                  </Button>

                  <Button
                    variant="outline-light"
                    onClick={() => handlePageChange(lastPage)}
                    disabled={currentPage === lastPage || loading}
                    title="Última página"
                  >
                    ⏭
                  </Button>
                </div>
              </div>
            )}
          </Card.Body>
        </Card>
      </Container>

      {/* MODAL DETALLES – DAVID + Documentos asociados + Productos asociados */}
      <Modal
        show={showViewModal}
        onHide={handleCloseModal}
        centered
        dialogClassName="consulta-view-modal"
      >
        {(() => {
          const isInactive = viewingProduct?.estado_producto?.toLowerCase() === 'inactivo';
          const headerColor = isInactive ? '#dc3545' : '#0857b3';

          return (
            <>
              <Modal.Header
                closeButton
                style={{ backgroundColor: headerColor, color: '#fff' }}
              >
                <Modal.Title className="d-flex align-items-center gap-2">
                  Detalles del Producto
                  {isInactive && (
                    <span
                      style={{
                        background: 'rgba(255,255,255,0.95)',
                        color: '#dc3545',
                        border: '1px solid rgba(255,255,255,0.65)',
                        padding: '4px 10px',
                        borderRadius: '999px',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                      title="Este producto está inactivo"
                    >
                      <i className="bi bi-slash-circle"></i>
                      INACTIVO
                    </span>
                  )}
                </Modal.Title>
              </Modal.Header>

              <Modal.Body style={{ background: '#f6f8fb' }}>
                {viewingProduct && (
                  <Row className="g-3">
                    {/* Panel izquierdo */}
                    <Col md={6}>
                      <Card className="h-100 shadow-sm border-0">
                        <Card.Body className="p-3">
                          <div className="pe-md-2" style={{ fontSize: '0.98rem' }}>
                            <p><strong>Nombre:</strong> {viewingProduct.nombre}</p>
                            <p><strong>Estado Producto:</strong> {viewingProduct.estado_producto}</p>
                            <p><strong>Precio Público con IVA:</strong> {mostrarPrecio(viewingProduct.precio_publico)}</p>
                            <p><strong>Precio Médico con IVA:</strong> {mostrarPrecio(viewingProduct.precio_medico)}</p>
                            <p><strong>IVA:</strong> {formatearIVA(viewingProduct.iva)}</p>
                            <p><strong>Requiere Fórmula Médica:</strong> {viewingProduct.formula_medica}</p>
                            <p><strong>Laboratorio:</strong> {viewingProduct.laboratorio}</p>
                            <p><strong>Categoría:</strong> {viewingProduct.categoria}</p>
                            <p><strong>Estado Registro:</strong> {viewingProduct.estado_registro}</p>
                            <p><strong>Fecha Vencimiento registro:</strong> {viewingProduct.fecha_vencimiento}</p>
                            <p><strong>Registro Sanitario:</strong> {viewingProduct.registro_sanitario}</p>
                            <p className="mb-0"><strong>Código:</strong> {viewingProduct.codigo}</p>
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>

                    {/* Panel derecho: DAVID + documentos + productos asociados */}
                    <Col md={6}>
                      <Card className="h-100 shadow-sm border-0">
                        <Card.Header
                          className="bg-white"
                          style={{ borderBottom: '1px solid #eef1f5' }}
                        >
                          <h5 className="mb-0 d-flex align-items-center gap-2">
                            <i className="bi bi-journal-text"></i> DAVID
                          </h5>
                        </Card.Header>

                        <Card.Body className="p-3">
                          <div
                            style={{
                              whiteSpace: 'pre-wrap',
                              lineHeight: 1.6,
                              maxHeight: '22vh',
                              overflowY: 'auto',
                            }}
                          >
                            {viewingProduct.david || (
                              <span className="text-muted">Sin información</span>
                            )}
                          </div>

                          <hr className="my-3" />

                          {/* Documentos asociados */}
                          <div>
                            <div className="d-flex align-items-center mb-2">
                              <i className="bi bi-file-earmark-text me-2"></i>
                              <strong>Documentos asociados</strong>
                            </div>

                            {docsLoading && (
                              <div className="small text-muted">
                                Cargando documentos asociados...
                              </div>
                            )}

                            {!docsLoading && docsError && (
                              <Alert variant="danger" className="py-1 px-2 small mb-0">
                                {docsError}
                              </Alert>
                            )}

                            {!docsLoading && !docsError && productoDocumentos.length === 0 && (
                              <span className="text-muted small">
                                Este producto no tiene documentos asociados.
                              </span>
                            )}

                            {!docsLoading && !docsError && productoDocumentos.length > 0 && (
                              <div className="d-flex flex-column gap-2">
                                {productoDocumentos.map((doc) => (
                                  <div
                                    key={doc.id}
                                    className="d-flex justify-content-between align-items-center flex-wrap gap-2"
                                  >
                                    <span
                                      className="text-truncate flex-grow-1"
                                      title={doc.nombre}
                                      style={{ fontSize: '0.9rem' }}
                                    >
                                      {doc.nombre}
                                    </span>
                                    <Button
                                      variant="info"
                                      size="sm"
                                      onClick={() => handleOpenDocumento(doc)}
                                    >
                                      Ver
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <hr className="my-3" />

                          {/* ✅ Productos asociados */}
                          <div>
                            <div className="d-flex align-items-center mb-2">
                              <i className="bi bi-boxes me-2"></i>
                              <strong>Productos asociados</strong>
                            </div>

                            {relatedLoading && (
                              <div className="small text-muted">
                                Cargando productos asociados...
                              </div>
                            )}

                            {!relatedLoading && relatedError && (
                              <Alert variant="danger" className="py-1 px-2 small mb-0">
                                {relatedError}
                              </Alert>
                            )}

                            {!relatedLoading && !relatedError && relatedProducts.length === 0 && (
                              <span className="text-muted small">
                                Este producto no tiene productos asociados.
                              </span>
                            )}

                            {!relatedLoading && !relatedError && relatedProducts.length > 0 && (
                              <div
                                className="d-flex flex-column gap-2"
                                style={{ maxHeight: '18vh', overflowY: 'auto' }}
                              >
                                {relatedProducts.map((p) => (
                                  <div
                                    key={p.id || p.codigo}
                                    className="d-flex justify-content-between align-items-start flex-wrap gap-2"
                                  >
                                    <div className="flex-grow-1" style={{ fontSize: '0.9rem' }}>
                                      <div className="fw-bold text-break">
                                        {p.nombre}{' '}
                                        {p.codigo ? (
                                          <span className="text-muted fw-normal">({p.codigo})</span>
                                        ) : null}
                                      </div>
                                      <div className="text-muted">
                                        Público: {mostrarPrecio(p.precio_publico)} · Médico: {mostrarPrecio(p.precio_medico)}
                                      </div>
                                    </div>

                                    <Button
                                      variant="outline-success"
                                      size="sm"
                                      onClick={() => handleOpenRelatedProduct(p)}
                                      title="Ver este producto asociado"
                                    >
                                      Ver
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
                )}
              </Modal.Body>
            </>
          );
        })()}
      </Modal>

      {/* FOOTER */}
      <footer className="consulta-footer text-center py-3">
        © 2025 La Farmacia Homeopática - Más alternativas, más servicio.
      </footer>
    </div>
  );
};

export default ProductoPorLaboratorio;