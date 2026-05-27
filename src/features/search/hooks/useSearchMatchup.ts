import { useEffect, useMemo, useState } from 'react'
import type { PokemonSummary } from '@/types/pokemon'
import type { PokemonSlot } from '@/types/profile'
import { getCachedMoveDetails, isDamagingMove, resolveMoveTypes } from '@/lib/moveTypes'
import {
  analyzeEffectiveMoves,
  analyzeThreats,
  type MemberOffensiveCoverage,
  type MemberThreat,
} from '@/lib/searchMatchup'

export function useSearchMatchup(team: PokemonSlot[], candidate: PokemonSummary | null) {
  const [loading, setLoading] = useState(false)
  const [offenses, setOffenses] = useState<MemberOffensiveCoverage[]>([])
  const [threats, setThreats] = useState<MemberThreat[]>([])

  const moveNamesKey = useMemo(
    () =>
      team
        .flatMap((member) => member.moves ?? [])
        .map((move) => move.trim())
        .filter(Boolean)
        .sort()
        .join('\0'),
    [team],
  )

  const candidateKey = candidate ? `${candidate.id}:${candidate.name}` : ''

  useEffect(() => {
    if (!candidate || team.length === 0) {
      setOffenses([])
      setThreats([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    const moveNames = moveNamesKey ? moveNamesKey.split('\0') : []

    void (async () => {
      const moveTypes = moveNames.length > 0 ? await resolveMoveTypes(moveNames) : new Map()
      if (cancelled) return

      const damagingMoves = new Set(
        moveNames.filter((name) => isDamagingMove(getCachedMoveDetails(name))),
      )

      setThreats(analyzeThreats(team, candidate.types))
      setOffenses(
        analyzeEffectiveMoves(team, candidate.types, moveTypes, { damagingMoves }),
      )
      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [team, candidate, candidateKey, moveNamesKey])

  const threatenedSlotIds = useMemo(
    () => new Set(threats.map((threat) => threat.slotId)),
    [threats],
  )

  return { loading, offenses, threats, threatenedSlotIds }
}
