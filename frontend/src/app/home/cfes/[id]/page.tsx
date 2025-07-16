'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
const syntaxStyle = require('react-syntax-highlighter/dist/esm/styles/prism/coy').default;
import styles from './page.module.css';

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
  ruc_emisor_caratula:   string | null;
  cantidad_cfe:          number | null;
  fecha_caratula:        string | null;
  contenido_xml: string;
}


export default function CFEPage() {
  const { id } = useParams();
  const [cfe, setCfe]     = useState<CFE | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1) Al montar, recupero un solo CFE desde la API
  useEffect(() => {
    if (!id) return;
    setLoading(true);

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/cfes/${id}`)
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          setCfe(json.data);
        } else {
          setError(json.error || 'CFE no encontrado');
        }
      })
      .catch(err => {
        console.error('Error fetch detalle CFE:', err);
        setError('Error de conexión');
      })
      .finally(() => setLoading(false));
  }, [id]);

  // 2) Extraigo líneas de detalle del XML
  const items = useMemo(() => {
    if (!cfe) return [];
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(cfe.contenido_xml, 'application/xml');
      const nodos = Array.from(xmlDoc.getElementsByTagNameNS('*', 'Item'));
      return nodos.map(node => ({
        nro:      node.getElementsByTagNameNS('*','NroLinDet')[0]?.textContent,
        nombre:   node.getElementsByTagNameNS('*','NomItem')[0]?.textContent,
        cantidad: node.getElementsByTagNameNS('*','Cantidad')[0]?.textContent,
        precio:   node.getElementsByTagNameNS('*','PrecioUnitario')[0]?.textContent,
        monto:    node.getElementsByTagNameNS('*','MontoItem')[0]?.textContent,
      }));
    } catch {
      return [];
    }
  }, [cfe]);

  // 3) Función para descargar XML
  const downloadXml = () => {
    if (!cfe) return;
    const blob = new Blob([cfe.contenido_xml], { type: 'application/xml' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = cfe.nombre_archivo_original;
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- estados de carga/ error / no data ---
  if (loading) {
    return <div className={styles.container}><p>Cargando detalle…</p></div>;
  }
  if (error) {
    return <div className={styles.container}><p style={{ color: 'red' }}>❌ {error}</p></div>;
  }
  if (!cfe) {
    return <div className={styles.container}><p>No se encontró el CFE.</p></div>;
  }

  // --- renderizado final ---
  return (
    <div className={styles.container}>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb} aria-label="breadcrumbs">
        <Link href="/home">Inicio</Link><span>/</span>
        <Link href="/home/facturas">Facturas Recibidas</Link><span>/</span>
        <span>Detalle #{cfe.numero_cfe}</span>
      </nav>

      <h1>Detalle CFE #{cfe.numero_cfe}</h1>

      {/* Encabezado */}
      <section className={styles.section}>
        <h2>Encabezado</h2>
        <div className={styles.tableResponsive}>
          <table role="table" aria-label="Datos generales del CFE">
            <tbody>
              {[
                ['ID interno', cfe.id],
                ['Archivo origen', cfe.nombre_archivo_original],
                ['Procesado el', new Date(cfe.fecha_procesamiento.value).toLocaleString()],
              ].map(([k, v]) => (
                <tr key={k}>
                  <th>{k}</th>
                  <td>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Carátula */}
      <section className={styles.section}>
        <h2>Carátula</h2>
        <div className={styles.tableResponsive}>
          <table>
            <tbody>
              {[
                ['RUT Emisor',           cfe.emisor_rut],
                ['Nombre Emisor',        cfe.emisor_nombre],
                ['RUT Receptor',         cfe.receptor_rut],
                ['RUT Receptor (carátula)', cfe.rut_receptor_caratula],
                ['RUC Emisor (carátula)',   cfe.ruc_emisor_caratula],
                ['Cantidad CFE',         cfe.cantidad_cfe != null
                                            ? cfe.cantidad_cfe 
                                            : '—'],
                ['Fecha Carátula',       cfe.fecha_caratula
                                            ? new Date(cfe.fecha_caratula).toLocaleString()
                                            : '—'],
              ].map(([label, val]) => (
                <tr key={label}>
                  <th>{label}</th>
                  <td>{val ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Totales */}
      <section className={styles.section}>
        <h2>Totales</h2>
        <div className={styles.tableResponsive}>
          <table role="table" aria-label="Totales del CFE">
            <tbody>
              {[
                ['Tipo CFE',     cfe.tipo_cfe],
                ['Serie',        cfe.serie_cfe],
                ['Número',       cfe.numero_cfe],
                ['Fecha emisión', cfe.fecha_emision
                   ? new Date(cfe.fecha_emision.value).toLocaleDateString()
                   : '—'],
                ['Monto total',  cfe.monto_total != null
                   ? `${cfe.monto_total} ${cfe.moneda}` : '—'],
              ].map(([k, v]) => (
                <tr key={k} className={k === 'Monto total' ? styles.highlight : ''}>
                  <th>{k}</th>
                  <td>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Líneas de detalle */}
      {items.length > 0 && (
        <section className={styles.section}>
          <h2>Líneas de detalle</h2>
          <div className={styles.tableResponsive}>
            <table role="table" aria-label="Detalle de ítems">
              <thead>
                <tr>
                  <th>Nro</th><th>Ítem</th><th>Cantidad</th><th>Precio unit.</th><th>Monto</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i}>
                    <td data-label="Nro">{it.nro}</td>
                    <td data-label="Ítem">{it.nombre}</td>
                    <td data-label="Cantidad">{it.cantidad}</td>
                    <td data-label="Precio unit.">{it.precio}</td>
                    <td data-label="Monto">{it.monto}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Descargar al final */}
      <div className={styles.actions}>
        <button onClick={downloadXml}>📥 Descargar XML</button>
      </div>

      {/* Volver */}
      <p><Link href="/home/cfes">← Volver al listado</Link></p>
    </div>
  );
}
