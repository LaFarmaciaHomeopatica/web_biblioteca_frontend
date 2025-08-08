import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    Container, Navbar, Form, FormControl, Button, Card, Modal
} from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../assets/consulta.css';
import { useNavigate, useParams } from 'react-router-dom';
import logo from '../assets/logo.jpeg';

const ProductoPorLaboratorio = () => {
    const navigate = useNavigate();
    const { laboratorioNombre } = useParams();

    // ✅ Función para formatear precios
    const formatearPrecio = (valor) => {
        if (valor == null || valor === '') return '';
        return parseFloat(valor).toLocaleString('es-CO', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
    };

    // Estados
    const [searchTerm, setSearchTerm] = useState('');
    const [productos, setProductos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Modal
    const [viewingProduct, setViewingProduct] = useState(null);
    const [showViewModal, setShowViewModal] = useState(false);

    // Paginación
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);

    const handleBack = () => navigate('/laboratorios');

    /**
     * ✅ Fetch productos por laboratorio
     */
    const fetchProductos = useCallback(async (page = 1) => {
        if (!laboratorioNombre) return;
        setLoading(true);
        setError(null);
        try {
            let url = `http://localhost:8000/api/productos/laboratorio/${encodeURIComponent(laboratorioNombre)}?page=${page}`;
            if (searchTerm.trim() !== '') {
                url += `&search=${encodeURIComponent(searchTerm)}`;
            }

            const response = await axios.get(url);
            setProductos(response.data.data || []);
            setCurrentPage(response.data.current_page);
            setLastPage(response.data.last_page);
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

    return (
        <div className="consulta-layout">
            {/* HEADER */}
            <Navbar expand="lg" className="consulta-header">
                <Container fluid>
                    <Navbar.Brand className="d-flex align-items-center">
                        <img src={logo} alt="Logo" width="40" height="40" className="me-2" />
                        <span className="consulta-title">BIBLIOTECALFH</span>
                    </Navbar.Brand>
                    <Button onClick={handleBack} className="logout-button">
                        <i className="bi bi-arrow-left-circle me-1"></i> Volver
                    </Button>
                </Container>
            </Navbar>

            {/* CONTENIDO */}
            <Container fluid className="consulta-content px-3 px-md-5">
                <Card className="consulta-card mt-4">
                    <Card.Body>
                        <h2 className="consulta-title-main mb-4 text-center text-md-start">
                            Productos del Laboratorio: <span style={{ color: '#0857b3' }}>{laboratorioNombre}</span>
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

                        {/* LISTA DE PRODUCTOS */}
                        <div className="product-list">
                            {productos.length > 0 ? (
                                productos.map((producto, index) => (
                                    <div
                                        className={`product-card ${producto.estado_producto?.toLowerCase() === 'inactivo' ? 'inactive' : ''}`}
                                        key={index}
                                    >
                                        <div className="product-info">
                                            <p><strong>Nombre:</strong> {producto.nombre}</p>
                                            <p><strong>Laboratorio:</strong> {producto.laboratorio}</p>
                                            <p><strong>Precio Público:</strong> ${formatearPrecio(producto.precio_publico)}</p>
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

                        {/* PAGINACIÓN */}
                        {lastPage > 1 && (
                            <div className="pagination-wrapper mt-3">
                                <button
                                    className="pagination-btn"
                                    onClick={() => setCurrentPage(currentPage - 1)}
                                    disabled={currentPage === 1}
                                >
                                    <i className="bi bi-chevron-left"></i>
                                </button>
                                <span className="pagination-info">{currentPage} / {lastPage}</span>
                                <button
                                    className="pagination-btn"
                                    onClick={() => setCurrentPage(currentPage + 1)}
                                    disabled={currentPage === lastPage}
                                >
                                    <i className="bi bi-chevron-right"></i>
                                </button>
                            </div>
                        )}
                    </Card.Body>
                </Card>
            </Container>

            {/* MODAL DETALLES */}
            <Modal show={showViewModal} onHide={() => setShowViewModal(false)} centered>
                <Modal.Header
                    closeButton
                    style={{
                        backgroundColor: viewingProduct?.estado_producto?.toLowerCase() === 'inactivo' ? '#dc3545' : '#0857b3',
                        color: '#fff'
                    }}
                >
                    <Modal.Title>
                        Detalles del Producto
                        {viewingProduct?.estado_producto?.toLowerCase() === 'inactivo' && (
                            <span className="badge bg-light text-dark ms-2">INACTIVO</span>
                        )}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {viewingProduct && (
                        <>
                            <p><strong>Nombre:</strong> {viewingProduct.nombre}</p>
                            <p><strong>Estado Producto:</strong> {viewingProduct.estado_producto}</p>
                            <p><strong>Precio Público:</strong> ${formatearPrecio(viewingProduct.precio_publico)}</p>
                            <p><strong>Precio Médico:</strong> ${formatearPrecio(viewingProduct.precio_medico)}</p>
                            <p><strong>IVA:</strong> {viewingProduct.iva}</p>
                            <p><strong>Requiere Fórmula Médica:</strong> {viewingProduct.formula_medica}</p>
                            <p><strong>Laboratorio:</strong> {viewingProduct.laboratorio}</p>
                            <p><strong>Categoría:</strong> {viewingProduct.categoria}</p>
                            <p><strong>Estado Registro:</strong> {viewingProduct.estado_registro}</p>
                            <p><strong>Fecha Vencimiento registro:</strong> {viewingProduct.fecha_vencimiento}</p>
                            <p><strong>Registro Sanitario:</strong> {viewingProduct.registro_sanitario}</p>
                            <p><strong>Código:</strong> {viewingProduct.codigo}</p>
                            <p><strong>DAVID:</strong> {viewingProduct.david}</p>
                        </>
                    )}
                </Modal.Body>
            </Modal>

            {/* FOOTER */}
            <footer className="consulta-footer text-center py-3">
                © 2025 Farmacia Homeopática - Más alternativas, más servicio.
            </footer>
        </div>
    );
};

export default ProductoPorLaboratorio;
