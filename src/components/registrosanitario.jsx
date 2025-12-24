// src/components/registrosanitario.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Container,
  Navbar,
  Button,
  Card,
  Form,
  Spinner,
  Modal,
  Row,
  Col,
} from "react-bootstrap";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.jpeg";
import "../assets/consulta.css";

const API_BASE = `${window.location.origin}/backend/api`;
const PAGE_SIZE = 20;

const currencyCO = (v) => {
  if (v === null || v === undefined || v === "") return "-";
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);
};

const percentCO = (v) => {
  if (v === null || v === undefined || v === "") return "-";

  const texto = String(v).trim();
  const match = texto.match(/[\d.,]+/);
  if (!match) return texto;

  let numero = parseFloat(match[0].replace(",", "."));
  if (Number.isNaN(numero)) return texto;

  if (numero > 0 && numero < 1) numero = numero * 100;

  return `${Math.round(numero)}%`;
};

// Normalizador (sin tildes, minúsculas)
const normalize = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const ESTADOS_REGISTRO = [
  "Vigente",
  "Vencido",
  "En tramite de renovacion",
  "Suspendido",
  "No requiere",
  "Otros",
];

function RegistroSanitario() {
  const navigate = useNavigate();

  // ===== Estado =====
  const [estadoRegistro, setEstadoRegistro] = useState("Todos");
  const [searchBy, setSearchBy] = useState("nombre"); // nombre | codigo | laboratorio | estado_registro
  const [searchTerm, setSearchTerm] = useState("");

  const [productos, setProductos] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // Modal error
  const [errorModal, setErrorModal] = useState({ show: false, title: "", message: "" });
  const openError = (heading, msg) =>
    setErrorModal({ show: true, title: heading, message: msg });
  const closeError = () => setErrorModal({ show: false, title: "", message: "" });

  // Modal detalle
  const [detailShow, setDetailShow] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ===== API =====
  // Traer TODO desde /productos-all
  const fetchProductosAll = useCallback(async () => {
    const token = localStorage.getItem("authToken");
    const headers = {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const url = `${API_BASE}/productos-all`;
    const { data } = await axios.get(url, { headers });

    return Array.isArray(data) ? data : data?.data ?? [];
  }, []);

  // Traer detalle por código desde /productos (paginado)
  const fetchDetallePorCodigo = useCallback(async (codigo) => {
    try {
      const token = localStorage.getItem("authToken");
      const headers = {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const url = `${API_BASE}/productos`;
      const params = { search: codigo, filter_by: "codigo", per_page: 1, page: 1 };
      const { data } = await axios.get(url, { headers, params });
      if (data && Array.isArray(data.data) && data.data.length > 0) return data.data[0];
      return null;
    } catch {
      return null;
    }
  }, []);

  const cargarProductos = useCallback(async () => {
    setLoading(true);
    try {
      const all = await fetchProductosAll();
      setProductos(all);
      setPage(1);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Error al cargar registros sanitarios";
      openError("Error de carga", msg);
      // eslint-disable-next-line no-console
      console.error("Registros sanitarios error:", err?.response?.data || err);
    } finally {
      setLoading(false);
    }
  }, [fetchProductosAll]);

  useEffect(() => {
    cargarProductos();
  }, [cargarProductos]);

  // ===== Filtros =====
  const filtered = useMemo(() => {
    const t = normalize(searchTerm);
    const estadoSel = normalize(estadoRegistro);

    // 1) filtro por estadoRegistro (dropdown)
    let base = productos;

    if (estadoSel && estadoSel !== "todos") {
      base = base.filter((p) => {
        const er = normalize(p?.estado_registro);
        return er === estadoSel || er.includes(estadoSel);
      });
    }

    // 2) filtro por searchTerm + searchBy
    if (!t) return base;

    const field =
      searchBy === "codigo"
        ? "codigo"
        : searchBy === "laboratorio"
        ? "laboratorio"
        : searchBy === "estado_registro"
        ? "estado_registro"
        : "nombre";

    return base.filter((p) => normalize(p?.[field]).includes(t));
  }, [productos, estadoRegistro, searchTerm, searchBy]);

  // ===== Paginación local =====
  const pag = useMemo(() => {
    const total = filtered.length;
    const last = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const safePage = Math.min(Math.max(1, page), last);
    const start = (safePage - 1) * PAGE_SIZE;

    return {
      slice: filtered.slice(start, start + PAGE_SIZE),
      page: safePage,
      last,
      total,
    };
  }, [filtered, page]);

  useEffect(() => {
    if (page !== pag.page) setPage(pag.page);
  }, [page, pag.page]);

  // ===== Detalle =====
  const openDetail = async (item) => {
    setDetailShow(true);
    setDetailItem(item);
    setDetailLoading(true);
    try {
      if (item?.codigo) {
        const full = await fetchDetallePorCodigo(item.codigo);
        if (full) setDetailItem((prev) => ({ ...prev, ...full }));
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

  // ===== UI =====
  const goFirst = () => setPage(1);
  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(pag.last, p + 1));
  const goLast = () => setPage(pag.last);

  return (
    <div className="consulta-layout">
      {/* Header */}
      <Navbar expand="lg" className="consulta-header">
        <Container fluid>
          <Navbar.Brand className="d-flex align-items-center">
            <img src={logo} alt="Logo" width="40" height="40" className="me-2" />
            <span
              className="consulta-title"
              role="link"
              style={{ cursor: "pointer" }}
              onClick={() => navigate("/admin")}
              title="Volver al panel de administración"
            >
              BIBLIOTECALFH
            </span>
          </Navbar.Brand>

          <Button onClick={() => navigate("/admin")} className="logout-button" type="button">
            <i className="bi bi-arrow-left-circle me-1"></i> Volver
          </Button>
        </Container>
      </Navbar>

      <Container fluid className="consulta-content px-3 px-md-5">
        <Card className="consulta-card mt-4">
          <Card.Body>
            <h2 className="consulta-title-main mb-3 text-center text-md-start">
              Registros Sanitarios
            </h2>

            {loading && (
              <div className="text-center mb-3">
                <Spinner animation="border" size="sm" className="me-2" />
                Cargando…
              </div>
            )}

            {/* Filtros */}
            <div
              className="p-3 rounded-3 mb-3"
              style={{
                background: "rgba(255,255,255,0.14)",
                border: "1px solid rgba(255,255,255,0.22)",
                backdropFilter: "blur(8px)",
              }}
            >
              <Row className="g-3 align-items-end">
                <Col xs={12} md={4} lg={3}>
                  <Form.Group>
                    <Form.Label className="fw-semibold mb-1">Estado de registro</Form.Label>
                    <Form.Select
                      value={estadoRegistro}
                      onChange={(e) => {
                        setEstadoRegistro(e.target.value);
                        setPage(1);
                      }}
                      disabled={loading}
                    >
                      <option value="Todos">Todos</option>
                      {ESTADOS_REGISTRO.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col xs={12} md={4} lg={3}>
                  <Form.Group>
                    <Form.Label className="fw-semibold mb-1">Buscar por</Form.Label>
                    <Form.Select
                      value={searchBy}
                      onChange={(e) => {
                        setSearchBy(e.target.value);
                        setPage(1);
                      }}
                      disabled={loading}
                    >
                      <option value="nombre">Nombre</option>
                      <option value="codigo">Código</option>
                      <option value="laboratorio">Laboratorio</option>
                      <option value="estado_registro">Estado de registro</option>
                    </Form.Select>
                  </Form.Group>
                </Col>

                {/* Búsqueda alineada, sin el texto de "Mostrando 1344..." */}
                <Col xs={12} md={4} lg={6}>
                  <Form.Group>
                    <Form.Label className="fw-semibold mb-1">Búsqueda</Form.Label>
                    <Form.Control
                      placeholder="Escribe para filtrar…"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setPage(1);
                      }}
                      disabled={loading}
                    />
                  </Form.Group>
                </Col>
              </Row>
            </div>

            {/* Cards: usando Row/Col para ocupar TODO el ancho */}
            <Row className="g-3 rs-grid">
              {pag.slice.length ? (
                pag.slice.map((p, idx) => (
                  <Col
                    key={`rs-${p.id ?? idx}`}
                    xs={12}
                    sm={6}
                    lg={4}
                    xl={3}
                    className="d-flex"
                  >
                    <div className="rs-card w-100">
                      <div className="rs-card-body">
                        <div className="rs-name">
                          {/* ✅ ÚNICO CAMBIO: nombre SIN <strong> */}
                          {p.nombre || "-"}
                        </div>

                        <div className="rs-line">
                          <strong>Código:</strong> {p.codigo || "-"}
                        </div>
                        <div className="rs-line">
                          <strong>Laboratorio:</strong> {p.laboratorio || "-"}
                        </div>
                        <div className="rs-line">
                          <strong>Registro sanitario:</strong> {p.registro_sanitario || "-"}
                        </div>
                        <div className="rs-line">
                          <strong>Estado registro:</strong> {p.estado_registro || "-"}
                        </div>

                        <div className="mt-auto">
                          <Button size="sm" type="button" onClick={() => openDetail(p)}>
                            Ver
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Col>
                ))
              ) : (
                <Col xs={12}>
                  <p className="text-muted mb-0">No hay resultados con los filtros actuales.</p>
                </Col>
              )}
            </Row>

            {/* Paginación */}
            {pag.last > 1 && (
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mt-3 gap-2">
                <div style={{ fontSize: "0.95rem" }}>
                  Mostrando{" "}
                  <strong>
                    {pag.total === 0 ? 0 : (pag.page - 1) * PAGE_SIZE + 1}
                    {" - "}
                    {Math.min(pag.page * PAGE_SIZE, pag.total)}
                  </strong>{" "}
                  de <strong>{pag.total}</strong>
                </div>

                <div className="d-flex gap-2 flex-wrap justify-content-center">
                  <Button
                    variant="outline-light"
                    onClick={goFirst}
                    disabled={pag.page === 1 || loading}
                    title="Primera página"
                  >
                    ⏮
                  </Button>
                  <Button
                    variant="outline-light"
                    onClick={goPrev}
                    disabled={pag.page === 1 || loading}
                    title="Página anterior"
                  >
                    ◀
                  </Button>

                  <Button variant="light" disabled title="Página actual">
                    {pag.page} / {pag.last}
                  </Button>

                  <Button
                    variant="outline-light"
                    onClick={goNext}
                    disabled={pag.page === pag.last || loading}
                    title="Página siguiente"
                  >
                    ▶
                  </Button>
                  <Button
                    variant="outline-light"
                    onClick={goLast}
                    disabled={pag.page === pag.last || loading}
                    title="Última página"
                  >
                    ⏭
                  </Button>
                </div>
              </div>
            )}
          </Card.Body>
        </Card>
      </Container>

      {/* Modal Detalle */}
      <Modal show={detailShow} onHide={closeDetail} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{detailItem?.nombre || "Detalle del producto"}</Modal.Title>
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
                <p className="mb-1">
                  <strong>Código:</strong> {detailItem?.codigo || "-"}
                </p>
                <p className="mb-1">
                  <strong>Laboratorio:</strong> {detailItem?.laboratorio || "-"}
                </p>
                <p className="mb-1">
                  <strong>Categoría:</strong> {detailItem?.categoria || "-"}
                </p>
                <p className="mb-1">
                  <strong>Fecha vencimiento Registro:</strong> {detailItem?.fecha_vencimiento || "-"}
                </p>
              </Col>

              <Col md={6}>
                <p className="mb-1">
                  <strong>Precio público con IVA:</strong> {currencyCO(detailItem?.precio_publico)}
                </p>
                <p className="mb-1">
                  <strong>Precio médico con IVA:</strong> {currencyCO(detailItem?.precio_medico)}
                </p>
                <p className="mb-1">
                  <strong>IVA:</strong> {percentCO(detailItem?.iva)}
                </p>
                <p className="mb-1">
                  <strong>Fórmula médica:</strong> {detailItem?.formula_medica || "-"}
                </p>
                <p className="mb-1">
                  <strong>Estado producto:</strong> {detailItem?.estado_producto || "-"}
                </p>
                <p className="mb-1">
                  <strong>Estado registro:</strong> {detailItem?.estado_registro || "-"}
                </p>
                <p className="mb-1">
                  <strong>Registro sanitario:</strong> {detailItem?.registro_sanitario || "-"}
                </p>
              </Col>

              {detailItem?.david && (
                <Col xs={12}>
                  <hr />
                  <p className="mb-0">
                    <strong>DAVID:</strong>
                  </p>
                  <div className="text-muted" style={{ whiteSpace: "pre-wrap" }}>
                    {detailItem.david}
                  </div>
                </Col>
              )}
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" type="button" onClick={closeDetail}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal Error */}
      <Modal show={errorModal.show} onHide={closeError} centered>
        <Modal.Header closeButton style={{ backgroundColor: "#dc3545", color: "#fff" }}>
          <Modal.Title>{errorModal.title || "Ha ocurrido un error"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div style={{ whiteSpace: "pre-line" }}>
            {errorModal.message || "Intenta nuevamente."}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" type="button" onClick={closeError}>
            Entendido
          </Button>
        </Modal.Footer>
      </Modal>

      <footer className="consulta-footer text-center py-3">
        © 2025 La Farmacia Homeopática - Más alternativas, más servicio.
      </footer>
    </div>
  );
}

export default RegistroSanitario;
