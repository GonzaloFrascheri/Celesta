'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
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

const getCFETypeName = (tipo: number | null): string => {
  if (tipo === null) return 'Desconocido';
  const cfeTypes: { [key: number]: string } = {
    101: 'e-Ticket',
    102: 'Nota de Crédito de e-Ticket',
    103: 'Nota de Débito de e-Ticket',
    111: 'e-Factura',
    112: 'Nota de Crédito de e-Factura',
    113: 'Nota de Débito de e-Factura',
    181: 'e-Remito',
    182: 'e-Resguardo',
  };
  return cfeTypes[tipo] || `Tipo ${tipo}`;
};


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

  // 2) Extraigo datos y líneas de detalle del XML
  const { parsedTotals, items } = useMemo(() => {
    if (!cfe) return { parsedTotals: null, items: [] };

    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(cfe.contenido_xml, "application/xml");

      const getText = (tagName: string, context: Document | Element = xmlDoc) =>
        context.getElementsByTagNameNS('*', tagName)[0]?.textContent ?? null;

      const getMonto = (tagName: string, context: Document | Element = xmlDoc) =>
        parseFloat(getText(tagName, context) || '0');

      // Totales
      const mntNetoIvaTasaBasica = getMonto('MntNetoIvaTasaBasica');
      const mntNetoIvaTasaMinima = getMonto('MntNetoIvaTasaMinima');
      const mntNoGrv = getMonto('MntNoGrv');
      const montoNeto = mntNetoIvaTasaBasica + mntNetoIvaTasaMinima + mntNoGrv;

      const ivaTasaBasica = getMonto('MntIVATasaBasica');
      const ivaTasaMinima = getMonto('MntIVATasaMinima');
      const montoIVA = ivaTasaBasica + ivaTasaMinima;

      const fechaVencimientoNode = xmlDoc.getElementsByTagNameNS('*', 'FchVenc')[0];
      const fechaVencimiento = fechaVencimientoNode?.textContent
        ? new Date(fechaVencimientoNode.textContent).toLocaleDateString('es-UY')
        : null;

      const parsedTotals = {
        tipoCFETexto: getCFETypeName(cfe.tipo_cfe),
        fechaVencimiento,
        montoNeto: montoNeto.toFixed(2),
        montoIVA: montoIVA.toFixed(2),
      };

      // Items
      const itemNodes = Array.from(xmlDoc.getElementsByTagNameNS('*', 'Item'));
      const items = itemNodes.map(node => ({
        nro:      getText('NroLinDet', node),
        nombre:   getText('NomItem', node),
        cantidad: getText('Cantidad', node),
        precio:   getText('PrecioUnitario', node),
        monto:    getText('MontoItem', node),
        tasaIVA:  getText('TasaIVA', node),
      }));

      return { parsedTotals, items };
    } catch (e) {
      console.error("Error parsing CFE XML:", e);
      return { parsedTotals: null, items: [] };
    }
  }, [cfe]);


  // Función para descargar XML
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
        <Link href="/home/cfes">Facturas Recibidas</Link><span>/</span>
        <span>{parsedTotals?.tipoCFETexto} #{cfe.numero_cfe}</span>
      </nav>

      <h1>{parsedTotals?.tipoCFETexto} #{cfe.numero_cfe}</h1>

      {/* Carátula */}
      <section className={styles.section}>
        <h2>Carátula</h2>
        <div className={styles.tableResponsive}>
          <table>
            <tbody>
              <tr>
                <th>Emisor</th>
                <td>{`${cfe.emisor_nombre || 'N/A'} (${cfe.emisor_rut || 'N/A'})`}</td>
              </tr>
              <tr>
                <th>Receptor</th>
                <td>{cfe.receptor_rut ?? '—'}</td>
              </tr>
              <tr>
                <th>Cantidad de CFEs</th>
                <td>{cfe.cantidad_cfe ?? '—'}</td>
              </tr>
              <tr>
                <th>Fecha Carátula</th>
                <td>{cfe.fecha_caratula ? new Date(cfe.fecha_caratula).toLocaleString('es-UY') : '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Totales */}
      {parsedTotals && (
        <section className={styles.section}>
          <h2>Totales</h2>
          <div className={styles.tableResponsive}>
            <table role="table" aria-label="Totales del CFE">
              <tbody>
                <tr>
                  <th>Tipo CFE</th>
                  <td>{parsedTotals.tipoCFETexto}</td>
                </tr>
                <tr>
                  <th>Serie y Número</th>
                  <td>{`${cfe.serie_cfe} - ${cfe.numero_cfe}`}</td>
                </tr>
                <tr>
                  <th>Fecha emisión</th>
                  <td>{cfe.fecha_emision ? new Date(cfe.fecha_emision.value).toLocaleDateString('es-UY') : '—'}</td>
                </tr>
                {parsedTotals.fechaVencimiento && (
                  <tr><th>Fecha vencimiento</th><td>{parsedTotals.fechaVencimiento}</td></tr>
                )}
                <tr>
                  <th>Monto Neto</th>
                  <td>{`${cfe.moneda || '$'} ${parsedTotals.montoNeto}`}</td>
                </tr>
                <tr>
                  <th>IVA</th>
                  <td>{`${cfe.moneda || '$'} ${parsedTotals.montoIVA}`}</td>
                </tr>
                <tr className={styles.highlight}>
                  <th>Monto Total</th>
                  <td>{cfe.monto_total != null ? `${cfe.moneda || '$'} ${cfe.monto_total.toFixed(2)}` : '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Líneas de detalle */}
      {items.length > 0 && (
        <section className={styles.section}>
          <h2>Líneas de detalle</h2>
          <div className={styles.tableResponsive}>
            <table role="table" aria-label="Detalle de ítems">
              <thead>
                <tr>
                  <th>Nro</th><th>Ítem</th><th>Cantidad</th><th>Precio unit.</th><th>% IVA</th><th>Monto</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i}>
                    <td data-label="Nro">{it.nro ?? '—'}</td>
                    <td data-label="Ítem">{it.nombre ?? '—'}</td>
                    <td data-label="Cantidad">{it.cantidad ?? '—'}</td>
                    <td data-label="Precio unit.">{it.precio ?? '—'}</td>
                    <td data-label="% IVA">{it.tasaIVA ?? '—'}</td>
                    <td data-label="Monto">{it.monto ?? '—'}</td>
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
