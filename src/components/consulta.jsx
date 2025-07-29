import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    Container, Navbar, Form, FormControl, Button, Row, Col,
    Card, Modal
} from 'react-bootstrap';
import * as XLSX from 'xlsx';
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
    const [showInstructions, setShowInstructions] = useState(false);




    // ✅ Paginación
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);

    const handleBack = () => navigate('/admin');

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
        } catch {
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
        } catch {
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
        } catch {
            setError(isNewProduct ? 'Error al crear el producto' : 'Error al actualizar el producto');
        } finally {
            setLoading(false);
        }
    };

    // ✅ Exportar Excel
    const handleExportExcel = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const response = await axios.get('http://localhost:8000/api/productos-all', {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json',
                },
                params: {
                    search: searchTerm,
                    filterBy: filterBy,
                },
            });

            const allProductos = response.data;

            const data = allProductos.map(producto => ({
                Código: producto.codigo,
                Nombre: producto.nombre,
                Precio_Público: producto.precio_publico,
                Precio_Médico: producto.precio_medico,
                Laboratorio: producto.laboratorio,
                Categoría: producto.categoria,
                Estado_Producto: producto.estado_producto,
                IVA: producto.iva,
                Fórmula_Médica: producto.formula_medica,
                Registro_Sanitario: producto.registro_sanitario,
                Fecha_Vencimiento: producto.fecha_vencimiento,
                Estado_Registro: producto.estado_registro,
                DAVID: producto.david
            }));

            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Productos');
            XLSX.writeFile(wb, 'productos.xlsx');

        } catch (error) {
            console.error('Error al exportar Excel:', error);
            setError('Error al exportar los productos.');
        }
    };


    // ✅ Importar Excel
    const handleImportExcel = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file); // clave "file" debe coincidir con el backend

        try {
            const token = localStorage.getItem('authToken');
            await axios.post('http://localhost:8000/api/productos/import-excel', formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            setSuccessMessage('Productos importados/actualizados correctamente desde Excel');
            fetchProductos(currentPage); // recarga la tabla actual
        } catch (error) {
            if (error.response && error.response.data && error.response.data.message) {
                setError(`Error al importar: ${error.response.data.message}`);
            } else {
                setError('Error al actualizar productos desde Excel');
            }
        }
    };
    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

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
                            <Button variant="info" onClick={() => setShowInstructions(true)}>
                                Instrucciones
                            </Button>
                            <Button onClick={handleCreateClick} disabled={loading}>+ Crear Producto</Button>
                            <Button variant="success" onClick={handleExportExcel}>Exportar Excel</Button>
                            <Button variant="warning" onClick={() => document.getElementById('fileInputExcel').click()}>
                                Importar Excel
                            </Button>
                            <input
                                id="fileInputExcel"
                                type="file"
                                accept=".xlsx, .xls"
                                style={{ display: 'none' }}
                                onChange={handleImportExcel}
                            />
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
                        {lastPage > 1 && (
                            <div className="pagination-wrapper mt-3">
                                <button
                                    className="pagination-btn"
                                    onClick={() => fetchProductos(currentPage - 1)}
                                    disabled={currentPage === 1}
                                >
                                    <i className="bi bi-chevron-left"></i>
                                </button>
                                <span className="pagination-info">{currentPage} / {lastPage}</span>
                                <button
                                    className="pagination-btn"
                                    onClick={() => fetchProductos(currentPage + 1)}
                                    disabled={currentPage === lastPage}
                                >
                                    <i className="bi bi-chevron-right"></i>
                                </button>
                            </div>
                        )}
                    </Card.Body>
                </Card>
            </Container>

            {/* ✅ MODAL Ver */}
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
                            <p><strong>Precio Público:</strong> ${viewingProduct.precio_publico}</p>
                            <p><strong>Precio Médico:</strong> ${viewingProduct.precio_medico}</p>
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

            {/* ✅ MODAL Editar/Crear COMPLETO */}
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
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>David</Form.Label>
                                    <Form.Control type="text" name="david" value={formData.david || ''} onChange={handleInputChange} />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Categoría</Form.Label>
                                    <Form.Control type="text" name="categoria" value={formData.categoria || ''} onChange={handleInputChange} />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Laboratorio</Form.Label>
                                    <Form.Control type="text" name="laboratorio" value={formData.laboratorio || ''} onChange={handleInputChange} />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Registro Sanitario</Form.Label>
                                    <Form.Control type="text" name="registro_sanitario" value={formData.registro_sanitario || ''} onChange={handleInputChange} />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Fecha de Vencimiento</Form.Label>
                                    <Form.Control type="date" name="fecha_vencimiento" value={formData.fecha_vencimiento || ''} onChange={handleInputChange} />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Estado Registro</Form.Label>
                                    <Form.Control type="text" name="estado_registro" value={formData.estado_registro || ''} onChange={handleInputChange} />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Estado Producto</Form.Label>
                                    <Form.Control type="text" name="estado_producto" value={formData.estado_producto || ''} onChange={handleInputChange} />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Precio Público</Form.Label>
                                    <Form.Control type="number" name="precio_publico" value={formData.precio_publico || ''} onChange={handleInputChange} />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Precio Médico</Form.Label>
                                    <Form.Control type="number" name="precio_medico" value={formData.precio_medico || ''} onChange={handleInputChange} />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>IVA</Form.Label>
                                    <Form.Control type="text" name="iva" value={formData.iva || ''} onChange={handleInputChange} />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={12}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Fórmula Médica</Form.Label>
                                    <Form.Control type="text" name="formula_medica" value={formData.formula_medica || ''} onChange={handleInputChange} />
                                </Form.Group>
                            </Col>
                        </Row>
                    </Form>
                </Modal.Body>
                <Modal.Footer className="d-flex flex-column flex-md-row gap-2">
                    <Button variant="secondary" onClick={() => setShowEditModal(false)} disabled={loading}>Cancelar</Button>
                    <Button variant="primary" onClick={handleSaveChanges} disabled={loading}>
                        {loading ? 'Guardando...' : 'Guardar'}
                    </Button>
                </Modal.Footer>
            </Modal>


            {/* ✅ Modal de Instrucciones */}
            <Modal show={showInstructions} onHide={() => setShowInstructions(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Guía para Importar Productos</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Card className="shadow-sm border-0">
                        <Card.Body>
                            <h5 className="mb-3 text-primary">Pasos para cargar productos desde Excel:</h5>
                            <ul>
                                <li className="text-danger fw-bold">
                                    ⚠️ Asegúrate de que el archivo esté en formato <strong>.xlsx</strong> y <strong><u>descarga la base de datos antes de hacer cualquier modificación</u></strong>.
                                </li>
                                <li>El nombre de las columnas debe coincidir con los campos del sistema.</li>
                                <li>Revisa que no haya celdas vacías en campos obligatorios como <strong>código</strong> o <strong>nombre</strong>.</li>
                                <li>Haz clic en <strong>"Importar Excel"</strong> para seleccionar el archivo.</li>
                                <li>Luego espera el mensaje de confirmación.</li>
                                <li>Al momento de importar el archivo, veas errores si hay codigos repetidos o si algunos campos no están completos.</li>
                            </ul>
                            <Button
                                as="a"
                                href="http://localhost:8000/plantillas/plantilla_productos.xlsx"
                                download
                                className="btn btn-success"
                            >
                                Descargar plantilla
                            </Button>
                            <hr />
                            <p className="mb-0 text-muted"><i className="bi bi-info-circle me-2"></i>Si hay errores en el archivo, no se importará.</p>
                        </Card.Body>
                    </Card>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowInstructions(false)}>
                        Cerrar
                    </Button>
                </Modal.Footer>
            </Modal>

            <footer className="consulta-footer text-center py-3">
                © 2025 Farmacia Homeopática - Más alternativas, más servicio.
            </footer>

        </div>
    );
};

export default Consulta;
