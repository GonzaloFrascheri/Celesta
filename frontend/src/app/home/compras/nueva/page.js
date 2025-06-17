// frontend/app/home/compras/nueva/page.js
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '../../../../../lib/api';
import styles from '../Compras.module.css';

export default function NuevaCompraPage() {
  const router = useRouter();

  // Estados para los datos del formulario
  const [compraHeader, setCompraHeader] = useState({
    proveedor_id: '',
    folio: '',
    fecha_emision: '',
    centro_de_costos: ''
  });
  const [detalles, setDetalles] = useState([
    { descripcion_original: '', cantidad: 1, precio_neto_unitario: 0 }
  ]);
  
  // Estados para los datos de los desplegables
  const [proveedores, setProveedores] = useState([]);
  
  // Estados de carga y error
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // useEffect para cargar los proveedores cuando la página carga
  useEffect(() => {
    const fetchProveedores = async () => {
      try {
        const response = await apiClient.get('/proveedor');
        setProveedores(response.data);
      } catch (err) {
        console.error("Error al cargar proveedores", err);
        setError("No se pudieron cargar los proveedores.");
      }
    };
    fetchProveedores();
  }, []);

  const handleHeaderChange = (e) => {
    setCompraHeader({
      ...compraHeader,
      [e.target.name]: e.target.value
    });
  };

  const handleDetailChange = (index, e) => {
    const newDetalles = [...detalles];
    newDetalles[index][e.target.name] = e.target.value;
    setDetalles(newDetalles);
  };

  const addDetailLine = () => {
    setDetalles([...detalles, { descripcion_original: '', cantidad: 1, precio_neto_unitario: 0 }]);
  };

  const removeDetailLine = (index) => {
    const newDetalles = detalles.filter((_, i) => i !== index);
    setDetalles(newDetalles);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      ...compraHeader,
      detalles: detalles
    };

    try {
      await apiClient.post('/compras', payload);
      alert('¡Compra creada con éxito!');
      router.push('/home/compras'); // Redirige a la lista de compras
    } catch (err) {
      console.error("Error al crear la compra:", err);
      setError("Hubo un error al guardar la compra. Por favor, revisa los datos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Registrar Nueva Compra</h1>
      
      <form onSubmit={handleSubmit}>
        {/* --- SECCIÓN DE CABECERA --- */}
        <div className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="proveedor_id" className={styles.label}>Proveedor</label>
            <select name="proveedor_id" id="proveedor_id" value={compraHeader.proveedor_id} onChange={handleHeaderChange} className={styles.select} required>
              <option value="">Selecciona un proveedor</option>
              {proveedores.map(p => (
                <option key={p.id} value={p.id}>{p.razon_social}</option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="folio" className={styles.label}>Folio / N° de Factura</label>
            <input type="text" name="folio" id="folio" value={compraHeader.folio} onChange={handleHeaderChange} className={styles.input} />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="fecha_emision" className={styles.label}>Fecha de Emisión</label>
            <input type="date" name="fecha_emision" id="fecha_emision" value={compraHeader.fecha_emision} onChange={handleHeaderChange} className={styles.input} />
          </div>

           <div className={styles.formGroup}>
            <label htmlFor="centro_de_costos" className={styles.label}>Centro de Costos</label>
            <input type="text" name="centro_de_costos" id="centro_de_costos" value={compraHeader.centro_de_costos} onChange={handleHeaderChange} className={styles.input} />
          </div>
        </div>

        <hr style={{margin: '2rem 0'}}/>

        {/* --- SECCIÓN DE DETALLES --- */}
        <div className={styles.formGroup + ' ' + styles.fullWidth}>
          <h2 style={{marginTop: 0}}>Líneas de Detalle</h2>
          {detalles.map((detalle, index) => (
            <div key={index} className={styles.detailRow}>
              <input type="text" name="descripcion_original" placeholder="Descripción del producto o servicio" value={detalle.descripcion_original} onChange={(e) => handleDetailChange(index, e)} className={styles.input} required/>
              <input type="number" name="cantidad" placeholder="Cantidad" value={detalle.cantidad} onChange={(e) => handleDetailChange(index, e)} className={styles.input} min="0" step="any" required/>
              <input type="number" name="precio_neto_unitario" placeholder="Precio Unitario" value={detalle.precio_neto_unitario} onChange={(e) => handleDetailChange(index, e)} className={styles.input} min="0" step="any" required/>
              {detalles.length > 1 && (
                 <button type="button" onClick={() => removeDetailLine(index)} className={styles.removeButton}>X</button>
              )}
            </div>
          ))}
          <button type="button" onClick={addDetailLine} className={styles.addButton}>+ Añadir Línea</button>
        </div>
        
        {error && <p style={{color: 'red'}}>{error}</p>}
        
        <button type="submit" className={styles.submitButton} disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar Compra'}
        </button>
      </form>
    </div>
  );
}