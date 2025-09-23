import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Container, Navbar, Form, FormControl, Button, Row, Col,
  Card, Modal, Alert, Spinner, Tabs, Tab, Table, Badge
} from 'react-bootstrap';
import * as XLSX from 'xlsx';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../assets/consulta.css';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.jpeg';

/** Base de API (prod y también útil en dev sin proxy) */
const API_BASE = 'https://bibliotecalfh.com/backend/api';
const PAGE_SIZE = 20; // Tamaño de página para paginación en cliente (DAVID/INACTIVO)

const Consulta = () => {
  const formatearPrecio = (valor) => {
    if (valor === null || valor === undefined || valor === '') return '';
    const numero = Number(String(valor).replace(/[^0-9.-]/g, ''));
    return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0 }).format(numero);
  };

  const mostrarPrecio = (valor) => {
    const f = formatearPrecio(valor);
    return f ? `$ ${f}` : '';
  };

  const formatearIVA = (valor) => {
    if (valor === null || valor === undefined || valor === '') return '';
    const s = String(valor).trim().replace(',', '.');
    return s.endsWith('%') ? s : `${s}%`;
  };

  const normalizarIVANumero = (valor) => {
    if (valor === null || valor === undefined || valor === '') return valor;
    const s = String(valor).trim().replace(',', '.');
    const match = s.match(/-?\d+(\.\d+)?/);
    return match ? match[0] : '';
  };

  const formatCampoValor = (campo, valor) => {
    const isPrecio = campo === 'precio_publico' || campo === 'precio_medico';
    if (isPrecio) return mostrarPrecio(valor);
    return valor ?? '';
  };

  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState('nombre');
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [editingProduct, setEditingProduct] = useState(null);
  const [viewingProduct, setViewingProduct] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [formData, setFormData] = useState({});
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  // Import
  // eslint-disable-next-line no-unused-vars
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [showImportPreview, setShowImportPreview] = useState(false);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  // ===== Modal de error “bonito” (p.ej. código duplicado/validaciones) =====
  const [errorModal, setErrorModal] = useState({ show: false, title: '', message: '' });
  const openErrorModal = (title, message) => setErrorModal({ show: true, title, message });
  const closeErrorModal = () => setErrorModal({ show: false, title: '', message: '' });

  // ===== Modal de éxito “bonito” (creación/actualización, exportación e importación) =====
  const [successModal, setSuccessModal] = useState({ show: false, title: '', message: '' });
  const openSuccessModal = (title, message) => setSuccessModal({ show: true, title, message });
  const closeSuccessModal = () => setSuccessModal({ show: false, title: '', message: '' });

  const paginarCliente = (lista, page) => {
    const total = lista.length;
    const lp = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const safePage = Math.min(Math.max(1, page), lp);
    const start = (safePage - 1) * PAGE_SIZE;
    const slice = lista.slice(start, start + PAGE_SIZE);
    setProductos(slice);
    setCurrentPage(safePage);
    setLastPage(lp);
  };

  const fetchProductos = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);

    try {
      if (filterBy === 'inactivo') {
        const token = localStorage.getItem('authToken');
        if (!token) throw new Error('Necesitas estar autenticado para listar los inactivos.');
        const resp = await axios.get(`${API_BASE}/productos-all`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        });
        const all = Array.isArray(resp.data) ? resp.data : [];
        const inactivos = all.filter(
          (p) => String(p?.estado_producto || '').toLowerCase() === 'inactivo'
        );
        paginarCliente(inactivos, page);
        return;
      }

      if (filterBy === 'david') {
        const token = localStorage.getItem('authToken');
        if (!token) throw new Error('Necesitas estar autenticado para buscar por DAVID.');
        const resp = await axios.get(`${API_BASE}/productos-all`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        });
        const all = Array.isArray(resp.data) ? resp.data : [];
        const term = searchTerm.trim().toLowerCase();

        const filtered = term
          ? all.filter(p => String(p?.david ?? '').toLowerCase().includes(term))
          : all.filter(p => String(p?.david ?? '').trim() !== '');

        paginarCliente(filtered, page);
        return;
      }

      const params = new URLSearchParams({ page: String(page) });
      const cleanSearch = searchTerm.trim();

      const validTextFilters = [
        'nombre', 'codigo', 'categoria',
        'precio_publico', 'precio_medico',
        'laboratorio'
      ];

      if (cleanSearch !== '') {
        const filterToUse = validTextFilters.includes(filterBy) ? filterBy : 'nombre';
        params.set('filter_by', filterToUse);
        params.set('search', cleanSearch);
      }

      const url = `${API_BASE}/productos?${params.toString()}`;
      const response = await axios.get(url, { headers: { Accept: 'application/json' } });

      setProductos(response.data.data || []);
      setCurrentPage(response.data.current_page);
      setLastPage(response.data.last_page);
    } catch (err) {
      setError('Error al cargar los productos');
      console.error('Error cargando productos:', err?.response?.data || err?.message);
      setProductos([]);
      setCurrentPage(1);
      setLastPage(1);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filterBy]);

  useEffect(() => {
    fetchProductos(currentPage);
  }, [currentPage, fetchProductos]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterByChange = (e) => {
    const val = e.target.value;
    setFilterBy(val);
    setCurrentPage(1);
    if (val === 'inactivo') setSearchTerm('');
  };

  const handleViewClick = (producto) => {
    setViewingProduct(producto);
    setShowViewModal(true);
  };

  const handleEditClick = (producto) => {
    setIsNewProduct(false);
    setEditingProduct(producto);
    setFormData({ ...producto });
    setShowEditModal(true);
  };

  const handleCreateClick = () => {
    setIsNewProduct(true);
    setEditingProduct(null);
    setFormData({
      codigo: '', nombre: '', david: '', categoria: '', laboratorio: '',
      registro_sanitario: '', fecha_vencimiento: '', estado_registro: '',
      estado_producto: '', precio_publico: '', precio_medico: '',
      iva: '', formula_medica: ''
    });
    setShowEditModal(true);
  };

  const confirmDelete = (producto) => {
    setProductToDelete(producto);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('authToken');
      await axios.delete(`${API_BASE}/productos/${productToDelete.id}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
      });

      openSuccessModal('Producto eliminado', `El producto "${productToDelete.nombre}" fue eliminado correctamente.`);
      setShowDeleteModal(false);
      setProductToDelete(null);

      const nextPage = (productos.length === 1 && currentPage > 1) ? currentPage - 1 : currentPage;
      fetchProductos(nextPage);
    } catch (err) {
      setError('Error al eliminar el producto');
      console.error('Delete error:', err?.response?.data || err?.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  /**
   * Valida si un código YA existe.
   * 1) Revisión rápida local (página actual)
   * 2) Confirmación remota con /productos-all (fuente de verdad)
   */
  const existeCodigo = async (codigo) => {
    const normalize = (v) => String(v ?? '').trim();
    const code = normalize(codigo);
    if (!code) return false;

    // 1) Chequeo local contra la página actual
    const localHit = productos.some(p => normalize(p.codigo) === code);
    if (localHit) return true;

    // 2) Confirmación remota
    try {
      const token = localStorage.getItem('authToken');
      const headers = { Accept: 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      // Si tu backend soporta filtro por código, podrías hacer:
      // const res = await axios.get(`${API_BASE}/productos?filter_by=codigo&search=${encodeURIComponent(code)}`, { headers });
      // const list = res.data?.data ?? [];

      // Como ya usas productos-all:
      const resAll = await axios.get(`${API_BASE}/productos-all`, { headers });
      const all = Array.isArray(resAll.data) ? resAll.data : [];
      return all.some(p => normalize(p.codigo) === code);
    } catch (e) {
      console.warn('No se pudo confirmar duplicado con productos-all:', e?.response?.data || e?.message);
      // Si falla la confirmación, asumimos "no existe" para no bloquear al usuario
      return false;
    }
  };

  const handleSaveChanges = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };

      // Normalizar y limpiar formData
      const cleanFormData = Object.fromEntries(
        Object.entries(formData).map(([key, value]) => [
          key,
          typeof value === 'string' ? value.trim() : value
        ])
      );
      if ('iva' in cleanFormData) {
        cleanFormData.iva = normalizarIVANumero(cleanFormData.iva);
      }

      // === Validación preventiva SOLO para creación ===
      if (isNewProduct) {
        const dup = await existeCodigo(cleanFormData.codigo);
        if (dup) {
          openErrorModal(
            'Código duplicado',
            `El código "${cleanFormData.codigo}" ya está registrado. Por favor ingresa uno diferente.`
          );
          setLoading(false);
          return; // No seguimos con el POST
        }
      }

      // Crear o actualizar
      if (isNewProduct) {
        await axios.post(`${API_BASE}/productos`, cleanFormData, { headers });
        setShowEditModal(false);
        openSuccessModal('Producto creado', `El producto "${cleanFormData.nombre || cleanFormData.codigo}" se creó correctamente.`);
      } else {
        await axios.put(`${API_BASE}/productos/${editingProduct.id}`, cleanFormData, { headers });
        setShowEditModal(false);
        openSuccessModal('Producto actualizado', `El producto "${cleanFormData.nombre || editingProduct?.nombre}" se actualizó correctamente.`);
      }

      fetchProductos(currentPage);
    } catch (error) {
      console.error('Error guardando producto:', error.response?.data || error.message);
      if (error.response?.data?.errors) {
        const errorMsg = Object.values(error.response.data.errors).flat().join(', ');
        setError(errorMsg);
      } else {
        // Heurística por si backend devuelve 500 con pista de UNIQUE
        const body = error.response?.data;
        const texto = (typeof body === 'string' ? body : JSON.stringify(body || {})).toLowerCase();
        if (texto.includes('unique') || texto.includes('duplic') || texto.includes('23000')) {
          openErrorModal(
            'Código duplicado',
            `El código "${formData.codigo}" ya está registrado.`
          );
        } else {
          setError(isNewProduct ? 'Error al crear el producto' : 'Error al actualizar el producto');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${API_BASE}/productos-all`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        params: {
          search: searchTerm,
          filterBy: filterBy,
        },
      });

      const allProductos = response.data;

      const data = allProductos.map(producto => ({
        Código: producto.codigo,
        Nombre: producto.nombre,
        Precio_Público: producto.precio_publico,
        Precio_Médico: producto.precio_medico,
        Laboratorio: producto.laboratorio,
        Categoría: producto.categoria,
        Estado_Producto: producto.estado_producto,
        IVA: producto.iva,
        Fórmula_Médica: producto.formula_medica,
        Registro_Sanitario: producto.registro_sanitario,
        Fecha_Vencimiento: producto.fecha_vencimiento,
        Estado_Registro: producto.estado_registro,
        DAVID: producto.david
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Productos');
      XLSX.writeFile(wb, 'productos.xlsx');

      openSuccessModal('Exportación lista', 'El archivo "productos.xlsx" se generó correctamente.');

    } catch (error) {
      console.error('Error al exportar Excel:', error);
      setError('Error al exportar los productos.');
    }
  };

  /** ============ IMPORT PREVIEW (con correcciones) ============ */
  const handleImportPreview = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setImportPreview(null);

    try {
      if (!['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'].includes(file.type)) {
        throw new Error('Formato de archivo no válido. Solo se aceptan archivos Excel (.xlsx, .xls)');
      }

      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No se encontró el token de autenticación');
      }

      const fd = new FormData();
      fd.append('file', file);
      fd.append('timestamp', new Date().toISOString());

      const response = await axios.post(
        `${API_BASE}/productos/import-preview`,
        fd,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          },
          timeout: 60000
        }
      );

      if (!response.data || typeof response.data !== 'object') {
        throw new Error('La respuesta del servidor no es válida');
      }

      // Normalizamos la respuesta
      const processedData = {
        crear: Array.isArray(response.data.crear) ? response.data.crear : [],
        actualizar: Array.isArray(response.data.actualizar) ? response.data.actualizar : [],
        eliminar: Array.isArray(response.data.eliminar) ? response.data.eliminar : [],
        errores: Array.isArray(response.data.errores) ? response.data.errores : [],
        metadata: {
          total_nuevos: Number(response.data.total_nuevos) || 0,
          total_actualizar: Number(response.data.total_actualizar) || 0,
          total_eliminar: Number(response.data.total_eliminar) || 0,
          total_filas: Number(response.data.total_filas) || 0,
          filas_procesadas: Number(response.data.filas_procesadas) || 0,
          filas_con_errores: Number(response.data.filas_con_errores) || 0
        }
      };

      // 🔧 Corrección 1: si un código está en actualizar o eliminar, NO debe aparecer en crear
      const codigosActualizar = new Set(processedData.actualizar.map(x => String(x.codigo ?? x?.datos?.codigo ?? '').trim()).filter(Boolean));
      const codigosEliminar = new Set(processedData.eliminar.map(x => String(x.codigo ?? '').trim()).filter(Boolean));

      const crearFiltrado = processedData.crear.filter(item => {
        const code = String(item.codigo ?? item?.datos?.codigo ?? '').trim();
        if (!code) return true; // si no hay código, no podemos cruzar (se deja para que el usuario lo vea como "nuevo")
        return !codigosActualizar.has(code) && !codigosEliminar.has(code);
      });

      // Reemplazamos crear por el filtrado
      processedData.crear = crearFiltrado;

      // Si todo vino con errores, mostramos error global
      if (processedData.errores.length > 0 && processedData.errores.length === processedData.metadata.total_filas) {
        throw new Error('El archivo contiene errores en todas las filas. Revise el formato.');
      }

      setImportFile(file);
      setImportPreview(processedData);
      setShowImportPreview(true);

    } catch (error) {
      let errorMsg = 'Error al procesar el archivo';

      if (error.response) {
        if (error.response.status === 413) {
          errorMsg = 'El archivo es demasiado grande';
        } else if (error.response.data?.errors) {
          errorMsg = Object.values(error.response.data.errors).join(', ');
        } else {
          errorMsg = error.response.data?.message || `Error del servidor (${error.response.status})`;
        }
      } else if (error.message.includes('token')) {
        errorMsg = 'Sesión expirada. Por favor, vuelva a iniciar sesión';
      } else {
        errorMsg = error.message;
      }

      setError(errorMsg);
      console.error('Detalles del error:', {
        error: error.message,
        response: error.response?.data,
        stack: error.stack
      });

    } finally {
      setLoading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleConfirmImport = async () => {
    if (!importPreview) {
      setError('No hay datos de importación para confirmar');
      return;
    }

    setImporting(true);
    setShowImportPreview(false);

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No se encontró token de autenticación');
      }

      // Armamos payload limpio (por si el backend espera un formato concreto)
      const payload = {
        crear: importPreview.crear.map(item => item.datos || item),
        actualizar: importPreview.actualizar.map(item => ({
          codigo: item.codigo,
          ...(item.nuevo || item.datos || item)
        })),
        eliminar: importPreview.eliminar.map(item => ({ codigo: item.codigo || item }))
      };

      const response = await axios.put(
        `${API_BASE}/productos/import-confirm`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          timeout: 30000
        }
      );

      if (!response.data) {
        throw new Error('La respuesta del servidor está vacía');
      }

      // Modal de éxito para la importación
      const msg = [
        'La importación se completó correctamente:',
        `• Nuevos: ${response.data.creados || 0}`,
        `• Actualizados: ${response.data.actualizados || 0}`,
        `• Eliminados: ${response.data.eliminados || 0}`
      ].join('\n');
      openSuccessModal('✅ Importación completada', msg);

      await fetchProductos(1);

    } catch (error) {
      let errorMsg = 'Error al confirmar importación';

      if (error.code === 'ECONNABORTED') {
        errorMsg = 'El servidor no respondió a tiempo';
      } else if (error.response) {
        switch (error.response.status) {
          case 401:
            errorMsg = 'No autorizado - Token inválido o expirado';
            break;
          case 404:
            errorMsg = 'El producto no existe (404)';
            break;
          case 422:
            errorMsg = error.response.data.message || 'Datos de validación incorrectos';
            break;
          default:
            errorMsg = error.response.data?.message || `Error del servidor (${error.response.status})`;
        }
      } else if (error.message.includes('token')) {
        errorMsg = 'Problema de autenticación - Vuelve a iniciar sesión';
      }

      setError(errorMsg);
      console.error('Detalles del error:', {
        message: error.message,
        response: error.response?.data,
        config: error.config
      });

    } finally {
      setImporting(false);
      setImportFile(null);
      setImportPreview(null);
    }
  };

  useEffect(() => {
    // si quieres autocerrar el success modal a los 3s, descomenta:
    // if (successModal.show) {
    //   const t = setTimeout(() => closeSuccessModal(), 3000);
    //   return () => clearTimeout(t);
    // }
  }, [successModal.show]);

  // ======================
  // Render
  // ======================
  return (
    <div className="consulta-layout">
      <Navbar expand="lg" className="consulta-header">
        <Container fluid>
          <Navbar.Brand className="d-flex align-items-center">
            <img src={logo} alt="Logo" width="40" height="40" className="me-2" />
            <span
              className="consulta-title"
              role="link"
              style={{ cursor: 'pointer'}}
              onClick={() => navigate('/admin')}
              title="Ir al panel de administración"
            >
              BIBLIOTECALFH
            </span>
          </Navbar.Brand>
          <Button onClick={() => navigate('/admin')} className="logout-button">
            <i className="bi bi-arrow-left-circle me-1"></i> Volver
          </Button>
        </Container>
      </Navbar>

      <Container fluid className="consulta-content px-3 px-md-5">
        <Card className="consulta-card mt-4">
          <Card.Body>
            <h2 className="consulta-title-main mb-4 text-center text-md-start">
              Gestión de Productos
            </h2>

            <div className="d-flex flex-column flex-md-row gap-2 mb-4">
              <Button variant="info" onClick={() => setShowInstructions(true)}>
                Instrucciones
              </Button>
              <Button onClick={handleCreateClick} disabled={loading}>+ Crear Producto</Button>
              <Button variant="success" onClick={handleExportExcel}>Exportar Excel</Button>
              <Button variant="warning" onClick={() => document.getElementById('fileInputExcel').click()}>
                Importar Excel
              </Button>
              <input
                id="fileInputExcel"
                type="file"
                accept=".xlsx, .xls"
                style={{ display: 'none' }}
                onChange={handleImportPreview}
              />

              {/* Barra de búsqueda y filtros */}
              <Form className="d-flex flex-column flex-md-row gap-2 flex-grow-1">
                <FormControl
                  type="text"
                  placeholder={
                    filterBy === 'david'
                      ? 'Buscar por DAVID... (vacío = ver todos con DAVID)'
                      : filterBy === 'laboratorio'
                      ? 'Buscar por laboratorio...'
                      : 'Buscar por nombre, laboratorio o código...'
                  }
                  value={searchTerm}
                  onChange={handleSearchChange}
                  disabled={filterBy === 'inactivo'}
                />
                <Form.Select
                  value={filterBy}
                  onChange={handleFilterByChange}
                >
                  <option value="nombre">Nombre</option>
                  <option value="codigo">Código</option>
                  <option value="categoria">Categoría</option>
                  <option value="laboratorio">Laboratorio</option>
                  <option value="david">DAVID</option>
                  <option value="inactivo">INACTIVO</option>
                </Form.Select>
              </Form>
            </div>

            {loading && <div className="text-center mb-3">Cargando productos...</div>}
            {error && <Alert variant="danger">{error}</Alert>}

            <div className="product-list">
              {productos.length > 0 ? (
                productos.map((producto, index) => (
                  <div
                    className={`product-card ${producto.estado_producto?.toLowerCase() === 'inactivo' ? 'inactive' : ''}`}
                    key={index}
                  >
                    <div className="product-info">
                      <p><strong>Nombre:</strong> {producto.nombre}</p>
                      <p><strong>Precio Público con IVA:</strong> {mostrarPrecio(producto.precio_publico)}</p>
                      <p><strong>Precio Médico con IVA:</strong> {mostrarPrecio(producto.precio_medico)}</p>
                    </div>
                    <div className="card-actions">
                      <Button size="sm" variant="info" onClick={() => handleViewClick(producto)}>Ver</Button>
                      <Button size="sm" variant="primary" onClick={() => handleEditClick(producto)}>Editar</Button>
                      <Button size="sm" variant="danger" onClick={() => confirmDelete(producto)}>Eliminar</Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center">No hay productos disponibles</p>
              )}
            </div>

            {lastPage > 1 && (
              <div className="pagination-wrapper mt-3">
                <button
                  className={`pagination-btn ${loading ? 'opacity-50' : ''}`}
                  onClick={() => fetchProductos(currentPage - 1)}
                  disabled={currentPage === 1 || loading}
                >
                  <i className="bi bi-chevron-left"></i>
                </button>

                <span className="pagination-info">
                  {loading ? (
                    <Spinner animation="border" size="sm" />
                  ) : (
                    `${currentPage} / ${lastPage}`
                  )}
                </span>

                <button
                  className={`pagination-btn ${loading ? 'opacity-50' : ''}`}
                  onClick={() => fetchProductos(currentPage + 1)}
                  disabled={currentPage === lastPage || loading}
                >
                  <i className="bi bi-chevron-right"></i>
                </button>
              </div>
            )}
          </Card.Body>
        </Card>
      </Container>

      {/* Modal VER – diseño mejorado */}
      <Modal
        show={showViewModal}
        onHide={() => setShowViewModal(false)}
        centered
        dialogClassName="consulta-view-modal"
      >
        {(() => {
          const isInactive = viewingProduct?.estado_producto?.toLowerCase() === 'inactivo';
          const headerColor = isInactive ? '#dc3545' : '#0857b3';

          return (
            <>
              <Modal.Header
                closeButton
                style={{
                  backgroundColor: headerColor,
                  color: '#fff'
                }}
              >
                <Modal.Title className="d-flex align-items-center gap-2">
                  Detalles del Producto
                  {isInactive && (
                    <span
                      style={{
                        background: 'rgba(255,255,255,0.95)',
                        color: '#dc3545',
                        border: '1px solid rgba(255,255,255,0.65)',
                        padding: '4px 10px',
                        borderRadius: '999px',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                      title="Este producto está inactivo"
                    >
                      <i className="bi bi-slash-circle"></i>
                      INACTIVO
                    </span>
                  )}
                </Modal.Title>
              </Modal.Header>

              <Modal.Body style={{ background: '#f6f8fb' }}>
                {viewingProduct && (
                  <Row className="g-3">
                    {/* Panel Izquierdo */}
                    <Col md={6}>
                      <Card className="h-100 shadow-sm border-0">
                        <Card.Body className="p-3">
                          <div className="pe-md-2" style={{ fontSize: '0.98rem' }}>
                            <p><strong>Nombre:</strong> {viewingProduct.nombre}</p>
                            <p><strong>Estado Producto:</strong> {viewingProduct.estado_producto}</p>
                            <p><strong>Precio Público con IVA:</strong> {mostrarPrecio(viewingProduct.precio_publico)}</p>
                            <p><strong>Precio Médico con IVA:</strong> {mostrarPrecio(viewingProduct.precio_medico)}</p>
                            <p><strong>IVA:</strong> {formatearIVA(viewingProduct.iva)}</p>
                            <p><strong>Requiere Fórmula Médica:</strong> {viewingProduct.formula_medica}</p>
                            <p><strong>Laboratorio:</strong> {viewingProduct.laboratorio}</p>
                            <p><strong>Categoría:</strong> {viewingProduct.categoria}</p>
                            <p><strong>Estado Registro:</strong> {viewingProduct.estado_registro}</p>
                            <p><strong>Fecha Vencimiento registro:</strong> {viewingProduct.fecha_vencimiento}</p>
                            <p><strong>Registro Sanitario:</strong> {viewingProduct.registro_sanitario}</p>
                            <p className="mb-0"><strong>Código:</strong> {viewingProduct.codigo}</p>
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>

                    {/* Panel Derecho (DAVID) */}
                    <Col md={6}>
                      <Card className="h-100 shadow-sm border-0">
                        <Card.Header
                          className="bg-white"
                          style={{ borderBottom: '1px solid #eef1f5' }}
                        >
                          <h5 className="mb-0 d-flex align-items-center gap-2">
                            <i className="bi bi-journal-text"></i> DAVID
                          </h5>
                        </Card.Header>
                        <Card.Body className="p-3">
                          <div
                            style={{
                              whiteSpace: 'pre-wrap',
                              lineHeight: 1.6,
                              maxHeight: '48vh',
                              overflowY: 'auto'
                            }}
                          >
                            {viewingProduct.david || <span className="text-muted">Sin información</span>}
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
                )}
              </Modal.Body>
            </>
          );
        })()}
      </Modal>

      {/* Modal CREAR/EDITAR */}
      <Modal show={showEditModal} onHide={() => !loading && setShowEditModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{isNewProduct ? 'Crear Producto' : `Editar Producto: ${editingProduct?.nombre}`}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Código</Form.Label>
                  <Form.Control type="text" name="codigo" value={formData.codigo || ''} onChange={handleInputChange} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Nombre</Form.Label>
                  <Form.Control type="text" name="nombre" value={formData.nombre || ''} onChange={handleInputChange} />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>DAVID</Form.Label>
                  <Form.Control
                    as="textarea"
                    name="david"
                    rows={3}
                    style={{ resize: 'vertical', minHeight: 100, maxHeight: '60vh' }}
                    placeholder="Descripción / información extensa del producto"
                    value={formData.david || ''}
                    onChange={handleInputChange}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Categoría</Form.Label>
                  <Form.Control type="text" name="categoria" value={formData.categoria || ''} onChange={handleInputChange} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Laboratorio</Form.Label>
                  <Form.Control type="text" name="laboratorio" value={formData.laboratorio || ''} onChange={handleInputChange} />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Registro Sanitario</Form.Label>
                  <Form.Control type="text" name="registro_sanitario" value={formData.registro_sanitario || ''} onChange={handleInputChange} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Fecha de Vencimiento</Form.Label>
                  <Form.Control type="date" name="fecha_vencimiento" value={formData.fecha_vencimiento || ''} onChange={handleInputChange} />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Estado Registro</Form.Label>
                  <Form.Control type="text" name="estado_registro" value={formData.estado_registro || ''} onChange={handleInputChange} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Estado Producto</Form.Label>
                  <Form.Control type="text" name="estado_producto" value={formData.estado_producto || ''} onChange={handleInputChange} />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Precio Público</Form.Label>
                  <Form.Control type="number" name="precio_publico" value={formData.precio_publico || ''} onChange={handleInputChange} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Precio Médico</Form.Label>
                  <Form.Control type="number" name="precio_medico" value={formData.precio_medico || ''} onChange={handleInputChange} />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>IVA</Form.Label>
                  <Form.Control
                    type="text"
                    name="iva"
                    placeholder="Ej: 0.19 o 0.19%"
                    value={formData.iva || ''}
                    onChange={handleInputChange}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Fórmula Médica</Form.Label>
                  <Form.Control type="text" name="formula_medica" value={formData.formula_medica || ''} onChange={handleInputChange} />
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer className="d-flex flex-column flex-md-row gap-2">
          <Button variant="secondary" onClick={() => setShowEditModal(false)} disabled={loading}>Cancelar</Button>
          <Button variant="primary" onClick={handleSaveChanges} disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal INSTRUCCIONES */}
      <Modal show={showInstructions} onHide={() => setShowInstructions(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Guía para Importar Productos</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Card className="shadow-sm border-0">
            <Card.Body>
              <h5 className="mb-3 text-primary">Pasos para cargar productos desde Excel:</h5>
              <ul>
                <li className="text-danger fw-bold">
                  ⚠️ Asegúrate de que el archivo esté en formato <strong>.xlsx</strong> y <strong><u>descarga la base de datos antes de hacer cualquier modificación</u></strong>.
                </li>
                <li>El nombre de las columnas debe coincidir con los campos del sistema.</li>
                <li>Revisa que no haya celdas vacías en campos obligatorios como <strong>código</strong> o <strong>nombre</strong>.</li>
                <li>Haz clic en <strong>"Importar Excel"</strong> para seleccionar el archivo.</li>
                <li>Luego espera el mensaje de confirmación.</li>
                <li>Al momento de importar el archivo, veas errores si hay codigos repetidos o si algunos campos no están completos.</li>
              </ul>
              <Button
                as="a"
                href="/backend/plantillas/plantilla_productos.xlsx"
                download
                className="btn btn-success"
              >
                Descargar plantilla
              </Button>
              <hr />
              <p className="mb-0 text-muted"><i className="bi bi-info-circle me-2"></i>Si hay errores en el archivo, no se importará.</p>
            </Card.Body>
          </Card>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowInstructions(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal PREVIEW IMPORT (con Correcciones 1 y 2) */}
      <Modal show={showImportPreview} onHide={() => setShowImportPreview(false)} centered size="xl">
        <Modal.Header closeButton>
          <Modal.Title>
            Vista Previa de Importación
            {importPreview?.metadata && (
              <Badge bg="info" className="ms-2">
                Filas procesadas: {importPreview.metadata.filas_procesadas}/{importPreview.metadata.total_filas}
              </Badge>
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {importPreview && (
            <Tabs defaultActiveKey="crear" className="mb-3">
              <Tab eventKey="crear" title="Nuevos">
                {importPreview.crear?.length > 0 ? (
                  <div className="table-responsive">
                    <Table striped bordered hover className="align-middle">
                      <thead className="table-dark">
                        <tr>
                          <th>Código</th>
                          <th>Nombre</th>
                          <th>Precio Público</th>
                          <th>Precio Médico</th>
                          <th>Laboratorio</th>
                          <th>Categoría</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.crear.map((producto, index) => {
                          const precioPub = producto.precio_publico ?? producto.datos?.precio_publico;
                          const precioMed = producto.precio_medico ?? producto.datos?.precio_medico;
                          return (
                            <tr key={`new-${index}`}>
                              <td>{producto.codigo || producto.datos?.codigo}</td>
                              <td>{producto.nombre || producto.datos?.nombre || 'N/A'}</td>
                              <td>{mostrarPrecio(precioPub)}</td>
                              <td>{mostrarPrecio(precioMed)}</td>
                              <td>{producto.laboratorio || producto.datos?.laboratorio || 'N/A'}</td>
                              <td>{producto.categoria || producto.datos?.categoria || 'N/A'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  </div>
                ) : (
                  <Alert variant="info">No hay productos nuevos para crear</Alert>
                )}
              </Tab>

              <Tab eventKey="actualizar" title="Actualizar">
                {importPreview.actualizar?.length > 0 ? (
                  <div className="table-responsive">
                    <Table striped bordered hover className="align-middle">
                      <thead className="table-dark">
                        <tr>
                          <th>Código</th>
                          <th>Nombre</th>
                          <th>Campo</th>
                          <th>Valor Actual</th>
                          <th>Nuevo Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.actualizar.map((producto, index) => {
                          // Campos modificados: si backend manda lista, úsala; si no, derivamos del objeto "datos" o "nuevo"
                          const clavesNuevas = Object.keys(producto.datos || producto.nuevo || {});
                          const cambios = producto.campos_modificados?.length
                            ? producto.campos_modificados
                            : clavesNuevas;

                          return cambios.length > 0 ? (
                            cambios.map((campo, i) => {
                              const valActual = producto.actual ? producto.actual[campo] : undefined;
                              // 🔧 Corrección 2: tomar primero datos[campo], luego nuevo[campo], luego propio
                              const valNuevo  = (producto.datos?.[campo] ?? producto.nuevo?.[campo] ?? producto[campo]);

                              return (
                                <tr key={`update-${index}-${i}`}>
                                  <td>{producto.codigo}</td>
                                  <td>{producto.actual?.nombre || producto.nombre}</td>
                                  <td className="text-capitalize">{String(campo).replace('_', ' ')}</td>
                                  <td className="text-danger">
                                    {formatCampoValor(campo, valActual) || 'N/A'}
                                  </td>
                                  <td className="text-success">
                                    {formatCampoValor(campo, valNuevo) || 'N/A'}
                                  </td>
                                </tr>
                              );
                            })
                          ) : null;
                        }).filter(Boolean)}
                      </tbody>
                    </Table>
                  </div>
                ) : (
                  <Alert variant="info">No hay productos para actualizar</Alert>
                )}
              </Tab>

              <Tab eventKey="eliminar" title="Eliminar">
                {importPreview.eliminar?.length > 0 ? (
                  <div className="table-responsive">
                    <Table striped bordered hover className="align-middle">
                      <thead className="table-dark">
                        <tr>
                          <th>Código</th>
                          <th>Nombre</th>
                          <th>Laboratorio</th>
                          <th>Motivo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.eliminar.map((producto, index) => (
                          <tr key={`delete-${index}`}>
                            <td>{producto.codigo}</td>
                            <td>{producto.nombre}</td>
                            <td>{producto.laboratorio}</td>
                            <td>{producto.motivo || 'No está en el archivo Excel'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                ) : (
                  <Alert variant="info">No hay productos para eliminar</Alert>
                )}
              </Tab>

              <Tab eventKey="errores" title="Errores">
                {importPreview.errores?.length > 0 ? (
                  <div>
                    {importPreview.errores.map((error, index) => (
                      <Alert key={`error-${index}`} variant="danger" className="mb-2">
                        {error.mensaje || error.message || 'Error desconocido'}
                        {error.filas && (
                          <div className="mt-1">
                            <small>Filas afectadas: {error.filas.join(', ')}</small>
                          </div>
                        )}
                      </Alert>
                    ))}
                  </div>
                ) : (
                  <Alert variant="success">No se encontraron errores en el archivo</Alert>
                )}
              </Tab>
            </Tabs>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowImportPreview(false)}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirmImport}
            disabled={importing || (importPreview?.errores?.length || 0) > 0}
          >
            {importing ? (
              <>
                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                <span className="ms-2">Importando...</span>
              </>
            ) : 'Confirmar Importación'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal CONFIRMAR ELIMINACIÓN */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirmar Eliminación</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {productToDelete && (
            <p>
              ¿Estás seguro de que deseas eliminar el producto{' '}
              <b>{productToDelete.nombre}</b>{' '}
              {productToDelete.codigo ? <>con código <b>{productToDelete.codigo}</b></> : null}?
            </p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleConfirmDelete} disabled={loading}>
            Eliminar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de errores “bonito” */}
      <Modal show={errorModal.show} onHide={closeErrorModal} centered>
        <Modal.Header closeButton style={{ backgroundColor: '#dc3545', color: '#fff' }}>
          <Modal.Title>{errorModal.title || 'Atención'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div style={{ whiteSpace: 'pre-line' }}>{errorModal.message || 'Ha ocurrido un error.'}</div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={closeErrorModal}>
            Entendido
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de éxito “bonito” */}
      <Modal show={successModal.show} onHide={closeSuccessModal} centered>
        <Modal.Header closeButton style={{ backgroundColor: '#198754', color: '#fff' }}>
          <Modal.Title>{successModal.title || 'Operación exitosa'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div style={{ whiteSpace: 'pre-line' }}>{successModal.message || 'La operación se realizó correctamente.'}</div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="success" onClick={closeSuccessModal}>
            Perfecto
          </Button>
        </Modal.Footer>
      </Modal>

      <footer className="consulta-footer text-center py-3">
        © 2025 La Farmacia Homeopática - Más alternativas, más servicio.
      </footer>
    </div>
  );
};

export default Consulta;
