require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json()); // Middleware para poder leer JSON en el body

const PORT = process.env.PORT || 3001;

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

// CREATE - Crear un nuevo Proveedor (Ya lo teníamos)
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


// --- FIN DE RUTAS DE LA API ---

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});