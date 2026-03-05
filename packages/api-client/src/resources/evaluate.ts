import type { GraspHttpClient } from '../client.js'
import type { EvaluateRequest, EvaluationResult } from '../types.js'

export class EvaluateResource {
  constructor(private http: GraspHttpClient) {}

  evaluate(data: EvaluateRequest): Promise<{ ok: true; evaluation: EvaluationResult }> {
    return this.http.post('/api/v1/evaluate', data)
  }
}
