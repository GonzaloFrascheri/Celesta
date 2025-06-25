// frontend/app/home/compras/page.js
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import apiClient from '../../../../lib/api';
import styles from './Compras.module.css';
import { FaPlus, FaCog } from 'react-icons/fa';

export default function ComprasPage() {
  const [compras, setCompras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const router = useRouter();

  const fetchCompras = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/compras');
      setCompras(response.data.data || []);
      setError(null);
    } catch (err) {
      console.error("Error al obtener las compras:", err);
      setError("No se pudieron cargar las compras. Inténtalo de nuevo más tarde.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompras();
  }, []);

  // --- FUNCIÓN DE PROCESAMIENTO CORREGIDA ---
  const handleProcesarLote = async () => {
    if (!window.confirm('¿Deseas procesar las sugerencias para todas las compras pendientes? Este proceso puede tardar unos minutos.')) return;

    setProcessing(true);
    try {
      const response = await apiClient.post('/procesar-compras-pendientes');
      
      // --- INICIO DE LA CORRECCIÓN ---
      // Verificamos qué tipo de respuesta nos dio el backend
      const responseData = response.data.data;

      // Si la respuesta incluye la propiedad 'total_procesadas', mostramos el detalle
      if (typeof responseData.total_procesadas !== 'undefined') {
        alert(`Proceso completado: ${responseData.total_procesadas} compras procesadas con éxito y ${responseData.total_con_error} con error.`);
      } else {
        // Si no, mostramos el mensaje general (ej: "No hay nada que procesar")
        alert(responseData.message);
      }
      // --- FIN DE LA CORRECCIÓN ---

      fetchCompras(); // Volvemos a cargar las compras para ver el estado actualizado
    } catch (error) {
      console.error("Error al iniciar el procesamiento por lotes:", error);
      alert('Hubo un error al iniciar el procesamiento por lotes.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className={styles.loader}>Cargando compras...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Listado de Compras</h1>
        <div className={styles.actions}>
          <button onClick={handleProcesarLote} className={`${styles.processButton} ${processing ? styles.disabled : ''}`} disabled={processing}>
            <FaCog style={{ marginRight: '8px' }} />
            {processing ? 'Procesando...' : 'Procesar Pendientes'}
          </button>
          <Link href="/home/compras/nueva" className={styles.newButton}>
            <FaPlus style={{ marginRight: '8px' }} />
            Nueva Compra
          </Link>
        </div>
      </div>
      
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Folio</th>
            {/* MODIFICACIÓN: Cambiamos el encabezado de la columna */}
            <th>Proveedor</th>
            <th>Monto Total</th>
            <th>Fecha de Creación</th>
            <th>Estado ML</th>
          </tr>
        </thead>
        <tbody>
          {compras.length > 0 ? (
            compras.map(compra => (
              <tr key={compra.id}>
                <td>{compra.folio || 'N/A'}</td>
                {/* MODIFICACIÓN: Mostramos el nombre del proveedor en lugar del ID */}
                <td>{compra.proveedor_nombre || 'No Asignado'}</td>
                <td>${compra.monto_total.toLocaleString('es-CL')}</td>
                <td>{compra.created_at && compra.created_at.value ? new Date(compra.created_at.value).toLocaleDateString() : 'N/A'}</td>
                <td>
                  <span className={`${styles.status} ${styles[compra.estado_ml?.toLowerCase() || 'pendiente']}`}>
                    {compra.estado_ml || 'PENDIENTE'}
                  </span>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              {/* Cambiamos el colSpan a 6 por la nueva columna */}
              <td colSpan="6" style={{ textAlign: 'center' }}>No hay compras para mostrar.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}