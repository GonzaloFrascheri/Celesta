// pages/api/inbound.js
import Busboy from 'busboy'
import { procesarCFE } from '../../functions/index'

export const config = { api: { bodyParser: false } }

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end('Método no permitido')
  }

  const contentType = req.headers['content-type'] || ''
  if (!contentType.startsWith('multipart/form-data')) {
    return res.status(400).end('Se esperaba multipart/form-data')
  }

  const bb = new Busboy({ headers: req.headers })
  const fields = {}
  const attachments = []

  bb.on('field', (name, val) => {
    fields[name] = val
  })

  bb.on('file', (fieldname, stream, info) => {
    const { filename, mimeType } = info
    const chunks = []
    stream.on('data', (c) => {
      chunks.push(Buffer.from(c))
    })
    stream.on('end', () => {
      const content = Buffer.concat(chunks).toString('base64')
      attachments.push({ filename, content, mimeType })
    })
  })

  bb.on('error', (err) => {
    console.error('Busboy error:', err)
    res.status(500).end('Error parseando correo')
  })

  bb.on('finish', async () => {
    const fakeReq = {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      is: (t) => t === 'application/json',
      body: { ...fields, attachments }
    }
    const fakeRes = {
      status: (code) => ({
        send: (msg) => res.status(code).send(msg),
        json: (o)   => res.status(code).json(o)
      })
    }

    try {
      await procesarCFE(fakeReq, fakeRes)
    } catch (e) {
      console.error('Error interno procesarCFE:', e)
      res.status(500).end('Error interno')
    }
  })

  req.pipe(bb)
}
