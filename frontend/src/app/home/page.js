// frontend/app/home/page.js
"use client";

import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import styles from './HomePage.module.css';
import { FaChartLine, FaTags, FaBell } from 'react-icons/fa';
// React Chart.js imports
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [dashboard, setDashboard] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Fetch dashboard summary
  useEffect(() => {
    async function loadDashboard() {
      try {
        const res = await fetch('/api/dashboard/summary');
        const json = await res.json();
        if (json.success) {
          setDashboard(json.data);
        } else {
          console.error('Error al cargar dashboard:', json.error);
        }
      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        setLoadingDashboard(false);
      }
    }
    loadDashboard();
  }, []);

  if (loading || !user) {
    return <div className={styles.fullScreenLoader}>Cargando o redirigiendo...</div>;
  }

  if (loadingDashboard || !dashboard) {
    return <div className={styles.fullScreenLoader}>Cargando datos del dashboard...</div>;
  }

  const { summary, monthly, byCategory } = dashboard;
  const labels = monthly.map(m => m.mes);
  const dataValues = monthly.map(m => m.monto);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Monto mensual',
        data: dataValues,
        fill: false,
        tension: 0.4
      }
    ]
  };

  return (
    <div>
      <main className={styles.pageContent}>
        {/* KPI Cards */}
        <div className={styles.kpiGrid}>
          <div className={styles.kpiCard}>
            <h3>Total Comprado</h3>
            <p>${summary.totalComprado.toLocaleString()}</p>
          </div>
          <div className={styles.kpiCard}>
            <h3>Total Facturas</h3>
            <p>{summary.totalFacturas}</p>
          </div>
          <div className={styles.kpiCard}>
            <h3>Categorías Analizadas</h3>
            <p>{byCategory.length}</p>
          </div>
        </div>

        {/* Evolución Mensual */}
        <div className={styles.chartContainer}>
          <Line
            data={chartData}
            options={{
              responsive: true,
              plugins: {
                legend: { position: 'top' },
                title: { display: true, text: 'Evolución de Compras Mensual' }
              }
            }}
          />
        </div>

        {/* Fallback: funcionalidades clave */}
        <div className={styles.featureGrid}>
          <div className={styles.featureItem}>
            <FaChartLine className={styles.featureIcon} />
            <span>Monitoreo del historial de precios.</span>
          </div>
          <div className={styles.featureItem}>
            <FaTags className={styles.featureIcon} />
            <span>Categorización automática de compras.</span>
          </div>
          <div className={styles.featureItem}>
            <FaBell className={styles.featureIcon} />
            <span>Alertas inteligentes ante fluctuaciones.</span>
          </div>
        </div>
      </main>
    </div>
  );
}
