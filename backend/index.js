require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;

console.log('--- Cargando Variables de Entorno para la BD ---');
console.log('Usuario (DB_USER):', process.env.DB_USER);
console.log('Host (DB_HOST):', process.env.DB_HOST);
console.log('Puerto (DB_PORT):', process.env.DB_PORT);
console.log('Base de Datos (DB_DATABASE):', process.env.DB_DATABASE);
console.log('Contraseña (DB_PASSWORD):', process.env.DB_PASSWORD ? 'Cargada' : 'NO CARGADA o vacía');
console.log('----------------------------------------------');

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

app.get('/', (req, res) => { res.json({ message: 'Backend Conectado' }); });

app.post('/api/proveedores', async (req, res) => {
  const { id, rut, razon_social, giro } = req.body;
  if (!id || !rut || !razon_social) {
    return res.status(400).json({ error: 'id, rut y razon_social son requeridos' });
  }
  try {
    const query = 'INSERT INTO Proveedor(id, rut, razon_social, giro) VALUES($1, $2, $3, $4) RETURNING *';
    const values = [id, rut, razon_social, giro];
    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al insertar proveedor:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});