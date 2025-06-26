"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '../../../../../lib/api';
import styles from '../Clientes.module.css'; // Reutilizaremos los estilos
import { FaSave, FaTimes } from 'react-icons/fa';

export default function NuevoClientePage() {
  const router = useRouter();
  
  // Estado para manejar los datos del formulario
  const [cliente, setCliente] = useState({
    nombre: '',
    rut: '',
    email: '',
    telefono: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Manejador para actualizar el estado cuando el usuario escribe en los campos
  const handleChange = (e) => {
    const { name, value } = e.target;
    setCliente(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  // Manejador para enviar el formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!cliente.nombre || !cliente.rut) {
      setError('El nombre y el RUT son campos obligatorios.');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      // Usamos el endpoint que ya probamos con Postman
      await apiClient.post('/clientes', cliente);
      alert('¡Cliente creado con éxito!');
      router.push('/home/clientes'); // Redirige a la lista de clientes
    } catch (err) {
      console.error("Error al crear el cliente:", err);
      setError("Hubo un error al guardar el cliente. Por favor, revisa los datos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Registrar Nuevo Cliente</h1>
      
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="nombre" className={styles.label}>Nombre Completo / Razón Social</label>
          <input 
            type="text" 
            name="nombre" 
            id="nombre" 
            value={cliente.nombre} 
            onChange={handleChange} 
            className={styles.input}
            required 
            placeholder="Ej: Juan Pérez"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="rut" className={styles.label}>RUT</label>
          <input 
            type="text" 
            name="rut" 
            id="rut" 
            value={cliente.rut} 
            onChange={handleChange} 
            className={styles.input}
            required 
            placeholder="Ej: 12345678-9"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="email" className={styles.label}>Correo Electrónico</label>
          <input 
            type="email" 
            name="email" 
            id="email" 
            value={cliente.email} 
            onChange={handleChange} 
            className={styles.input}
            placeholder="Ej: juan.perez@email.com"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="telefono" className={styles.label}>Teléfono</label>
          <input 
            type="tel" 
            name="telefono" 
            id="telefono" 
            value={cliente.telefono} 
            onChange={handleChange} 
            className={styles.input}
            placeholder="Ej: 987654321"
          />
        </div>
        
        {error && <p className={styles.errorText}>{error}</p>}
        
        <div className={styles.formActions}>
          <button type="button" onClick={() => router.push('/home/clientes')} className={styles.cancelButton}>
            <FaTimes style={{ marginRight: '8px' }} />
            Cancelar
          </button>
          <button type="submit" className={styles.submitButton} disabled={loading}>
            <FaSave style={{ marginRight: '8px' }} />
            {loading ? 'Guardando...' : 'Guardar Cliente'}
          </button>
        </div>
      </form>
    </div>
  );
}
