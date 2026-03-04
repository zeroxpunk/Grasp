import { getDb, chatMessages, chatMessageQueries, exerciseQueries, lessonQueries } from '@grasp/db'
import { and, eq } from 'drizzle-orm'

export interface ChatHistoryMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  exerciseId: number | null
  seq: number
  createdAt: string
}

export interface ChatInputMessage {
  role: 'user' | 'assistant'
  content: string
  exerciseId?: number | null
}

async function getLessonExercisesByNumber(lessonId: string) {
  const exercises = await exerciseQueries.listByLesson(lessonId)
  return {
    byNumber: new Map(exercises.map((exercise) => [exercise.exerciseNumber, exercise])),
    byId: new Map(exercises.map((exercise) => [exercise.id, exercise])),
  }
}

export async function getChatHistory(courseId: string, lessonNumber: number, userId: string): Promise<ChatHistoryMessage[] | null> {
  const lesson = await lessonQueries.findByCourseAndNumber(courseId, lessonNumber)
  if (!lesson) return null

  const [messages, exercises] = await Promise.all([
    chatMessageQueries.listByLessonAndUser(lesson.id, userId),
    getLessonExercisesByNumber(lesson.id),
  ])

  return messages.map((message) => ({
    id: message.id,
    role: message.role as ChatHistoryMessage['role'],
    content: message.content,
    exerciseId: message.exerciseId ? (exercises.byId.get(message.exerciseId)?.exerciseNumber ?? null) : null,
    seq: message.seq,
    createdAt: message.createdAt.toISOString(),
  }))
}

export async function saveChatHistory(
  courseId: string,
  lessonNumber: number,
  userId: string,
  messages: ChatInputMessage[],
) {
  const lesson = await lessonQueries.findByCourseAndNumber(courseId, lessonNumber)
  if (!lesson) return null

  const exercises = await getLessonExercisesByNumber(lesson.id)

  const rows = messages.map((message, index) => {
    const exercise = message.exerciseId != null
      ? exercises.byNumber.get(message.exerciseId)
      : null

    if (message.exerciseId != null && !exercise) {
      throw Object.assign(
        new Error(`Exercise ${message.exerciseId} not found in lesson ${lessonNumber}`),
        { status: 400 },
      )
    }

    return {
      lessonId: lesson.id,
      userId,
      role: message.role,
      content: message.content,
      exerciseId: exercise?.id ?? null,
      seq: index + 1,
    }
  })

  await getDb().transaction(async (tx) => {
    await tx
      .delete(chatMessages)
      .where(and(eq(chatMessages.lessonId, lesson.id), eq(chatMessages.userId, userId)))

    if (rows.length > 0) {
      await tx.insert(chatMessages).values(rows)
    }
  })

  return { ok: true as const }
}
