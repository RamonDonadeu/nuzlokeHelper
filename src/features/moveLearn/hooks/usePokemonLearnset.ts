import { useEffect, useState } from 'react'
import { fetchPokemonLearnset, type PokemonMoveLearnEntry } from '@/lib/learnset'

export function usePokemonLearnset(pokemonName: string | null) {
  const [learnset, setLearnset] = useState<PokemonMoveLearnEntry[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!pokemonName) {
      setLearnset(null)
      setLoading(false)
      setError(null)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setError(null)

    void fetchPokemonLearnset(pokemonName, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) {
          setLearnset(data)
          setLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setLearnset(null)
        setLoading(false)
        setError(err instanceof Error ? err.message : 'Failed to load learnset')
      })

    return () => controller.abort()
  }, [pokemonName])

  return { learnset, loading, error }
}
