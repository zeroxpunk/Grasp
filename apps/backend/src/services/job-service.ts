import { jobQueries } from '@grasp/db'

export type JobType = 'course_creation' | 'lesson_generation' | 'exercise_generation' | 'exercise_regeneration'

export interface CreateJobInput {
  userId: string
  type: JobType
  payload: Record<string, unknown>
  courseId?: string
  lessonId?: string
}

export async function createJob(input: CreateJobInput) {
  return jobQueries.insert({
    userId: input.userId,
    type: input.type,
    payload: input.payload,
    courseId: input.courseId,
    lessonId: input.lessonId,
  })
}

export async function getJob(jobId: string) {
  return jobQueries.findById(jobId)
}

export async function listUserJobs(userId: string, limit = 20) {
  return jobQueries.listByUser(userId, limit)
}

export async function claimNextPendingJob() {
  return jobQueries.claimNextPending()
}

export async function requeueStaleRunningJobs(staleBefore: Date) {
  await jobQueries.requeueStaleRunning(staleBefore)
}

export async function updateJobStatus(
  jobId: string,
  status: 'running' | 'completed' | 'failed',
  data?: { result?: Record<string, unknown>; error?: string; courseId?: string; lessonId?: string },
) {
  const updates: {
    status: string
    startedAt?: Date
    completedAt?: Date
    result?: Record<string, unknown>
    error?: string
    courseId?: string
    lessonId?: string
  } = { status }

  if (status === 'running') updates.startedAt = new Date()
  if (status === 'completed' || status === 'failed') updates.completedAt = new Date()
  if (data?.result !== undefined) updates.result = data.result
  if (data?.error !== undefined) updates.error = data.error
  if (data?.courseId !== undefined) updates.courseId = data.courseId
  if (data?.lessonId !== undefined) updates.lessonId = data.lessonId

  await jobQueries.update(jobId, updates)
}

export async function updateJobResult(jobId: string, result: Record<string, unknown>) {
  await jobQueries.update(jobId, { result })
}
