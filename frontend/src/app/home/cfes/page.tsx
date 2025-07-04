'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

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
  const [filtered, setFiltered] = useState<CFE[]>([]);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);

  // Carga inicial
  useEffect(() => {
    setLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/cfes?limit=100`)
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          setCfes(json.data.items);
          setFiltered(json.data.items);
        } else {
          console.error('Error al cargar CFEs:', json.error);
        }
      })
      .catch(err => console.error('Fetch CFEs error:', err))
      .finally(() => setLoading(false));
  }, []);

  // Filtrado por búsqueda (emisor_nombre o receptor_rut)
  useEffect(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      setFiltered(cfes);
    } else {
      setFiltered(
        cfes.filter(c =>
          (c.emisor_nombre || '').toLowerCase().includes(term) ||
          (c.receptor_rut  || '').toLowerCase().includes(term)
        )
      );
    }
  }, [search, cfes]);

  return (
    <div style={{ padding: 20 }}>
      {/* Título */}
      <h1>Listado de CFEs</h1>

      {/* Buscador */}
      <div style={{ margin: '1rem 0', maxWidth: 320 }}>
        <input
          type="text"
          placeholder="Buscar por emisor o receptor…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: 4,
            border: '1px solid #ccc',
            fontSize: '1rem'
          }}
        />
      </div>

      {/* Estado de carga */}
      {loading && <p>Cargando CFEs…</p>}

      {/* No hay resultados */}
      {!loading && filtered.length === 0 && (
        <p>No se encontraron CFEs.</p>
      )}

      {/* Lista de resultados */}
      {!loading && filtered.map(cfe => (
        <div
          key={cfe.id}
          style={{
            border: '1px solid #ddd',
            borderRadius: 4,
            padding: 12,
            marginBottom: 12,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}
        >
          <p style={{ margin: 0, fontSize: '1.1rem' }}>
            <strong>{cfe.emisor_nombre || '—'}</strong>{' '}
            <span style={{ color: '#555' }}>→</span>{' '}
            <em>{cfe.receptor_rut || '—'}</em>
          </p>
          <p style={{ margin: '4px 0' }}>
            Total:{' '}
            <strong>
              {cfe.monto_total != null
                ? `${cfe.monto_total} ${cfe.moneda}`
                : '—'}
            </strong>
          </p>
          <Link
            href={`/home/cfes/${cfe.id}`}
            style={{
              display: 'inline-block',
              marginTop: 8,
              padding: '6px 12px',
              backgroundColor: '#0070f3',
              color: '#fff',
              borderRadius: 4,
              textDecoration: 'none',
              fontSize: '0.9rem'
            }}
          >
            Ver detalle
          </Link>
        </div>
      ))}
    </div>
  );
}
