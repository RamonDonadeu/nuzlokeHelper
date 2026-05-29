import type { PokemonType } from '@/types/pokemon'
import { normalizePokemonTypes } from '@/lib/pokemonTypes'

export type Effectiveness = 0 | 0.5 | 1 | 2

const TYPE_CHART: Record<PokemonType, Partial<Record<PokemonType, Effectiveness>>> = {
  normal: { rock: 0.5, ghost: 0, steel: 0.5 },
  fire: {
    fire: 0.5,
    water: 0.5,
    grass: 2,
    ice: 2,
    bug: 2,
    rock: 0.5,
    dragon: 0.5,
    steel: 2,
  },
  water: {
    fire: 2,
    water: 0.5,
    grass: 0.5,
    ground: 2,
    rock: 2,
    dragon: 0.5,
  },
  electric: {
    water: 2,
    electric: 0.5,
    grass: 0.5,
    ground: 0,
    flying: 2,
    dragon: 0.5,
  },
  grass: {
    fire: 0.5,
    water: 2,
    grass: 0.5,
    poison: 0.5,
    ground: 2,
    flying: 0.5,
    bug: 0.5,
    rock: 2,
    dragon: 0.5,
    steel: 0.5,
  },
  ice: {
    fire: 0.5,
    water: 0.5,
    grass: 2,
    ice: 0.5,
    ground: 2,
    flying: 2,
    dragon: 2,
    steel: 0.5,
  },
  fighting: {
    normal: 2,
    ice: 2,
    poison: 0.5,
    flying: 0.5,
    psychic: 0.5,
    bug: 0.5,
    rock: 2,
    ghost: 0,
    dark: 2,
    steel: 2,
    fairy: 0.5,
  },
  poison: {
    grass: 2,
    poison: 0.5,
    ground: 0.5,
    rock: 0.5,
    ghost: 0.5,
    steel: 0,
    fairy: 2,
  },
  ground: {
    fire: 2,
    electric: 2,
    grass: 0.5,
    poison: 2,
    flying: 0,
    bug: 0.5,
    rock: 2,
    steel: 2,
  },
  flying: {
    electric: 0.5,
    grass: 2,
    fighting: 2,
    bug: 2,
    rock: 0.5,
    steel: 0.5,
  },
  psychic: {
    fighting: 2,
    poison: 2,
    psychic: 0.5,
    dark: 0,
    steel: 0.5,
  },
  bug: {
    fire: 0.5,
    grass: 2,
    fighting: 0.5,
    poison: 0.5,
    flying: 0.5,
    psychic: 2,
    ghost: 0.5,
    dark: 2,
    steel: 0.5,
    fairy: 0.5,
  },
  rock: {
    fire: 2,
    ice: 2,
    fighting: 0.5,
    ground: 0.5,
    flying: 2,
    bug: 2,
    steel: 0.5,
  },
  ghost: {
    normal: 0,
    psychic: 2,
    ghost: 2,
    dark: 0.5,
  },
  dragon: {
    dragon: 2,
    steel: 0.5,
    fairy: 0,
  },
  dark: {
    fighting: 0.5,
    psychic: 2,
    ghost: 2,
    dark: 0.5,
    fairy: 0.5,
  },
  steel: {
    fire: 0.5,
    water: 0.5,
    electric: 0.5,
    ice: 2,
    rock: 2,
    steel: 0.5,
    fairy: 2,
  },
  fairy: {
    fire: 0.5,
    fighting: 2,
    poison: 0.5,
    dragon: 2,
    dark: 2,
    steel: 0.5,
  },
}

export const ALL_TYPES: PokemonType[] = [
  'normal',
  'fire',
  'water',
  'electric',
  'grass',
  'ice',
  'fighting',
  'poison',
  'ground',
  'flying',
  'psychic',
  'bug',
  'rock',
  'ghost',
  'dragon',
  'dark',
  'steel',
  'fairy',
]

export function getDefensiveMultiplier(
  defenderTypes: readonly unknown[],
  attackType: PokemonType,
): number | null {
  const types = normalizePokemonTypes(defenderTypes)
  if (types.length === 0) return null

  return types.reduce((multiplier, defenderType) => {
    const effectiveness = TYPE_CHART[attackType]?.[defenderType] ?? 1
    return multiplier * effectiveness
  }, 1)
}

/** Whether an attacking type deals 2× or more to these defender types. */
export function isDefensivelyWeak(
  defenderTypes: readonly unknown[],
  attackType: PokemonType,
): boolean {
  const multiplier = getDefensiveMultiplier(defenderTypes, attackType)
  return multiplier !== null && multiplier >= 2
}

/** Attack types that deal super-effective (2×+) damage to this Pokémon's types. */
export function getDefensiveWeaknesses(defenderTypes: readonly unknown[]): PokemonType[] {
  return ALL_TYPES.filter((attackType) => isDefensivelyWeak(defenderTypes, attackType))
}

export interface DefensiveWeaknessGroups {
  quadruple: PokemonType[]
  double: PokemonType[]
}

