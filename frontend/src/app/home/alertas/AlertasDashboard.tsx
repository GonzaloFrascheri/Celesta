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
  Legend
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

export default function AlertasDashboard() {
  // Base URL sin slash final
  const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');

  const [daily, setDaily] = useState<
    { dia: string; total_alertas: number }[]
  >([]);
  const [byProduct, setByProd] = useState<
    { producto_maestro_id: string; total_alertas: number }[]
  >([]);

  useEffect(() => {
    if (!API) return;

    // 3️⃣ Llama al endpoint con /api/
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
  const lineData = {
    labels: daily.map(d => d.dia),
    datasets: [
      {
        label: 'Alertas por día',
        data: daily.map(d => d.total_alertas),
        fill: false,
        tension: 0.2
      }
    ]
  };

  const barData = {
    labels: byProduct.map(p => p.producto_maestro_id),
    datasets: [
      {
        label: 'Alertas',
        data: byProduct.map(p => p.total_alertas),
        backgroundColor: byProduct.map(() => 'rgba(25, 118, 210, 0.6)')
      }
    ]
  };

  return (
    <div style={{ marginBottom: '2rem' }}>
      <h2>Métricas de Alertas</h2>
      <div className={styles.dashboardCharts}>
        <div className={styles.chartContainer}>
          <Line data={lineData} />
        </div>
        <div className={styles.chartContainer}>
          <Bar data={barData} />
        </div>
      </div>
    </div>
  );
}
