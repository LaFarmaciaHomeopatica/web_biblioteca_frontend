import React, { useEffect, useState } from 'react';
import { Container, Navbar, Button, Card, Table, Row, Col, Form, Modal, InputGroup } from 'react-bootstrap';
import axios from 'axios';
import '../assets/usuarios.css';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.jpeg';

const Usuarios = () => {
    const navigate = useNavigate();
    const [usuarios, setUsuarios] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [currentUser, setCurrentUser] = useState({
        id: '',
        name: '',
        email: '',
        password: '',
        rol: ''
    });

    useEffect(() => {
        axios.get('http://localhost:8000/api/usuarios')
            .then(response => setUsuarios(response.data))
            .catch(error => console.error('Error al obtener usuarios:', error));
    }, []);

    const handleBack = () => {
        navigate('/admin');
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
    };

    const filteredUsers = usuarios.filter(user =>
        user.id.toString().includes(searchTerm) ||
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleEdit = (user) => {
        setCurrentUser({
            id: user.id,
            name: user.name,
            email: user.email,
            password: '',
            rol: user.rol
        });
        setShowPassword(false);
        setShowModal(true);
    };

    const handleDelete = (id) => {
        if (window.confirm('¿Está seguro de eliminar este usuario?')) {
            axios.delete(`http://localhost:8000/api/usuarios/${id}`)
                .then(() => {
                    setUsuarios(usuarios.filter(user => user.id !== id));
                })
                .catch(error => console.error('Error al eliminar usuario:', error));
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setCurrentUser({
            ...currentUser,
            [name]: value
        });
    };

    const handleSave = () => {
        if (currentUser.id) {
            axios.put(`http://localhost:8000/api/usuarios/${currentUser.id}`, currentUser)
                .then(() => {
                    setUsuarios(usuarios.map(user =>
                        user.id === currentUser.id ? { ...user, ...currentUser } : user
                    ));
                    setShowModal(false);
                })
                .catch(error => console.error('Error al actualizar usuario:', error));
        } else {
            axios.post('http://localhost:8000/api/usuarios', currentUser)
                .then(response => {
                    setUsuarios([...usuarios, response.data]);
                    setShowModal(false);
                })
                .catch(error => console.error('Error al crear usuario:', error));
        }
    };

    const handleCreateUser = () => {
        setCurrentUser({
            id: '',
            name: '',
            email: '',
            password: '',
            rol: ''
        });
        setShowPassword(false);
        setShowModal(true);
    };

    return (
        <div className="usuarios-layout">
            <Navbar className="usuarios-header">
                <Container fluid className="d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center">
                        <img src={logo} alt="Logo" width="40" height="40" className="me-2" />
                        <span className="usuarios-title">BIBLIOTECALFH</span>
                    </div>
                    <Button onClick={handleBack} className="logout-button">
                        <i className="bi bi-arrow-left-circle me-1"></i> Volver
                    </Button>
                </Container>
            </Navbar>

            <Container fluid className="usuarios-content mt-4 px-3 px-md-5">
                <Card className="usuarios-card">
                    <h2 className="usuarios-title-main mb-4 text-center text-md-start">
                        Gestión de Usuarios
                    </h2>
                    <Card.Body>
                        <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-4 gap-2">
                            <Button variant="success" onClick={handleCreateUser} className="w-100 w-md-auto">
                                <i className="bi bi-plus-circle me-1"></i> Nuevo Usuario
                            </Button>
                            <Form.Group className="mb-0 w-100 w-md-50">
                                <Form.Control
                                    type="text"
                                    placeholder="Buscar por ID, nombre o correo..."
                                    onChange={handleSearch}
                                />
                            </Form.Group>
                        </div>

                        <div className="table-responsive d-none d-md-block">
                            <Table striped bordered hover>
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Nombre</th>
                                        <th>Correo</th>
                                        <th>Rol</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.map((usuario) => (
                                        <tr key={usuario.id}>
                                            <td>{usuario.id}</td>
                                            <td>{usuario.name}</td>
                                            <td>{usuario.email}</td>
                                            <td>{usuario.rol || 'Sin rol'}</td>
                                            <td className="d-flex flex-wrap gap-2">
                                                <Button variant="primary" size="sm" onClick={() => handleEdit(usuario)}>
                                                    <i className="bi bi-pencil"></i> Editar
                                                </Button>
                                                <Button variant="danger" size="sm" onClick={() => handleDelete(usuario.id)}>
                                                    <i className="bi bi-trash"></i> Eliminar
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>

                        <div className="d-md-none">
                            <Row>
                                {filteredUsers.map((usuario) => (
                                    <Col xs={12} key={usuario.id} className="mb-3">
                                        <Card className="shadow-sm">
                                            <Card.Body>
                                                <h5 className="fw-bold">{usuario.name}</h5>
                                                <p className="mb-1"><strong>ID:</strong> {usuario.id}</p>
                                                <p className="mb-1"><strong>Correo:</strong> {usuario.email}</p>
                                                <p className="mb-3"><strong>Rol:</strong> {usuario.rol || 'Sin rol'}</p>
                                                <div className="d-flex flex-wrap gap-2">
                                                    <Button variant="primary" size="sm" onClick={() => handleEdit(usuario)}>
                                                        <i className="bi bi-pencil"></i> Editar
                                                    </Button>
                                                    <Button variant="danger" size="sm" onClick={() => handleDelete(usuario.id)}>
                                                        <i className="bi bi-trash"></i> Eliminar
                                                    </Button>
                                                </div>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                ))}
                            </Row>
                        </div>
                    </Card.Body>
                </Card>
            </Container>

            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>{currentUser.id ? 'Editar Usuario' : 'Nuevo Usuario'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        {currentUser.id && (
                            <Form.Group className="mb-3">
                                <Form.Label>ID</Form.Label>
                                <Form.Control type="text" value={currentUser.id} disabled />
                            </Form.Group>
                        )}
                        <Form.Group className="mb-3">
                            <Form.Label>Nombre</Form.Label>
                            <Form.Control type="text" name="name" value={currentUser.name} onChange={handleInputChange} />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Correo</Form.Label>
                            <Form.Control type="email" name="email" value={currentUser.email} onChange={handleInputChange} />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Contraseña</Form.Label>
                            <InputGroup>
                                <Form.Control
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    value={currentUser.password}
                                    onChange={handleInputChange}
                                />
                                <Button variant="outline-secondary" onClick={() => setShowPassword(!showPassword)}>
                                    <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                                </Button>
                            </InputGroup>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Rol</Form.Label>
                            <Form.Select name="rol" value={currentUser.rol} onChange={handleInputChange}>
                                <option value="">Seleccionar rol</option>
                                <option value="Administrador">Administrador</option>
                                <option value="Farmacéutico">Farmacéutico</option>
                                <option value="Vendedor">Visitador Médico</option>
                            </Form.Select>
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>
                        Cancelar
                    </Button>
                    <Button variant="primary" onClick={handleSave}>
                        Guardar Cambios
                    </Button>
                </Modal.Footer>
            </Modal>

            <footer className="usuarios-footer">
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

export default Usuarios;
