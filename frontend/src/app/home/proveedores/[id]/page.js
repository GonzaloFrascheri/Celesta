"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import apiClient from '../../../../../lib/api'; // Asegúrate que esta ruta es correcta
import styles from '../Proveedor.module.css';

export default function EditarProveedorPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params; // Obtenemos el ID del proveedor desde la URL

  // Estado para los datos del formulario, inicializado como null
  const [proveedor, setProveedor] = useState(null);
  
  // Estados de carga y error
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Cargar los datos del proveedor cuando la página se monta
  useEffect(() => {
    // Solo ejecutamos esto si tenemos un ID en la URL
    if (id) {
      const fetchProveedor = async () => {
        try {
          setLoading(true);
          const response = await apiClient.get(`/proveedor/${id}`);
          setProveedor(response.data.data || []);
        } catch (err) {
          console.error("Error al cargar el proveedor:", err);
          setError("No se pudo cargar la información del proveedor.");
        } finally {
          setLoading(false);
        }
      };
      fetchProveedor();
    }
  }, [id]); // Este efecto se re-ejecuta si el 'id' cambia

  const handleChange = (e) => {
    // Actualizamos el estado del proveedor mientras el usuario escribe
    setProveedor({
      ...proveedor,
      [e.target.name]: e.target.value
    });
  };

  // 2. Enviar los datos actualizados a la API al guardar
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!proveedor) return; // No hacemos nada si no hay datos de proveedor

    setLoading(true);
    setError(null);

    try {
      await apiClient.put(`/proveedor/${id}`, {
        rut: proveedor.rut,
        razon_social: proveedor.razon_social,
        giro: proveedor.giro,
      });
      alert('¡Proveedor actualizado con éxito!');
      router.push('/home/proveedores'); // Volvemos a la lista
    } catch (err) {
      console.error("Error al actualizar el proveedor:", err);
      const errorMessage = err.response?.data?.error || "Hubo un error al actualizar.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Vistas de carga y error para una mejor experiencia de usuario
  if (loading) return <div className={styles.loader}>Cargando datos del proveedor...</div>;
  if (error) return <div className={styles.error}>{error}</div>;
  if (!proveedor) return <div className={styles.error}>Proveedor no encontrado.</div>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Editar Proveedor</h1>
      
      <form onSubmit={handleSubmit}>
        <div className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="rut" className={styles.label}>RUT</label>
            <input 
              type="text" 
              name="rut" 
              id="rut" 
              value={proveedor.rut} 
              onChange={handleChange} 
              className={styles.input} 
              required 
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="razon_social" className={styles.label}>Razón Social</label>
            <input 
              type="text" 
              name="razon_social" 
              id="razon_social" 
              value={proveedor.razon_social} 
              onChange={handleChange} 
              className={styles.input} 
              required 
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="giro" className={styles.label}>Giro</label>
            <input 
              type="text" 
              name="giro" 
              id="giro" 
              value={proveedor.giro || ''} // Usamos '' si el valor es null
              onChange={handleChange} 
              className={styles.input} 
            />
          </div>
        </div>

        <hr style={{margin: '2rem 0'}}/>
        
        {error && <p style={{color: 'red', marginTop: '1rem'}}>{error}</p>}
        
        <div style={{display: 'flex', justifyContent: 'flex-end', gap: '1rem'}}>
           {/* Botón para volver atrás sin guardar */}
           <button type="button" onClick={() => router.push('/home/proveedores')} className={styles.cancelButton}>
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
