// frontend/components/Sidebar.js
import Link from 'next/link';
import styles from './Sidebar.module.css';

// ==========================================================
// ¡CAMBIO CLAVE! Ahora aceptamos la prop 'onLinkClick'.
// ==========================================================
export default function Sidebar({ onLinkClick }) { 
  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        Celesta
      </div>
      <ul className={styles.navList}>
        <li>
          {/* ========================================================== */}
          {/* ¡AÑADIMOS onClick A CADA LINK!                            */}
          {/* ========================================================== */}
          <Link href="/home" className={styles.navLink} onClick={onLinkClick}>
            Inicio
          </Link>
        </li>
        <li>
          <Link href="/home/compras" className={styles.navLink} onClick={onLinkClick}>
            Compras
          </Link>
        </li>
        <li>
          <Link href="/home/proveedores" className={styles.navLink} onClick={onLinkClick}>
            Proveedores
          </Link>
        </li>
        <li>
          <Link href="/home/categorias" className={styles.navLink} onClick={onLinkClick}>
            Categorías
          </Link>
        </li>
      </ul>
    </aside>
  );
}