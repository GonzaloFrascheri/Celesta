// src/app/home/alertas/AlertCard.tsx
'use client';

import styles from './Alertas.module.css';
import Link from 'next/link';

interface AlertCardProps {
  id: string;
  producto: string;
  precioNuevo: number;
  precioPromedio: number;
  diferencia: number;
  createdAt: any;   // aquí llega tu campo created_at
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
  // 1) Determinamos un Date válido:
  let fechaObj: Date;
  
  if (createdAt instanceof Date) {
    fechaObj = createdAt;
  } else if (typeof createdAt === 'string') {
    // si viene "2025-06-27 18:45:00" convertimos espacio → "T"
    const iso = createdAt.includes(' ') ? createdAt.replace(' ', 'T') : createdAt;
    fechaObj = new Date(iso);
  } else if (
    createdAt && 
    typeof createdAt === 'object' && 
    'value' in createdAt && 
    typeof createdAt.value === 'string'
  ) {
    // BigQuery a veces devuelve { value: "2025-06-27 18:45:00", ... }
    const val: string = createdAt.value;
    const iso = val.includes(' ') ? val.replace(' ', 'T') : val;
    fechaObj = new Date(iso);
  } else {
    // último recurso: forzamos a string
    fechaObj = new Date(String(createdAt));
  }

  // 2) Formateamos o ponemos placeholder
  const fechaStr = isNaN(fechaObj.getTime())
    ? '—'
    : fechaObj.toLocaleString();

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
          <span className={styles.label}>Promedio 90 días:</span>{' '}
          <span className={styles.value}>${precioPromedio.toFixed(2)}</span>
        </p>
        <p>
          <span className={styles.label}>Diferencia:</span>{' '}
          <span
            className={`${styles.value} ${
              diferencia > 0 ? styles.difPositive : styles.difNegative
            }`}
          >
            ${diferencia.toFixed(2)}
          </span>
        </p>
        <p className={styles.timestamp}>{fechaStr}</p>
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
