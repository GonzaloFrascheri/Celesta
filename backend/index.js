require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const { BigQuery } = require('@google-cloud/bigquery');
const { v4: uuidv4 } = require('uuid');

const app = express();

// --- INICIO DE LA MODIFICACIÓN DE CORS ---
// Define la URL exacta de tu frontend desplegado
const allowedOrigins = [
  'https://celesta-frontend-1069223002409.us-central1.run.app',
  'http://localhost:3000'                                     
];
// Aplica la configuración de CORS específica
const corsOptions = {
  origin: function (origin, callback) {
    // Permite peticiones sin 'origin' (como las de Postman o apps móviles)
    if (!origin) return callback(null, true);
    
    // Si el origen de la petición está en nuestra lista blanca, permite el acceso
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'La política de CORS para este sitio no permite acceso desde el origen especificado.';
      return callback(new Error(msg), false);
    }
    
    return callback(null, true);
  }
};
// --- FIN DE LA MODIFICACIÓN DE CORS ---

// Aplica la configuración de CORS inteligente
app.use(cors(corsOptions));
app.use(express.json());

const PORT = process.env.PORT || 8080;

// --- Inicializa Firebase Admin ---
console.log("--- [Punto 8] Intentando inicializar Firebase Admin SDK... ---");

// --- Inicializa Firebase Admin ---
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'celesta-poc-8d755',
});
const db = admin.firestore();
console.log("--- ✅ Firebase Admin SDK inicializado con éxito ---"); // Añadí un log para confirmar

// --- Inicializa BigQuery (Versión CORREGIDA) ---
console.log("--- [Punto 6] Intentando inicializar BigQuery... ---");
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT
                || process.env.GCLOUD_PROJECT
                || process.env.GCP_PROJECT
                || 'celesta-poc';
const DATASET_ID = process.env.BIGQUERY_DATASET_ID || 'celesta_data';
const TABLE_ID   = process.env.BIGQUERY_TABLE_ID   || 'cfes';
if (!DATASET_ID) {
  console.error('❌ BIGQUERY_DATASET_ID no definido');
  process.exit(1);
}

const bigquery = new BigQuery({
  projectId: PROJECT_ID,
  location:  'us-central1'
});

const FULL_TABLE = `\`${PROJECT_ID}.${DATASET_ID}.${TABLE_ID}\``;

console.log("--- [Punto 7] ✅ BigQuery inicializado con éxito ---");

const TABLE   = 'cfes';

// --- Helpers ---
const sendSuccess = (res, data, code = 200) => res.status(code).json({ success: true, data });
const sendError   = (res, msg,  code = 500) => res.status(code).json({ success: false, error: msg });

// --- Health Check para la Ruta Raíz ---
app.get('/', (req, res) => {
  // 1. Log para que lo veas en Cloud Logging
  console.log('✅ Health check en la ruta raíz / fue accedido exitosamente.');

  // 2. Respuesta JSON para mostrar en el navegador
  res.status(200).json({
    status: 'ok',
    message: 'La API de Celesta está en línea y funcionando.',
    timestamp: new Date().toISOString()
  });
});

// ===================================================================
// === NUEVO ENDPOINT DE MACHINE LEARNING ============================
// ===================================================================
app.post('/api/sugerir-producto', async (req, res) => {
  const { descripcion_original } = req.body;
  if (!descripcion_original) {
    return sendError(res, 'La "descripcion_original" es requerida.', 400);
  }
  try {
    const query = `
      SELECT predicted_producto_maestro_id as producto_sugerido
      FROM ML.PREDICT(MODEL \`celesta_data.product_classifier\`, (SELECT @desc as descripcion_original))`;
    const [rows] = await bigquery.query({ query: query, params: { desc: descripcion_original } });
    if (rows.length > 0) {
      sendSuccess(res, { producto_sugerido: rows[0].producto_sugerido });
    } else {
      sendError(res, 'No se pudo obtener una sugerencia.', 404);
    }
  } catch (error) {
    console.error('Error al predecir con el modelo de ML:', error);
    sendError(res, 'Error interno al procesar la sugerencia.');
  }
});

