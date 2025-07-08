try {
  console.log('🚀 Iniciando servicio procesador-cfes...');
  require('dotenv').config();
  const express     = require('express');
  const Busboy      = require('busboy');
  const { XMLParser } = require('fast-xml-parser');
  const { v4: uuidv4 } = require('uuid');
  const { BigQuery } = require('@google-cloud/bigquery');

  console.log('✅ Dependencias cargadas.');

  const app = express();

  const PROJECT_ID = process.env.GCLOUD_PROJECT_ID || 'celesta-poc';
  const DATASET_ID = process.env.BIGQUERY_DATASET_ID || 'celesta_data';
  const TABLE_ID   = process.env.BIGQUERY_TABLE_ID   || 'cfes';

  console.log(`➡️  PROJECT_ID: ${PROJECT_ID}`);
  console.log(`➡️  DATASET_ID: ${DATASET_ID}`);
  console.log(`➡️  TABLE_ID: ${TABLE_ID}`);

  if (!PROJECT_ID) {
    throw new Error('El PROJECT_ID no está definido. Asegúrate de que la variable de entorno GCLOUD_PROJECT_ID, GCP_PROJECT o GCLOUD_PROJECT esté disponible.');
  }

  const bigquery = new BigQuery({ projectId: PROJECT_ID });
  const xmlParser = new XMLParser({
    ignoreAttributes: false,
    ignoreNameSpace: true, // Opción más robusta para ignorar todos los namespaces
    parseTagValue: false, // Mantiene todos los valores como strings
    // Evita procesar las partes más grandes y complejas que no necesitamos
    stopNodes: ["*.Signature", "*.X509Certificate"]
  });

  console.log('✅ Cliente de BigQuery y Parser XML inicializados.');

  // Health check simple
  app.get('/', (req, res) => res.status(200).send('Alive'));

  // Tu endpoint principal:
  app.post('/api/inbound', (req, res) => {
  console.log('📥 LLEGÓ', req.method, 'a', req.path);
  console.log('🔥 Content-Type:', req.headers['content-type'] || '');

  if (req.method !== 'POST') {
    return res.status(405).send('Método no permitido');
  }

  const ct = req.headers['content-type'] || '';
  if (!ct.startsWith('multipart/form-data')) {
    return res
      .status(400)
      .send(`Se esperaba multipart/form-data, llegó: ${ct}`);
  }

  const busboy = Busboy({ headers: req.headers });
  const attachments = [];

  busboy.on('file', (fieldname, fileStream, info) => {
    const { filename, mimeType } = info;
    // solo nos interesan los XML
    if (!filename.toLowerCase().endsWith('.xml')) {
      return fileStream.resume();
    }
    let buffer = '';
    fileStream.on('data', chunk => buffer += chunk.toString());
    fileStream.on('end', () => {
      attachments.push({ filename, content: buffer });
    });
  });

  busboy.on('error', err => {
    console.error('Busboy error:', err);
    res.status(500).send('Error leyendo adjuntos');
  });

  busboy.on('finish', async () => {
    if (attachments.length === 0) {
      console.warn('⚠️ Sin adjuntos XML.');
      return res.status(400).send('Sin adjuntos XML');
    }

    try {
      const rows = attachments.map(att => {
        const doc = xmlParser.parse(att.content);
        const row = {
          id: uuidv4(),
          nombre_archivo_original: att.filename,
          fecha_procesamiento: new Date().toISOString(),
          contenido_xml: att.content,
          emisor_rut: null,
          emisor_nombre: null,
          receptor_rut: null,
          tipo_cfe: null,
          serie_cfe: null,
          numero_cfe: null,
          fecha_emision: null,
          monto_total: null,
          moneda: null,
          detalle: [],
        };

        // --- Lógica para procesar FACTURAS (EnvioCFE_entreEmpresas) ---
        if (doc.EnvioCFE_entreEmpresas) {
          const envio = doc.EnvioCFE_entreEmpresas?.EnvioCFE_entreEmpresas || doc.EnvioCFE_entreEmpresas;
          const caratula = envio.Caratula || {};
          const cfe = envio.CFE_Adenda?.CFE || {};
          const eFact = cfe.eFact || {};
          const encabezado = eFact.Encabezado || {};
          const idDoc = encabezado.IdDoc || {};
          const emisor = encabezado.Emisor || {};
          const totales = encabezado.Totales || {};
          const detalle = encabezado.Detalle || {};
          const items = detalle.Item ? (Array.isArray(detalle.Item) ? detalle.Item : [detalle.Item]) : [];

          row.emisor_rut = caratula.RUCEmisor || emisor.RUCEmisor || null;
          row.emisor_nombre = emisor.RznSoc || caratula.RznSoc || null;
          row.receptor_rut = caratula.RutReceptor || null;
          row.tipo_cfe = idDoc.TipoCFE ? Number(idDoc.TipoCFE) : null;
          row.serie_cfe = idDoc.Serie || null;
          row.numero_cfe = idDoc.Nro ? Number(idDoc.Nro) : null;
          row.fecha_emision = idDoc.FchEmis ? new Date(idDoc.FchEmis).toISOString() : null;
          row.monto_total = totales.MntTotal ? Number(totales.MntTotal) : null;
          row.moneda = totales.TpoMoneda || null;
          row.detalle = items.map(item => ({
            nro_linea: item.NroLinDet ? Number(item.NroLinDet) : null,
            nombre_item: item.NomItem || null,
            cantidad: item.Cantidad ? Number(item.Cantidad) : null,
            precio_unitario: item.PrecioUnitario ? Number(item.PrecioUnitario) : null,
            monto_item: item.MontoItem ? Number(item.MontoItem) : null,
          }));
        } else if (doc.ACKCFE) { // --- Lógica para procesar ACUSES DE RECIBO (ACKCFE) ---
          const ack = doc.ACKCFE;
          const caratula = ack.Caratula || {};
          const detalleAck = ack.ACKCFE_Det || {};

          row.emisor_rut = caratula.RUCEmisor || null;
          row.receptor_rut = caratula.RutReceptor || null;
          row.tipo_cfe = detalleAck.TipoCFE ? Number(detalleAck.TipoCFE) : null;
          row.serie_cfe = detalleAck.Serie || null;
          row.numero_cfe = detalleAck.NroCFE ? Number(detalleAck.NroCFE) : null;
          row.fecha_emision = detalleAck.FechaCFE ? new Date(detalleAck.FechaCFE).toISOString() : null;
          // Los ACKs no tienen monto, nombre de emisor ni detalle. Se quedan en null/vacío.
        }

        return row;
      });

      await bigquery
        .dataset(DATASET_ID)
        .table(TABLE_ID)
        .insert(rows, { ignoreUnknownValues: true, skipInvalidRows: true });

      console.log(`✅ Insertadas ${rows.length} filas.`);
      return res.status(200).send(`Procesados ${rows.length} CFE(s).`);
    } catch (err) {
      console.error('❌ Error BigQuery insert:', err);
      return res.status(500).send('Error interno insertando en BigQuery.');
    }
  });

  req.pipe(busboy);
});

  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log(`🚀 Procesador escuchando en puerto ${PORT}`);
    console.log('✅ Servicio iniciado y listo para recibir peticiones.');
  });

} catch (error) {
  console.error('❌ Error fatal durante la inicialización del servicio:', error);
  process.exit(1);
}