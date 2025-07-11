'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import styles from './Sidebar.module.css';

export default function Sidebar({ onLinkClick }) {
  // URL base de la API (sin slash final)
  const API = process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')
    : '';

  const [alertCount, setAlertCount] = useState(0);
  const [cfeCount, setCfeCount]     = useState(0);
  const esRef = useRef(null);

  // 1️⃣ Carga inicial de alertas
  useEffect(() => {
    if (!API) return;
    fetch(`${API}/alertas`)
      .then(res => res.json())
      .then(j => {
        if (j.success && Array.isArray(j.data)) {
          setAlertCount(j.data.length);
        }
      })
      .catch(err => console.error('Error al leer alertas:', err));
  }, [API]);

  // 2️⃣ Carga inicial de CFEs
  useEffect(() => {
    if (!API) return;
    fetch(`${API}/cfes?limit=10`)
      .then(res => res.json())
      .then(j => {
        if (j.success && Array.isArray(j.data?.items)) {
          setCfeCount(j.data.items.length);
        }
      })
      .catch(err => console.error('Error al leer CFEs:', err));
  }, [API]);

  // 3️⃣ SSE para notificaciones push de nuevas alertas / CFEs
  useEffect(() => {
    if (!API || typeof window === 'undefined') return;

    // Pedimos permiso de notificaciones si hace falta
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(console.error);
    }

    const es = new EventSource(`${API}/notifications/stream`);
    esRef.current = es;

    // Cuando llegue evento de nuevas alertas
    es.addEventListener('newAlert', e => {
      const delta = Number(e.data) || 0;
      setAlertCount(prev => prev + delta);
      if (Notification.permission === 'granted' && delta > 0) {
        new Notification('¡Tienes nuevas alertas!', {
          body: `Han llegado ${delta} alerta(s).`
        });
      }
    });

    // Cuando llegue evento de nuevos CFEs
    es.addEventListener('newCfe', e => {
      const delta = Number(e.data) || 0;
      setCfeCount(prev => prev + delta);
      if (Notification.permission === 'granted' && delta > 0) {
        new Notification('¡Nuevo(s) CFE(s)!', {
          body: `Se han recibido ${delta} CFE(s).`
        });
      }
    });

    es.onerror = err => {
      console.error('SSE error:', err);
      // El navegador intenta reconectar automáticamente
    };

    return () => {
      es.close();
    };
  }, [API]);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>Celesta</div>
      <ul className={styles.navList}>
        <li>
          <Link href="/home" className={styles.navLink} onClick={onLinkClick}>
            Inicio
          </Link>
        </li>
        <li>
          <Link
            href="/home/compras"
            className={styles.navLink}
            onClick={onLinkClick}
          >
            Compras
          </Link>
        </li>
        <li>
          <Link
            href="/home/clientes"
            className={styles.navLink}
            onClick={onLinkClick}
          >
            Clientes
          </Link>
        </li>
        <li>
          <Link
            href="/home/proveedores"
            className={styles.navLink}
            onClick={onLinkClick}
          >
            Proveedores
          </Link>
        </li>
        <li>
          <Link
            href="/home/categorias"
            className={styles.navLink}
            onClick={onLinkClick}
          >
            Categorías
          </Link>
        </li>
        <li className={styles.navItemWithBadge}>
          <Link
            href="/home/alertas"
            className={styles.navLink}
            onClick={onLinkClick}
          >
            Alertas
          </Link>
          {alertCount > 0 && (
            <span className={styles.badge}>{alertCount}</span>
          )}
        </li>
        <li className={styles.navItemWithBadge}>
          <Link href="/home/cfes" className={styles.navLink} onClick={onLinkClick}>
            CFEs
          </Link>
          {cfeCount > 0 && <span className={styles.badge}>{cfeCount}</span>}
        </li>
      </ul>
    </aside>
  );
}
