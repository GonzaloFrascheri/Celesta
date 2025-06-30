'use client';
import { useState, useEffect } from 'react';
import AlertasDashboard from './AlertasDashboard';
import AlertCard from './AlertCard';
import styles from './Alertas.module.css';
import { FiBell } from 'react-icons/fi';

export default function AlertasPage() {
  const API = process.env.NEXT_PUBLIC_API_URL!.replace(/\/$/, '');
  const [pendientes,   setPendientes]   = useState<any[]>([]);
  const [historial,    setHistorial]    = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);

  // Carga pendientes (leida=false) y todo el historial (leida=true)
  useEffect(() => {
    Promise.all([
      fetch(`${API}/alertas?leida=false`).then(r => r.json()),
      fetch(`${API}/alertas?leida=true`).then(r => r.json()),
    ])
    .then(([p, h]) => {
      if (p.success) setPendientes(p.data);
      if (h.success) setHistorial(h.data);
    })
    .catch(console.error)
    .finally(() => setLoading(false));
  }, [API]);

  // Manejador de “marcar como leído”
  const markAsRead = async (id: string) => {
    await fetch(`${API}/alertas/${id}/leida`, { method: 'PUT' });
    setPendientes(p => p.filter(a => a.id !== id));
    // opcional: recargar historial
    const h = await fetch(`${API}/alertas?leida=true`).then(r => r.json());
    if (h.success) setHistorial(h.data);
  };

  if (loading) return <p>Cargando alertas…</p>;

  return (
    
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>
        <FiBell className={styles.icon} />
        Notificaciones de Precios
      </h1>

      <section className={styles.section}>
        <h2>Alertas por Leer ({pendientes.length})</h2>
        {pendientes.length === 0
          ? <p>No tienes alertas pendientes.</p>
          : <ul className={styles.list}>
              {pendientes.map(a => (
                <AlertCard
                  key={a.id}
                  {...{
                    id: a.id,
                    producto: a.producto_maestro_id,
                    precioNuevo: a.precio_nuevo,
                    precioPromedio: a.precio_promedio,
                    diferencia: a.diferencia,
                    createdAt: a.created_at
                  }}
                  onMarkRead={markAsRead}
                />
              ))}
            </ul>
        }
      </section>

      <AlertasDashboard />

      <section className={styles.section}>
        <h2>Historial de Alertas ({historial.length})</h2>
        {historial.length === 0
          ? <p>No hay alertas leídas aún.</p>
          : <ul className={styles.list}>
              {historial.map(a => (
                <AlertCard
                  key={a.id}
                  {...{
                    id: a.id,
                    producto: a.producto_maestro_id,
                    precioNuevo: a.precio_nuevo,
                    precioPromedio: a.precio_promedio,
                    diferencia: a.diferencia,
                    createdAt: a.created_at
                  }}
                  onMarkRead={() => {}}
                />
              ))}
            </ul>
        }
      </section>
    </div>
  );
}
