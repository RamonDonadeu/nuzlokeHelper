import type { EvolutionStage, PokemonStats, PokemonSummary } from '@/types/pokemon'
import type { PokemonSlot } from '@/types/profile'
import {
  comparisonNatureForMember,
  comparisonStatsForCandidate,
  comparisonStatsForMember,
  hasCustomEv,
  hasCustomIv,
  memberHasCustomBuild,
  natureStatModifiers,
} from '@/lib/stats'
import { STAT_KEYS, STAT_LABELS, totalStats } from '@/types/pokemon'
import { useI18n } from '@/i18n'
import { CustomStatMarker } from '@/components/CustomStatMarker'
import { InfoTooltip } from '@/components/InfoTooltip'

interface StatComparisonProps {
  team: PokemonSlot[]
  levelCap: number
  candidate?: PokemonSummary
  evolutions?: EvolutionStage[]
  onEvolutionSelect?: (name: string) => void
  teamOnly?: boolean
  onBack?: () => void
}

interface StrongestMember {
  member: PokemonSlot
  stats: PokemonStats
  total: number
}

type ComparisonRow =
  | { kind: 'candidate'; stats: PokemonStats; total: number }
  | { kind: 'member'; member: PokemonSlot; stats: PokemonStats; total: number }

function matchesCandidate(member: PokemonSlot, candidateId: number): boolean {
  return member.currentSpeciesId === candidateId || member.speciesId === candidateId
}

function teamForComparison(team: PokemonSlot[], candidateId: number): PokemonSlot[] {
  return team.filter((member) => !matchesCandidate(member, candidateId))
}

function buildMemberComparisonRows(team: PokemonSlot[], levelCap: number): ComparisonRow[] {
  return team
    .map((member) => {
      const stats = comparisonStatsForMember(member.baseStats, levelCap, member)
      return { kind: 'member' as const, member, stats, total: totalStats(stats) }
    })
    .sort((a, b) => b.total - a.total)
}

function buildComparisonRows(
  candidateStats: PokemonStats,
  candidateTotal: number,
  team: PokemonSlot[],
  levelCap: number,
): ComparisonRow[] {
  const rows: ComparisonRow[] = [
    { kind: 'candidate', stats: candidateStats, total: candidateTotal },
    ...buildMemberComparisonRows(team, levelCap),
  ]
  return rows.sort((a, b) => b.total - a.total)
}

function findStrongestMember(team: PokemonSlot[], levelCap: number): StrongestMember | null {
  if (team.length === 0) return null

  let strongest: StrongestMember = {
    member: team[0],
    stats: comparisonStatsForMember(team[0].baseStats, levelCap, team[0]),
    total: 0,
  }
  strongest.total = totalStats(strongest.stats)

  for (let i = 1; i < team.length; i++) {
    const member = team[i]
    const stats = comparisonStatsForMember(member.baseStats, levelCap, member)
    const memberTotal = totalStats(stats)
    if (memberTotal > strongest.total) {
      strongest = { member, stats, total: memberTotal }
    }
  }

  return strongest
}

function diffClass(value: number): string {
  if (value > 0) return 'positive'
  if (value < 0) return 'negative'
  return 'neutral'
}

function formatSignedDiff(value: number): string {
  return `${value >= 0 ? '+' : ''}${value}`
}

function memberLabel(member: PokemonSlot): string {
  return member.nickname ?? member.displayName
}

function hasCustomStat(member: PokemonSlot, key: keyof PokemonStats): boolean {
  return hasCustomIv(member, key) || hasCustomEv(member, key)
}

function natureCellClass(member: PokemonSlot, key: keyof PokemonStats): string | undefined {
  const mod = natureStatModifiers(comparisonNatureForMember(member))
  if (!mod) return undefined
  if (mod.boost === key) return 'stat-boosted-nature'
  if (mod.reduce === key) return 'stat-lowered-nature'
  return undefined
}

