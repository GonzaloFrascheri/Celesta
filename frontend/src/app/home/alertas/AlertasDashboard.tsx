'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import styles from './Alertas.module.css';

// Chart.js
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  ChartData,
  ChartOptions
} from 'chart.js';

ChartJS.register(ArcElement, Title, Tooltip, Legend);

// Carga dinámica para no romper SSR
const Line = dynamic(() => import('react-chartjs-2').then(m => m.Line), { ssr: false });
const Pie  = dynamic(() => import('react-chartjs-2').then(m => m.Pie),  { ssr: false });

interface ProdMetric { producto_maestro_id: string; total_alertas: number; }
interface ProvMetric { proveedor_id: string;        total_alertas: number; }
interface ProvInfo   { id: string; razon_social: string; }

export default function AlertasDashboard() {
  const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
  const [daily,    setDaily]    = useState<{ dia:any; total_alertas:number }[]>([]);
  const [byProduct,setByProd]   = useState<ProdMetric[]>([]);
  const [byProv,   setByProv]   = useState<ProvMetric[]>([]);
  const [provs,    setProvs]    = useState<ProvInfo[]>([]);

  useEffect(() => {
    if (!API) return;

    fetch(`${API}/alertas/metrics/diarias`)
      .then(r => r.json()).then(j => j.success && setDaily(j.data))
      .catch(console.error);

    fetch(`${API}/alertas/metrics/productos`)
      .then(r => r.json()).then(j => j.success && setByProd(j.data))
      .catch(console.error);

    fetch(`${API}/alertas/metrics/proveedores`)
      .then(r => r.json()).then(j => j.success && setByProv(j.data))
      .catch(console.error);

    fetch(`${API}/proveedor`)
      .then(r => r.json()).then(j => j.success && setProvs(j.data))
      .catch(console.error);
  }, [API]);

  // helper para formatear la fecha
  function formatDia(raw: any): string {
    if (!raw) return '—';
    if (typeof raw === 'string') return raw.split(' ')[0];
    if (typeof raw === 'object' && 'value' in raw) return raw.value.split(' ')[0];
    return String(raw);
  }

  // mapping de proveedor_id → razon_social
  const provMap = useMemo(() => {
    const m: Record<string,string> = {};
    provs.forEach(p => m[p.id] = p.razon_social);
    return m;
  }, [provs]);

  // 2️⃣ Preparo datos para charts
  const lineData: ChartData<'line'> = {
    labels: daily.map(d => formatDia(d.dia)),
    datasets: [{
      label: 'Alertas por día',
      data: daily.map(d => d.total_alertas),
      borderColor: 'rgba(25,118,210,1)',
      backgroundColor: 'rgba(25,118,210,0.2)',
      tension: 0.2,
      pointRadius: 4
    }]
  };
  const lineOptions: ChartOptions<'line'> = {
    plugins: { title:{ display:true, text:'Evolución diaria de alertas' }, legend:{ position:'top' } },
    scales:   { y:{ beginAtZero:true, ticks:{ stepSize:1 } } }
  };

  // Pie para Productos
  const pieProdData: ChartData<'pie'> = {
    labels: byProduct.map(p => p.producto_maestro_id),
    datasets: [{
      data: byProduct.map(p => p.total_alertas),
      backgroundColor: [
        'rgba(244, 67, 54, 0.6)',
        'rgba(255, 235, 59, 0.6)',
        'rgba(76, 175, 80, 0.6)',
        'rgba(33, 150, 243, 0.6)',
        'rgba(156, 39, 176, 0.6)'
      ]
    }]
  };
  const pieProdOptions: ChartOptions<'pie'> = {
    plugins: { title:{ display:true, text:'Top productos por alertas' }, legend:{ position:'right' } }
  };

  // Pie para Proveedores (por razon_social)
  const pieProvData: ChartData<'pie'> = {
    labels: byProv.map(p => provMap[p.proveedor_id] || p.proveedor_id),
    datasets: [{
      data: byProv.map(p => p.total_alertas),
      backgroundColor: [
        'rgba(0, 150, 136, 0.6)',
        'rgba(63, 81, 181, 0.6)',
        'rgba(255, 152, 0, 0.6)',
        'rgba(233, 30, 99, 0.6)',
        'rgba(0, 188, 212, 0.6)'
      ]
    }]
  };
  const pieProvOptions: ChartOptions<'pie'> = {
    plugins: { title:{ display:true, text:'Top proveedores por alertas' }, legend:{ position:'right' } }
  };

  return (
    <div className={styles.dashboardContainer}>

      {/* —— KPI CARDS —— */}
      <div className={styles.kpiContainer}>
        <div className={styles.kpiCard}>
          <h3>Total alertas</h3>
          <p>{ byProduct.reduce((s,p)=>s+p.total_alertas,0) }</p>
        </div>
        <div className={styles.kpiCard}>
          <h3>Alertas hoy</h3>
          <p>{
            daily.find(d => formatDia(d.dia) === new Date().toISOString().slice(0,10))
            ?.total_alertas ?? 0
          }</p>
        </div>
        <div className={styles.kpiCard}>
          <h3>Promedio diario</h3>
          <p>{ (daily.reduce((s,d)=>s+d.total_alertas,0)/(daily.length||1)).toFixed(1) }</p>
        </div>
      </div>

      {/* —— TOP 3 PRODUCTOS —— */}
      <section className={styles.top3Section}>
        <h2>Top 3 Productos con más alertas</h2>
        <div className={styles.top3Container}>
          {byProduct.slice(0,3).map(p => (
            <div key={p.producto_maestro_id} className={styles.top3Card}>
              <span className={styles.top3Title}>{p.producto_maestro_id}</span>
              <span>{p.total_alertas} alertas</span>
            </div>
          ))}
        </div>
      </section>

      {/* —— TOP 3 PROVEEDORES —— */}
      <section className={styles.top3Section}>
        <h2>Top 3 Proveedores con más alertas</h2>
        <div className={styles.top3Container}>
          {byProv.slice(0,3).map(p => (
            <div key={p.proveedor_id} className={styles.top3Card}>
              <span className={styles.top3Title}>
                { provMap[p.proveedor_id] || p.proveedor_id }
              </span>
              <span>{p.total_alertas} alertas</span>
            </div>
          ))}
        </div>
      </section>

       {/* Gráfica diaria + tortas agrupadas en cards */}
      <div className={styles.chartCard}>
        <div className={styles.dashboardCharts}>
          <div className={styles.chartContainer}>
            <Line data={lineData} options={lineOptions} />
          </div>
          <div className={styles.chartContainer}>
            <Pie data={pieProdData} options={pieProdOptions} />
          </div>
          <div className={styles.chartContainer}>
            <Pie data={pieProvData} options={pieProvOptions} />
          </div>
        </div>
      </div>
    </div>
  );
}
