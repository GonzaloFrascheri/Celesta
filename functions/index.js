// index.js  (o el entrypoint de tu Cloud Run)
require('dotenv').config();
const { BigQuery } = require('@google-cloud/bigquery');
const Busboy      = require('busboy');
const { XMLParser } = require('fast-xml-parser');
const { v4: uuidv4 } = require('uuid');

const PROJECT_ID = process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT;
const DATASET_ID = process.env.BIGQUERY_DATASET_ID || 'celesta_data';
const TABLE_ID   = process.env.BIGQUERY_TABLE_ID   || 'cfes';

const bigquery = new BigQuery({ projectId: PROJECT_ID });
const xmlParser = new XMLParser({ ignoreAttributes:false, attributeNamePrefix: '' });

exports.procesarCFE = (req, res) => {
  console.log('📥 LLEGÓ', req.method, 'a', req.path);
  console.log('🔥 Content-Type:', req.headers['content-type'] || '');

  // health check
  if (req.method === 'GET') {
    return res.status(200).send('Alive');
  }
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
        // parseamos el XML a objeto
        const doc = xmlParser.parse(att.content);
        const eFact = doc?.EnvioCFE_entreEmpresas?.Caratula || doc?.CFE_Adenda?.['ns0:CFE']?.ns0?.eFact;
        // aquí extraes tu Carátula o Encabezado según esquema
        const car = doc?.EnvioCFE_entreEmpresas?.Caratula || {};
        const idDoc = doc?.EnvioCFE_entreEmpresas?.CFE_Adenda?.['ns0:CFE']?.ns0?.eFact?.Encabezado?.IdDoc || {};

        return {
          id:                      uuidv4(),
          nombre_archivo_original: att.filename,
          fecha_procesamiento:     new Date().toISOString(),
          // ajusta según tags que encuentres:
          emisor_rut:              car.RUCEmisor || null,
          emisor_nombre:           car.RznSoc    || null,
          receptor_rut:            car.RutReceptor || null,
          tipo_cfe:                idDoc.TipoCFE ? Number(idDoc.TipoCFE) : null,
          serie_cfe:               idDoc.Serie    || null,
          numero_cfe:              idDoc.Nro      ? Number(idDoc.Nro) : null,
          fecha_emision:           idDoc.FchEmis
                                   ? new Date(idDoc.FchEmis).toISOString()
                                   : null,
          monto_total:             car.CantCFE    || null,  // o Totales.MntTotal
          moneda:                  car.Moneda     || null,
          contenido_xml:           att.content
        };
      });

      await bigquery
        .dataset(DATASET_ID)
        .table(TABLE_ID)
        .insert(rows, { ignoreUnknownValues: true, skipInvalidRows: true });

      console.log(`✅ Insertadas ${rows.length} filas`);
      return res.status(200).send(`Procesados ${rows.length} CFE(s).`);
    } catch (err) {
      console.error('❌ Error BigQuery insert:', err);
      return res.status(500).send('Error interno insertando en BigQuery.');
    }
  });

  // ¡MUY IMPORTANTE! pasamos el request al parser
  req.pipe(busboy);
};
   