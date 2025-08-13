import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    Container, Navbar, Form, FormControl, Button, Row, Col,
    Card, Modal, Alert, Spinner, Tabs, Tab, Table, Badge
} from 'react-bootstrap';
import * as XLSX from 'xlsx';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../assets/consulta.css';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.jpeg';



const Consulta = () => {
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
    const [successMessage, setSuccessMessage] = useState(null);

    const [editingProduct, setEditingProduct] = useState(null);
    const [viewingProduct, setViewingProduct] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [formData, setFormData] = useState({});
    const [isNewProduct, setIsNewProduct] = useState(false);
    const [showInstructions, setShowInstructions] = useState(false);


    // eslint-disable-next-line no-unused-vars
    const [importFile, setImportFile] = useState(null);
    const [importPreview, setImportPreview] = useState(null);
    const [importing, setImporting] = useState(false);
    const [showImportPreview, setShowImportPreview] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);


    const fetchProductos = useCallback(async (page = 1) => {
        setLoading(true);
        setError(null);
        try {
            let url = `http://localhost:8000/api/productos?page=${page}`;

            if (searchTerm.trim() !== '') {
                // Asegúrate que el filtro sea válido para el backend
                const validFilters = ['nombre', 'codigo', 'categoria', 'precio_publico', 'precio_medico'];
                const filterToUse = validFilters.includes(filterBy) ? filterBy : 'nombre';

                // Usa los nombres de parámetros que espera el backend
                url += `&search=${encodeURIComponent(searchTerm)}&filter_by=${filterToUse}`;
            }

            console.log("URL de consulta:", url); // Para depuración

            const response = await axios.get(url);
            setProductos(response.data.data || []);
            setCurrentPage(response.data.current_page);
            setLastPage(response.data.last_page);
        } catch (error) {
            setError('Error al cargar los productos');
            console.error("Error:", error.response?.data || error.message);
        } finally {
            setLoading(false);
        }
    }, [searchTerm, filterBy]);

    useEffect(() => {
        fetchProductos(currentPage);
    }, [currentPage, fetchProductos]);

    const handleBack = () => navigate('/admin');
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
            const headers = {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            };

            // Limpiar el formData antes de enviarlo
            const cleanFormData = Object.fromEntries(
                Object.entries(formData).map(([key, value]) => [
                    key,
                    typeof value === 'string' ? value.trim() : value
                ])
            );

            console.log('Datos antes de enviar:', formData);

            if (isNewProduct) {
                await axios.post('http://localhost:8000/api/productos', cleanFormData, { headers });
            } else {
                await axios.put(`http://localhost:8000/api/productos/${editingProduct.id}`, cleanFormData, { headers });
            }

            setShowEditModal(false);
            setSuccessMessage(isNewProduct ? 'Producto creado exitosamente' : 'Producto actualizado correctamente');
            fetchProductos(currentPage);
        } catch (error) {
            console.error("Error desde backend:", error.response?.data || error.message);

            // Mostrar error más específico al usuario si Laravel da información
            if (error.response?.data?.errors) {
                const errorMsg = Object.values(error.response.data.errors).flat().join(', ');
                setError(errorMsg);
            } else {
                setError(isNewProduct ? 'Error al crear el producto' : 'Error al actualizar el producto');
            }
        } finally {
            setLoading(false);
        }
    };


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



    const handleImportPreview = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);
        setError(null);
        setImportPreview(null);

        try {
            // 1. Validar tipo de archivo
            if (!['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'].includes(file.type)) {
                throw new Error('Formato de archivo no válido. Solo se aceptan archivos Excel (.xlsx, .xls)');
            }

            // 2. Obtener token
            const token = localStorage.getItem('authToken');
            if (!token) {
                throw new Error('No se encontró el token de autenticación');
            }

            // 3. Preparar FormData
            const formData = new FormData();
            formData.append('file', file);
            formData.append('timestamp', new Date().toISOString()); // Para evitar caché

            // 4. Enviar archivo
            const response = await axios.post(
                'http://localhost:8000/api/productos/import-preview',
                formData,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                    },
                    timeout: 60000 // 30 segundos timeout
                }
            );

            // 5. Validar estructura de respuesta
            if (!response.data || typeof response.data !== 'object') {
                throw new Error('La respuesta del servidor no es válida');
            }

            // 6. Procesar datos
            const processedData = {
                crear: Array.isArray(response.data.crear) ? response.data.crear : [],
                actualizar: Array.isArray(response.data.actualizar) ? response.data.actualizar : [],
                eliminar: Array.isArray(response.data.eliminar) ? response.data.eliminar : [],
                errores: Array.isArray(response.data.errores) ? response.data.errores : [],
                metadata: {
                    total_nuevos: Number(response.data.total_nuevos) || 0,
                    total_actualizar: Number(response.data.total_actualizar) || 0,
                    total_eliminar: Number(response.data.total_eliminar) || 0,
                    total_filas: Number(response.data.total_filas) || 0,
                    filas_procesadas: Number(response.data.filas_procesadas) || 0,
                    filas_con_errores: Number(response.data.filas_con_errores) || 0
                }
            };

            // 7. Validar datos mínimos
            if (processedData.errores.length > 0 && processedData.errores.length === processedData.metadata.total_filas) {
                throw new Error('El archivo contiene errores en todas las filas. Revise el formato.');
            }

            // 8. Actualizar estado
            setImportFile(file);
            setImportPreview(processedData);
            setShowImportPreview(true);

        } catch (error) {
            // 9. Manejo de errores mejorado
            let errorMsg = 'Error al procesar el archivo';


            if (error.response) {
                // Error del servidor
                if (error.response.status === 413) {
                    errorMsg = 'El archivo es demasiado grande';
                } else if (error.response.data?.errors) {
                    errorMsg = Object.values(error.response.data.errors).join(', ');
                } else {
                    errorMsg = error.response.data?.message ||
                        `Error del servidor (${error.response.status})`;
                }
            } else if (error.message.includes('token')) {
                errorMsg = 'Sesión expirada. Por favor, vuelva a iniciar sesión';
            } else {
                errorMsg = error.message;
            }

            setError(errorMsg);
            console.error('Detalles del error:', {
                error: error.message,
                response: error.response?.data,
                stack: error.stack
            });

        } finally {
            setLoading(false);
            if (e.target) e.target.value = ''; // Limpiar input
        }
    };

    const handleConfirmImport = async () => {
        if (!importPreview) {
            setError('No hay datos de importación para confirmar');
            return;
        }

        setImporting(true);
        setShowImportPreview(false);

        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                throw new Error('No se encontró token de autenticación');
            }

            // 1. Preparar payload según lo que espera tu backend
            const payload = {
                crear: importPreview.crear.map(item => item.datos || item),
                actualizar: importPreview.actualizar.map(item => ({
                    codigo: item.codigo,
                    ...(item.nuevo || item)
                })),
                eliminar: importPreview.eliminar.map(item => ({ codigo: item.codigo || item }))
            };

            console.log("Payload limpio:", JSON.stringify(payload, null, 2)); // Verifica esto!

            // 2. Hacer la petición PUT (como muestra tu ruta)
            const response = await axios.put(
                'http://localhost:8000/api/productos/import-confirm',
                payload,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    timeout: 30000 // 20 segundos de timeout
                }
            );

            // 3. Manejar respuesta exitosa
            if (!response.data) {
                throw new Error('La respuesta del servidor está vacía');
            }

            setSuccessMessage([
                '✅ Importación completada',
                `• Nuevos: ${response.data.creados || 0}`,
                `• Actualizados: ${response.data.actualizados || 0}`,
                `• Eliminados: ${response.data.eliminados || 0}`
            ].join('\n'));

            // 4. Refrescar los datos
            await fetchProductos(1);

        } catch (error) {
            // 5. Manejo detallado de errores
            let errorMsg = 'Error al confirmar importación';

            if (error.code === 'ECONNABORTED') {
                errorMsg = 'El servidor no respondió a tiempo';
            } else if (error.response) {
                // Errores específicos del backend
                switch (error.response.status) {
                    case 401:
                        errorMsg = 'No autorizado - Token inválido o expirado';
                        break;
                    case 404:
                        errorMsg = 'El producto no existe (404)';
                        break;
                    case 422:
                        errorMsg = error.response.data.message || 'Datos de validación incorrectos';
                        break;
                    default:
                        errorMsg = error.response.data?.message || `Error del servidor (${error.response.status})`;
                }
            } else if (error.message.includes('token')) {
                errorMsg = 'Problema de autenticación - Vuelve a iniciar sesión';
            }

            setError(errorMsg);
            console.error('Detalles del error:', {
                message: error.message,
                response: error.response?.data,
                config: error.config
            });

        } finally {
            setImporting(false);
            setImportFile(null);
            setImportPreview(null);
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
                                onChange={handleImportPreview}
                            />
                            <Form className="d-flex flex-column flex-md-row gap-2 flex-grow-1">
                                <FormControl
                                    type="text"
                                    placeholder="Buscar por nombre, laboratorio o código..."
                                    value={searchTerm}
                                    onChange={handleSearchChange}
                                />
                                <Form.Select
                                    value={filterBy}
                                    onChange={(e) => setFilterBy(e.target.value)}
                                >
                                    <option value="nombre">Nombre</option>
                                    <option value="codigo">Código</option>
                                    <option value="categoria">Categoría</option>
                                </Form.Select>
                            </Form>
                        </div>

                        {loading && <div className="text-center mb-3">Cargando productos...</div>}
                        {error && <Alert variant="danger">{error}</Alert>}
                        {successMessage && <Alert variant="success">{successMessage}</Alert>}

                        <div className="product-list">
                            {productos.length > 0 ? (
                                productos.map((producto, index) => (
                                    <div
                                        className={`product-card ${producto.estado_producto?.toLowerCase() === 'inactivo' ? 'inactive' : ''}`}
                                        key={index}
                                    >
                                        <div className="product-info">
                                            <p><strong>Nombre:</strong> {producto.nombre}</p>
                                            <p><strong>Precio Publico:</strong> {formatearPrecio(producto.precio_publico)}</p>
                                            <p><strong>Precio Médico:</strong> {formatearPrecio(producto.precio_medico)}</p>
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

                        {lastPage > 1 && (
                            <div className="pagination-wrapper mt-3">
                                <button
                                    className={`pagination-btn ${loading ? 'opacity-50' : ''}`}
                                    onClick={() => fetchProductos(currentPage - 1)}
                                    disabled={currentPage === 1 || loading}
                                >
                                    <i className="bi bi-chevron-left"></i>
                                </button>

                                <span className="pagination-info">
                                    {loading ? (
                                        <Spinner animation="border" size="sm" />
                                    ) : (
                                        `${currentPage} / ${lastPage}`
                                    )}
                                </span>

                                <button
                                    className={`pagination-btn ${loading ? 'opacity-50' : ''}`}
                                    onClick={() => fetchProductos(currentPage + 1)}
                                    disabled={currentPage === lastPage || loading}
                                >
                                    <i className="bi bi-chevron-right"></i>
                                </button>
                            </div>
                        )}
                    </Card.Body>
                </Card>
            </Container>

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
                            <p><strong>Precio Médico:</strong> {formatearPrecio(viewingProduct.precio_publico)}</p>
                            <p><strong>Precio Médico:</strong> {formatearPrecio(viewingProduct.precio_medico)}</p>
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

            <Modal show={showImportPreview} onHide={() => setShowImportPreview(false)} centered size="xl">
                <Modal.Header closeButton>
                    <Modal.Title>
                        Vista Previa de Importación
                        {importPreview?.metadata && (
                            <Badge bg="info" className="ms-2">
                                Filas procesadas: {importPreview.metadata.filas_procesadas}/{importPreview.metadata.total_filas}
                            </Badge>
                        )}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {importPreview && (
                        <Tabs defaultActiveKey="crear" className="mb-3">
                            {/* Pestaña "Nuevos" - Sin contador */}
                            <Tab eventKey="crear" title="Nuevos">
                                {importPreview.crear?.length > 0 ? (
                                    <div className="table-responsive">
                                        <Table striped bordered hover className="align-middle">
                                            <thead className="table-dark">
                                                <tr>
                                                    <th>Código</th>
                                                    <th>Nombre</th>
                                                    <th>Precio Público</th>
                                                    <th>Precio Médico</th>
                                                    <th>Laboratorio</th>
                                                    <th>Categoría</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {importPreview.crear.map((producto, index) => (
                                                    <tr key={`new-${index}`}>
                                                        <td>{producto.codigo || producto.datos?.codigo}</td>
                                                        <td>{producto.nombre || producto.datos?.nombre || 'N/A'}</td>
                                                        <td>{formatearPrecio(producto.precio_publico)}</td>
                                                        <td>{formatearPrecio(producto.precio_medico)}</td>
                                                        <td>{producto.laboratorio || producto.datos?.laboratorio || 'N/A'}</td>
                                                        <td>{producto.categoria || producto.datos?.categoria || 'N/A'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    </div>
                                ) : (
                                    <Alert variant="info">No hay productos nuevos para crear</Alert>
                                )}
                            </Tab>

                            {/* Pestaña "Actualizar" - Sin contador */}
                            <Tab eventKey="actualizar" title="Actualizar">
                                {importPreview.actualizar?.length > 0 ? (
                                    <div className="table-responsive">
                                        <Table striped bordered hover className="align-middle">
                                            <thead className="table-dark">
                                                <tr>
                                                    <th>Código</th>
                                                    <th>Nombre</th>
                                                    <th>Campo</th>
                                                    <th>Valor Actual</th>
                                                    <th>Nuevo Valor</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {importPreview.actualizar.map((producto, index) => {
                                                    const cambios = producto.campos_modificados ||
                                                        (producto.datos ?
                                                            Object.keys(producto.datos).filter(
                                                                key => producto.actual && producto.actual[key] !== producto.datos[key]
                                                            ) : []);

                                                    return cambios.length > 0 ? (
                                                        cambios.map((campo, i) => (
                                                            <tr key={`update-${index}-${i}`}>
                                                                <td>{producto.codigo}</td>
                                                                <td>{producto.actual?.nombre || producto.nombre}</td>
                                                                <td className="text-capitalize">{campo.replace('_', ' ')}</td>
                                                                <td className="text-danger">
                                                                    {producto.actual ? producto.actual[campo] : 'N/A'}
                                                                </td>
                                                                <td className="text-success">
                                                                    {producto.datos ? producto.datos[campo] : producto[campo]}
                                                                </td>
                                                            </tr>
                                                        ))
                                                    ) : null;
                                                }).filter(Boolean)}
                                            </tbody>
                                        </Table>
                                    </div>
                                ) : (
                                    <Alert variant="info">No hay productos para actualizar</Alert>
                                )}
                            </Tab>

                            {/* Pestaña "Eliminar" - Sin contador */}
                            <Tab eventKey="eliminar" title="Eliminar">
                                {importPreview.eliminar?.length > 0 ? (
                                    <div className="table-responsive">
                                        <Table striped bordered hover className="align-middle">
                                            <thead className="table-dark">
                                                <tr>
                                                    <th>Código</th>
                                                    <th>Nombre</th>
                                                    <th>Laboratorio</th>
                                                    <th>Motivo</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {importPreview.eliminar.map((producto, index) => (
                                                    <tr key={`delete-${index}`}>
                                                        <td>{producto.codigo}</td>
                                                        <td>{producto.nombre}</td>
                                                        <td>{producto.laboratorio}</td>
                                                        <td>{producto.motivo || 'No está en el archivo Excel'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    </div>
                                ) : (
                                    <Alert variant="info">No hay productos para eliminar</Alert>
                                )}
                            </Tab>

                            {/* Pestaña "Errores" - Sin contador (opcional, si quieres mantenerlo déjalo como está) */}
                            <Tab eventKey="errores" title="Errores">
                                {importPreview.errores?.length > 0 ? (
                                    <div>
                                        {importPreview.errores.map((error, index) => (
                                            <Alert key={`error-${index}`} variant="danger" className="mb-2">
                                                {error.mensaje || error.message || 'Error desconocido'}
                                                {error.filas && (
                                                    <div className="mt-1">
                                                        <small>Filas afectadas: {error.filas.join(', ')}</small>
                                                    </div>
                                                )}
                                            </Alert>
                                        ))}
                                    </div>
                                ) : (
                                    <Alert variant="success">No se encontraron errores en el archivo</Alert>
                                )}
                            </Tab>
                        </Tabs>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowImportPreview(false)}>
                        Cancelar
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleConfirmImport}
                        disabled={importing || (importPreview?.errores?.length || 0) > 0}
                    >
                        {importing ? (
                            <>
                                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                                <span className="ms-2">Importando...</span>
                            </>
                        ) : 'Confirmar Importación'}
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