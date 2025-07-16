import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Container, Navbar, Button, Row, Col,
    Card, Table, Modal, Form, ProgressBar, Alert
} from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../assets/consulta.css';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.jpeg';

const Documentos = () => {
    const navigate = useNavigate();
    const [documentos, setDocumentos] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // ✅ Obtener encabezados con token
    const getAuthHeaders = () => {
        const token = localStorage.getItem('authToken');
        return token ? { Authorization: `Bearer ${token}` } : null;
    };

    // ✅ Volver al panel sin cerrar sesión
    const handlelogout = () => {
        navigate('/admin');
    };

    // ✅ Cargar documentos al iniciar
    useEffect(() => {
        const fetchDocumentos = async () => {
            setLoading(true);
            try {
                const headers = getAuthHeaders();
                if (!headers) {
                    navigate('/'); // Si no hay token, vuelve al login
                    return;
                }
                const response = await axios.get('http://localhost:8000/api/documentos', { headers });
                setDocumentos(response.data.data || response.data);
            } catch (error) {
                setError('Error al cargar los documentos');
            } finally {
                setLoading(false);
            }
        };
        fetchDocumentos();
    }, [navigate]);

    // ✅ Manejar selección de archivos
    const handleFileChange = (e) => {
        setSelectedFiles([...e.target.files]);
    };

    // ✅ Subir documentos
    const handleUpload = async () => {
        if (selectedFiles.length === 0) return;

        setLoading(true);
        setError(null);
        setUploadProgress(0);

        const formData = new FormData();
        selectedFiles.forEach(file => {
            formData.append('documentos[]', file);
        });

        try {
            const headers = getAuthHeaders();
            if (!headers) return;

            const response = await axios.post(
                'http://localhost:8000/api/documentos/upload',
                formData,
                {
                    headers: {
                        ...headers,
                        'Content-Type': 'multipart/form-data',
                    },
                    onUploadProgress: (progressEvent) => {
                        const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
                        setUploadProgress(progress);
                    },
                }
            );

            setSuccessMessage(`${selectedFiles.length} documentos subidos correctamente`);
            setDocumentos([...documentos, ...response.data.documentos]);
            setSelectedFiles([]);
            setShowModal(false);
        } catch (error) {
            setError(error.response?.data?.message || 'Error al subir los documentos');
        } finally {
            setLoading(false);
        }
    };

    // ✅ Eliminar documento
    const handleDeleteDocument = async (id) => {
        if (!window.confirm('¿Estás seguro de eliminar este documento?')) return;

        setLoading(true);
        setError(null);

        try {
            const headers = getAuthHeaders();
            if (!headers) return;

            await axios.delete(`http://localhost:8000/api/documentos/${id}`, { headers });

            setSuccessMessage('Documento eliminado correctamente');
            setDocumentos(documentos.filter(doc => doc.id !== id));
        } catch (error) {
            setError('Error al eliminar el documento');
        } finally {
            setLoading(false);
        }
    };

    const filteredDocs = documentos.filter(doc =>
        doc.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="consulta-layout">
            {/* Header */}
            <Navbar expand="lg" className="admin-header">
                <Container fluid>
                    <Navbar.Brand className="d-flex align-items-center">
                        <img src={logo} alt="Logo" width="40" height="40" className="me-2" />
                        <span className="consulta-title">BIBLIOTECALFH</span>
                    </Navbar.Brand>
                    <Button onClick={handlelogout} className="logout-button">
                        <i className="bi bi-arrow-left-circle me-1"></i> Volver
                    </Button>
                </Container>
            </Navbar>

            {/* Contenido principal */}
            <Container fluid className="consulta-content">
                <Row className="mt-4">
                    <Col>
                        <Card className="consulta-card">
                            <Card.Body>
                                <h4 className="mb-4">Documentos PDF</h4>

                                <div className="d-flex justify-content-between mb-4">
                                    <Button onClick={() => setShowModal(true)} disabled={loading}>
                                        <i className="bi bi-upload me-2"></i> Cargar Documentos
                                    </Button>

                                    <Form.Control
                                        type="text"
                                        placeholder="Buscar por nombre..."
                                        style={{ width: '300px' }}
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>

                                {loading && !showModal && <div className="text-center mb-3">Cargando...</div>}
                                {error && <Alert variant="danger">{error}</Alert>}
                                {successMessage && <Alert variant="success">{successMessage}</Alert>}

                                <div className="table-scroll-wrapper">
                                    <div className="table-container">
                                        <Table striped bordered hover responsive className="product-table">
                                            <thead>
                                                <tr>
                                                    <th>Nombre</th>
                                                    <th>Fecha de Subida</th>
                                                    <th>Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredDocs.map((doc, index) => (
                                                    <tr key={index}>
                                                        <td>{doc.nombre}</td>
                                                        <td>{new Date(doc.fecha_subida).toLocaleDateString()}</td>
                                                        <td>
                                                            <Button
                                                                variant="primary"
                                                                size="sm"
                                                                onClick={() => window.open(`http://localhost:8000/storage/${doc.ruta}`, '_blank')}
                                                                disabled={loading}
                                                            >
                                                                Ver
                                                            </Button>{' '}
                                                            <Button
                                                                variant="danger"
                                                                size="sm"
                                                                onClick={() => handleDeleteDocument(doc.id)}
                                                                disabled={loading}
                                                            >
                                                                Eliminar
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    </div>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>

            {/* Modal para subir documentos */}
            <Modal show={showModal} onHide={() => !loading && setShowModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Cargar Documentos PDF</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-4">
                            <Form.Label>Selecciona los archivos PDF (múltiple)</Form.Label>
                            <Form.Control
                                type="file"
                                multiple
                                accept=".pdf"
                                onChange={handleFileChange}
                                disabled={loading}
                            />
                        </Form.Group>

                        {selectedFiles.length > 0 && (
                            <div className="mb-3">
                                <h6>Archivos seleccionados:</h6>
                                <ul>
                                    {Array.from(selectedFiles).map((file, index) => (
                                        <li key={index}>{file.name} ({(file.size / 1024).toFixed(2)} KB)</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {uploadProgress > 0 && (
                            <ProgressBar
                                now={uploadProgress}
                                label={`${uploadProgress}%`}
                                animated
                                className="mb-3"
                            />
                        )}
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleUpload}
                        disabled={loading || selectedFiles.length === 0}
                    >
                        {loading ? 'Subiendo...' : 'Subir Documentos'}
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

export default Documentos;
