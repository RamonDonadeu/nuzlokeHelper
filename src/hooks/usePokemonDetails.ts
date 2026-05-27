import { useEffect, useState } from 'react'
import type { EvolutionStage, PokemonSummary } from '@/types/pokemon'
import { fetchEvolutionChain, fetchPokemon } from '@/lib/pokeapi'

export function usePokemonDetails(name: string | null) {
  const [pokemon, setPokemon] = useState<PokemonSummary | null>(null)
  const [evolutions, setEvolutions] = useState<EvolutionStage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!name) {
      setPokemon(null)
      setEvolutions([])
      setError(null)
      return
    }

    const pokemonName = name
    const controller = new AbortController()
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const summary = await fetchPokemon(pokemonName, { signal: controller.signal })
        const chain = await fetchEvolutionChain(summary.speciesUrl, { signal: controller.signal })

        if (cancelled) return
        setPokemon(summary)
        setEvolutions(chain)
      } catch (err) {
        if (cancelled) return
        if (err instanceof DOMException && err.name === 'AbortError') return
        setPokemon(null)
        setEvolutions([])
        setError(err instanceof Error ? err.message : 'Failed to load Pokémon')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [name])

  return { pokemon, evolutions, loading, error }
}
