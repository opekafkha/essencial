import { Router } from 'express'
import { Readable } from 'node:stream'
import { env } from '../lib/env.js'

export const authProxyRouter = Router()

// GoTrue no sirve sus rutas bajo /auth/v1 (ese prefijo lo mapea Kong en el
// self-host oficial de Supabase). @supabase/supabase-js lo asume fijo, así
// que este backend hace de gateway: reenvía todo /auth/v1/* al GoTrue interno.
// Montado ANTES de express.json() para streamear el body crudo sin
// reserializarlo.
authProxyRouter.use(async (req, res) => {
  const target = `${env.GOTRUE_URL}${req.url}`

  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (!value || ['host', 'connection', 'content-length'].includes(key)) continue
    headers.set(key, Array.isArray(value) ? value.join(',') : value)
  }

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD'
  const upstream = await fetch(target, {
    method: req.method,
    headers,
    body: hasBody ? (Readable.toWeb(req) as ReadableStream) : undefined,
    duplex: hasBody ? 'half' : undefined,
  } as RequestInit)

  res.status(upstream.status)
  upstream.headers.forEach((value, key) => {
    if (['content-encoding', 'transfer-encoding'].includes(key.toLowerCase())) return
    res.setHeader(key, value)
  })

  if (!upstream.body) {
    res.end()
    return
  }
  Readable.fromWeb(upstream.body as never).pipe(res)
})
