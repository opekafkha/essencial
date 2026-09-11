import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/requireAuth.js'

export const meRouter = Router()

// Reemplaza la query PostgREST que el frontend hacía directo contra
// `profiles` (supabase.from('profiles').select()) — ya no hay PostgREST en
// el stack self-hosted, así que el perfil se sirve desde el backend.
meRouter.get('/me', requireAuth, async (req, res) => {
  const profile = await prisma.profile.findUniqueOrThrow({ where: { id: req.user!.id } })
  res.json({
    id: profile.id,
    email: profile.email,
    nombre: profile.nombre,
    role: profile.role,
    created_at: profile.createdAt.toISOString(),
    updated_at: profile.updatedAt.toISOString(),
  })
})
