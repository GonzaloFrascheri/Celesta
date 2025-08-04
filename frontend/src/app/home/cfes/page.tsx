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

// Helper to format date to YYYY-MM-DD
const toYYYYMMDD = (date: Date) => date.toISOString().split('T')[0];

const CFEItemPreview = ({ xmlContent }: { xmlContent: string }) => {
  const [preview, setPreview] = useState('Cargando vista previa...');

  useEffect(() => {
    // This code runs on the client, so DOMParser is available.
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlContent, "application/xml");

      const parseError = xmlDoc.querySelector("parsererror");
      if (parseError) {
        console.error("Error al analizar XML:", parseError.textContent);
        setPreview('No se pudo procesar el detalle.');
        return;
      }

      const itemNode = xmlDoc.querySelector("Detalle > Item");

      if (itemNode) {
        const nombre = itemNode.querySelector("NmbItem")?.textContent?.trim() || 'Ítem sin nombre';
        const cantidad = itemNode.querySelector("Cantidad")?.textContent?.trim() || 'N/A';
        const monto = itemNode.querySelector("MontoItem")?.textContent?.trim() || 'N/A';
        const monedaNode = xmlDoc.querySelector("Encabezado > IdDoc > Moneda");
        const moneda = monedaNode?.textContent?.trim() || '$';

        setPreview(`${nombre}, ${cantidad} un., ${moneda} ${monto} IVA incl.`);
      } else {
        setPreview('Factura sin ítems detallados.');
      }
    } catch (error) {
      console.error("Error al analizar XML del CFE:", error);
      setPreview('Error al procesar el detalle.');
    }
  }, [xmlContent]);

  return <p className={styles.cardSubtitle}>{preview}</p>;
};

export default function CFEsPage() {
  const [cfes, setCfes]         = useState<CFE[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');

  // State for date range filter
  const today = new Date();
  const fifteenDaysAgo = new Date();
  fifteenDaysAgo.setDate(today.getDate() - 15);

  const [startDate, setStartDate] = useState<string>(toYYYYMMDD(fifteenDaysAgo));
  const [endDate, setEndDate] = useState<string>(toYYYYMMDD(today));

  const [page, setPage] = useState(1);
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

  // filtro por emisor, receptor y rango de fechas
  const term = search.trim().toLowerCase();
  const filtered = cfes.filter(c => {
    const matchesSearch =
      (c.emisor_rut    || '').toLowerCase().includes(term) ||
      (c.receptor_rut  || '').toLowerCase().includes(term);

    const cfeDate = c.fecha_procesamiento.value.substring(0, 10); // YYYY-MM-DD
    const matchesDate =
      (!startDate || cfeDate >= startDate) &&
      (!endDate || cfeDate <= endDate);

    return matchesSearch && matchesDate;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated  = filtered.slice((page-1)*perPage, page*perPage);

  if (loading) return <p>Cargando Facturas Recibidas…</p>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Listado de Facturas Recibidas</h1>

      <div className={styles.filters}>
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
        <div className={styles.dateFilters}>
          <div className={styles.dateFilter}>
            <label htmlFor="startDate">Desde:</label>
            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className={styles.dateInput}
            />
          </div>
          <div className={styles.dateFilter}>
            <label htmlFor="endDate">Hasta:</label>
            <input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className={styles.dateInput}
            />
          </div>
        </div>
      </div>

      {filtered.length === 0 && <p>No se encontraron Facturas Recibidas para los filtros seleccionados.</p>}

      <ul className={styles.list}>
        {paginated.map(cfe => (
          <li key={cfe.id} className={styles.card}>
            <div className={styles.cardContent}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderLine}>
                  <span className={styles.label}>RUT Emisor:</span>
                  <span>{cfe.emisor_rut || '—'}</span>
                </div>
                <div className={styles.cardHeaderLine}>
                  <span className={styles.label}>Fecha:</span>
                  <span>{new Date(cfe.fecha_procesamiento.value).toLocaleString('es-UY')}</span>
                </div>
              </div>
              <CFEItemPreview xmlContent={cfe.contenido_xml} />
            </div>
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
