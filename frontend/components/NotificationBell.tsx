// components/NotificationBell.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { FiBell } from 'react-icons/fi';
import styles from './NotificationBell.module.css';

interface Alerta { id: string; producto_maestro_id: string; precio_nuevo: number; diferencia: number; created_at: string; }
interface CFE { id: string; numero_cfe: number | null; emisor_rut: string | null; fecha_procesamiento: { value: string }; }

export default function NotificationBell() {
  const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
  const [open, setOpen]        = useState(false);
  const [alertas, setAlertas]  = useState<Alerta[]>([]);
  const [cfes, setCfes]        = useState<CFE[]>([]);
  const refDropdown = useRef<HTMLDivElement>(null);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (refDropdown.current && !refDropdown.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Al abrir, cargo datos
  useEffect(() => {
    if (!open || !API) return;
    // Traer alertas no leídas
    fetch(`${API}/alertas?leida=false`)
      .then(r => r.json())
      .then(j => { if (j.success) setAlertas(j.data); })
      .catch(() => setAlertas([]));
    // Traer últimos CFEs (aquí ajusta el limit, o tu propio endpoint de “nuevos”)
    fetch(`${API}/cfes?limit=5`)
      .then(r => r.json())
      .then(j => { if (j.success) setCfes(j.data.items); })
      .catch(() => setCfes([]));
  }, [open, API]);

  const total = alertas.length + cfes.length;

  return (
    <div className={styles.wrapper} ref={refDropdown}>
      <button
        className={styles.bellButton}
        onClick={() => setOpen(o => !o)}
        aria-label="Notificaciones"
      >
        <FiBell size={20}/>
        {total > 0 && <span className={styles.badge}>{total}</span>}
      </button>

      {open && (
        <div className={styles.dropdown}>
          <div className={styles.section}>
            <h4>Alertas ({alertas.length})</h4>
            {alertas.length > 0 ? alertas.map(a => (
              <div key={a.id} className={styles.item}>
                <strong>Producto:</strong> {a.producto_maestro_id}<br/>
                <small>{a.created_at}</small>
              </div>
            )) : <p className={styles.empty}>No hay alertas</p>}
          </div>

          <div className={styles.section}>
            <h4>CFEs recientes ({cfes.length})</h4>
            {cfes.length > 0 ? cfes.map(c => (
              <div key={c.id} className={styles.item}>
                <strong>CFE #{c.numero_cfe || '–'}</strong><br/>
                <span>{c.emisor_rut || '–'}</span><br/>
                <small>{new Date(c.fecha_procesamiento.value).toLocaleString()}</small>
              </div>
            )) : <p className={styles.empty}>No hay CFEs nuevos</p>}
          </div>
        </div>
      )}
    </div>
  );
}