// GET /api/alertas/metrics/diarias
app.get('/api/alertas/metrics/diarias', async (_, res) => {
  try {
    const sql = `
      SELECT dia, total_alertas, promedio_diferencia
      FROM \`celesta-poc.${DATASET_ID}.Alertas_Por_Dia\`
      ORDER BY dia
    `;
    const [rows] = await bigquery.query({ query: sql });
    sendSuccess(res, rows);
  } catch (e) {
    console.error('Error metrics diarias:', e);
    sendError(res, 'Error interno obteniendo métricas diarias');
  }
});

// GET /api/alertas/metrics/productos
app.get('/api/alertas/metrics/productos', async (_, res) => {
  try {
    const sql = `
      SELECT producto_maestro_id, total_alertas
      FROM \`celesta-poc.${DATASET_ID}.Alertas_Por_Producto\`
    `;
    const [rows] = await bigquery.query({ query: sql });
    sendSuccess(res, rows);
  } catch (e) {
    console.error('Error metrics productos:', e);
    sendError(res, 'Error interno obteniendo métricas por producto');
  }
});

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
  console.log('🔴 DELETE recibido en Express para cliente.id =', req.params.id);
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

// ===================================================================
// === ENDPOINT DE PROCESAMIENTO POR LOTES ===========================
// ===================================================================
app.post('/api/procesar-compras-pendientes', async (req, res) => {
    try {
      // Buscamos compras pendientes o aquellas que nunca tuvieron un estado
      const queryPendientes = `SELECT id FROM \`${DATASET_ID}.Compras\` WHERE estado_ml = 'PENDIENTE' OR estado_ml IS NULL`;
      const [comprasPendientes] = await bigquery.query(queryPendientes);
  
      if (comprasPendientes.length === 0) {
        return sendSuccess(res, { message: 'No hay compras pendientes para procesar.' });
      }
  
      let procesadasConExito = 0;
      let procesadasConError = 0;
  
      for (const compra of comprasPendientes) {
        try {
          // Buscamos solo los detalles de esta compra que aún no tienen un producto maestro asignado
          const queryDetalles = `SELECT id, descripcion_original FROM \`${DATASET_ID}.Detalles_Compras\` WHERE compra_id = @compraId AND producto_maestro_id IS NULL`;
          const [detalles] = await bigquery.query({ query: queryDetalles, params: { compraId: compra.id } });
  
          for (const detalle of detalles) {
            if (detalle.descripcion_original) {
              const queryPredict = `
                SELECT predicted_producto_maestro_id as producto_sugerido
                FROM ML.PREDICT(MODEL \`${DATASET_ID}.product_classifier\`, (SELECT @desc as descripcion_original))`;
              
              const [predictionResult] = await bigquery.query({
                query: queryPredict,
                params: { desc: detalle.descripcion_original }
              });
  
              if (predictionResult.length > 0 && predictionResult[0].producto_sugerido) {
                const sugerencia = predictionResult[0].producto_sugerido;
                const queryUpdateDetalle = `UPDATE \`${DATASET_ID}.Detalles_Compras\` SET producto_maestro_id = @sugerencia WHERE id = @detalleId`;
                await bigquery.query({
                  query: queryUpdateDetalle,
                  params: { sugerencia: sugerencia, detalleId: detalle.id }
                });
              }
            }
          }
          
          const queryUpdateCompra = `UPDATE \`${DATASET_ID}.Compras\` SET estado_ml = 'PROCESADO' WHERE id = @compraId`;
          await bigquery.query({ query: queryUpdateCompra, params: { compraId: compra.id } });
          procesadasConExito++;
  
        } catch (error) {
          console.error(`Error procesando la compra ${compra.id}:`, error);
          const queryUpdateCompraError = `UPDATE \`${DATASET_ID}.Compras\` SET estado_ml = 'ERROR' WHERE id = @compraId`;
          await bigquery.query({ query: queryUpdateCompraError, params: { compraId: compra.id } });
          procesadasConError++;
        }
      }
  
      sendSuccess(res, {
        message: 'Procesamiento por lotes completado.',
        total_procesadas: procesadasConExito,
        total_con_error: procesadasConError
      });
  
    } catch (error) {
      console.error('Error fatal en el procesamiento por lotes:', error);
      sendError(res, 'Error crítico durante el procesamiento por lotes.');
    }
});

