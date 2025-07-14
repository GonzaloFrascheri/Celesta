'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import styles from './Alertas.module.css';
import 'chart.js/auto';

import {
  Chart as ChartJS,
  CategoryScale,   // <- escala X para gráficos de línea
  LinearScale,     // <- escala Y (linear)
  PointElement,    // <- puntos de la línea
  LineElement,     // <- la propia línea
  ArcElement,      // <- para pie / doughnut
  LineController,  // <— IMPORTAR aquí
  PieController,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions
} from 'chart.js';

// 2️⃣ Registra las piezas
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  LineController,
  PieController,
  Title,
  Tooltip,
  Legend
);

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

  // Opciones para el gráfico de líneas
  const lineOptions: ChartOptions<'line'> = {
    responsive: true,
    plugins: {
      legend: { display: true, position: 'top' },
      title: { display: true, text: 'Alertas diarias' }
    },
    scales: {
      x: { title: { display: true, text: 'Fecha' } },
      y: { title: { display: true, text: 'Cantidad de alertas' }, beginAtZero: true }
    }
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
    plugins: { title:{ display:true, text:'Top 3 productos por alertas' }, legend:{ position:'right' } }
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
    plugins: { title:{ display:true, text:'Top 3 proveedores por alertas' }, legend:{ position:'right' } }
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
      </div>

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
