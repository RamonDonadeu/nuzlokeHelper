import { useMemo, useState } from 'react'
import type { PokemonStats } from '@/types/pokemon'
import type { PokemonSlot } from '@/types/profile'
import {
  comparisonStatsForMember,
  hasCustomEv,
  hasCustomIv,
  memberHasCustomBuild,
} from '@/lib/stats'
import { totalStats } from '@/types/pokemon'
import { useI18n } from '@/i18n'
import { CustomStatMarker } from '@/features/team/components/CustomStatMarker'
import { InfoTooltip } from '@/shared/components/InfoTooltip'
import {
  StatsComparisonTable,
  type StatsCompareRow,
} from '@/shared/components/StatsComparisonTable'

interface PCComparisonProps {
  box: PokemonSlot[]
  team: PokemonSlot[]
  levelCap: number
}

interface ComparisonRow {
  source: 'pc' | 'team'
  member: PokemonSlot
  stats: PokemonStats
  total: number
}

interface StrongestMember {
  member: PokemonSlot
  stats: PokemonStats
  total: number
}

function memberLabel(member: PokemonSlot): string {
  return member.nickname ?? member.displayName
}

function diffClass(value: number): string {
  if (value > 0) return 'positive'
  if (value < 0) return 'negative'
  return 'neutral'
}

function formatSignedDiff(value: number): string {
  return `${value >= 0 ? '+' : ''}${value}`
}

function statsForComparison(
  member: PokemonSlot,
  levelCap: number,
  useBaseStats: boolean,
): PokemonStats {
  if (useBaseStats) return member.baseStats
  return comparisonStatsForMember(member.baseStats, levelCap, member)
}

function buildRows(
  box: PokemonSlot[],
  team: PokemonSlot[],
  levelCap: number,
  useBaseStats: boolean,
): ComparisonRow[] {
  const rows: ComparisonRow[] = [
    ...box.map((member) => {
      const stats = statsForComparison(member, levelCap, useBaseStats)
      return { source: 'pc' as const, member, stats, total: totalStats(stats) }
    }),
    ...team.map((member) => {
      const stats = statsForComparison(member, levelCap, useBaseStats)
      return { source: 'team' as const, member, stats, total: totalStats(stats) }
    }),
  ]
  return rows.sort((a, b) => b.total - a.total)
}

function findStrongest(
  members: PokemonSlot[],
  levelCap: number,
  useBaseStats: boolean,
): StrongestMember | null {
  if (members.length === 0) return null

  let strongest: StrongestMember = {
    member: members[0],
    stats: statsForComparison(members[0], levelCap, useBaseStats),
    total: 0,
  }
  strongest.total = totalStats(strongest.stats)

  for (let i = 1; i < members.length; i++) {
    const member = members[i]
    const stats = statsForComparison(member, levelCap, useBaseStats)
    const memberTotal = totalStats(stats)
    if (memberTotal > strongest.total) {
      strongest = { member, stats, total: memberTotal }
    }
  }

  return strongest
}

function hasCustomStat(member: PokemonSlot, key: keyof PokemonStats): boolean {
  return hasCustomIv(member, key) || hasCustomEv(member, key)
}

function rowClassForPcRow(row: ComparisonRow, strongestTeam: StrongestMember | null): string {
  if (row.source === 'pc') return 'pc-comparison-row'
  const isStrongestTeam =
    strongestTeam !== null && row.member.slotId === strongestTeam.member.slotId
  return isStrongestTeam ? 'strongest-row' : 'pc-comparison-team-row'
}

function toCompareRows(
  rows: ComparisonRow[],
  strongestTeam: StrongestMember | null,
): StatsCompareRow[] {
  return rows.map((row) => ({
    id: `${row.source}-${row.member.slotId}`,
    sprite: row.member.sprite,
    ariaLabel: memberLabel(row.member),
    rowClass: rowClassForPcRow(row, strongestTeam),
    stats: row.stats,
    total: row.total,
    source: row.source,
    member: row.member,
  }))
}

export function PCComparison({ box, team, levelCap }: PCComparisonProps) {
  const { t } = useI18n()
  const [showBaseStats, setShowBaseStats] = useState(false)
  const comparisonRows = useMemo(
    () => buildRows(box, team, levelCap, showBaseStats),
    [box, team, levelCap, showBaseStats],
  )
  const strongestTeam = useMemo(
    () => findStrongest(team, levelCap, showBaseStats),
    [team, levelCap, showBaseStats],
  )
  const statsHint = showBaseStats
    ? t('compare.baseStatsHint')
    : t('compare.scaledStatsHint', { level: levelCap })
  const hasComparisonContent = box.length > 0 || team.length > 0
  const rows = toCompareRows(comparisonRows, strongestTeam)

  const statDiff = (row: StatsCompareRow, statKey: keyof PokemonStats): number | null => {
    if (row.source !== 'pc' || !strongestTeam) return null
    return row.stats[statKey] - strongestTeam.stats[statKey]
  }

  const totalDiff = (row: StatsCompareRow): number | null => {
    if (row.source !== 'pc' || !strongestTeam) return null
    return row.total - strongestTeam.total
  }

  return (
    <section className="card pc-comparison">
      <div className="pc-comparison-header">
        <h3>{t('compare.pcVsTeam')}</h3>
        <div className="pc-comparison-header-actions">
          <label className="toggle-switch">
            <span className="toggle-switch-label">{t('editor.useBaseStats')}</span>
            <input
              type="checkbox"
              role="switch"
              checked={showBaseStats}
              onChange={(event) => setShowBaseStats(event.target.checked)}
              aria-label={t('editor.useBaseStats')}
            />
            <span className="toggle-switch-track" aria-hidden="true" />
          </label>
          <InfoTooltip label={t('compare.scaledStatsHintLabel')} text={statsHint} />
        </div>
      </div>

      {hasComparisonContent && (
        <StatsComparisonTable
          rows={rows}
          labels={{ pokemon: 'Pokémon', total: t('compare.total') }}
          renderPokemonCell={(row) => {
            const isPc = row.source === 'pc'
            const hasCustomBuild = row.member ? memberHasCustomBuild(row.member) : false
            return (
              <span>
                {row.ariaLabel}
                <span className={`tag ${isPc ? 'pc-tag' : 'team-tag'}`}>
                  {isPc ? t('compare.pcTag') : t('compare.teamTag')}
                </span>
                {hasCustomBuild && (
                  <span className="tag custom-build-tag">{t('compare.customBuild')}</span>
                )}
              </span>
            )
          }}
          renderStatCell={(row, statKey) => (
            <>
              {row.stats[statKey]}
              {!showBaseStats && row.member && hasCustomStat(row.member, statKey) && (
                <CustomStatMarker label={t('compare.customStatLegend')} />
              )}
            </>
          )}
          statCellClassName={(row, statKey) => {
            const diff = statDiff(row, statKey)
            return diff !== null ? diffClass(diff) : undefined
          }}
          renderTotalCell={(row) => {
            const diff = totalDiff(row)
            const isPc = row.source === 'pc'
            return (
              <>
                {row.total}
                {isPc && strongestTeam && diff !== null && (
                  <span className="pc-comparison-diff muted">
                    {' '}
                    ({formatSignedDiff(diff)})
                  </span>
                )}
              </>
            )
          }}
          totalCellClassName={(row) => {
            const diff = totalDiff(row)
            return diff !== null ? diffClass(diff) : undefined
          }}
        />
      )}
    </section>
  )
}
