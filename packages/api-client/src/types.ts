export interface AuthUser {
  id: string
  email: string
  displayName: string | null
  avatarUrl: string | null
}

export interface UserProfile extends AuthUser {
  globalMemory: string
}

export interface UpdateUserRequest {
  displayName?: string
  globalMemory?: string
}

export interface CourseSummary {
  slug: string
  title: string
  description: string
  createdAt: string
  totalLessons: number
  completedLessons: number
  progress: number
}

export interface CourseManifest {
  slug: string
  title: string
  description: string
  createdAt: string
  generationStatus: string
  lessons: LessonEntry[]
  mastery: Record<string, number>
}

export interface LessonEntry {
  number: number
  slug: string
  title: string
  concepts: string[]
  status: string
}

export interface CreateCourseRequest {
  description: string
  context?: string
}

export interface LessonDetail {
  number: number
  slug: string
  title: string
  concepts: string[]
  status: string
  content: string | null
  exercises: ExerciseItem[]
  exerciseProgress: Record<number, ExerciseProgressEntry>
  previousLesson: AdjacentLesson | null
  nextLesson: AdjacentLesson | null
}

export interface AdjacentLesson {
  number: number
  slug: string
  title: string
  status: string
}

export interface ExerciseItem {
  id: number
  type: string
  title: string
  prompt: string
  data: Record<string, unknown>
}

export interface ExerciseProgressEntry {
  status: 'attempted' | 'completed'
  attemptedAt: string
}

export interface UpdateExerciseProgressRequest {
  status: 'attempted' | 'completed'
}

export interface ChatMessage {
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

export interface SaveChatRequest {
  messages: ChatInputMessage[]
}

export interface StreamChatRequest {
  courseSlug: string
  lessonNumber: number
  messages?: ChatInputMessage[]
  message?: string
  exerciseId?: number
}

export interface EvaluateRequest {
  courseSlug: string
  lessonNumber: number
  conversationSummary: string
}

export interface EvaluationResult {
  lessonComplete: boolean
  recommendation: 'advance' | 'repeat' | 'review'
  masteryUpdates: { concept: string; level: number }[]
  insights: { kind: string; observation: string }[]
  planChanges?: {
    action: 'add' | 'remove' | 'skip'
    lessonTitle?: string
    concepts?: string[]
    reason: string
    afterLesson?: number
  }[]
  exercisesAttempted?: { exerciseId: number; completed: boolean }[]
}

export type JobType = 'course_creation' | 'lesson_generation' | 'exercise_generation' | 'exercise_regeneration'
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface Job {
  id: string
  type: JobType
  status: JobStatus
  payload: Record<string, unknown>
  result: Record<string, unknown> | null
  error: string | null
  courseId: string | null
  lessonId: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
}

export interface SessionStats {
  totalHours: number
  currentStreakDays: number
  longestStreakDays: number
  lastSessionDate: string | null
  activeSession: boolean
  totalSessions: number
}

export interface SessionEntry {
  id: string
  courseSlug: string | null
  startedAt: string
  endedAt: string | null
}

export interface GenerateImageRequest {
  description: string
  courseSlug?: string
}

export interface GenerateImageResponse {
  dataUrl: string
  alt: string
}

export interface InsightEntry {
  id: string
  kind: 'strength' | 'gap' | 'preference' | 'pattern'
  observation: string
  createdAt: string
}

export interface OkResponse {
  ok: true
}

export interface JobCreatedResponse {
  jobId: string
}

export interface PollOptions {
  interval?: number
  timeout?: number
  signal?: AbortSignal
}

export interface ImportCourseRequest {
  title: string
  description: string
  context: string
  memory: string
  lessons: Array<{
    number: number
    title: string
    slug: string
    concepts: string[]
  }>
}

export interface ImportCourseResponse {
  courseSlug: string
}

export interface AuthSessionResponse {
  token: string
  refreshToken: string
  expiresAt: string
  refreshExpiresAt: string
  user: AuthUser
}

export interface TokenRequestOptions {
  forceRefresh?: boolean
}

export type TokenProvider = (options?: TokenRequestOptions) => string | Promise<string>

export interface ClientConfig {
  baseUrl: string
  token?: string | TokenProvider
}
