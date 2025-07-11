'use client';

import { useState, useEffect, ChangeEvent  } from 'react';
import Link from 'next/link';
import styles from './CFEs.module.css';

interface CFE {
  id: string;
  nombre_archivo_original: string;
  fecha_procesamiento: { value: string };
  emisor_rut: string | null;
  emisor_nombre: string | null;
  receptor_rut: string | null;
  tipo_cfe: number | null;
  serie_cfe: string | null;
  numero_cfe: number | null;
  fecha_emision: { value: string } | null;
  monto_total: number | null;
  moneda: string | null;
  rut_receptor_caratula: string | null;
  ruc_emisor_caratula: string | null;
  cantidad_cfe: number | null;
  fecha_caratula: string | null;
  contenido_xml: string;
}

export default function CFEsPage() {
  const [cfes, setCfes]         = useState<CFE[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [page,   setPage]       = useState(1);
  const perPage = 5;

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/cfes?limit=100`)
      .then(r => r.json())
      .then(json => {
        if (json.success) setCfes(json.data.items);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // filtro por emisor o receptor
  const term = search.trim().toLowerCase();
  const filtered = cfes.filter(c =>
    (c.emisor_rut    || '').toLowerCase().includes(term) ||
    (c.receptor_rut  || '').toLowerCase().includes(term)
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated  = filtered.slice((page-1)*perPage, page*perPage);

  if (loading) return <p>Cargando CFEs…</p>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Listado de CFEs</h1>

      <input
        type="text"
        placeholder="🔍 Buscar por RUT emisor o receptor…"
        value={search}
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        className={styles.search}
      />

      {filtered.length === 0 && <p>No se encontraron CFEs.</p>}

      <ul className={styles.list}>
        {paginated.map(cfe => (
          <li key={cfe.id} className={styles.card}>
            {/* Título con RUT emisor y fecha/hora */}
            <h3 className={styles.cardTitle}>
              {cfe.emisor_rut || '—'}{' '}
              <span className={styles.separator}>·</span>{' '}
              {new Date(cfe.fecha_procesamiento.value).toLocaleString()}
            </h3>
            <Link href={`/home/cfes/${cfe.id}`} className={styles.button}>
              Ver detalle
            </Link>
          </li>
        ))}
      </ul>

      {/* Paginación */}
      <div className={styles.pagination}>
        <button
          onClick={() => setPage(p => Math.max(p-1, 1))}
          disabled={page === 1}
        >
          ← Anterior
        </button>
        <span>Página {page} de {totalPages}</span>
        <button
          onClick={() => setPage(p => Math.min(p+1, totalPages))}
          disabled={page === totalPages}
        >
          Siguiente →
        </button>
      </div>
    </div>
  );
}