/** Super-effective attacking types split into 4× and 2× vs these defender types. */
export function getDefensiveWeaknessGroups(defenderTypes: readonly unknown[]): DefensiveWeaknessGroups {
  const quadruple: PokemonType[] = []
  const double: PokemonType[] = []

  for (const attackType of ALL_TYPES) {
    const multiplier = getDefensiveMultiplier(defenderTypes, attackType)
    if (multiplier === null || multiplier < 2) continue
    if (multiplier >= 4) quadruple.push(attackType)
    else double.push(attackType)
  }

  return { quadruple, double }
}

export interface DefensiveCoverage {
  /** Per attacking type: damage multiplier each member takes (null = types unknown). */
  memberMatrix: Array<{
    attackType: PokemonType
    memberMultipliers: Array<number | null>
  }>
  perMemberWeaknesses: Array<Array<{ attackType: PokemonType; multiplier: number }>>
}

/** Attacking-type matrix: multipliers use full dual-type product (4×, 2×, 1×, ½×, ¼×, 0×). */
export function getDefensiveCoverage(
  membersDefenderTypes: readonly unknown[][],
): DefensiveCoverage {
  const memberMatrix: DefensiveCoverage['memberMatrix'] = []
  const perMemberWeaknesses: DefensiveCoverage['perMemberWeaknesses'] = membersDefenderTypes.map(
    () => [],
  )

  for (const attackType of ALL_TYPES) {
    const memberMultipliers: Array<number | null> = []

    membersDefenderTypes.forEach((defenderTypes, index) => {
      const multiplier = getDefensiveMultiplier(defenderTypes, attackType)
      memberMultipliers.push(multiplier)
      if (multiplier !== null && multiplier >= 2) {
        perMemberWeaknesses[index].push({ attackType, multiplier })
      }
    })

    memberMatrix.push({ attackType, memberMultipliers })
  }

  return {
    memberMatrix,
    perMemberWeaknesses,
  }
}

/** Per-member attacking types that deal 4× (double weakness). */
export function getPerMemberDoubleWeaknesses(
  perMemberWeaknesses: DefensiveCoverage['perMemberWeaknesses'],
): Array<Array<{ attackType: PokemonType; multiplier: number }>> {
  return perMemberWeaknesses.map((weaknesses) =>
    weaknesses.filter((entry) => entry.multiplier >= 4),
  )
}

/** Per-member attacking types that deal 0× (immune). */
export function getPerMemberImmunities(
  memberMatrix: DefensiveCoverage['memberMatrix'],
): Array<Array<{ attackType: PokemonType }>> {
  const memberCount = memberMatrix[0]?.memberMultipliers.length ?? 0
  const result: Array<Array<{ attackType: PokemonType }>> = Array.from(
    { length: memberCount },
    () => [],
  )

  for (const row of memberMatrix) {
    row.memberMultipliers.forEach((multiplier, index) => {
      if (multiplier === 0) {
        result[index].push({ attackType: row.attackType })
      }
    })
  }

  return result
}

/**
 * Mono defender types that no configured move type on the team hits for 2×+.
 * If no moves are set, every type is uncovered.
 */
export function getUncoveredDefenderTypes(teamMoveTypes: readonly PokemonType[]): PokemonType[] {
  if (teamMoveTypes.length === 0) return [...ALL_TYPES]

  const moveTypes = [...new Set(teamMoveTypes)]

  return ALL_TYPES.filter((defenderType) => {
    return !moveTypes.some((moveType) => {
      const multiplier = getDefensiveMultiplier([defenderType], moveType)
      return multiplier !== null && multiplier >= 2
    })
  })
}

export function formatMultiplier(value: number): string {
  if (value === 0) return '0×'
  if (value === 0.25) return '¼×'
  if (value === 0.5) return '½×'
  if (value === 1) return '1×'
  if (value === 2) return '2×'
  if (value === 4) return '4×'
  return `${value}×`
}

/** CSS / legend tier for dual-type product multipliers. */
export type MultiplierTier = 'x4' | 'x2' | 'x1' | 'x05' | 'x025' | 'x0'

export function multiplierTier(value: number): MultiplierTier {
  if (value === 0) return 'x0'
  if (value === 0.25) return 'x025'
  if (value === 0.5) return 'x05'
  if (value === 1) return 'x1'
  if (value === 2) return 'x2'
  if (value >= 4) return 'x4'
  if (value < 0.375) return 'x025'
  if (value < 0.75) return 'x05'
  if (value < 1.5) return 'x1'
  if (value < 3) return 'x2'
  return 'x4'
}

export function multiplierSeverity(
  value: number,
): 'immune' | 'quadResist' | 'resist' | 'neutral' | 'weak' | 'double' {
  const tier = multiplierTier(value)
  if (tier === 'x0') return 'immune'
  if (tier === 'x025') return 'quadResist'
  if (tier === 'x05') return 'resist'
  if (tier === 'x4') return 'double'
  if (tier === 'x2') return 'weak'
  return 'neutral'
}

export function defenseTierClass(value: number | null): string {
  if (value === null) return 'coverage-cell coverage-defense-unknown'
  return `coverage-cell coverage-defense-${multiplierTier(value)}`
}

export function defenseThreatMultClass(value: number): string {
  return `coverage-threat-mult coverage-defense-${multiplierTier(value)}`
}
