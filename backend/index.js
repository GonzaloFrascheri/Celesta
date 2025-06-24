require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const { BigQuery } = require('@google-cloud/bigquery');
const { v4: uuidv4 } = require('uuid');

// --- Inicializa Express ---
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

// --- Inicializa Firebase Admin ---
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_JSON;
if (!serviceAccountJson) {
  console.error('❌ FIREBASE_SERVICE_ACCOUNT_KEY_JSON no definido');
  process.exit(1);
}
const serviceAccount = JSON.parse(serviceAccountJson);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// --- Inicializa BigQuery ---
const DATASET_ID = process.env.BIGQUERY_DATASET_ID;
if (!DATASET_ID) {
  console.error('❌ BIGQUERY_DATASET_ID no definido');
  process.exit(1);
}
const bigquery = new BigQuery();

// --- Helpers ---
const sendSuccess = (res, data, code = 200) => res.status(code).json({ success: true, data });
const sendError   = (res, msg, code = 500) => res.status(code).json({ success: false, error: msg });

// --- RUTAS DE CLIENTES (Firestore) ---
const clientes = db.collection('clientes');

app.post('/api/clientes', async (req, res) => {
  try {
    const { nombre, rut, email, telefono } = req.body;
    if (!nombre || !rut) return sendError(res, 'nombre y rut requeridos', 400);

    const nuevo = {
      id: uuidv4(),
      nombre,
      rut,
      email: email || null,
      telefono: telefono || null,
      created_at: admin.firestore.FieldValue.serverTimestamp()
    };

    await clientes.doc(nuevo.id).set(nuevo);
    sendSuccess(res, nuevo, 201);
  } catch (e) {
    console.error(e);
    sendError(res, 'Error interno creando cliente');
  }
});

app.get('/api/clientes', async (_, res) => {
  try {
    const snap = await clientes.orderBy('nombre').get();
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    sendSuccess(res, list);
  } catch (e) {
    console.error(e);
    sendError(res, 'Error interno leyendo clientes');
  }
});

app.get('/api/clientes/:id', async (req, res) => {
  try {
    const doc = await clientes.doc(req.params.id).get();
    if (!doc.exists) return sendError(res, 'Cliente no encontrado', 404);
    sendSuccess(res, { id: doc.id, ...doc.data() });
  } catch (e) {
    console.error(e);
    sendError(res, 'Error interno leyendo cliente');
  }
});

app.put('/api/clientes/:id', async (req, res) => {
  try {
    const updates = { ...req.body };
    delete updates.id;
    delete updates.created_at;
    if (Object.keys(updates).length === 0) return sendError(res, 'Nada para actualizar', 400);

    await clientes.doc(req.params.id).update(updates);
    const updated = await clientes.doc(req.params.id).get();
    sendSuccess(res, { id: updated.id, ...updated.data() });
  } catch (e) {
    console.error(e);
    sendError(res, 'Error interno actualizando cliente');
  }
});

app.delete('/api/clientes/:id', async (req, res) => {
  try {
    const ref = clientes.doc(req.params.id);
    if (!(await ref.get()).exists) return sendError(res, 'Cliente no existe', 404);
    await ref.delete();
    res.status(204).send();
  } catch (e) {
    console.error(e);
    sendError(res, 'Error interno eliminando cliente');
  }
});

/** BigQuery **/

