'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const Line = dynamic(() => import('react-chartjs-2').then(m => m.Line), { ssr: false });

export default function AlertaDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [alerta, setAlerta] = useState<any>(null);
  const [history, setHistory] = useState<{ fecha: string, precio: number }[]>([]);

  useEffect(() => {
    const API = process.env.NEXT_PUBLIC_API_URL;
    fetch(`${API}/alertas`)
      .then(r => r.json())
      .then(j => {
        if (j.success) {
          const found = j.data.find((a: any) => a.id === id);
          setAlerta(found);
        }
      });
  }, [id]);

  useEffect(() => {
    if (!alerta) return;
    const API = process.env.NEXT_PUBLIC_API_URL;
    fetch(`${API}/precios-historico/${alerta.producto_maestro_id}`)
      .then(r => r.json())
      .then(j => j.success && setHistory(j.data))
      .catch(console.error);
  }, [alerta]);

  if (!alerta) return <p>Cargando alerta…</p>;

  const data = {
    labels: history.map(h => new Date(h.fecha).toLocaleDateString()),
    datasets: [{
      label: 'Precio unitario',
      data: history.map(h => h.precio),
      fill: false,
      tension: 0.2
    }]
  };

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
      {history.length > 0
        ? <Line data={data} />
        : <p>Cargando gráfico…</p>
      }
    </div>
  );
}
