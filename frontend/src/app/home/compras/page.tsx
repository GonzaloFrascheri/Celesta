// frontend/app/home/compras/page.js
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import apiClient from '../../../../lib/api';
import styles from './Compras.module.css';
import { FaPlus, FaCog } from 'react-icons/fa';

interface CFEItem {
  NroLinDet: string;
  NomItem: string;
  DscItem: string;
  Cantidad: string;
  PrecioUnitario: string;
  MontoItem: string;
  producto_maestro_id?: string;
  producto_maestro_nombre?: string;
}

interface CFE {
  id: string;
  Serie: string;
  Nro: string;
  FchEmis: string;
  RUCEmisor: string;
  RznSocEmisor: string;
  estado_ml: 'PENDIENTE' | 'PROCESADO';
  items: CFEItem[];
  monto_total: number;
}

interface CompraItem {
  descripcion_original: string;
  cantidad: number;
  precio_unitario: number;
  monto_item: number;
  producto_maestro_id?: string;
  producto_maestro_nombre?: string;
}

interface Compra {
  id: string;
  folio?: string;
  proveedor_nombre?: string;
  monto_total?: number;
  created_at?: string;
  estado_ml?: string;
  items?: CompraItem[];
  tipo: 'CFE' | 'MANUAL';
  cfe?: CFE;
}

