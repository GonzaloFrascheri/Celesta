'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import styles from './Alertas.module.css';

// 1️⃣ Importa y registra las escalas de Chart.js **antes** de usarlo
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions,
  ScriptableContext
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// 2️⃣ Carga dinámica para no romper el SSR
const Line = dynamic(
  () => import('react-chartjs-2').then(m => m.Line),
  { ssr: false }
);
const Bar = dynamic(
  () => import('react-chartjs-2').then(m => m.Bar),
  { ssr: false }
);

// helper para formatear el campo "dia" que puede venir como string u objeto
function formatDia(raw: any): string {
  if (!raw) return '—';
  if (typeof raw === 'string') {
    return raw.includes(' ') ? raw.split(' ')[0] : raw;
  }
  if (typeof raw === 'object' && typeof raw.value === 'string') {
    return raw.value.includes(' ') ? raw.value.split(' ')[0] : raw.value;
  }
  return String(raw);
}

export default function AlertasDashboard() {
  const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');

  const [daily, setDaily] = useState<{ dia: any; total_alertas: number }[]>([]);
  const [byProduct, setByProd] = useState<{ producto_maestro_id: string; total_alertas: number }[]>([]);

  useEffect(() => {
    if (!API) return;

    // Métricas diarias
    fetch(`${API}/alertas/metrics/diarias`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(j => j.success && setDaily(j.data))
      .catch(e => console.error('Error métricas diarias:', e));

    // Métricas por producto
    fetch(`${API}/alertas/metrics/productos`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(j => j.success && setByProd(j.data))
      .catch(e => console.error('Error métricas productos:', e));
  }, [API]);

  // 4️⃣ Prepara los datos para los charts
  const lineData: ChartData<'line'> = {
    labels: daily.map(d => formatDia(d.dia)),
    datasets: [
      {
        label: 'Alertas por día',
        data: daily.map(d => d.total_alertas),
        borderColor: 'rgba(25,118,210,1)',
        backgroundColor: 'rgba(25,118,210,0.2)',
        fill: false,
        tension: 0.2,
        pointRadius: 4,
        pointHoverRadius: 6
      }
    ]
  };

  const barData: ChartData<'bar'> = {
    labels: byProduct.map(p => p.producto_maestro_id),
    datasets: [
      {
        label: 'Alertas',
        data: byProduct.map(p => p.total_alertas),
        backgroundColor: byProduct.map(() => 'rgba(25,118,210,0.6)')
      }
    ]
  };

  const lineOptions: ChartOptions<'line'> = {
    plugins: {
      title: { display: true, text: 'Evolución diaria de alertas' },
      legend: { position: 'top' }
    },
    scales: {
      x: { title: { display: true, text: 'Día' } },
      y: {
        title: { display: true, text: 'Cantidad de alertas' },
        beginAtZero: true,
        ticks: { stepSize: 1 }
      }
    },
    animation: { duration: 800 }
  };

  const barOptions: ChartOptions<'bar'> = {
    plugins: {
      title: { display: true, text: 'Top 5 productos por alertas' },
      legend: { position: 'top' }
    },
    scales: {
      x: { title: { display: true, text: 'Producto Maestro' } },
      y: {
        title: { display: true, text: 'Total de alertas' },
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          callback: function (this, tickValue: string | number) {
            return Number(tickValue).toFixed(0);
          }
        }
      }
    },
    animation: { duration: 800 }
  };

  return (
    <div style={{ marginBottom: '2rem' }}>
      {/* —— KPI CARDS —— */}
      <div className={styles.kpiContainer}>
        <div className={styles.kpiCard}>
          <h3>Total alertas</h3>
          <p>{byProduct.reduce((sum, p) => sum + p.total_alertas, 0)}</p>
        </div>
        <div className={styles.kpiCard}>
          <h3>Alertas hoy</h3>
          <p>
            {
              daily.find(d => formatDia(d.dia) === new Date().toISOString().slice(0,10))
                ?.total_alertas ?? 0
            }
          </p>
        </div>
        <div className={styles.kpiCard}>
          <h3>Promedio diario</h3>
          <p>
            {(
              daily.reduce((sum, d) => sum + d.total_alertas, 0) /
              (daily.length || 1)
            ).toFixed(1)}
          </p>
        </div>
      </div>

      <h2>Métricas de Alertas</h2>
      <div className={styles.dashboardCharts}>
        <div className={styles.chartContainer}>
          <Line data={lineData} options={lineOptions} />
        </div>
        <div className={styles.chartContainer}>
          <Bar data={barData} options={barOptions} />
        </div>
      </div>
    </div>
  );
}
