"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import apiClient from '../../../../lib/api'; 
import styles from './Clientes.module.css';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';

export default function ClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  const [filter, setFilter] = useState('');

  // Función para cargar los clientes
  const fetchClientes = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/clientes');
      // La API devuelve el array en la propiedad 'data' de la respuesta
      setClientes(response.data.data || []); 
      setError(null);
    } catch (error) {
      console.error("Error al cargar los clientes:", error);
      setError("No se pudieron cargar los clientes.");
    } finally {
      setLoading(false);
    } 
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    fetchClientes();
  }, []);

  // Función para manejar la eliminación de un cliente
  const handleDelete = async (clienteId, clienteNombre) => {
    // Usamos una confirmación nativa del navegador
    if (window.confirm(`¿Estás seguro de que deseas eliminar al cliente "${clienteNombre}"?`)) {
      try {
        await apiClient.delete(`/clientes/${clienteId}`);
        alert('Cliente eliminado con éxito.');
        // Volvemos a cargar la lista para que el cliente eliminado desaparezca
        fetchClientes(); 
      } catch (err) {
        console.error("Error al eliminar el cliente:", err);
        alert('Hubo un error al intentar eliminar el cliente.');
      }
    }
  };

  if (loading) return <div className={styles.loader}>Cargando clientes…</div>;
  if (error) return <div className={styles.error}>{error}</div>;

const search = filter.toLowerCase();
const filtered = clientes.filter(c => {
  const nombre = String(c.nombre || '').toLowerCase();
  const rut    = String(c.rut    || '').toLowerCase();
  const email  = String(c.email  || '').toLowerCase();
  const telefono  = String(c.telefono  || '').toLowerCase();
  

  return (
    nombre.includes(search) ||
    rut.includes(search)    ||
    email.includes(search)  ||
    telefono.includes(search)
  );
});

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Listado de Clientes</h1>
        <div className={styles.controls}>
         <input
            type="text"
            placeholder="🔍 Buscar cliente..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className={styles.searchInput}
          />
          <Link href="/home/clientes/nuevo" className={styles.newButton}>
            <FaPlus /> Nuevo Cliente
          </Link>
        </div>
      </div>

      {/* CONTADOR */}
     <p className={styles.count}>{filtered.length} cliente{filtered.length !== 1 ? 's' : ''}</p>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>RUT</th>
            <th>Email</th>
            <th>Teléfono</th>
            <th style={{ textAlign: 'center' }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((cliente) => (
            <tr key={cliente.id}>
              <td>{cliente.nombre}</td>
              <td>{cliente.rut}</td>
              <td>{cliente.email || 'N/A'}</td>
              <td>{cliente.telefono || 'N/A'}</td>
              <td>
                <div className={styles.tableActions}>
                  <button 
                    onClick={() => router.push(`/home/clientes/editar/${cliente.id}`)} 
                    className={styles.actionButton}
                    title="Editar"
                  >
                    <FaEdit />
                  </button>
                  <button 
                    onClick={() => handleDelete(cliente.id, cliente.nombre)} 
                    className={`${styles.actionButton} ${styles.deleteButton}`}
                    title="Eliminar"
                  >
                    <FaTrash />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}