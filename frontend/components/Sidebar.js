// frontend/components/Sidebar.js
import Link from 'next/link';
import styles from './Sidebar.module.css';

export default function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        Celesta
      </div>
      <ul className={styles.navList}>
        <li>
          {/* Usamos el componente Link de Next.js para la navegación */}
          <Link href="/home" className={styles.navLink}>
            Inicio
          </Link>
        </li>
        <li>
          <Link href="/home/compras" className={styles.navLink}>
            Nueva Compra
          </Link>
        </li>
        <li>
          <Link href="/home/proveedores" className={styles.navLink}>
            Proveedores
          </Link>
        </li>
         <li>
          <Link href="/home/categorias" className={styles.navLink}>
            Categorías
          </Link>
        </li>
      </ul>
    </aside>
  );
}