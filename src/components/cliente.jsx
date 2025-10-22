import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Container, Navbar, Nav, Form, Spinner, FormControl, Button, Row, Col,
  Card, Modal, Alert
} from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../assets/cliente.css';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.jpeg';
import { useAuth } from '../context/AuthContext';

/** Base de API (igual que en consulta.jsx) */
const API_BASE = 'https://bibliotecalfh.com/backend/api';
const PAGE_SIZE = 20; // mismo tamaño de página local que en consulta.jsx

const Cliente = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  // ✅ Recargar esta misma vista al hacer clic en el título
  const handleReload = () => {
    navigate(0);
    // Alternativa: window.location.reload();
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
    const s = String(valor).trim().replace(',', '.');
    return s.endsWith('%') ? s : `${s}%`;
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

  // ===== Paginación en cliente =====
  const paginarCliente = (lista, page) => {
    const total = lista.length;
    const lp = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const safePage = Math.min(Math.max(1, page), lp);
    const start = (safePage - 1) * PAGE_SIZE;
    const slice = lista.slice(start, start + PAGE_SIZE);
    setProductos(slice);
    setCurrentPage(safePage);
    setLastPage(lp);
  };

  // ===== Fetch productos =====
  const fetchProductos = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);

    try {
      if (filterBy === 'inactivo') {
        const token = localStorage.getItem('authToken');
        if (!token) throw new Error('Necesitas estar autenticado para listar los inactivos.');
        const resp = await axios.get(`${API_BASE}/productos-all`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        });
        const all = Array.isArray(resp.data) ? resp.data : [];
        const inactivos = all.filter(
          (p) => String(p?.estado_producto || '').toLowerCase() === 'inactivo'
        );
        paginarCliente(inactivos, page);
        return;
      }

      if (filterBy === 'david') {
        const token = localStorage.getItem('authToken');
        if (!token) throw new Error('Necesitas estar autenticado para buscar por DAVID.');
        const resp = await axios.get(`${API_BASE}/productos-all`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        });
        const all = Array.isArray(resp.data) ? resp.data : [];
        const term = searchTerm.trim().toLowerCase();

        const filtered = term
          ? all.filter((p) => String(p?.david ?? '').toLowerCase().includes(term))
          : all.filter((p) => String(p?.david ?? '').trim() !== '');

        paginarCliente(filtered, page);
        return;
      }

      const params = new URLSearchParams({ page: String(page) });
      const cleanSearch = searchTerm.trim();

      const validTextFilters = [
        'nombre', 'codigo', 'categoria', 'laboratorio',
        'precio_publico', 'precio_medico'
      ];

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
    } catch (err) {
      setError('Error al cargar los productos');
      console.error('Error fetching productos:', err?.response?.data || err?.message || err);
      setProductos([]);
      setCurrentPage(1);
      setLastPage(1);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filterBy]);

  useEffect(() => {
    fetchProductos(currentPage);
  }, [currentPage, fetchProductos]);

  // ===== Handlers UI =====
  const handleShowDetails = (producto) => {
    setSelectedProducto(producto);
    setShowModal(true);
  };
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedProducto(null);
  };
  const handleLogout = async () => {
    await logout();
    navigate('/');
  };
  const handleGoToDocs = () => navigate('/clientedoc');
  const handleGoToVademecum = () => navigate('/vademecum');
  const handleGoToCapacitacion = () => navigate('/capacitacion');
  const handleGoToLaboratorios = () => navigate('/laboratorios');
  const handleGoToVencimiento = () => navigate('/vencimiento');
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

  // ===== Render =====
  return (
    <div className="cliente-layout">
      {/* HEADER */}
      <Navbar expand="lg" className="cliente-header" variant="dark">
        <Container fluid>
          <Navbar.Brand className="d-flex align-items-center">
            <img src={logo} alt="Logo" width="40" height="40" className="me-2" />
            <span
              className="cliente-title"
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
      <Container fluid className="cliente-content px-3 px-md-5">
        <Row className="mt-4">
          <Col>
            <Card className="cliente-card">
              <Card.Body>
                <h2 className="usuarios-title-main mb-4 text-center text-md-start">
                  Consulta de Productos
                </h2>

                {/* Filtros + Búsqueda */}
                <Form className="d-flex flex-column flex-md-row mb-4 gap-2">
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
                  <Form.Select
                    value={filterBy}
                    onChange={handleFilterByChange}
                    className="w-100 w-md-auto"
                  >
                    <option value="nombre">Nombre</option>
                    <option value="codigo">Código</option>
                    <option value="categoria">Categoría</option>
                    <option value="laboratorio">Laboratorio</option>
                    <option value="david">DAVID</option>
                    <option value="inactivo">INACTIVO</option>
                  </Form.Select>
                </Form>

                {loading && <div className="text-center mb-3">Cargando productos...</div>}
                {error && <Alert variant="danger">{error}</Alert>}

                {/* Lista de productos */}
                <div className="product-list">
                  {productos.length > 0 ? (
                    productos.map((producto, index) => (
                      <div
                        className={`product-card ${producto.estado_producto?.toLowerCase() === 'inactivo' ? 'inactive' : ''}`}
                        key={index}
                      >
                        <div className="product-info">
                          <p><strong>Nombre:</strong> {producto.nombre}</p>
                          <p><strong>Categoría:</strong> {producto.categoria}</p>
                          <p><strong>Precio Público con IVA:</strong> {mostrarPrecio(producto.precio_publico)}</p>
                          <p><strong>Precio Médico con IVA:</strong> {mostrarPrecio(producto.precio_medico)}</p>
                        </div>
                        <div className="card-actions">
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
                    ))
                  ) : (
                    <p className="text-center">
                      {filterBy === 'david' && searchTerm.trim() === ''
                        ? 'Escribe un valor para buscar por DAVID o deja vacío para ver todos los que tienen DAVID.'
                        : 'No hay productos disponibles'}
                    </p>
                  )}
                </div>

                {/* Paginación */}
                {lastPage > 1 && (
                  <div className="pagination-wrapper mt-3 d-flex justify-content-center align-items-center gap-2">
                    {/* ———— MISMO DISEÑO QUE documentos.jsx ———— */}
                    {/* Primera página */}
                    <button
                      className="pagination-btn"
                      onClick={() => fetchProductos(1)}
                      disabled={currentPage === 1 || loading}
                      aria-label="Primera página"
                      title="Primera página"
                    >
                      <i className="bi bi-skip-backward-fill"></i>
                    </button>

                    {/* Anterior */}
                    <button
                      className="pagination-btn"
                      onClick={() => fetchProductos(currentPage - 1)}
                      disabled={currentPage === 1 || loading}
                      aria-label="Página anterior"
                      title="Página anterior"
                    >
                      <i className="bi bi-chevron-left"></i>
                    </button>

                    <span className="pagination-info">
                      {loading ? <Spinner animation="border" size="sm" /> : `${currentPage} / ${lastPage}`}
                    </span>

                    {/* Siguiente */}
                    <button
                      className="pagination-btn"
                      onClick={() => fetchProductos(currentPage + 1)}
                      disabled={currentPage === lastPage || loading}
                      aria-label="Página siguiente"
                      title="Página siguiente"
                    >
                      <i className="bi bi-chevron-right"></i>
                    </button>

                    {/* Última página */}
                    <button
                      className="pagination-btn"
                      onClick={() => fetchProductos(lastPage)}
                      disabled={currentPage === lastPage || loading}
                      aria-label="Última página"
                      title="Última página"
                    >
                      <i className="bi bi-skip-forward-fill"></i>
                    </button>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* MODAL Detalles – diseño igual al de Consulta */}
      <Modal
        show={showModal}
        onHide={handleCloseModal}
        centered
        size="xl"
        dialogClassName="cliente-view-modal"
      >
        {(() => {
          const isInactive = selectedProducto?.estado_producto?.toLowerCase() === 'inactivo';
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
                  {/* Panel izquierdo: datos generales */}
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

                  {/* Panel derecho: DAVID */}
                  <Col md={6}>
                    <Card className="h-100 shadow-sm border-0">
                      <Card.Header className="bg-white" style={{ borderBottom: '1px solid #eef1f5' }}>
                        <h5 className="mb-0 d-flex align-items-center gap-2">
                          <i className="bi bi-journal-text"></i> DAVID
                        </h5>
                      </Card.Header>
                      <Card.Body className="p-3">
                        <div
                          style={{
                            whiteSpace: 'pre-wrap',
                            lineHeight: 1.6,
                            maxHeight: '48vh',
                            overflowY: 'auto'
                          }}
                        >
                          {selectedProducto.david || <span className="text-muted">Sin información</span>}
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
      <footer className="cliente-footer">
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

export default Cliente;
