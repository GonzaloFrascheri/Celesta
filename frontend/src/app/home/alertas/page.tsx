'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function AlertasPage() {
  const [alertas, setAlertas] = useState<
    { id: string; producto_maestro_id: string; precio_nuevo: number;
      precio_promedio: number; diferencia: number; created_at: string }[]
  >([])

  useEffect(() => {
    fetch('/api/alertas')
      .then(r => r.json())
      .then(j => j.success && setAlertas(j.data))
      .catch(console.error)
  }, [])

  const markAsRead = async (id: string) => {
    await fetch(`/api/alertas/${id}/leida`, { method: 'PUT' })
    setAlertas(alertas.filter(a => a.id !== id))
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>Alertas Pendientes</h1>
      {alertas.length === 0
        ? <p>No hay alertas por el momento.</p>
        : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {alertas.map(a => (
              <li key={a.id} style={{
                border: '1px solid #ddd',
                borderRadius: 4,
                padding: 12,
                marginBottom: 12,
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <div>
                  <p><strong>Producto:</strong> {a.producto_maestro_id}</p>
                  <p><strong>Precio nuevo:</strong> ${a.precio_nuevo.toFixed(2)}</p>
                  <p><strong>Promedio 90d:</strong> ${a.precio_promedio.toFixed(2)}</p>
                  <p><strong>Diferencia:</strong> ${a.diferencia.toFixed(2)}</p>
                  <p style={{ fontSize: 12, color: '#666' }}>
                    {new Date(a.created_at).toLocaleString()}
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Link href={`/home/alertas/${a.id}`}>
                    <button>Ver histórico</button>
                  </Link>
                  <button onClick={() => markAsRead(a.id)}>Marcar leído</button>
                </div>
              </li>
            ))}
          </ul>
        )
      }
    </div>
  )
}
