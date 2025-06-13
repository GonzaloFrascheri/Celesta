require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const { BigQuery } = require('@google-cloud/bigquery');

const app = express();
app.use(express.json()); // Middleware para poder leer JSON en el body

const PORT = process.env.PORT || 3001;

// Configuración de BigQuery 
const bigquery = new BigQuery();

// Configuración de la conexión a la base de datos
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

pool.on('error', (err, client) => {
  console.error('Error inesperado en el cliente de la base de datos:', err);
  process.exit(-1);
});

// --- INICIO DE RUTAS DE LA API ---
/** CloudSQL */
/** PROVEEDORES */

// CREATE - Crear un nuevo Proveedor
app.post('/api/proveedores', async (req, res) => {
  const { id, rut, razon_social, giro } = req.body;
  if (!id || !rut || !razon_social) {
    return res.status(400).json({ error: 'id, rut y razon_social son requeridos' });
  }
  try {
    const query = 'INSERT INTO Proveedor(id, rut, razon_social, giro, created_at) VALUES($1, $2, $3, $4, NOW()) RETURNING *';
    const values = [id, rut, razon_social, giro];
    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al insertar proveedor:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// READ - Obtener todos los Proveedores
app.get('/api/proveedores', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Proveedor ORDER BY created_at DESC');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error al obtener proveedores:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// READ - Obtener un Proveedor por su ID
app.get('/api/proveedores/:id', async (req, res) => {
  const { id } = req.params; // Obtenemos el ID de los parámetros de la URL
  try {
    const result = await pool.query('SELECT * FROM Proveedor WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error)
 {
    console.error(`Error al obtener proveedor ${id}:`, error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// UPDATE - Actualizar un Proveedor por su ID
app.put('/api/proveedores/:id', async (req, res) => {
  const { id } = req.params;
  const { razon_social, giro } = req.body; // Solo permitimos actualizar estos campos
  if (!razon_social && !giro) {
    return res.status(400).json({ error: 'Se requiere al menos un campo para actualizar (razon_social, giro)' });
  }
  try {
    const query = 'UPDATE Proveedor SET razon_social = COALESCE($1, razon_social), giro = COALESCE($2, giro) WHERE id = $3 RETURNING *';
    const values = [razon_social, giro, id];
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Proveedor no encontrado para actualizar' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(`Error al actualizar proveedor ${id}:`, error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE - Eliminar un Proveedor por su ID
app.delete('/api/proveedores/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM Proveedor WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Proveedor no encontrado para eliminar' });
    }
    res.status(200).json({ message: 'Proveedor eliminado con éxito', proveedor: result.rows[0] });
  } catch (error) {
    console.error(`Error al eliminar proveedor ${id}:`, error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/** CLIENTES */

// CREATE - Crear un nuevo Cliente
app.post('/api/clientes', async (req, res) => {
  const { id, email, nombre, rol } = req.body;
  if (!id || !email || !nombre) {
    return res.status(400).json({ error: 'id, email y nombre son requeridos' });
  }
  try {
    const query = 'INSERT INTO Cliente(id, email, nombre, rol, created_at) VALUES($1, $2, $3, $4, NOW()) RETURNING *';
    const values = [id, email, nombre, rol];
    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al insertar cliente:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// READ - Obtener todos los Clientes
app.get('/api/clientes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Cliente ORDER BY created_at DESC');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error al obtener clientes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// READ - Obtener un Cliente por su ID
app.get('/api/clientes/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM Cliente WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(`Error al obtener cliente ${id}:`, error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// UPDATE - Actualizar un Cliente por su ID
app.put('/api/clientes/:id', async (req, res) => {
  const { id } = req.params;
  const { email, nombre, rol } = req.body; // Solo permitimos actualizar estos campos
  if (!email && !nombre && !rol) {
    return res.status(400).json({ error: 'Se requiere al menos un campo para actualizar (email, nombre, rol)' });
  }
  try {
    const query = 'UPDATE Cliente SET email = COALESCE($1, email), nombre = COALESCE($2, nombre), rol = COALESCE($3, rol) WHERE id = $4 RETURNING *';
    const values = [email, nombre, rol, id];
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado para actualizar' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(`Error al actualizar cliente ${id}:`, error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE - Eliminar un Cliente por su ID
app.delete('/api/clientes/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM Cliente WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado para eliminar' });
    }
    res.status(200).json({ message: 'Cliente eliminado con éxito', cliente: result.rows[0] });
  } catch (error) {
    console.error(`Error al eliminar cliente ${id}:`, error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});


/** BigQuery */
/** COMPRAS */

// CREATE - Crear una nueva Compra
app.post('/api/compras', async (req, res) => {
  const compra = req.body; // El objeto JSON que envías desde Postman

  // Validación actualizada con los campos correctos de tu esquema
  if (!compra.id || !compra.proveedor_id || !compra.monto_total) {
    return res.status(400).json({ error: 'Los campos id, proveedor_id y monto_total son requeridos' });
  }

  try {
    const datasetId = 'celesta_data';
    const tableId = 'Compras';

    // Inserta la fila en BigQuery. BigQuery mapeará los campos del JSON a las columnas de la tabla.
    await bigquery.dataset(datasetId).table(tableId).insert(compra);
    
    console.log(`Se insertó la compra ${compra.id} en BigQuery.`);
    res.status(201).json({ message: 'Compra registrada con éxito en BigQuery', data: compra });
  } catch (error) {
    console.error('Error al insertar en BigQuery:', error);
    // BigQuery a veces devuelve errores más detallados que podemos pasar al cliente
    const errorMessage = error.errors ? error.errors.map(e => e.message).join(', ') : 'Error interno del servidor';
    res.status(500).json({ error: errorMessage });
  }
});

// --- FIN DE RUTAS DE LA API ---

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});