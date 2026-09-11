import { z } from 'zod'

export const joinVideoRoomParamsSchema = z.object({
  slug: z.string().min(1),
})

export type JoinVideoRoomParams = z.infer<typeof joinVideoRoomParamsSchema>

export const createVideoRoomResponseSchema = z.object({
  joinUrl: z.string().url(),
  slug: z.string(),
})

export type CreateVideoRoomResponse = z.infer<typeof createVideoRoomResponseSchema>

export const getVideoRoomResponseSchema = z.object({
  dailyRoomUrl: z.string().url(),
  meetingToken: z.string(),
})

export type GetVideoRoomResponse = z.infer<typeof getVideoRoomResponseSchema>
