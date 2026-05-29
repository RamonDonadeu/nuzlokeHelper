import { fetchMoveDetails, getCachedMoveDetails, isDamagingMove, resolveMoveTypes } from '@/lib/moveTypes'
import { getDefensiveMultiplier, multiplierTier } from '@/lib/typeChart'
import type { PokemonType } from '@/types/pokemon'
import type { PokemonSlot } from '@/types/profile'

export interface EnemyAttack {
  moveName: string
  attackType: PokemonType
}

export interface EnemyAttackSet {
  attacks: EnemyAttack[]
  /** No moves configured on this enemy. */
  noMoves: boolean
  /** Moves listed but none resolved as damaging. */
  unconfiguredMoves: boolean
}

export interface MoveThreat {
  enemySlotId: string
  enemyName: string
  multiplier: number
  attackType: PokemonType
  moveName: string
}

export interface PlayerVulnerabilityRow {
  member: PokemonSlot
  worstMultiplier: number
  threats: MoveThreat[]
}

export interface EnemyThreatGroup {
  enemySlotId: string
  enemyName: string
  worstMultiplier: number
  attacks: Array<{
    moveName: string
    attackType: PokemonType
    multiplier: number
  }>
}

/** Group move-level threats under each enemy Pokémon (fewer rows, clearer who threatens whom). */
export function groupThreatsByEnemy(threats: MoveThreat[]): EnemyThreatGroup[] {
  const map = new Map<string, EnemyThreatGroup>()

  for (const threat of threats) {
    let group = map.get(threat.enemySlotId)
    if (!group) {
      group = {
        enemySlotId: threat.enemySlotId,
        enemyName: threat.enemyName,
        worstMultiplier: threat.multiplier,
        attacks: [],
      }
      map.set(threat.enemySlotId, group)
    }
    group.worstMultiplier = Math.max(group.worstMultiplier, threat.multiplier)
    group.attacks.push({
      moveName: threat.moveName,
      attackType: threat.attackType,
      multiplier: threat.multiplier,
    })
  }

  for (const group of map.values()) {
    group.attacks.sort((a, b) => b.multiplier - a.multiplier || a.moveName.localeCompare(b.moveName))
  }

  return [...map.values()].sort(
    (a, b) => b.worstMultiplier - a.worstMultiplier || a.enemyName.localeCompare(b.enemyName),
  )
}

/** How threatened a roster member is by enemy count (not by move multiplier). */
export type RosterThreatSeverity = 'weak' | 'double'

export function rosterThreatSeverity(threateningEnemyCount: number): RosterThreatSeverity | null {
  if (threateningEnemyCount <= 0) return null
  if (threateningEnemyCount > 4) return 'double'
  return 'weak'
}

export type RosterVulnerabilityRowTone = 'battle-prep-row--safe' | 'battle-prep-row--caution' | 'battle-prep-row--danger'

/** Row background from worst hit taken: green 1×, yellow 2×, red 4× (resists below 2× treated as safe). */
export function rosterVulnerabilityRowBackgroundClass(
  worstMultiplier: number,
  hasThreats: boolean,
): RosterVulnerabilityRowTone {
  if (!hasThreats) return 'battle-prep-row--safe'
  const tier = multiplierTier(worstMultiplier)
  if (tier === 'x4') return 'battle-prep-row--danger'
  if (tier === 'x2') return 'battle-prep-row--caution'
  return 'battle-prep-row--safe'
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
  if (configuredMoves.length === 0) {
    return { attacks: [], noMoves: true, unconfiguredMoves: false }
  }

  const attacks: EnemyAttack[] = []
  for (const moveName of configuredMoves) {
    const attackType = damagingEnemyMoveTypes.get(moveName)
    if (attackType) {
      attacks.push({ moveName, attackType })
    }
  }
  return { attacks, noMoves: false, unconfiguredMoves: attacks.length === 0 }
}

