import { env } from './env.js'

const DAILY_API_BASE = 'https://api.daily.co/v1'

export class DailyApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'DailyApiError'
    this.status = status
  }
}

async function dailyFetch<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${DAILY_API_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.DAILY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new DailyApiError(502, `Daily API ${path} falló: ${await response.text()}`)
  }

  return (await response.json()) as T
}

export interface DailyRoom {
  name: string
  url: string
}

// exp corto + eject_at_room_exp; enable_recording nunca se manda (nunca se graba).
export async function createDailyRoom(name: string, expUnixSeconds: number): Promise<DailyRoom> {
  return dailyFetch<DailyRoom>('/rooms', {
    name,
    privacy: 'private',
    properties: {
      exp: expUnixSeconds,
      eject_at_room_exp: true,
      enable_prejoin_ui: true,
    },
  })
}

export interface DailyMeetingToken {
  token: string
}

// Token por-join con is_owner según created_by; enable_recording nunca se manda,
// ni siquiera para el owner.
export async function createDailyMeetingToken(
  roomName: string,
  isOwner: boolean,
): Promise<DailyMeetingToken> {
  return dailyFetch<DailyMeetingToken>('/meeting-tokens', {
    properties: {
      room_name: roomName,
      is_owner: isOwner,
    },
  })
}
