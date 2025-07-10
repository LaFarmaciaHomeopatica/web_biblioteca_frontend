import React, { useState, useEffect } from 'react';
import axios from 'axios';  // ¡Importante!
import { Container, Navbar, Form, FormControl, Button, Row, Col, Card, Table } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../assets/consulta.css';
import { useNavigate } from 'react-router-dom';

const Consulta = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterBy, setFilterBy] = useState('codigo');
    const [productos, setProductos] = useState([]);

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        navigate('/admin');
    };

    // Obtener productos del backend
    useEffect(() => {
        axios.get('http://localhost:8000/api/productos')
            .then(response => {
                console.log('Datos recibidos del backend:', response.data);
                setProductos(response.data);
            })
            .catch(error => {
                console.error('Error al obtener productos:', error);
            });
    }, []);

    const filteredProducts = productos.filter(producto =>
        producto[filterBy]?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="consulta-layout">
            {/* Header */}
            <Navbar expand="lg" className="consulta-header">
                <Container fluid>
                    <Navbar.Brand href="#" className="d-flex align-items-center">
                        <i className="bi bi-shield-lock me-2"></i>
                        Panel De Consulta - Farmacia Homeopática
                    </Navbar.Brand>

                    <div className="d-flex">
                        <Button onClick={handleLogout} className="retroceder-button">
                            <i className="bi bi-box-arrow-right me-1"></i> volver
                        </Button>
                    </div>
                </Container>
            </Navbar>

            {/* Contenido Principal */}
            <Container fluid className="consulta-content">
                <Row className="mt-4">
                    <Col>
                        <Card className="consulta-card">
                            <Card.Body>
                                <h4 className="mb-4">Consulta de Productos</h4>

                                {/* Barra de búsqueda y filtros */}
                                <div className="search-container mb-4">
                                    <Form className="d-flex">
                                        <FormControl
                                            type="text"
                                            placeholder={`Buscar por ${filterBy}...`}
                                            className="mr-2"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                        <Form.Control
                                            as="select"
                                            className="ml-2"
                                            value={filterBy}
                                            onChange={(e) => setFilterBy(e.target.value)}
                                        >
                                            <option value="codigo">Código</option>
                                            <option value="nombre">Nombre</option>
                                            <option value="descripcion">Descripción</option>
                                            <option value="categoria">Categoría</option>
                                            <option value="marca">Marca</option>
                                            <option value="dosificacion">Dosificación</option>
                                            <option value="indicaciones_contraidicaciones">Indicaciones/Contraindicaciones</option>
                                            <option value="vencimiento">Fecha Vencimiento</option>
                                            <option value="registro">Registro Sanitario</option>
                                            <option value="estado_registro">Estado del Registro</option>
                                            <option value="estado_producto">Estado del Producto</option>
                                        </Form.Control>
                                    </Form>
                                </div>

                                {/* Tabla de productos */}
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
                                            <th>Indicaciones_Contraidicaciones</th>
                                            <th>Marca</th>
                                            <th>Estado_Registro</th>
                                            <th>Estado_Producto</th>
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
                                                <td>{producto.indicacioes_contraindicaciones}</td>
                                                <td>{producto.marca}</td>
                                                <td>{producto.estado_registro}</td>
                                                <td>{producto.estado_producto}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
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

export default Consulta;
