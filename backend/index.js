require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const { BigQuery } = require('@google-cloud/bigquery');
const { v4: uuidv4 } = require('uuid');

// Inicialización de Firebase Admin con la clave en Base64
const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64;
if (!b64) {
  console.error('❌ Falta FIREBASE_SERVICE_ACCOUNT_KEY_BASE64');
  process.exit(1);
}
const serviceAccount = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();
const bigquery = new BigQuery();

// Dataset de BigQuery via env var
const DATASET_ID = process.env.BIGQUERY_DATASET_ID;
if (!DATASET_ID) {
  console.error('❌ Falta BIGQUERY_DATASET_ID');
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json());

// Helpers
const sendSuccess = (res, data, code = 200) => res.status(code).json({ success: true, data });
const sendError   = (res, msg, code = 500) => res.status(code).json({ success: false, error: msg });

// --- RUTAS DE CLIENTES (ejemplo) ---
const clientesCol = db.collection('clientes');

// CREATE
app.post('/api/clientes', async (req, res) => {
  try {
    const { nombre, rut, email, telefono } = req.body;
    if (!nombre || !rut) return sendError(res, 'nombre y rut son requeridos', 400);

    const nuevo = {
      id: uuidv4(),
      nombre, rut,
      email: email||null,
      telefono: telefono||null,
      created_at: admin.firestore.FieldValue.serverTimestamp()
    };
    await clientesCol.doc(nuevo.id).set(nuevo);
    return sendSuccess(res, nuevo, 201);
  } catch (e) {
    console.error(e);
    return sendError(res, 'Error interno al crear cliente');
  }
});

// READ ALL
app.get('/api/clientes', async (req, res) => {
  try {
    const snap = await clientesCol.orderBy('nombre').get();
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return sendSuccess(res, list);
  } catch (e) {
    console.error(e);
    return sendError(res, 'Error interno al listar clientes');
  }
});

// UPDATE
app.put('/api/clientes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = { ...req.body };
    delete data.id;
    delete data.created_at;
    if (Object.keys(data).length === 0) return sendError(res, 'Nada para actualizar', 400);

    await clientesCol.doc(id).update(data);
    const upd = await clientesCol.doc(id).get();
    return sendSuccess(res, { id: upd.id, ...upd.data() });
  } catch (e) {
    console.error(e);
    return sendError(res, 'Error interno al actualizar cliente');
  }
});

// DELETE
app.delete('/api/clientes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const ref = clientesCol.doc(id);
    if (!(await ref.get()).exists) return sendError(res, 'Cliente no existe', 404);
    await ref.delete();
    return res.status(204).send();
  } catch (e) {
    console.error(e);
    return sendError(res, 'Error interno al eliminar cliente');
  }
});


/** BigQuery */
/** COMPRAS */

