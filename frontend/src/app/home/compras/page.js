// frontend/app/home/compras/page.js
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import apiClient from '../../../../lib/api';
import styles from './Compras.module.css';

export default function ComprasPage() {
  const [compras, setCompras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // ... (la lógica de fetchCompras no cambia)
    const fetchCompras = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/compras');
        setCompras(response.data);
        setError(null);
      } catch (err) {
        console.error("Error al obtener las compras:", err);
        setError("No se pudieron cargar las compras. Inténtalo de nuevo más tarde.");
      } finally {
        setLoading(false);
      }
    };

    fetchCompras();
  }, []);

  if (loading) {
    return <div className={styles.loader}>Cargando compras...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.container}>
      {/* 2. Añadimos el nuevo encabezado con título y botón */}
      <div className={styles.header}>
        <h1 className={styles.title}>Listado de Compras</h1>
        <Link href="/home/compras/nueva" className={styles.newButton}>
          + Nueva Compra
        </Link>
      </div>
      
      {/* La tabla de compras no cambia */}
      <table className={styles.table}>
        {/* ... (el contenido de la tabla sigue igual) ... */}
        <thead>
          <tr>
            <th>ID</th>
            <th>Folio</th>
            <th>Proveedor ID</th>
            <th>Monto Total</th>
            <th>Fecha de Creación</th>
          </tr>
        </thead>
        <tbody>
          {compras.length > 0 ? (
            compras.map(compra => (
              <tr key={compra.id}>
                <td>{compra.id.substring(0, 8)}...</td>
                <td>{compra.folio}</td>
                <td>{compra.proveedor_id.substring(0, 8)}...</td>
                <td>${compra.monto_total}</td>
                <td>{new Date(compra.created_at.value).toLocaleDateString()}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5" style={{ textAlign: 'center' }}>No hay compras para mostrar.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}