import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Container, Navbar, Form, FormControl, Button, Row, Col,
    Card, Table, Modal
} from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../assets/cliente.css';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.jpeg';

const Cliente = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterBy, setFilterBy] = useState('nombre');
    const [productos, setProductos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Estado para modal
    const [showModal, setShowModal] = useState(false);
    const [selectedProducto, setSelectedProducto] = useState(null);

    useEffect(() => {
        fetchProductos();
    }, []);

    // ✅ Cargar productos
    const fetchProductos = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get('http://localhost:8000/api/productos');
            setProductos(response.data.data || response.data);
        } catch (error) {
            setError('Error al cargar los productos');
        } finally {
            setLoading(false);
        }
    };

    // ✅ Cerrar sesión
    const handleLogout = () => {
        localStorage.removeItem('authToken');
        navigate('/');
    };

    // ✅ Navegaciones
    const handleGoToDocs = () => navigate('/clientedoc');
    const handleGoToVademecum = () => navigate('/vademecum');
    const handleGoToCapacitacion = () => navigate('/capacitacion');

    // ✅ Filtrar productos por búsqueda
    const filteredProducts = productos.filter(producto =>
        producto[filterBy]?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    );

    // ✅ Mostrar modal con detalles
    const handleShowDetails = (producto) => {
        setSelectedProducto(producto);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedProducto(null);
    };

    return (
        <div className="cliente-layout">
            {/* Header */}
            <Navbar expand="lg" className="admin-header">
                <Container fluid className="d-flex justify-content-between align-items-center">
                    <Navbar.Brand className="d-flex align-items-center">
                        <img src={logo} alt="Logo" width="40" height="40" className="me-2" />
                        <span className="admin-title">BIBLIOTECALFH</span>
                    </Navbar.Brand>
                    <div className="d-flex">
                        <Button onClick={handleGoToVademecum} variant="secondary" className="me-2">
                            <i className="bi bi-book me-1"></i> Vademécum
                        </Button>
                        <Button onClick={handleGoToCapacitacion} variant="warning" className="me-2">
                            <i className="bi bi-mortarboard me-1"></i> Capacitación
                        </Button>
                        <Button onClick={handleGoToDocs} variant="info" className="me-2">
                            <i className="bi bi-file-earmark-text me-1"></i> Documentos
                        </Button>
                        <Button onClick={handleLogout} className="logout-button">
                            <i className="bi bi-box-arrow-right me-1"></i> Salir
                        </Button>
                    </div>
                </Container>
            </Navbar>

            {/* Contenido */}
            <Container fluid className="cliente-content">
                <Row className="mt-4">
                    <Col>
                        <Card className="cliente-card">
                            <Card.Body>
                                <h4 className="mb-4">Consulta de Productos</h4>

                                {/* Buscador */}
                                <Form className="d-flex mb-4">
                                    <FormControl
                                        type="text"
                                        placeholder={`Buscar por ${filterBy}...`}
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                    <Form.Select
                                        className="ms-2"
                                        value={filterBy}
                                        onChange={(e) => setFilterBy(e.target.value)}
                                    >
                                        <option value="nombre">Nombre</option>
                                        <option value="codigo">Código</option>
                                        <option value="categoria">Categoría</option>
                                        <option value="precio_publico">Precio Público</option>
                                        <option value="precio_medico">Precio Médico</option>
                                    </Form.Select>
                                </Form>

                                {/* Mensajes */}
                                {loading && <div className="text-center mb-3">Cargando productos...</div>}
                                {error && <div className="alert alert-danger">{error}</div>}

                                {/* Tabla de productos */}
                                <Table striped bordered hover responsive>
                                    <thead>
                                        <tr>
                                            <th>Nombre</th>
                                            <th>Precio Público</th>
                                            <th>Precio Médico</th>
                                            <th>Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredProducts.map((producto, index) => (
                                            <tr key={index}>
                                                <td>{producto.nombre}</td>
                                                <td>${producto.precio_publico}</td>
                                                <td>${producto.precio_medico}</td>
                                                <td>
                                                    <Button
                                                        variant="primary"
                                                        size="sm"
                                                        onClick={() => handleShowDetails(producto)}
                                                    >
                                                        Ver
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>

            {/* Modal para detalles */}
            <Modal show={showModal} onHide={handleCloseModal} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Detalles del Producto</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedProducto && (
                        <div>
                            <p><strong>Código:</strong> {selectedProducto.codigo}</p>
                            <p><strong>Nombre:</strong> {selectedProducto.nombre}</p>
                            <p><strong>David:</strong> {selectedProducto.david}</p>
                            <p><strong>Categoría:</strong> {selectedProducto.categoria}</p>
                            <p><strong>Precio Público:</strong> ${selectedProducto.precio_publico}</p>
                            <p><strong>Precio Médico:</strong> ${selectedProducto.precio_medico}</p>
                            <p><strong>Registro Sanitario:</strong> {selectedProducto.registro_sanitario}</p>
                            <p><strong>Fecha Vencimiento:</strong> {selectedProducto.fecha_vencimiento}</p>
                            <p><strong>Estado Registro:</strong> {selectedProducto.estado_registro}</p>
                            <p><strong>Estado Producto:</strong> {selectedProducto.estado_producto}</p>
                            <p><strong>IVA:</strong> {selectedProducto.iva}</p>
                            <p><strong>Fórmula Médica:</strong> {selectedProducto.formula_medica}</p>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseModal}>
                        Cerrar
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default Cliente;
