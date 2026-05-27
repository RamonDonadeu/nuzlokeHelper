import { useEffect, useState } from 'react'
import type { NamedPokemonListItem } from '@/types/pokemon'
import { searchPokemon } from '@/lib/pokeapi'

const DEBOUNCE_MS = 200

export function usePokemonSearch(query: string) {
  const [results, setResults] = useState<NamedPokemonListItem[]>([])
  const [bestMatch, setBestMatch] = useState<NamedPokemonListItem | null>(null)
  const [loading, setLoading] = useState(false)
  const [debouncing, setDebouncing] = useState(false)
  const [searchedQuery, setSearchedQuery] = useState('')

  useEffect(() => {
    const normalized = query.trim()
    if (normalized.length < 2) {
      setResults([])
      setBestMatch(null)
      setLoading(false)
      setDebouncing(false)
      setSearchedQuery('')
      return
    }

    let cancelled = false
    setDebouncing(true)
    setResults([])
    setBestMatch(null)
    setSearchedQuery('')

    const timer = window.setTimeout(async () => {
      if (cancelled) return

      setDebouncing(false)
      setLoading(true)

      try {
        const matches = await searchPokemon(normalized)
        if (cancelled) return

        setResults(matches)
        setBestMatch(matches[0] ?? null)
        setSearchedQuery(normalized)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [query])

  return {
    results,
    bestMatch,
    loading,
    debouncing,
    isPending: debouncing || loading,
    searchedQuery,
  }
}
