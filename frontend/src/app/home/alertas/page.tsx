// src/app/home/alertas/page.tsx
'use client';
import { useState, useEffect, ChangeEvent } from 'react';
import AlertasDashboard from './AlertasDashboard';
import AlertCard from './AlertCard';
import styles from './Alertas.module.css';
import { FiBell } from 'react-icons/fi';

export default function AlertasPage() {
  const API = process.env.NEXT_PUBLIC_API_URL!.replace(/\/$/, '');
  const [pendientes, setPendientes] = useState<any[]>([]);
  const [historial,  setHistorial]  = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);

  // Filtro y paginado para el historial
  const [filter, setFilter] = useState('');
  const [page,   setPage]   = useState(1);
  const perPage = 4;

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

  const markAsRead = async (id: string) => {
    await fetch(`${API}/alertas/${id}/leida`, { method: 'PUT' });
    setPendientes(p => p.filter(a => a.id !== id));
    const h = await fetch(`${API}/alertas?leida=true`).then(r => r.json());
    if (h.success) setHistorial(h.data);
  };

  if (loading) return <p>Cargando alertas…</p>;

  // sección de pendientes (sin tocar el filtro)
  const pendientesSection = pendientes.length === 0
    ? <p>No tienes alertas pendientes.</p>
    : (
      <ul className={styles.list}>
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
    );

  // filtrado del historial
  const historialFiltrado = historial.filter(a =>
    a.producto_maestro_id.toLowerCase().includes(filter.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(historialFiltrado.length / perPage));
  const paginatedHistorial = historialFiltrado.slice(
    (page - 1) * perPage,
    page * perPage
  );

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>
        <FiBell className={styles.icon} />
        Notificaciones de Precios
      </h1>

      {/* — Pendientes de leer — */}
      <section className={styles.section}>
        <h2>Alertas por Leer ({pendientes.length})</h2>
        {pendientesSection}
      </section>

      {/* — Dashboard gráfico — */}
      <AlertasDashboard />

      {/* — Historial con buscador + paginado — */}
      <section className={styles.section}>
        <h2>Historial de Alertas ({historialFiltrado.length})</h2>

        <input
          type="text"
          placeholder="🔍 Buscar producto..."
          value={filter}
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            setFilter(e.target.value);
            setPage(1); // resetear a página 1 al cambiar búsqueda
          }}
          className={styles.searchInput}
        />

        {historialFiltrado.length === 0 ? (
          <p>No se encontraron alertas.</p>
        ) : (
          <>
            <ul className={styles.list}>
              {paginatedHistorial.map(a => (
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

            <div className={styles.pagination}>
              <button
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                disabled={page === 1}
              >
                ← Anterior
              </button>
              <span>Página {page} de {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
              >
                Siguiente →
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