/** COMPRAS */
// CREATE
app.post('/api/compras', async (req, res) => {
  const { proveedor_id, folio, fecha_emision, centro_de_costos, detalles } = req.body;
  if (!proveedor_id || !detalles || !Array.isArray(detalles) || detalles.length === 0) {
    return sendError(res, 'Se requiere un proveedor_id y un array de detalles', 400);
  }
  try {
    const compraId = uuidv4();
    const monto_total = detalles.reduce((sum, item) => {
      return sum + ((parseFloat(item.cantidad)||0) * (parseFloat(item.precio_neto_unitario)||0));
    }, 0);

    const now = new Date();
    const formattedDateTime = now.toISOString().slice(0,19).replace('T',' ');

    const nuevaCompra = {
      id: compraId,
      proveedor_id,
      folio: folio||null,
      fecha_emision: fecha_emision||null,
      centro_de_costos: centro_de_costos||null,
      monto_total,
      created_at: formattedDateTime
    };

    const detallesParaInsertar = detalles.map(item => ({
      id: uuidv4(),
      compra_id: compraId,
      descripcion_original: item.descripcion_original,
      producto_maestro_id: item.producto_maestro_id||null,
      cantidad: parseFloat(item.cantidad),
      precio_neto_unitario: parseFloat(item.precio_neto_unitario),
      total_neto_linea: (parseFloat(item.cantidad)||0)*(parseFloat(item.precio_neto_unitario)||0)
    }));

    await bigquery.dataset(DATASET_ID).table('Compras').insert([nuevaCompra]);
    await bigquery.dataset(DATASET_ID).table('Detalles_Compras').insert(detallesParaInsertar);

    sendSuccess(res, { ...nuevaCompra, detalles: detallesParaInsertar }, 201);
  } catch (error) {
    console.error(error);
    sendError(res, 'Error interno creando compra');
  }
});

// READ ALL
app.get('/api/compras', async (req, res) => {
  try {
    const query = `SELECT * FROM \`${DATASET_ID}.Compras\``;
    const [rows] = await bigquery.query(query);
    sendSuccess(res, rows);
  } catch (error) {
    console.error(error);
    sendError(res, 'Error interno leyendo compras');
  }
});

// READ ONE
app.get('/api/compras/:id', async (req, res) => {
  try {
    const query = `SELECT * FROM \`${DATASET_ID}.Compras\` WHERE id = @id`;
    const [rows] = await bigquery.query({ query, params: { id: req.params.id } });
    if (rows.length === 0) return sendError(res, 'Compra no encontrada', 404);
    sendSuccess(res, rows[0]);
  } catch (error) {
    console.error(error);
    sendError(res, 'Error interno leyendo compra');
  }
});

// UPDATE
app.put('/api/compras/:id', async (req, res) => {
  try {
    const data = req.body;
    const setClause = Object.keys(data)
      .filter(k => k !== 'id')
      .map(k => `${k}=@${k}`)
      .join(', ');
    if (!setClause) return sendError(res, 'Nada para actualizar', 400);

    const params = { id: req.params.id, ...data };
    const query = `UPDATE \`${DATASET_ID}.Compras\` SET ${setClause} WHERE id=@id`;
    await bigquery.query({ query, params });

    const [updated] = await bigquery.query({
      query: `SELECT * FROM \`${DATASET_ID}.Compras\` WHERE id=@id`,
      params: { id: req.params.id }
    });
    sendSuccess(res, updated);
  } catch (error) {
    console.error(error);
    sendError(res, 'Error interno actualizando compra');
  }
});

