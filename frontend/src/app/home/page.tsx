'use client';

import React, { useState, useEffect } from 'react';
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
import styles from './HomePage.module.css';

// Registramos los componentes de Chart.js que vamos a utilizar
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface CFEItemDetail {
  nombre_item: string;
  monto_item: number;
}

interface CFE {
  id: string;
  fecha_procesamiento: { value: string };
  monto_total: number | null;
  emisor_nombre?: string;
  detalles?: {
    items: CFEItemDetail[];
  };
}

interface Alert {
  id: string;
  leida: boolean;
  // ... otros campos
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

// Componente para el gráfico de Top Productos
const TopProductsChart = ({ data }: { data: any }) => {
  const options = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Top 5 Productos (Monto Total)',
      },
    },
    scales: {
      x: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div className={styles.chartContainer}>
      <Bar options={options} data={data} />
    </div>
  );
};

// Componente para la lista de Top Proveedores
const TopProvidersList = ({
  providers,
}: {
  providers: { name: string; total: number }[];
}) => (
  <div className={styles.listContainer}>
    {providers.length > 0 ? (
      <ol className={styles.orderedList}>
        {providers.map((provider, index) => (
          <li key={index} className={styles.listItem}>
            <span className={styles.listItemName} title={provider.name}>
              {provider.name}
            </span>
            <span className={styles.listItemValue}>
              {`$ ${provider.total.toLocaleString('es-UY')}`}
            </span>
          </li>
        ))}
      </ol>
    ) : (
      <p className={styles.emptyListText}>
        No hay datos de proveedores para este mes.
      </p>
    )}
  </div>
);


// --- Componente Principal de la Página ---

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    invoicesThisMonth: 0,
    xmlsThisMonth: 0,
    alerts: 0, // Se calculará desde la API
  });
  const [purchasesChartData, setPurchasesChartData] = useState<any>({
    labels: [],
    datasets: [],
  });
  const [topProductsData, setTopProductsData] = useState<any>({
    labels: [],
    datasets: [],
  });
  const [topProviders, setTopProviders] = useState<
    { name: string; total: number }[]
  >([]);

  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL;

    // 1. Cargar Alertas no leídas
    fetch(`${API_URL}/alertas`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          const unreadAlerts = json.data.filter(
            (alert: Alert) => !alert.leida
          ).length;
          setStats((prev) => ({ ...prev, alerts: unreadAlerts }));
        }
      })
      .catch((err) => console.error("Error al cargar alertas:", err));

    // 2. Cargar datos de facturas (CFEs)
    fetch(`${API_URL}/cfes?limit=2000`) // Aumentamos el límite para tener más datos
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          const cfes: CFE[] = json.data.items;
          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

          const invoicesThisMonth = cfes.filter(cfe => {
            const cfeDate = new Date(cfe.fecha_procesamiento.value);
            return cfeDate >= startOfMonth && cfeDate <= now;
          });

          // Tarjetas de Resumen
          setStats(prev => ({
            ...prev,
            invoicesThisMonth: invoicesThisMonth.length,
            xmlsThisMonth: invoicesThisMonth.length,
          }));

          // Gráfico de Compras (últimos 6 meses)
          const monthlyPurchases: { [key: string]: number } = {};
          const monthLabels: string[] = [];
          
          for (let i = 12; i >= 0; i--) {
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

          setPurchasesChartData({
            labels: monthLabels,
            datasets: [
              {
                label: 'Monto Total de Compras (UYU)',
                data: Object.values(monthlyPurchases),
                backgroundColor: 'rgba(53, 162, 235, 0.5)',
              },
            ],
          });

          // Top 10 Proveedores (este mes)
          const providerTotals = new Map<string, number>();
          invoicesThisMonth.forEach(cfe => {
            if (cfe.emisor_nombre && cfe.monto_total) {
              const currentTotal = providerTotals.get(cfe.emisor_nombre) || 0;
              providerTotals.set(cfe.emisor_nombre, currentTotal + cfe.monto_total);
            }
          });
          const sortedProviders = Array.from(providerTotals.entries())
            .sort(([, totalA], [, totalB]) => totalB - totalA)
            .slice(0, 10)
            .map(([name, total]) => ({ name, total }));
          setTopProviders(sortedProviders);
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

      <div className={styles.mainGrid}>
        <div className={styles.mainChartSection}>
          <h2 className={styles.sectionTitle}>Gráfico de Compras</h2>
          <div className={styles.chartContainer}>
            <PurchasesChart data={purchasesChartData} />
          </div>
        </div>
        <div className={styles.sideSection}>
          <h2 className={styles.sectionTitle}>Top 10 Proveedores este mes</h2>
          <TopProvidersList providers={topProviders} />
        </div>
      </div>
    </div>
  );
}
