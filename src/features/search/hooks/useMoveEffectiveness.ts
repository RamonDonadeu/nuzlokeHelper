import { useEffect, useState } from 'react'
import { getDefensiveMultiplier } from '@/lib/typeChart'
import { resolveTeamSpeciesTypes } from '@/lib/pokeapi'
import type { PokemonType } from '@/types/pokemon'
import type { PokemonSlot } from '@/types/profile'

export interface TeamMoveEffectiveness {
  slotId: string
  displayName: string
  multiplier: number | null
}

export function useMoveEffectiveness(team: PokemonSlot[], moveType: PokemonType | null) {
  const [rows, setRows] = useState<TeamMoveEffectiveness[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!moveType || team.length === 0) {
      setRows([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    void (async () => {
      const typeMap = await resolveTeamSpeciesTypes(
        team.map((member) => ({
          slotId: member.slotId,
          name: member.name,
          types: member.types,
        })),
      )
      if (cancelled) return

      setRows(
        team.map((member) => {
          const types = typeMap.get(member.slotId) ?? []
          const multiplier = getDefensiveMultiplier(types, moveType)
          return {
            slotId: member.slotId,
            displayName: member.nickname ?? member.displayName,
            multiplier,
          }
        }),
      )
      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [team, moveType])

  return { rows, loading }
}
