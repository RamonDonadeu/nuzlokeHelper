import { useEffect, useMemo, useRef, useState } from 'react'
import type { PokemonSlot } from '@/types/profile'
import { canEvolveAtLevel, fetchEvolutionOptions, type EvolutionOption } from '@/lib/evolution'
import { fetchPokemon } from '@/lib/pokeapi'

export function useEvolutionBadges(slots: PokemonSlot[]): Set<string> {
  const [evolvableSlotIds, setEvolvableSlotIds] = useState<Set<string>>(() => new Set())
  const evoOptionsByName = useRef(new Map<string, EvolutionOption[]>())

  const speciesNames = useMemo(() => [...new Set(slots.map((slot) => slot.name))], [slots])

  useEffect(() => {
    if (slots.length === 0) {
      setEvolvableSlotIds(new Set())
      return
    }

    let cancelled = false

    async function load() {
      const missing = speciesNames.filter((name) => !evoOptionsByName.current.has(name))
      await Promise.all(
        missing.map(async (name) => {
          try {
            const pokemon = await fetchPokemon(name)
            const options = await fetchEvolutionOptions(pokemon.speciesUrl)
            evoOptionsByName.current.set(name, options)
          } catch {
            evoOptionsByName.current.set(name, [])
          }
        }),
      )

      const eligible = new Set<string>()
      for (const slot of slots) {
        const options = evoOptionsByName.current.get(slot.name) ?? []
        if (canEvolveAtLevel(options, slot.name, slot.level)) {
          eligible.add(slot.slotId)
        }
      }

      if (!cancelled) setEvolvableSlotIds(eligible)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [slots, speciesNames])

  return evolvableSlotIds
}

/** @deprecated Use useEvolutionBadges */
export const useBoxEvolutionBadges = useEvolutionBadges
