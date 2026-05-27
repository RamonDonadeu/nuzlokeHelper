import { useEffect, useState } from 'react'
import { fetchItemDetails, type ItemDetails } from '@/lib/itemDetails'

export function useItemDetails(itemName: string | null) {
  const [item, setItem] = useState<ItemDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!itemName) {
      setItem(null)
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
        const details = await fetchItemDetails(itemName, { signal: controller.signal })
        if (!cancelled) {
          setItem(details)
          if (!details) setError('Item not found.')
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        if (!cancelled) {
          setItem(null)
          setError('Failed to load item data.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [itemName])

  return { item, loading, error }
}
