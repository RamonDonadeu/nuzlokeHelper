import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '@/i18n'
import {
  computeCoverageRows,
  computeVulnerabilityRows,
  enemiesUsingStabFallback,
  enemiesWithUnconfiguredMoves,
  hasConfiguredTeamMoves,
  hasResolvableTeamDamagingMoves,
  resolveDamagingMoveTypes,
  uniqueNonEmptyMoves,
} from '@/features/battle/lib/battlePrepMatchup'
import { BattlePrepStatsTable } from '@/features/battle/components/BattlePrepStatsTable'
import { formatMultiplier, multiplierSeverity, multiplierTier } from '@/lib/typeChart'
import { InfoTooltip } from '@/shared/components/InfoTooltip'
import type { PokemonType } from '@/types/pokemon'
import type { PokemonSlot } from '@/types/profile'

type PrepView = 'attacks' | 'stats'

interface BattlePrepPanelProps {
  team: PokemonSlot[]
  pc: PokemonSlot[]
  enemySlots: Array<PokemonSlot | null>
  levelCap: number
  started: boolean
}

export function BattlePrepPanel({ team, pc, enemySlots, levelCap, started }: BattlePrepPanelProps) {
  const [prepView, setPrepView] = useState<PrepView>('attacks')
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

  const vulnerabilityRows = useMemo(
    () => computeVulnerabilityRows(team, enemies, enemyDamagingMoveTypes),
    [enemies, enemyDamagingMoveTypes, team],
  )

  const coverageRows = useMemo(
    () => computeCoverageRows(team, enemies, teamDamagingMoveTypes),
    [enemies, team, teamDamagingMoveTypes],
  )

  const stabFallbackEnemies = useMemo(
    () => enemiesUsingStabFallback(enemies, enemyDamagingMoveTypes),
    [enemies, enemyDamagingMoveTypes],
  )

  const unconfiguredMoveEnemies = useMemo(
    () => enemiesWithUnconfiguredMoves(enemies, enemyDamagingMoveTypes),
    [enemies, enemyDamagingMoveTypes],
  )

  const hasTeamMoves = useMemo(() => hasConfiguredTeamMoves(team), [team])
  const hasTeamDamagingMoves = useMemo(
    () => hasResolvableTeamDamagingMoves(teamDamagingMoveTypes),
    [teamDamagingMoveTypes],
  )

  if (started || team.length === 0 || enemies.length === 0) return null

  return (
    <section className="card battle-prep-panel">
      <div className="battle-prep-panel-head">
        <h3>{prepView === 'attacks' ? t('battle.prepTitle') : t('battle.prepStatsTitle')}</h3>
        {prepView === 'attacks' ? (
          <button type="button" className="btn btn-sm" onClick={() => setPrepView('stats')}>
            {t('battle.prepStatsCompare')}
          </button>
        ) : (
          <button type="button" className="btn btn-sm" onClick={() => setPrepView('attacks')}>
            {t('battle.prepBackToAttacks')}
          </button>
        )}
      </div>
      {prepView === 'stats' ? (
        <div className="battle-prep-panel-body">
          <BattlePrepStatsTable
            team={team}
            pc={pc}
            enemySlots={enemySlots}
            levelCap={levelCap}
          />
        </div>
      ) : (
      <div className="battle-prep-grid">
        <article className="battle-prep-card">
          <div className="battle-prep-card-head">
            <h4>{t('battle.prepThreatsTitle')}</h4>
            <InfoTooltip label={t('battle.prepThreatsHintLabel')} text={t('battle.prepThreatsHint')} />
          </div>
          <div className="battle-prep-card-scroll">
          {stabFallbackEnemies.length > 0 && (
            <p className="muted coverage-fallback-note battle-prep-note">
              {t('battle.prepStabFallbackNote', {
                names: stabFallbackEnemies.map((e) => e.nickname ?? e.displayName).join(', '),
              })}
            </p>
          )}
          {unconfiguredMoveEnemies.length > 0 && (
            <p className="muted battle-prep-note battle-prep-warning">
              {t('battle.prepEnemyConfigureMoves', {
                names: unconfiguredMoveEnemies.map((e) => e.nickname ?? e.displayName).join(', '),
              })}
            </p>
          )}
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
                  {row.threats.length > 0 ? (
                    <ul className="coverage-type-badges battle-prep-threats">
                      {row.threats.map((threat) => (
                        <li
                          key={`${threat.enemySlotId}-${threat.moveName ?? 'stab'}-${threat.attackType}-${threat.multiplier}`}
                        >
                          <span className="battle-prep-threat-enemy">{threat.enemyName}</span>
                          {threat.moveName ? (
                            <span className="battle-prep-threat-move">{threat.moveName}</span>
                          ) : null}
                          <span className={`type-badge type-${threat.attackType}`}>{threat.attackType}</span>
                          {threat.stabFallback ? (
                            <span className="coverage-fallback-tag">{t('battle.prepStabFallbackTag')}</span>
                          ) : null}
                          <span
                            className={`coverage-threat-mult coverage-defense-${multiplierTier(threat.multiplier)}`}
                          >
                            {formatMultiplier(threat.multiplier)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted battle-prep-sub">{t('battle.prepNoMajorThreats')}</p>
                  )}
                </li>
              )
            })}
          </ul>
          </div>
        </article>

        <article className="battle-prep-card">
          <div className="battle-prep-card-head">
            <h4>{t('battle.prepCoverageTitle')}</h4>
            <InfoTooltip label={t('battle.prepCoverageHintLabel')} text={t('battle.prepCoverageHint')} />
          </div>
          <div className="battle-prep-card-scroll">
          {!hasTeamMoves ? (
            <p className="muted">{t('battle.prepCoverageNoMoves')}</p>
          ) : !hasTeamDamagingMoves ? (
            <p className="muted">{t('battle.prepCoverageNoDamagingMoves')}</p>
          ) : (
            <ul className="battle-prep-list">
              {coverageRows.map((row) => {
                const uncovered = row.superEffectiveAnswers.length === 0
                return (
                  <li key={row.enemy.slotId} className="battle-prep-row">
                    <div className="battle-prep-row-head">
                      <strong>{row.enemy.nickname ?? row.enemy.displayName}</strong>
                      <span className={`coverage-threat-mult coverage-defense-${multiplierTier(row.bestMultiplier)}`}>
                        {formatMultiplier(row.bestMultiplier)}
                      </span>
                    </div>
                    {uncovered ? (
                      <p className="battle-prep-sub battle-prep-warning">{t('battle.prepCoverageMissing')}</p>
                    ) : (
                      <>
                        <p className="muted battle-prep-sub">{t('battle.prepCoverageFound')}</p>
                        <ul className="coverage-type-badges battle-prep-threats">
                          {row.superEffectiveAnswers.map((answer) => (
                            <li key={`${answer.memberSlotId}-${answer.moveName}-${answer.moveType}`}>
                              <span className="battle-prep-threat-enemy">{answer.memberName}</span>
                              <span className="battle-prep-threat-move">{answer.moveName}</span>
                              <span className={`type-badge type-${answer.moveType}`}>{answer.moveType}</span>
                              <span
                                className={`coverage-threat-mult coverage-defense-${multiplierTier(answer.multiplier)}`}
                              >
                                {formatMultiplier(answer.multiplier)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
          </div>
        </article>
      </div>
      )}
    </section>
  )
}
