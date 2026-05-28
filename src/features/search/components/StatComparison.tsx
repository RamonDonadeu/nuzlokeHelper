import type { PokemonStats, PokemonSummary } from '@/types/pokemon'
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
import { totalStats } from '@/types/pokemon'
import { useI18n } from '@/i18n'
import { CustomStatMarker } from '@/features/team/components/CustomStatMarker'
import { InfoTooltip } from '@/shared/components/InfoTooltip'
import {
  StatsComparisonTable,
  type StatsCompareRow,
} from '@/shared/components/StatsComparisonTable'

interface StatComparisonProps {
  team: PokemonSlot[]
  levelCap: number
  candidate?: PokemonSummary
  threatenedSlotIds?: ReadonlySet<string>
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

function rowClassForComparisonRow(
  row: ComparisonRow,
  strongest: StrongestMember | null,
  threatenedSlotIds: ReadonlySet<string> | undefined,
): string {
  if (row.kind === 'candidate') return 'candidate-row'
  const isStrongest = strongest !== null && row.member.slotId === strongest.member.slotId
  const isThreatened = threatenedSlotIds?.has(row.member.slotId) ?? false
  return [isStrongest ? 'strongest-row' : '', isThreatened ? 'threatened-row' : '']
    .filter(Boolean)
    .join(' ')
}

function toTableRows(
  comparisonRows: ComparisonRow[],
  candidate: PokemonSummary | undefined,
  strongest: StrongestMember | null,
  threatenedSlotIds: ReadonlySet<string> | undefined,
): StatsCompareRow[] {
  const tableRows: StatsCompareRow[] = []
  for (const row of comparisonRows) {
    if (row.kind === 'candidate') {
      if (!candidate) continue
      tableRows.push({
        id: 'candidate',
        kind: 'candidate',
        sprite: candidate.sprite,
        ariaLabel: candidate.displayName,
        rowClass: rowClassForComparisonRow(row, strongest, threatenedSlotIds),
        stats: row.stats,
        total: row.total,
      })
      continue
    }
    tableRows.push({
      id: row.member.slotId,
      kind: 'member',
      member: row.member,
      sprite: row.member.sprite,
      ariaLabel: memberLabel(row.member),
      rowClass: rowClassForComparisonRow(row, strongest, threatenedSlotIds),
      stats: row.stats,
      total: row.total,
    })
  }
  return tableRows
}

export function StatComparison({
  candidate,
  team,
  levelCap,
  threatenedSlotIds,
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
  const candidateStats =
    candidate !== undefined ? comparisonStatsForCandidate(candidate.stats, levelCap) : null
  const candidateTotal = candidateStats ? totalStats(candidateStats) : 0
  const comparisonRows = teamOnly
    ? buildMemberComparisonRows(comparisonTeam, levelCap)
    : candidateStats !== null
      ? buildComparisonRows(candidateStats, candidateTotal, comparisonTeam, levelCap)
      : []

  const totalDiffVsStrongest = strongest ? candidateTotal - strongest.total : 0
  const scaledStatsHint = t('compare.scaledStatsHint', { level: levelCap })
  const rows = toTableRows(comparisonRows, candidate, strongest, threatenedSlotIds)

  return (
    <section className="card">
      <div
        className={
          teamOnly && onBack ? 'section-header section-header-toolbar' : 'section-header'
        }
      >
        {teamOnly && onBack ? (
          <>
            <button
              type="button"
              className="btn btn-ghost btn-sm section-header-back"
              onClick={onBack}
            >
              ← {t('compare.teamStatsBack')}
            </button>
            <h3 className="section-header-title">{t('compare.teamStats')}</h3>
            <InfoTooltip label={t('compare.scaledStatsHintLabel')} text={scaledStatsHint} />
          </>
        ) : (
          <>
            <div className="section-header-title-block">
              <h3>{t('compare.vsTeam')}</h3>
              {comparisonTeam.length === 0 && <p className="muted">{t('compare.addTeamFirst')}</p>}
            </div>
            <InfoTooltip label={t('compare.scaledStatsHintLabel')} text={scaledStatsHint} />
          </>
        )}
      </div>

      {comparisonTeam.length > 0 && (
        <StatsComparisonTable
          rows={rows}
          labels={{ pokemon: 'Pokémon', total: 'Total' }}
          renderPokemonCell={(row) => {
            if (row.kind === 'candidate') {
              return (
                <span>
                  {row.ariaLabel}
                  <span className="tag candidate-tag">{t('compare.searched')}</span>
                </span>
              )
            }
            const member = row.member
            if (!member) return <span>{row.ariaLabel}</span>
            const isThreatened = threatenedSlotIds?.has(member.slotId) ?? false
            const hasCustomBuild = memberHasCustomBuild(member)
            return (
              <span>
                {row.ariaLabel}
                {isThreatened && (
                  <span className="tag tag-warning">{t('matchup.threatWarning')}</span>
                )}
                {hasCustomBuild && (
                  <span className="tag custom-build-tag">{t('compare.customBuild')}</span>
                )}
              </span>
            )
          }}
          renderStatCell={(row, statKey) => {
            if (row.kind === 'candidate') {
              return row.stats[statKey]
            }
            const member = row.member
            if (!member) return row.stats[statKey]
            return (
              <>
                {row.stats[statKey]}
                {hasCustomStat(member, statKey) && (
                  <CustomStatMarker label={t('compare.customStatLegend')} />
                )}
              </>
            )
          }}
          statCellClassName={(row, statKey) => {
            if (row.kind === 'candidate') {
              const diff = strongest ? row.stats[statKey] - strongest.stats[statKey] : 0
              return strongest ? diffClass(diff) : undefined
            }
            const member = row.member
            return member ? natureCellClass(member, statKey) : undefined
          }}
          renderTotalCell={(row) => row.total}
          totalCellClassName={(row) => {
            if (row.kind === 'candidate' && strongest) {
              return diffClass(totalDiffVsStrongest)
            }
            return undefined
          }}
        />
      )}
    </section>
  )
}
