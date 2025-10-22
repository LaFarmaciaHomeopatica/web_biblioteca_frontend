// src/components/vencimientoadmin.jsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Container, Navbar, Button, Card, Tabs, Tab, Form, Spinner, Modal, Row, Col
} from 'react-bootstrap';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.jpeg';
import '../assets/consulta.css';

const API_BASE = `${window.location.origin}/backend/api`; // ✅ apunta a /backend/api
const PAGE_SIZE = 20;

/**
 * ✅ Fix zona horaria (CO):
 * - Si viene 'YYYY-MM-DD' o 'YYYY-MM-DD HH:mm:ss', parseamos manual (local),
 *   para evitar el -1 día por interpretarse como UTC.
 * - Formateamos con timeZone explícita 'America/Bogota'.
 */
const formatDate = (d) => {
  if (!d) return '-';
  try {
    if (typeof d === 'string') {
      const ymd = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (ymd) {
        const [, y, m, day] = ymd;
        const dt = new Date(Number(y), Number(m) - 1, Number(day));
        return new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota' }).format(dt);
      }
      const ymdHms = d.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
      if (ymdHms) {
        const [, y, m, day, hh, mm, ss = '0'] = ymdHms;
        const dt = new Date(Number(y), Number(m) - 1, Number(day), Number(hh), Number(mm), Number(ss));
        return new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota' }).format(dt);
      }
    }
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return String(d);
    return new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota' }).format(dt);
  } catch {
    return String(d);
  }
};

const currencyCO = (v) => {
  if (v === null || v === undefined || v === '') return '-';
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
};

/**
 * ✅ IVA como 0.19% (consistente con la vista cliente)
 * - Si llega 0.19 → "0.19%"
 * - Si llega 19    → "0.19%" (normaliza dividiendo entre 100)
 */
const percentCO = (v) => {
  if (v === null || v === undefined || v === '') return '-';
  const nRaw = Number(String(v).replace(',', '.'));
  if (Number.isNaN(nRaw)) return String(v);
  const n = nRaw > 1 ? nRaw / 100 : nRaw; // 19 -> 0.19
  return `${n.toFixed(2)}%`;
};

