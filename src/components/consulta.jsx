import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Container, Navbar, Form, FormControl, Button, Row, Col,
    Card, Table, Modal
} from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../assets/consulta.css';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.jpeg';

const Consulta = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterBy, setFilterBy] = useState('nombre');
    const [productos, setProductos] = useState([]);
    const [editingProduct, setEditingProduct] = useState(null);
    const [viewingProduct, setViewingProduct] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [isNewProduct, setIsNewProduct] = useState(false);

    const handleBack = () => {
        navigate('/admin');
    };

    useEffect(() => {
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

        fetchProductos();
    }, []);

    const handleViewClick = (producto) => {
        setViewingProduct(producto);
        setShowViewModal(true);
    };

    const handleEditClick = (producto) => {
        setIsNewProduct(false);
        setEditingProduct(producto);
        setFormData({ ...producto });
        setShowEditModal(true);
    };

    const handleCreateClick = () => {
        setIsNewProduct(true);
        setEditingProduct(null);
        setFormData({
            codigo: '',
            nombre: '',
            david: '',
            categoria: '',
            laboratorio: '',
            registro_sanitario: '',
            fecha_vencimiento: '',
            estado_registro: '',
            estado_producto: '',
            precio_publico: '',
            precio_medico: '',
            iva: '',
            formula_medica: ''
        });
        setShowEditModal(true);
    };

    const handleDeleteClick = async (id) => {
        if (!window.confirm('¿Estás seguro de que deseas eliminar este producto?')) return;
        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const token = localStorage.getItem('authToken');
            await axios.delete(`http://localhost:8000/api/productos/${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json'
                }
            });
            setSuccessMessage('Producto eliminado correctamente');
            const response = await axios.get('http://localhost:8000/api/productos');
            setProductos(response.data.data || response.data);
        } catch (error) {
            setError('Error al eliminar el producto');
        } finally {
            setLoading(false);
        }
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
            const headers = {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                Accept: 'application/json'
            };

            if (isNewProduct) {
                await axios.post('http://localhost:8000/api/productos', formData, { headers });
            } else {
                await axios.put(`http://localhost:8000/api/productos/${editingProduct.id}`, formData, { headers });
            }

            setShowEditModal(false);
            setSuccessMessage(isNewProduct ? 'Producto creado exitosamente' : 'Producto actualizado correctamente');

            const response = await axios.get('http://localhost:8000/api/productos');
            setProductos(response.data.data || response.data);
        } catch (error) {
            let errorMessage = isNewProduct ? 'Error al crear el producto' : 'Error al actualizar el producto';
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
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
            <Navbar expand="lg" className="admin-header">
                <Container fluid>
                    <Navbar.Brand className="d-flex align-items-center">
                        <img src={logo} alt="Logo" width="40" height="40" className="me-2" />
                        <span className="consulta-title">BIBLIOTECALFH</span>
                    </Navbar.Brand>
                    <Button onClick={handleBack} className="logout-button">
                        <i className="bi bi-box-arrow-right me-1"></i> Volver
                    </Button>
                </Container>
            </Navbar>

            <Container fluid className="consulta-content">
                <Row className="mt-4">
                    <Col>
                        <Card className="consulta-card">
                            <Card.Body>
                                <h4 className="mb-4">Consulta de Productos</h4>

                                <Button className="mb-3" onClick={handleCreateClick} disabled={loading}>
                                    + Crear Producto
                                </Button>

                                <div className="search-container mb-4">
                                    <Form className="d-flex">
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
                                            <option value="precio_publico">Precio Público</option>
                                            <option value="precio_medico">Precio Médico</option>
                                        </Form.Select>
                                    </Form>
                                </div>

                                {loading && <div className="text-center mb-3">Cargando...</div>}
                                {error && <div className="alert alert-danger">{error}</div>}
                                {successMessage && <div className="alert alert-success">{successMessage}</div>}

                                <Table striped bordered hover responsive className="product-table">
                                    <thead>
                                        <tr>
                                            <th>Nombre</th>
                                            <th>Precio Público</th>
                                            <th>Precio Médico</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredProducts.map((producto, index) => (
                                            <tr key={index}>
                                                <td>{producto.nombre}</td>
                                                <td>{producto.precio_publico}</td>
                                                <td>{producto.precio_medico}</td>
                                                <td>
                                                    <Button variant="info" size="sm" onClick={() => handleViewClick(producto)} disabled={loading}>
                                                        Ver
                                                    </Button>{' '}
                                                    <Button variant="primary" size="sm" onClick={() => handleEditClick(producto)} disabled={loading}>
                                                        Editar
                                                    </Button>{' '}
                                                    <Button variant="danger" size="sm" onClick={() => handleDeleteClick(producto.id)} disabled={loading}>
                                                        Eliminar
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

            {/* Modal Ver Producto */}
            <Modal show={showViewModal} onHide={() => setShowViewModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Detalles del Producto</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {viewingProduct && (
                        <div>
                            {Object.keys(viewingProduct).map((key) => (
                                <p key={key}><strong>{key}:</strong> {viewingProduct[key]}</p>
                            ))}
                        </div>
                    )}
                </Modal.Body>
            </Modal>

            {/* Modal Editar/Crear */}
            <Modal show={showEditModal} onHide={() => !loading && setShowEditModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>{isNewProduct ? 'Crear Producto' : `Editar Producto: ${editingProduct?.nombre}`}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Código</Form.Label>
                                    <Form.Control type="text" name="codigo" value={formData.codigo || ''} onChange={handleInputChange} disabled={loading} />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Nombre</Form.Label>
                                    <Form.Control type="text" name="nombre" value={formData.nombre || ''} onChange={handleInputChange} disabled={loading} />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>David</Form.Label>
                                    <Form.Control type="text" name="david" value={formData.david || ''} onChange={handleInputChange} disabled={loading} />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Categoría</Form.Label>
                                    <Form.Control type="text" name="categoria" value={formData.categoria || ''} onChange={handleInputChange} disabled={loading} />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Laboratorio</Form.Label>
                                    <Form.Control type="text" name="laboratorio" value={formData.laboratorio || ''} onChange={handleInputChange} disabled={loading} />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Registro Sanitario</Form.Label>
                                    <Form.Control type="text" name="registro_sanitario" value={formData.registro_sanitario || ''} onChange={handleInputChange} disabled={loading} />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Fecha de Vencimiento</Form.Label>
                                    <Form.Control type="date" name="fecha_vencimiento" value={formData.fecha_vencimiento || ''} onChange={handleInputChange} disabled={loading} />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Estado del Registro</Form.Label>
                                    <Form.Control type="text" name="estado_registro" value={formData.estado_registro || ''} onChange={handleInputChange} disabled={loading} />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Estado del Producto</Form.Label>
                                    <Form.Control type="text" name="estado_producto" value={formData.estado_producto || ''} onChange={handleInputChange} disabled={loading} />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Precio Público</Form.Label>
                                    <Form.Control type="number" name="precio_publico" value={formData.precio_publico || ''} onChange={handleInputChange} disabled={loading} />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Precio Médico</Form.Label>
                                    <Form.Control type="number" name="precio_medico" value={formData.precio_medico || ''} onChange={handleInputChange} disabled={loading} />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>IVA</Form.Label>
                                    <Form.Control type="number" name="iva" value={formData.iva || ''} onChange={handleInputChange} disabled={loading} />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Form.Group className="mb-3">
                            <Form.Label>Fórmula Médica (RX - OTC)</Form.Label>
                            <Form.Control type="text" name="formula_medica" value={formData.formula_medica || ''} onChange={handleInputChange} disabled={loading} />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowEditModal(false)} disabled={loading}>Cancelar</Button>
                    <Button variant="primary" onClick={handleSaveChanges} disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button>
                </Modal.Footer>
            </Modal>

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
