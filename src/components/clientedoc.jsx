import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Container, Navbar, Button, Row, Col,
    Card, Table, Form, Alert
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

    // ✅ Obtener encabezados con token
    const getAuthHeaders = () => {
        const token = localStorage.getItem('authToken');
        return token ? { Authorization: `Bearer ${token}` } : null;
    };

    // ✅ Volver al panel
    const handleBack = () => {
        navigate('/cliente');
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

    // ✅ Filtrar documentos por nombre
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
                    <Button onClick={handleBack} className="logout-button">
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

                                <div className="d-flex justify-content-end mb-4">
                                    <Form.Control
                                        type="text"
                                        placeholder="Buscar por nombre..."
                                        style={{ width: '300px' }}
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>

                                {loading && <div className="text-center mb-3">Cargando...</div>}
                                {error && <Alert variant="danger">{error}</Alert>}

                                {/* Tabla de documentos */}
                                <div className="table-scroll-wrapper">
                                    <div className="table-container">
                                        <Table striped bordered hover responsive className="product-table">
                                            <thead>
                                                <tr>
                                                    <th>Nombre</th>
                                                    <th>Fecha de Subida</th>
                                                    <th>Acción</th>
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

export default Clientedoc;
