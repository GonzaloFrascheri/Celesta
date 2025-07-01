require('dotenv').config();
const { BigQuery } = require('@google-cloud/bigquery');
const Busboy      = require('busboy');
const { XMLParser } = require('fast-xml-parser');
const { v4: uuidv4 } = require('uuid');

// Ajusta estos valores en tu .env o en las vars de Cloud Functions
const PROJECT_ID = process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT;
const DATASET_ID = process.env.BIGQUERY_DATASET_ID || 'celesta_data';
const TABLE_ID   = process.env.BIGQUERY_TABLE_ID   || 'cfes';

const bigquery = new BigQuery({ projectId: PROJECT_ID });
const xmlParser = new XMLParser({
  ignoreAttributes:    false,
  attributeNamePrefix: ''
});

exports.procesarCFE = (req, res) => {
  // Health check
  if (req.method === 'GET') {
    return res.status(200).send('Alive');
  }
  if (req.method !== 'POST') {
    return res.status(405).send('Método no permitido');
  }
  const contentType = req.headers['content-type'] || '';
  if (!contentType.startsWith('multipart/form-data')) {
    return res.status(400).send('Se esperaba multipart/form-data');
  }

  const busboy = new Busboy({ headers: req.headers });
  const attachments = [];

  busboy.on('file', (fieldname, fileStream, info) => {
    const { filename, mimeType } = info;
    const isXml = mimeType === 'application/xml'
               || filename.toLowerCase().endsWith('.xml');
    if (!isXml) return fileStream.resume();
    let buffer = '';
    fileStream.on('data', chunk => buffer += chunk.toString());
    fileStream.on('end', () => attachments.push({ filename, content: buffer }));
  });

  busboy.on('error', err => {
    console.error('Busboy error:', err);
    res.status(500).send('Error leyendo adjuntos');
  });

  busboy.on('finish', async () => {
    if (attachments.length === 0) {
      console.log('Sin adjuntos XML.');
      return res.status(200).send('Sin adjuntos XML.');
    }

    try {
      const rows = attachments.map(att => {
        const doc      = xmlParser.parse(att.content);
        const eFact    = doc?.CFE?.eFact;
        const encabez  = eFact?.Encabezado || {};
        const emisor   = encabez?.Emisor     || {};
        const receptor = encabez?.Receptor   || {};
        const totales  = encabez?.Totales    || {};
        const idDoc    = encabez?.IdDoc      || {};

        return {
          id:                       uuidv4(),
          nombre_archivo_original:  att.filename,
          fecha_procesamiento:      new Date().toISOString(),
          emisor_rut:               emisor.RUCEmisor    || null,
          emisor_nombre:            emisor.RznSoc       || null,
          receptor_rut:             receptor.RUCReceptor|| null,
          tipo_cfe:                 Number(idDoc.TipoCFE)|| null,
          serie_cfe:                idDoc.Serie         || null,
          numero_cfe:               Number(idDoc.Nro)    || null,
          fecha_emision:            idDoc.FchEmis
                                    ? new Date(idDoc.FchEmis).toISOString()
                                    : null,
          monto_total:              Number(totales.MntTotal) || 0,
          moneda:                   totales.TpoMoneda   || null,
          contenido_xml:            att.content
        };
      });

      await bigquery
        .dataset(DATASET_ID)
        .table(TABLE_ID)
        .insert(rows, { ignoreUnknownValues: true, skipInvalidRows: true });

      console.log(`✅ Insertadas ${rows.length} filas`);
      res.status(200).send(`Procesados ${rows.length} CFE(s).`);
    } catch (err) {
      console.error('Error BigQuery insert:', err);
      res.status(500).send('Error interno insertando en BigQuery.');
    }
  });

  req.pipe(busboy);
};
