'use client';

import styles from './Alertas.module.css';
import Link from 'next/link';

interface AlertCardProps {
  id: string;
  producto: string;
  precioNuevo: number;
  precioPromedio: number;
  diferencia: number;
  createdAt: string;
  onMarkRead: (id: string) => void;
}

export default function AlertCard({
  id,
  producto,
  precioNuevo,
  precioPromedio,
  diferencia,
  createdAt,
  onMarkRead
}: AlertCardProps) {
  return (
    <li className={styles.card}>
      <div className={styles.info}>
        <p>
          <span className={styles.label}>Producto:</span>{' '}
          <span className={styles.value}>{producto}</span>
        </p>
        <p>
          <span className={styles.label}>Precio nuevo:</span>{' '}
          <span className={styles.value}>${precioNuevo.toFixed(2)}</span>
        </p>
        <p>
          <span className={styles.label}>Promedio 90d:</span>{' '}
          <span className={styles.value}>${precioPromedio.toFixed(2)}</span>
        </p>
        <p>
          <span className={styles.label}>Diferencia:</span>{' '}
          <span className={styles.value}>${diferencia.toFixed(2)}</span>
        </p>
        {/* sólo mostramos el string que ya llega formateado por el backend */}
        <p className={styles.timestamp}>{createdAt}</p>
      </div>
      <div className={styles.actions}>
        <Link href={`/home/alertas/${id}`}>
          <button className={styles.button}>Ver histórico</button>
        </Link>
        <button
          className={`${styles.button} ${styles.outline}`}
          onClick={() => onMarkRead(id)}
        >
          Marcar leído
        </button>
      </div>
    </li>
  );
}
