// src/app/home/alertas/page.tsx
'use client';

import { useState, useEffect } from 'react';
import AlertCard from './AlertCard';
import styles from './Alertas.module.css';
import AlertasDashboard from './AlertasDashboard';

export default function AlertasPage() {
  const [alertas, setAlertas] = useState<any[]>([]);
  const API = process.env.NEXT_PUBLIC_API_URL!;

  useEffect(() => {
    fetch(`${API}/alertas`)
      .then(r => r.json())
      .then(j => j.success && setAlertas(j.data))
      .catch(console.error);
  }, [API]);

  const markAsRead = async (id: string) => {
    await fetch(`${API}/alertas/${id}/leida`, { method: 'PUT' });
    setAlertas(a => a.filter(x => x.id !== id));
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h1>Alertas Pendientes</h1>
      <AlertasDashboard />

      {alertas.length === 0
        ? <p>No hay alertas por el momento.</p>
        : (
          <ul className={styles.list}>
            {alertas.map(a => (
              <AlertCard
                key={a.id}
                id={a.id}
                producto={a.producto_maestro_id}
                precioNuevo={a.precio_nuevo}
                precioPromedio={a.precio_promedio}
                diferencia={a.diferencia}
                createdAt={a.created_at}
                onMarkRead={markAsRead}
              />
            ))}
          </ul>
        )
      }
    </div>
  );
}
