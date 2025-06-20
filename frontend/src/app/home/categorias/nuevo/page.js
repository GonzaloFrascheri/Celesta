"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '../../../../../lib/api';
import styles from '../Categoria.module.css';

export default function NuevaCategoriaPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError('El nombre de la categoría no puede estar vacío.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // El payload solo necesita el nombre, como en tu API
      const payload = { nombre };
      await apiClient.post('/categoria', payload);
      alert('¡Categoría creada con éxito!');
      router.push('/home/categorias');
    } catch (err) {
      console.error("Error al crear la categoría:", err);
      setError("Hubo un error al crear la categoría.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Registrar Nueva Categoría</h1>
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
            placeholder="Ej: Insumos de Oficina"
          />
        </div>
        {error && <p style={{color: 'red', marginTop: '1rem'}}>{error}</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', gap: '1rem' }}>
          <button type="button" onClick={() => router.push('/home/categorias')} className={styles.cancelButton}>
            Cancelar
          </button>
          <button type="submit" className={styles.submitButton} disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar Categoría'}
          </button>
        </div>
      </form>
    </div>
  );
}