/** CFEs */
app.get('/api/cfes', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const sql = `
      SELECT
        id,
        emisor_nombre,
        receptor_rut,
        tipo_cfe,
        serie_cfe,
        numero_cfe,
        fecha_emision,
        monto_total,
        moneda,
        nombre_archivo_original,
        fecha_procesamiento
      FROM ${FULL_TABLE}
      ORDER BY fecha_procesamiento DESC
      LIMIT @limit
    `;
    const [rows] = await bigquery.query({
      query: sql,
      params: { limit }
    });
    // devolvemos la misma forma que tus otros endpoints:
    sendSuccess(res, { items: rows, nextPageToken: null });
  } catch (err) {
    console.error('❌ Error leyendo CFEs:', err);
    sendError(res, err.message);
  }
});

// DETALLE: GET /api/cfes/:id
// en tu Express (functions/index.js o backend/index.js)

app.get('/api/cfes/:id', async (req, res) => {
  try {
    const sql = `
      SELECT *
      FROM ${FULL_TABLE}
      WHERE id = @id
      LIMIT 1
    `;
    const [rows] = await bigquery.query({
      query:    sql,
      params:   { id: req.params.id },
      location: 'us-central1'
    });
    if (rows.length === 0) return sendError(res, 'CFE no encontrado', 404);
    sendSuccess(res, rows[0]);
  } catch (err) {
    console.error('❌ Error detalle CFE:', err);
    sendError(res, err.message);
  }
});


/** COMPRAS */
// CREATE
app.post('/api/compras', async (req, res) => {
  const { proveedor_id, detalles } = req.body;
  if (!proveedor_id || !Array.isArray(detalles) || detalles.length === 0) {
    return sendError(res, 'Se requiere proveedor_id y detalles', 400);
  }

  try {
    // 1) Inserto la compra
    const compraId = uuidv4();
    const now = new Date().toISOString().slice(0,19).replace('T',' ');
    const montoTotal = detalles.reduce((sum, d) =>
      sum + (d.cantidad * d.precio_neto_unitario), 0
    );
    const nuevaCompra = {
      id:           compraId,
      proveedor_id: proveedor_id,
      created_at:   now,
      monto_total:  montoTotal,
      estado_ml:    'PENDIENTE'
    };
    await bigquery
      .dataset(DATASET_ID)
      .table('Compras')
      .insert([nuevaCompra]);

    // 2) Inserto los detalles
    const detallesParaInsertar = detalles.map(d => ({
      id:                   uuidv4(),
      compra_id:            compraId,
      producto_maestro_id:  d.producto_maestro_id || null,
      cantidad:             parseFloat(d.cantidad),
      precio_neto_unitario: parseFloat(d.precio_neto_unitario)
    }));
    await bigquery
      .dataset(DATASET_ID)
      .table('Detalles_Compras')
      .insert(detallesParaInsertar);

    // 3) Traigo el promedio 90 días desde la VIEW
    const productoId = detallesParaInsertar[0].producto_maestro_id;
    const precioNuevo = detallesParaInsertar[0].precio_neto_unitario;
    const sqlView = `
      SELECT precio_promedio
      FROM \`celesta-poc.${DATASET_ID}.Precio_Promedio_90d\`
      WHERE producto_maestro_id = @productoId
      LIMIT 1
    `;
    const [viewRows] = await bigquery.query({
      query: sqlView,
      params: { productoId }
    });
    const precioPromedio = viewRows[0]?.precio_promedio || 0;

    // 4) Si el precio nuevo > promedio → inserto alerta en BigQuery
    let alertaId = null;
    if (precioNuevo > precioPromedio) {
      alertaId = uuidv4();
      await bigquery
      .dataset(DATASET_ID)
      .table('Alertas')
      .insert([{
        id:                  alertaId,
        producto_maestro_id: productoId,
        compra_id:           compraId,
        precio_nuevo:        precioNuevo,
        precio_promedio:     precioPromedio,
        diferencia:          precioNuevo - precioPromedio,
        created_at:          now,
        leida:               false
      }]);
    }

    // 5) Devuelvo la respuesta incluyendo info de alerta
    return sendSuccess(res, {
      ...nuevaCompra,
      detalles:            detallesParaInsertar,
      precio_promedio_90d: precioPromedio,
      alerta_generada:     precioNuevo > precioPromedio,
      alerta_id:           alertaId
    }, 201);

  } catch (e) {
    console.error('Error creando compra con alerta:', e);
    return sendError(res, 'Error interno creando compra');
  }
});

