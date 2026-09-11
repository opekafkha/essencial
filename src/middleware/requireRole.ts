import type { NextFunction, Request, Response } from 'express'
import type { Role } from '../roles.js'

// Mismo contrato que requireRole en supabase/functions/_shared/auth.ts,
// ahora como middleware de Express. Se monta después de requireAuth.
export function requireRole(...allowed: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !allowed.includes(req.user.role)) {
      res.status(403).json({ error: 'No autorizado para esta acción' })
      return
    }
    next()
  }
}
