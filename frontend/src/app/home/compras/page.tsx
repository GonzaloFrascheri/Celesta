// frontend/app/home/compras/page.js
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import apiClient from '../../../../lib/api';
import styles from './Compras.module.css';
import { FaPlus, FaCog } from 'react-icons/fa';

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
            <th></th> {/* Para el botón expandir */}
            <th>Folio</th>
            <th>Proveedor</th>
            <th>Monto Total</th>
            <th>Fecha de Creación</th>
            <th>Estado ML</th>
          </tr>
        </thead>
        <tbody>
          {paginated.length > 0 ? (
            paginated.map(c => (
              <>
                <tr key={c.id} className={expandedRows.has(c.id) ? styles.expanded : ''}>
                  <td>
                    <button 
                      onClick={() => toggleRow(c.id)}
                      className={styles.expandButton}
                    >
                      {expandedRows.has(c.id) ? '▼' : '▶'}
                    </button>
                  </td>
                  <td>{c.folio || 'N/A'}</td>
                  <td>{c.proveedor_nombre || 'No Asignado'}</td>
                  <td>${c.monto_total?.toLocaleString('es-CL') ?? 'N/A'}</td>
                  <td>
                    {c.created_at
                      ? typeof c.created_at === 'string'
                        ? c.created_at
                        : new Date(c.created_at).toLocaleString()
                      : 'N/A'}
                  </td>
                  <td>
                    <span className={`${styles.status} ${styles[c.estado_ml?.toLowerCase() || 'pendiente']}`}>
                      {c.estado_ml || 'PENDIENTE'}
                    </span>
                  </td>
                </tr>
                {expandedRows.has(c.id) && c.items && (
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
                          {c.items.map((item, idx) => (
                            <tr key={`${c.id}-${idx}`}>
                              <td>{item.descripcion_original}</td>
                              <td>{item.cantidad}</td>
                              <td>${item.precio_unitario?.toLocaleString('es-CL')}</td>
                              <td>${item.monto_item?.toLocaleString('es-CL')}</td>
                              <td className={styles.productoMaestro}>
                                {item.producto_maestro_nombre || 'Sin categorizar'}
                              </td>
                            </tr>
                          ))}
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