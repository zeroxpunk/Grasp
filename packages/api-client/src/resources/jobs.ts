import type { GraspHttpClient } from '../client'
import type { Job, PollOptions } from '../types'

export class JobsResource {
  constructor(private http: GraspHttpClient) {}

  get(jobId: string): Promise<Job> {
    return this.http.get(`/api/v1/jobs/${jobId}`)
  }

  list(): Promise<Job[]> {
    return this.http.get('/api/v1/jobs')
  }

  async poll(jobId: string, opts?: PollOptions): Promise<Job> {
    const interval = opts?.interval ?? 2000
    const timeout = opts?.timeout ?? 900_000
    const signal = opts?.signal
    const start = Date.now()

    while (true) {
      signal?.throwIfAborted()

      const job = await this.get(jobId)

      if (job.status === 'completed') {
        return job
      }

      if (job.status === 'failed') {
        throw new Error(job.error ?? `Job ${jobId} failed`)
      }

      if (Date.now() - start > timeout) {
        throw new Error(`Job ${jobId} timed out after ${timeout}ms`)
      }

      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, interval)
        signal?.addEventListener('abort', () => {
          clearTimeout(timer)
          reject(signal.reason)
        }, { once: true })
      })
    }
  }
}
