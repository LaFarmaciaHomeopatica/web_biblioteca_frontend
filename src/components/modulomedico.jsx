// src/components/modulomedico.jsx
import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { Navbar, Button, Table, Modal, Form, Dropdown } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import "../assets/consulta.css"; // mismo CSS que usa Consulta
import logo from "../assets/logo.jpeg";
import { useNavigate } from "react-router-dom";
import api from "../api/api"; // cliente Axios ya configurado (igual que en Consulta)

const PAGE_SIZE = 100;

const ModuloMedico = () => {
  const navigate = useNavigate();

  const topRef = useRef(null);
  const bottomRef = useRef(null);

  const handleVolver = () => navigate("/admin");

  // =========================
  // ✅ TRAZABILIDAD (NO rompe el flujo si falla)
  // =========================
  const registrarTrazabilidad = async (accion, descripcion) => {
    try {
      await api.post("/trazabilidad", {
        modulo: "Módulo Médico",
        accion,
        descripcion,
      });
    } catch (error) {
      console.warn("No se pudo registrar trazabilidad:", error);
    }
  };

  // Helpers para mostrar tarifa en %
  const formatearPrecio = (valor) => {
    if (valor === null || valor === undefined || valor === "") return "";
    const numero = Number(String(valor).replace(/[^0-9.-]/g, ""));
    if (Number.isNaN(numero)) return valor;
    return new Intl.NumberFormat("es-CO", { minimumFractionDigits: 0 }).format(
      numero
    );
  };

  const mostrarPrecio = (valor) => {
    const f = formatearPrecio(valor);
    return f ? `${f} %` : "";
  };

  // Datos de la tabla provenientes del backend
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");

  // =========================
  // ✅ MODALES DE ACCIONES (como Consulta.jsx)
  // =========================
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionModalTitle, setActionModalTitle] = useState("");
  const [actionModalMessage, setActionModalMessage] = useState("");

  const openActionModal = (title, message) => {
    setActionModalTitle(title || "Acción completada");
    setActionModalMessage(message || "");
    setShowActionModal(true);
  };

  const closeActionModal = () => setShowActionModal(false);

  // Confirmación (reemplaza window.confirm)
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("Confirmar Eliminación");
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmLoading, setConfirmLoading] = useState(false);
  const confirmActionRef = useRef(null);

  const openConfirmModal = (title, message, onConfirm) => {
    setConfirmTitle(title || "Confirmar Eliminación");
    setConfirmMessage(message || "");
    confirmActionRef.current = onConfirm;
    setShowConfirmModal(true);
  };

  const closeConfirmModal = () => {
    if (!confirmLoading) {
      setShowConfirmModal(false);
      setConfirmMessage("");
      confirmActionRef.current = null;
    }
  };

  const handleConfirm = async () => {
    if (!confirmActionRef.current) return;
    try {
      setConfirmLoading(true);
      await confirmActionRef.current();
      setShowConfirmModal(false);
      setConfirmMessage("");
      confirmActionRef.current = null;
    } finally {
      setConfirmLoading(false);
    }
  };

  // =========================
  // ✅ COLUMNAS VISIBLES (selector arriba a la derecha)
  // =========================
  const COLUMN_KEYS = {
    identificacion: "Identificación",
    nombre: "Nombre",
    tarifa: "Tarifa",
    observaciones: "Observaciones",
    visitador: "Visitador",
    cartera: "Cartera",
  
  };

  const [visibleCols, setVisibleCols] = useState(() => ({
    seleccionar: true,
    identificacion: true,
    nombre: true,
    tarifa: true,
    observaciones: true,
    visitador: true,
    cartera: true,
    acciones: true,
  }));

  const toggleColumn = (key) => {
    setVisibleCols((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const showAnyColumn = useMemo(() => {
    return Object.values(visibleCols).some(Boolean);
  }, [visibleCols]);

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
        includes(row.observaciones) ||
        includes(row.cartera)
      );
    });
  }, [data, normalizedSearch]);

  // Paginación (FRONT) 100 por página
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

  // Selección (eliminar individual y en grupo)
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const selectedCount = selectedIds.size;

  const allIds = useMemo(
    () => paginatedData.map((r) => r.id).filter(Boolean),
    [paginatedData]
  );

  const isAllSelected = useMemo(() => {
    if (allIds.length === 0) return false;
    return allIds.every((id) => selectedIds.has(id));
  }, [allIds, selectedIds]);

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (isAllSelected) {
        allIds.forEach((id) => next.delete(id));
      } else {
        allIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  // ✅ Estilo reutilizable para textarea "Observaciones"
  const observacionesTextareaStyle = {
    resize: "vertical",
    overflowY: "auto",
    minHeight: 90,
    maxHeight: "45vh",
  };

  // Estado para el modal de creación
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRecord, setNewRecord] = useState({
    identificacion: "",
    nombre: "",
    tarifa: "",
    observaciones: "",
    visitador: "",
    cartera: "",
  });
  const [createError, setCreateError] = useState("");
  const [saving, setSaving] = useState(false);

  // Modal editar
  const [showEditModal, setShowEditModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editRecord, setEditRecord] = useState({
    identificacion: "",
    nombre: "",
    tarifa: "",
    observaciones: "",
    visitador: "",
    cartera: "",
  });
  const [editError, setEditError] = useState("");
  const [updating, setUpdating] = useState(false);

  // Import/Export
  const fileInputRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Cargar registros desde el backend
  const fetchMedicos = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError("");

      const response = await api.get("/medicos");
      const payload = response.data;
      const lista = Array.isArray(payload) ? payload : payload.data || [];
      setData(lista);

      setSelectedIds((prev) => {
        if (!prev.size) return prev;
        const valid = new Set(lista.map((x) => x.id).filter(Boolean));
        const next = new Set();
        prev.forEach((id) => {
          if (valid.has(id)) next.add(id);
        });
        return next;
      });
    } catch (error) {
      console.error("Error al cargar médicos:", error);
      setFetchError("Error al cargar los registros del módulo médico.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMedicos();
  }, [fetchMedicos]);

  // Scroll
  const goTop = () => topRef.current?.scrollIntoView({ behavior: "smooth" });
  const goBottom = () =>
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });

  const openCreateModal = () => {
    setCreateError("");
    setNewRecord({
      identificacion: "",
      nombre: "",
      tarifa: "",
      observaciones: "",
      visitador: "",
      cartera: "",
    });
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    if (!saving) setShowCreateModal(false);
  };

  const handleNewRecordChange = (e) => {
    const { name, value } = e.target;
    setNewRecord((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveNewRecord = async () => {
    if (
      !newRecord.identificacion.trim() ||
      !newRecord.nombre.trim() ||
      !newRecord.tarifa.trim()
    ) {
      setCreateError("Identificación, nombre y tarifa son campos obligatorios.");
      return;
    }

    const tarifaLimpia = newRecord.tarifa.replace(/[^\d]/g, "");
    if (!tarifaLimpia) {
      setCreateError("La tarifa debe ser un porcentaje válido.");
      return;
    }

    const payload = {
      identificacion: newRecord.identificacion.trim(),
      nombre: newRecord.nombre.trim(),
      tarifa: Number(tarifaLimpia),
      observaciones: newRecord.observaciones.trim() || null,
      visitador: newRecord.visitador.trim() || null,
      cartera: newRecord.cartera || null, // acepta cualquier texto/caracter
    };

    try {
      setSaving(true);
      setCreateError("");

      const response = await api.post("/medicos", payload);

      setData((prev) => [...prev, response.data]);
      setShowCreateModal(false);

      openActionModal(
        "Registro creado",
        `Se creó el registro médico: ${payload.identificacion} - ${payload.nombre}`
      );

      await registrarTrazabilidad(
        "CREAR",
        `Se creó médico: ${payload.identificacion} - ${payload.nombre}`
      );
    } catch (error) {
      console.error("Error al crear médico:", error);

      if (error.response && error.response.data) {
        const resp = error.response.data;

        if (resp.errors) {
          const mensajes = Object.values(resp.errors).flat().join(" ");
          setCreateError(mensajes);
        } else if (resp.message) {
          setCreateError(resp.message);
        } else {
          setCreateError("Error al guardar el registro.");
        }
      } else {
        setCreateError("Error de conexión con el servidor.");
      }
    } finally {
      setSaving(false);
    }
  };

  // =========================
  // Editar (individual)
  // =========================
  const openEditModal = (row) => {
    setEditError("");
    setEditId(row.id);
    setEditRecord({
      identificacion: row.identificacion || "",
      nombre: row.nombre || "",
      tarifa:
        row.tarifa === null || row.tarifa === undefined || row.tarifa === ""
          ? ""
          : `${row.tarifa}%`,
      observaciones: row.observaciones || "",
      visitador: row.visitador || "",
      cartera: row.cartera ?? "",
    });
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    if (!updating) setShowEditModal(false);
  };

  const handleEditRecordChange = (e) => {
    const { name, value } = e.target;
    setEditRecord((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdateRecord = async () => {
    if (!editId) return;

    if (
      !editRecord.identificacion.trim() ||
      !editRecord.nombre.trim() ||
      String(editRecord.tarifa).trim() === ""
    ) {
      setEditError("Identificación, nombre y tarifa son obligatorios.");
      return;
    }

    const tarifaLimpia = String(editRecord.tarifa).replace(/[^\d]/g, "");
    if (!tarifaLimpia) {
      setEditError("La tarifa debe ser un porcentaje válido.");
      return;
    }

    const payload = {
      identificacion: editRecord.identificacion.trim(),
      nombre: editRecord.nombre.trim(),
      tarifa: Number(tarifaLimpia),
      observaciones: editRecord.observaciones.trim() || null,
      visitador: editRecord.visitador.trim() || null,
      cartera: editRecord.cartera || null,
    };

    try {
      setUpdating(true);
      setEditError("");
      await api.put(`/medicos/${editId}`, payload);
      setShowEditModal(false);
      await fetchMedicos();

      openActionModal(
        "Cambios guardados",
        `Se actualizó el registro: ${payload.identificacion} - ${payload.nombre}`
      );

      await registrarTrazabilidad(
        "EDITAR",
        `Se editó médico ID ${editId}: ${payload.identificacion} - ${payload.nombre}`
      );
    } catch (error) {
      console.error("Error al editar médico:", error);
      if (error.response?.data?.errors) {
        const mensajes = Object.values(error.response.data.errors)
          .flat()
          .join(" ");
        setEditError(mensajes);
      } else {
        setEditError("No se pudo actualizar el registro.");
      }
    } finally {
      setUpdating(false);
    }
  };

  // =========================
  // Eliminar (individual y masivo)
  // =========================
  const deleteOne = async (id) => {
    const row = data.find((x) => x.id === id);
    const msg = row
      ? `¿Estás seguro de que deseas eliminar el registro ${row.nombre} con identificación ${row.identificacion}?`
      : "¿Estás seguro de que deseas eliminar este registro?";

    openConfirmModal("Confirmar Eliminación", msg, async () => {
      try {
        setLoading(true);

        await api.delete(`/medicos/${id}`);
        setData((prev) => prev.filter((x) => x.id !== id));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });

        openActionModal(
          "Eliminación lista",
          row
            ? `Se eliminó el registro médico: ${row.identificacion} - ${row.nombre}`
            : `Se eliminó el registro médico ID ${id}`
        );

        await registrarTrazabilidad(
          "ELIMINAR",
          row
            ? `Eliminó el registro médico: ${row.identificacion} - ${row.nombre} (ID ${id})`
            : `Eliminó el registro médico ID ${id}`
        );
      } catch (error) {
        console.error("Error al eliminar médico:", error);
        openActionModal("Error", "No se pudo eliminar el registro. Revisa el servidor.");
      } finally {
        setLoading(false);
      }
    });
  };

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;

    const rows = data.filter((x) => selectedIds.has(x.id));
    const resumen = rows
      .slice(0, 20)
      .map((r) => `${r.identificacion}-${r.nombre}`)
      .join(", ");
    const extra = rows.length > 20 ? ` (+${rows.length - 20} más)` : "";

    openConfirmModal(
      "Confirmar Eliminación",
      `¿Estás seguro de que deseas eliminar ${selectedIds.size} registro(s)?`,
      async () => {
        const ids = Array.from(selectedIds);

        try {
          setLoading(true);

          await Promise.all(ids.map((id) => api.delete(`/medicos/${id}`)));

          setData((prev) => prev.filter((x) => !selectedIds.has(x.id)));
          clearSelection();

          openActionModal(
            "Eliminación lista",
            `Se eliminaron ${ids.length} registro(s) correctamente.`
          );

          await registrarTrazabilidad(
            "ELIMINAR_MASIVO",
            `Eliminó ${ids.length} registro(s) del Módulo Médico: ${resumen}${extra}`
          );
        } catch (error) {
          console.error("Error al eliminar en grupo:", error);
          openActionModal(
            "Error",
            "No se pudo eliminar uno o más registros. Revisa el servidor y vuelve a intentar."
          );
        } finally {
          setLoading(false);
        }
      }
    );
  };

  // =========================
  // Importar / Exportar Excel
  // =========================
  const handleClickImport = () => {
    if (importing || loading) return;
    fileInputRef.current?.click();
  };

  const handleImportFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      setImporting(true);
      setFetchError("");

      const formData = new FormData();
      formData.append("file", file);

      await api.post("/medicos/import-excel", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      await fetchMedicos();

      openActionModal(
        "Importación lista",
        `El archivo "${file.name}" se importó correctamente.`
      );

      await registrarTrazabilidad(
        "IMPORTAR_EXCEL",
        `Se importó Excel en Módulo Médico. Archivo: ${file.name}`
      );
    } catch (error) {
      console.error("Error al importar Excel:", error);
      openActionModal(
        "Error",
        "No se pudo importar el archivo. Verifica el formato y el servidor."
      );
    } finally {
      setImporting(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      setFetchError("");

      const response = await api.get("/medicos/export-excel", {
        responseType: "blob",
      });

      const blob = new Blob([response.data], {
        type:
          response.headers?.["content-type"] ||
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "medicos.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      openActionModal(
        "Exportación lista",
        'El archivo "medicos.xlsx" se generó correctamente.'
      );

      await registrarTrazabilidad("EXPORTAR_EXCEL", "Se exportó Excel del Módulo Médico.");
    } catch (error) {
      console.error("Error al exportar Excel:", error);
      openActionModal("Error", "No se pudo exportar. Revisa el servidor.");
    } finally {
      setExporting(false);
    }
  };

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

      {/* HEADER */}
      <Navbar expand="lg" className="consulta-header">
        <div className="container-fluid">
          <Navbar.Brand className="d-flex align-items-center">
            <img src={logo} alt="Logo" width="40" height="40" className="me-2" />
            <span
              className="consulta-title"
              role="link"
              style={{ cursor: "pointer" }}
              onClick={() => navigate("/admin")}
              title="Ir al panel de administración"
            >
              BIBLIOTECALFH
            </span>
          </Navbar.Brand>

          <Button onClick={handleVolver} className="logout-button">
            <i className="bi bi-arrow-left-circle me-1"></i> Volver
          </Button>
        </div>
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
          {/* Título + botones */}
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3">
            <h2 className="consulta-title-main mb-3 mb-md-0">Módulo Médico</h2>

            <div className="d-flex flex-wrap gap-2 align-items-center justify-content-end">
              {/* ✅ Selector de columnas (arriba a la derecha) */}
              <Dropdown align="end">
                <Dropdown.Toggle
                  variant="info"
                  disabled={loading}
                  title="Mostrar/ocultar columnas"
                >
                  Columnas
                </Dropdown.Toggle>

                <Dropdown.Menu style={{ minWidth: 240, padding: "10px 12px" }}>
                  {!showAnyColumn && (
                    <div className="text-danger small mb-2">
                      Debes dejar al menos una columna visible.
                    </div>
                  )}

                  {Object.entries(COLUMN_KEYS).map(([key, label]) => (
                    <Form.Check
                      key={key}
                      type="switch"
                      id={`col-${key}`}
                      className="mb-2"
                      label={label}
                      checked={!!visibleCols[key]}
                      onChange={() => {
                        // evita que se queden todas ocultas
                        const currentlyOn = Object.values(visibleCols).filter(Boolean).length;
                        if (visibleCols[key] && currentlyOn === 1) return;
                        toggleColumn(key);
                      }}
                    />
                  ))}

                  <div className="d-flex gap-2 mt-2">
                    <Button
                      variant="info"
                      size="sm"
                      onClick={() =>
                        setVisibleCols({
                          seleccionar: true,
                          identificacion: true,
                          nombre: true,
                          tarifa: true,
                          observaciones: true,
                          visitador: true,
                          cartera: true,
                          acciones: true,
                        })
                      }
                    >
                      Ver todas
                    </Button>

                    <Button
                      variant="info"
                      size="sm"
                      onClick={() =>
                        setVisibleCols({
                          seleccionar: true,
                          identificacion: true,
                          nombre: true,
                          tarifa: false,
                          observaciones: false,
                          visitador: false,
                          cartera: false,
                          acciones: true,
                        })
                      }
                    >
                      Básicas
                    </Button>
                  </div>
                </Dropdown.Menu>
              </Dropdown>

              <Button variant="primary" onClick={openCreateModal} disabled={loading}>
                + Nuevo registro
              </Button>

              <Button
                variant="success"
                onClick={handleClickImport}
                disabled={importing || loading}
                title="Importar registros desde Excel"
              >
                {importing ? "Importando..." : "Importar Excel"}
              </Button>

              <Button
                variant="primary"
                onClick={handleExportExcel}
                disabled={exporting || loading}
                title="Exportar registros a Excel"
              >
                {exporting ? "Exportando..." : "Exportar Excel"}
              </Button>

              <Button
                variant="danger"
                onClick={deleteSelected}
                disabled={selectedCount === 0 || loading}
                title="Eliminar registros seleccionados"
              >
                Eliminar ({selectedCount})
              </Button>

              <Button variant="secondary" onClick={goBottom} title="Ir al final">
                ⬇ Abajo
              </Button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                style={{ display: "none" }}
                onChange={handleImportFileChange}
              />
            </div>
          </div>

          {/* BUSCADOR */}
          <div className="mb-3">
            <Form.Control
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por identificación, nombre, visitador, observaciones o ejemplo..."
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

          {/* TABLA */}
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
                  {visibleCols.seleccionar && (
                    <th style={{ width: "48px", textAlign: "center" }}>
                      <Form.Check
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={toggleSelectAll}
                        disabled={allIds.length === 0}
                        title={isAllSelected ? "Desmarcar todo" : "Seleccionar todo"}
                      />
                    </th>
                  )}

                  {visibleCols.identificacion && <th>Identificación</th>}
                  {visibleCols.nombre && <th>Nombre</th>}
                  {visibleCols.tarifa && <th>Tarifa</th>}
                  {visibleCols.observaciones && <th>Observaciones</th>}
                  {visibleCols.visitador && <th>Visitador</th>}
                  {visibleCols.cartera && <th>Cartera</th>}

                  {visibleCols.acciones && <th style={{ width: "190px" }}>Acciones</th>}
                </tr>
              </thead>

              <tbody>
                {paginatedData.length > 0 ? (
                  paginatedData.map((row, index) => (
                    <tr key={row.id || index}>
                      {visibleCols.seleccionar && (
                        <td style={{ textAlign: "center" }}>
                          {row.id ? (
                            <Form.Check
                              type="checkbox"
                              checked={selectedIds.has(row.id)}
                              onChange={() => toggleSelectOne(row.id)}
                              title={selectedIds.has(row.id) ? "Desmarcar" : "Marcar para eliminar"}
                            />
                          ) : (
                            "-"
                          )}
                        </td>
                      )}

                      {visibleCols.identificacion && <td>{row.identificacion}</td>}
                      {visibleCols.nombre && <td>{row.nombre}</td>}
                      {visibleCols.tarifa && <td>{mostrarPrecio(row.tarifa)}</td>}
                      {visibleCols.observaciones && <td>{row.observaciones}</td>}
                      {visibleCols.visitador && <td>{row.visitador}</td>}
                      {visibleCols.cartera && <td>{row.cartera}</td>}

                      {visibleCols.acciones && (
                        <td>
                          <div className="d-flex gap-2">
                            <Button
                              variant="warning"
                              size="sm"
                              onClick={() => row.id && openEditModal(row)}
                              disabled={!row.id || loading}
                              title="Editar este registro"
                            >
                              Editar
                            </Button>

                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => row.id && deleteOne(row.id)}
                              disabled={!row.id || loading}
                              title="Eliminar este registro"
                            >
                              Eliminar
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  !loading && (
                    <tr>
                      <td
                        colSpan={
                          Object.values(visibleCols).filter(Boolean).length || 1
                        }
                        className="text-center"
                      >
                        No hay datos cargados.
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </Table>
          </div>

          {/* PAGINACIÓN */}
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

      {/* ✅ MODAL CONFIRMAR */}
      <Modal
        show={showConfirmModal}
        onHide={closeConfirmModal}
        centered
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title>{confirmTitle}</Modal.Title>
        </Modal.Header>
        <Modal.Body>{confirmMessage}</Modal.Body>
        <Modal.Footer>
          <Button variant="info" onClick={closeConfirmModal} disabled={confirmLoading}>
            Cancelar
          </Button>
          <Button variant="info" onClick={handleConfirm} disabled={confirmLoading}>
            {confirmLoading ? "Eliminando..." : "Eliminar"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ✅ MODAL ACCIÓN OK/ERROR */}
      <Modal show={showActionModal} onHide={closeActionModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>{actionModalTitle}</Modal.Title>
        </Modal.Header>
        <Modal.Body>{actionModalMessage}</Modal.Body>
        <Modal.Footer>
          <Button variant="info" onClick={closeActionModal}>
            Perfecto
          </Button>
        </Modal.Footer>
      </Modal>

      {/* MODAL NUEVO REGISTRO */}
      <Modal show={showCreateModal} onHide={closeCreateModal} centered backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>Nuevo registro médico</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Identificación</Form.Label>
              <Form.Control
                type="text"
                name="identificacion"
                value={newRecord.identificacion}
                onChange={handleNewRecordChange}
                placeholder="Documento / código del médico"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Nombre</Form.Label>
              <Form.Control
                type="text"
                name="nombre"
                value={newRecord.nombre}
                onChange={handleNewRecordChange}
                placeholder="Nombre completo"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Tarifa (%)</Form.Label>
              <Form.Control
                type="text"
                name="tarifa"
                value={newRecord.tarifa}
                onChange={handleNewRecordChange}
                placeholder="Ej: 15%"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Observaciones</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="observaciones"
                value={newRecord.observaciones}
                onChange={handleNewRecordChange}
                placeholder="Comentarios / notas"
                style={observacionesTextareaStyle}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Cartera</Form.Label>
              <Form.Control
                type="text"
                name="cartera"
                value={newRecord.cartera}
                onChange={handleNewRecordChange}
                placeholder="Cualquier texto o carácter"
              />
            </Form.Group>

            <Form.Group className="mb-0">
              <Form.Label>Visitador</Form.Label>
              <Form.Control
                type="text"
                name="visitador"
                value={newRecord.visitador}
                onChange={handleNewRecordChange}
                placeholder="Nombre del visitador"
              />
            </Form.Group>
          </Form>

          {createError && (
            <div className="mt-3 text-danger" style={{ fontSize: "0.9rem" }}>
              {createError}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="info" onClick={closeCreateModal} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="info" onClick={handleSaveNewRecord} disabled={saving}>
            {saving ? "Guardando..." : "Guardar registro"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* MODAL EDITAR */}
      <Modal show={showEditModal} onHide={closeEditModal} centered backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>Editar registro médico</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Identificación</Form.Label>
              <Form.Control
                type="text"
                name="identificacion"
                value={editRecord.identificacion}
                onChange={handleEditRecordChange}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Nombre</Form.Label>
              <Form.Control
                type="text"
                name="nombre"
                value={editRecord.nombre}
                onChange={handleEditRecordChange}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Tarifa (%)</Form.Label>
              <Form.Control
                type="text"
                name="tarifa"
                value={editRecord.tarifa}
                onChange={handleEditRecordChange}
                placeholder="Ej: 15%"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Observaciones</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="observaciones"
                value={editRecord.observaciones}
                onChange={handleEditRecordChange}
                placeholder="Comentarios / notas"
                style={observacionesTextareaStyle}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Cartera</Form.Label>
              <Form.Control
                type="text"
                name="cartera"
                value={editRecord.cartera}
                onChange={handleEditRecordChange}
                placeholder="Cualquier texto o carácter"
              />
            </Form.Group>

            <Form.Group className="mb-0">
              <Form.Label>Visitador</Form.Label>
              <Form.Control
                type="text"
                name="visitador"
                value={editRecord.visitador}
                onChange={handleEditRecordChange}
              />
            </Form.Group>
          </Form>

          {editError && (
            <div className="mt-3 text-danger" style={{ fontSize: "0.9rem" }}>
              {editError}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="info" onClick={closeEditModal} disabled={updating}>
            Cancelar
          </Button>
          <Button variant="info" onClick={handleUpdateRecord} disabled={updating}>
            {updating ? "Actualizando..." : "Guardar cambios"}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ModuloMedico;
