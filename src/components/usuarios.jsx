import React, { useEffect, useState } from 'react';
import { Container, Navbar, Button, Card, Table, Row, Col, Form, Modal } from 'react-bootstrap';
import axios from 'axios';
import '../assets/usuarios.css';
import { useNavigate } from 'react-router-dom';

const Usuarios = () => {
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [currentUser, setCurrentUser] = useState({
    id: '',
    name: '',
    email: '',
    rol: ''
  });

  useEffect(() => {
    axios.get('http://localhost:8000/api/usuarios')  // Tu API de Laravel
      .then(response => setUsuarios(response.data))
      .catch(error => console.error('Error al obtener usuarios:', error));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
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
    setCurrentUser(user);
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
    axios.put(`http://localhost:8000/api/usuarios/${currentUser.id}`, currentUser)
      .then(() => {
        setUsuarios(usuarios.map(user =>
          user.id === currentUser.id ? currentUser : user
        ));
        setShowModal(false);
      })
      .catch(error => console.error('Error al actualizar usuario:', error));
  };

  const handleCreateUser = () => {
    navigate('/crear-usuario');
  };

  return (
    <div className="usuarios-layout">
      {/* Header */}
      <Navbar expand="lg" className="usuarios-header">
        <Container fluid>
          <Navbar.Brand href="#" className="d-flex align-items-center">
            <i className="bi bi-shield-lock me-2"></i>
            Panel De Usuarios - Farmacia Homeopática
          </Navbar.Brand>
          <div className="d-flex">
            <Button onClick={handleLogout} className="logout-button">
              <i className="bi bi-box-arrow-right me-1"></i> volver
            </Button>
          </div>
        </Container>
      </Navbar>

      {/* Contenido principal */}
      <Container fluid className="usuarios-content mt-4">
        <Card className="usuarios-card">
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <Button variant="success" onClick={handleCreateUser}>
                <i className="bi bi-plus-circle me-1"></i> Nuevo Usuario
              </Button>
              <Form.Group className="mb-0" style={{ width: '300px' }}>
                <Form.Control
                  type="text"
                  placeholder="Buscar por ID, nombre o correo..."
                  onChange={handleSearch}
                />
              </Form.Group>
            </div>

            <Table striped bordered hover responsive>
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
                    <td>
                      <Button
                        variant="primary"
                        size="sm"
                        className="me-2"
                        onClick={() => handleEdit(usuario)}
                      >
                        <i className="bi bi-pencil"></i> Editar
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(usuario.id)}
                      >
                        <i className="bi bi-trash"></i> Eliminar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      </Container>

      {/* Modal para edición */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Editar Usuario</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>ID</Form.Label>
              <Form.Control
                type="text"
                name="id"
                value={currentUser.id}
                disabled
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Nombre</Form.Label>
              <Form.Control
                type="text"
                name="name"
                value={currentUser.name}
                onChange={handleInputChange}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Correo</Form.Label>
              <Form.Control
                type="email"
                name="email"
                value={currentUser.email}
                onChange={handleInputChange}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Rol</Form.Label>
              <Form.Select
                name="rol"
                value={currentUser.rol}
                onChange={handleInputChange}
              >
                <option value="Administrador">Administrador</option>
                <option value="Farmacéutico">Farmacéutico</option>
                <option value="Vendedor">Vendedor</option>
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

      {/* Footer */}
      <footer className="usuarios-footer">
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

export default Usuarios;
