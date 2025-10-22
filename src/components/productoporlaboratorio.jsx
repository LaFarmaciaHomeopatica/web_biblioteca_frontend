// src/components/ProductoPorLaboratorio.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    Container, Navbar, Form, FormControl, Button, Card, Modal, Spinner, Row, Col, Nav
} from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../assets/consulta.css';
import { useNavigate, useParams } from 'react-router-dom';
import logo from '../assets/logo.jpeg';

const ProductoPorLaboratorio = () => {
    const navigate = useNavigate();
    const { laboratorioNombre } = useParams();

    // ✅ Formatear precios
    const formatearPrecio = (valor) => {
        if (valor == null || valor === '') return '';
        return parseFloat(valor).toLocaleString('es-CO', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
    };

    const formatearIVA = (valor) => {
        if (valor === null || valor === undefined || valor === '') return '';
        const s = String(valor).trim().replace(',', '.');
        return s.endsWith('%') ? s : `${s}%`;
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

    const handleBack = () => navigate('/laboratorios');

    // ✅ Fetch productos
    const fetchProductos = useCallback(async (page = 1) => {
        if (!laboratorioNombre) return;
        setLoading(true);
        setError(null);
        try {
            let url = `/backend/api/productos/laboratorio/${encodeURIComponent(laboratorioNombre)}?page=${page}`;
            if (searchTerm.trim() !== '') {
                url += `&search=${encodeURIComponent(searchTerm.trim())}`;
            }
            const response = await axios.get(url);
            setProductos(response.data?.data || []);
            setCurrentPage(response.data?.current_page ?? page);
            setLastPage(response.data?.last_page ?? 1);
        } catch (err) {
            setError('Error al cargar productos por laboratorio');
        } finally {
            setLoading(false);
        }
    }, [laboratorioNombre, searchTerm]);

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

    const handleViewClick = (producto) => {
        setViewingProduct(producto);
        setShowViewModal(true);
    };

    // ✅ Controladores de paginación
    const handlePageChange = (newPage) => {
        if (!loading && newPage >= 1 && newPage <= lastPage) {
            setCurrentPage(newPage);
            fetchProductos(newPage);
        }
    };

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
                            style={{ cursor: 'pointer'}}
                            onClick={() => navigate('/cliente')}
                            title="Ir a Productos"
                        >
                            BIBLIOTECALFH
                        </span>
                    </Navbar.Brand>
                    <Navbar.Toggle aria-controls="navbarResponsive" />
                    <Navbar.Collapse id="navbarResponsive" className="justify-content-end">
                        <Nav className="d-flex flex-column flex-lg-row gap-2">
                            <Button onClick={() => navigate('/vencimiento')}>
                                <i className="bi bi-hourglass-split me-1"></i> Vencimiento
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
                {/* ✅ Botón Volver dentro del container principal */}
                <Row className="mt-3 mb-2">
                    <Col className="d-flex justify-content-end">
                        <Button onClick={handleBack} className="btn btn-secondary">
                            <i className="bi bi-arrow-left-circle me-1"></i> Volver
                        </Button>
                    </Col>
                </Row>

                <Card className="consulta-card">
                    <Card.Body>
                        <h2 className="consulta-title-main mb-4 text-center text-md-start">
                            Productos del Laboratorio: <span className="text-break" style={{ color: '#0857b3' }}>{laboratorioNombre}</span>
                        </h2>

                        {/* BÚSQUEDA */}
                        <div className="d-flex flex-column flex-md-row gap-2 mb-4">
                            <Form className="d-flex flex-column flex-md-row gap-2 flex-grow-1">
                                <FormControl
                                    type="text"
                                    placeholder="Buscar dentro de este laboratorio..."
                                    value={searchTerm}
                                    onChange={handleSearchChange}
                                />
                            </Form>
                        </div>

                        {/* ESTADOS */}
                        {loading && <div className="text-center mb-3">Cargando productos...</div>}
                        {error && <div className="alert alert-danger">{error}</div>}

                        {/* LISTA */}
                        <div className="product-list">
                            {productos.length > 0 ? (
                                productos.map((producto, index) => (
                                    <div
                                        className={`product-card ${producto.estado_producto?.toLowerCase() === 'inactivo' ? 'inactive' : ''}`}
                                        key={index}
                                    >
                                        <div className="product-info text-break">
                                            <p><strong>Nombre:</strong> {producto.nombre}</p>
                                            <p><strong>Laboratorio:</strong> {producto.laboratorio}</p>
                                            <p><strong>Precio Público con IVA:</strong> ${formatearPrecio(producto.precio_publico)}</p>
                                            <p><strong>Precio Médico con IVA:</strong> ${formatearPrecio(producto.precio_medico)}</p>
                                        </div>
                                        <div className="card-actions">
                                            <Button size="sm" variant="info" onClick={() => handleViewClick(producto)}>Ver</Button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                !loading && <p className="text-center">No hay productos disponibles para este laboratorio</p>
                            )}
                        </div>

                        {/* ✅ PAGINACIÓN (idéntica a documentos.jsx) */}
                        {lastPage > 1 && (
                            <div className="pagination-wrapper mt-4 d-flex justify-content-center gap-2">
                                <button
                                    className="pagination-btn"
                                    onClick={() => handlePageChange(1)}
                                    disabled={currentPage === 1 || loading}
                                    title="Primera página"
                                >
                                    <i className="bi bi-skip-backward-fill"></i>
                                </button>
                                <button
                                    className="pagination-btn"
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1 || loading}
                                    title="Página anterior"
                                >
                                    <i className="bi bi-chevron-left"></i>
                                </button>
                                <span className="pagination-info">
                                    {loading ? <Spinner animation="border" size="sm" /> : `${currentPage} / ${lastPage}`}
                                </span>
                                <button
                                    className="pagination-btn"
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === lastPage || loading}
                                    title="Página siguiente"
                                >
                                    <i className="bi bi-chevron-right"></i>
                                </button>
                                <button
                                    className="pagination-btn"
                                    onClick={() => handlePageChange(lastPage)}
                                    disabled={currentPage === lastPage || loading}
                                    title="Última página"
                                >
                                    <i className="bi bi-skip-forward-fill"></i>
                                </button>
                            </div>
                        )}
                    </Card.Body>
                </Card>
            </Container>

            {/* MODAL DETALLES */}
            <Modal
                show={showViewModal}
                onHide={() => setShowViewModal(false)}
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
                                {viewingProduct && (
                                    <Row className="g-3">
                                        {/* Panel izquierdo */}
                                        <Col md={6}>
                                            <Card className="h-100 shadow-sm border-0">
                                                <Card.Body className="p-3">
                                                    <div className="pe-md-2" style={{ fontSize: '0.98rem' }}>
                                                        <p><strong>Nombre:</strong> {viewingProduct.nombre}</p>
                                                        <p><strong>Estado Producto:</strong> {viewingProduct.estado_producto}</p>
                                                        <p><strong>Precio Público con IVA:</strong> ${formatearPrecio(viewingProduct.precio_publico)}</p>
                                                        <p><strong>Precio Médico con IVA:</strong> ${formatearPrecio(viewingProduct.precio_medico)}</p>
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
                                                        {viewingProduct.david || <span className="text-muted">Sin información</span>}
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
