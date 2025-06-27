'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'

// Cargamos el Line chart sólo en cliente
const Line = dynamic(
  () => import('react-chartjs-2').then(mod => mod.Line),
  { ssr: false }
)

export default function AlertaDetail() {
  const { id } = useParams()                // viene de /home/alertas/[id]
  const router = useRouter()
  const [alerta, setAlerta] = useState<any>(null)
  const [history, setHistory] = useState<{ fecha: string, precio: number }[]>([])

  // Cargo la alerta (para obtener producto_maestro_id)
  useEffect(() => {
    fetch('/api/alertas')
      .then(r => r.json())
      .then(j => {
        if (j.success) {
          const found = j.data.find((a: any) => a.id === id)
          setAlerta(found)
        }
      })
  }, [id])

  // Cargo el histórico cuando tengo la alerta
  useEffect(() => {
    if (!alerta) return
    fetch(`/api/precios-historico/${alerta.producto_maestro_id}`)
      .then(r => r.json())
      .then(j => j.success && setHistory(j.data))
      .catch(console.error)
  }, [alerta])

  if (!alerta) {
    return <p>Cargando alerta…</p>
  }

  // Preparo datos para Chart.js
  const data = {
    labels: history.map(h => new Date(h.fecha).toLocaleDateString()),
    datasets: [{
      label: 'Precio unitario',
      data: history.map(h => h.precio),
      fill: false,
      tension: 0.2
    }]
  }

  return (
    <div style={{ padding: 16 }}>
      <button onClick={() => router.back()} style={{ marginBottom: 16 }}>
        ← Volver a alertas
      </button>

      <h1>Alerta #{alerta.id}</h1>
      <p><strong>Producto:</strong> {alerta.producto_maestro_id}</p>
      <p><strong>Precio nuevo:</strong> ${alerta.precio_nuevo.toFixed(2)}</p>
      <p><strong>Promedio 90d:</strong> ${alerta.precio_promedio.toFixed(2)}</p>
      <p><strong>Diferencia:</strong> ${alerta.diferencia.toFixed(2)}</p>
      <p style={{ fontSize: 12, color: '#666' }}>
        {new Date(alerta.created_at).toLocaleString()}
      </p>

      <h2 style={{ marginTop: 24 }}>Histórico de Precios</h2>
      {history.length
        ? <Line data={data} />
        : <p>Cargando gráfico…</p>
      }
    </div>
  )
}
