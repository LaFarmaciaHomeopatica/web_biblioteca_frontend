import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Container, Navbar, Form, FormControl, Button, Row, Col, Card, Table, Modal } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../assets/consulta.css';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.jpeg';

const Consulta = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterBy, setFilterBy] = useState('codigo');
    const [productos, setProductos] = useState([]);
    const [editingProduct, setEditingProduct] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        navigate('/admin');
    };

    // Obtener productos del backend
    useEffect(() => {
        fetchProductos();
    }, []);

    const fetchProductos = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get('http://localhost:8000/api/productos');
            console.log('Datos recibidos del backend:', response.data);
            setProductos(response.data.data || response.data);
        } catch (error) {
            console.error('Error al obtener productos:', error);
            setError('Error al cargar los productos');
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (producto) => {
        setEditingProduct(producto);
        setFormData({
            codigo: producto.codigo,
            nombre: producto.nombre,
            descripcion: producto.descripcion,
            categoria: producto.categoria,
            dosificacion: producto.dosificacion,
            vencimiento: producto.vencimiento,
            registro: producto.registro,
            indicaciones_contraidicaciones: producto.indicaciones_contraidicaciones,
            marca: producto.marca,
            estado_registro: producto.estado_registro,
            estado_producto: producto.estado_producto
        });
        setShowModal(true);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSaveChanges = async () => {
        setLoading(true);
        setError(null);
        setSuccessMessage(null);
        
        try {
            const token = localStorage.getItem('authToken');
            
            if (!editingProduct?.id) {
                throw new Error('ID del producto no definido');
            }

            // Verificación de datos antes de enviar
            console.log('Datos a enviar:', formData);
            console.log('ID del producto:', editingProduct.id);

            const response = await axios.put(
                `http://localhost:8000/api/productos/${editingProduct.id}`,
                formData,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                }
            );

            console.log('Respuesta del servidor:', response.data);

            if (!response.data.success) {
                throw new Error(response.data.message || 'Error al actualizar');
            }

            // Actualización optimista del estado local
            setProductos(prev => prev.map(p => 
                p.id === editingProduct.id ? { ...p, ...formData } : p
            ));

            setShowModal(false);
            setSuccessMessage('Producto actualizado correctamente');
            
            // Recarga los datos desde el servidor para garantizar consistencia
            await fetchProductos();
            
        } catch (error) {
            console.error('Error completo:', {
                error: error.message,
                response: error.response?.data,
                config: error.config
            });
            
            let errorMessage = 'Error al actualizar el producto';
            
            if (error.response) {
                if (error.response.status === 422) {
                    const errors = error.response.data.errors;
                    errorMessage = Object.values(errors).flat().join('\n');
                } else if (error.response.data?.message) {
                    errorMessage = error.response.data.message;
                }
            } else {
                errorMessage = error.message;
            }
            
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const filteredProducts = productos.filter(producto =>
        producto[filterBy]?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="consulta-layout">
            {/* Header */}
            <Navbar expand="lg" className="admin-header">
                <Container fluid>
                    <Navbar.Brand className="d-flex align-items-center">
                        <img
                            src={logo}
                            alt="Logo de la empresa"
                            width="40"
                            height="40"
                            className="d-inline-block align-top me-2"
                        />
                        <span className="consulta-title">Panel Administrativo - Farmacia Homeopática</span>
                    </Navbar.Brand>
                    <Button onClick={handleLogout} className="logout-button">
                        <i className="bi bi-box-arrow-right me-1"></i> volver
                    </Button>
                </Container>
            </Navbar>

            {/* Contenido Principal */}
            <Container fluid className="consulta-content">
                <Row className="mt-4">
                    <Col>
                        <Card className="consulta-card">
                            <Card.Body>
                                <h4 className="mb-4">Consulta de Productos</h4>

                                {/* Barra de búsqueda y filtros */}
                                <div className="search-container mb-4">
                                    <Form className="d-flex">
                                        <FormControl
                                            type="text"
                                            placeholder={`Buscar por ${filterBy}...`}
                                            className="mr-2"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                        <Form.Control
                                            as="select"
                                            className="ml-2"
                                            value={filterBy}
                                            onChange={(e) => setFilterBy(e.target.value)}
                                        >
                                            <option value="codigo">Código</option>
                                            <option value="nombre">Nombre</option>
                                            <option value="descripcion">Descripción</option>
                                            <option value="categoria">Categoría</option>
                                            <option value="marca">Marca</option>
                                            <option value="dosificacion">Dosificación</option>
                                            <option value="indicaciones_contraidicaciones">Indicaciones/Contraindicaciones</option>
                                            <option value="vencimiento">Fecha Vencimiento</option>
                                            <option value="registro">Registro Sanitario</option>
                                            <option value="estado_registro">Estado del Registro</option>
                                            <option value="estado_producto">Estado del Producto</option>
                                        </Form.Control>
                                    </Form>
                                </div>

                                {loading && <div className="text-center mb-3">Cargando...</div>}
                                {error && (
                                    <div className="alert alert-danger" onClose={() => setError(null)} dismissible>
                                        {error}
                                    </div>
                                )}
                                {successMessage && (
                                    <div className="alert alert-success" onClose={() => setSuccessMessage(null)} dismissible>
                                        {successMessage}
                                    </div>
                                )}

                                {/* Tabla de productos */}
                                <Table striped bordered hover responsive className="product-table">
                                    <thead>
                                        <tr>
                                            <th>Código</th>
                                            <th>Nombre</th>
                                            <th>Descripción</th>
                                            <th>Categoría</th>
                                            <th>Dosificación</th>
                                            <th>Vencimiento</th>
                                            <th>Registro</th>
                                            <th>Indicaciones/Contraindicaciones</th>
                                            <th>Marca</th>
                                            <th>Estado Registro</th>
                                            <th>Estado Producto</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredProducts.map((producto, index) => (
                                            <tr key={index}>
                                                <td>{producto.codigo}</td>
                                                <td>{producto.nombre}</td>
                                                <td>{producto.descripcion}</td>
                                                <td>{producto.categoria}</td>
                                                <td>{producto.dosificacion}</td>
                                                <td>{producto.vencimiento}</td>
                                                <td>{producto.registro}</td>
                                                <td>{producto.indicaciones_contraidicaciones}</td>
                                                <td>{producto.marca}</td>
                                                <td>{producto.estado_registro}</td>
                                                <td>{producto.estado_producto}</td>
                                                <td>
                                                    <Button 
                                                        variant="primary" 
                                                        size="sm" 
                                                        onClick={() => handleEditClick(producto)}
                                                        disabled={loading}
                                                    >
                                                        Editar
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

            {/* Modal de Edición */}
            <Modal show={showModal} onHide={() => !loading && setShowModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Editar Producto: {editingProduct?.nombre}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {editingProduct && (
                        <Form>
                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Código</Form.Label>
                                        <Form.Control
                                            type="text"
                                            name="codigo"
                                            value={formData.codigo || ''}
                                            onChange={handleInputChange}
                                            disabled={loading}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Nombre</Form.Label>
                                        <Form.Control
                                            type="text"
                                            name="nombre"
                                            value={formData.nombre || ''}
                                            onChange={handleInputChange}
                                            disabled={loading}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>

                            <Form.Group className="mb-3">
                                <Form.Label>Descripción</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={2}
                                    name="descripcion"
                                    value={formData.descripcion || ''}
                                    onChange={handleInputChange}
                                    disabled={loading}
                                />
                            </Form.Group>

                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Categoría</Form.Label>
                                        <Form.Control
                                            type="text"
                                            name="categoria"
                                            value={formData.categoria || ''}
                                            onChange={handleInputChange}
                                            disabled={loading}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Marca</Form.Label>
                                        <Form.Control
                                            type="text"
                                            name="marca"
                                            value={formData.marca || ''}
                                            onChange={handleInputChange}
                                            disabled={loading}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>

                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Dosificación</Form.Label>
                                        <Form.Control
                                            type="text"
                                            name="dosificacion"
                                            value={formData.dosificacion || ''}
                                            onChange={handleInputChange}
                                            disabled={loading}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Vencimiento</Form.Label>
                                        <Form.Control
                                            type="date"
                                            name="vencimiento"
                                            value={formData.vencimiento || ''}
                                            onChange={handleInputChange}
                                            disabled={loading}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>

                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Registro Sanitario</Form.Label>
                                        <Form.Control
                                            type="text"
                                            name="registro"
                                            value={formData.registro || ''}
                                            onChange={handleInputChange}
                                            disabled={loading}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Estado del Registro</Form.Label>
                                        <Form.Control
                                            type="text"
                                            name="estado_registro"
                                            value={formData.estado_registro || ''}
                                            onChange={handleInputChange}
                                            disabled={loading}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>

                            <Form.Group className="mb-3">
                                <Form.Label>Indicaciones/Contraindicaciones</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={3}
                                    name="indicaciones_contraidicaciones"
                                    value={formData.indicaciones_contraidicaciones || ''}
                                    onChange={handleInputChange}
                                    disabled={loading}
                                />
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>Estado del Producto</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="estado_producto"
                                    value={formData.estado_producto || ''}
                                    onChange={handleInputChange}
                                    disabled={loading}
                                />
                            </Form.Group>
                        </Form>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button 
                        variant="secondary" 
                        onClick={() => setShowModal(false)}
                        disabled={loading}
                    >
                        Cancelar
                    </Button>
                    <Button 
                        variant="primary" 
                        onClick={handleSaveChanges}
                        disabled={loading}
                    >
                        {loading ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Footer */}
            <footer className="consulta-footer">
                <Container fluid>
                    <Row className="py-3">
                        <Col md={12} className="text-center">
                            <p className="mb-0">© 2025 Farmacia Homeopática - Todos los derechos reservados</p>
                        </Col>
                    </Row>
                </Container>
            </footer>
        </div>
    );
};

export default Consulta;