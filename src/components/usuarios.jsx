// src/components/usuarios.jsx
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Container, Navbar, Button, Card, Table, Row, Col, Form, Modal, InputGroup, Spinner
} from 'react-bootstrap';
import axios from 'axios';
import '../assets/usuarios.css';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.jpeg';

const API_BASE = `${window.location.origin}/backend/api`;

const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

const Usuarios = () => {
  const navigate = useNavigate();

  // Datos
  const [usuarios, setUsuarios] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // UI global
  const [loading, setLoading] = useState(false);

  // Modales CRUD / ayuda
  const [showModal, setShowModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Modales bonitos de confirmación y error
  const [successModal, setSuccessModal] = useState({ show: false, title: '', message: '' });
  const [errorModal, setErrorModal] = useState({ show: false, title: '', message: '' });
  const openSuccess = (title, message) => setSuccessModal({ show: true, title, message });
  const closeSuccess = () => setSuccessModal({ show: false, title: '', message: '' });
  const openError = (title, message) => setErrorModal({ show: true, title, message });
  const closeError = () => setErrorModal({ show: false, title: '', message: '' });

  // Eliminación
  const [userToDelete, setUserToDelete] = useState(null);

  // Form usuario
  const [currentUser, setCurrentUser] = useState({
    id: '',
    name: '',
    email: '',
    password: '',
    rol: ''
  });

  // =========================
  // Navegación
  // =========================
  const handleBack = () => {
    navigate('/admin');
  };

  // =========================
  // Cargar usuarios (con token)
  // =========================
  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await axios.get(`${API_BASE}/usuarios`, { headers: getAuthHeaders() });
      // Soporta paginado de Laravel (data.data) o array simple
      const data = Array.isArray(resp?.data?.data)
        ? resp.data.data
        : (Array.isArray(resp?.data) ? resp.data : []);
      setUsuarios(data);
    } catch (err) {
      if (err?.response?.status === 401) {
        localStorage.removeItem('authToken');
        openError('Sesión expirada', 'Tu sesión ha expirado. Inicia sesión nuevamente.');
        navigate('/'); // ajusta si tu ruta de login es otra
        return;
      }
      const msg = err?.response?.data?.message || 'No se pudieron cargar los usuarios.';
      openError('Error al cargar', msg);
      // eslint-disable-next-line no-console
      console.error('Error al obtener usuarios:', err?.response?.data || err);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  // =========================
  // Búsqueda
  // =========================
  const handleSearch = (e) => setSearchTerm(e.target.value);

  const filteredUsers = useMemo(() => {
    const term = (searchTerm || '').toLowerCase();
    if (!term) return usuarios;
    return usuarios.filter((user) => {
      const idStr = String(user?.id ?? '');
      const nameStr = String(user?.name ?? '').toLowerCase();
      const emailStr = String(user?.email ?? '').toLowerCase();
      return idStr.includes(term) || nameStr.includes(term) || emailStr.includes(term);
    });
  }, [usuarios, searchTerm]);

  // =========================
  // Editar / Crear
  // =========================
  const handleEdit = (user) => {
    setCurrentUser({
      id: user.id,
      name: user.name || '',
      email: user.email || '',
      password: '', // vacío por seguridad en edición
      rol: user.rol || ''
    });
    setShowPassword(false);
    setShowModal(true);
  };

  const generarPassword = () => {
    const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let pass = '';
    for (let i = 0; i < 3; i++) {
      pass += letras.charAt(Math.floor(Math.random() * letras.length));
    }
    const nums = [];
    while (nums.length < 3) {
      const n = Math.floor(Math.random() * 10);
      if (nums.length === 0 || (Math.abs(nums[nums.length - 1] - n) > 1 && !nums.includes(n))) {
        nums.push(n);
      }
    }
    pass += nums.join('');
    return pass;
  };

  const handleCreateUser = () => {
    setCurrentUser({
      id: '',
      name: '',
      email: '',
      password: generarPassword(),
      rol: ''
    });
    setShowPassword(false);
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentUser((prev) => ({ ...prev, [name]: value }));
  };

  // =========================
  // Guardar (crear/actualizar) con token
  // =========================
  const handleSave = async () => {
    // Validación mínima en front
    if (!currentUser.name?.trim()) {
      openError('Validación', 'El campo "Nombre" es obligatorio.');
      return;
    }
    if (!currentUser.email?.trim()) {
      openError('Validación', 'El campo "Correo" es obligatorio.');
      return;
    }
    if (!currentUser.id && !currentUser.password?.trim()) {
      openError('Validación', 'La contraseña es obligatoria al crear un usuario.');
      return;
    }

    setLoading(true);
    try {
      const headers = { ...getAuthHeaders(), 'Content-Type': 'application/json' };

      if (currentUser.id) {
        // Actualizar
        const payload = {
          name: currentUser.name.trim(),
          email: currentUser.email.trim(),
          rol: currentUser.rol
        };
        if (currentUser.password?.trim()) payload.password = currentUser.password.trim();

        await axios.put(`${API_BASE}/usuarios/${currentUser.id}`, payload, { headers });

        setUsuarios((prev) =>
          prev.map((u) => (u.id === currentUser.id ? { ...u, ...payload } : u))
        );
        setShowModal(false);
        openSuccess('Usuario actualizado', `El usuario "${currentUser.name}" se actualizó correctamente.`);
      } else {
        // Crear
        const payload = {
          name: currentUser.name.trim(),
          email: currentUser.email.trim(),
          password: currentUser.password.trim(),
          rol: currentUser.rol
        };

        const resp = await axios.post(`${API_BASE}/usuarios`, payload, { headers });

        // Asegurar objeto "nuevo"
        const nuevo = resp?.data
          ? (Array.isArray(resp.data) ? resp.data[0] : resp.data)
          : { ...payload };

        if (!nuevo.id) {
          // Si el backend no devuelve id, inferimos uno temporal para render
          const maxId = Math.max(0, ...usuarios.map((u) => Number(u.id) || 0));
          nuevo.id = maxId + 1;
        }
        setUsuarios((prev) => [...prev, nuevo]);
        setShowModal(false);
        openSuccess('Usuario creado', `El usuario "${payload.name}" fue creado correctamente.`);
      }
    } catch (err) {
      if (err?.response?.status === 401) {
        localStorage.removeItem('authToken');
        openError('Sesión expirada', 'Tu sesión ha expirado. Inicia sesión nuevamente.');
        navigate('/');
        return;
      }
      // Manejo fino de validaciones backend (422) u otros códigos
      let msg = 'No se pudo guardar el usuario.';
      if (err?.response?.status === 422) {
        const errors = err.response.data?.errors;
        if (errors) {
          msg = Object.values(errors).flat().join('\n');
        } else {
          msg = err.response.data?.message || msg;
        }
      } else {
        msg = err?.response?.data?.message || err?.message || msg;
      }
      openError('Error al guardar', msg);
      // eslint-disable-next-line no-console
      console.error('Error al guardar usuario:', err?.response?.data || err);
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // Eliminar (con token)
  // =========================
  const confirmDelete = (user) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    setLoading(true);
    try {
      await axios.delete(`${API_BASE}/usuarios/${userToDelete.id}`, {
        headers: getAuthHeaders(),
      });
      setUsuarios((prev) => prev.filter((u) => u.id !== userToDelete.id));
      setShowDeleteModal(false);
      openSuccess('Usuario eliminado', `El usuario "${userToDelete.name}" fue eliminado correctamente.`);
      setUserToDelete(null);
    } catch (err) {
      if (err?.response?.status === 401) {
        localStorage.removeItem('authToken');
        openError('Sesión expirada', 'Tu sesión ha expirado. Inicia sesión nuevamente.');
        navigate('/');
        return;
      }
      const msg = err?.response?.data?.message || 'No se pudo eliminar el usuario.';
      openError('Error al eliminar', msg);
      // eslint-disable-next-line no-console
      console.error('Error al eliminar usuario:', err?.response?.data || err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="usuarios-layout">
      {/* HEADER */}
      <Navbar className="usuarios-header">
        <Container fluid className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <img src={logo} alt="Logo" width="40" height="40" className="me-2" />
            <span
              className="usuarios-title"
              role="link"
              style={{ cursor: 'pointer' }}
              title="Ir al panel de administración"
              onClick={handleBack}
            >
              BIBLIOTECALFH
            </span>
          </div>
          <Button onClick={handleBack} className="logout-button">
            <i className="bi bi-arrow-left-circle me-1"></i> Volver
          </Button>
        </Container>
      </Navbar>

      {/* CONTENIDO */}
      <Container fluid className="usuarios-content mt-4 px-3 px-md-5">
        <Card className="usuarios-card">
          <h2 className="usuarios-title-main mb-4 text-center text-md-start">Gestión de Usuarios</h2>
          <Card.Body>
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-4 gap-2">
              <div className="d-flex gap-2 w-100 w-md-auto">
                <Button variant="success" onClick={handleCreateUser} disabled={loading}>
                  <i className="bi bi-plus-circle me-1"></i> Nuevo Usuario
                </Button>
                <Button variant="info" onClick={() => setShowInstructions(true)} disabled={loading}>
                  <i className="bi bi-question-circle me-1"></i> Instrucciones
                </Button>
              </div>
              <Form.Group className="mb-0 w-100 w-md-50">
                <Form.Control
                  type="text"
                  placeholder="Buscar por ID, nombre o correo..."
                  onChange={handleSearch}
                  disabled={loading}
                  value={searchTerm}
                />
              </Form.Group>
            </div>

            {loading && (
              <div className="text-center mb-3">
                <Spinner animation="border" size="sm" className="me-2" />
                Cargando...
              </div>
            )}

            {/* Tabla Desktop */}
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
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleEdit(usuario)}
                          disabled={loading}
                        >
                          <i className="bi bi-pencil"></i> Editar
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => confirmDelete(usuario)}
                          disabled={loading}
                        >
                          <i className="bi bi-trash"></i> Eliminar
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && !loading && (
                    <tr>
                      <td colSpan={5} className="text-center text-muted">
                        Sin resultados
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>

            {/* Cards Mobile */}
            <div className="d-md-none">
              <Row>
                {filteredUsers.map((usuario) => (
                  <Col xs={12} key={usuario.id} className="mb-3">
                    <Card className="shadow-sm">
                      <Card.Body>
                        <h5 className="fw-bold">{usuario.name}</h5>
                        <p className="mb-1">
                          <strong>ID:</strong> {usuario.id}
                        </p>
                        <p className="mb-1">
                          <strong>Correo:</strong> {usuario.email}
                        </p>
                        <p className="mb-3">
                          <strong>Rol:</strong> {usuario.rol || 'Sin rol'}
                        </p>
                        <div className="d-flex flex-wrap gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleEdit(usuario)}
                            disabled={loading}
                          >
                            <i className="bi bi-pencil"></i> Editar
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => confirmDelete(usuario)}
                            disabled={loading}
                          >
                            <i className="bi bi-trash"></i> Eliminar
                          </Button>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
                {filteredUsers.length === 0 && !loading && (
                  <Col xs={12} className="text-center text-muted">
                    Sin resultados
                  </Col>
                )}
              </Row>
            </div>
          </Card.Body>
        </Card>
      </Container>

      {/* Modal Crear/Editar Usuario */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{currentUser.id ? 'Editar Usuario' : 'Nuevo Usuario'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            {currentUser.id ? (
              <Form.Group className="mb-3">
                <Form.Label>ID</Form.Label>
                <Form.Control type="text" value={currentUser.id} disabled />
              </Form.Group>
            ) : null}

            <Form.Group className="mb-3">
              <Form.Label>Nombre</Form.Label>
              <Form.Control
                type="text"
                name="name"
                value={currentUser.name}
                onChange={handleInputChange}
                autoComplete="off"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Correo</Form.Label>
              <Form.Control
                type="email"
                name="email"
                value={currentUser.email}
                onChange={handleInputChange}
                autoComplete="off"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>
                Contraseña {currentUser.id ? '(dejar en blanco para no cambiar)' : ''}
              </Form.Label>
              <InputGroup>
                <Form.Control
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={currentUser.password}
                  onChange={handleInputChange}
                  autoComplete="new-password"
                />
                <Button
                  variant="outline-secondary"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`} />
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
        <Modal.Footer className="d-flex gap-2">
          <Button variant="secondary" onClick={() => setShowModal(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={loading}>
            {loading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" /> Guardando...
              </>
            ) : (
              'Guardar Cambios'
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal Instrucciones */}
      <Modal show={showInstructions} onHide={() => setShowInstructions(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Instrucciones</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>👉 Aquí puedes gestionar los usuarios del sistema:</p>
          <ul>
            <li>
              <b>Nuevo Usuario:</b> Se sugiere una contraseña aleatoria (3 letras y 3 números). Puedes
              cambiarla antes de guardar.
            </li>
            <li>
              <b>Editar:</b> Modifica los datos de un usuario. Si dejas la contraseña vacía, no se
              cambiará.
            </li>
            <li>
              <b>Eliminar:</b> Quita un usuario de la base de datos. Esta acción no se puede deshacer.
            </li>
            <li>
              <b>Búsqueda:</b> Usa la barra para encontrar usuarios por ID, nombre o correo.
            </li>
          </ul>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowInstructions(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal Confirmación Eliminar */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirmar Eliminación</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {userToDelete ? (
            <p>
              ¿Estás seguro de que deseas eliminar al usuario <b>{userToDelete.name}</b> con correo{' '}
              <b>{userToDelete.email}</b>?
            </p>
          ) : (
            <p>No hay usuario seleccionado.</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={loading || !userToDelete}>
            {loading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" /> Eliminando...
              </>
            ) : (
              'Eliminar'
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal Éxito */}
      <Modal show={successModal.show} onHide={closeSuccess} centered>
        <Modal.Header closeButton style={{ backgroundColor: '#198754', color: '#fff' }}>
          <Modal.Title>{successModal.title || 'Operación exitosa'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div style={{ whiteSpace: 'pre-line' }}>
            {successModal.message || 'Acción realizada correctamente.'}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={closeSuccess}>
            Entendido
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal Error */}
      <Modal show={errorModal.show} onHide={closeError} centered>
        <Modal.Header closeButton style={{ backgroundColor: '#dc3545', color: '#fff' }}>
          <Modal.Title>{errorModal.title || 'Ha ocurrido un error'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div style={{ whiteSpace: 'pre-line' }}>
            {errorModal.message || 'Intenta nuevamente.'}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={closeError}>
            Entendido
          </Button>
        </Modal.Footer>
      </Modal>

      {/* FOOTER */}
      <footer className="usuarios-footer">
        <Container fluid>
          <Row className="py-3">
            <Col md={12} className="text-center">
              <p className="mb-0">© 2025 La Farmacia Homeopática - Más alternativas, más servicio.</p>
            </Col>
          </Row>
        </Container>
      </footer>
    </div>
  );
};

export default Usuarios;
