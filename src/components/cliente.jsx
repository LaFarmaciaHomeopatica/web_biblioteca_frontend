import React, { useState } from 'react';
import { Container, Navbar, Form, FormControl, Button, Row, Col, Card, Table } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../assets/cliente.css';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.jpeg';


const Cliente = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterBy, setFilterBy] = useState('codigo');

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        navigate('/');
    };

    // Datos de ejemplo (reemplaza con tus datos reales)
    const productos = [
        { codigo: '001', nombre: 'Producto 1', descripcion: 'Descripción 1', categoria: 'Categoría A', dosificacion: '10mg', vencimiento: '2023-12-31', registro: 'RS-001' },
        { codigo: '002', nombre: 'Producto 2', descripcion: 'Descripción 2', categoria: 'Categoría B', dosificacion: '20mg', vencimiento: '2024-06-30', registro: 'RS-002' },
    ];

    const filteredProducts = productos.filter(producto =>
        producto[filterBy].toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="cliente-layout">
            {/* Header */}
            <Navbar expand="lg" className="admin-header">
                <Container fluid>
                    <Navbar.Brand className="d-flex align-items-center">
                        <img
                            src={logo}
                            alt="Logo de la empresa"
                            width="40"
                            height="40"
                            className="d-inline-block align-top me-2"
                        />
                        <span className="admin-title">Panel Consulta - Farmacia Homeopática</span>
                    </Navbar.Brand>
                    <Button onClick={handleLogout} className="logout-button">
                        <i className="bi bi-box-arrow-right me-1"></i> Salir
                    </Button>
                </Container>
            </Navbar>

            {/* Contenido Principal */}
            <Container fluid className="cliente-content">
                <Row className="mt-4">
                    <Col>
                        <Card className="cliente-card">
                            <Card.Body>
                                <h4 className="mb-4">Consulta de Productos</h4>

                                {/* Barra de búsqueda y filtros */}
                                <div className="search-container mb-4">
                                    <Form inline className="d-flex">
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
                                            <option value="dosificacion">Dosificación</option>
                                            <option value="vencimiento">Fecha Vencimiento</option>
                                            <option value="registro">Registro Sanitario</option>
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
            <footer className="cliente-footer">
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

export default Cliente;
