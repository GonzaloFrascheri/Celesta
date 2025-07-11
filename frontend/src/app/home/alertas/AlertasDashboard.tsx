'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import styles from './Alertas.module.css';

// Chart.js
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions
} from 'chart.js';
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,      // para Pie
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Dinámico para SSR
const Line = dynamic(() => import('react-chartjs-2').then(m => m.Line), { ssr: false });
const Pie  = dynamic(() => import('react-chartjs-2').then(m => m.Pie),  { ssr: false });

interface Daily { dia: any; total_alertas: number }
interface ByProd { producto_maestro_id: string; total_alertas: number }
interface ByProv { proveedor_id: string; total_alertas: number }

export default function AlertasDashboard() {
  const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');

  const [daily,    setDaily]  = useState<Daily[]>([]);
  const [byProd,   setByProd] = useState<ByProd[]>([]);
  const [byProv,   setByProv] = useState<ByProv[]>([]);

  useEffect(() => {
    if (!API) return;

    // métricas diarias
    fetch(`${API}/alertas/metrics/diarias`)
      .then(r => r.json())
      .then(j => j.success && setDaily(j.data))
      .catch(console.error);

    // top productos
    fetch(`${API}/alertas/metrics/productos`)
      .then(r => r.json())
      .then(j => j.success && setByProd(j.data))
      .catch(console.error);

    // **nuevo**: top proveedores
    fetch(`${API}/alertas/metrics/proveedores`)
      .then(r => r.json())
      .then(j => j.success && setByProv(j.data))
      .catch(console.error);
  }, [API]);

  // helper para formatear "dia"
  function fmtDia(raw: any) {
    if (!raw) return '—';
    const s = typeof raw === 'string' ? raw : raw.value;
    return s.split(' ')[0];
  }

  // top 3 arrays
  const top3Prod = byProd.slice(0, 3);
  const top3Prov = byProv.slice(0, 3);

  // Pie data para productos
  const pieProdData: ChartData<'pie'> = {
    labels: top3Prod.map(p => p.producto_maestro_id),
    datasets: [{
      data: top3Prod.map(p => p.total_alertas),
      backgroundColor: top3Prod.map((_,i) => `hsl(${i*60},60%,60%)`)
    }]
  };

  // Pie data para proveedores
  const pieProvData: ChartData<'pie'> = {
    labels: top3Prov.map(p => p.proveedor_id),
    datasets: [{
      data: top3Prov.map(p => p.total_alertas),
      backgroundColor: top3Prov.map((_,i) => `hsl(${i*60+180},60%,60%)`)
    }]
  };

  // Line chart (sin cambios)
  const lineData: ChartData<'line'> = {
    labels: daily.map(d => fmtDia(d.dia)),
    datasets: [{
      label: 'Alertas por día',
      data: daily.map(d => d.total_alertas),
      borderColor: 'rgba(25,118,210,1)',
      backgroundColor: 'rgba(25,118,210,0.2)',
      fill: false,
      tension: 0.2,
      pointRadius: 4,
      pointHoverRadius: 6
    }]
  };
  const lineOptions: ChartOptions<'line'> = {
    plugins: { title: { display: true, text: 'Evolución diaria de alertas' }, legend: { position: 'top' } },
    scales: {
      x: { title: { display: true, text: 'Día' } },
      y: { title: { display: true, text: 'Cantidad' }, beginAtZero: true, ticks: { stepSize: 1 } }
    },
    animation: { duration: 800 }
  };

  return (
    <div className={styles.dashboard}>

      {/* —— Top 3 Cards —— */}
      <h2>Top 3 Productos con más alertas</h2>
      <div className={styles.topCards}>
        {top3Prod.map(p => (
          <div key={p.producto_maestro_id} className={styles.topCard}>
            <strong>{p.producto_maestro_id}</strong>
            <span>{p.total_alertas} alertas</span>
          </div>
        ))}
      </div>

      <h2>Top 3 Proveedores con más alertas</h2>
      <div className={styles.topCards}>
        {top3Prov.map(p => (
          <div key={p.proveedor_id} className={styles.topCard}>
            <strong>{p.proveedor_id}</strong>
            <span>{p.total_alertas} alertas</span>
          </div>
        ))}
      </div>

      {/* —— Pie Charts —— */}
      <div className={styles.pieContainer}>
        <div className={styles.chartBox}>
          <h3>Productos</h3>
          <Pie data={pieProdData} />
        </div>
        <div className={styles.chartBox}>
          <h3>Proveedores</h3>
          <Pie data={pieProvData} />
        </div>
      </div>

      {/* —— Línea histórico —— */}
      <div className={styles.chartBox} style={{ marginTop: '2rem' }}>
        <Line data={lineData} options={lineOptions} />
      </div>
    </div>
  );
}
