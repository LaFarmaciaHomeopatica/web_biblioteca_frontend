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
    const [filterBy, setFilterBy] = useState('codigo');
    const [productos, setProductos] = useState([]);
    const [editingProduct, setEditingProduct] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [isNewProduct, setIsNewProduct] = useState(false);

    useEffect(() => {
        fetchProductos();
    }, []);

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

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        navigate('/');
    };

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
        try {
            const token = localStorage.getItem('authToken');
            await axios.delete(`http://localhost:8000/api/productos/${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json'
                }
            });
            setSuccessMessage('Producto eliminado correctamente');
            fetchProductos();
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
                const response = await axios.post('http://localhost:8000/api/productos', formData, { headers });
                console.log(response.status); // Se usa la variable para evitar el warning
            } else {
                const response = await axios.put(`http://localhost:8000/api/productos/${editingProduct.id}`, formData, { headers });
                console.log(response.status); // Se usa la variable aquí también
            }

            setShowModal(false);
            setSuccessMessage(isNewProduct ? 'Producto creado exitosamente' : 'Producto actualizado correctamente');
            fetchProductos();
        } catch (error) {
            setError('Error al guardar los cambios');
        } finally {
            setLoading(false);
        }
    };

    const filteredProducts = productos.filter(producto =>
        producto[filterBy]?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="cliente-layout">
            <Navbar expand="lg" className="admin-header">
                <Container fluid>
                    <Navbar.Brand className="d-flex align-items-center">
                        <img src={logo} alt="Logo" width="40" height="40" className="me-2" />
                        <span className="admin-title">Panel Cliente - Farmacia Homeopática</span>
                    </Navbar.Brand>
                    <Button onClick={handleLogout} className="logout-button">
                        <i className="bi bi-box-arrow-right me-1"></i> Salir
                    </Button>
                </Container>
            </Navbar>

            <Container fluid className="cliente-content">
                <Row className="mt-4">
                    <Col>
                        <Card className="cliente-card">
                            <Card.Body>
                                <h4 className="mb-4">Consulta de Productos</h4>

                                <Button className="mb-3" onClick={handleCreateClick} disabled={loading}>
                                    + Crear Producto
                                </Button>

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
                                        <option value="codigo">Código</option>
                                        <option value="nombre">Nombre</option>
                                        <option value="descripcion">Descripción</option>
                                        <option value="categoria">Categoría</option>
                                        <option value="dosificacion">Dosificación</option>
                                        <option value="vencimiento">Vencimiento</option>
                                        <option value="registro">Registro</option>
                                        <option value="indicaciones_contraindicaciones">Indicaciones/Contraindicaciones</option>
                                        <option value="marca">Marca</option>
                                        <option value="estado_registro">Estado Registro</option>
                                        <option value="estado_producto">Estado Producto</option>
                                    </Form.Select>
                                </Form>

                                {error && <div className="alert alert-danger">{error}</div>}
                                {successMessage && <div className="alert alert-success">{successMessage}</div>}

                                <Table striped bordered hover responsive>
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
                                                    <Button size="sm" variant="primary" onClick={() => handleEditClick(producto)}>Editar</Button>{' '}
                                                    <Button size="sm" variant="danger" onClick={() => handleDeleteClick(producto.id)}>Eliminar</Button>
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

            <Modal show={showModal} onHide={() => !loading && setShowModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>{isNewProduct ? 'Crear Producto' : `Editar: ${editingProduct?.nombre}`}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Row>
                            <Col md={6}><Form.Group><Form.Label>Código</Form.Label><Form.Control name="codigo" value={formData.codigo || ''} onChange={handleInputChange} /></Form.Group></Col>
                            <Col md={6}><Form.Group><Form.Label>Nombre</Form.Label><Form.Control name="nombre" value={formData.nombre || ''} onChange={handleInputChange} /></Form.Group></Col>
                        </Row>
                        <Form.Group className="mt-3"><Form.Label>Descripción</Form.Label><Form.Control as="textarea" name="descripcion" rows={2} value={formData.descripcion || ''} onChange={handleInputChange} /></Form.Group>
                        <Row className="mt-3">
                            <Col md={6}><Form.Group><Form.Label>Categoría</Form.Label><Form.Control name="categoria" value={formData.categoria || ''} onChange={handleInputChange} /></Form.Group></Col>
                            <Col md={6}><Form.Group><Form.Label>Marca</Form.Label><Form.Control name="marca" value={formData.marca || ''} onChange={handleInputChange} /></Form.Group></Col>
                        </Row>
                        <Row className="mt-3">
                            <Col md={6}><Form.Group><Form.Label>Dosificación</Form.Label><Form.Control name="dosificacion" value={formData.dosificacion || ''} onChange={handleInputChange} /></Form.Group></Col>
                            <Col md={6}><Form.Group><Form.Label>Vencimiento</Form.Label><Form.Control type="date" name="vencimiento" value={formData.vencimiento || ''} onChange={handleInputChange} /></Form.Group></Col>
                        </Row>
                        <Row className="mt-3">
                            <Col md={6}><Form.Group><Form.Label>Registro</Form.Label><Form.Control name="registro" value={formData.registro || ''} onChange={handleInputChange} /></Form.Group></Col>
                            <Col md={6}><Form.Group><Form.Label>Estado Registro</Form.Label><Form.Control name="estado_registro" value={formData.estado_registro || ''} onChange={handleInputChange} /></Form.Group></Col>
                        </Row>
                        <Form.Group className="mt-3"><Form.Label>Indicaciones / Contraindicaciones</Form.Label><Form.Control as="textarea" name="indicaciones_contraindicaciones" rows={3} value={formData.indicaciones_contraindicaciones || ''} onChange={handleInputChange} /></Form.Group>
                        <Form.Group className="mt-3"><Form.Label>Estado Producto</Form.Label><Form.Control name="estado_producto" value={formData.estado_producto || ''} onChange={handleInputChange} /></Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)} disabled={loading}>Cancelar</Button>
                    <Button variant="primary" onClick={handleSaveChanges} disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default Cliente;