"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '../../../../../lib/api';
import styles from '../Proveedor.module.css';

export default function NuevoProveedorPage() {
  const router = useRouter();

  // Estados para los datos del formulario
  const [proveedorHeader, setProveedorHeader] = useState({
    rut: '',
    razon_social: '',
    giro: ''
  });
  
  // Estados de carga y error
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleHeaderChange = (e) => {
    setProveedorHeader({
      ...proveedorHeader,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // ==========================================================
    // ¡CORRECCIÓN CLAVE! Definimos el payload que vamos a enviar.
    const payload = {
      rut: proveedorHeader.rut,
      razon_social: proveedorHeader.razon_social,
      giro: proveedorHeader.giro,
    };
    // ==========================================================

    try {
      // CORRECCIÓN: Apuntamos a la ruta completa de tu API.
      await apiClient.post('/api/proveedor', payload);
      alert('¡Proveedor agregado con éxito!');
      router.push('/home/proveedores');
    } catch (err) {
      console.error("Error al crear el proveedor:", err);
      setError("Hubo un error al crear el proveedor. Por favor, revisa los datos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Registrar Nuevo Proveedor</h1>
      
      <form onSubmit={handleSubmit}>
        <div className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="rut" className={styles.label}>RUT</label>
            <input type="text" name="rut" id="rut" value={proveedorHeader.rut} onChange={handleHeaderChange} className={styles.input} required/>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="razon_social" className={styles.label}>Razon Social</label>
            <input type="text" name="razon_social" id="razon_social" value={proveedorHeader.razon_social} onChange={handleHeaderChange} className={styles.input} required/>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="giro" className={styles.label}>Giro</label>
            <input type="text" name="giro" id="giro" value={proveedorHeader.giro} onChange={handleHeaderChange} className={styles.input} />
          </div>
        </div>

        <hr style={{margin: '2rem 0'}}/>
        
        {error && <p style={{color: 'red'}}>{error}</p>}
        
        <button type="submit" className={styles.submitButton} disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar Proveedor'}
        </button>
      </form>
    </div>
  );
}
