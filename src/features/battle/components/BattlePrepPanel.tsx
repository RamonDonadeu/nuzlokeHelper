import { useEffect, useMemo, useState } from 'react'
import { BattlePrepMoveLabel } from '@/features/battle/components/BattlePrepMoveLabel'
import { BattlePrepRosterDetails } from '@/features/battle/components/BattlePrepRosterDetails'
import { BattlePrepStatsTable } from '@/features/battle/components/BattlePrepStatsTable'
import { useProfiles } from '@/features/profiles/hooks/useProfiles'
import { useAbilityDescriptions } from '@/features/team/hooks/useAbilityDescriptions'
import { useMovesDetails } from '@/features/search/hooks/useMovesDetails'
import { useI18n } from '@/i18n'
import {
  buildRosterMoveRows,
  computeOffensiveCoverageRows,
  computeVulnerabilityRows,
  groupThreatsByEnemy,
  rosterOffensiveRowBackgroundClass,
  rosterOffensiveSeverity,
  rosterThreatSeverity,
  rosterVulnerabilityRowBackgroundClass,
  enemiesWithNoMoves,
  enemiesWithUnconfiguredMoves,
  hasConfiguredTeamMoves,
  hasResolvableTeamDamagingMoves,
  resolveDamagingMoveTypes,
  summarizeEnemyAttackTypes,
  uniqueNonEmptyMoves,
} from '@/features/battle/lib/battlePrepMatchup'
import { resolveAbilitySlug } from '@/lib/localizedNames'
import type { MoveDetails } from '@/lib/moveTypes'
import { formatMultiplier, multiplierTier } from '@/lib/typeChart'
import type { PokemonType } from '@/types/pokemon'
import type { PokemonSlot } from '@/types/profile'

function collectPrepMoveNames(
  enemies: PokemonSlot[],
  roster: PokemonSlot[],
  vulnerabilityRows: ReturnType<typeof computeVulnerabilityRows>,
  offensiveRows: ReturnType<typeof computeOffensiveCoverageRows>,
): string[] {
  const names = new Set<string>()
  for (const slots of [enemies, roster]) {
    for (const slot of slots) {
      for (const move of slot.moves ?? []) {
        const trimmed = move.trim()
        if (trimmed) names.add(trimmed)
      }
    }
  }
  for (const row of vulnerabilityRows) {
    for (const threat of row.threats) names.add(threat.moveName)
  }
  for (const row of offensiveRows) {
    for (const target of row.targets) names.add(target.moveName)
  }
  return [...names]
}

export type BattlePrepTab = 'team' | 'weakness' | 'attack' | 'stats'

export type BattlePrepPanelMode = 'full' | 'stats-only'

type TeamDetailsView = 'ally' | 'enemy'

const PREP_TAB_ORDER: BattlePrepTab[] = ['team', 'weakness', 'attack', 'stats']

interface BattlePrepPanelProps {
  team: PokemonSlot[]
  pc: PokemonSlot[]
  enemySlots: Array<PokemonSlot | null>
  levelCap: number
  started: boolean
  mode?: BattlePrepPanelMode
  defaultTab?: BattlePrepTab
}

function TypeBadge({ type }: { type: PokemonType }) {
  return <span className={`type-badge type-${type}`}>{type}</span>
}

