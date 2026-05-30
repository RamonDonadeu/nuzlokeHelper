import { useMemo } from 'react'
import { canonicalMoveName } from '@/lib/localizedNames'
import {
  canLearnViaTm,
  getRelearnMovesAtLevel,
  resolveEffectiveLearnVersionGroup,
  type PokemonMoveLearnEntry,
} from '@/lib/learnset'
import type { PokemonSlot } from '@/types/profile'

export type MoveLearnSource = 'tm' | 'relearn'

export interface MoveLearnOption {
  moveName: string
  source: MoveLearnSource
  alreadyKnown: boolean
  /** Level-up learn level (relearn only) */
  learnedAtLevel?: number
}

export interface MoveLearnAnalysis {
  tmLearnable: MoveLearnOption[]
  relearnLearnable: MoveLearnOption[]
  tmUnavailable: string[]
  /** PokeAPI version group used after fallback (if any). */
  learnDataVersionGroup: string | null
  learnDataUsedFallback: boolean
}

function uniqueMoves(names: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const raw of names) {
    const canonical = canonicalMoveName(raw)
    if (!canonical.trim()) continue
    const key = canonical.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(canonical)
  }
  return result
}

export function analyzeMoveLearn(
  slot: PokemonSlot | null,
  learnset: PokemonMoveLearnEntry[] | null,
  tms: string[],
  versionGroup: string,
): MoveLearnAnalysis {
  const empty: MoveLearnAnalysis = {
    tmLearnable: [],
    relearnLearnable: [],
    tmUnavailable: [],
    learnDataVersionGroup: null,
    learnDataUsedFallback: false,
  }

  if (!slot || !learnset) return empty

  const { apiGroup, usedFallback } = resolveEffectiveLearnVersionGroup(learnset, versionGroup)
  const known = new Set((slot.moves ?? []).map((move) => canonicalMoveName(move).toLowerCase()))
  const tmNames = uniqueMoves(tms)

  const tmLearnable: MoveLearnOption[] = []
  const tmUnavailable: string[] = []
  for (const moveName of tmNames) {
    if (canLearnViaTm(learnset, moveName, versionGroup, apiGroup)) {
      tmLearnable.push({
        moveName,
        source: 'tm',
        alreadyKnown: known.has(moveName.toLowerCase()),
      })
    } else {
      tmUnavailable.push(moveName)
    }
  }

  const relearnLearnable = getRelearnMovesAtLevel(learnset, slot.level, versionGroup, apiGroup).map(
    (entry) => {
      const moveName = canonicalMoveName(entry.moveName)
      return {
        moveName,
        source: 'relearn' as const,
        alreadyKnown: known.has(moveName.toLowerCase()),
        learnedAtLevel: entry.learnedAtLevel,
      }
    },
  )

  return {
    tmLearnable,
    relearnLearnable,
    tmUnavailable,
    learnDataVersionGroup: apiGroup,
    learnDataUsedFallback: usedFallback,
  }
}

export function useMoveLearnOptions(
  slot: PokemonSlot | null,
  learnset: PokemonMoveLearnEntry[] | null,
  tms: string[],
  versionGroup: string,
): MoveLearnAnalysis {
  return useMemo(
    () => analyzeMoveLearn(slot, learnset, tms, versionGroup),
    [slot, learnset, tms, versionGroup],
  )
}
