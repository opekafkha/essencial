import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import { createVideoRoomResponseSchema, getVideoRoomResponseSchema } from '../schemas/video-room.schema.js'
import { createDailyMeetingToken, createDailyRoom } from '../lib/daily.js'
import { env } from '../lib/env.js'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireRole } from '../middleware/requireRole.js'

const ROOM_TTL_SECONDS = 60 * 60 * 2 // 2h — suficiente para una sesión de prueba

export const videoRoomsRouter = Router()

// RQ-44 — el profesional (o admin) genera una sala de 1 clic. Sin agenda, sin
// cita formal: portado 1:1 desde supabase/functions/create-video-room.
videoRoomsRouter.post('/video-rooms', requireAuth, requireRole('profesional', 'admin'), async (req, res) => {
  const slug = randomUUID()
  const roomName = `esencial-${slug}`
  const expUnix = Math.floor(Date.now() / 1000) + ROOM_TTL_SECONDS

  const dailyRoom = await createDailyRoom(roomName, expUnix)

  await prisma.videoRoom.create({
    data: {
      slug,
      dailyRoomName: dailyRoom.name,
      dailyRoomUrl: dailyRoom.url,
      provider: 'daily',
      createdBy: req.user!.id,
      status: 'activa',
      recordingEnabled: false,
      expiresAt: new Date(expUnix * 1000),
    },
  })

  const response = createVideoRoomResponseSchema.parse({
    joinUrl: `${env.WEB_APP_URL}/join/${slug}`,
    slug,
  })
  res.json(response)
})

// RQ-44 — cualquier usuario autenticado con el link entra a la sala (sin
// matching, sin cita). Portado 1:1 desde supabase/functions/get-video-room.
videoRoomsRouter.get<{ slug: string }>('/video-rooms/:slug', requireAuth, async (req, res) => {
  const room = await prisma.videoRoom.findUnique({ where: { slug: req.params.slug } })

  if (!room) {
    res.status(404).json({ error: 'Sala no encontrada' })
    return
  }
  if (room.status !== 'activa' || room.expiresAt < new Date()) {
    res.status(410).json({ error: 'La sala ya no está activa' })
    return
  }

  const meetingToken = await createDailyMeetingToken(
    room.dailyRoomName,
    req.user!.id === room.createdBy,
  )

  const response = getVideoRoomResponseSchema.parse({
    dailyRoomUrl: room.dailyRoomUrl,
    meetingToken: meetingToken.token,
  })
  res.json(response)
})
