import type { GraspHttpClient } from '../client'
import type { ChatMessage, SaveChatRequest, StreamChatRequest, OkResponse } from '../types'

export class ChatResource {
  constructor(private http: GraspHttpClient) {}

  getHistory(courseSlug: string, lessonNumber: number): Promise<ChatMessage[]> {
    return this.http.get(
      `/api/v1/courses/${encodeURIComponent(courseSlug)}/lessons/${lessonNumber}/chat`,
    )
  }

  saveHistory(courseSlug: string, lessonNumber: number, data: SaveChatRequest): Promise<OkResponse> {
    return this.http.post(
      `/api/v1/courses/${encodeURIComponent(courseSlug)}/lessons/${lessonNumber}/chat`,
      data,
    )
  }

  stream(data: StreamChatRequest, signal?: AbortSignal): Promise<ReadableStream<string>> {
    return this.http.stream(
      `/api/v1/courses/${encodeURIComponent(data.courseSlug)}/lessons/${data.lessonNumber}/chat/stream`,
      data,
      signal,
    )
  }
}