export function BattlePrepPanel({
  team,
  pc,
  enemySlots,
  levelCap,
  started,
  mode = 'full',
  defaultTab,
}: BattlePrepPanelProps) {
  const { t, locale } = useI18n()
  const { versionGroup } = useProfiles()
  const initialTab = defaultTab ?? (mode === 'stats-only' ? 'stats' : 'team')
  const [activeTab, setActiveTab] = useState<BattlePrepTab>(initialTab)
  const [teamDetailsView, setTeamDetailsView] = useState<TeamDetailsView>('ally')
  const [includePc, setIncludePc] = useState(false)

  useEffect(() => {
    if (defaultTab) setActiveTab(defaultTab)
  }, [defaultTab])
  const enemies = useMemo(
    () => enemySlots.filter((slot): slot is PokemonSlot => slot !== null),
    [enemySlots],
  )
  const roster = useMemo(
    () => (includePc ? [...team, ...pc] : team),
    [includePc, pc, team],
  )
  const pcSlotIds = useMemo(() => new Set(pc.map((slot) => slot.slotId)), [pc])

  const [enemyDamagingMoveTypes, setEnemyDamagingMoveTypes] = useState<Map<string, PokemonType>>(new Map())
  const [teamDamagingMoveTypes, setTeamDamagingMoveTypes] = useState<Map<string, PokemonType>>(new Map())
  const [rosterDamagingMoveTypes, setRosterDamagingMoveTypes] = useState<Map<string, PokemonType>>(new Map())

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

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const moveTypes = await resolveDamagingMoveTypes(uniqueNonEmptyMoves(roster))
      if (!cancelled) setRosterDamagingMoveTypes(moveTypes)
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [roster])

  const vulnerabilityRows = useMemo(
    () => computeVulnerabilityRows(roster, enemies, enemyDamagingMoveTypes),
    [enemies, enemyDamagingMoveTypes, roster],
  )

  const enemyBySlotId = useMemo(() => new Map(enemies.map((enemy) => [enemy.slotId, enemy])), [enemies])

  const sortedVulnerabilityRows = useMemo(
    () =>
      [...vulnerabilityRows].sort((a, b) => {
        const countA = new Set(a.threats.map((threat) => threat.enemySlotId)).size
        const countB = new Set(b.threats.map((threat) => threat.enemySlotId)).size
        if (countB !== countA) return countB - countA
        if (b.worstMultiplier !== a.worstMultiplier) return b.worstMultiplier - a.worstMultiplier
        return b.threats.length - a.threats.length
      }),
    [vulnerabilityRows],
  )

  const offensiveRows = useMemo(
    () => computeOffensiveCoverageRows(roster, enemies, rosterDamagingMoveTypes),
    [enemies, roster, rosterDamagingMoveTypes],
  )

  const sortedOffensiveRows = useMemo(
    () =>
      [...offensiveRows].sort((a, b) => {
        const countA = new Set(a.targets.map((target) => target.enemySlotId)).size
        const countB = new Set(b.targets.map((target) => target.enemySlotId)).size
        if (countA !== countB) return countA - countB
        if (b.bestMultiplier !== a.bestMultiplier) return b.bestMultiplier - a.bestMultiplier
        return b.targets.length - a.targets.length
      }),
    [offensiveRows],
  )

  const rosterMoveRows = useMemo(
    () => buildRosterMoveRows(roster, rosterDamagingMoveTypes),
    [roster, rosterDamagingMoveTypes],
  )

  const movesBySlotId = useMemo(
    () => new Map(rosterMoveRows.map((row) => [row.member.slotId, row.moves])),
    [rosterMoveRows],
  )

  const enemyOffenseSummary = useMemo(
    () => summarizeEnemyAttackTypes(enemies, enemyDamagingMoveTypes),
    [enemies, enemyDamagingMoveTypes],
  )

  const teamOffenseSummary = useMemo(
    () => summarizeEnemyAttackTypes(team, teamDamagingMoveTypes),
    [team, teamDamagingMoveTypes],
  )

  const enemiesMissingMoves = useMemo(() => enemiesWithNoMoves(enemies), [enemies])

  const unconfiguredMoveEnemies = useMemo(
    () => enemiesWithUnconfiguredMoves(enemies, enemyDamagingMoveTypes),
    [enemies, enemyDamagingMoveTypes],
  )

  const teamMissingMoves = useMemo(() => enemiesWithNoMoves(team), [team])

  const unconfiguredTeamMoves = useMemo(
    () => enemiesWithUnconfiguredMoves(team, teamDamagingMoveTypes),
    [team, teamDamagingMoveTypes],
  )

  const hasRosterMoves = useMemo(() => hasConfiguredTeamMoves(roster), [roster])
  const hasRosterDamagingMoves = useMemo(
    () => hasResolvableTeamDamagingMoves(rosterDamagingMoveTypes),
    [rosterDamagingMoveTypes],
  )

  const prepMoveNames = useMemo(
    () => collectPrepMoveNames(enemies, roster, vulnerabilityRows, offensiveRows),
    [enemies, offensiveRows, roster, vulnerabilityRows],
  )
  const { detailsByName: moveDetailsByName, loading: moveDetailsLoading } = useMovesDetails(prepMoveNames)

  const rosterDetailAbilitySlugs = useMemo(() => {
    const slugs: string[] = []
    for (const slot of [...team, ...enemies]) {
      if (!slot.ability) continue
      const slug = resolveAbilitySlug(slot.ability)
      if (slug) slugs.push(slug)
    }
    return [...new Set(slugs)]
  }, [enemies, team])

  const { descriptions: rosterDetailAbilityDescriptions } = useAbilityDescriptions(
    rosterDetailAbilitySlugs,
    locale,
    versionGroup,
  )

  if (team.length === 0 || enemies.length === 0) return null
  if (started && mode !== 'stats-only') return null

  const prepTabLabels: Record<BattlePrepTab, string> = {
    team: t('battle.prepTabTeam'),
    weakness: t('battle.prepTabWeakness'),
    attack: t('battle.prepTabAttack'),
    stats: t('battle.prepTabStats'),
  }

  const includePcControl =
    pc.length > 0 ? (
      <label className="battle-prep-include-pc">
        <input
          type="checkbox"
          checked={includePc}
          onChange={(event) => setIncludePc(event.target.checked)}
        />
        {t('battle.prepIncludePc')}
      </label>
    ) : null

  return (
    <section
      className={`card battle-prep-panel${mode === 'stats-only' ? ' battle-prep-panel--stats-only' : ''}`}
    >
      <div className="battle-prep-panel-head">
        <h3>{t('battle.prepTitle')}</h3>
      </div>

      <div
        className="search-category-tabs battle-prep-tabs"
        role="tablist"
        aria-label={t('battle.prepTabsLabel')}
      >
        {PREP_TAB_ORDER.map((tab) => {
          const isActive = activeTab === tab
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              id={`battle-prep-tab-${tab}`}
              aria-selected={isActive}
              aria-controls={`battle-prep-panel-${tab}`}
              className={`search-category-tab${isActive ? ' active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              <span className="search-category-tab-label">{prepTabLabels[tab]}</span>
            </button>
          )
        })}
      </div>

      <div
        role="tabpanel"
        id={`battle-prep-panel-${activeTab}`}
        aria-labelledby={`battle-prep-tab-${activeTab}`}
        className={`battle-prep-panel-body battle-prep-sections${
          activeTab === 'stats' ? ' battle-prep-panel-body--stats-tab' : ''
        }`}
      >
        {activeTab === 'team' ? (
          <>
            <div
              className="battle-prep-details-switch"
              role="group"
              aria-label={t('battle.prepTeamDetailsSwitchLabel')}
            >
              <button
                type="button"
                className={`btn btn-sm${teamDetailsView === 'ally' ? ' btn-primary' : ''}`}
                aria-pressed={teamDetailsView === 'ally'}
                onClick={() => setTeamDetailsView('ally')}
              >
                {t('battle.prepYourTeam')}
              </button>
              <button
                type="button"
                className={`btn btn-sm${teamDetailsView === 'enemy' ? ' btn-primary' : ''}`}
                aria-pressed={teamDetailsView === 'enemy'}
                onClick={() => setTeamDetailsView('enemy')}
              >
                {t('battle.prepEnemyTeam')}
              </button>
            </div>

            {teamDetailsView === 'ally' ? (
              <BattlePrepRosterDetails
                members={team}
                abilityDescriptions={rosterDetailAbilityDescriptions}
                moveDetailsByName={moveDetailsByName}
                moveDetailsLoading={moveDetailsLoading}
                typesTitle={t('battle.prepYourTeamTypesTitle')}
                typesHint={t('battle.prepYourTeamTypesHint')}
                missingMovesNames={teamMissingMoves.map((m) => m.nickname ?? m.displayName)}
                unconfiguredNames={unconfiguredTeamMoves.map((m) => m.nickname ?? m.displayName)}
                offenseTitle={t('battle.prepYourOffenseSummaryTitle')}
                offenseHint={t('battle.prepYourOffenseSummaryHint')}
                offenseSummary={teamOffenseSummary}
                offenseEmpty={t('battle.prepYourOffenseSummaryEmpty')}
              />
            ) : (
              <BattlePrepRosterDetails
                members={enemies}
                abilityDescriptions={rosterDetailAbilityDescriptions}
                moveDetailsByName={moveDetailsByName}
                moveDetailsLoading={moveDetailsLoading}
                typesTitle={t('battle.prepEnemyTypesTitle')}
                typesHint={t('battle.prepEnemyTypesHint')}
                missingMovesNames={enemiesMissingMoves.map((m) => m.nickname ?? m.displayName)}
                unconfiguredNames={unconfiguredMoveEnemies.map((m) => m.nickname ?? m.displayName)}
                offenseTitle={t('battle.prepOffenseSummaryTitle')}
                offenseHint={t('battle.prepOffenseSummaryHint')}
                offenseSummary={enemyOffenseSummary}
                offenseEmpty={t('battle.prepOffenseSummaryEmpty')}
              />
            )}
          </>
        ) : null}

        {activeTab === 'weakness' ? (
          <>
            {includePcControl}

            <section className="battle-prep-section">
              <h4 className="battle-prep-section-title">{t('battle.prepAtRiskTitle')}</h4>
              <p className="muted battle-prep-section-hint">{t('battle.prepAtRiskHintGrouped')}</p>
              <ul className="battle-prep-list">
                {sortedVulnerabilityRows.map((row) => {
                  const name = row.member.nickname ?? row.member.displayName
                  const threats4 = row.threats.filter((threat) => threat.multiplier >= 4)
                  const threats2 = row.threats.filter(
                    (threat) => threat.multiplier >= 2 && threat.multiplier < 4,
                  )
                  const uniqueThreateningEnemies = new Set(row.threats.map((threat) => threat.enemySlotId)).size
                  const threatSeverity = rosterThreatSeverity(uniqueThreateningEnemies)
                  const rowTone = rosterVulnerabilityRowBackgroundClass(uniqueThreateningEnemies)

                  return (
                    <li key={row.member.slotId} className={`battle-prep-row ${rowTone}`}>
                      <details className="battle-prep-row-details">
                        <summary className="battle-prep-row-summary">
                          <span className="battle-prep-row-chevron" aria-hidden />
                          <img src={row.member.sprite} alt="" loading="lazy" className="battle-prep-row-sprite" />
                          <div className="battle-prep-row-title">
                            <strong>{name}</strong>
                            {pcSlotIds.has(row.member.slotId) ? (
                              <span className="tag battle-prep-roster-tag">{t('battle.prepStatsPC')}</span>
                            ) : null}
                          </div>
                          {row.threats.length > 0 ? (
                            <span
                              className={`coverage-threat-mult coverage-defense-${multiplierTier(row.worstMultiplier)}`}
                            >
                              {formatMultiplier(row.worstMultiplier)}
                            </span>
                          ) : null}
                          <span
                            className={`battle-prep-severity battle-prep-severity-defense-${threatSeverity}`}
                          >
                            {t(`battle.prepDefensiveSeverity${threatSeverity}`)}
                          </span>
                          <span className="muted battle-prep-summary-meta">
                            {row.threats.length > 0
                              ? t('battle.prepThreatSummaryMeta', { count: uniqueThreateningEnemies })
                              : t('battle.prepNoMajorThreats')}
                          </span>
                        </summary>
                        <div className="battle-prep-row-body">
                          {row.threats.length > 0 ? (
                            <>
                              <p className="battle-prep-sub">
                                {t('battle.prepThreatenedByCount', { count: uniqueThreateningEnemies })}
                              </p>
                              {threats4.length > 0 ? (
                                <ThreatsByEnemyList
                                  threats={threats4}
                                  label={t('battle.prepWeak4x')}
                                  enemyBySlotId={enemyBySlotId}
                                  moveDetailsByName={moveDetailsByName}
                                  moveDetailsLoading={moveDetailsLoading}
                                />
                              ) : null}
                              {threats2.length > 0 ? (
                                <ThreatsByEnemyList
                                  threats={threats2}
                                  label={t('battle.prepWeak2x')}
                                  enemyBySlotId={enemyBySlotId}
                                  moveDetailsByName={moveDetailsByName}
                                  moveDetailsLoading={moveDetailsLoading}
                                />
                              ) : null}
                            </>
                          ) : (
                            <p className="muted battle-prep-sub">{t('battle.prepNoMajorThreats')}</p>
                          )}
                        </div>
                      </details>
                    </li>
                  )
                })}
              </ul>
            </section>
          </>
        ) : null}

        {activeTab === 'attack' ? (
          <>
            {includePcControl}

            <section className="battle-prep-section">
              <h4 className="battle-prep-section-title">{t('battle.prepOffenseTitle')}</h4>
              <p className="muted battle-prep-section-hint">{t('battle.prepOffenseHintGrouped')}</p>
              {!hasRosterMoves ? (
                <p className="muted">{t('battle.prepCoverageNoMoves')}</p>
              ) : !hasRosterDamagingMoves ? (
                <p className="muted">{t('battle.prepCoverageNoDamagingMoves')}</p>
              ) : (
                <ul className="battle-prep-list battle-prep-attack-list">
                  {sortedOffensiveRows.map((row) => {
                    const name = row.member.nickname ?? row.member.displayName
                    const moves = movesBySlotId.get(row.member.slotId) ?? []
                    const hasDamagingMoves = moves.some((move) => move.isDamaging && move.moveType)
                    const targets4 = row.targets.filter((target) => target.multiplier >= 4)
                    const targets2 = row.targets.filter(
                      (target) => target.multiplier >= 2 && target.multiplier < 4,
                    )
                    const coveredEnemyCount = new Set(row.targets.map((target) => target.enemySlotId)).size
                    const offensiveSeverity = rosterOffensiveSeverity(coveredEnemyCount)
                    const rowTone = rosterOffensiveRowBackgroundClass(
                      coveredEnemyCount,
                      enemies.length,
                      hasDamagingMoves,
                    )
                    return (
                      <li key={row.member.slotId} className={`battle-prep-row ${rowTone}`}>
                        <details className="battle-prep-row-details">
                          <summary className="battle-prep-row-summary">
                            <span className="battle-prep-row-chevron" aria-hidden />
                            <img src={row.member.sprite} alt="" loading="lazy" className="battle-prep-row-sprite" />
                            <div className="battle-prep-row-title">
                              <strong>{name}</strong>
                              {pcSlotIds.has(row.member.slotId) ? (
                                <span className="tag battle-prep-roster-tag">{t('battle.prepStatsPC')}</span>
                              ) : null}
                            </div>
                            {row.targets.length > 0 ? (
                              <span
                                className={`coverage-threat-mult coverage-offense-${multiplierTier(row.bestMultiplier)}`}
                              >
                                {formatMultiplier(row.bestMultiplier)}
                              </span>
                            ) : null}
                            <span
                              className={`battle-prep-severity battle-prep-severity-offense-${offensiveSeverity}`}
                            >
                              {t(`battle.prepOffensiveSeverity${offensiveSeverity}`)}
                            </span>
                            <span className="muted battle-prep-summary-meta">
                              {row.targets.length > 0
                                ? t('battle.prepHitsSummaryMeta', {
                                    count: coveredEnemyCount,
                                    total: enemies.length,
                                  })
                                : t('battle.prepNoOffensiveCoverage')}
                            </span>
                          </summary>
                          <div className="battle-prep-row-body">
                            {moves.length > 0 ? (
                              <ul className="battle-prep-member-moves battle-prep-sub">
                                {moves.map((move) => (
                                  <li key={move.moveName}>
                                    <BattlePrepMoveLabel
                                      moveName={move.moveName}
                                      details={moveDetailsByName[move.moveName]}
                                      loading={moveDetailsLoading}
                                    />
                                    {move.moveType ? <TypeBadge type={move.moveType} /> : null}
                                    {!move.isDamaging ? (
                                      <span className="muted battle-prep-move-status">
                                        {t('battle.prepMoveNotDamaging')}
                                      </span>
                                    ) : null}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="muted battle-prep-sub">{t('battle.prepNoMovesOnMember')}</p>
                            )}
                            {row.targets.length > 0 ? (
                              <>
                                <p className="battle-prep-sub">
                                  {t('battle.prepCoversEnemyCount', { count: coveredEnemyCount })}
                                </p>
                                {targets4.length > 0 ? (
                                  <ThreatsByEnemyList
                                    threats={targets4.map((target) => ({
                                      enemySlotId: target.enemySlotId,
                                      enemyName: target.enemyName,
                                      multiplier: target.multiplier,
                                      attackType: target.attackType,
                                      moveName: target.moveName,
                                    }))}
                                    label={t('battle.prepHit4x')}
                                    enemyBySlotId={enemyBySlotId}
                                    moveDetailsByName={moveDetailsByName}
                                    moveDetailsLoading={moveDetailsLoading}
                                    offenseMult
                                  />
                                ) : null}
                                {targets2.length > 0 ? (
                                  <ThreatsByEnemyList
                                    threats={targets2.map((target) => ({
                                      enemySlotId: target.enemySlotId,
                                      enemyName: target.enemyName,
                                      multiplier: target.multiplier,
                                      attackType: target.attackType,
                                      moveName: target.moveName,
                                    }))}
                                    label={t('battle.prepHit2x')}
                                    enemyBySlotId={enemyBySlotId}
                                    moveDetailsByName={moveDetailsByName}
                                    moveDetailsLoading={moveDetailsLoading}
                                    offenseMult
                                  />
                                ) : null}
                              </>
                            ) : (
                              <p className="muted battle-prep-sub">{t('battle.prepNoOffensiveCoverage')}</p>
                            )}
                          </div>
                        </details>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </>
        ) : null}

        {activeTab === 'stats' ? (
          <div className="battle-prep-stats-body">
            {includePcControl}
            <BattlePrepStatsTable
              team={team}
              pc={pc}
              enemySlots={enemySlots}
              levelCap={levelCap}
              includePc={includePc}
            />
          </div>
        ) : null}
      </div>
    </section>
  )
}

function ThreatsByEnemyList({
  threats,
  label,
  enemyBySlotId,
  moveDetailsByName,
  moveDetailsLoading,
  offenseMult = false,
}: {
  threats: Array<{
    enemySlotId: string
    enemyName: string
    multiplier: number
    attackType: PokemonType
    moveName: string
  }>
  label: string
  enemyBySlotId: Map<string, PokemonSlot>
  moveDetailsByName: Record<string, MoveDetails | null>
  moveDetailsLoading: boolean
  offenseMult?: boolean
}) {
  const { t } = useI18n()
  const groups = useMemo(() => groupThreatsByEnemy(threats), [threats])

  if (groups.length === 0) return null

  const multClass = (tier: string) =>
    offenseMult ? `coverage-offense-${tier}` : `coverage-defense-${tier}`

  return (
    <div className="battle-prep-threat-group">
      <span className="battle-prep-weakness-label">{label}</span>
      <ul className="battle-prep-enemy-threat-groups">
        {groups.map((group) => {
          const enemy = enemyBySlotId.get(group.enemySlotId)
          return (
          <li key={group.enemySlotId} className="battle-prep-enemy-threat-group">
            <div className="battle-prep-enemy-threat-head">
              {enemy?.sprite ? (
                <img
                  src={enemy.sprite}
                  alt=""
                  loading="lazy"
                  className="battle-prep-enemy-threat-sprite"
                />
              ) : null}
              <span className="battle-prep-threat-enemy">{group.enemyName}</span>
              <span
                className={`coverage-threat-mult ${multClass(multiplierTier(group.worstMultiplier))}`}
              >
                {formatMultiplier(group.worstMultiplier)}
              </span>
              {group.attacks.length > 1 ? (
                <span className="muted battle-prep-enemy-move-count">
                  {t('battle.prepEnemyMoveCount', { count: group.attacks.length })}
                </span>
              ) : null}
            </div>
            <ul className="battle-prep-enemy-threat-moves">
              {group.attacks.map((attack) => (
                <li key={`${attack.moveName}-${attack.attackType}-${attack.multiplier}`}>
                  <BattlePrepMoveLabel
                    moveName={attack.moveName}
                    details={moveDetailsByName[attack.moveName]}
                    loading={moveDetailsLoading}
                  />
                  <TypeBadge type={attack.attackType} />
                  {group.attacks.length > 1 && attack.multiplier !== group.worstMultiplier ? (
                    <span
                      className={`coverage-threat-mult ${multClass(multiplierTier(attack.multiplier))}`}
                    >
                      {formatMultiplier(attack.multiplier)}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </li>
          )
        })}
      </ul>
    </div>
  )
}
