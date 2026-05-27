import { fetchMoveDetails, getCachedMoveDetails, isDamagingMove, resolveMoveTypes } from '@/lib/moveTypes'
import { getDefensiveMultiplier } from '@/lib/typeChart'
import type { PokemonType } from '@/types/pokemon'
import type { PokemonSlot } from '@/types/profile'

export type EnemyAttack =
  | { source: 'move'; moveName: string; attackType: PokemonType }
  | { source: 'stab-fallback'; attackType: PokemonType }

export interface EnemyAttackSet {
  attacks: EnemyAttack[]
  stabFallback: boolean
  unconfiguredMoves: boolean
}

export interface MoveThreat {
  enemySlotId: string
  enemyName: string
  multiplier: number
  attackType: PokemonType
  moveName?: string
  stabFallback: boolean
}

export interface PlayerVulnerabilityRow {
  member: PokemonSlot
  worstMultiplier: number
  threats: MoveThreat[]
}

export interface CoverageAnswer {
  memberSlotId: string
  memberName: string
  moveName: string
  moveType: PokemonType
  multiplier: number
}

export interface EnemyCoverageRow {
  enemy: PokemonSlot
  bestMultiplier: number
  superEffectiveAnswers: CoverageAnswer[]
}

export function uniqueNonEmptyMoves(slots: Array<PokemonSlot | null> | PokemonSlot[]): string[] {
  const names = slots
    .flatMap((slot) => slot?.moves ?? [])
    .map((move) => move.trim())
    .filter(Boolean)
  return [...new Set(names)]
}

export async function resolveDamagingMoveTypes(moveNames: string[]): Promise<Map<string, PokemonType>> {
  if (moveNames.length === 0) return new Map()
  const missingDetails = moveNames.filter((name) => getCachedMoveDetails(name) === null)
  await Promise.all(missingDetails.map(async (name) => fetchMoveDetails(name).catch(() => null)))
  const damagingMoveNames = moveNames.filter((name) => isDamagingMove(getCachedMoveDetails(name)))
  if (damagingMoveNames.length === 0) return new Map()

  const resolved = await resolveMoveTypes(damagingMoveNames)
  const damagingTypes = new Map<string, PokemonType>()
  for (const moveName of damagingMoveNames) {
    const moveType = resolved.get(moveName)
    if (moveType) damagingTypes.set(moveName, moveType)
  }
  return damagingTypes
}

export function getEnemyAttacks(
  enemy: PokemonSlot,
  damagingEnemyMoveTypes: Map<string, PokemonType>,
): EnemyAttackSet {
  const configuredMoves = (enemy.moves ?? []).map((move) => move.trim()).filter(Boolean)
  if (configuredMoves.length > 0) {
    const attacks: EnemyAttack[] = []
    for (const moveName of configuredMoves) {
      const attackType = damagingEnemyMoveTypes.get(moveName)
      if (attackType) {
        attacks.push({ source: 'move', moveName, attackType })
      }
    }
    return { attacks, stabFallback: false, unconfiguredMoves: attacks.length === 0 }
  }
  return {
    attacks: enemy.types.map((attackType) => ({ source: 'stab-fallback', attackType })),
    stabFallback: true,
    unconfiguredMoves: false,
  }
}

export function computeVulnerabilityRows(
  team: PokemonSlot[],
  enemies: PokemonSlot[],
  enemyDamagingMoveTypes: Map<string, PokemonType>,
): PlayerVulnerabilityRow[] {
  return team.map((member) => {
    const threats: MoveThreat[] = []
    let worstMultiplier = 1

    for (const enemy of enemies) {
      const { attacks } = getEnemyAttacks(enemy, enemyDamagingMoveTypes)
      const enemyName = enemy.nickname ?? enemy.displayName

      for (const attack of attacks) {
        const multiplier = getDefensiveMultiplier(member.types, attack.attackType) ?? 1
        if (multiplier > worstMultiplier) worstMultiplier = multiplier
        if (multiplier < 2) continue

        threats.push({
          enemySlotId: enemy.slotId,
          enemyName,
          multiplier,
          attackType: attack.attackType,
          moveName: attack.source === 'move' ? attack.moveName : undefined,
          stabFallback: attack.source === 'stab-fallback',
        })
      }
    }

    threats.sort((a, b) => b.multiplier - a.multiplier || a.enemyName.localeCompare(b.enemyName))

    return { member, worstMultiplier, threats }
  })
}

export function computeCoverageRows(
  team: PokemonSlot[],
  enemies: PokemonSlot[],
  teamDamagingMoveTypes: Map<string, PokemonType>,
): EnemyCoverageRow[] {
  return enemies.map((enemy) => {
    const superEffectiveAnswers: CoverageAnswer[] = []
    let bestMultiplier = 0

    for (const member of team) {
      const memberName = member.nickname ?? member.displayName
      for (const moveName of member.moves ?? []) {
        const trimmed = moveName.trim()
        if (!trimmed) continue
        const moveType = teamDamagingMoveTypes.get(trimmed)
        if (!moveType) continue
        const multiplier = getDefensiveMultiplier(enemy.types, moveType) ?? 1
        if (multiplier > bestMultiplier) bestMultiplier = multiplier
        if (multiplier >= 2) {
          superEffectiveAnswers.push({
            memberSlotId: member.slotId,
            memberName,
            moveName: trimmed,
            moveType,
            multiplier,
          })
        }
      }
    }

    superEffectiveAnswers.sort((a, b) => b.multiplier - a.multiplier || a.memberName.localeCompare(b.memberName))

    return {
      enemy,
      bestMultiplier: bestMultiplier || 1,
      superEffectiveAnswers,
    }
  })
}

export function enemiesUsingStabFallback(
  enemies: PokemonSlot[],
  enemyDamagingMoveTypes: Map<string, PokemonType>,
): PokemonSlot[] {
  return enemies.filter((enemy) => getEnemyAttacks(enemy, enemyDamagingMoveTypes).stabFallback)
}

export function enemiesWithUnconfiguredMoves(
  enemies: PokemonSlot[],
  enemyDamagingMoveTypes: Map<string, PokemonType>,
): PokemonSlot[] {
  return enemies.filter((enemy) => getEnemyAttacks(enemy, enemyDamagingMoveTypes).unconfiguredMoves)
}

export function hasConfiguredTeamMoves(team: PokemonSlot[]): boolean {
  return team.some((member) => (member.moves ?? []).some((move) => move.trim().length > 0))
}

export function hasResolvableTeamDamagingMoves(teamDamagingMoveTypes: Map<string, PokemonType>): boolean {
  return teamDamagingMoveTypes.size > 0
}
