import type { ClientConfig } from './types'

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body: unknown,
  ) {
    super(`API Error ${status}: ${statusText}`)
    this.name = 'ApiError'
  }
}

export class GraspHttpClient {
  private baseUrl: string
  private token?: string | (() => string | Promise<string>)

  constructor(config: ClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '')
    this.token = config.token
  }

  private async getToken(): Promise<string | undefined> {
    if (!this.token) return undefined
    if (typeof this.token === 'function') return await this.token()
    return this.token
  }

  private buildHeaders(token: string | undefined, hasBody: boolean, accept: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': accept,
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    if (hasBody) {
      headers['Content-Type'] = 'application/json'
    }

    return headers
  }

  private async fetchWithAuth(
    method: string,
    path: string,
    body: unknown,
    signal: AbortSignal | undefined,
    accept: string,
    token: string | undefined,
  ): Promise<Response> {
    return fetch(`${this.baseUrl}${path}`, {
      method,
      headers: this.buildHeaders(token, body !== undefined, accept),
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    })
  }

  private canRetryAuth(): boolean {
    return typeof this.token === 'function'
  }

  async request<T>(method: string, path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
    let token = await this.getToken()
    let res: Response
    try {
      res = await this.fetchWithAuth(method, path, body, signal, 'application/json', token)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') throw err
      throw new Error(`Network error: ${err instanceof Error ? err.message : String(err)}`)
    }

    if (res.status === 401 && this.canRetryAuth()) {
      token = await this.getToken()
      try {
        res = await this.fetchWithAuth(method, path, body, signal, 'application/json', token)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') throw err
        throw new Error(`Network error: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    if (!res.ok) {
      const errorBody = await res.text().catch(() => null)
      throw new ApiError(res.status, res.statusText, errorBody)
    }

    const text = await res.text()
    if (!text) return undefined as unknown as T

    try {
      return JSON.parse(text) as T
    } catch {
      throw new ApiError(res.status, 'Invalid JSON response', text)
    }
  }

  get<T>(path: string, signal?: AbortSignal): Promise<T> {
    return this.request<T>('GET', path, undefined, signal)
  }

  post<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
    return this.request<T>('POST', path, body, signal)
  }

  put<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
    return this.request<T>('PUT', path, body, signal)
  }

  patch<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
    return this.request<T>('PATCH', path, body, signal)
  }

  delete<T>(path: string, signal?: AbortSignal): Promise<T> {
    return this.request<T>('DELETE', path, undefined, signal)
  }

  async stream(path: string, body: unknown, signal?: AbortSignal): Promise<ReadableStream<string>> {
    let token = await this.getToken()
    let res: Response
    try {
      res = await this.fetchWithAuth('POST', path, body, signal, 'text/event-stream', token)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') throw err
      throw new Error(`Network error: ${err instanceof Error ? err.message : String(err)}`)
    }

    if (res.status === 401 && this.canRetryAuth()) {
      token = await this.getToken()
      try {
        res = await this.fetchWithAuth('POST', path, body, signal, 'text/event-stream', token)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') throw err
        throw new Error(`Network error: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    if (!res.ok) {
      const errorBody = await res.text().catch(() => null)
      throw new ApiError(res.status, res.statusText, errorBody)
    }

    if (!res.body) {
      throw new Error('No response body for SSE stream')
    }

    return res.body.pipeThrough(new TextDecoderStream())
  }
}
