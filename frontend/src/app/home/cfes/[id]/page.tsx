'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface CFE {
  id: string
  nombre_archivo_original: string
  fecha_procesamiento: string
  emisor_rut: string | null
  emisor_nombre: string | null
  receptor_rut: string | null
  tipo_cfe: number | null
  serie_cfe: string | null
  numero_cfe: number | null
  fecha_emision: string | null
  monto_total: number | null
  moneda: string | null
  rut_receptor_caratula: string | null
  ruc_emisor_caratula: string | null
  cantidad_cfe: number | null
  fecha_caratula: string | null
  contenido_xml: string
}

export default function CFEPage() {
  const params = useParams()
  const id     = params?.id

  const [cfe, setCfe]         = useState<CFE | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string| null>(null)

  useEffect(() => {
    if (!id) return
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/cfes/${id}`)
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          setCfe(json.data)
        } else {
          setError(json.error || 'Error desconocido')
        }
      })
      .catch(err => {
        console.error(err)
        setError('Error de conexión')
      })
      .finally(() => setLoading(false))

  }, [id])

  if (loading) return <p>Cargando detalle…</p>
  if (error)   return <p style={{color:'red'}}>❌ {error}</p>
  if (!cfe)    return <p>No se encontró el CFE.</p>

  return (
    <div style={{ padding: 20 }}>
      <h1>Detalle CFE #{cfe.numero_cfe}</h1>
      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <tbody>
          {[
            ['ID interno',                 cfe.id],
            ['Archivo origen',             cfe.nombre_archivo_original],
            ['Procesado el',               cfe.fecha_procesamiento],
            ['RUT Emisor',                 cfe.emisor_rut],
            ['Nombre Emisor',              cfe.emisor_nombre],
            ['RUT Receptor',               cfe.receptor_rut],
            ['Tipo CFE',                   cfe.tipo_cfe],
            ['Serie',                      cfe.serie_cfe],
            ['Número',                     cfe.numero_cfe],
            ['Fecha emisión',              cfe.fecha_emision],
            ['Monto total',                cfe.monto_total != null ? `${cfe.monto_total} ${cfe.moneda}` : null],
            ['Moneda',                     cfe.moneda],
            ['RUT Receptor (carátula)',    cfe.rut_receptor_caratula || '—'],
            ['RUC Emisor (carátula)',      cfe.ruc_emisor_caratula   || '—'],
            ['Cantidad CFE',               cfe.cantidad_cfe          || '—'],
            ['Fecha Carátula',             cfe.fecha_caratula        || '—'],
          ].map(([label, value]) => (
            <tr key={label}>
              <th style={{
                  textAlign:'left',
                  padding: '6px 8px',
                  borderBottom: '1px solid #eee',
                  width: '200px'
                }}>
                {label}
              </th>
              <td style={{
                  padding: '6px 8px',
                  borderBottom: '1px solid #eee'
                }}>
                {value ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <details style={{ marginTop: 20 }}>
        <summary style={{ cursor:'pointer' }}>▶ Ver contenido XML completo</summary>
        <pre style={{
          whiteSpace: 'pre-wrap',
          background: '#f9f9f9',
          padding: 10,
          border: '1px solid #ddd',
          marginTop: 10,
          maxHeight: '60vh',
          overflow: 'auto'
        }}>
          {cfe.contenido_xml}
        </pre>
      </details>

      {/* Un enlace para volver al listado */}
      <p style={{ marginTop: 20 }}>
        <Link href="/home/cfes">← Volver al listado de CFEs</Link>
      </p>
    </div>
  )
}
