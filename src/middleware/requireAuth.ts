import type { NextFunction, Request, Response } from 'express'
import type { Role } from '../roles.js'
import { prisma } from '../lib/prisma.js'
import { verifyGotrueJwt } from '../lib/gotrueJwt.js'

export interface AuthedUser {
  id: string
  email: string
  role: Role
}

declare global {
  // Única forma de aumentar el tipo Request de Express con el usuario autenticado.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthedUser
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No autenticado' })
    return
  }

  const token = authHeader.slice('Bearer '.length)
  let payload
  try {
    payload = await verifyGotrueJwt(token)
  } catch {
    res.status(401).json({ error: 'Token inválido' })
    return
  }

  const profile = await prisma.profile.findUnique({
    where: { id: payload.sub },
    select: { role: true },
  })
  if (!profile) {
    res.status(401).json({ error: 'Perfil no encontrado' })
    return
  }

  req.user = { id: payload.sub, email: payload.email ?? '', role: profile.role }
  next()
}
