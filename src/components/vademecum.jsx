import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Container, Navbar, Button, Row, Col, Card, Table
} from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../assets/vademecum.css';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.jpeg';

const Vademecum = () => {
    const navigate = useNavigate();
    const [documentos, setDocumentos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchDocumentos();
    }, []);

    // ✅ Cargar documentos filtrando los que contienen la palabra "vademecum"
    const fetchDocumentos = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('authToken'); // Obtén el token guardado
            if (!token) {
                setError('No autorizado. Por favor, inicia sesión.');
                setLoading(false);
                return;
            }

            const response = await axios.get('http://localhost:8000/api/documentos', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            // Filtrar documentos que tengan "vademecum" en el nombre (sin importar mayúsculas)
            const docsFiltrados = (response.data.data || response.data).filter(doc =>
                doc.nombre && doc.nombre.toLowerCase().includes('vademecum')
            );

            setDocumentos(docsFiltrados);
        } catch (error) {
            if (error.response && error.response.status === 401) {
                setError('No autorizado. Inicia sesión nuevamente.');
            } else {
                setError('Error al cargar los documentos');
            }
        } finally {
            setLoading(false);
        }
    };

    // ✅ Acción para abrir documento directamente
    const handleOpenDoc = (doc) => {
        const url = `http://localhost:8000/storage/${doc.ruta}`;
        window.open(url, '_blank');
    };

    return (
        <div className="cliente-layout">
            {/* Header */}
            <Navbar expand="lg" className="admin-header">
                <Container fluid className="d-flex justify-content-between align-items-center">
                    <Navbar.Brand className="d-flex align-items-center">
                        <img src={logo} alt="Logo" width="40" height="40" className="me-2" />
                        <span className="admin-title">BIBLIOTECALFH</span>
                    </Navbar.Brand>
                    <div className="d-flex">
                        <Button onClick={() => navigate('/cliente')} variant="secondary">
                            <i className="bi bi-arrow-left"></i> Volver
                        </Button>
                    </div>
                </Container>
            </Navbar>

            {/* Contenido */}
            <Container fluid className="cliente-content">
                <Row className="mt-4">
                    <Col>
                        <Card className="cliente-card">
                            <Card.Body>
                                <h4 className="mb-4">Documentos - Vademécum</h4>

                                {/* Mensajes */}
                                {loading && <div className="text-center mb-3">Cargando documentos...</div>}
                                {error && <div className="alert alert-danger">{error}</div>}

                                {/* Tabla de documentos */}
                                <Table striped bordered hover responsive>
                                    <thead>
                                        <tr>
                                            <th>Nombre</th>
                                            <th>Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {documentos.length > 0 ? (
                                            documentos.map((doc, index) => (
                                                <tr key={index}>
                                                    <td>{doc.nombre}</td>
                                                    <td className="document-actions">
                                                        <Button
                                                            variant="primary"
                                                            size="sm"
                                                            onClick={() => handleOpenDoc(doc)}
                                                        >
                                                            Ver
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="2" className="text-center">
                                                    No hay documentos de Vademécum
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </Table>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </div>
    );
};

export default Vademecum;
