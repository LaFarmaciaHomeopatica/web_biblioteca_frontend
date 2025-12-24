// src/components/cliente.jsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import axios from 'axios';
import {
  Container, Navbar, Nav, Form, Spinner, FormControl, Button, Row, Col,
  Card, Modal, Alert
} from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../assets/consulta.css';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.jpeg';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'https://bibliotecalfh.com/backend/api';
const PAGE_SIZE = 20;

const Cliente = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleReload = () => {
    navigate(0);
  };

  // ===== Helpers de formato =====
  const formatearPrecio = (valor) => {
    if (valor === null || valor === undefined || valor === '') return '';
    const numero = Number(String(valor).replace(/[^0-9.-]/g, ''));
    return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0 }).format(numero);
  };

  const mostrarPrecio = (valor) => {
    const f = formatearPrecio(valor);
    return f ? `$ ${f}` : '';
  };

  const formatearIVA = (valor) => {
    if (valor === null || valor === undefined || valor === '') return '';

    const texto = String(valor).trim();
    const match = texto.match(/[\d.,]+/);
    if (!match) return texto;

    let numero = parseFloat(match[0].replace(',', '.'));
    if (Number.isNaN(numero)) return texto;

    if (numero > 0 && numero < 1) numero = numero * 100;
    return `${Math.round(numero)}%`;
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

  // ===== State =====
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState('nombre');
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [selectedProducto, setSelectedProducto] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  const [productoDocumentos, setProductoDocumentos] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState(null);

  const [relatedProducts, setRelatedProducts] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [relatedError, setRelatedError] = useState(null);

  const productosAllCacheRef = useRef(null);

  // ===== Paginación =====
  const paginarCliente = useCallback((lista, page) => {
    const total = lista.length;
    const lp = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const safePage = Math.min(Math.max(1, page), lp);
    const start = (safePage - 1) * PAGE_SIZE;
    const slice = lista.slice(start, start + PAGE_SIZE);
    setProductos(slice);
    setCurrentPage(safePage);
    setLastPage(lp);
  }, []);

  // ===== Fetch productos =====
  const fetchProductos = useCallback(
    async (page = 1) => {
      setError(null);

      const validTextFilters = [
        'nombre', 'codigo', 'categoria', 'laboratorio',
        'precio_publico', 'precio_medico'
      ];

      const applyFiltersAndPaginate = (all) => {
        const term = searchTerm.trim().toLowerCase();

        if (filterBy === 'inactivo') {
          const inactivos = (all || []).filter(
            (p) => String(p?.estado_producto || '').toLowerCase() === 'inactivo'
          );
          paginarCliente(inactivos, page);
          return;
        }

        if (filterBy === 'david') {
          const filtered = term
            ? (all || []).filter((p) => String(p?.david ?? '').toLowerCase().includes(term))
            : (all || []).filter((p) => String(p?.david ?? '').trim() !== '');
          paginarCliente(filtered, page);
          return;
        }

        const filterToUse = validTextFilters.includes(filterBy) ? filterBy : 'nombre';
        let filtered = all || [];

        if (term !== '') {
          filtered = filtered.filter((p) => {
            const value = p?.[filterToUse];
            return String(value ?? '').toLowerCase().includes(term);
          });
        }

        paginarCliente(filtered, page);
      };

      try {
        if (productosAllCacheRef.current) {
          applyFiltersAndPaginate(productosAllCacheRef.current);
          return;
        }

        const token = localStorage.getItem('authToken');

        if (!token) {
          if (filterBy === 'inactivo' || filterBy === 'david') {
            throw new Error(
              filterBy === 'inactivo'
                ? 'Necesitas estar autenticado para listar los inactivos.'
                : 'Necesitas estar autenticado para buscar por DAVID.'
            );
          }

          setLoading(true);

          const params = new URLSearchParams({ page: String(page) });
          const cleanSearch = searchTerm.trim();
          if (cleanSearch !== '') {
            const filterToUse = validTextFilters.includes(filterBy) ? filterBy : 'nombre';
            params.set('filter_by', filterToUse);
            params.set('search', cleanSearch);
          }

          const url = `${API_BASE}/productos?${params.toString()}`;
          const { data } = await axios.get(url, { headers: { Accept: 'application/json' } });

          setProductos(data?.data || []);
          setCurrentPage(data?.current_page ?? page);
          setLastPage(data?.last_page ?? 1);
          return;
        }

        setLoading(true);

        const resp = await axios.get(`${API_BASE}/productos-all`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        });

        const all = Array.isArray(resp.data) ? resp.data : [];
        productosAllCacheRef.current = all;

        applyFiltersAndPaginate(all);
      } catch (err) {
        setError('Error al cargar los productos');
        // eslint-disable-next-line no-console
        console.error('Error fetching productos:', err?.response?.data || err?.message || err);
        setProductos([]);
        setCurrentPage(1);
        setLastPage(1);
      } finally {
        setLoading(false);
      }
    },
    [searchTerm, filterBy, paginarCliente]
  );

  useEffect(() => {
    fetchProductos(currentPage);
  }, [currentPage, fetchProductos]);

  // ===== Fetch documentos =====
  const fetchDocumentosProducto = useCallback(async (productoId) => {
    if (!productoId) return;
    setDocsLoading(true);
    setDocsError(null);

    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('No hay sesión activa para consultar documentos.');

      const resp = await axios.get(`${API_BASE}/documentos`, {
        params: { producto_id: productoId, per_page: 10 },
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });

      const docsArray = Array.isArray(resp.data?.data)
        ? resp.data.data
        : (Array.isArray(resp.data) ? resp.data : []);

      setProductoDocumentos(docsArray);
    } catch (err) {
      console.error('Error cargando documentos del producto:', err?.response?.data || err?.message || err);
      setDocsError('No fue posible cargar los documentos asociados.');
      setProductoDocumentos([]);
    } finally {
      setDocsLoading(false);
    }
  }, []);

  // ===== Fetch productos asociados =====
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

  const handleOpenDocumento = (doc) => {
    if (!doc?.ruta) return;
    const url = `/backend/api/documentos/stream?path=${encodeURIComponent(doc.ruta)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // ===== UI handlers =====
  const handleShowDetails = (producto) => {
    setSelectedProducto(producto);
    setShowModal(true);
    fetchDocumentosProducto(producto.id);
    fetchProductosAsociados(producto);
  };

  const handleOpenRelatedProduct = (p) => {
    if (!p) return;
    setSelectedProducto(p);
    fetchDocumentosProducto(p.id);
    fetchProductosAsociados(p);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedProducto(null);
    setProductoDocumentos([]);
    setDocsError(null);
    setDocsLoading(false);
    setRelatedProducts([]);
    setRelatedError(null);
    setRelatedLoading(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleGoToDocs = () => navigate('/clientedoc');
  const handleGoToVademecum = () => navigate('/vademecum');
  const handleGoToCapacitacion = () => navigate('/capacitacion');
  const handleGoToLaboratorios = () => navigate('/laboratorios');
  const handleGoToVencimiento = () => navigate('/registrosanitariocliente');
  const handleGoToModuloMedico = () => navigate('/modulomedico-cliente');

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterByChange = (e) => {
    const val = e.target.value;
    setFilterBy(val);
    setCurrentPage(1);
    if (val === 'inactivo') setSearchTerm('');
  };

  const showing = useMemo(() => {
    const totalKnown = (currentPage - 1) * PAGE_SIZE + (productos?.length || 0);
    const start = productos.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
    const end = (currentPage - 1) * PAGE_SIZE + (productos?.length || 0);
    return { start, end, totalKnown };
  }, [currentPage, productos]);

  return (
    <div className="consulta-layout">
      {/* OVERRIDE SOLO HEADER: un tris más grandes los botones del navbar */}
   <style>{`
  /* Ajuste mínimo de centrado del header */
  .consulta-header .container-fluid{
    padding-left: 25px !important;
    padding-right: 35px !important;
  }

  /* Mantener botones alineados sin empujar */
  .consulta-header .navbar-collapse{
    flex-grow: 5;
  }
`}</style>


      {/* HEADER */}
      <Navbar expand="lg" className="consulta-header" variant="dark">
        <Container fluid>
          <Navbar.Brand className="d-flex align-items-center">
            <img src={logo} alt="Logo" width="40" height="40" className="me-2" />
            <span
              className="consulta-title"
              role="link"
              style={{ cursor: 'pointer' }}
              title="Recargar productos"
              onClick={handleReload}
            >
              BIBLIOTECALFH
            </span>
          </Navbar.Brand>

          <Navbar.Toggle aria-controls="navbarResponsive" />
          <Navbar.Collapse id="navbarResponsive" className="justify-content-end">
            <Nav className="d-flex flex-wrap align-items-center justify-content-end gap-2">
              {/* OJO: quitamos size="sm" para que no se vean más pequeños */}
              <Button onClick={handleGoToModuloMedico}>
                <i className="bi bi-heart-pulse me-1"></i> Médicos
              </Button>

              <Button onClick={handleGoToVencimiento}>
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

              <Button onClick={handleLogout} variant="danger">
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
              Consulta de Productos
            </h2>

            <div className="rs-filters-panel mb-3">
              <Row className="g-2 align-items-end">
                <Col xs={12} lg className="ms-lg-auto">
                  <Row className="g-2 align-items-end">
                    <Col xs={12} md={8}>
                      <Form.Label className="fw-semibold mb-1">Búsqueda</Form.Label>
                      <FormControl
                        type="text"
                        placeholder={
                          filterBy === 'david'
                            ? 'Buscar por DAVID... (vacío = ver todos con DAVID)'
                            : filterBy === 'inactivo'
                              ? 'Mostrando productos INACTIVOS'
                              : 'Buscar por nombre, laboratorio o código...'
                        }
                        value={searchTerm}
                        onChange={handleSearchChange}
                        disabled={filterBy === 'inactivo'}
                      />
                    </Col>

                    <Col xs={12} md={4}>
                      <Form.Label className="fw-semibold mb-1">Buscar por</Form.Label>
                      <Form.Select
                        value={filterBy}
                        onChange={handleFilterByChange}
                        className="w-100"
                      >
                        <option value="nombre">Nombre</option>
                        <option value="codigo">Código</option>
                        <option value="categoria">Categoría</option>
                        <option value="laboratorio">Laboratorio</option>
                        <option value="david">DAVID</option>
                        <option value="inactivo">INACTIVO</option>
                      </Form.Select>
                    </Col>
                  </Row>
                </Col>
              </Row>
            </div>

            {loading && (
              <div className="text-center mb-3">
                <Spinner animation="border" size="sm" className="me-2" />
                Cargando productos...
              </div>
            )}
            {error && <Alert variant="danger">{error}</Alert>}

            <Row className="g-3 rs-grid">
              {productos.length > 0 ? (
                productos.map((producto, index) => {
                  const isCardRedBorder = filterBy === 'inactivo';

                  return (
                    <Col
                      key={producto.id ?? producto.codigo ?? index}
                      xs={12}
                      sm={6}
                      lg={4}
                      xl={3}
                      className="d-flex"
                    >
                      <div
                        className="rs-card w-100"
                        style={isCardRedBorder ? { border: '2px solid #dc3545' } : undefined}
                      >
                        <div className="rs-card-body">
                          <div className="rs-name text-break">
                            {producto.nombre || '-'}
                          </div>

                          <div className="rs-line text-break">
                            <strong>Categoría:</strong> {producto.categoria || '-'}
                          </div>

                          <div className="rs-line">
                            <strong>Precio Público con IVA:</strong> {mostrarPrecio(producto.precio_publico) || '-'}
                          </div>

                          <div className="rs-line">
                            <strong>Precio Médico con IVA:</strong> {mostrarPrecio(producto.precio_medico) || '-'}
                          </div>

                          <div className="mt-auto d-flex gap-2 flex-wrap justify-content-center">
                            <Button
                              variant="primary"
                              size="sm"
                              className="btn-ver"
                              onClick={() => handleShowDetails(producto)}
                            >
                              Ver
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Col>
                  );
                })
              ) : (
                <Col xs={12}>
                  <p className="text-center mb-0">
                    {filterBy === 'david' && searchTerm.trim() === ''
                      ? 'Escribe un valor para buscar por DAVID o deja vacío para ver todos los que tienen DAVID.'
                      : 'No hay productos disponibles'}
                  </p>
                </Col>
              )}
            </Row>

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
                    onClick={() => fetchProductos(1)}
                    disabled={currentPage === 1 || loading}
                    title="Primera página"
                  >
                    ⏮
                  </Button>

                  <Button
                    variant="outline-light"
                    onClick={() => fetchProductos(currentPage - 1)}
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
                    onClick={() => fetchProductos(currentPage + 1)}
                    disabled={currentPage === lastPage || loading}
                    title="Página siguiente"
                  >
                    ▶
                  </Button>

                  <Button
                    variant="outline-light"
                    onClick={() => fetchProductos(lastPage)}
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

      {/* MODAL */}
      <Modal
        show={showModal}
        onHide={handleCloseModal}
        centered
        size="xl"
        dialogClassName="consulta-view-modal"
      >
        {(() => {
          const isInactive = selectedProducto?.estado_producto?.toLowerCase() === 'inactivo';
          const headerColor = isInactive ? '#dc3545' : '#0857b3';

          return (
            <>
              <Modal.Header closeButton style={{ backgroundColor: headerColor, color: '#fff' }}>
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
                        gap: '6px'
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
                {selectedProducto && (
                  <Row className="g-3">
                    <Col md={6}>
                      <Card className="h-100 shadow-sm border-0">
                        <Card.Body className="p-3">
                          <div className="pe-md-2" style={{ fontSize: '0.98rem' }}>
                            <p><strong>Nombre:</strong> {selectedProducto.nombre}</p>
                            <p><strong>Estado Producto:</strong> {selectedProducto.estado_producto}</p>
                            <p><strong>Precio Público con IVA:</strong> {mostrarPrecio(selectedProducto.precio_publico)}</p>
                            <p><strong>Precio Médico con IVA:</strong> {mostrarPrecio(selectedProducto.precio_medico)}</p>
                            <p><strong>IVA:</strong> {formatearIVA(selectedProducto.iva)}</p>
                            <p><strong>Requiere Fórmula Médica:</strong> {selectedProducto.formula_medica}</p>
                            <p><strong>Laboratorio:</strong> {selectedProducto.laboratorio}</p>
                            <p><strong>Categoría:</strong> {selectedProducto.categoria}</p>
                            <p><strong>Estado Registro:</strong> {selectedProducto.estado_registro}</p>
                            <p><strong>Fecha Vencimiento registro:</strong> {selectedProducto.fecha_vencimiento}</p>
                            <p><strong>Registro Sanitario:</strong> {selectedProducto.registro_sanitario}</p>
                            <p className="mb-0"><strong>Código:</strong> {selectedProducto.codigo}</p>
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>

                    <Col md={6}>
                      <Card className="h-100 shadow-sm border-0">
                        <Card.Header className="bg-white" style={{ borderBottom: '1px solid #eef1f5' }}>
                          <h5 className="mb-0 d-flex align-items-center gap-2">
                            <i className="bi bi-journal-text"></i> DAVID
                          </h5>
                        </Card.Header>
                        <Card.Body className="p-3">
                          <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, maxHeight: '22vh', overflowY: 'auto' }}>
                            {selectedProducto.david || <span className="text-muted">Sin información</span>}
                          </div>

                          <hr className="my-3" />

                          <div>
                            <div className="d-flex align-items-center mb-2">
                              <i className="bi bi-file-earmark-text me-2"></i>
                              <strong>Documentos asociados</strong>
                            </div>

                            {docsLoading && <div className="small text-muted">Cargando documentos asociados...</div>}

                            {!docsLoading && docsError && (
                              <Alert variant="danger" className="py-1 px-2 small mb-0">{docsError}</Alert>
                            )}

                            {!docsLoading && !docsError && productoDocumentos.length === 0 && (
                              <span className="text-muted small">Este producto no tiene documentos asociados.</span>
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
                                    <Button variant="info" size="sm" onClick={() => handleOpenDocumento(doc)}>
                                      Ver
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <hr className="my-3" />

                          <div>
                            <div className="d-flex align-items-center mb-2">
                              <i className="bi bi-boxes me-2"></i>
                              <strong>Productos asociados</strong>
                            </div>

                            {relatedLoading && <div className="small text-muted">Cargando productos asociados...</div>}

                            {!relatedLoading && relatedError && (
                              <Alert variant="danger" className="py-1 px-2 small mb-0">{relatedError}</Alert>
                            )}

                            {!relatedLoading && !relatedError && relatedProducts.length === 0 && (
                              <span className="text-muted small">Este producto no tiene productos asociados.</span>
                            )}

                            {!relatedLoading && !relatedError && relatedProducts.length > 0 && (
                              <div className="d-flex flex-column gap-2" style={{ maxHeight: '18vh', overflowY: 'auto' }}>
                                {relatedProducts.map((p) => (
                                  <div
                                    key={p.id || p.codigo}
                                    className="d-flex justify-content-between align-items-start flex-wrap gap-2"
                                  >
                                    <div className="flex-grow-1" style={{ fontSize: '0.9rem' }}>
                                      <div className="fw-bold text-break">
                                        {p.nombre}{' '}
                                        {p.codigo ? <span className="text-muted fw-normal">({p.codigo})</span> : null}
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
      <footer className="consulta-footer">
        © 2025 La Farmacia Homeopática - Más alternativas, más servicio.
      </footer>
    </div>
  );
};

export default Cliente;