// GET /api/precios-historico/:productoId
// Devuelve todos los precios registrados para un producto, ordenados por fecha
app.get('/api/precios-historico/:productoId', async (req, res) => {
  try {
    const { productoId } = req.params;
    const sqlHist = `
     SELECT
       c.created_at AS fecha,
       d.precio_neto_unitario AS precio
     FROM \`celesta-poc.${DATASET_ID}.Detalles_Compras\` AS d
     JOIN \`celesta-poc.${DATASET_ID}.Compras\`        AS c
       ON d.compra_id = c.id
     WHERE d.producto_maestro_id = @productoId
     ORDER BY fecha
   `;
    const [rows] = await bigquery.query({
      query: sqlHist,
      params: { productoId }
    });
    return sendSuccess(res, rows);
  } catch (e) {
    console.error('Error histórico de precios:', e);
    return sendError(res, 'Error interno obteniendo histórico');
  }
});

// GET /api/alertas
// Lista las alertas creadas en BigQuery
app.get('/api/alertas', async (req, res) => {
  const leidaParam = req.query.leida === 'true';
  // 🔥 Loguea DATASET_ID y la query
  console.log('🔍 DATASET_ID en /api/alertas:', DATASET_ID);
  const sql = `
    SELECT
      id,
      producto_maestro_id,
      precio_nuevo,
      precio_promedio,
      diferencia,
      FORMAT_TIMESTAMP(
       '%Y-%m-%d %H:%M:%S',
       TIMESTAMP(created_at, 'UTC'),
       'America/Montevideo'
     ) AS created_at
    FROM \`celesta-poc.${DATASET_ID}.Alertas\`
    WHERE leida = @leida
    ORDER BY created_at DESC
    LIMIT 100
  `;

  try {
    const [rows] = await bigquery.query({ query: sql, params: { leida: leidaParam } });
    return sendSuccess(res, rows);
  } catch (e) {
    console.error('❌ Error en /api/alertas:', e);
    return sendError(res, 'Error interno leyendo alertas');
  }
});

// 3) PUT /api/alertas/:id/leida → actualiza el flag en vez de borrar
app.put('/api/alertas/:id/leida', async (req, res) => {
  try {
    const sql = `
      UPDATE \`celesta-poc.${DATASET_ID}.Alertas\`
      SET leida = TRUE
      WHERE id = @id
    `;
    await bigquery.query({ query: sql, params: { id: req.params.id } });
    return res.status(204).send();
  } catch (e) {
    console.error('Error marcando alerta leída:', e);
    return sendError(res, 'Error interno marcando alerta leída');
  }
});

app.get('/api/alertas/:id', async (req, res) => {
  try {
    const sql = `
      SELECT 
        id,
        producto_maestro_id,
        precio_nuevo,
        precio_promedio,
        diferencia,
        FORMAT_TIMESTAMP(
         '%Y-%m-%d %H:%M:%S',
         TIMESTAMP(created_at, 'UTC'),
         'America/Montevideo'
       ) AS created_at
      FROM \`celesta-poc.${DATASET_ID}.Alertas\`
      WHERE id = @id
      LIMIT 1
    `;
    const [rows] = await bigquery.query({ query: sql, params: { id: req.params.id } });
    if (rows.length === 0) return sendError(res, 'Alerta no encontrada', 404);
    sendSuccess(res, rows[0]);
  } catch (e) {
    console.error('Error GET /api/alertas/:id', e);
    sendError(res, 'Error interno obteniendo alerta', 500);
  }
});

// READ ALL
app.get('/api/compras', async (req, res) => {
  try {
    // MODIFICACIÓN: Usamos un JOIN para traer el nombre del proveedor
    const query = `
      SELECT 
        c.id, 
        c.folio, 
        c.monto_total, 
        c.created_at, 
        c.estado_ml,
        p.razon_social AS proveedor_nombre -- Creamos un alias para el nombre del proveedor
      FROM 
        \`${DATASET_ID}.Compras\` AS c
      LEFT JOIN 
        \`${DATASET_ID}.Proveedor\` AS p ON c.proveedor_id = p.id
      ORDER BY 
        c.created_at DESC
    `;
    const [rows] = await bigquery.query(query);
    sendSuccess(res, rows);
  } catch (error) {
    console.error("Error al obtener las compras:", error);
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
