import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Container, Navbar, Nav, Button, Row, Col, Card, Form
} from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../assets/clientedoc.css';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.jpeg';

const Clientedoc = () => {
    const navigate = useNavigate();
    const [documentos, setDocumentos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);

    useEffect(() => {
        fetchDocumentos(1);
    }, []);

    const fetchDocumentos = async (page = 1, search = '') => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                setError('No autorizado. Por favor, inicia sesión.');
                setLoading(false);
                return;
            }

            const response = await axios.get(`http://localhost:8000/api/documentos?page=${page}&search=${search}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = response.data.data || [];
            setDocumentos(data);
            setCurrentPage(response.data.current_page);
            setLastPage(response.data.last_page);
        } catch (err) {
            console.error("Error al cargar documentos:", err.response || err);
            setError('Error al cargar los documentos');
        } finally {
            setLoading(false);
        }
    };

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        fetchDocumentos(1, value); // Reinicia desde página 1 con filtro
    };

    const handleGoToVademecum = () => navigate('/vademecum');
    const handleGoToCapacitacion = () => navigate('/capacitacion');
    const handleBack = () => navigate('/cliente');
    const handleGoToLaboratorios = () => navigate('/laboratorios');

    return (
        <div className="clientedoc-layout">
            {/* ✅ HEADER */}
            <Navbar expand="lg" className="clientedoc-header" variant="dark">
                <Container fluid>
                    <Navbar.Brand className="d-flex align-items-center">
                        <img src={logo} alt="Logo" width="40" height="40" className="me-2" />
                        <span className="clientedoc-title">BIBLIOTECALFH</span>
                    </Navbar.Brand>

                    <Navbar.Toggle aria-controls="basic-navbar-nav" />
                    <Navbar.Collapse id="basic-navbar-nav">
                        <Nav className="ms-auto d-flex flex-column flex-lg-row gap-2 mt-3 mt-lg-0">
                            <Button onClick={handleGoToLaboratorios}>
                                <i className="bi bi-droplet me-1"></i> Laboratorios
                            </Button>
                            <Button onClick={handleGoToVademecum}>
                                <i className="bi bi-book me-1"></i> Vademécum
                            </Button>
                            <Button onClick={handleGoToCapacitacion}>
                                <i className="bi bi-mortarboard me-1"></i> Capacitación
                            </Button>
                            <Button onClick={handleBack} variant="secondary">
                                <i className="bi bi-arrow-left-circle me-1"></i> Productos
                            </Button>
                        </Nav>
                    </Navbar.Collapse>
                </Container>
            </Navbar>

            {/* ✅ CONTENIDO */}
            <Container fluid className="clientedoc-content">
                <Row className="mt-4">
                    <Col xs={12}>
                        <Card className="clientedoc-card">
                            <Card.Body>
                                <h2 className="clientedoc-title-main mb-4 text-center text-md-start">
                                    Documentos PDF
                                </h2>

                                {/* ✅ Buscador */}
                                <Form.Control
                                    type="text"
                                    placeholder="Buscar por nombre o fecha (dd/mm/yyyy)..."
                                    value={searchTerm}
                                    onChange={handleSearchChange}
                                    className="mb-3"
                                />

                                {loading && <div className="text-center mb-3">Cargando documentos...</div>}
                                {error && <div className="alert alert-danger">{error}</div>}

                                {/* ✅ GRID DE DOCUMENTOS */}
                                <div className="document-list">
                                    {documentos.length > 0 ? (
                                        documentos.map((doc, index) => (
                                            <div className="document-card" key={index}>
                                                <div className="document-info">
                                                    <p><strong>Nombre:</strong> {doc.nombre}</p>
                                                    <p><strong>Fecha:</strong> {new Date(doc.fecha_subida).toLocaleDateString('es-ES')}</p>
                                                </div>
                                                <div className="card-actions">
                                                    <Button
                                                        variant="primary"
                                                        size="sm"
                                                        className="btn-ver"
                                                        onClick={() => {
                                                            if (doc.ruta) {
                                                                window.open(`http://localhost:8000/storage/${doc.ruta}`, '_blank');
                                                            } else {
                                                                alert('El documento no tiene un archivo disponible.');
                                                            }
                                                        }}
                                                    >
                                                        Ver
                                                    </Button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-center">No hay documentos disponibles</p>
                                    )}
                                </div>

                                {/* ✅ Paginación */}
                                {lastPage > 1 && (
                                    <div className="pagination-wrapper mt-3 d-flex justify-content-center">
                                        <button
                                            className="pagination-btn"
                                            onClick={() => fetchDocumentos(currentPage - 1, searchTerm)}
                                            disabled={currentPage === 1}
                                        >
                                            <i className="bi bi-chevron-left"></i>
                                        </button>
                                        <span className="pagination-info">{currentPage} / {lastPage}</span>
                                        <button
                                            className="pagination-btn"
                                            onClick={() => fetchDocumentos(currentPage + 1, searchTerm)}
                                            disabled={currentPage === lastPage}
                                        >
                                            <i className="bi bi-chevron-right"></i>
                                        </button>
                                    </div>
                                )}
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>

            {/* ✅ FOOTER */}
            <footer className="clientedoc-footer">
                <Container fluid>
                    <Row className="py-3">
                        <Col md={12} className="text-center">
                            <p className="mb-0">© 2025 Farmacia Homeopática - Más alternativas, más servicio.</p>
                        </Col>
                    </Row>
                </Container>
            </footer>
        </div>
    );
};

export default Clientedoc;
