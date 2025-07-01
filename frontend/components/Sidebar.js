'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import styles from './Sidebar.module.css';

export default function Sidebar({ onLinkClick }) {
  // 1️⃣ Traemos la URL base (sin barra final)
  const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');

  const [alertCount, setAlertCount] = useState(0);
  const [cfeCount,   setCfeCount]   = useState(0);

  useEffect(() => {
    if (!API) {
      console.error('NEXT_PUBLIC_API_URL no está definido');
      return;
    }
    // 2️⃣ Asegúrate de llamar a /api/alertas
    fetch(`${API}/alertas`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(j => {
        if (j.success) setAlertCount(j.data.length);
      })
      .catch(err => console.error('Error al leer alertas:', err));
  }, [API]);

  useEffect(() => {
    if (!API) return;
    fetch(`${API}/cfes?limit=10`)
      .then(r => r.json())
      .then(j => {
        if (j.success && Array.isArray(j.data?.items)) {
          setCfes(j.data.items);
        } else {
          console.warn('API CFEs fallo:', j.error);
          setCfes([]);      // sin CFEs
        }
      })
      .catch(err => {
        console.error('Fetch CFEs error:', err);
        setCfes([]);
      });
  }, [API]);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>Celesta</div>
      <ul className={styles.navList}>
        <li><Link href="/home"   className={styles.navLink} onClick={onLinkClick}>Inicio</Link></li>
        <li><Link href="/home/compras"    className={styles.navLink} onClick={onLinkClick}>Compras</Link></li>
        <li><Link href="/home/clientes"   className={styles.navLink} onClick={onLinkClick}>Clientes</Link></li>
        <li><Link href="/home/proveedores"className={styles.navLink} onClick={onLinkClick}>Proveedores</Link></li>
        <li><Link href="/home/categorias" className={styles.navLink} onClick={onLinkClick}>Categorías</Link></li>
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