export default function ComprasPage() {
  const [compras, setCompras]       = useState<Compra[]>([]);
  const [loading, setLoading]       = useState(true);
  // <-- Aquí cambiamos el tipo de null a string|null
  const [error, setError]           = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  // estados de búsqueda/paginado…
  const [search, setSearch] = useState("");
  const [page,   setPage]   = useState(1);
  const perPage = 8;
  const router = useRouter();

  const fetchCompras = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get("/compras?include=items");
      setCompras(response.data.data || []);
      setError(null);
    } catch (err) {
      console.error("Error al obtener las compras:", err);
      setError("No se pudieron cargar las compras. Inténtalo de nuevo más tarde.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompras();
  }, []);

  const handleProcesarLote = async () => {
    if (!window.confirm('¿Procesar todas las compras pendientes?')) return;
    setProcessing(true);
    try {
      const res = await apiClient.post('/procesar-compras-pendientes');
      const data = res.data.data;
      if (typeof data.total_procesadas !== 'undefined') {
        alert(`✔ ${data.total_procesadas} procesadas, ${data.total_con_error} con error.`);
      } else {
        alert(data.message);
      }
      fetchCompras();
    } catch (err) {
      console.error(err);
      alert('Error al procesar.');
    } finally {
      setProcessing(false);
    }
  };

  const handleCategorizar = async (compraId: string, itemIndex: number, item: CFEItem) => {
    try {
      const response = await apiClient.post('/sugerir-producto', {
        descripcion: item.NomItem,
        descripcion_detallada: item.DscItem
      });

      if (response.data.success) {
        // Actualizar el estado local
        const nuevasCompras = compras.map(c => {
          if (c.id === compraId && c.tipo === 'CFE' && c.cfe) {
            const nuevosItems = [...c.cfe.items];
            nuevosItems[itemIndex] = {
              ...nuevosItems[itemIndex],
              producto_maestro_id: response.data.producto_id,
              producto_maestro_nombre: response.data.producto_nombre
            };
            return {
              ...c,
              cfe: {
                ...c.cfe,
                items: nuevosItems
              }
            };
          }
          return c;
        });

        setCompras(nuevasCompras);
        alert('Producto categorizado exitosamente');
      }
    } catch (error) {
      console.error('Error al categorizar:', error);
      alert('Error al categorizar el producto');
    }
  };

  // — FILTRADO —
  const term = search.trim().toLowerCase();
  const filtered = compras.filter(c =>
    (c.folio || '').toLowerCase().includes(term) ||
    (c.proveedor_nombre || '').toLowerCase().includes(term)
  );

  // — PAGINADO —
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated  = filtered.slice((page - 1) * perPage, page * perPage);

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const renderItems = (compra: Compra) => {
    if (compra.tipo === 'CFE') {
      return compra.cfe?.items.map((item, idx) => (
        <tr key={`${compra.id}-${idx}`} className={styles.cfeItem}>
          <td>{item.NomItem}</td>
          <td>{item.Cantidad}</td>
          <td>${parseFloat(item.PrecioUnitario).toLocaleString('es-CL')}</td>
          <td>${parseFloat(item.MontoItem).toLocaleString('es-CL')}</td>
          <td className={styles.productoMaestro}>
            <div className={styles.categorizacionContainer}>
              {item.producto_maestro_nombre || (
                <span className={styles.pendiente}>
                  Pendiente de categorización
                  <button 
                    className={styles.categorizarBtn}
                    onClick={() => handleCategorizar(compra.id, idx, item)}
                  >
                    Categorizar
                  </button>
                </span>
              )}
            </div>
          </td>
        </tr>
      ));
    }

    // Renderizado existente para compras manuales
    return compra.items?.map((item, idx) => (
      <tr key={`${compra.id}-${idx}`}>
        <td>{item.descripcion_original}</td>
        <td>{item.cantidad}</td>
        <td>${item.precio_unitario?.toLocaleString('es-CL')}</td>
        <td>${item.monto_item?.toLocaleString('es-CL')}</td>
        <td className={styles.productoMaestro}>
          {item.producto_maestro_nombre || 'Sin categorizar'}
        </td>
      </tr>
    ));
  };

  if (loading) return <div className={styles.loader}>Cargando compras…</div>;
  if (error)   return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Listado de Compras</h1>
        <div className={styles.actions}>
          <button
            onClick={handleProcesarLote}
            className={`${styles.processButton} ${processing ? styles.disabled : ''}`}
            disabled={processing}
          >
            <FaCog /> {processing ? 'Procesando…' : 'Procesar Pendientes'}
          </button>
          <Link href="/home/compras/nueva" className={styles.newButton}>
            <FaPlus /> Nueva Compra
          </Link>
        </div>
      </div>

      {/* — BUSCADOR — */}
      <div className={styles.searchContainer}>
        <input
          type="text"
          placeholder="🔍 Buscar folio o proveedor…"
          value={search}
          onChange={e => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className={styles.search}
        />
      </div>

      {/* — TABLA — */}
      <table className={styles.table}>
        <thead>
          <tr>
            <th></th>
            <th>Tipo</th>
            <th>Folio</th>
            <th>Proveedor</th>
            <th>Monto Total</th>
            <th>Fecha</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {paginated.length > 0 ? (
            paginated.map(c => (
              <>
                <tr key={c.id} className={`${styles.row} ${c.tipo === 'CFE' ? styles.cfeFila : ''}`}>
                  <td>
                    <button onClick={() => toggleRow(c.id)} className={styles.expandButton}>
                      {expandedRows.has(c.id) ? '▼' : '▶'}
                    </button>
                  </td>
                  <td>
                    <span className={styles.tipo}>
                      {c.tipo === 'CFE' ? '📄 CFE' : '✍️ Manual'}
                    </span>
                  </td>
                  <td>{c.tipo === 'CFE' ? `${c.cfe?.Serie}-${c.cfe?.Nro}` : c.folio}</td>
                  <td>{c.tipo === 'CFE' ? c.cfe?.RznSocEmisor : c.proveedor_nombre}</td>
                  <td>${c.monto_total?.toLocaleString('es-CL')}</td>
                  <td>{new Date(c.tipo === 'CFE' ? c.cfe?.FchEmis ?? '' : c.created_at ?? '').toLocaleDateString()}</td>
                  <td>
                    <span className={`${styles.status} ${styles[c.estado_ml?.toLowerCase() || 'pendiente']}`}>
                      {c.estado_ml || 'PENDIENTE'}
                    </span>
                  </td>
                </tr>
                {expandedRows.has(c.id) && (
                  <tr className={styles.itemsRow}>
                    <td colSpan={6}>
                      <table className={styles.itemsTable}>
                        <thead>
                          <tr>
                            <th>Descripción</th>
                            <th>Cantidad</th>
                            <th>Precio Unit.</th>
                            <th>Subtotal</th>
                            <th>Producto Maestro</th>
                          </tr>
                        </thead>
                        <tbody>
                          {renderItems(c)}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </>
            ))
          ) : (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center' }}>
                No hay compras para mostrar.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* — CONTROLES DE PAGINACIÓN — */}
      <div className={styles.pagination}>
        <button
          onClick={() => setPage(p => Math.max(p - 1, 1))}
          disabled={page === 1}
        >
          ← Anterior
        </button>
        <span>Página {page} de {totalPages}</span>
        <button
          onClick={() => setPage(p => Math.min(p + 1, totalPages))}
          disabled={page === totalPages}
        >
          Siguiente →
        </button>
      </div>
    </div>
  );
}