// CREATE - Crear una nueva Compra completa (cabecera y detalles)
app.post('/api/compras', async (req, res) => {
  // 1. Desestructuramos el body esperando la cabecera y un array de detalles
  const { proveedor_id, folio, fecha_emision, centro_de_costos, detalles } = req.body;

  // 2. Validación Robusta de la entrada
  if (!proveedor_id || !detalles || !Array.isArray(detalles) || detalles.length === 0) {
    return res.status(400).json({ 
      error: 'Se requiere un proveedor_id y un array de detalles con al menos un ítem.' 
    });
  }

  try {
    const datasetId = 'BIGQUERY_DATASET_ID';
    const compraId = uuidv4();

    const monto_total = detalles.reduce((total, item) => {
      const cantidad = parseFloat(item.cantidad) || 0;
      const precio = parseFloat(item.precio_neto_unitario) || 0;
      return total + (cantidad * precio);
    }, 0);

    // Formateamos la fecha al formato que BigQuery DATETIME espera: 'YYYY-MM-DD HH:MM:SS'
    const now = new Date();
    const formattedDateTime = now.toISOString().slice(0, 19).replace('T', ' ');

    // 4. Preparación de los Datos para BigQuery
    // A. Preparamos el registro para la tabla 'Compras'
    const nuevaCompra = {
      id: compraId,
      proveedor_id: proveedor_id,
      folio: folio || null,
      fecha_emision: fecha_emision || null,
      centro_de_costos: centro_de_costos || null,
      monto_total: monto_total,
      created_at: formattedDateTime // <-- Usar la variable que ya formateamos
    };

    // B. Preparamos los registros para la tabla 'Detalles_Compras'
    const detallesParaInsertar = detalles.map(item => ({
      id: uuidv4(), // ID único para cada línea de detalle
      compra_id: compraId, // El ID de la compra padre que acabamos de generar
      descripcion_original: item.descripcion_original,
      producto_maestro_id: item.producto_maestro_id || null,
      cantidad: parseFloat(item.cantidad),
      precio_neto_unitario: parseFloat(item.precio_neto_unitario),
      total_neto_linea: (parseFloat(item.cantidad) || 0) * (parseFloat(item.precio_neto_unitario) || 0)
    }));

    // 5. Inserción en Dos Tablas
    // Usamos el método .insert() que es eficiente para streaming de datos
    await bigquery.dataset(datasetId).table('Compras').insert([nuevaCompra]);
    await bigquery.dataset(datasetId).table('Detalles_Compras').insert(detallesParaInsertar);

    console.log(`✅ Compra completa insertada en BigQuery con ID: ${compraId}`);

    // Devolvemos una respuesta exitosa con todos los datos procesados
    res.status(201).json({
      message: 'Compra y sus detalles creados con éxito',
      data: {
        ...nuevaCompra,
        detalles: detallesParaInsertar
      }
    });

  } catch (error) {
    console.error('❌ Error al crear la compra completa:', error);

    // --- AÑADIR ESTE BLOQUE PARA OBTENER MÁS DETALLES ---
    // Este error es específico de la API de streaming de BigQuery
    if (error.name === 'PartialFailureError') {
      console.error('--- Detalles de los Errores de Inserción en BigQuery: ---');
      // El error contiene un array con los detalles de cada fila que falló
      error.errors.forEach(err => {
        // Imprimimos la fila que causó el problema
        console.error('Fila con error:', JSON.stringify(err.row, null, 2));
        // Imprimimos los errores específicos para esa fila
        err.errors.forEach(e => {
          console.error(`  - Razón del fallo: ${e.reason}, Mensaje: ${e.message}`);
        });
      });
      console.error('----------------------------------------------------');
    }
    // --- FIN DEL BLOQUE AÑADIDO ---

    res.status(500).json({ error: 'Error interno del servidor al procesar la compra.' });
  }
});

