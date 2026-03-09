import * as jobService from './job-service'
import * as learningService from './learning-service'
import type { JobRow } from '../lib/db-types'

const runningJobs = new Set<string>()

function parseCourseLessonJob(job: JobRow) {
  const courseId = job.courseId
  const lessonNumber = Number(job.payload.lessonNumber)

  if (!courseId || !Number.isInteger(lessonNumber) || lessonNumber < 1) {
    throw new Error(`Invalid ${job.type} job payload`)
  }

  return { courseId, lessonNumber }
}

export function queueJob(jobId: string) {
  if (runningJobs.has(jobId)) return

  runningJobs.add(jobId)
  queueMicrotask(async () => {
    try {
      await runJob(jobId)
    } finally {
      runningJobs.delete(jobId)
    }
  })
}

export async function runJob(jobId: string) {
  const job = await jobService.getJob(jobId)
  if (!job) {
    return
  }

  if (job.status !== 'pending') {
    return
  }

  await jobService.updateJobStatus(jobId, 'running')

  try {
    switch (job.type) {
      case 'course_creation': {
        const description = typeof job.payload.description === 'string' ? job.payload.description : ''
        const context = typeof job.payload.context === 'string' ? job.payload.context : undefined
        const language = typeof job.payload.language === 'string' ? job.payload.language : undefined
        const result = await learningService.createCourse(job.userId, description, context, language)
        await jobService.updateJobStatus(jobId, 'completed', {
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
        await jobService.updateJobStatus(jobId, 'completed', {
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
        await jobService.updateJobStatus(jobId, 'completed', {
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
    await jobService.updateJobStatus(jobId, 'failed', {
      error: err instanceof Error ? err.message : String(err),
    })
  }
}
