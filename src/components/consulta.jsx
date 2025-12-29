import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Container, Navbar, Form, FormControl, Button, Row, Col,
  Card, Modal, Alert, Spinner, Tabs, Tab, Table, Badge
} from 'react-bootstrap';
import * as XLSX from 'xlsx';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../assets/consulta.css';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.jpeg';
import api from '../api/api';

const PAGE_SIZE = 20;

// Proxy para ver PDFs (el mismo que esta en api.php)
const FILE_PROXY = `${window.location.origin}/backend/api/documentos/stream`;

const Consulta = () => {
  const navigate = useNavigate();

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
    if (valor === null || valor === undefined || valor === '') return '0%';

    let num = Number(String(valor).replace(',', '.'));
    if (Number.isNaN(num)) return '0%';

    if (num > 0 && num < 1) num = num * 100;
    return `${Math.round(num)}%`;
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

  const normalizarCodigosAsociados = (val) => {
    if (val === null || val === undefined) return [];
    if (Array.isArray(val)) {
      return Array.from(new Set(val.map((x) => String(x ?? '').trim()).filter(Boolean)));
    }
    const raw = String(val ?? '').trim();
    if (!raw) return [];
    const parts = raw
      .split(/[\n,;]+/g)
      .map((x) => String(x ?? '').trim())
      .filter(Boolean);
    return Array.from(new Set(parts));
  };

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

  const [importPreview, setImportPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [showImportPreview, setShowImportPreview] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  const [productDocs, setProductDocs] = useState([]);
  const [loadingProductDocs, setLoadingProductDocs] = useState(false);
  const [errorProductDocs, setErrorProductDocs] = useState(null);

  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loadingRelatedProducts, setLoadingRelatedProducts] = useState(false);
  const [errorRelatedProducts, setErrorRelatedProducts] = useState(null);

  // Cache de productos-all para paginación fluida en cliente
  const productosAllCacheRef = useRef(null);

  const [viewingRelatedProduct, setViewingRelatedProduct] = useState(null);
  const [showRelatedViewModal, setShowRelatedViewModal] = useState(false);

  const [relatedProductDocs2, setRelatedProductDocs2] = useState([]);
  const [loadingRelatedProductDocs2, setLoadingRelatedProductDocs2] = useState(false);
  const [errorRelatedProductDocs2, setErrorRelatedProductDocs2] = useState(null);

  const [relatedProducts2, setRelatedProducts2] = useState([]);
  const [loadingRelatedProducts2, setLoadingRelatedProducts2] = useState(false);
  const [errorRelatedProducts2, setErrorRelatedProducts2] = useState(null);

  // ===== Modales de error/éxito
  const [errorModal, setErrorModal] = useState({ show: false, title: '', message: '' });
  const openErrorModal = useCallback((modalTitle, message) => {
    setErrorModal({ show: true, title: modalTitle, message });
  }, []);
  const closeErrorModal = useCallback(() => {
    setErrorModal({ show: false, title: '', message: '' });
  }, []);

  const [successModal, setSuccessModal] = useState({ show: false, title: '', message: '' });
  const openSuccessModal = useCallback((modalTitle, message) => {
    setSuccessModal({ show: true, title: modalTitle, message });
  }, []);
  const closeSuccessModal = useCallback(() => {
    setSuccessModal({ show: false, title: '', message: '' });
  }, []);

  const logAction = useCallback(async (accion) => {
    try {
      await api.post('/trazabilidad', { accion });
    } catch (e) {
      console.warn('Trazabilidad no registrada:', e?.response?.data || e?.message);
    }
  }, []);

  // ===== Selección múltiple de cards + modal para editar SOLO estado_registro =====
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [showBulkEstadoModal, setShowBulkEstadoModal] = useState(false);
  const [bulkEstadoRegistro, setBulkEstadoRegistro] = useState('');

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const toggleSelected = useCallback((id) => {
    if (!id) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectedCount = selectedIds.size;

  const buildProductoUpdatePayload = useCallback((p, override = {}) => {
    const payload = {
      codigo: p?.codigo ?? '',
      nombre: p?.nombre ?? '',
      david: p?.david ?? '',
      categoria: p?.categoria ?? '',
      laboratorio: p?.laboratorio ?? '',
      registro_sanitario: p?.registro_sanitario ?? '',
      fecha_vencimiento: p?.fecha_vencimiento ?? '',
      estado_registro: p?.estado_registro ?? '',
      estado_producto: p?.estado_producto ?? '',
      precio_publico: p?.precio_publico ?? '',
      precio_medico: p?.precio_medico ?? '',
      iva: normalizarIVANumero(p?.iva ?? ''),
      formula_medica: p?.formula_medica ?? '',
      productos_asociados: (() => {
        const codigos = normalizarCodigosAsociados(
          p?.productos_asociados ?? p?.productos_relacionados
        );
        return codigos.join(', ');
      })(),
      ...override,
    };

    return Object.fromEntries(
      Object.entries(payload).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])
    );
  }, []);

  // ===== Paginación en cliente =====
  const paginarCliente = useCallback((lista, page) => {
    const total = lista.length;
    const lp = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const safePage = Math.min(Math.max(1, page), lp);
    const start = (safePage - 1) * PAGE_SIZE;
    const slice = lista.slice(start, start + PAGE_SIZE);
    setProductos(slice);
    setCurrentPage(safePage);
    setLastPage(lp);
  }, []);

  // ===== Cargar productos =====
  const fetchProductos = useCallback(async (page = 1) => {
    setError(null);

    const validTextFilters = [
      'nombre', 'codigo', 'categoria', 'precio_publico', 'precio_medico', 'laboratorio'
    ];

    const applyFiltersAndPaginate = (all) => {
      const term = searchTerm.trim().toLowerCase();

      // INACTIVO
      if (filterBy === 'inactivo') {
        const inactivos = (all || []).filter(
          (p) => String(p?.estado_producto || '').toLowerCase() === 'inactivo'
        );
        paginarCliente(inactivos, page);
        return;
      }

      // DAVID (vacío = todos con david)
      if (filterBy === 'david') {
        const filtered = term
          ? (all || []).filter(p => String(p?.david ?? '').toLowerCase().includes(term))
          : (all || []).filter(p => String(p?.david ?? '').trim() !== '');
        paginarCliente(filtered, page);
        return;
      }

      // Filtros normales (texto)
      const filterToUse = validTextFilters.includes(filterBy) ? filterBy : 'nombre';
      let filtered = all || [];

      if (term !== '') {
        filtered = filtered.filter((p) => {
          const value = p?.[filterToUse];
          return String(value ?? '').toLowerCase().includes(term);
        });
      }

      paginarCliente(filtered, page);
    };

    try {
      if (productosAllCacheRef.current) {
        applyFiltersAndPaginate(productosAllCacheRef.current);
        return;
      }

      // Si no hay cache, se carga una sola vez
      setLoading(true);

      const resp = await api.get('/productos-all');
      const all = Array.isArray(resp.data) ? resp.data : [];
      productosAllCacheRef.current = all;

      applyFiltersAndPaginate(all);
    } catch (err) {
      if (err?.response?.status === 401) {
        openErrorModal('Sesión expirada', 'Tu sesión ha expirado. Inicia sesión nuevamente.');
        navigate('/');
        return;
      }
      setError('Error al cargar los productos');
      console.error('Error cargando productos:', err?.response?.data || err?.message);
      setProductos([]);
      setCurrentPage(1);
      setLastPage(1);
    } finally {
      setLoading(false);
    }
  }, [filterBy, searchTerm, navigate, openErrorModal, paginarCliente]);

  const updateEstadoRegistroBulk = useCallback(async (nuevoEstado) => {
    const nuevo = String(nuevoEstado ?? '').trim();
    if (!nuevo) {
      openErrorModal('Campo requerido', 'Por favor selecciona un Estado Registro.');
      return;
    }

    try {
      if (!productosAllCacheRef.current) {
        const resp = await api.get('/productos-all');
        productosAllCacheRef.current = Array.isArray(resp.data) ? resp.data : [];
      }
    } catch (err) {
      if (err?.response?.status === 401) {
        openErrorModal('Sesión expirada', 'Tu sesión ha expirado. Inicia sesión nuevamente.');
        navigate('/');
        return;
      }
      console.error('No se pudo cargar productos-all:', err?.response?.data || err?.message);
      openErrorModal('Error', 'No fue posible preparar la actualización. Intenta nuevamente.');
      return;
    }

    const all = productosAllCacheRef.current || [];
    const selectedProducts = all.filter((p) => selectedIds.has(p?.id));

    if (selectedProducts.length === 0) {
      openErrorModal('Sin selección', 'Selecciona al menos un producto.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const results = await Promise.allSettled(
        selectedProducts.map((p) => {
          const payload = buildProductoUpdatePayload(p, { estado_registro: nuevo });
          return api.put(`/productos/${p.id}`, payload);
        })
      );

      const rejected = results.filter((r) => r.status === 'rejected');

      if (rejected.length > 0) {
        console.error(
          'Error actualizando estado_registro (bulk):',
          rejected.map((r) => r.reason?.response?.data || r.reason)
        );

        const first = rejected[0]?.reason;
        if (first?.response?.status === 401) {
          openErrorModal('Sesión expirada', 'Tu sesión ha expirado. Inicia sesión nuevamente.');
          navigate('/');
          return;
        }

        openErrorModal(
          'Error al actualizar',
          'No fue posible actualizar el Estado Registro en uno o más productos. Revisa la consola para ver el detalle.'
        );
        return;
      }

      openSuccessModal(
        'Actualización completada',
        `Se actualizó el Estado Registro en ${selectedProducts.length} producto(s).`
      );
      await logAction(`Actualizó Estado Registro (bulk) en ${selectedProducts.length} producto(s)`);

      // invalidar cache para refrescar listado
      productosAllCacheRef.current = null;

      // refrescar vista y limpiar selección
      clearSelection();
      setShowBulkEstadoModal(false);
      setBulkEstadoRegistro('');

      fetchProductos(currentPage);
    } catch (err) {
      if (err?.response?.status === 401) {
        openErrorModal('Sesión expirada', 'Tu sesión ha expirado. Inicia sesión nuevamente.');
        navigate('/');
        return;
      }
      console.error('Error actualizando estado_registro (bulk):', err?.response?.data || err);
      openErrorModal(
        'Error al actualizar',
        'No fue posible actualizar el Estado Registro. Revisa la conexión e intenta nuevamente.'
      );
    } finally {
      setLoading(false);
    }
  }, [
    buildProductoUpdatePayload,
    clearSelection,
    currentPage,
    fetchProductos,
    logAction,
    navigate,
    openErrorModal,
    openSuccessModal,
    selectedIds
  ]);

  useEffect(() => {
    fetchProductos(currentPage);
  }, [currentPage, fetchProductos]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
    clearSelection();
  };

  const handleFilterByChange = (e) => {
    const val = e.target.value;
    setFilterBy(val);
    setCurrentPage(1);
    if (val === 'inactivo') setSearchTerm('');
    clearSelection();
  };

  // Texto “Mostrando X - Y de …”
  const showing = useMemo(() => {
    const totalKnown = (currentPage - 1) * PAGE_SIZE + (productos?.length || 0);
    const start = productos.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
    const end = (currentPage - 1) * PAGE_SIZE + (productos?.length || 0);
    return { start, end, totalKnown };
  }, [currentPage, productos]);

  // ===== Documentos asociados =====
  const fetchProductDocs = useCallback(async (producto) => {
    if (!producto || !producto.codigo) {
      setProductDocs([]);
      setErrorProductDocs(null);
      return;
    }
    setLoadingProductDocs(true);
    setErrorProductDocs(null);
    try {
      const { data } = await api.get('/documentos', {
        params: { producto_codigo: producto.codigo }
      });
      setProductDocs(Array.isArray(data?.data) ? data.data : []);
    } catch (err) {
      console.error('Error cargando documentos del producto:', err?.response?.data || err?.message);
      setErrorProductDocs('Error al cargar los documentos asociados.');
      setProductDocs([]);
    } finally {
      setLoadingProductDocs(false);
    }
  }, []);

  // ===== Productos asociados (reemplazos) =====
  const fetchRelatedProducts = useCallback(async (producto) => {
    setRelatedProducts([]);
    setErrorRelatedProducts(null);

    const codigos = normalizarCodigosAsociados(producto?.productos_asociados ?? producto?.productos_relacionados);
    if (!producto || codigos.length === 0) return;

    setLoadingRelatedProducts(true);
    try {
      if (!productosAllCacheRef.current) {
        const resp = await api.get('/productos-all');
        productosAllCacheRef.current = Array.isArray(resp.data) ? resp.data : [];
      }

      const all = productosAllCacheRef.current || [];
      const setCodigos = new Set(codigos.map((c) => String(c).trim()));
      const encontrados = all.filter((p) => setCodigos.has(String(p?.codigo ?? '').trim()));

      const mapByCode = new Map(encontrados.map((p) => [String(p.codigo).trim(), p]));
      const ordered = codigos.map((c) => mapByCode.get(String(c).trim())).filter(Boolean);

      setRelatedProducts(ordered);
    } catch (err) {
      console.error('Error cargando productos asociados:', err?.response?.data || err?.message);
      setErrorRelatedProducts('Error al cargar los productos asociados.');
      setRelatedProducts([]);
    } finally {
      setLoadingRelatedProducts(false);
    }
  }, []);

  const fetchProductDocs2 = useCallback(async (producto) => {
    if (!producto || !producto.codigo) {
      setRelatedProductDocs2([]);
      setErrorRelatedProductDocs2(null);
      return;
    }
    setLoadingRelatedProductDocs2(true);
    setErrorRelatedProductDocs2(null);
    try {
      const { data } = await api.get('/documentos', {
        params: { producto_codigo: producto.codigo }
      });
      setRelatedProductDocs2(Array.isArray(data?.data) ? data.data : []);
    } catch (err) {
      console.error('Error cargando documentos del producto (modal relacionado):', err?.response?.data || err?.message);
      setErrorRelatedProductDocs2('Error al cargar los documentos asociados.');
      setRelatedProductDocs2([]);
    } finally {
      setLoadingRelatedProductDocs2(false);
    }
  }, []);

  const fetchRelatedProducts2 = useCallback(async (producto) => {
    setRelatedProducts2([]);
    setErrorRelatedProducts2(null);

    const codigos = normalizarCodigosAsociados(producto?.productos_asociados ?? producto?.productos_relacionados);
    if (!producto || codigos.length === 0) return;

    setLoadingRelatedProducts2(true);
    try {
      if (!productosAllCacheRef.current) {
        const resp = await api.get('/productos-all');
        productosAllCacheRef.current = Array.isArray(resp.data) ? resp.data : [];
      }

      const all = productosAllCacheRef.current || [];
      const setCodigos = new Set(codigos.map((c) => String(c).trim()));
      const encontrados = all.filter((p) => setCodigos.has(String(p?.codigo ?? '').trim()));

      const mapByCode = new Map(encontrados.map((p) => [String(p.codigo).trim(), p]));
      const ordered = codigos.map((c) => mapByCode.get(String(c).trim())).filter(Boolean);

      setRelatedProducts2(ordered);
    } catch (err) {
      console.error('Error cargando productos asociados (modal relacionado):', err?.response?.data || err?.message);
      setErrorRelatedProducts2('Error al cargar los productos asociados.');
      setRelatedProducts2([]);
    } finally {
      setLoadingRelatedProducts2(false);
    }
  }, []);

  const handleViewClick = (producto) => {
    setViewingProduct(producto);
    setShowViewModal(true);
    fetchProductDocs(producto);
    fetchRelatedProducts(producto);
  };

  const handleOpenRelatedProduct = (productoRelacionado) => {
    if (!productoRelacionado) return;

    setViewingRelatedProduct(productoRelacionado);
    setShowRelatedViewModal(true);

    fetchProductDocs2(productoRelacionado);
    fetchRelatedProducts2(productoRelacionado);
  };

  const handleEditClick = (producto) => {
    setIsNewProduct(false);
    setEditingProduct(producto);

    const codigos = normalizarCodigosAsociados(producto?.productos_asociados ?? producto?.productos_relacionados);
    setFormData({
      ...producto,
      productos_asociados: codigos.join(', ')
    });

    setShowEditModal(true);
  };

  const handleCreateClick = () => {
    setIsNewProduct(true);
    setEditingProduct(null);
    setFormData({
      codigo: '', nombre: '', david: '', categoria: '', laboratorio: '',
      registro_sanitario: '', fecha_vencimiento: '', estado_registro: '',
      estado_producto: '', precio_publico: '', precio_medico: '',
      iva: '', formula_medica: '',
      productos_asociados: ''
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
      await api.delete(`/productos/${productToDelete.id}`);

      openSuccessModal('Producto eliminado', `El producto "${productToDelete.nombre}" fue eliminado correctamente.`);
      await logAction(`Eliminó el producto ID ${productToDelete.id} (${productToDelete.nombre || productToDelete.codigo || ''})`);

      setShowDeleteModal(false);
      setProductToDelete(null);

      // invalidar cache para que el listado quede actualizado
      productosAllCacheRef.current = null;

      const nextPage = (productos.length === 1 && currentPage > 1) ? currentPage - 1 : currentPage;
      fetchProductos(nextPage);
    } catch (err) {
      if (err?.response?.status === 401) {
        openErrorModal('Sesión expirada', 'Tu sesión ha expirado. Inicia sesión nuevamente.');
        navigate('/');
        return;
      }
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

  const existeCodigo = async (codigo) => {
    const normalize = (v) => String(v ?? '').trim();
    const code = normalize(codigo);
    if (!code) return false;

    const localHit = productos.some(p => normalize(p.codigo) === code);
    if (localHit) return true;

    try {
      const resAll = await api.get('/productos-all');
      const all = Array.isArray(resAll.data) ? resAll.data : [];
      return all.some(p => normalize(p.codigo) === code);
    } catch (e) {
      console.warn('No se pudo confirmar duplicado con productos-all:', e?.response?.data || e?.message);
      return false;
    }
  };

  const handleSaveChanges = async () => {
    setLoading(true);
    try {
      const cleanFormData = Object.fromEntries(
        Object.entries(formData).map(([key, value]) => [
          key,
          typeof value === 'string' ? value.trim() : value
        ])
      );
      if ('iva' in cleanFormData) {
        cleanFormData.iva = normalizarIVANumero(cleanFormData.iva);
      }

      if ('productos_asociados' in cleanFormData) {
        const codigos = normalizarCodigosAsociados(cleanFormData.productos_asociados);
        cleanFormData.productos_asociados = codigos.join(', ');
      }

      if (isNewProduct) {
        const dup = await existeCodigo(cleanFormData.codigo);
        if (dup) {
          openErrorModal(
            'Código duplicado',
            `El código "${cleanFormData.codigo}" ya está registrado. Por favor ingresa uno diferente.`
          );
          setLoading(false);
          return;
        }
      }

      if (isNewProduct) {
        await api.post('/productos', cleanFormData);
        setShowEditModal(false);
        openSuccessModal('Producto creado', `El producto "${cleanFormData.nombre || cleanFormData.codigo}" se creó correctamente.`);
        await logAction(`Creó el producto "${cleanFormData.nombre || cleanFormData.codigo}"`);
      } else {
        await api.put(`/productos/${editingProduct.id}`, cleanFormData);
        setShowEditModal(false);
        openSuccessModal('Producto actualizado', `El producto "${cleanFormData.nombre || editingProduct?.nombre}" se actualizó correctamente.`);
        await logAction(`Actualizó el producto ID ${editingProduct.id} (${cleanFormData.nombre || editingProduct?.nombre || editingProduct?.codigo || ''})`);
      }

      // invalidar cache para refrescar listado
      productosAllCacheRef.current = null;

      fetchProductos(currentPage);
    } catch (errorResp) {
      if (errorResp?.response?.status === 401) {
        openErrorModal('Sesión expirada', 'Tu sesión ha expirado. Inicia sesión nuevamente.');
        navigate('/');
        return;
      }
      console.error('Error guardando producto:', errorResp?.response?.data || errorResp?.message);
      if (errorResp?.response?.data?.errors) {
        const errorMsg = Object.values(errorResp.response.data.errors).flat().join(', ');
        setError(errorMsg);
      } else {
        const body = errorResp?.response?.data;
        const texto = (typeof body === 'string' ? body : JSON.stringify(body || {})).toLowerCase();
        if (texto.includes('unique') || texto.includes('duplic') || texto.includes('23000')) {
          openErrorModal('Código duplicado', `El código "${formData.codigo}" ya está registrado.`);
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
      const response = await api.get('/productos-all', {
        params: { search: searchTerm, filterBy }
      });

      const allProductos = response.data || [];

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
        DAVID: producto.david,
        Productos_Asociados: Array.isArray(producto.productos_asociados)
          ? producto.productos_asociados.join(', ')
          : (producto.productos_asociados || '')
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Productos');
      XLSX.writeFile(wb, 'productos.xlsx');

      openSuccessModal('Exportación lista', 'El archivo "productos.xlsx" se generó correctamente.');
      await logAction('Exportó el catálogo completo a Excel');
    } catch (errorResp) {
      if (errorResp?.response?.status === 401) {
        openErrorModal('Sesión expirada', 'Tu sesión ha expirado. Inicia sesión nuevamente.');
        navigate('/');
        return;
      }
      console.error('Error al exportar Excel:', errorResp);
      setError('Error al exportar los productos.');
    }
  };

  const handleImportPreview = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setImportPreview(null);

    try {
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];
      if (!validTypes.includes(file.type)) {
        throw new Error('Formato de archivo no válido. Solo se aceptan archivos Excel (.xlsx, .xls)');
      }

      const fd = new FormData();
      fd.append('file', file);
      fd.append('timestamp', new Date().toISOString());

      const response = await api.post('/productos/import-preview', fd, { timeout: 60000 });

      if (!response.data || typeof response.data !== 'object') {
        throw new Error('La respuesta del servidor no es válida');
      }

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

      const codigosActualizar = new Set(
        processedData.actualizar.map(x => String(x.codigo ?? x?.datos?.codigo ?? '').trim()).filter(Boolean)
      );
      const codigosEliminar = new Set(
        processedData.eliminar.map(x => String(x.codigo ?? '').trim()).filter(Boolean)
      );

      const crearFiltrado = processedData.crear.filter(item => {
        const code = String(item.codigo ?? item?.datos?.codigo ?? '').trim();
        if (!code) return true;
        return !codigosActualizar.has(code) && !codigosEliminar.has(code);
      });

      processedData.crear = crearFiltrado;

      if (
        processedData.errores.length > 0 &&
        processedData.metadata.total_filas &&
        processedData.errores.length === processedData.metadata.total_filas
      ) {
        throw new Error('El archivo contiene errores en todas las filas. Revise el formato.');
      }

      setImportPreview(processedData);
      setShowImportPreview(true);

    } catch (err) {
      let errorMsg = 'Error al procesar el archivo';

      if (err.response) {
        if (err.response.status === 413) {
          errorMsg = 'El archivo es demasiado grande';
        } else if (err.response.data?.errors) {
          errorMsg = Object.values(err.response.data.errors).join(', ');
        } else {
          errorMsg = err.response.data?.message || `Error del servidor (${err.response.status})`;
        }
      } else if (err.message?.toLowerCase().includes('token')) {
        errorMsg = 'Sesión expirada. Por favor, vuelve a iniciar sesión';
      } else {
        errorMsg = err.message;
      }

      setError(errorMsg);
      console.error('Detalles del error import-preview:', {
        error: err.message,
        response: err.response?.data,
        stack: err.stack
      });

    } finally {
      setLoading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleImportError = (err) => {
    let errorMsg = 'Error al confirmar importación';
    if (err.code === 'ECONNABORTED') {
      errorMsg = 'El servidor no respondió a tiempo';
    } else if (err.response) {
      switch (err.response.status) {
        case 401: errorMsg = 'No autorizado - Token inválido o expirado'; break;
        case 404: errorMsg = 'Ruta no encontrada o método bloqueado (404)'; break;
        case 405: errorMsg = 'Método no permitido (405)'; break;
        case 422: errorMsg = err.response.data.message || 'Datos de validación incorrectos'; break;
        default: errorMsg = err.response.data?.message || `Error del servidor (${err.response.status})`;
      }
    } else if (err.message?.toLowerCase().includes('token')) {
      errorMsg = 'Problema de autenticación - Vuelve a iniciar sesión';
    }
    setError(errorMsg);
    console.error('Detalles del error import-confirm:', {
      message: err.message,
      status: err.response?.status,
      response: err.response?.data,
      config: err.config
    });
  };

  const handleConfirmImport = async () => {
    if (!importPreview) {
      setError('No hay datos de importación para confirmar');
      return;
    }

    setImporting(true);
    setShowImportPreview(false);

    try {
      const payload = {
        crear: importPreview.crear.map(item => item.datos || item),
        actualizar: importPreview.actualizar.map(item => ({
          codigo: item.codigo,
          ...(item.nuevo || item.datos || item)
        })),
        eliminar: importPreview.eliminar.map(item => ({ codigo: item.codigo || item }))
      };

      const response = await api.post('/productos/import-confirm', payload, { timeout: 30000 });

      if (!response?.data) {
        throw new Error('La respuesta del servidor está vacía');
      }

      const msg = [
        'La importación se completó correctamente:',
        `• Nuevos: ${response.data.creados || 0}`,
        `• Actualizados: ${response.data.actualizados || 0}`,
        `• Eliminados: ${response.data.eliminados || 0}`
      ].join('\n');
      openSuccessModal(' Importación completada', msg);

      await logAction('Confirmó importación de productos desde Excel');

      // invalidar cache para que el listado quede actualizado
      productosAllCacheRef.current = null;

      await fetchProductos(1);
      setCurrentPage(1);

    } catch (err) {
      if (err?.response?.status === 401) {
        openErrorModal('Sesión expirada', 'Tu sesión ha expirado. Inicia sesión nuevamente.');
        navigate('/');
        return;
      }
      handleImportError(err);
    } finally {
      setImporting(false);
      setImportPreview(null);
    }
  };

  const openDocumento = (doc) => {
    const rawPath =
      doc.ruta ||
      doc.path ||
      doc.archivo ||
      doc.file_path ||
      doc.storage_path;

    if (!rawPath) return;

    const url = `${FILE_PROXY}?path=${encodeURIComponent(rawPath)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="consulta-layout">
      <Navbar expand="lg" className="consulta-header">
        <Container fluid>
          <Navbar.Brand className="d-flex align-items-center">
            <img src={logo} alt="Logo" width="40" height="40" className="me-2" />
            <span
              className="consulta-title"
              role="link"
              style={{ cursor: 'pointer' }}
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

            <div className="rs-filters-panel mb-3">
              <Row className="g-2 align-items-end">
                <Col xs={12} lg="auto" className="d-flex flex-wrap gap-2">
                  <Button variant="info" onClick={() => setShowInstructions(true)}>
                    Instrucciones
                  </Button>
                  <Button onClick={handleCreateClick} disabled={loading}>
                    + Crear Producto
                  </Button>
                  <Button variant="success" onClick={handleExportExcel}>
                    Exportar Excel
                  </Button>
                  <Button
                    variant="warning"
                    onClick={() => document.getElementById('fileInputExcel').click()}
                    disabled={loading}
                  >
                    Importar Excel
                  </Button>

                  {/* Botón bulk */}
                  <Button
                    variant="primary"
                    disabled={selectedCount === 0 || loading}
                    onClick={() => setShowBulkEstadoModal(true)}
                    title={selectedCount === 0 ? 'Selecciona uno o más productos' : 'Editar Estado Registro'}
                  >
                    Editar Estado Registro{selectedCount > 0 ? ` (${selectedCount})` : ''}
                  </Button>

                  <input
                    id="fileInputExcel"
                    type="file"
                    accept=".xlsx, .xls"
                    style={{ display: 'none' }}
                    onChange={handleImportPreview}
                  />
                </Col>

                <Col xs={12} lg className="ms-lg-auto">
                  <Row className="g-2 align-items-end">
                    <Col xs={12} md={8}>
                      <Form.Label className="fw-semibold mb-1">Búsqueda</Form.Label>
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
                    </Col>

                    <Col xs={12} md={4}>
                      <Form.Label className="fw-semibold mb-1">Buscar por</Form.Label>
                      <Form.Select value={filterBy} onChange={handleFilterByChange}>
                        <option value="nombre">Nombre</option>
                        <option value="codigo">Código</option>
                        <option value="categoria">Categoría</option>
                        <option value="laboratorio">Laboratorio</option>
                        <option value="david">DAVID</option>
                        <option value="inactivo">INACTIVO</option>
                      </Form.Select>
                    </Col>
                  </Row>
                </Col>
              </Row>
            </div>

            {loading && (
              <div className="text-center mb-3">
                <Spinner animation="border" size="sm" className="me-2" />
                Cargando productos...
              </div>
            )}
            {error && <Alert variant="danger">{error}</Alert>}

            <Row className="g-3 rs-grid">
              {productos.length > 0 ? (
                productos.map((producto, index) => {
                  const inactive = producto.estado_producto?.toLowerCase() === 'inactivo';
                  const isSelected = selectedIds.has(producto?.id);

                  // Si el filtro activo es "inactivo", borde rojo para TODAS las cards mostradas
                  const isInactivoFilter = filterBy === 'inactivo';

                  return (
                    <Col
                      key={producto.id ?? producto.codigo ?? index}
                      xs={12}
                      sm={6}
                      lg={4}
                      xl={3}
                      className="d-flex"
                    >
                      <div
                        className={`rs-card w-100 ${inactive ? 'rs-card--inactive' : ''}`}
                        style={{
                          // Borde rojo cuando filtras por INACTIVO
                          ...(isInactivoFilter
                            ? { border: '2px solid #dc3545' }
                            : null),

                          // Mantener el resaltado azul de selección
                          ...(isSelected
                            ? { outline: '3px solid #0d6efd', outlineOffset: '2px' }
                            : null),

                          position: 'relative'
                        }}
                      >
                        {/* Checkbox selección */}
                        <div
                          style={{
                            position: 'absolute',
                            top: 10,
                            right: 10,
                            zIndex: 2,
                            background: 'rgba(255,255,255,0.9)',
                            borderRadius: 8,
                            padding: '4px 8px',
                            border: '1px solid rgba(0,0,0,0.08)',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Form.Check
                            type="checkbox"
                            id={`select-${producto.id ?? producto.codigo ?? index}`}
                            checked={isSelected}
                            onChange={() => toggleSelected(producto?.id)}
                            aria-label="Seleccionar producto"
                          />
                        </div>

                        <div className="rs-card-body">
                          <div className="rs-name">
                            {producto.nombre || '-'}
                          </div>

                          <div className="rs-line">
                            <strong>Precio Público con IVA:</strong> {mostrarPrecio(producto.precio_publico) || '-'}
                          </div>

                          <div className="rs-line">
                            <strong>Precio Médico con IVA:</strong> {mostrarPrecio(producto.precio_medico) || '-'}
                          </div>

                          <div className="rs-line">
                            <strong>Código:</strong> {producto.codigo || '-'}
                          </div>

                          <div className="rs-line">
                            <strong>Laboratorio:</strong> {producto.laboratorio || '-'}
                          </div>

                          <div className="rs-line">
                            <strong>Estado producto:</strong> {producto.estado_producto || '-'}
                          </div>

                          <div className="mt-auto d-flex gap-2 flex-wrap justify-content-center">
                            <Button
                              size="sm"
                              variant="info"
                              onClick={(e) => { e.stopPropagation(); handleViewClick(producto); }}
                            >
                              Ver
                            </Button>
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={(e) => { e.stopPropagation(); handleEditClick(producto); }}
                            >
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={(e) => { e.stopPropagation(); confirmDelete(producto); }}
                            >
                              Eliminar
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Col>
                  );
                })
              ) : (
                <Col xs={12}>
                  <p className="text-center mb-0">No hay productos disponibles</p>
                </Col>
              )}
            </Row>


            {lastPage > 1 && (
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mt-3 gap-2">
                <div style={{ fontSize: '0.95rem' }}>
                  Mostrando{' '}
                  <strong>
                    {productos.length === 0 ? 0 : showing.start}
                    {' - '}
                    {showing.end}
                  </strong>{' '}
                  de <strong>{(currentPage < lastPage) ? `más de ${showing.totalKnown}` : showing.totalKnown}</strong>
                </div>

                <div className="d-flex gap-2 flex-wrap justify-content-center">
                  <Button
                    variant="outline-light"
                    onClick={() => fetchProductos(1)}
                    disabled={currentPage === 1 || loading}
                    title="Primera página"
                  >
                    ⏮
                  </Button>

                  <Button
                    variant="outline-light"
                    onClick={() => fetchProductos(currentPage - 1)}
                    disabled={currentPage === 1 || loading}
                    title="Página anterior"
                  >
                    ◀
                  </Button>

                  <Button variant="light" disabled title="Página actual">
                    {loading ? (
                      <Spinner animation="border" size="sm" />
                    ) : (
                      `${currentPage} / ${lastPage}`
                    )}
                  </Button>

                  <Button
                    variant="outline-light"
                    onClick={() => fetchProductos(currentPage + 1)}
                    disabled={currentPage === lastPage || loading}
                    title="Página siguiente"
                  >
                    ▶
                  </Button>

                  <Button
                    variant="outline-light"
                    onClick={() => fetchProductos(lastPage)}
                    disabled={currentPage === lastPage || loading}
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

      {/* Modal editar SOLO Estado Registro */}
      <Modal
        show={showBulkEstadoModal}
        onHide={() => !loading && setShowBulkEstadoModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Editar Estado Registro</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info" className="mb-3">
            Se actualizará el <b>Estado Registro</b> de <b>{selectedCount}</b> producto(s).
          </Alert>

          <Form.Group>
            <Form.Label>Nuevo Estado Registro</Form.Label>
            <Form.Select
              value={bulkEstadoRegistro}
              onChange={(e) => setBulkEstadoRegistro(e.target.value)}
              disabled={loading}
            >
              <option value="">Selecciona...</option>
              <option value="vigente">vigente</option>
              <option value="vencido">vencido</option>
              <option value="en tramite de renovacion">en tramite de renovacion</option>
              <option value="suspendido">suspendido</option>
              <option value="no requiere">no requiere</option>
            </Form.Select>
            <div className="text-muted mt-2" style={{ fontSize: '0.85rem' }}>
              Solo se modificará el campo <b>estado_registro</b>. El resto de campos se envían únicamente para evitar error 422 del backend.
            </div>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer className="d-flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setShowBulkEstadoModal(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={() => updateEstadoRegistroBulk(bulkEstadoRegistro)}
            disabled={loading || selectedCount === 0}
          >
            {loading ? 'Guardando...' : 'Guardar'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* =======================
          MODALES
         ======================= */}

      {/* Modal VER (Producto inicial) */}
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
              <Modal.Header closeButton style={{ backgroundColor: headerColor, color: '#fff' }}>
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

                    <Col md={6}>
                      <Card className="h-100 shadow-sm border-0">
                        <Card.Header className="bg-white" style={{ borderBottom: '1px solid #eef1f5' }}>
                          <h5 className="mb-0 d-flex align-items-center gap-2">
                            <i className="bi bi-journal-text"></i> DAVID
                          </h5>
                        </Card.Header>
                        <Card.Body className="p-3">
                          <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, maxHeight: '24vh', overflowY: 'auto' }}>
                            {viewingProduct.david || <span className="text-muted">Sin información</span>}
                          </div>

                          <hr className="my-3" />

                          <h6 className="mb-2 d-flex align-items-center gap-2">
                            <i className="bi bi-file-earmark-pdf"></i> Documentos asociados
                          </h6>

                          {loadingProductDocs && (
                            <div className="text-muted" style={{ fontSize: '0.9rem' }}>
                              Cargando documentos...
                            </div>
                          )}

                          {!loadingProductDocs && errorProductDocs && (
                            <div className="text-danger" style={{ fontSize: '0.9rem' }}>
                              {errorProductDocs}
                            </div>
                          )}

                          {!loadingProductDocs && !errorProductDocs && (
                            productDocs.length > 0 ? (
                              <ul className="list-unstyled mb-0" style={{ maxHeight: '12vh', overflowY: 'auto' }}>
                                {productDocs.map((doc) => (
                                  <li key={doc.id} className="d-flex justify-content-between align-items-center mb-1">
                                    <span style={{ fontSize: '0.9rem' }}>{doc.nombre}</span>
                                    <Button size="sm" variant="outline-primary" onClick={() => openDocumento(doc)}>
                                      Ver
                                    </Button>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <div className="text-muted" style={{ fontSize: '0.9rem' }}>
                                No hay documentos asociados a este producto.
                              </div>
                            )
                          )}

                          <hr className="my-3" />

                          <h6 className="mb-2 d-flex align-items-center gap-2">
                            <i className="bi bi-boxes"></i> Productos asociados
                          </h6>

                          {loadingRelatedProducts && (
                            <div className="text-muted" style={{ fontSize: '0.9rem' }}>
                              Cargando productos asociados...
                            </div>
                          )}

                          {!loadingRelatedProducts && errorRelatedProducts && (
                            <div className="text-danger" style={{ fontSize: '0.9rem' }}>
                              {errorRelatedProducts}
                            </div>
                          )}

                          {!loadingRelatedProducts && !errorRelatedProducts && (
                            relatedProducts.length > 0 ? (
                              <div style={{ maxHeight: '18vh', overflowY: 'auto' }}>
                                {relatedProducts.map((p) => (
                                  <div
                                    key={p.id || p.codigo}
                                    className="d-flex justify-content-between align-items-start gap-2 mb-2"
                                    style={{ fontSize: '0.9rem' }}
                                  >
                                    <div className="flex-grow-1">
                                      <div className="fw-bold">
                                        {p.nombre}{' '}
                                        {p.codigo ? (
                                          <span className="text-muted fw-normal">({p.codigo})</span>
                                        ) : null}
                                      </div>
                                      <div className="text-muted">
                                        Público: {mostrarPrecio(p.precio_publico)} · Médico: {mostrarPrecio(p.precio_medico)}
                                      </div>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="outline-success"
                                      onClick={() => handleOpenRelatedProduct(p)}
                                      title="Ver este producto asociado"
                                    >
                                      Ver
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-muted" style={{ fontSize: '0.9rem' }}>
                                No hay productos asociados para este producto.
                              </div>
                            )
                          )}
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

      {/* Modal VER (Producto relacionado) */}
      <Modal
        show={showRelatedViewModal}
        onHide={() => setShowRelatedViewModal(false)}
        centered
        dialogClassName="consulta-view-modal"
      >
        {(() => {
          const isInactive = viewingRelatedProduct?.estado_producto?.toLowerCase() === 'inactivo';
          const headerColor = isInactive ? '#dc3545' : '#0857b3';

          return (
            <>
              <Modal.Header closeButton style={{ backgroundColor: headerColor, color: '#fff' }}>
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
                {viewingRelatedProduct && (
                  <Row className="g-3">
                    <Col md={6}>
                      <Card className="h-100 shadow-sm border-0">
                        <Card.Body className="p-3">
                          <div className="pe-md-2" style={{ fontSize: '0.98rem' }}>
                            <p><strong>Nombre:</strong> {viewingRelatedProduct.nombre}</p>
                            <p><strong>Estado Producto:</strong> {viewingRelatedProduct.estado_producto}</p>
                            <p><strong>Precio Público con IVA:</strong> {mostrarPrecio(viewingRelatedProduct.precio_publico)}</p>
                            <p><strong>Precio Médico con IVA:</strong> {mostrarPrecio(viewingRelatedProduct.precio_medico)}</p>
                            <p><strong>IVA:</strong> {formatearIVA(viewingRelatedProduct.iva)}</p>
                            <p><strong>Requiere Fórmula Médica:</strong> {viewingRelatedProduct.formula_medica}</p>
                            <p><strong>Laboratorio:</strong> {viewingRelatedProduct.laboratorio}</p>
                            <p><strong>Categoría:</strong> {viewingRelatedProduct.categoria}</p>
                            <p><strong>Estado Registro:</strong> {viewingRelatedProduct.estado_registro}</p>
                            <p><strong>Fecha Vencimiento registro:</strong> {viewingRelatedProduct.fecha_vencimiento}</p>
                            <p><strong>Registro Sanitario:</strong> {viewingRelatedProduct.registro_sanitario}</p>
                            <p className="mb-0"><strong>Código:</strong> {viewingRelatedProduct.codigo}</p>
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>

                    <Col md={6}>
                      <Card className="h-100 shadow-sm border-0">
                        <Card.Header className="bg-white" style={{ borderBottom: '1px solid #eef1f5' }}>
                          <h5 className="mb-0 d-flex align-items-center gap-2">
                            <i className="bi bi-journal-text"></i> DAVID
                          </h5>
                        </Card.Header>
                        <Card.Body className="p-3">
                          <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, maxHeight: '24vh', overflowY: 'auto' }}>
                            {viewingRelatedProduct.david || <span className="text-muted">Sin información</span>}
                          </div>

                          <hr className="my-3" />

                          <h6 className="mb-2 d-flex align-items-center gap-2">
                            <i className="bi bi-file-earmark-pdf"></i> Documentos asociados
                          </h6>

                          {loadingRelatedProductDocs2 && (
                            <div className="text-muted" style={{ fontSize: '0.9rem' }}>
                              Cargando documentos...
                            </div>
                          )}

                          {!loadingRelatedProductDocs2 && errorRelatedProductDocs2 && (
                            <div className="text-danger" style={{ fontSize: '0.9rem' }}>
                              {errorRelatedProductDocs2}
                            </div>
                          )}

                          {!loadingRelatedProductDocs2 && !errorRelatedProductDocs2 && (
                            relatedProductDocs2.length > 0 ? (
                              <ul className="list-unstyled mb-0" style={{ maxHeight: '12vh', overflowY: 'auto' }}>
                                {relatedProductDocs2.map((doc) => (
                                  <li key={doc.id} className="d-flex justify-content-between align-items-center mb-1">
                                    <span style={{ fontSize: '0.9rem' }}>{doc.nombre}</span>
                                    <Button size="sm" variant="outline-primary" onClick={() => openDocumento(doc)}>
                                      Ver
                                    </Button>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <div className="text-muted" style={{ fontSize: '0.9rem' }}>
                                No hay documentos asociados a este producto.
                              </div>
                            )
                          )}

                          <hr className="my-3" />

                          <h6 className="mb-2 d-flex align-items-center gap-2">
                            <i className="bi bi-boxes"></i> Productos asociados
                          </h6>

                          {loadingRelatedProducts2 && (
                            <div className="text-muted" style={{ fontSize: '0.9rem' }}>
                              Cargando productos asociados...
                            </div>
                          )}

                          {!loadingRelatedProducts2 && errorRelatedProducts2 && (
                            <div className="text-danger" style={{ fontSize: '0.9rem' }}>
                              {errorRelatedProducts2}
                            </div>
                          )}

                          {!loadingRelatedProducts2 && !errorRelatedProducts2 && (
                            relatedProducts2.length > 0 ? (
                              <div style={{ maxHeight: '18vh', overflowY: 'auto' }}>
                                {relatedProducts2.map((p) => (
                                  <div
                                    key={p.id || p.codigo}
                                    className="d-flex justify-content-between align-items-start gap-2 mb-2"
                                    style={{ fontSize: '0.9rem' }}
                                  >
                                    <div className="flex-grow-1">
                                      <div className="fw-bold">
                                        {p.nombre}{' '}
                                        {p.codigo ? (
                                          <span className="text-muted fw-normal">({p.codigo})</span>
                                        ) : null}
                                      </div>
                                      <div className="text-muted">
                                        Público: {mostrarPrecio(p.precio_publico)} · Médico: {mostrarPrecio(p.precio_medico)}
                                      </div>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="outline-success"
                                      onClick={() => handleOpenRelatedProduct(p)}
                                      title="Ver este producto asociado"
                                    >
                                      Ver
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-muted" style={{ fontSize: '0.9rem' }}>
                                No hay productos asociados para este producto.
                              </div>
                            )
                          )}
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

            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>Productos asociados (códigos)</Form.Label>
                  <Form.Control
                    as="textarea"
                    name="productos_asociados"
                    rows={2}
                    style={{ resize: 'vertical' }}
                    placeholder="Ej: 12345, 67890, ABC-001 (separados por coma o salto de línea)"
                    value={formData.productos_asociados || ''}
                    onChange={handleInputChange}
                  />
                  <div className="mt-1 text-muted" style={{ fontSize: '0.85rem' }}>
                    Estos productos se mostrarán como reemplazo cuando el producto esté agotado.
                  </div>
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
                <li>Al momento de cargar el archivo, verificar que no tenga ningun tipo de formulas.</li>
                <li>Haz clic en <strong>"Importar Excel"</strong> para seleccionar el archivo.</li>
                <li>Luego espera el mensaje de confirmación.</li>
                <li>Si hay errores (códigos repetidos/campos vacíos), se mostrarán en la vista previa.</li>
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
              <p className="mb-0 text-muted">
                <i className="bi bi-info-circle me-2"></i>Si hay errores en el archivo, no se importará.
              </p>
            </Card.Body>
          </Card>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowInstructions(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal PREVIEW IMPORT */}
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
                          const clavesNuevas = Object.keys(producto.datos || producto.nuevo || {});
                          const cambios = producto.campos_modificados?.length
                            ? producto.campos_modificados
                            : clavesNuevas;

                          return cambios.length > 0 ? (
                            cambios.map((campo, i) => {
                              const valActual = producto.actual ? producto.actual[campo] : undefined;
                              const valNuevo = (producto.datos?.[campo] ?? producto.nuevo?.[campo] ?? producto[campo]);

                              return (
                                <tr key={`update-${index}-${i}`}>
                                  <td>{producto.codigo}</td>
                                  <td>{producto.actual?.nombre || producto.nombre}</td>
                                  <td className="text-capitalize">{String(campo).replace('_', ' ')}</td>
                                  <td className="text-danger">{formatCampoValor(campo, valActual) || 'N/A'}</td>
                                  <td className="text-success">{formatCampoValor(campo, valNuevo) || 'N/A'}</td>
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
                    {importPreview.errores.map((err, index) => (
                      <Alert key={`error-${index}`} variant="danger" className="mb-2">
                        {err.mensaje || err.message || 'Error desconocido'}
                        {err.filas && (
                          <div className="mt-1">
                            <small>Filas afectadas: {err.filas.join(', ')}</small>
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

      {/* Modal de errores */}
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

      {/* Modal de éxito */}
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
