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
    const [filterBy, setFilterBy] = useState('codigo');
    const [productos, setProductos] = useState([]);
    const [editingProduct, setEditingProduct] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [isNewProduct, setIsNewProduct] = useState(false);

    const handleLogout = () => {
        localStorage.removeItem('authToken');
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

    const handleEditClick = (producto) => {
        setIsNewProduct(false);
        setEditingProduct(producto);
        setFormData({ ...producto });
        setShowModal(true);
    };

    const handleCreateClick = () => {
        setIsNewProduct(true);
        setEditingProduct(null);
        setFormData({
            codigo: '',
            nombre: '',
            descripcion: '',
            categoria: '',
            dosificacion: '',
            vencimiento: '',
            registro: '',
            indicaciones_contraindicaciones: '',
            marca: '',
            estado_registro: '',
            estado_producto: ''
        });
        setShowModal(true);
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
            // Actualizar productos después de eliminar
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

            setShowModal(false);
            setSuccessMessage(isNewProduct ? 'Producto creado exitosamente' : 'Producto actualizado correctamente');

            // Actualizar productos después de crear/editar
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
                        <span className="consulta-title">Panel Administrativo - Farmacia Homeopática</span>
                    </Navbar.Brand>
                    <Button onClick={handleLogout} className="logout-button">
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
                                            <option value="codigo">Código</option>
                                            <option value="nombre">Nombre</option>
                                            <option value="descripcion">Descripción</option>
                                            <option value="categoria">Categoría</option>
                                            <option value="marca">Marca</option>
                                            <option value="dosificacion">Dosificación</option>
                                            <option value="indicaciones_contraindicaciones">Indicaciones/Contraindicaciones</option>
                                            <option value="vencimiento">Fecha Vencimiento</option>
                                            <option value="registro">Registro Sanitario</option>
                                            <option value="estado_registro">Estado del Registro</option>
                                            <option value="estado_producto">Estado del Producto</option>
                                        </Form.Select>
                                    </Form>
                                </div>

                                {loading && <div className="text-center mb-3">Cargando...</div>}
                                {error && <div className="alert alert-danger">{error}</div>}
                                {successMessage && <div className="alert alert-success">{successMessage}</div>}

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
                                                <td>{producto.indicaciones_contraindicaciones}</td>
                                                <td>{producto.marca}</td>
                                                <td>{producto.estado_registro}</td>
                                                <td>{producto.estado_producto}</td>
                                                <td>
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

            {/* Modal Crear / Editar */}
            <Modal show={showModal} onHide={() => !loading && setShowModal(false)} size="lg">
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

                        <Form.Group className="mb-3">
                            <Form.Label>Descripción</Form.Label>
                            <Form.Control as="textarea" name="descripcion" rows={2} value={formData.descripcion || ''} onChange={handleInputChange} disabled={loading} />
                        </Form.Group>

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Categoría</Form.Label>
                                    <Form.Control type="text" name="categoria" value={formData.categoria || ''} onChange={handleInputChange} disabled={loading} />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Marca</Form.Label>
                                    <Form.Control type="text" name="marca" value={formData.marca || ''} onChange={handleInputChange} disabled={loading} />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Dosificación</Form.Label>
                                    <Form.Control type="text" name="dosificacion" value={formData.dosificacion || ''} onChange={handleInputChange} disabled={loading} />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Vencimiento</Form.Label>
                                    <Form.Control type="date" name="vencimiento" value={formData.vencimiento || ''} onChange={handleInputChange} disabled={loading} />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Registro</Form.Label>
                                    <Form.Control type="text" name="registro" value={formData.registro || ''} onChange={handleInputChange} disabled={loading} />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Estado Registro</Form.Label>
                                    <Form.Control type="text" name="estado_registro" value={formData.estado_registro || ''} onChange={handleInputChange} disabled={loading} />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Form.Group className="mb-3">
                            <Form.Label>Indicaciones/Contraindicaciones</Form.Label>
                            <Form.Control as="textarea" name="indicaciones_contraindicaciones" rows={3} value={formData.indicaciones_contraindicaciones || ''} onChange={handleInputChange} disabled={loading} />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Estado Producto</Form.Label>
                            <Form.Control type="text" name="estado_producto" value={formData.estado_producto || ''} onChange={handleInputChange} disabled={loading} />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)} disabled={loading}>Cancelar</Button>
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
