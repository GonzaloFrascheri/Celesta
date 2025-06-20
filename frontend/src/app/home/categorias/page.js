"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import apiClient from "../../../../lib/api"; // Asegúrate que esta ruta es correcta
import styles from './Categoria.module.css'; // Usaremos un nuevo CSS para categorías
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  const fetchCategorias = async () => {
    try {
      setLoading(true);
      // CORRECCIÓN: Apuntamos a la ruta de la API de categorías
      const response = await apiClient.get('/categoria');
      // Tu API GET devuelve un array directamente, lo cual está perfecto.
      setCategorias(response.data); 
      setError(null);
    } catch (error) {
      console.error("Error al cargar las categorías:", error);
      setError("No se pudieron cargar las categorías.");
    } finally {
      setLoading(false);
    } 
  };

  useEffect(() => {
    fetchCategorias();
  }, []);

  const handleDelete = async (categoriaId, categoriaNombre) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar la categoría "${categoriaNombre}"?`)) {
      try {
        await apiClient.delete(`/categoria/${categoriaId}`);
        alert('Categoría eliminada con éxito.');
        // Refrescamos la lista para que desaparezca la categoría eliminada
        fetchCategorias(); 
      } catch (err) {
        console.error("Error al eliminar la categoría:", err);
        alert('Hubo un error al eliminar la categoría.');
      }
    }
  };

  if (loading) return <div className={styles.loader}>Cargando categorías...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Gestión de Categorías</h1>
        <Link href="/home/categorias/nuevo" className={styles.newButton}>
          <FaPlus style={{ marginRight: '8px' }} />
          Nueva Categoría
        </Link>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Fecha de Creación</th>
            <th style={{ textAlign: 'center' }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {categorias.map((categoria) => (
            <tr key={categoria.id}>
              {/* Mostramos el ID de forma corta para que no ocupe mucho espacio */}
              <td title={categoria.id}>{categoria.id.substring(0, 8)}...</td>
              <td>{categoria.nombre}</td>
              <td>
                {categoria.create_at && categoria.create_at.value 
                  ? new Date(categoria.create_at.value).toLocaleDateString() 
                  : 'N/A'}
              </td>
              <td>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                  <button 
                    onClick={() => router.push(`/home/categorias/${categoria.id}`)}
                    className={styles.actionButton} 
                    title="Editar"
                  >
                    <FaEdit />
                  </button>
                  <button 
                    onClick={() => handleDelete(categoria.id, categoria.nombre)} 
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