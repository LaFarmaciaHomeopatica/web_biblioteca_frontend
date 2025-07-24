import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
    Container, Navbar, Button, Card, Modal, Form, ProgressBar, Alert
} from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../assets/documentos.css';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.jpeg';

const Documentos = () => {
    const navigate = useNavigate();
    const [documentos, setDocumentos] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [showModal, setShowModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingDoc, setEditingDoc] = useState(null);
    const [newDocName, setNewDocName] = useState('');
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const cancelTokenSourceRef = useRef(null);

    const getAuthHeaders = () => {
        const token = localStorage.getItem('authToken');
        return token ? { Authorization: `Bearer ${token}` } : null;
    };

    const handleLogout = () => {
        navigate('/admin');
    };

    const fetchDocumentos = useCallback(async (page = 1, term = '') => {
        if (cancelTokenSourceRef.current) {
            cancelTokenSourceRef.current.cancel('Cancelado por nueva solicitud');
        }
        cancelTokenSourceRef.current = axios.CancelToken.source();

        setLoading(true);
        try {
            const headers = getAuthHeaders();
            if (!headers) {
                navigate('/');
                return;
            }
            const response = await axios.get(`http://localhost:8000/api/documentos`, {
                headers,
                params: {
                    page,
                    search: term
                },
                cancelToken: cancelTokenSourceRef.current.token
            });

            setDocumentos(response.data.data);
            setCurrentPage(response.data.current_page);
            setLastPage(response.data.last_page);
        } catch (error) {
            if (!axios.isCancel(error)) {
                setError('Error al cargar los documentos');
            }
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        fetchDocumentos(currentPage, searchTerm);
        return () => {
            if (cancelTokenSourceRef.current) {
                cancelTokenSourceRef.current.cancel('Componente desmontado');
            }
        };
    }, [currentPage, searchTerm, fetchDocumentos]);

    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            fetchDocumentos(1, searchTerm);
        }, 500);
        return () => clearTimeout(delayDebounce);
    }, [searchTerm, fetchDocumentos]);

    const handleFileChange = (e) => {
        setSelectedFiles([...e.target.files]);
    };

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

            await axios.post(
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

            setSuccessMessage(`${selectedFiles.length} documento(s) subido(s) correctamente`);
            fetchDocumentos(currentPage, searchTerm);
            setSelectedFiles([]);
            setShowModal(false);

            setTimeout(() => {
                setSuccessMessage(null);
                setUploadProgress(0);
            }, 3000);
        } catch (error) {
            setError(error.response?.data?.message || 'Error al subir los documentos');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteDocument = async (id) => {
        if (!window.confirm('¿Estás seguro de eliminar este documento?')) return;

        setLoading(true);
        setError(null);

        try {
            const headers = getAuthHeaders();
            if (!headers) return;

            await axios.delete(`http://localhost:8000/api/documentos/${id}`, { headers });

            setSuccessMessage('Documento eliminado correctamente');
            fetchDocumentos(currentPage, searchTerm);

            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (error) {
            setError('Error al eliminar el documento');
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (doc) => {
        setEditingDoc(doc);
        setNewDocName(doc.nombre);
        setShowEditModal(true);
    };

    const handleSaveEdit = async () => {
        if (!editingDoc || !newDocName.trim()) return;
        setLoading(true);
        setError(null);

        try {
            const headers = getAuthHeaders();
            if (!headers) return;

            await axios.put(
                `http://localhost:8000/api/documentos/${editingDoc.id}`,
                { nombre: newDocName },
                { headers }
            );

            setSuccessMessage('Nombre del documento actualizado correctamente');
            fetchDocumentos(currentPage, searchTerm);
            setShowEditModal(false);

            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (error) {
            setError(error.response?.data?.message || 'Error al actualizar el documento');
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (newPage) => {
        if (!loading && newPage >= 1 && newPage <= lastPage) {
            setCurrentPage(newPage);
        }
    };

    return (
        <div className="documentos-page">
            {/* HEADER */}
            <Navbar expand="lg" className="documentos-header">
                <Container fluid>
                    <Navbar.Brand className="d-flex align-items-center">
                        <img src={logo} alt="Logo" width="40" height="40" className="me-2" />
                        <span className="documentos-title">BIBLIOTECALFH</span>
                    </Navbar.Brand>
                    <Button onClick={handleLogout} className="logout-button">
                        <i className="bi bi-arrow-left-circle me-1"></i> Volver
                    </Button>
                </Container>
            </Navbar>

            {/* CONTENIDO */}
            <Container fluid className="documentos-content">
                <Card className="documentos-card">
                    <Card.Body>
                        <h2 className="documentos-title-main mb-4 text-center text-md-start">
                            Gestión de Documentos
                        </h2>

                        <div className="d-flex flex-column flex-md-row gap-2 mb-4">
                            <Button onClick={() => setShowModal(true)} disabled={loading}>
                                <i className="bi bi-upload me-2"></i> Cargar Documentos
                            </Button>
                            <Form.Control
                                type="text"
                                placeholder="Buscar por nombre"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {loading && <div className="text-center mb-3">Cargando documentos...</div>}
                        {error && <Alert variant="danger">{error}</Alert>}
                        {successMessage && <Alert variant="success">{successMessage}</Alert>}

                        <div className="document-list">
                            {documentos.length > 0 ? (
                                documentos.map((doc) => (
                                    <div key={doc.id} className="document-card">
                                        <div className="document-info">
                                            <p><strong>{doc.nombre}</strong></p>
                                            <p>Fecha: {new Date(doc.fecha_subida).toLocaleDateString('es-ES')}</p>
                                        </div>
                                        <div className="card-actions">
                                            <Button size="sm" variant="warning" onClick={() => handleEditClick(doc)}>Editar</Button>
                                            <Button size="sm" variant="primary" onClick={() => window.open(`http://localhost:8000/storage/${doc.ruta}`, '_blank')}>Ver</Button>
                                            <Button size="sm" variant="danger" onClick={() => handleDeleteDocument(doc.id)}>Eliminar</Button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center">No se encontraron documentos</p>
                            )}
                        </div>

                        {lastPage > 1 && (
                            <div className="pagination-wrapper mt-4 d-flex justify-content-center gap-2">
                                <button
                                    className="pagination-btn"
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1 || loading}
                                >
                                    <i className="bi bi-chevron-left"></i>
                                </button>
                                <span className="pagination-info">{currentPage} / {lastPage}</span>
                                <button
                                    className="pagination-btn"
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === lastPage || loading}
                                >
                                    <i className="bi bi-chevron-right"></i>
                                </button>
                            </div>
                        )}
                    </Card.Body>
                </Card>
            </Container>

            {/* FOOTER */}
            <footer className="documentos-footer text-center py-3">
                © 2025 Farmacia Homeopática - Todos los derechos reservados
            </footer>

            {/* MODAL SUBIR */}
            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Cargar Documentos</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group>
                        <Form.Label>Seleccionar archivos PDF</Form.Label>
                        <Form.Control type="file" multiple accept=".pdf" onChange={handleFileChange} />
                        {uploadProgress > 0 && (
                            <ProgressBar now={uploadProgress} label={`${uploadProgress}%`} className="mt-3" />
                        )}
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
                    <Button variant="primary" onClick={handleUpload} disabled={loading || selectedFiles.length === 0}>
                        {loading ? 'Subiendo...' : 'Subir Documentos'}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* MODAL EDITAR */}
            <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Editar Documento</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group>
                        <Form.Label>Nuevo nombre</Form.Label>
                        <Form.Control type="text" value={newDocName} onChange={(e) => setNewDocName(e.target.value)} />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancelar</Button>
                    <Button variant="primary" onClick={handleSaveEdit} disabled={loading}>
                        {loading ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default Documentos;
