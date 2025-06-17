// frontend/app/home/page.js
"use client";

import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import styles from './HomePage.module.css'; // Importamos nuestros nuevos estilos
import { FaChartLine, FaTags, FaBell } from 'react-icons/fa'; // Importamos los íconos

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return <div>Cargando o redirigiendo...</div>;
  }

  return (
    <div>
      <main>
        <div className={styles.welcomeCard}>
          <h1 className={styles.mainTitle}>Bienvenido a Celesta</h1>
          <p className={styles.subtitle}>
            Tu socio digital para la gestión inteligente de compras.
          </p>
          <hr className={styles.divider} />

          {/* Sección de Funcionalidades Clave con Íconos */}
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

          {/* Sección de Llamada a la Acción */}
          <div className={styles.ctaBox}>
            <p style={{ margin: 0, fontWeight: 500 }}>
              Utiliza el menú de la izquierda para registrar tu primera compra o explorar tus proveedores y categorías.
            </p>
          </div>

        </div>
      </main>
    </div>
  );
}