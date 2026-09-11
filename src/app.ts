import cors from 'cors'
import express, { type Express } from 'express'
import { env } from './lib/env.js'
import { errorHandler } from './middleware/errorHandler.js'
import { authProxyRouter } from './routes/auth-proxy.routes.js'
import { healthRouter } from './routes/health.routes.js'
import { meRouter } from './routes/me.routes.js'
import { videoRoomsRouter } from './routes/video-rooms.routes.js'

export function createApp(): Express {
  const app = express()

  app.use(cors({ origin: env.ALLOWED_ORIGINS }))
  app.use('/auth/v1', authProxyRouter)
  app.use(express.json())

  app.use(healthRouter)
  app.use(meRouter)
  app.use(videoRoomsRouter)

  app.use(errorHandler)

  return app
}