export type ThreatCountTier = 'safe' | 'low' | 'medium' | 'high'

/** Enemies with at least one attack that deals 2× or more vs defender types. */
export function countEnemyThreatsAgainst(
  defender: PokemonSlot,
  enemies: PokemonSlot[],
  enemyDamagingMoveTypes: Map<string, PokemonType>,
): number {
  let threateningEnemies = 0
  for (const enemy of enemies) {
    const { attacks } = getEnemyAttacks(enemy, enemyDamagingMoveTypes)
    for (const attack of attacks) {
      const multiplier = getDefensiveMultiplier(defender.types, attack.attackType) ?? 1
      if (multiplier >= 2) {
        threateningEnemies++
        break
      }
    }
  }
  return threateningEnemies
}

export function buildThreatCountMap(
  defenders: PokemonSlot[],
  enemies: PokemonSlot[],
  enemyDamagingMoveTypes: Map<string, PokemonType>,
): Map<string, number> {
  const map = new Map<string, number>()
  for (const defender of defenders) {
    map.set(defender.slotId, countEnemyThreatsAgainst(defender, enemies, enemyDamagingMoveTypes))
  }
  return map
}

/** Roster members with at least one configured damaging move that deals 2× or more vs enemy types. */
export function countPlayerThreatsAgainst(
  enemy: PokemonSlot,
  roster: PokemonSlot[],
  teamDamagingMoveTypes: Map<string, PokemonType>,
): number {
  let threateningMembers = 0
  for (const member of roster) {
    for (const moveName of member.moves ?? []) {
      const trimmed = moveName.trim()
      if (!trimmed) continue
      const moveType = teamDamagingMoveTypes.get(trimmed)
      if (!moveType) continue
      const multiplier = getDefensiveMultiplier(enemy.types, moveType) ?? 1
      if (multiplier >= 2) {
        threateningMembers++
        break
      }
    }
  }
  return threateningMembers
}

export function buildPlayerThreatCountMap(
  enemies: PokemonSlot[],
  roster: PokemonSlot[],
  teamDamagingMoveTypes: Map<string, PokemonType>,
): Map<string, number> {
  const map = new Map<string, number>()
  for (const enemy of enemies) {
    map.set(enemy.slotId, countPlayerThreatsAgainst(enemy, roster, teamDamagingMoveTypes))
  }
  return map
}

export function threatCountTier(count: number, enemyCount: number): ThreatCountTier {
  if (count <= 0 || enemyCount <= 0) return 'safe'
  if (count >= 3 || count / enemyCount >= 0.67) return 'high'
  if (count >= 2 || count / enemyCount >= 0.34) return 'medium'
  return 'low'
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
          moveName: attack.moveName,
        })
      }
    }

    threats.sort((a, b) => b.multiplier - a.multiplier || a.enemyName.localeCompare(b.enemyName))

    return { member, worstMultiplier, threats }
  })
}

export interface OffensiveTarget {
  enemySlotId: string
  enemyName: string
  multiplier: number
  moveName: string
  attackType: PokemonType
}

export interface RosterOffensiveRow {
  member: PokemonSlot
  bestMultiplier: number
  targets: OffensiveTarget[]
}

export type RosterOffensiveSeverity = 'bad' | 'regular' | 'good' | 'superstar'

/** Badge tier by unique enemies hit for 2×+: 0 bad, 1–2 regular, 3–4 good, 5+ superstar. */
export function rosterOffensiveSeverity(coveredEnemyCount: number): RosterOffensiveSeverity {
  if (coveredEnemyCount <= 0) return 'bad'
  if (coveredEnemyCount <= 2) return 'regular'
  if (coveredEnemyCount <= 4) return 'good'
  return 'superstar'
}

