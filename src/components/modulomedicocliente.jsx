// src/components/modulomedicocliente.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { Container, Navbar, Nav, Button, Table, Form } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import "../assets/cliente.css";
import "../assets/consulta.css"; // mismo CSS que usa Consulta
import logo from "../assets/logo.jpeg";
import { useNavigate } from "react-router-dom";
import api from "../api/api"; // cliente Axios ya configurado
import { useAuth } from "../context/AuthContext";

const PAGE_SIZE = 100;

const ModuloMedicoCliente = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const topRef = useRef(null);
  const bottomRef = useRef(null);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleGoToDocs = () => navigate("/clientedoc");
  const handleGoToVademecum = () => navigate("/vademecum");
  const handleGoToCapacitacion = () => navigate("/capacitacion");
  const handleGoToLaboratorios = () => navigate("/laboratorios");
  const handleGoToRegistroSanitarioCliente = () =>
    navigate("/registrosanitariocliente");
  const handleGoToModuloMedico = () => navigate("/modulomedico-cliente");

  // Helpers para mostrar tarifa en %
  const formatearNumero = (valor) => {
    if (valor === null || valor === undefined || valor === "") return "";
    const numero = Number(String(valor).replace(/[^0-9.-]/g, ""));
    if (Number.isNaN(numero)) return valor;
    return new Intl.NumberFormat("es-CO", { minimumFractionDigits: 0 }).format(
      numero
    );
  };

  const mostrarPorcentaje = (valor) => {
    const f = formatearNumero(valor);
    return f ? `${f} %` : "";
  };

  // Datos
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");

  // =========================
  // ✅ BUSCADOR / FILTRO
  // =========================
  const [searchTerm, setSearchTerm] = useState("");

  const normalizedSearch = useMemo(() => {
    return String(searchTerm || "").trim().toLowerCase();
  }, [searchTerm]);

  const filteredData = useMemo(() => {
    if (!normalizedSearch) return data;

    const includes = (value) =>
      String(value ?? "").toLowerCase().includes(normalizedSearch);

    return data.filter((row) => {
      return (
        includes(row.identificacion) ||
        includes(row.nombre) ||
        includes(row.visitador) ||
        includes(row.observaciones)
      );
    });
  }, [data, normalizedSearch]);

  // =========================
  // ✅ PAGINACIÓN (FRONT) 100 por página
  // =========================
  const [page, setPage] = useState(1);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE)),
    [filteredData.length]
  );

  const paginatedData = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredData.slice(start, start + PAGE_SIZE);
  }, [filteredData, page]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [normalizedSearch]);

  // =========================
  // Cargar registros (SOLO VISUALIZAR)
  // =========================
  const fetchMedicos = async () => {
    try {
      setLoading(true);
      setFetchError("");

      const response = await api.get("/medicos");
      const payload = response.data;
      const lista = Array.isArray(payload) ? payload : payload.data || [];
      setData(lista);
    } catch (error) {
      console.error("Error al cargar médicos (cliente):", error);
      setFetchError("Error al cargar los registros del módulo médico.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicos();
  }, []);

  // =========================
  // Scroll
  // =========================
  const goTop = () => topRef.current?.scrollIntoView({ behavior: "smooth" });
  const goBottom = () => bottomRef.current?.scrollIntoView({ behavior: "smooth" });

  // =========================
  // Controles de paginación
  // =========================
  const goFirst = () => setPage(1);
  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(totalPages, p + 1));
  const goLast = () => setPage(totalPages);

  return (
    <div className="consulta-layout">
      <div ref={topRef} />

      {/* ✅ HEADER (IGUAL QUE cliente.jsx) */}
      <Navbar expand="lg" className="consulta-header" variant="dark">
        <Container fluid>
          <Navbar.Brand className="d-flex align-items-center">
            <img src={logo} alt="Logo" width="40" height="40" className="me-2" />
            <span
              className="capacitacion-title"
              role="link"
              style={{ cursor: "pointer" }}
              onClick={() => navigate("/cliente")}
              title="Ir a Productos"
            >
              BIBLIOTECALFH
            </span>
          </Navbar.Brand>

          <Navbar.Toggle aria-controls="navbarResponsive" />
          <Navbar.Collapse id="navbarResponsive" className="justify-content-end">
            <Nav className="d-flex flex-column flex-lg-row gap-2">
              <Button onClick={handleGoToModuloMedico}>
                <i className="bi bi-heart-pulse me-1"></i> Médicos
              </Button>

              <Button onClick={handleGoToRegistroSanitarioCliente}>
                <i className="bi bi-hourglass-split me-1"></i> Registro Sanitario
              </Button>
              <Button onClick={handleGoToLaboratorios}>
                <i className="bi bi-droplet me-1"></i> Laboratorios
              </Button>
              <Button onClick={handleGoToVademecum}>
                <i className="bi bi-book me-1"></i> Vademécum
              </Button>
              <Button onClick={handleGoToCapacitacion}>
                <i className="bi bi-mortarboard me-1"></i> Capacitación
              </Button>
              <Button onClick={handleGoToDocs}>
                <i className="bi bi-file-earmark-text me-1"></i> Documentos
              </Button>

              <Button onClick={() => navigate("/cliente")} variant="secondary">
                <i className="bi bi-box-seam me-1"></i> Productos
              </Button>

              <Button
                onClick={handleLogout}
                className="logout-button"
                variant="danger"
              >
                <i className="bi bi-box-arrow-right me-1"></i> Salir
              </Button>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      {/* CONTENIDO PRINCIPAL */}
      <div
        style={{
          flex: 1,
          width: "100vw",
          maxWidth: "100vw",
          padding: "2rem 3vw",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: "100%",
            background: "rgba(255, 255, 255, 0.2)",
            backdropFilter: "blur(10px)",
            borderRadius: "15px",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.521)",
            padding: "1.8rem 1.8rem 2.2rem",
          }}
        >
          {/* Título + botones (SOLO ABAJO) */}
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3">
            <h2 className="consulta-title-main mb-3 mb-md-0">Módulo Médico</h2>

            <div className="d-flex flex-wrap gap-2">
              <Button variant="secondary" onClick={goBottom} title="Ir al final">
                ⬇ Abajo
              </Button>
            </div>
          </div>

          {/* ✅ BUSCADOR */}
          <div className="mb-3">
            <Form.Control
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por identificación, nombre, visitador u observaciones..."
              disabled={loading}
            />
            <div className="mt-1" style={{ fontSize: "0.85rem", opacity: 0.9 }}>
              {normalizedSearch ? (
                <>
                  Resultados: <strong>{filteredData.length}</strong> de{" "}
                  <strong>{data.length}</strong>
                </>
              ) : (
                <>
                  Total registros: <strong>{data.length}</strong>
                </>
              )}
            </div>
          </div>

          {loading && <p className="text-center mb-2">Cargando registros...</p>}
          {fetchError && <p className="text-center text-danger mb-2">{fetchError}</p>}

          {/* TABLA (SOLO LECTURA) */}
          <div style={{ width: "100%", overflowX: "auto" }}>
            <Table
              striped
              bordered
              hover
              className="mb-0"
              style={{
                width: "100%",
                minWidth: "980px",
                tableLayout: "auto",
              }}
            >
              <thead>
                <tr>
                  <th>Identificación</th>
                  <th>Nombre</th>
                  <th>Tarifa</th>
                  <th>Observaciones</th>
                  <th>Visitador</th>
                </tr>
              </thead>

              <tbody>
                {paginatedData.length > 0 ? (
                  paginatedData.map((row, index) => (
                    <tr key={row.id || index}>
                      <td>{row.identificacion}</td>
                      <td>{row.nombre}</td>
                      <td>{mostrarPorcentaje(row.tarifa)}</td>
                      <td>{row.observaciones}</td>
                      <td>{row.visitador}</td>
                    </tr>
                  ))
                ) : (
                  !loading && (
                    <tr>
                      <td colSpan="5" className="text-center">
                        No hay datos cargados.
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </Table>
          </div>

          {/* ✅ Paginación */}
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mt-3 gap-2">
            <div style={{ fontSize: "0.95rem" }}>
              Mostrando{" "}
              <strong>
                {filteredData.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}
                {" - "}
                {Math.min(page * PAGE_SIZE, filteredData.length)}
              </strong>{" "}
              de <strong>{filteredData.length}</strong> registros
              {normalizedSearch ? (
                <>
                  {" "}
                  (filtrados de <strong>{data.length}</strong>)
                </>
              ) : null}
            </div>

            <div className="d-flex gap-2 flex-wrap justify-content-center">
              <Button
                variant="outline-light"
                onClick={goFirst}
                disabled={page === 1 || loading}
                title="Primera página"
              >
                ⏮
              </Button>
              <Button
                variant="outline-light"
                onClick={goPrev}
                disabled={page === 1 || loading}
                title="Página anterior"
              >
                ◀
              </Button>

              <Button variant="light" disabled title="Página actual">
                {page} / {totalPages}
              </Button>

              <Button
                variant="outline-light"
                onClick={goNext}
                disabled={page === totalPages || loading}
                title="Página siguiente"
              >
                ▶
              </Button>
              <Button
                variant="outline-light"
                onClick={goLast}
                disabled={page === totalPages || loading}
                title="Última página"
              >
                ⏭
              </Button>

              {/* ✅ ARRIBA al final junto a paginación */}
              <Button variant="secondary" onClick={goTop} title="Ir al inicio">
                ⬆ Arriba
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div ref={bottomRef} />

      {/* FOOTER */}
      <footer className="consulta-footer text-center py-3">
        © 2025 La Farmacia Homeopática - Más alternativas, más servicio.
      </footer>
    </div>
  );
};

export default ModuloMedicoCliente;
