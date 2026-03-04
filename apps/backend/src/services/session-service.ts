import { sessionQueries } from '@grasp/db'

export async function getSessionStats(userId: string) {
  const allSessions = await sessionQueries.listByUser(userId)

  const now = new Date()
  let totalMs = 0
  let activeSession = false
  const completedDates = new Set<string>()

  for (const s of allSessions) {
    const end = s.endedAt ?? now
    totalMs += end.getTime() - s.startedAt.getTime()
    if (!s.endedAt) {
      activeSession = true
    }
    if (s.endedAt) {
      completedDates.add(s.startedAt.toISOString().slice(0, 10))
    }
  }

  if (activeSession) {
    completedDates.add(now.toISOString().slice(0, 10))
  }

  const sortedDates = [...completedDates].sort().reverse()
  let currentStreak = 0
  let longestStreak = 0
  let streak = 0
  let prevDate: Date | null = null

  for (const dateStr of sortedDates) {
    const date = new Date(dateStr)
    if (prevDate) {
      const diff = (prevDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
      if (diff <= 1.5) {
        streak++
      } else {
        if (streak > longestStreak) longestStreak = streak
        streak = 1
      }
    } else {
      const today = now.toISOString().slice(0, 10)
      const yesterday = new Date(now.getTime() - 86400000).toISOString().slice(0, 10)
      if (dateStr === today || dateStr === yesterday) {
        streak = 1
      }
    }
    prevDate = date
  }
  if (streak > longestStreak) longestStreak = streak
  currentStreak = streak

  return {
    totalHours: Math.round((totalMs / 3600000) * 10) / 10,
    currentStreakDays: currentStreak,
    longestStreakDays: longestStreak,
    lastSessionDate: allSessions.length > 0 ? allSessions[0]!.startedAt.toISOString() : null,
    activeSession,
    totalSessions: allSessions.length,
  }
}

export async function startSession(userId: string, courseSlug?: string) {
  return sessionQueries.endActiveAndInsert(userId, courseSlug)
}

export async function endSession(userId: string) {
  const active = await sessionQueries.findFirstActiveByUser(userId)
  if (!active) {
    throw Object.assign(new Error('No active session'), { status: 404 })
  }
  const ended = await sessionQueries.endById(active.id)
  if (!ended) {
    throw Object.assign(new Error('No active session'), { status: 404 })
  }
  return ended
}
