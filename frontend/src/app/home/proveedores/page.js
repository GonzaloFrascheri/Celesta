"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import apiClient from "../../../../lib/api"; // Asegúrate que esta ruta es correcta
import styles from './Proveedor.module.css';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';

export default function ProveedorPage() {
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  // Función para cargar los proveedores, la reusaremos para refrescar la lista
  const fetchProveedores = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/proveedor');
      setProveedores(response.data.data || []);
      setError(null);
    } catch (error) {
      console.error("Error al cargar los proveedores:", error);
      setError("No se pudieron cargar los proveedores.");
    } finally {
      setLoading(false);
    } 
  };

  // Cargamos los datos cuando el componente se monta por primera vez
  useEffect(() => {
    fetchProveedores();
  }, []);

  const handleDelete = async (proveedorId, proveedorNombre) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar al proveedor "${proveedorNombre}"? Esta acción no se puede deshacer.`)) {
      try {
        await apiClient.delete(`/proveedor/${proveedorId}`);
        toast.success('Proveedor eliminado con éxito.');
        fetchProveedores(); 
      } catch (err) {
        console.error("Error al eliminar el proveedor:", err);
        toast.success('Hubo un error al intentar eliminar el proveedor');
      }
    }
  };

  if (loading) return <div className={styles.loader}>Cargando proveedores...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Listado de Proveedores</h1>
        <Link href="/home/proveedores/nuevo" className={styles.newButton}>
          <FaPlus style={{ marginRight: '8px' }} />
          Nuevo Proveedor
        </Link>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>RUT</th>
            <th>Razón Social</th>
            <th>Giro</th>
            <th>Fecha de Creación</th>
            <th style={{ textAlign: 'center' }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {proveedores.map((proveedor) => (
            <tr key={proveedor.id}>
              {/* AÑADIMOS data-label A CADA CELDA */}
              <td data-label="RUT">{proveedor.rut}</td>
              <td data-label="Razón Social">{proveedor.razon_social}</td>
              <td data-label="Giro">{proveedor.giro || 'N/A'}</td>
              <td data-label="Fecha de Creación">
                {proveedor.create_at && proveedor.create_at.value 
                  ? new Date(proveedor.create_at.value).toLocaleDateString() 
                  : 'N/A'}
              </td>
              <td data-label="Acciones">
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  {/* Los botones van aquí dentro como ya los tienes */}
                  <button
                    onClick={() => router.push(`/home/proveedores/editar/${proveedor.id}`)}
                    className={styles.actionButton}
                  >
                    <FaEdit />
                  </button>
                  <button onClick={() => handleDelete(proveedor.id, proveedor.razon_social)} /* ... */><FaTrash /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}