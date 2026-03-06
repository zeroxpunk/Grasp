import { useEffect, useMemo, useState } from 'react'
import type { AiAuthState } from '../../shared/ai-auth'
import {
  ElectronAiAuthRepository,
  type AiAuthRepository,
} from './electron-ai-auth-repository'

export function useAiAuth(repository?: AiAuthRepository) {
  const repo = useMemo(() => repository ?? new ElectronAiAuthRepository(), [repository])
  const [state, setState] = useState<AiAuthState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    setIsLoading(true)
    try {
      const nextState = await repo.getState()
      setState(nextState)
      setError(null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [repo])

  return {
    state,
    isLoading,
    error,
    refresh,
    repository: repo,
  }
}
