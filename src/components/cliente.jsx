import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Container, Navbar, Nav, Form, FormControl, Button, Row, Col,
    Card, Modal
} from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../assets/cliente.css';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.jpeg';

const Cliente = () => {
    const formatearPrecio = (valor) => {
  if (valor === null || valor === undefined || valor === '') return '';
  const numero = Number(String(valor).replace(/[^0-9.-]/g, ''));
  return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0 }).format(numero);
};
    const navigate = useNavigate();

    const [searchTerm, setSearchTerm] = useState('');
    const [filterBy, setFilterBy] = useState('nombre');
    const [productos, setProductos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [showModal, setShowModal] = useState(false);
    const [selectedProducto, setSelectedProducto] = useState(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);

    useEffect(() => {
        fetchProductos();
    }, []);

    const fetchProductos = async (page = 1, search = '', filter = 'nombre') => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get(
                `http://localhost:8000/api/productos?page=${page}&search=${search}&filter_by=${filter}`
            );

            setProductos(response.data.data || []);
            setCurrentPage(response.data.current_page);
            setLastPage(response.data.last_page);
        } catch (error) {
            setError('Error al cargar los productos');
        } finally {
            setLoading(false);
        }
    };

    const handleShowDetails = (producto) => {
        setSelectedProducto(producto);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedProducto(null);
    };

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        navigate('/');
    };

    const handleGoToDocs = () => navigate('/clientedoc');
    const handleGoToVademecum = () => navigate('/vademecum');
    const handleGoToCapacitacion = () => navigate('/capacitacion');
    const handleGoToLaboratorios = () => navigate('/laboratorios');

    return (
        <div className="cliente-layout">
            {/* HEADER */}
            <Navbar expand="lg" className="cliente-header" variant="dark">
                <Container fluid>
                    <Navbar.Brand className="d-flex align-items-center">
                        <img src={logo} alt="Logo" width="40" height="40" className="me-2" />
                        <span className="cliente-title">BIBLIOTECALFH</span>
                    </Navbar.Brand>
                    <Navbar.Toggle aria-controls="navbarResponsive" />
                    <Navbar.Collapse id="navbarResponsive" className="justify-content-end">
                        <Nav className="d-flex flex-column flex-lg-row gap-2">
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
                            <Button onClick={handleLogout} className="logout-button">
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

                                {/* ✅ Buscador */}
                                <Form className="d-flex flex-column flex-md-row mb-4 gap-2">
                                    <FormControl
                                        type="text"
                                        placeholder={`Buscar por ${filterBy}...`}
                                        value={searchTerm}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setSearchTerm(value);
                                            fetchProductos(1, value, filterBy);
                                        }}
                                    />
                                    <Form.Select
                                        value={filterBy}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setFilterBy(value);
                                            fetchProductos(1, searchTerm, value);
                                        }}
                                        className="w-100 w-md-auto"
                                    >
                                        <option value="nombre">Nombre</option>
                                        <option value="codigo">Código</option>
                                        <option value="categoria">Categoría</option>
                                        <option value="precio_publico">Precio Público</option>
                                        <option value="precio_medico">Precio Médico</option>
                                    </Form.Select>
                                </Form>

                                {loading && <div className="text-center mb-3">Cargando productos...</div>}
                                {error && <div className="alert alert-danger">{error}</div>}

                                {/* ✅ Lista de productos */}
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
                                                    <p><strong>Precio Médico:</strong> ${formatearPrecio(producto.precio_publico)}</p>
                                                    <p><strong>Precio Médico:</strong> ${formatearPrecio(producto.precio_medico)}</p>
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
                                        <p className="text-center">No hay productos disponibles</p>
                                    )}
                                </div>

                                {/* ✅ Paginación */}
                                <div className="pagination-wrapper mt-3 d-flex justify-content-center">
                                    <button
                                        className="pagination-btn"
                                        onClick={() => fetchProductos(currentPage - 1, searchTerm, filterBy)}
                                        disabled={currentPage === 1}
                                    >
                                        <i className="bi bi-chevron-left"></i>
                                    </button>
                                    <span className="pagination-info">{currentPage} / {lastPage}</span>
                                    <button
                                        className="pagination-btn"
                                        onClick={() => fetchProductos(currentPage + 1, searchTerm, filterBy)}
                                        disabled={currentPage === lastPage}
                                    >
                                        <i className="bi bi-chevron-right"></i>
                                    </button>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>

            {/* ✅ MODAL Detalles */}
            <Modal
                show={showModal}
                onHide={handleCloseModal}
                centered
            >
                <Modal.Header
                    closeButton
                    style={{
                        backgroundColor: selectedProducto?.estado_producto?.toLowerCase() === 'inactivo' ? '#dc3545' : '#0857b3',
                        color: '#fff'
                    }}
                >
                    <Modal.Title>
                        Detalles del Producto
                        {selectedProducto?.estado_producto?.toLowerCase() === 'inactivo' && (
                            <span className="badge bg-light text-dark ms-2">INACTIVO</span>
                        )}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedProducto && (
                        <div>
                            <p><strong>Nombre:</strong> {selectedProducto.nombre}</p>
                            <p><strong>Estado Producto:</strong> {selectedProducto.estado_producto}</p>
                            <p><strong>Precio Público:</strong> ${formatearPrecio(selectedProducto.precio_publico)}</p>
                            <p><strong>Precio Público:</strong> ${formatearPrecio(selectedProducto.precio_medico)}</p>
                            <p><strong>IVA:</strong> {selectedProducto.iva}</p>
                            <p><strong>Requiere Fórmula Médica:</strong> {selectedProducto.formula_medica}</p>
                            <p><strong>Laboratorio:</strong> {selectedProducto.laboratorio}</p>
                            <p><strong>Categoría:</strong> {selectedProducto.categoria}</p>
                            <p><strong>Estado Registro:</strong> {selectedProducto.estado_registro}</p>
                            <p><strong>Fecha Vencimiento registro:</strong> {selectedProducto.fecha_vencimiento}</p>
                            <p><strong>Registro Sanitario:</strong> {selectedProducto.registro_sanitario}</p>
                            <p><strong>Código:</strong> {selectedProducto.codigo}</p>
                            <p><strong>DAVID:</strong> {selectedProducto.david}</p>
                        </div>
                    )}
                </Modal.Body>
            </Modal>

            {/* FOOTER */}
            <footer className="cliente-footer">
                <Container fluid>
                    <Row className="py-3">
                        <Col md={12} className="text-center">
                            <p className="mb-0">© 2025 Farmacia Homeopática - Más alternativas, más servicio.</p>
                        </Col>
                    </Row>
                </Container>
            </footer>
        </div>
    );
};

export default Cliente;
