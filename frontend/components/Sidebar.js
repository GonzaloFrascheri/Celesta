'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import styles from './Sidebar.module.css';

export default function Sidebar({ onLinkClick }) {

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
        </li>
        <li className={styles.navItemWithBadge}>
          <Link href="/home/cfes" className={styles.navLink} onClick={onLinkClick}>
            Facturas recibidas
          </Link>
        </li>
      </ul>
    </aside>
  );
}
