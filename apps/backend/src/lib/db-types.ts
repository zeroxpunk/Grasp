import type { InferSelectModel } from 'drizzle-orm'
import { authSessions, courses, jobs, lessons, mastery, users } from '@grasp/db'

export type AuthSessionRow = InferSelectModel<typeof authSessions>
export type CourseRow = InferSelectModel<typeof courses>
export type JobRow = InferSelectModel<typeof jobs>
export type LessonRow = InferSelectModel<typeof lessons>
export type MasteryRow = InferSelectModel<typeof mastery>
export type UserRow = InferSelectModel<typeof users>