/** Row background by enemies covered for 2×+ (0 = red, 1–2 = yellow, 3+ = green). */
export function rosterOffensiveRowBackgroundClass(
  coveredEnemyCount: number,
  _totalEnemies: number,
  hasDamagingMoves: boolean,
): RosterVulnerabilityRowTone {
  if (coveredEnemyCount <= 0 || !hasDamagingMoves) return 'battle-prep-row--danger'
  if (coveredEnemyCount <= 2) return 'battle-prep-row--caution'
  return 'battle-prep-row--safe'
}

export function computeOffensiveCoverageRows(
  roster: PokemonSlot[],
  enemies: PokemonSlot[],
  teamDamagingMoveTypes: Map<string, PokemonType>,
): RosterOffensiveRow[] {
  return roster.map((member) => {
    const targets: OffensiveTarget[] = []
    let bestMultiplier = 1

    for (const enemy of enemies) {
      const enemyName = enemy.nickname ?? enemy.displayName

      for (const moveName of member.moves ?? []) {
        const trimmed = moveName.trim()
        if (!trimmed) continue
        const moveType = teamDamagingMoveTypes.get(trimmed)
        if (!moveType) continue
        const multiplier = getDefensiveMultiplier(enemy.types, moveType) ?? 1
        if (multiplier > bestMultiplier) bestMultiplier = multiplier
        if (multiplier >= 2) {
          targets.push({
            enemySlotId: enemy.slotId,
            enemyName,
            multiplier,
            moveName: trimmed,
            attackType: moveType,
          })
        }
      }
    }

    targets.sort(
      (a, b) => b.multiplier - a.multiplier || a.enemyName.localeCompare(b.enemyName) || a.moveName.localeCompare(b.moveName),
    )

    return { member, bestMultiplier, targets }
  })
}

/** Group offensive hits under each enemy (same shape as defensive threats). */
export function groupOffensiveTargetsByEnemy(targets: OffensiveTarget[]): EnemyThreatGroup[] {
  return groupThreatsByEnemy(
    targets.map((target) => ({
      enemySlotId: target.enemySlotId,
      enemyName: target.enemyName,
      multiplier: target.multiplier,
      attackType: target.attackType,
      moveName: target.moveName,
      stabFallback: false,
    })),
  )
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

export function enemiesWithNoMoves(enemies: PokemonSlot[]): PokemonSlot[] {
  return enemies.filter((enemy) => !(enemy.moves ?? []).some((move) => move.trim().length > 0))
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

export interface EnemyAttackTypeCount {
  attackType: PokemonType
  count: number
}

/** Count damaging attack types across the enemy team (one per configured move). */
export function summarizeEnemyAttackTypes(
  enemies: PokemonSlot[],
  enemyDamagingMoveTypes: Map<string, PokemonType>,
): EnemyAttackTypeCount[] {
  const counts = new Map<PokemonType, number>()

  for (const enemy of enemies) {
    for (const attack of getEnemyAttacks(enemy, enemyDamagingMoveTypes).attacks) {
      counts.set(attack.attackType, (counts.get(attack.attackType) ?? 0) + 1)
    }
  }

  return [...counts.entries()]
    .map(([attackType, count]) => ({ attackType, count }))
    .sort((a, b) => b.count - a.count || a.attackType.localeCompare(b.attackType))
}

export interface RosterMoveEntry {
  moveName: string
  moveType: PokemonType | null
  isDamaging: boolean
}

export interface RosterMoveRow {
  member: PokemonSlot
  moves: RosterMoveEntry[]
}

export function buildRosterMoveRows(
  roster: PokemonSlot[],
  damagingMoveTypes: Map<string, PokemonType>,
): RosterMoveRow[] {
  return roster.map((member) => ({
    member,
    moves: (member.moves ?? [])
      .map((move) => move.trim())
      .filter(Boolean)
      .map((moveName) => ({
        moveName,
        moveType: damagingMoveTypes.get(moveName) ?? null,
        isDamaging: damagingMoveTypes.has(moveName),
      })),
  }))
}
