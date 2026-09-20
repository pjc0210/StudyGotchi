'use server'

import { writeSession } from '@/lib/session'
import type { User } from '@/lib/types'

export async function saveSession(user: User | null) {
  await writeSession(user)
}
