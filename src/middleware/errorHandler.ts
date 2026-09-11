import type { NextFunction, Request, Response } from 'express'
import { DailyApiError } from '../lib/daily.js'

// Express 5 propaga los rejections de handlers async solo, así que esto
// captura tanto errores síncronos como promesas rechazadas sin try/catch
// repetido en cada ruta.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof DailyApiError) {
    res.status(err.status).json({ error: err.message })
    return
  }

  console.error(err)
  res.status(500).json({ error: 'Error interno del servidor' })
}