// DELETE
app.delete('/api/compras/:id', async (req, res) => {
  try {
    const query = `DELETE FROM \`${DATASET_ID}.Compras\` WHERE id=@id`;
    await bigquery.query({ query, params: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    console.error(error);
    sendError(res, 'Error interno eliminando compra');
  }
});

/** PROVEEDOR */
// CREATE
app.post('/api/proveedor', async (req, res) => {
  const { rut, razon_social, giro } = req.body;
  if (!rut || !razon_social) return sendError(res, 'rut y razon_social requeridos', 400);

  try {
    const nuevoProveedor = { id: uuidv4(), rut, razon_social, giro: giro||null };
    const query = `
      INSERT INTO \`${DATASET_ID}.Proveedor\`
      (id, rut, razon_social, giro, create_at)
      VALUES (@id,@rut,@razon_social,@giro,CURRENT_DATETIME())
    `;
    await bigquery.query({ query, params: nuevoProveedor });
    sendSuccess(res, { ...nuevoProveedor, created_at: new Date() }, 201);
  } catch (error) {
    console.error(error);
    sendError(res, 'Error interno creando proveedor');
  }
});

// READ ALL
app.get('/api/proveedor', async (req, res) => {
  try {
    const query = `SELECT * FROM \`${DATASET_ID}.Proveedor\` ORDER BY razon_social`;
    const [rows] = await bigquery.query(query);
    sendSuccess(res, rows);
  } catch (error) {
    console.error(error);
    sendError(res, 'Error interno leyendo proveedores');
  }
});

// READ ONE
app.get('/api/proveedor/:id', async (req, res) => {
  try {
    const query = `SELECT * FROM \`${DATASET_ID}.Proveedor\` WHERE id=@id`;
    const [rows] = await bigquery.query({ query, params: { id: req.params.id } });
    if (rows.length === 0) return sendError(res, 'Proveedor no encontrado', 404);
    sendSuccess(res, rows[0]);
  } catch (error) {
    console.error(error);
    sendError(res, 'Error interno leyendo proveedor');
  }
});

// UPDATE
app.put('/api/proveedor/:id', async (req, res) => {
  try {
    const data = req.body;
    const setClause = Object.keys(data)
      .filter(k => k !== 'id')
      .map(k => `${k}=@${k}`)
      .join(', ');
    if (!setClause) return sendError(res, 'Nada para actualizar', 400);

    await bigquery.query({
      query: `UPDATE \`${DATASET_ID}.Proveedor\` SET ${setClause} WHERE id=@id`,
      params: { id: req.params.id, ...data }
    });

    const [updated] = await bigquery.query({
      query: `SELECT * FROM \`${DATASET_ID}.Proveedor\` WHERE id=@id`,
      params: { id: req.params.id }
    });
    sendSuccess(res, updated[0]);
  } catch (error) {
    console.error(error);
    sendError(res, 'Error interno actualizando proveedor');
  }
});

// DELETE
app.delete('/api/proveedor/:id', async (req, res) => {
  try {
    await bigquery.query({
      query: `DELETE FROM \`${DATASET_ID}.Proveedor\` WHERE id=@id`,
      params: { id: req.params.id }
    });
    res.status(204).send();
  } catch (error) {
    console.error(error);
    sendError(res, 'Error interno eliminando proveedor');
  }
});

/** CATEGORIAS */
// CREATE
app.post('/api/categoria', async (req, res) => {
  const { nombre } = req.body;
  if (!nombre) return sendError(res, 'nombre requerido', 400);

  try {
    const nuevaCategoria = { id: uuidv4(), nombre };
    const query = `
      INSERT INTO \`${DATASET_ID}.Categoria\`
      (id,nombre,create_at)
      VALUES (@id,@nombre,CURRENT_DATETIME())
    `;
    await bigquery.query({ query, params: nuevaCategoria });
    sendSuccess(res, { ...nuevaCategoria, created_at: new Date() }, 201);
  } catch (error) {
    console.error(error);
    sendError(res, 'Error interno creando categoría');
  }
});

// READ ALL
app.get('/api/categoria', async (req, res) => {
  try {
    const query = `SELECT * FROM \`${DATASET_ID}.Categoria\` ORDER BY nombre`;
    const [rows] = await bigquery.query(query);
    sendSuccess(res, rows);
  } catch (error) {
    console.error(error);
    sendError(res, 'Error interno leyendo categorías');
  }
});

// READ ONE
app.get('/api/categoria/:id', async (req, res) => {
  try {
    const query = `SELECT * FROM \`${DATASET_ID}.Categoria\` WHERE id=@id`;
    const [rows] = await bigquery.query({ query, params: { id: req.params.id } });
    if (rows.length === 0) return sendError(res, 'Categoría no encontrada', 404);
    sendSuccess(res, rows[0]);
  } catch (error) {
    console.error(error);
    sendError(res, 'Error interno leyendo categoría');
  }
});

// UPDATE
app.put('/api/categoria/:id', async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre) return sendError(res, 'nombre requerido', 400);
    await bigquery.query({
      query: `UPDATE \`${DATASET_ID}.Categoria\` SET nombre=@nombre WHERE id=@id`,
      params: { id: req.params.id, nombre }
    });
    const [updated] = await bigquery.query({
      query: `SELECT * FROM \`${DATASET_ID}.Categoria\` WHERE id=@id`,
      params: { id: req.params.id }
    });
    sendSuccess(res, updated[0]);
  } catch (error) {
    console.error(error);
    sendError(res, 'Error interno actualizando categoría');
  }
});

