import { useEffect, useState } from 'react'
import type { Locale } from '@/i18n'
import { searchItems, type ItemSearchResult } from '@/lib/localizedNames'

const DEBOUNCE_MS = 200

export function useItemSearch(query: string, locale: Locale, enabled: boolean) {
  const [results, setResults] = useState<ItemSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [debouncing, setDebouncing] = useState(false)

  useEffect(() => {
    const normalized = query.trim()
    if (!enabled || normalized.length < 2) {
      setResults([])
      setLoading(false)
      setDebouncing(false)
      return
    }

    let cancelled = false
    setDebouncing(true)
    setResults([])

    const timer = window.setTimeout(async () => {
      if (cancelled) return
      setDebouncing(false)
      setLoading(true)
      try {
        const matches = await searchItems(normalized, locale, 10)
        if (!cancelled) setResults(matches)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [query, locale, enabled])

  return {
    results,
    loading,
    debouncing,
    isPending: debouncing || loading,
  }
}