// READ - Obtener todas las Compras
app.get('/api/compras', async (req, res) => {
  try {
    const datasetId = 'BIGQUERY_DATASET_ID';
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
    const datasetId = 'BIGQUERY_DATASET_ID';
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
    const datasetId = 'BIGQUERY_DATASET_ID';
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
    const datasetId = 'BIGQUERY_DATASET_ID';
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

/** PROVEEDOR */
// CREATE - Crear un nuevo Proveedor
app.post('/api/proveedor', async (req, res) => {
  const { rut, razon_social, giro } = req.body;
  if (!rut || !razon_social) {
    return res.status(400).json({ error: 'Los campos rut y razon_social son requeridos' });
  }
  try {
    const datasetId = 'BIGQUERY_DATASET_ID';
    const tableId = 'Proveedor';

    const nuevoProveedor = {
      id: uuidv4(),
      rut: rut,
      razon_social: razon_social,
      giro: giro || null
    };

    // MODIFICADO: Añadimos 'created_at' a la lista de columnas y la función CURRENT_TIMESTAMP() en los valores.
    const query = `INSERT INTO \`${datasetId}.${tableId}\` (id, rut, razon_social, giro, create_at) VALUES (@id, @rut, @razon_social, @giro, CURRENT_DATETIME())`;
    
    // El objeto de opciones no cambia, ya que CURRENT_TIMESTAMP() no es un parámetro que pasamos nosotros.
    const options = {
      query: query,
      params: nuevoProveedor,
    };

    await bigquery.query(options);

    console.log(`✅ Proveedor '${nuevoProveedor.razon_social}' insertado en BigQuery con ID: ${nuevoProveedor.id}`);

    // MODIFICADO: Añadimos la fecha actual al objeto de respuesta para que sea completo.
    const responseData = {
        ...nuevoProveedor,
        created_at: new Date() // Esto es para que la respuesta de la API sea completa e inmediata.
    };

    res.status(201).json({
      message: 'Proveedor creado con éxito en BigQuery',
      data: responseData
    });

  } catch (error) {
    console.error('❌ Error al crear proveedor en BigQuery:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// READ - Obtener todos los Proveedores
app.get('/api/proveedor', async (req, res) => {
  try {
    const datasetId = 'BIGQUERY_DATASET_ID';
    const tableId = 'Proveedor';
    const query = `SELECT * FROM \`${datasetId}.${tableId}\` ORDER BY razon_social ASC`;
    
    const [rows] = await bigquery.query(query);
    res.status(200).json(rows);
  } catch (error) {
    console.error('❌ Error al obtener proveedores de BigQuery:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});


// READ - Obtener un Proveedor por su ID
app.get('/api/proveedor/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const datasetId = 'BIGQUERY_DATASET_ID';
    const tableId = 'Proveedor';
    const query = `SELECT * FROM \`${datasetId}.${tableId}\` WHERE id = @id`;
    const options = {
      query: query,
      params: { id: id },
    };

    const [rows] = await bigquery.query(options);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }
    res.status(200).json(rows[0]);
  } catch (error) {
    console.error(`❌ Error al obtener proveedor ${id}:`, error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// UPDATE - Actualizar un Proveedor por su ID
app.put('/api/proveedor/:id', async (req, res) => {
  const { id } = req.params;
  const { rut, razon_social, giro } = req.body;

  if (!rut && !razon_social && !giro) {
    return res.status(400).json({ error: 'Se requiere al menos un campo para actualizar.' });
  }

  try {
    const datasetId = 'BIGQUERY_DATASET_ID';
    const tableId = 'Proveedor';

    // Construimos la consulta UPDATE dinámicamente
    const fieldsToUpdate = [];
    const params = { id: id };
    if (rut) { fieldsToUpdate.push('rut = @rut'); params.rut = rut; }
    if (razon_social) { fieldsToUpdate.push('razon_social = @razon_social'); params.razon_social = razon_social; }
    if (giro) { fieldsToUpdate.push('giro = @giro'); params.giro = giro; }

    const query = `UPDATE \`${datasetId}.${tableId}\` SET ${fieldsToUpdate.join(', ')} WHERE id = @id`;

    await bigquery.query({ query: query, params: params });

    // Después de actualizar, consultamos el registro para devolverlo completo
    const [updatedRows] = await bigquery.query({
      query: `SELECT * FROM \`${datasetId}.${tableId}\` WHERE id = @id`,
      params: { id: id }
    });
    
    if (updatedRows.length === 0) {
        return res.status(404).json({ error: 'Proveedor no encontrado después de intentar actualizar' });
    }

    console.log(`✅ Proveedor ${id} actualizado en BigQuery.`);
    res.status(200).json({ message: 'Proveedor actualizado con éxito', data: updatedRows[0] });
  } catch (error) {
    console.error(`❌ Error al actualizar proveedor ${id}:`, error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE - Eliminar un Proveedor por su ID
app.delete('/api/proveedor/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const datasetId = 'BIGQUERY_DATASET_ID';
    const tableId = 'Proveedor';
    const query = `DELETE FROM \`${datasetId}.${tableId}\` WHERE id = @id`;
    const options = {
      query: query,
      params: { id: id },
    };

    await bigquery.query(options);
    console.log(`✅ Proveedor ${id} eliminado de BigQuery.`);
    res.status(200).json({ message: 'Proveedor eliminado con éxito' });
  } catch (error) {
    console.error(`❌ Error al eliminar proveedor ${id}:`, error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/** CATEGORIAS */

// CREATE - Crear una nueva Categoría
app.post('/api/categoria', async (req, res) => {
  const { nombre } = req.body;
  if (!nombre) {
    return res.status(400).json({ error: 'El campo nombre es requerido' });
  }
  try {
    const datasetId = 'BIGQUERY_DATASET_ID';
    const tableId = 'Categoria';

    const nuevaCategoria = {
      id: uuidv4(),
      nombre: nombre,
    };

    const query = `INSERT INTO \`${datasetId}.${tableId}\` (id, nombre, create_at) VALUES (@id, @nombre, CURRENT_DATETIME())`;
    
    const options = {
      query: query,
      params: nuevaCategoria,
    };

    await bigquery.query(options);
    console.log(`✅ Categoría '${nuevaCategoria.nombre}' insertada en BigQuery.`);
    const responseData = {
        ...nuevaCategoria,
        created_at: new Date()
    };
    res.status(201).json({
      message: 'Categoría creada con éxito en BigQuery',
      data: responseData
    });
  } catch (error) {
    console.error('❌ Error al crear categoría en BigQuery:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// READ - Obtener todas las Categorías
app.get('/api/categoria', async (req, res) => {
  try {
    const datasetId = 'BIGQUERY_DATASET_ID';
    const tableId = 'Categoria';
    const query = `SELECT * FROM \`${datasetId}.${tableId}\` ORDER BY nombre ASC`;
    
    const [rows] = await bigquery.query(query);
    res.status(200).json(rows);
  } catch (error) {
    console.error('❌ Error al obtener categorías de BigQuery:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// READ - Obtener una Categoría por su ID
app.get('/api/categoria/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const datasetId = 'BIGQUERY_DATASET_ID';
    const tableId = 'Categoria';
    const query = `SELECT * FROM \`${datasetId}.${tableId}\` WHERE id = @id`;
    const options = {
      query: query,
      params: { id: id },
    };

    const [rows] = await bigquery.query(options);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    res.status(200).json(rows[0]);
  } catch (error) {
    console.error(`❌ Error al obtener categoría ${id}:`, error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// UPDATE - Actualizar una Categoría por su ID
app.put('/api/categoria/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre } = req.body;

  if (!nombre) {
    return res.status(400).json({ error: 'Se requiere el campo nombre para actualizar.' });
  }

  try {
    const datasetId = 'BIGQUERY_DATASET_ID';
    const tableId = 'Categoria';
    
    const query = `UPDATE \`${datasetId}.${tableId}\` SET nombre = @nombre WHERE id = @id`;
    const params = { id: id, nombre: nombre };

    await bigquery.query({ query: query, params: params });

    // Después de actualizar, consultamos el registro para devolverlo completo
    const [updatedRows] = await bigquery.query({
      query: `SELECT * FROM \`${datasetId}.${tableId}\` WHERE id = @id`,
      params: { id: id }
    });
    
    if (updatedRows.length === 0) {
        return res.status(404).json({ error: 'Categoría no encontrada después de intentar actualizar' });
    }

    console.log(`✅ Categoría ${id} actualizada en BigQuery.`);
    res.status(200).json({ message: 'Categoría actualizada con éxito', data: updatedRows[0] });
  } catch (error) {
    console.error(`❌ Error al actualizar categoría ${id}:`, error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE - Eliminar una Categoría por su ID
app.delete('/api/categoria/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const datasetId = 'BIGQUERY_DATASET_ID';
    const tableId = 'Categoria';
    const query = `DELETE FROM \`${datasetId}.${tableId}\` WHERE id = @id`;
    const options = {
      query: query,
      params: { id: id },
    };

    await bigquery.query(options);
    console.log(`✅ Categoría ${id} eliminada de BigQuery.`);
    res.status(200).json({ message: 'Categoría eliminada con éxito' });
  } catch (error) {
    console.error(`❌ Error al eliminar categoría ${id}:`, error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// READ - Obtener todos los Detalles de Compras
app.get('/api/detalles-compras', async (req, res) => {
  try {
    const datasetId = 'BIGQUERY_DATASET_ID';
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
    const datasetId = 'BIGQUERY_DATASET_ID';
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
    const datasetId = 'BIGQUERY_DATASET_ID';
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
    const datasetId = 'BIGQUERY_DATASET_ID';
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
    const datasetId = 'BIGQUERY_DATASET_ID';
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
    const datasetId = 'BIGQUERY_DATASET_ID';
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

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🛡️  Server escuchando en puerto ${PORT}`);
});