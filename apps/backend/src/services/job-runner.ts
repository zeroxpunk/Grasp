import * as jobService from './job-service'
import * as learningService from './learning-service'
import type { JobRow } from '../lib/db-types'

const runningJobs = new Set<string>()

const JOB_POLL_INTERVAL_MS = Number(process.env.JOB_POLL_INTERVAL_MS || 2000)
const JOB_STALE_AFTER_MS = Number(process.env.JOB_STALE_AFTER_MS || 15 * 60 * 1000)

let workerStarted = false
let drainPromise: Promise<void> | null = null

function parseCourseLessonJob(job: JobRow) {
  const courseId = job.courseId
  const lessonNumber = Number(job.payload.lessonNumber)

  if (!courseId || !Number.isInteger(lessonNumber) || lessonNumber < 1) {
    throw new Error(`Invalid ${job.type} job payload`)
  }

  return { courseId, lessonNumber }
}

async function processJob(job: JobRow) {
  try {
    switch (job.type) {
      case 'course_creation': {
        const description = typeof job.payload.description === 'string' ? job.payload.description : ''
        const context = typeof job.payload.context === 'string' ? job.payload.context : undefined
        const language = typeof job.payload.language === 'string' ? job.payload.language : undefined
        const result = await learningService.createCourse(job.userId, description, context, language)
        await jobService.updateJobStatus(job.id, 'completed', {
          result: {
            slug: result.slug,
            title: result.title,
            lessonCount: result.lessonCount,
          },
          courseId: result.courseId,
        })
        return
      }

      case 'lesson_generation': {
        const { courseId, lessonNumber } = parseCourseLessonJob(job)
        const result = await learningService.generateLesson(courseId, lessonNumber)
        await jobService.updateJobStatus(job.id, 'completed', {
          result: {
            lessonNumber: result.lessonNumber,
            exerciseCount: result.exerciseCount,
          },
          courseId,
          lessonId: job.lessonId ?? undefined,
        })
        return
      }

      case 'exercise_generation':
      case 'exercise_regeneration': {
        const { courseId, lessonNumber } = parseCourseLessonJob(job)
        const result = await learningService.regenerateExercises(courseId, lessonNumber)
        await jobService.updateJobStatus(job.id, 'completed', {
          result: {
            lessonNumber: result.lessonNumber,
            exerciseCount: result.exerciseCount,
          },
          courseId,
          lessonId: job.lessonId ?? undefined,
        })
        return
      }

      default:
        throw new Error(`Unsupported job type: ${job.type}`)
    }
  } catch (err) {
    await jobService.updateJobStatus(job.id, 'failed', {
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

async function recoverStaleJobs() {
  const staleBefore = new Date(Date.now() - JOB_STALE_AFTER_MS)
  await jobService.requeueStaleRunningJobs(staleBefore)
}

async function drainJobs() {
  if (drainPromise) {
    return drainPromise
  }

  drainPromise = (async () => {
    await recoverStaleJobs()

    while (true) {
      const job = await jobService.claimNextPendingJob()
      if (!job) {
        return
      }

      if (runningJobs.has(job.id)) {
        continue
      }

      runningJobs.add(job.id)
      try {
        await processJob(job)
      } finally {
        runningJobs.delete(job.id)
      }
    }
  })().finally(() => {
    drainPromise = null
  })

  return drainPromise
}

export function queueJob(_jobId: string) {
  void drainJobs()
}

export function startJobWorker() {
  if (workerStarted) {
    return
  }

  workerStarted = true
  setInterval(() => {
    void drainJobs()
  }, JOB_POLL_INTERVAL_MS)

  void drainJobs()
}

export async function runJob(jobId: string) {
  queueJob(jobId)
  await drainJobs()
}
