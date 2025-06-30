'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { FiArrowLeft } from 'react-icons/fi';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions,
  ScriptableContext
} from 'chart.js';
import type { TooltipItem } from 'chart.js';
import styles from '../AlertasDetail.module.css';

// ① Registra Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// ② Carga react-chartjs-2 dinámicamente
const Line = dynamic(() => import('react-chartjs-2').then(m => m.Line), {
  ssr: false
});

// helper robusto para parsear fechas de distintos formatos
function parseDate(val: any): Date {
  if (val instanceof Date) return val;
  if (typeof val === 'string') {
    const iso = val.includes(' ') ? val.replace(' ', 'T') : val;
    return new Date(iso);
  }
  if (val && typeof val === 'object') {
    if ('value' in val && typeof val.value === 'string') {
      const iso = val.value.includes(' ') ? val.value.replace(' ', 'T') : val.value;
      return new Date(iso);
    }
    if ('seconds' in val && typeof val.seconds === 'number') {
      return new Date(val.seconds * 1000);
    }
  }
  // fallback genérico
  return new Date(String(val));
}

export default function AlertaDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [alerta, setAlerta] = useState<{
    producto_maestro_id: string;
    precio_nuevo: number;
    precio_promedio: number;
    diferencia: number;
    created_at: any;
  } | null>(null);
  const [history, setHistory] = useState<{ fecha: string; precio: number }[]>([]);

  // 1) Traigo la alerta exacta
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/alertas/${id}`)
      .then(r => r.json())
      .then(j => j.success && setAlerta(j.data))
      .catch(console.error);
  }, [id]);

  // 2) Cuando la tengo, cargo su histórico
  useEffect(() => {
    if (!alerta) return;
    fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/precios-historico/${alerta.producto_maestro_id}`
    )
      .then(r => r.json())
      .then(j => {
        if (j.success) setHistory(j.data);
      })
      .catch(console.error);
  }, [alerta]);

  // 3) Estados de carga / no encontrada
  if (alerta === null) {
    return <p style={{ padding: 16 }}>Cargando alerta…</p>;
  }
  if (!alerta) {
    return <p style={{ padding: 16, color: 'red' }}>Alerta no encontrada.</p>;
  }

  // 4) Formateo la fecha usando parseDate
  const fechaObj = parseDate(alerta.created_at);
  const fechaStr = isNaN(fechaObj.getTime())
    ? '—'
    : fechaObj.toLocaleString();

  // 5) Preparo datos para el gráfico
  const labels = history.map(h => {
    const d = parseDate(h.fecha);
    return isNaN(d.getTime())
      ? '—'
      : d.toLocaleDateString();
  });
  const dataPoints = history.map(h => h.precio);

  const chartData: ChartData<'line', number[], unknown> = {
    labels,
    datasets: [
      {
        label: 'Precio unitario',
        data: dataPoints,
        fill: true,
        backgroundColor: (ctx: ScriptableContext<'line'>) => {
          const {
            chart: { ctx: chartCtx, chartArea }
          } = ctx;
          if (!chartArea) return 'rgba(25,118,210,0.2)';
          const grad = chartCtx.createLinearGradient(
            0,
            chartArea.top,
            0,
            chartArea.bottom
          );
          grad.addColorStop(0, 'rgba(25,118,210,0.4)');
          grad.addColorStop(1, 'rgba(25,118,210,0)');
          return grad;
        },
        borderColor: 'rgba(25,118,210,1)',
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: '#fff',
        pointBorderColor: 'rgba(25,118,210,1)'
      }
    ]
  };

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: TooltipItem<'line'>) =>
            new Intl.NumberFormat('es-CL', {
              style: 'currency',
              currency: 'CLP',
              maximumFractionDigits: 0
            }).format(ctx.parsed.y!)
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: { display: true, text: 'Fecha' },
        grid: { display: false }
      },
      y: {
        display: true,
        title: { display: true, text: 'Precio (CLP)' },
        ticks: {
          callback: (v: string | number) =>
            new Intl.NumberFormat('es-CL', {
              style: 'currency',
              currency: 'CLP',
              maximumFractionDigits: 0
            }).format(Number(v))
        },
        grid: { color: 'rgba(0,0,0,0.05)' }
      }
    }
  };

  // 6) Render
  return (
    <div className={styles.detailContainer}>
      <button onClick={() => router.back()} className={styles.backButton}>
        <FiArrowLeft /> Volver a alertas
      </button>

      <h1 className={styles.pageTitle}>Alerta #{id}</h1>
      <div className={styles.detailCard}>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Producto:</span>
          <span className={styles.detailValue}>
            {alerta.producto_maestro_id}
          </span>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Precio nuevo:</span>
          <span className={styles.detailValue}>
            {new Intl.NumberFormat('es-CL', {
              style: 'currency',
              currency: 'CLP'
            }).format(alerta.precio_nuevo)}
          </span>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Promedio 90d:</span>
          <span className={styles.detailValue}>
            {new Intl.NumberFormat('es-CL', {
              style: 'currency',
              currency: 'CLP'
            }).format(alerta.precio_promedio)}
          </span>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Diferencia:</span>
          <span className={styles.detailValue}>
            {new Intl.NumberFormat('es-CL', {
              style: 'currency',
              currency: 'CLP'
            }).format(alerta.diferencia)}
          </span>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Fecha:</span>
          <span className={styles.timestamp}>{fechaStr}</span>
        </div>
      </div>

      <div className={styles.chartSection}>
        <h2>Histórico de Precios</h2>
        {history.length === 0 ? (
          <p>No hay datos históricos para este producto.</p>
        ) : (
          <div className={styles.chartBox}>
            <Line data={chartData} options={chartOptions} />
          </div>
        )}
      </div>
    </div>
  );
}