function VencimientoAdmin() {
  const navigate = useNavigate();

  // ===== Estado =====
  const [diasProd, setDiasProd] = useState(30);
  const [searchTerm, setSearchTerm] = useState(''); // 🔎 búsqueda por nombre

  const [prodProx, setProdProx] = useState([]);
  const [prodVenc, setProdVenc] = useState([]);
  const [pageProdProx, setPageProdProx] = useState(1);
  const [pageProdVenc, setPageProdVenc] = useState(1);
  const [loading, setLoading] = useState(false);

  // Modales sistema (éxito / error)
  const [successModal, setSuccessModal] = useState({ show: false, title: '', message: '' });
  const openSuccess = (heading, msg) => setSuccessModal({ show: true, title: heading, message: msg });
  const closeSuccess = () => setSuccessModal({ show: false, title: '', message: '' });

  const [errorModal, setErrorModal] = useState({ show: false, title: '', message: '' });
  const openError = (heading, msg) => setErrorModal({ show: true, title: heading, message: msg });
  const closeError = () => setErrorModal({ show: false, title: '', message: '' });

  // Modal detalle (igual que en la vista cliente)
  const [detailShow, setDetailShow] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ===== API =====
  const fetchExpProductos = useCallback(async (status, dias) => {
    const token = localStorage.getItem('authToken');
    const headers = {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const params =
      status === 'proximos'
        ? { status: 'proximos', dias: Math.max(1, Number(dias || 30)) }
        : { status: 'vencidos' };

    const url = `${API_BASE}/productos-exp`;
    const { data } = await axios.get(url, { headers, params });

    // /productos-exp devuelve un array simple
    return Array.isArray(data) ? data : (data?.data ?? []);
  }, []);

  // Traer detalle por código desde /productos (paginado)
  const fetchDetallePorCodigo = useCallback(async (codigo) => {
    try {
      const token = localStorage.getItem('authToken');
      const headers = {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const url = `${API_BASE}/productos`;
      const params = { search: codigo, filter_by: 'codigo', per_page: 1, page: 1 };
      const { data } = await axios.get(url, { headers, params });
      if (data && Array.isArray(data.data) && data.data.length > 0) {
        return data.data[0];
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const cargarProductos = useCallback(async () => {
    setLoading(true);
    try {
      const [pp, pv] = await Promise.all([
        fetchExpProductos('proximos', diasProd),
        fetchExpProductos('vencidos', 0),
      ]);
      setProdProx(pp);
      setProdVenc(pv);
      setPageProdProx(1);
      setPageProdVenc(1);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Error al cargar vencimientos de productos';
      openError('Error de carga', msg);
      // eslint-disable-next-line no-console
      console.error('Vencimientos productos error:', err?.response?.data || err);
    } finally {
      setLoading(false);
    }
  }, [fetchExpProductos, diasProd]);

  useEffect(() => { cargarProductos(); }, [cargarProductos]);

  const recargarProductosProximos = async (dias) => {
    setLoading(true);
    try {
      const pp = await fetchExpProductos('proximos', dias);
      setProdProx(pp);
      setPageProdProx(1);
      openSuccess('Filtro aplicado', `Mostrando productos que vencen en ${dias} días.`);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Error al cargar productos próximos';
      openError('Error', msg);
      // eslint-disable-next-line no-console
      console.error('Prod proximos error:', err?.response?.data || err);
    } finally { setLoading(false); }
  };

  // ===== Filtro por búsqueda (nombre) =====
  const filteredProx = useMemo(() => {
    const t = searchTerm.trim().toLowerCase();
    if (!t) return prodProx;
    return prodProx.filter(p => String(p?.nombre || '').toLowerCase().includes(t));
  }, [prodProx, searchTerm]);

  const filteredVenc = useMemo(() => {
    const t = searchTerm.trim().toLowerCase();
    if (!t) return prodVenc;
    return prodVenc.filter(p => String(p?.nombre || '').toLowerCase().includes(t));
  }, [prodVenc, searchTerm]);

  // ===== Paginación local (aplicada a filtrados) =====
  const paginate = (arr, page) => {
    const total = arr.length;
    const last = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const p = Math.min(Math.max(1, page), last);
    const start = (p - 1) * PAGE_SIZE;
    return { slice: arr.slice(start, start + PAGE_SIZE), page: p, last };
  };

  const pagPP = useMemo(() => paginate(filteredProx, pageProdProx), [filteredProx, pageProdProx]);
  const pagPV = useMemo(() => paginate(filteredVenc, pageProdVenc), [filteredVenc, pageProdVenc]);

  // ===== Detalle =====
  const openDetail = async (item) => {
    setDetailShow(true);
    setDetailItem(item); // base desde vencimientos
    setDetailLoading(true);
    try {
      if (item?.codigo) {
        const full = await fetchDetallePorCodigo(item.codigo);
        if (full) {
          setDetailItem((prev) => ({
            ...prev,
            ...full,
            dias_restantes: prev?.dias_restantes ?? item?.dias_restantes,
            estado: prev?.estado ?? item?.estado,
          }));
        }
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailShow(false);
    setDetailItem(null);
    setDetailLoading(false);
  };

  return (
    <div className="consulta-layout">
      {/* Header minimal con Volver a Admin */}
      <Navbar expand="lg" className="consulta-header">
        <Container fluid>
          <Navbar.Brand className="d-flex align-items-center">
            <img src={logo} alt="Logo" width="40" height="40" className="me-2" />
            <span
              className="consulta-title"
              role="link"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate('/admin')}
              title="Volver al panel de administración"
            >
              BIBLIOTECALFH
            </span>
          </Navbar.Brand>

          <Button onClick={() => navigate('/admin')} className="logout-button" type="button">
            <i className="bi bi-arrow-left-circle me-1"></i> Volver
          </Button>
        </Container>
      </Navbar>

      <Container fluid className="consulta-content px-3 px-md-5">
        <Card className="consulta-card mt-4">
          <Card.Body>
            <h2 className="consulta-title-main mb-3 text-center text-md-start">
              Vencimiento
            </h2>

            {loading && (
              <div className="text-center mb-3">
                <Spinner animation="border" size="sm" className="me-2" />
                Cargando…
              </div>
            )}

            {/* Filtros */}
            <Row className="g-3 align-items-end mb-3">
              <Col xs={12} md="auto"><div className="fw-semibold">Próximos a vencer en:</div></Col>
              <Col xs={12} md="auto">
                <Form.Select
                  value={diasProd}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setDiasProd(val);
                    recargarProductosProximos(val);
                  }}
                  style={{ maxWidth: 160 }}
                >
                  {[7, 15, 30, 60, 90].map((d) => <option key={d} value={d}>{d} días</option>)}
                </Form.Select>
              </Col>
              <Col xs={12} md className="ms-md-auto">
                <Form.Control
                  placeholder="Buscar por nombre…"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPageProdProx(1);
                    setPageProdVenc(1);
                  }}
                />
              </Col>
            </Row>

            {/* Tabs: Próximos / Vencidos */}
            <Tabs defaultActiveKey="pp" className="mb-3">
              <Tab eventKey="pp" title={`Próximos (${filteredProx.length})`}>
                <div className="product-list">
                  {pagPP.slice.length ? pagPP.slice.map((p, idx) => (
                    <div className="product-card" key={`pp-${p.id ?? idx}`}>
                      <div className="product-info">
                        <p className="mb-1"><strong>{p.nombre}</strong></p>
                        <p className="mb-1"><strong>Vence:</strong> {formatDate(p.fecha_vencimiento)}</p>
                        <p className="mb-1"><strong>Laboratorio:</strong> {p.laboratorio || '-'}</p>
                        <p className="mb-1"><strong>Categoría:</strong> {p.categoria || '-'}</p>
                        <p className="mb-2">
                          <strong>Estado:</strong> {p.estado === 'vencidos' ? 'Vencido' : 'Próximo'}
                          {typeof p.dias_restantes === 'number' ? ` (${p.dias_restantes} días)` : ''}
                        </p>
                        <Button size="sm" type="button" onClick={() => openDetail(p)}>
                          Ver
                        </Button>
                      </div>
                    </div>
                  )) : <p className="text-muted">No hay productos próximos a vencer.</p>}
                </div>
                {pagPP.last > 1 && (
                  <div className="pagination-wrapper mt-3">
                    <button
                      className="pagination-btn"
                      type="button"
                      onClick={() => setPageProdProx(pageProdProx - 1)}
                      disabled={pageProdProx === 1}
                    >
                      <i className="bi bi-chevron-left"></i>
                    </button>
                    <span className="pagination-info">{pagPP.page} / {pagPP.last}</span>
                    <button
                      className="pagination-btn"
                      type="button"
                      onClick={() => setPageProdProx(pageProdProx + 1)}
                      disabled={pageProdProx === pagPP.last}
                    >
                      <i className="bi bi-chevron-right"></i>
                    </button>
                  </div>
                )}
              </Tab>

              <Tab eventKey="pv" title={`Vencidos (${filteredVenc.length})`}>
                <div className="product-list">
                  {pagPV.slice.length ? pagPV.slice.map((p, idx) => (
                    <div className="product-card inactive" key={`pv-${p.id ?? idx}`}>
                      <div className="product-info">
                        <p className="mb-1"><strong>{p.nombre}</strong></p>
                        <p className="mb-1"><strong>Venció:</strong> {formatDate(p.fecha_vencimiento)}</p>
                        <p className="mb-1"><strong>Laboratorio:</strong> {p.laboratorio || '-'}</p>
                        <p className="mb-1"><strong>Categoría:</strong> {p.categoria || '-'}</p>
                        <p className="mb-2">
                          <strong>Estado:</strong> {p.estado === 'vencidos' ? 'Vencido' : 'Próximo'}
                          {typeof p.dias_restantes === 'number' ? ` (${p.dias_restantes} días)` : ''}
                        </p>
                        <Button size="sm" variant="secondary" type="button" onClick={() => openDetail(p)}>
                          Ver
                        </Button>
                      </div>
                    </div>
                  )) : <p className="text-muted">No hay productos vencidos.</p>}
                </div>
                {pagPV.last > 1 && (
                  <div className="pagination-wrapper mt-3">
                    <button
                      className="pagination-btn"
                      type="button"
                      onClick={() => setPageProdVenc(pageProdVenc - 1)}
                      disabled={pageProdVenc === 1}
                    >
                      <i className="bi bi-chevron-left"></i>
                    </button>
                    <span className="pagination-info">{pagPV.page} / {pagPV.last}</span>
                    <button
                      className="pagination-btn"
                      type="button"
                      onClick={() => setPageProdVenc(pageProdVenc + 1)}
                      disabled={pageProdVenc === pagPV.last}
                    >
                      <i className="bi bi-chevron-right"></i>
                    </button>
                  </div>
                )}
              </Tab>
            </Tabs>
          </Card.Body>
        </Card>
      </Container>

      {/* Modal Detalle (igual que Consulta / Cliente) */}
      <Modal show={detailShow} onHide={closeDetail} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{detailItem?.nombre || 'Detalle del producto'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {detailLoading && (
            <div className="text-center mb-3">
              <Spinner animation="border" size="sm" className="me-2" />
              Cargando detalle…
            </div>
          )}

          {!detailLoading && (
            <Row className="g-3">
              <Col md={6}>
                <p className="mb-1"><strong>Código:</strong> {detailItem?.codigo || '-'}</p>
                <p className="mb-1"><strong>Laboratorio:</strong> {detailItem?.laboratorio || '-'}</p>
                <p className="mb-1"><strong>Categoría:</strong> {detailItem?.categoria || '-'}</p>
                <p className="mb-1"><strong>Fecha vencimiento:</strong> {formatDate(detailItem?.fecha_vencimiento)}</p>
                {typeof detailItem?.dias_restantes === 'number' && (
                  <p className="mb-1"><strong>Días restantes:</strong> {detailItem.dias_restantes}</p>
                )}
                {detailItem?.estado && (
                  <p className="mb-1"><strong>Estado vencimiento:</strong> {detailItem.estado === 'vencidos' ? 'Vencido' : 'Próximo'}</p>
                )}
              </Col>
              <Col md={6}>
                <p className="mb-1"><strong>Precio público con IVA:</strong> {currencyCO(detailItem?.precio_publico)}</p>
                <p className="mb-1"><strong>Precio médico con IVA:</strong> {currencyCO(detailItem?.precio_medico)}</p>
                <p className="mb-1"><strong>IVA:</strong> {percentCO(detailItem?.iva)}</p>
                <p className="mb-1"><strong>Fórmula médica:</strong> {detailItem?.formula_medica || '-'}</p>
                <p className="mb-1"><strong>Estado producto:</strong> {detailItem?.estado_producto || '-'}</p>
                <p className="mb-1"><strong>Estado registro:</strong> {detailItem?.estado_registro || '-'}</p>
                <p className="mb-1"><strong>Registro sanitario:</strong> {detailItem?.registro_sanitario || '-'}</p>
              </Col>
              {detailItem?.david && (
                <Col xs={12}>
                  <hr />
                  <p className="mb-0"><strong>DAVID:</strong></p>
                  <div className="text-muted" style={{ whiteSpace: 'pre-wrap' }}>
                    {detailItem.david}
                  </div>
                </Col>
              )}
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" type="button" onClick={closeDetail}>Cerrar</Button>
        </Modal.Footer>
      </Modal>

      {/* Modales sistema */}
      <Modal show={successModal.show} onHide={closeSuccess} centered>
        <Modal.Header closeButton style={{ backgroundColor: '#198754', color: '#fff' }}>
          <Modal.Title>{successModal.title || 'Operación exitosa'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div style={{ whiteSpace: 'pre-line' }}>{successModal.message || 'Acción realizada correctamente.'}</div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" type="button" onClick={closeSuccess}>Entendido</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={errorModal.show} onHide={closeError} centered>
        <Modal.Header closeButton style={{ backgroundColor: '#dc3545', color: '#fff' }}>
          <Modal.Title>{errorModal.title || 'Ha ocurrido un error'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div style={{ whiteSpace: 'pre-line' }}>{errorModal.message || 'Intenta nuevamente.'}</div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" type="button" onClick={closeError}>Entendido</Button>
        </Modal.Footer>
      </Modal>

      <footer className="consulta-footer text-center py-3">
        © 2025 La Farmacia Homeopática - Más alternativas, más servicio.
      </footer>
    </div>
  );
}

export default VencimientoAdmin;
