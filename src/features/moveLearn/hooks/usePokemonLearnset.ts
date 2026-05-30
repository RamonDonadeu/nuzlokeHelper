import { useEffect, useMemo, useState } from 'react'
import { resolveSpeciesSlug } from '@/lib/localizedNames'
import { fetchPokemonLearnset, type PokemonMoveLearnEntry } from '@/lib/learnset'
import type { PokemonSlot } from '@/types/profile'

function learnsetIdentifierForSlot(slot: PokemonSlot): string | number {
  const slug = resolveSpeciesSlug(slot.name)
  if (slug) return slug
  return slot.currentSpeciesId ?? slot.speciesId
}

export function usePokemonLearnset(slot: PokemonSlot | null) {
  const identifier = useMemo(
    () => (slot ? learnsetIdentifierForSlot(slot) : null),
    [slot?.name, slot?.currentSpeciesId, slot?.speciesId],
  )

  const [learnset, setLearnset] = useState<PokemonMoveLearnEntry[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (identifier == null) {
      setLearnset(null)
      setLoading(false)
      setError(null)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setError(null)

    void fetchPokemonLearnset(identifier, { signal: controller.signal })
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
  }, [identifier])

  return { learnset, loading, error }
}