export function StatComparison({
  candidate,
  evolutions = [],
  team,
  levelCap,
  onEvolutionSelect,
  teamOnly = false,
  onBack,
}: StatComparisonProps) {
  const { t } = useI18n()
  const comparisonTeam = teamOnly
    ? team
    : candidate
      ? teamForComparison(team, candidate.id)
      : team
  const strongest = findStrongestMember(comparisonTeam, levelCap)
  const teamTotals = comparisonTeam.map((member) =>
    totalStats(comparisonStatsForMember(member.baseStats, levelCap, member)),
  )
  const teamAverage = comparisonTeam.length
    ? Math.round(teamTotals.reduce((sum, value) => sum + value, 0) / comparisonTeam.length)
    : null

  const candidateStats =
    candidate !== undefined ? comparisonStatsForCandidate(candidate.stats, levelCap) : null
  const candidateTotal = candidateStats ? totalStats(candidateStats) : 0
  const comparisonRows = teamOnly
    ? buildMemberComparisonRows(comparisonTeam, levelCap)
    : candidateStats !== null
      ? buildComparisonRows(candidateStats, candidateTotal, comparisonTeam, levelCap)
      : []

  const finalEvolution = evolutions[evolutions.length - 1]
  const finalEvolutionStats =
    finalEvolution !== undefined
      ? comparisonStatsForCandidate(finalEvolution.stats, levelCap)
      : null
  const finalEvolutionTotal = finalEvolutionStats ? totalStats(finalEvolutionStats) : 0

  const showEvolutionInsight =
    !teamOnly &&
    candidate !== undefined &&
    finalEvolution &&
    finalEvolution.name !== candidate.name &&
    strongest !== null

  const totalDiffVsStrongest = strongest ? candidateTotal - strongest.total : 0
  const scaledStatsHint = t('compare.scaledStatsHint', { level: levelCap })

  return (
    <section className="card">
      <div className="section-header">
        <div>
          {teamOnly && onBack ? (
            <div className="section-header-with-back">
              <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>
                ← {t('compare.teamStatsBack')}
              </button>
              <h3>{t('compare.teamStats')}</h3>
            </div>
          ) : (
            <h3>{t('compare.vsTeam')}</h3>
          )}
          {comparisonTeam.length === 0 && <p className="muted">{t('compare.addTeamFirst')}</p>}
        </div>
        <InfoTooltip label={t('compare.scaledStatsHintLabel')} text={scaledStatsHint} />
      </div>

      {comparisonTeam.length > 0 && (
        <>
          <div className="comparison-summary">
            {!teamOnly && candidateStats !== null && (
              <div>
                <span className="muted">{t('compare.candidateTotal')}</span>
                <strong>{candidateTotal}</strong>
              </div>
            )}
            {teamOnly && strongest && (
              <div>
                <span className="muted">
                  {t('compare.strongestOnTeam', { name: memberLabel(strongest.member) })}
                </span>
                <strong>{strongest.total}</strong>
              </div>
            )}
            {!teamOnly && strongest && (
              <div className="comparison-summary-primary">
                <span className="muted">
                  {t('compare.strongestOnTeam', { name: memberLabel(strongest.member) })}
                </span>
                <strong className={diffClass(totalDiffVsStrongest)}>
                  {strongest.total} ({formatSignedDiff(totalDiffVsStrongest)})
                </strong>
              </div>
            )}
            {teamAverage !== null && (
              <div className={teamOnly ? undefined : 'comparison-summary-secondary'}>
                <span className="muted">{t('compare.teamAverage')}</span>
                <strong>{teamAverage}</strong>
              </div>
            )}
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Pokémon</th>
                  {STAT_KEYS.map((key) => (
                    <th key={key}>{STAT_LABELS[key]}</th>
                  ))}
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => {
                  if (row.kind === 'candidate') {
                    if (!candidate) return null
                    return (
                      <tr key="candidate" className="candidate-row">
                        <td>
                          <div className="table-pokemon">
                            <img src={candidate.sprite} alt="" />
                            <span>
                              {candidate.displayName}
                              <span className="tag candidate-tag">{t('compare.searched')}</span>
                            </span>
                          </div>
                        </td>
                        {STAT_KEYS.map((key) => {
                          const diff = strongest ? row.stats[key] - strongest.stats[key] : 0
                          return (
                            <td key={key} className={strongest ? diffClass(diff) : undefined}>
                              {row.stats[key]}
                            </td>
                          )
                        })}
                        <td className={strongest ? diffClass(totalDiffVsStrongest) : undefined}>
                          {row.total}
                        </td>
                      </tr>
                    )
                  }

                  const { member, stats, total: memberTotal } = row
                  const isStrongest = strongest !== null && member.slotId === strongest.member.slotId
                  const hasCustomBuild = memberHasCustomBuild(member)
                  return (
                    <tr key={member.slotId} className={isStrongest ? 'strongest-row' : undefined}>
                      <td>
                        <div className="table-pokemon">
                          <img src={member.sprite} alt="" />
                          <span>
                            {memberLabel(member)}
                            {hasCustomBuild && (
                              <span className="tag custom-build-tag">{t('compare.customBuild')}</span>
                            )}
                          </span>
                        </div>
                      </td>
                      {STAT_KEYS.map((key) => {
                          const natureClass = natureCellClass(member, key)
                          return (
                          <td key={key} className={natureClass}>
                            {stats[key]}
                            {hasCustomStat(member, key) && (
                              <CustomStatMarker label={t('compare.customStatLegend')} />
                            )}
                          </td>
                          )
                        })}
                      <td>{memberTotal}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!teamOnly && evolutions.length > 0 && candidate !== undefined && (
        <div className="evolution-section">
          <h4>{t('compare.evolutionLine')}</h4>
          <div className="evolution-grid">
            {evolutions.map((stage) => {
              const stageStats = comparisonStatsForCandidate(stage.stats, levelCap)
              const stageTotal = totalStats(stageStats)
              const diffFromCandidate = stageTotal - candidateTotal
              const diffFromStrongest =
                strongest !== null ? stageTotal - strongest.total : null
              const strongestName = strongest ? memberLabel(strongest.member) : ''

              const isCurrent = stage.name === candidate.name
              const cardClassName = `evolution-card${onEvolutionSelect ? ' evolution-card-interactive' : ''}${isCurrent ? ' evolution-card-current' : ''}`
              const cardContent = (
                <>
                  <img src={stage.sprite} alt={stage.displayName} />
                  <strong>{stage.displayName}</strong>
                  <div className="type-row">
                    {stage.types.map((type) => (
                      <span key={type} className={`type-badge type-${type}`}>
                        {type}
                      </span>
                    ))}
                  </div>
                  <p>
                    {t('compare.total')} {stageTotal}
                  </p>
                  {stage.name !== candidate.name && (
                    <p className={`evolution-diff ${diffClass(diffFromCandidate)}`}>
                      {formatSignedDiff(diffFromCandidate)} vs {candidate.displayName}
                    </p>
                  )}
                  {diffFromStrongest !== null && stage.name !== candidate.name && (
                    <p className={`evolution-diff ${diffClass(diffFromStrongest)}`}>
                      {t('compare.evolutionVsStrongest', {
                        diff: formatSignedDiff(diffFromStrongest),
                        name: strongestName,
                      })}
                    </p>
                  )}
                </>
              )

              return onEvolutionSelect ? (
                <button
                  key={stage.id}
                  type="button"
                  className={cardClassName}
                  onClick={() => onEvolutionSelect(stage.name)}
                >
                  {cardContent}
                </button>
              ) : (
                <article key={stage.id} className={cardClassName}>
                  {cardContent}
                </article>
              )
            })}
          </div>

          {showEvolutionInsight && finalEvolution && strongest && finalEvolutionStats && candidate && (
            <p className="insight-box">
              {t('compare.insightWeaker', {
                candidate: candidate.displayName,
                candidateTotal,
                final: finalEvolution.displayName,
                finalTotal: finalEvolutionTotal,
              })}
              {finalEvolutionTotal > strongest.total
                ? t('compare.insightAboveStrongest', {
                    name: memberLabel(strongest.member),
                    total: strongest.total,
                  })
                : finalEvolutionTotal < strongest.total
                  ? t('compare.insightBelowStrongest', {
                      name: memberLabel(strongest.member),
                      total: strongest.total,
                    })
                  : '.'}
            </p>
          )}
        </div>
      )}
    </section>
  )
}