// DELETE
app.delete('/api/categoria/:id', async (req, res) => {
  try {
    await bigquery.query({
      query: `DELETE FROM \`${DATASET_ID}.Categoria\` WHERE id=@id`,
      params: { id: req.params.id }
    });
    res.status(204).send();
  } catch (error) {
    console.error(error);
    sendError(res, 'Error interno eliminando categoría');
  }
});

/** DETALLES_COMPRAS */
// READ ALL
app.get('/api/detalles-compras', async (req, res) => {
  try {
    const query = `SELECT * FROM \`${DATASET_ID}.Detalles_Compras\``;
    const [rows] = await bigquery.query(query);
    sendSuccess(res, rows);
  } catch (error) {
    console.error(error);
    sendError(res, 'Error interno leyendo detalles');
  }
});

// READ ONE
app.get('/api/detalles-compras/:id', async (req, res) => {
  try {
    const query = `SELECT * FROM \`${DATASET_ID}.Detalles_Compras\` WHERE id=@id`;
    const [rows] = await bigquery.query({ query, params: { id: req.params.id } });
    if (rows.length === 0) return sendError(res, 'Detalle no encontrado', 404);
    sendSuccess(res, rows[0]);
  } catch (error) {
    console.error(error);
    sendError(res, 'Error interno leyendo detalle');
  }
});

// UPDATE
app.put('/api/detalles-compras/:id', async (req, res) => {
  try {
    const data = req.body;
    const setClause = Object.keys(data)
      .filter(k => k !== 'id')
      .map(k => `${k}=@${k}`)
      .join(', ');
    if (!setClause) return sendError(res, 'Nada para actualizar', 400);

    await bigquery.query({
      query: `UPDATE \`${DATASET_ID}.Detalles_Compras\` SET ${setClause} WHERE id=@id`,
      params: { id: req.params.id, ...data }
    });

    const [updated] = await bigquery.query({
      query: `SELECT * FROM \`${DATASET_ID}.Detalles_Compras\` WHERE id=@id`,
      params: { id: req.params.id }
    });
    sendSuccess(res, updated[0]);
  } catch (error) {
    console.error(error);
    sendError(res, 'Error interno actualizando detalle');
  }
});

// DELETE
app.delete('/api/detalles-compras/:id', async (req, res) => {
  try {
    await bigquery.query({
      query: `DELETE FROM \`${DATASET_ID}.Detalles_Compras\` WHERE id=@id`,
      params: { id: req.params.id }
    });
    res.status(204).send();
  } catch (error) {
    console.error(error);
    sendError(res, 'Error interno eliminando detalle');
  }
});

/** PRODUCTOS_MAESTROS */
// READ ALL
app.get('/api/productos-maestros', async (req, res) => {
  try {
    const query = `SELECT * FROM \`${DATASET_ID}.Productos_Maestros\` ORDER BY nombre`;
    const [rows] = await bigquery.query(query);
    sendSuccess(res, rows);
  } catch (error) {
    console.error(error);
    sendError(res, 'Error interno leyendo productos maestros');
  }
});

// READ ONE
app.get('/api/productos-maestros/:id', async (req, res) => {
  try {
    const query = `SELECT * FROM \`${DATASET_ID}.Productos_Maestros\` WHERE id=@id`;
    const [rows] = await bigquery.query({ query, params: { id: req.params.id } });
    if (rows.length === 0) return sendError(res, 'Producto no encontrado', 404);
    sendSuccess(res, rows[0]);
  } catch (error) {
    console.error(error);
    sendError(res, 'Error interno leyendo producto maestro');
  }
});

// --- Inicializa servidor ---
app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});
