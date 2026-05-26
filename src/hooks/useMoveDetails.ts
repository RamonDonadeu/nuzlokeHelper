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

    let cancelled = false
    setLoading(true)
    setError(null)

    void (async () => {
      try {
        const details = await fetchMoveDetails(moveName)
        if (!cancelled) {
          setMove(details)
          if (!details) setError('Move not found.')
        }
      } catch {
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
    }
  }, [moveName])

  return { move, loading, error }
}
