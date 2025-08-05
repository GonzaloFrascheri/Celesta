'use client';

import { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import styles from '../../app/home/HomePage.module.css';

// Registramos los componentes de Chart.js que vamos a utilizar
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface CFE {
  id: string;
  fecha_procesamiento: { value: string };
  monto_total: number | null;
}

// --- Componentes Reutilizables ---

// Tarjeta para mostrar datos de resumen
const DashboardCard = ({ title, value, icon }: { title: string; value: string | number; icon: string }) => (
  <div className={styles.card}>
    <div className={styles.cardIcon}>{icon}</div>
    <div className={styles.cardContent}>
      <h3 className={styles.cardTitle}>{title}</h3>
      <p className={styles.cardValue}>{value}</p>
    </div>
  </div>
);

// Componente para el gráfico de compras
const PurchasesChart = ({ data }: { data: any }) => {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Resumen de Compras Mensuales',
      },
    },
    scales: {
        y: {
            beginAtZero: true
        }
    }
  };

  return (
    <div className={styles.chartContainer}>
      <Bar options={options} data={data} />
    </div>
  );
};


// --- Componente Principal de la Página ---

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    invoicesThisMonth: 0,
    xmlsThisMonth: 0,
    alerts: 3, // Valor de ejemplo
  });
  const [chartData, setChartData] = useState<any>({
    labels: [],
    datasets: [],
  });

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/cfes?limit=1000`)
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          const cfes: CFE[] = json.data.items;
          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

          // 1. & 2. Facturas y XMLs de este mes
          const invoicesThisMonth = cfes.filter(cfe => {
            const cfeDate = new Date(cfe.fecha_procesamiento.value);
            return cfeDate >= startOfMonth && cfeDate <= now;
          });

          // 4. Datos para el gráfico de compras (últimos 6 meses)
          const monthlyPurchases: { [key: string]: number } = {};
          const monthLabels: string[] = [];
          
          for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const monthName = d.toLocaleString('es-UY', { month: 'long' });
            monthlyPurchases[monthKey] = 0;
            monthLabels.push(monthName.charAt(0).toUpperCase() + monthName.slice(1));
          }

          cfes.forEach(cfe => {
            if (cfe.monto_total) {
              const cfeDate = new Date(cfe.fecha_procesamiento.value);
              const monthKey = `${cfeDate.getFullYear()}-${String(cfeDate.getMonth() + 1).padStart(2, '0')}`;
              if (monthlyPurchases.hasOwnProperty(monthKey)) {
                monthlyPurchases[monthKey] += cfe.monto_total;
              }
            }
          });

          setStats(prev => ({
            ...prev,
            invoicesThisMonth: invoicesThisMonth.length,
            xmlsThisMonth: invoicesThisMonth.length, // Asumo que es el mismo contador
          }));

          setChartData({
            labels: monthLabels,
            datasets: [
              {
                label: 'Monto Total de Compras (UYU)',
                data: Object.values(monthlyPurchases),
                backgroundColor: 'rgba(53, 162, 235, 0.5)',
              },
            ],
          });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className={styles.loadingText}>Cargando dashboard...</p>;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Dashboard</h1>
      <p className={styles.subtitle}>Resumen de la actividad reciente de tu empresa.</p>
      
      <div className={styles.cardsGrid}>
        <DashboardCard 
          title="Facturas de este mes" 
          value={stats.invoicesThisMonth}
          icon="📄" 
        />
        <DashboardCard 
          title="XMLs recibidos este mes" 
          value={stats.xmlsThisMonth}
          icon="📥"
        />
        <DashboardCard 
          title="Alertas que requieren atención" 
          value={stats.alerts}
          icon="⚠️"
        />
      </div>

      <div className={styles.chartSection}>
        <PurchasesChart data={chartData} />
      </div>
    </div>
  );
}
