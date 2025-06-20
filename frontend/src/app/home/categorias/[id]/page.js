"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import apiClient from '../../../../../lib/api';
import styles from '../Categoria.module.css';

export default function EditarCategoriaPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;

  const [nombre, setNombre] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (id) {
      const fetchCategoria = async () => {
        try {
          setLoading(true);
          const response = await apiClient.get(`/api/categoria/${id}`);
          setNombre(response.data.nombre); // Cargamos el nombre en el estado
        } catch (err) {
          console.error("Error al cargar la categoría:", err);
          setError("No se pudo cargar la categoría para editar.");
        } finally {
          setLoading(false);
        }
      };
      fetchCategoria();
    }
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
        setError('El nombre no puede estar vacío.');
        return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiClient.put(`/api/categoria/${id}`, { nombre });
      alert('Categoría actualizada con éxito');
      router.push('/home/categorias');
    } catch (err) {
      console.error('Error al actualizar la categoría:', err);
      setError('Hubo un error al guardar los cambios.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !nombre) return <div className={styles.loader}>Cargando...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Editar Categoría</h1>
      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label htmlFor="nombre" className={styles.label}>Nombre de la Categoría</label>
          <input 
            type="text" 
            name="nombre" 
            id="nombre" 
            value={nombre} 
            onChange={(e) => setNombre(e.target.value)} 
            className={styles.input}
            required
          />
        </div>
        {error && <p style={{color: 'red', marginTop: '1rem'}}>{error}</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', gap: '1rem' }}>
            <button type="button" onClick={() => router.push('/home/categorias')} className={styles.cancelButton}>
                Cancelar
            </button>
            <button type="submit" className={styles.submitButton} disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
        </div>
      </form>
    </div>
  );
}