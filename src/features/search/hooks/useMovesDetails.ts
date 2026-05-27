import { useEffect, useMemo, useState } from 'react'
import { fetchMoveDetails, type MoveDetails } from '@/lib/moveTypes'

/** Load full move details for a fixed list of names (cached; one request per uncached slug). */
export function useMovesDetails(moveNames: string[]) {
  const namesKey = useMemo(
    () =>
      [...new Set(moveNames.map((name) => name.trim()).filter(Boolean))].sort().join('\0'),
    [moveNames],
  )

  const [detailsByName, setDetailsByName] = useState<Record<string, MoveDetails | null>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const names = namesKey ? namesKey.split('\0') : []
    if (names.length === 0) {
      setDetailsByName({})
      setLoading(false)
      return
    }

    const controller = new AbortController()
    let cancelled = false
    setLoading(true)

    void (async () => {
      try {
        const entries = await Promise.all(
          names.map(async (name) => {
            const details = await fetchMoveDetails(name, { signal: controller.signal })
            return [name, details] as const
          }),
        )
        if (cancelled) return
        setDetailsByName(Object.fromEntries(entries))
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        if (!cancelled) setDetailsByName({})
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [namesKey])

  return { detailsByName, loading }
}
