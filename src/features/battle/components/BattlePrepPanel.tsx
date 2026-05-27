import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '@/i18n'
import { fetchMoveDetails, getCachedMoveDetails, isDamagingMove, resolveMoveTypes } from '@/lib/moveTypes'
import { formatMultiplier, getDefensiveMultiplier, multiplierSeverity, multiplierTier } from '@/lib/typeChart'
import type { PokemonType } from '@/types/pokemon'
import type { PokemonSlot } from '@/types/profile'

interface BattlePrepPanelProps {
  team: PokemonSlot[]
  enemySlots: Array<PokemonSlot | null>
}

interface PlayerThreatRow {
  member: PokemonSlot
  worstMultiplier: number
  threateningEnemies: Array<{ slotId: string; name: string; multiplier: number }>
}

interface EnemyCoverageRow {
  enemy: PokemonSlot
  bestMultiplier: number
}

function uniqueNonEmptyMoves(slots: Array<PokemonSlot | null> | PokemonSlot[]): string[] {
  const names = slots
    .flatMap((slot) => slot?.moves ?? [])
    .map((move) => move.trim())
    .filter(Boolean)
  return [...new Set(names)]
}

async function resolveDamagingMoveTypes(moveNames: string[]): Promise<Map<string, PokemonType>> {
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

function enemyAttackTypes(enemy: PokemonSlot, damagingEnemyMoveTypes: Map<string, PokemonType>): PokemonType[] {
  const configuredMoves = (enemy.moves ?? []).map((move) => move.trim()).filter(Boolean)
  if (configuredMoves.length > 0) {
    return [...new Set(configuredMoves.map((move) => damagingEnemyMoveTypes.get(move)).filter(Boolean))] as PokemonType[]
  }
  return enemy.types
}

export function BattlePrepPanel({ team, enemySlots }: BattlePrepPanelProps) {
  const { t } = useI18n()
  const enemies = useMemo(
    () => enemySlots.filter((slot): slot is PokemonSlot => slot !== null),
    [enemySlots],
  )
  const [enemyDamagingMoveTypes, setEnemyDamagingMoveTypes] = useState<Map<string, PokemonType>>(new Map())
  const [teamDamagingMoveTypes, setTeamDamagingMoveTypes] = useState<Map<string, PokemonType>>(new Map())

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const moveTypes = await resolveDamagingMoveTypes(uniqueNonEmptyMoves(enemies))
      if (!cancelled) setEnemyDamagingMoveTypes(moveTypes)
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [enemies])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const moveTypes = await resolveDamagingMoveTypes(uniqueNonEmptyMoves(team))
      if (!cancelled) setTeamDamagingMoveTypes(moveTypes)
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [team])

  const vulnerabilityRows = useMemo<PlayerThreatRow[]>(() => {
    return team
      .map((member) => {
        const threats: PlayerThreatRow['threateningEnemies'] = []
        let worstMultiplier = 1

        for (const enemy of enemies) {
          const attackTypes = enemyAttackTypes(enemy, enemyDamagingMoveTypes)
          for (const attackType of attackTypes) {
            const multiplier = getDefensiveMultiplier(member.types, attackType) ?? 1
            if (multiplier > worstMultiplier) worstMultiplier = multiplier
            if (multiplier >= 2) {
              threats.push({
                slotId: enemy.slotId,
                name: enemy.nickname ?? enemy.displayName,
                multiplier,
              })
            }
          }
        }

        const threatByEnemy = new Map<string, { slotId: string; name: string; multiplier: number }>()
        for (const threat of threats) {
          const existing = threatByEnemy.get(threat.slotId)
          if (!existing || threat.multiplier > existing.multiplier) {
            threatByEnemy.set(threat.slotId, threat)
          }
        }

        return {
          member,
          worstMultiplier,
          threateningEnemies: [...threatByEnemy.values()].sort((a, b) => b.multiplier - a.multiplier),
        }
      })
  }, [enemies, enemyDamagingMoveTypes, team])

  const coverageRows = useMemo<EnemyCoverageRow[]>(() => {
    return enemies.map((enemy) => {
      let bestMultiplier = 0
      for (const member of team) {
        for (const moveName of member.moves ?? []) {
          const moveType = teamDamagingMoveTypes.get(moveName.trim())
          if (!moveType) continue
          const multiplier = getDefensiveMultiplier(enemy.types, moveType) ?? 1
          if (multiplier > bestMultiplier) bestMultiplier = multiplier
        }
      }
      return { enemy, bestMultiplier: bestMultiplier || 1 }
    })
  }, [enemies, team, teamDamagingMoveTypes])

  const hasAnyTeamMovesConfigured = useMemo(
    () => team.some((member) => (member.moves ?? []).some((move) => move.trim().length > 0)),
    [team],
  )

  if (team.length === 0 || enemies.length === 0) return null

  return (
    <section className="card battle-prep-panel">
      <h3>{t('battle.prepTitle')}</h3>
      <div className="battle-prep-grid">
        <article className="battle-prep-card">
          <h4>{t('battle.prepThreatsTitle')}</h4>
          <ul className="battle-prep-list">
            {vulnerabilityRows.map((row) => {
              const severity = multiplierSeverity(row.worstMultiplier)
              return (
                <li key={row.member.slotId} className="battle-prep-row">
                  <div className="battle-prep-row-head">
                    <strong>{row.member.nickname ?? row.member.displayName}</strong>
                    <span className={`coverage-threat-mult coverage-defense-${multiplierTier(row.worstMultiplier)}`}>
                      {formatMultiplier(row.worstMultiplier)}
                    </span>
                    <span className={`battle-prep-severity battle-prep-severity-${severity}`}>
                      {t(`battle.prepSeverity${severity}`)}
                    </span>
                  </div>
                  <p className="muted battle-prep-sub">
                    {row.threateningEnemies.length > 0
                      ? t('battle.prepThreatenedBy', {
                          names: row.threateningEnemies.map((threat) => threat.name).join(', '),
                        })
                      : t('battle.prepNoMajorThreats')}
                  </p>
                </li>
              )
            })}
          </ul>
        </article>

        <article className="battle-prep-card">
          <h4>{t('battle.prepCoverageTitle')}</h4>
          {!hasAnyTeamMovesConfigured ? (
            <p className="muted">{t('battle.prepCoverageNoMoves')}</p>
          ) : (
            <ul className="battle-prep-list">
              {coverageRows.map((row) => {
                const uncovered = row.bestMultiplier < 2
                return (
                  <li key={row.enemy.slotId} className="battle-prep-row">
                    <div className="battle-prep-row-head">
                      <strong>{row.enemy.nickname ?? row.enemy.displayName}</strong>
                      <span className={`coverage-threat-mult coverage-defense-${multiplierTier(row.bestMultiplier)}`}>
                        {formatMultiplier(row.bestMultiplier)}
                      </span>
                    </div>
                    <p className={`battle-prep-sub ${uncovered ? 'battle-prep-warning' : 'muted'}`}>
                      {uncovered ? t('battle.prepCoverageMissing') : t('battle.prepCoverageFound')}
                    </p>
                  </li>
                )
              })}
            </ul>
          )}
        </article>
      </div>
    </section>
  )
}
