import { useEffect, useState } from 'react'
import { fetchMoveDetails, type MoveDetails } from '@/lib/moveTypes'

export function useMoveDetails(moveName: string | null) {
  const [move, setMove] = useState<MoveDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!moveName) {
      setMove(null)
      setLoading(false)
      setError(null)
      return
    }

    const controller = new AbortController()
    let cancelled = false
    setLoading(true)
    setError(null)

    void (async () => {
      try {
        const details = await fetchMoveDetails(moveName, { signal: controller.signal })
        if (!cancelled) {
          setMove(details)
          if (!details) setError('Move not found.')
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        if (!cancelled) {
          setMove(null)
          setError('Failed to load move data.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [moveName])

  return { move, loading, error }
}
