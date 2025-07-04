// /pages/api/inbound.js
import { BigQuery } from '@google-cloud/bigquery';
import { v4 as uuidv4 } from 'uuid';

// 1) Configuración BigQuery
const PROJECT_ID = process.env.GCLOUD_PROJECT;
const DATASET_ID = process.env.BIGQUERY_DATASET_ID   || 'celesta_data';
const TABLE_ID   = process.env.BIGQUERY_TABLE_ID     || 'cfes';
const bigquery   = new BigQuery({ projectId: PROJECT_ID });

// 2) Helper para extraer tags del XML
function extractTagValue(xml, tag) {
  const re = new RegExp(`<(?:(?:\\w+:)?${tag})[^>]*>([^<]*)<\\/(?:\\w+:)?${tag}>`);
  const m = xml.match(re);
  return m ? m[1] : null;
}

// 3) Deshabilitamos el bodyParser por defecto si quisiéramos manejar raw.
//    En este caso SendGrid nos manda JSON, así que lo podemos dejar activo.
// export const config = {
//   api: { bodyParser: false }
// };

export default async function handler(req, res) {
  // 4) Validaciones de método y contenido
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).send('Método no permitido');
  }
  if (!req.headers['content-type']?.includes('application/json')) {
    return res.status(400).send('Se esperaba JSON');
  }

  // 5) El JSON que manda SendGrid viene con un campo `attachments`
  const { attachments = [] } = req.body;
  if (!Array.isArray(attachments) || attachments.length === 0) {
    return res.status(400).send('Sin attachments');
  }

  // 6) Filtramos los XML
  const xmlFiles = attachments.filter(a => a.filename?.toLowerCase().endsWith('.xml'));
  if (xmlFiles.length === 0) {
    return res.status(400).send('Sin XML adjunto');
  }

  try {
    // 7) Convertimos cada XML en una fila para BigQuery
    const rows = xmlFiles.map(att => {
      let xmlString = Buffer.from(att.content, 'base64').toString('utf8');
      xmlString = xmlString.replace(/<\?xml[\s\S]*?\?>/g, '');

      const emisorRut    = extractTagValue(xmlString, 'RUCEmisor');
      const emisorName   = extractTagValue(xmlString, 'RznSoc');
      const receptorRut  = extractTagValue(xmlString, 'RutReceptor');
      const tipoCFE      = extractTagValue(xmlString, 'TipoCFE');
      const serieCFE     = extractTagValue(xmlString, 'Serie');
      const numeroCFE    = extractTagValue(xmlString, 'Nro');
      const fchEmis      = extractTagValue(xmlString, 'FchEmis');
      const montoTotal   = extractTagValue(xmlString, 'MntTotal');
      const tpoMoneda    = extractTagValue(xmlString, 'TpoMoneda');

      return {
        id:                      uuidv4(),
        nombre_archivo_original: att.filename,
        fecha_procesamiento:     new Date().toISOString(),

        emisor_rut:    emisorRut   || null,
        emisor_nombre: emisorName  || null,
        receptor_rut:  receptorRut || null,

        tipo_cfe:      tipoCFE     ? Number(tipoCFE)   : null,
        serie_cfe:     serieCFE    || null,
        numero_cfe:    numeroCFE   ? Number(numeroCFE) : null,

        fecha_emision: fchEmis     ? new Date(fchEmis).toISOString() : null,

        monto_total:   montoTotal  ? Number(montoTotal) : null,
        moneda:        tpoMoneda   || null,

        contenido_xml: xmlString
      };
    });

    // 8) Insertamos en BigQuery
    await bigquery
      .dataset(DATASET_ID)
      .table(TABLE_ID)
      .insert(rows, { ignoreUnknownValues: true, skipInvalidRows: true });

    return res.status(200).send(`✅ Insertados ${rows.length} CFE(s)`);
  } catch (err) {
    console.error('Error procesando CFE:', err);
    return res.status(500).send('Error interno procesando CFE');
  }
}
