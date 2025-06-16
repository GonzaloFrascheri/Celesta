require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const { BigQuery } = require('@google-cloud/bigquery');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json()); // Middleware para poder leer JSON en el body

const PORT = process.env.PORT || 3001;

// Configuración de BigQuery 
const bigquery = new BigQuery();

// Configuración de la conexión a la base de datos (Cloud SQL)
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
  // MODIFICADO: Ya no pedimos el 'id' al cliente.
  const { rut, razon_social, giro } = req.body;
  if (!rut || !razon_social) {
    return res.status(400).json({ error: 'rut y razon_social son requeridos' });
  }
  try {
    // MODIFICADO: Generamos el ID en el servidor.
    const newId = uuidv4();
    const query = 'INSERT INTO Proveedor(id, rut, razon_social, giro, created_at) VALUES($1, $2, $3, $4, NOW()) RETURNING *';
    // MODIFICADO: Usamos el ID generado.
    const values = [newId, rut, razon_social, giro];
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
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM Proveedor WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(`Error al obtener proveedor ${id}:`, error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// UPDATE - Actualizar un Proveedor por su ID
app.put('/api/proveedores/:id', async (req, res) => {
  const { id } = req.params;
  const { razon_social, giro } = req.body;
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
  // MODIFICADO: Ya no pedimos el 'id' al cliente.
  const { email, nombre, rol } = req.body;
  if (!email || !nombre) {
    return res.status(400).json({ error: 'email y nombre son requeridos' });
  }
  try {
    // MODIFICADO: Generamos el ID en el servidor.
    const newId = uuidv4();
    const query = 'INSERT INTO Cliente(id, email, nombre, rol, created_at) VALUES($1, $2, $3, $4, NOW()) RETURNING *';
    // MODIFICADO: Usamos el ID generado.
    const values = [newId, email, nombre, rol];
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
  const { email, nombre, rol } = req.body;
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
  // MODIFICADO: Ya no esperamos 'id' en el cuerpo de la petición.
  const compraData = req.body;

  // MODIFICADO: Validación sin el campo 'id'.
  if (!compraData.proveedor_id || !compraData.monto_total) {
    return res.status(400).json({ error: 'Los campos proveedor_id y monto_total son requeridos' });
  }

  try {
    const datasetId = 'celesta_data';
    const tableId = 'Compras';

    // MODIFICADO: Creamos un nuevo objeto 'compra' con un ID generado y los datos del body.
    const nuevaCompra = {
      id: uuidv4(),
      ...compraData
    };

    await bigquery.dataset(datasetId).table(tableId).insert([nuevaCompra]); // Usamos el nuevo objeto
    
    console.log(`Se insertó la compra ${nuevaCompra.id} en BigQuery.`);
    res.status(201).json({ message: 'Compra registrada con éxito en BigQuery', data: nuevaCompra });
  } catch (error) {
    console.error('Error al insertar en BigQuery:', error);
    const errorMessage = error.errors ? error.errors.map(e => e.message).join(', ') : 'Error interno del servidor';
    res.status(500).json({ error: errorMessage });
  }
});

// READ - Obtener todas las Compras
app.get('/api/compras', async (req, res) => {
  try {
    const datasetId = 'celesta_data';
    const tableId = 'Compras';
    const query = `SELECT * FROM \`${datasetId}.${tableId}\``;
    const [rows] = await bigquery.query(query);
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error al obtener compras:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// READ - Obtener una Compra por su ID
app.get('/api/compras/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const datasetId = 'celesta_data';
    const tableId = 'Compras';
    const query = `SELECT * FROM \`${datasetId}.${tableId}\` WHERE id = @id`;
    const options = {
      query: query,
      params: { id: id },
    };
    const [rows] = await bigquery.query(options);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Compra no encontrada' });
    }
    res.status(200).json(rows[0]);
  } catch (error) {
    console.error(`Error al obtener compra ${id}:`, error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// UPDATE - Actualizar una Compra por su ID
app.put('/api/compras/:id', async (req, res) => {
  const { id } = req.params;
  const compra = req.body;

  // Creamos un set de campos dinámico para la consulta UPDATE
  let setClauses = [];
  let params = { id: id };

  // Iteramos sobre el cuerpo de la petición para construir la consulta
  for (const key in compra) {
      if (Object.hasOwnProperty.call(compra, key)) {
          // Nos aseguramos de no intentar actualizar el 'id'
          if (key !== 'id') {
              setClauses.push(`${key} = @${key}`);
              params[key] = compra[key];
          }
      }
  }

  if (setClauses.length === 0) {
      return res.status(400).json({ error: 'Se requiere al menos un campo para actualizar.' });
  }

  try {
    const datasetId = 'celesta_data';
    const tableId = 'Compras';
    const query = `UPDATE \`${datasetId}.${tableId}\` SET ${setClauses.join(', ')} WHERE id = @id`;
    
    const options = {
      query: query,
      params: params,
    };
    
    await bigquery.query(options);
    
    console.log(`Compra ${id} actualizada en BigQuery.`);
    // Buscamos la compra actualizada para devolverla completa
    const [updatedRows] = await bigquery.query({
        query: `SELECT * FROM \`${datasetId}.${tableId}\` WHERE id = @id`,
        params: { id: id }
    });

    res.status(200).json({ message: 'Compra actualizada con éxito', data: updatedRows[0] });
  } catch (error) {
    console.error(`Error al actualizar compra ${id}:`, error);
    const errorMessage = error.errors ? error.errors.map(e => e.message).join(', ') : 'Error interno del servidor';
    res.status(500).json({ error: errorMessage });
  }
});


// DELETE - Eliminar una Compra por su ID
app.delete('/api/compras/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const datasetId = 'celesta_data';
    const tableId = 'Compras';
    const query = `DELETE FROM \`${datasetId}.${tableId}\` WHERE id = @id`;
    const options = {
      query: query,
      params: { id: id },
    };
    
    await bigquery.query(options);
    
    console.log(`Compra ${id} eliminada de BigQuery.`);
    res.status(200).json({ message: 'Compra eliminada con éxito' });
  } catch (error) {
    console.error(`Error al eliminar compra ${id}:`, error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});


/** DETALLES_COMPRAS */
// CREATE - Añadir un nuevo Detalle de Compra
app.post('/api/detalles-compras', async (req, res) => {
  try {
    const {
      compra_id,
      descripcion_original,
      producto_maestro_id,
      cantidad,
      precio_neto_unitario
    } = req.body;

    if (!compra_id || !cantidad || !precio_neto_unitario) {
      return res.status(400).json({ error: 'Faltan campos requeridos: compra_id, cantidad y precio_neto_unitario son obligatorios.' });
    }

    const nuevoDetalle = {
      id: uuidv4(),
      compra_id: String(compra_id),
      descripcion_original: descripcion_original ? String(descripcion_original) : null,
      producto_maestro_id: producto_maestro_id ? String(producto_maestro_id) : null,
      cantidad: parseFloat(cantidad),
      precio_neto_unitario: parseFloat(precio_neto_unitario),
      total_neto_linea: parseFloat(cantidad) * parseFloat(precio_neto_unitario)
    };

    const datasetId = 'celesta_data';
    const tableId = 'Detalles_Compras';

    await bigquery
      .dataset(datasetId)
      .table(tableId)
      .insert([nuevoDetalle]);

    console.log(`✅ Detalle de compra insertado para la compra ID: ${compra_id}`);

    res.status(201).json({
      message: 'Detalle de compra creado con éxito',
      data: nuevoDetalle
    });

  } catch (error) {
    console.error('❌ Error al crear detalle de compra:', error);
    res.status(500).json({ error: 'Error interno del servidor al crear el detalle de compra.' });
  }
});

// READ - Obtener todos los Detalles de Compras
app.get('/api/detalles-compras', async (req, res) => {
  try {
    const datasetId = 'celesta_data';
    const tableId = 'Detalles_Compras';
    const query = `SELECT * FROM \`${datasetId}.${tableId}\``;
    const [rows] = await bigquery.query(query);
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error al obtener detalles de compras:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// READ - Obtener un Detalle de Compra por su ID
app.get('/api/detalles-compras/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const datasetId = 'celesta_data';
    const tableId = 'Detalles_Compras';
    const query = `SELECT * FROM \`${datasetId}.${tableId}\` WHERE id = @id`;
    const options = {
      query: query,
      params: { id: id },
    };
    const [rows] = await bigquery.query(options);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Detalle de compra no encontrado' });
    }
    res.status(200).json(rows[0]);
  } catch (error) {
    console.error(`Error al obtener detalle de compra ${id}:`, error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// UPDATE - Actualizar un Detalle de Compra por su ID
app.put('/api/detalles-compras/:id', async (req, res) => {
  const { id } = req.params;
  const detalleCompra = req.body;

  // Creamos un set de campos dinámico para la consulta UPDATE
  let setClauses = [];
  let params = { id: id };

  // Iteramos sobre el cuerpo de la petición para construir la consulta
  for (const key in detalleCompra) {
      if (Object.hasOwnProperty.call(detalleCompra, key)) {
          // Nos aseguramos de no intentar actualizar el 'id'
          if (key !== 'id') {
              setClauses.push(`${key} = @${key}`);
              params[key] = detalleCompra[key];
          }
      }
  }

  if (setClauses.length === 0) {
      return res.status(400).json({ error: 'Se requiere al menos un campo para actualizar.' });
  }

  try {
    const datasetId = 'celesta_data';
    const tableId = 'Detalles_Compras';
    const query = `UPDATE \`${datasetId}.${tableId}\` SET ${setClauses.join(', ')} WHERE id = @id`;
    
    const options = {
      query: query,
      params: params,
    };
    
    await bigquery.query(options);
    
    console.log(`Detalle de compra ${id} actualizado en BigQuery.`);
    // Buscamos el detalle actualizado para devolverlo completo
    const [updatedRows] = await bigquery.query({
        query: `SELECT * FROM \`${datasetId}.${tableId}\` WHERE id = @id`,
        params: { id: id }
    });

    res.status(200).json({ message: 'Detalle de compra actualizado con éxito', data: updatedRows[0] });
  } catch (error) {
    console.error(`Error al actualizar detalle de compra ${id}:`, error);
    const errorMessage = error.errors ? error.errors.map(e => e.message).join(', ') : 'Error interno del servidor';
    res.status(500).json({ error: errorMessage });
  }
});

// DELETE - Eliminar un Detalle de Compra por su ID
app.delete('/api/detalles-compras/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const datasetId = 'celesta_data';
    const tableId = 'Detalles_Compras';
    const query = `DELETE FROM \`${datasetId}.${tableId}\` WHERE id = @id`;
    const options = {
      query: query,
      params: { id: id },
    };
    
    await bigquery.query(options);
    
    console.log(`Detalle de compra ${id} eliminado de BigQuery.`);
    res.status(200).json({ message: 'Detalle de compra eliminado con éxito' });
  } catch (error) {
    console.error(`Error al eliminar detalle de compra ${id}:`, error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});


/** PRODUCTOS MAESTROS (Solo Lectura) */
// READ - Obtener todos los Productos Maestros
app.get('/api/productos-maestros', async (req, res) => {
  try {
    const datasetId = 'celesta_data';
    const tableId = 'Productos_Maestros';

    // Hacemos la consulta ordenando por nombre para una mejor visualización
    const query = `SELECT * FROM \`${datasetId}.${tableId}\` ORDER BY nombre ASC`;
    
    const [rows] = await bigquery.query(query);

    res.status(200).json(rows);
  } catch (error) {
    console.error('❌ Error al obtener productos maestros:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// READ - Obtener un Producto Maestro por su ID
app.get('/api/productos-maestros/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const datasetId = 'celesta_data';
    const tableId = 'Productos_Maestros';

    const query = `SELECT * FROM \`${datasetId}.${tableId}\` WHERE id = @id`;
    const options = {
      query: query,
      params: { id: id },
    };

    const [rows] = await bigquery.query(options);

    // Si no encontramos un producto con ese ID, devolvemos un 404
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Producto Maestro no encontrado' });
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    console.error(`❌ Error al obtener producto maestro ${id}:`, error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});


// --- FIN DE RUTAS DE LA API ---

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});