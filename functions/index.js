require('dotenv').config()
const { BigQuery } = require('@google-cloud/bigquery')
const { XMLParser } = require('fast-xml-parser')
const { v4: uuidv4 } = require('uuid')

const PROJECT_ID = process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT
const DATASET_ID = process.env.BIGQUERY_DATASET_ID || 'celesta_data'
const TABLE_ID   = process.env.BIGQUERY_TABLE_ID   || 'cfes'

const bigquery  = new BigQuery({ projectId: PROJECT_ID })
const parser    = new XMLParser({ ignoreAttributes:false, attributeNamePrefix:'' })

exports.procesarCFE = async (req, res) => {
  // health-check
  if (req.method === 'GET') return res.status(200).send('Alive')
  if (req.method !== 'POST') return res.status(405).send('Método no permitido')
  if (!req.is('application/json')) return res.status(400).send('Se esperaba JSON')

  const ct = req.headers['content-type'] || ''
  console.log('🔥 Content-Type recibido:', ct)

  // 2) Validar que sea multipart
  if (!ct.startsWith('multipart/form-data')) {
    return res
      .status(400)
      .send(`Se esperaba multipart/form-data, llegó: ${ct}`)
  }

  const { attachments = [] } = req.body
  if (!Array.isArray(attachments) || attachments.length === 0) {
    return res.status(400).send('Sin adjuntos')
  }

  // filtrar sólo XML
  const xmls = attachments.filter(a =>
    a.filename.toLowerCase().endsWith('.xml')
  )
  if (xmls.length === 0) {
    return res.status(400).send('Sin XML adjunto')
  }

  try {
    const rows = xmls.map(att => {
      const xml = Buffer.from(att.content, 'base64').toString('utf8')
      const doc = parser.parse(xml)
      const eFact = doc?.CFE?.eFact
      const enc  = eFact?.Encabezado || {}
      const idD  = enc?.IdDoc      || {}
      const tot  = enc?.Totales    || {}

      return {
        id:                      uuidv4(),
        nombre_archivo_original: att.filename,
        fecha_procesamiento:     new Date().toISOString(),
        emisor_rut:              enc?.Emisor?.RUCEmisor    || null,
        emisor_nombre:           enc?.Emisor?.RznSoc       || null,
        receptor_rut:            enc?.Receptor?.RUCReceptor|| null,
        tipo_cfe:                Number(idD.TipoCFE)        || null,
        serie_cfe:               idD.Serie                  || null,
        numero_cfe:              Number(idD.Nro)            || null,
        fecha_emision:           idD.FchEmis
                                 ? new Date(idD.FchEmis).toISOString()
                                 : null,
        monto_total:             Number(tot.MntTotal)       || null,
        moneda:                  tot.TpoMoneda              || null,
        contenido_xml:           xml
      }
    })

    await bigquery
      .dataset(DATASET_ID)
      .table(TABLE_ID)
      .insert(rows, { ignoreUnknownValues: true, skipInvalidRows: true })

    console.log(`✅ Insertadas ${rows.length} filas`)
    return res.status(200).send(`Procesados ${rows.length} CFE(s)`)
  } catch (err) {
    console.error('Error BigQuery:', err)
    return res.status(500).send('Error interno BigQuery')
  }
}
