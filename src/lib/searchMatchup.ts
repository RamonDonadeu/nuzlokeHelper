import { getDefensiveMultiplier, formatMultiplier } from '@/lib/typeChart'
import { normalizePokemonTypes } from '@/lib/pokemonTypes'
import type { PokemonSummary, PokemonType } from '@/types/pokemon'
import type { PokemonSlot } from '@/types/profile'

export interface EffectiveMoveEntry {
  moveName: string
  moveType: PokemonType
  multiplier: number
}

export interface MemberOffensiveCoverage {
  slotId: string
  displayName: string
  effectiveMoves: EffectiveMoveEntry[]
}

export interface MemberThreat {
  slotId: string
  displayName: string
  multiplier: number
  attackTypes: PokemonType[]
}

export function analyzeThreats(
  team: PokemonSlot[],
  attackerTypes: readonly unknown[],
): MemberThreat[] {
  const attackTypes = normalizePokemonTypes(attackerTypes)
  if (attackTypes.length === 0 || team.length === 0) return []

  return team
    .map((member) => {
      const defenderTypes = normalizePokemonTypes(member.types)
      const contributingTypes: PokemonType[] = []

      for (const attackType of attackTypes) {
        const mult = getDefensiveMultiplier(defenderTypes, attackType)
        if (mult !== null && mult >= 2) contributingTypes.push(attackType)
      }

      if (contributingTypes.length === 0) return null

      const multiplier = Math.max(
        ...contributingTypes.map((type) => getDefensiveMultiplier(defenderTypes, type) ?? 1),
      )

      return {
        slotId: member.slotId,
        displayName: member.nickname ?? member.displayName,
        multiplier,
        attackTypes: [...new Set(contributingTypes)],
      }
    })
    .filter((entry): entry is MemberThreat => entry !== null)
    .sort((a, b) => b.multiplier - a.multiplier)
}

export function analyzeEffectiveMoves(
  team: PokemonSlot[],
  defenderTypes: readonly unknown[],
  moveTypes: Map<string, PokemonType | null>,
  options?: { damagingMoves?: Set<string> },
): MemberOffensiveCoverage[] {
  const defended = normalizePokemonTypes(defenderTypes)
  if (defended.length === 0 || team.length === 0) return []

  return team
    .map((member) => {
      const effectiveMoves: EffectiveMoveEntry[] = []

      for (const moveName of (member.moves ?? []).filter(Boolean)) {
        if (options?.damagingMoves && !options.damagingMoves.has(moveName)) continue
        const moveType = moveTypes.get(moveName)
        if (!moveType) continue
        const multiplier = getDefensiveMultiplier(defended, moveType)
        if (multiplier === null || multiplier < 2) continue
        effectiveMoves.push({ moveName, moveType, multiplier })
      }

      effectiveMoves.sort((a, b) => b.multiplier - a.multiplier)

      return {
        slotId: member.slotId,
        displayName: member.nickname ?? member.displayName,
        effectiveMoves,
      }
    })
    .filter((member) => member.effectiveMoves.length > 0)
}

export function teamHasAnyMoves(team: PokemonSlot[]): boolean {
  return team.some((member) => (member.moves ?? []).some((move) => move.trim().length > 0))
}

export function formatThreatTypes(types: PokemonType[]): string {
  return types.join(' / ')
}

export { formatMultiplier }

export function candidateDisplayName(candidate: PokemonSummary): string {
  return candidate.displayName
}
