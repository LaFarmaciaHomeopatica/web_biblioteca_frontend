import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    Container, Navbar, Form, FormControl, Button, Row, Col,
    Card, Modal
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
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    const [editingProduct, setEditingProduct] = useState(null);
    const [viewingProduct, setViewingProduct] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [formData, setFormData] = useState({});
    const [isNewProduct, setIsNewProduct] = useState(false);

    // ✅ Paginación
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);

    const handleBack = () => navigate('/admin');

    // ✅ Cargar productos con búsqueda y paginación
    const fetchProductos = useCallback(async (page = 1) => {
        setLoading(true);
        setError(null);

        try {
            let url = `http://localhost:8000/api/productos?page=${page}`;

            if (searchTerm.trim() !== '') {
                url += `&search=${encodeURIComponent(searchTerm)}&filterBy=${encodeURIComponent(filterBy)}`;
            }

            const response = await axios.get(url);
            setProductos(response.data.data || []);
            setCurrentPage(response.data.current_page);
            setLastPage(response.data.last_page);
        } catch (error) {
            setError('Error al cargar los productos');
        } finally {
            setLoading(false);
        }
    }, [searchTerm, filterBy]);

    useEffect(() => {
        fetchProductos(currentPage);
    }, [currentPage, fetchProductos]);

    useEffect(() => {
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
            codigo: '', nombre: '', david: '', categoria: '', laboratorio: '',
            registro_sanitario: '', fecha_vencimiento: '', estado_registro: '',
            estado_producto: '', precio_publico: '', precio_medico: '',
            iva: '', formula_medica: ''
        });
        setShowEditModal(true);
    };

    const handleDeleteClick = async (id) => {
        if (!window.confirm('¿Estás seguro de que deseas eliminar este producto?')) return;
        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            await axios.delete(`http://localhost:8000/api/productos/${id}`, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
            });
            setSuccessMessage('Producto eliminado correctamente');
            fetchProductos(currentPage);
        } catch (error) {
            setError('Error al eliminar el producto');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveChanges = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

            if (isNewProduct) {
                await axios.post('http://localhost:8000/api/productos', formData, { headers });
            } else {
                await axios.put(`http://localhost:8000/api/productos/${editingProduct.id}`, formData, { headers });
            }

            setShowEditModal(false);
            setSuccessMessage(isNewProduct ? 'Producto creado exitosamente' : 'Producto actualizado correctamente');
            fetchProductos(currentPage);
        } catch (error) {
            setError(isNewProduct ? 'Error al crear el producto' : 'Error al actualizar el producto');
        } finally {
            setLoading(false);
        }
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
                            Gestión de Productos
                        </h2>

                        <div className="d-flex flex-column flex-md-row gap-2 mb-4">
                            <Button onClick={handleCreateClick} disabled={loading}>
                                + Crear Producto
                            </Button>
                            <Form className="d-flex flex-column flex-md-row gap-2 flex-grow-1">
                                <FormControl
                                    type="text"
                                    placeholder="Buscar por nombre, precio público, precio médico, laboratorio o código..."
                                    value={searchTerm}
                                    onChange={handleSearchChange}
                                />
                                <Form.Select value={filterBy} onChange={(e) => setFilterBy(e.target.value)}>
                                    <option value="nombre">Nombre</option>
                                    <option value="precio_publico">Precio Público</option>
                                    <option value="precio_medico">Precio Médico</option>
                                    <option value="laboratorio">Laboratorio</option>
                                    <option value="codigo">Código</option>
                                </Form.Select>
                            </Form>
                        </div>

                        {loading && <div className="text-center mb-3">Cargando productos...</div>}
                        {error && <div className="alert alert-danger">{error}</div>}
                        {successMessage && <div className="alert alert-success">{successMessage}</div>}

                        <div className="product-list">
                            {productos.length > 0 ? (
                                productos.map((producto, index) => (
                                    <div
                                        className={`product-card ${producto.estado_producto?.toLowerCase() === 'inactivo' ? 'inactive' : ''}`}
                                        key={index}
                                    >
                                        <div className="product-info">
                                            <p><strong>Nombre:</strong> {producto.nombre}</p>
                                            <p><strong>Precio Público:</strong> ${producto.precio_publico}</p>
                                            <p><strong>Precio Médico:</strong> ${producto.precio_medico}</p>
                                        </div>
                                        <div className="card-actions">
                                            <Button size="sm" variant="info" onClick={() => handleViewClick(producto)}>Ver</Button>
                                            <Button size="sm" variant="primary" onClick={() => handleEditClick(producto)}>Editar</Button>
                                            <Button size="sm" variant="danger" onClick={() => handleDeleteClick(producto.id)}>Eliminar</Button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center">No hay productos disponibles</p>
                            )}
                        </div>

                        {/* ✅ Paginación */}
                        <div className="pagination-wrapper mt-3 d-flex justify-content-center gap-2">
                            <button
                                className="pagination-btn"
                                onClick={() => fetchProductos(currentPage - 1)}
                                disabled={currentPage === 1}
                            >
                                <i className="bi bi-chevron-left"></i>
                            </button>
                            <span>{currentPage} / {lastPage}</span>
                            <button
                                className="pagination-btn"
                                onClick={() => fetchProductos(currentPage + 1)}
                                disabled={currentPage === lastPage}
                            >
                                <i className="bi bi-chevron-right"></i>
                            </button>
                        </div>
                    </Card.Body>
                </Card>
            </Container>

            {/* ✅ MODAL Ver (con estilos dinámicos) */}
            <Modal
                show={showViewModal}
                onHide={() => setShowViewModal(false)}
                centered
                dialogClassName={viewingProduct?.estado_producto?.toLowerCase() === 'inactivo' ? 'inactive-modal' : ''}
            >
                <Modal.Header
                    closeButton
                    className={viewingProduct?.estado_producto?.toLowerCase() === 'inactivo' ? 'inactive-modal-header' : ''}
                >
                    <Modal.Title>
                        Detalles del Producto
                        {viewingProduct?.estado_producto?.toLowerCase() === 'inactivo' && (
                            <span className="badge bg-danger ms-2">INACTIVO</span>
                        )}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body
                    className={viewingProduct?.estado_producto?.toLowerCase() === 'inactivo' ? 'inactive-modal-body' : ''}
                >
                    {viewingProduct && Object.keys(viewingProduct).map((key) => (
                        <p key={key}><strong>{key}:</strong> {viewingProduct[key]}</p>
                    ))}
                </Modal.Body>
            </Modal>

            {/* ✅ MODAL Editar/Crear (igual que antes) */}
            <Modal show={showEditModal} onHide={() => !loading && setShowEditModal(false)} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>{isNewProduct ? 'Crear Producto' : `Editar Producto: ${editingProduct?.nombre}`}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Código</Form.Label>
                                    <Form.Control type="text" name="codigo" value={formData.codigo || ''} onChange={handleInputChange} />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Nombre</Form.Label>
                                    <Form.Control type="text" name="nombre" value={formData.nombre || ''} onChange={handleInputChange} />
                                </Form.Group>
                            </Col>
                        </Row>
                        {/* resto igual */}
                    </Form>
                </Modal.Body>
                <Modal.Footer className="d-flex flex-column flex-md-row gap-2">
                    <Button variant="secondary" onClick={() => setShowEditModal(false)} disabled={loading}>Cancelar</Button>
                    <Button variant="primary" onClick={handleSaveChanges} disabled={loading}>
                        {loading ? 'Guardando...' : 'Guardar'}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* FOOTER */}
            <footer className="consulta-footer text-center py-3">
                © 2025 Farmacia Homeopática - Todos los derechos reservados
            </footer>
        </div>
    );
};

export default Consulta;
