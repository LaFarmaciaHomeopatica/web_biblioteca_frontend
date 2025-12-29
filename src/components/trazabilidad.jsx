// src/components/Trazabilidad.jsx
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Container, Navbar, Button, Card, Table, Row, Col, Form, Spinner, Modal,
} from 'react-bootstrap';
import axios from 'axios';
import '../assets/usuarios.css'; // reutilizamos estilos de usuarios
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.jpeg';

const API_BASE = `${window.location.origin}/backend/api`;

const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

const Trazabilidad = () => {
  const navigate = useNavigate();

  // ======= Estado =======
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modales de error
  const [errorModal, setErrorModal] = useState({ show: false, title: '', message: '' });
  const openError = (title, message) => setErrorModal({ show: true, title, message });
  const closeError = () => setErrorModal({ show: false, title: '', message: '' });

  // =========================
  // Navegación
  // =========================
  const handleBack = () => navigate('/admin');

  // =========================
  // Cargar registros
  // =========================
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      // ✅ Endpoint correcto: /trazabilidad (no /logs)
      const resp = await axios.get(`${API_BASE}/trazabilidad`, { headers: getAuthHeaders() });
      const data = Array.isArray(resp?.data?.data)
        ? resp.data.data
        : (Array.isArray(resp?.data) ? resp.data : []);
      setLogs(data);
    } catch (err) {
      if (err?.response?.status === 401) {
        localStorage.removeItem('authToken');
        openError('Sesión expirada', 'Tu sesión ha expirado. Inicia sesión nuevamente.');
        navigate('/');
        return;
      }
      const msg = err?.response?.data?.message || 'No se pudieron cargar los registros.';
      openError('Error al cargar', msg);
      // eslint-disable-next-line no-console
      console.error('Error al obtener logs:', err?.response?.data || err);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // =========================
  // Búsqueda
  // =========================
  const handleSearch = (e) => setSearchTerm(e.target.value);

  const filteredLogs = useMemo(() => {
    const term = (searchTerm || '').toLowerCase();
    if (!term) return logs;
    return logs.filter((log) => {
      const userStr = String(log?.nombre_usuario ?? '').toLowerCase();
      const accionStr = String(log?.accion ?? '').toLowerCase();
      const fechaStr = String(log?.fecha_hora ?? log?.created_at ?? '').toLowerCase();
      return userStr.includes(term) || accionStr.includes(term) || fechaStr.includes(term);
    });
  }, [logs, searchTerm]);

  // Helper de fecha
  const formatDate = (value) => {
    if (!value) return '—';
    try {
      return new Date(value).toLocaleString('es-CO', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      });
    } catch {
      return String(value);
    }
  };

  // =========================
  // Exportar a Excel (.xls)
  // =========================
  const handleExportExcel = () => {
    // Escapar HTML básico
    const esc = (s) => String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Construimos tabla HTML (Excel abre .xls con este formato)
    const header = `
      <tr>
        <th>#</th>
        <th>Usuario</th>
        <th>Email</th>
        <th>Acción</th>
        <th>Fecha y hora</th>
        <th>IP</th>
      </tr>
    `;

    const rows = filteredLogs.map((log, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${esc(log.nombre_usuario ?? '')}</td>
        <td>${esc(log.user_email ?? '')}</td>
        <td>${esc(log.accion ?? '')}</td>
        <td>${esc(formatDate(log.fecha_hora ?? log.created_at))}</td>
        <td>${esc(log.ip ?? '')}</td>
      </tr>
    `).join('');

    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:x="urn:schemas-microsoft-com:office:excel"
            xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>Trazabilidad</x:Name>
                  <x:WorksheetOptions><x:Print><x:ValidPrinterInfo/></x:Print></x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
          <meta charset="UTF-8" />
        </head>
        <body>
          <table border="1">
            <thead>${header}</thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const today = new Date().toISOString().slice(0,10);
    a.href = url;
    a.download = `trazabilidad_${today}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
              title="Volver al panel de administración"
              onClick={handleBack}
            >
              BIBLIOTECALFH
            </span>
          </div>
          <div className="d-flex gap-2">
            <Button
              variant="success"
              onClick={handleExportExcel}
              disabled={loading || filteredLogs.length === 0}
              title="Exportar los registros visibles a Excel"
            >
              <i className="bi bi-file-earmark-excel me-1"></i> Exportar Excel
            </Button>
            <Button onClick={handleBack} className="logout-button">
              <i className="bi bi-arrow-left-circle me-1"></i> Volver
            </Button>
          </div>
        </Container>
      </Navbar>

      {/* CONTENIDO */}
      <Container fluid className="usuarios-content mt-4 px-3 px-md-5">
        <Card className="usuarios-card">
          <h2 className="usuarios-title-main mb-4 text-center text-md-start">
            Historial de Trazabilidad
          </h2>
          <Card.Body>
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-4 gap-2">
              <Form.Group className="mb-0 w-100 w-md-50">
                <Form.Control
                  type="text"
                  placeholder="Buscar por usuario, acción o fecha..."
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
                    <th>#</th>
                    <th>Usuario</th>
                    <th>Acción</th>
                    <th>Fecha y hora</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log, index) => (
                    <tr key={log.id ?? `${log.nombre_usuario}-${index}`}>
                      <td>{index + 1}</td>
                      <td>{log.nombre_usuario ?? '—'}</td>
                      <td>{log.accion ?? '—'}</td>
                      <td>{formatDate(log.fecha_hora ?? log.created_at)}</td>
                    </tr>
                  ))}
                  {filteredLogs.length === 0 && !loading && (
                    <tr>
                      <td colSpan={4} className="text-center text-muted">
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
                {filteredLogs.map((log, index) => (
                  <Col xs={12} key={log.id ?? `${log.nombre_usuario}-${index}`} className="mb-3">
                    <Card className="shadow-sm">
                      <Card.Body>
                        <h5 className="fw-bold">{log.nombre_usuario ?? '—'}</h5>
                        <p className="mb-1">
                          <strong>Acción:</strong> {log.accion ?? '—'}
                        </p>
                        <p className="mb-0">
                          <strong>Fecha:</strong> {formatDate(log.fecha_hora ?? log.created_at)}
                        </p>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
                {filteredLogs.length === 0 && !loading && (
                  <Col xs={12} className="text-center text-muted">
                    Sin resultados
                  </Col>
                )}
              </Row>
            </div>
          </Card.Body>
        </Card>
      </Container>

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

export default Trazabilidad;
