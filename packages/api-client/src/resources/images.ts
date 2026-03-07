import type { GraspHttpClient } from '../client'
import type { GenerateImageRequest, GenerateImageResponse } from '../types'

export class ImagesResource {
  constructor(private http: GraspHttpClient) {}

  getUrl(courseSlug: string, hash: string): string {
    return `/api/v1/courses/${encodeURIComponent(courseSlug)}/images/${hash}.png`
  }

  generate(data: GenerateImageRequest): Promise<GenerateImageResponse> {
    return this.http.post('/api/v1/images/generate', data)
  }
}
