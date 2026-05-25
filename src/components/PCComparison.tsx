import { useMemo, useState } from 'react'
import type { PokemonStats } from '@/types/pokemon'
import type { PokemonSlot } from '@/types/profile'
import {
  comparisonStatsForMember,
  hasCustomEv,
  hasCustomIv,
  memberHasCustomBuild,
} from '@/lib/stats'
import { STAT_KEYS, STAT_LABELS, totalStats } from '@/types/pokemon'
import { useI18n } from '@/i18n'
import { CustomStatMarker } from '@/components/CustomStatMarker'
import { InfoTooltip } from '@/components/InfoTooltip'

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

export function PCComparison({ box, team, levelCap }: PCComparisonProps) {
  const { t } = useI18n()
  const [showBaseStats, setShowBaseStats] = useState(false)
  const rows = useMemo(
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
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Pokémon</th>
                {STAT_KEYS.map((key) => (
                  <th key={key}>{STAT_LABELS[key]}</th>
                ))}
                <th>{t('compare.total')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                  const { source, member, stats, total: rowTotal } = row
                  const isPc = source === 'pc'
                  const isStrongestTeam =
                    strongestTeam !== null && member.slotId === strongestTeam.member.slotId
                  const hasCustomBuild = memberHasCustomBuild(member)
                  const totalDiffVsTeamStrongest =
                    isPc && strongestTeam ? rowTotal - strongestTeam.total : 0

                  const rowClass = isPc
                    ? 'pc-comparison-row'
                    : isStrongestTeam
                      ? 'strongest-row'
                      : 'pc-comparison-team-row'

                  return (
                    <tr key={`${source}-${member.slotId}`} className={rowClass}>
                      <td>
                        <div className="table-pokemon">
                          <img src={member.sprite} alt="" />
                          <span>
                            {memberLabel(member)}
                            <span className={`tag ${isPc ? 'pc-tag' : 'team-tag'}`}>
                              {isPc ? t('compare.pcTag') : t('compare.teamTag')}
                            </span>
                            {hasCustomBuild && (
                              <span className="tag custom-build-tag">{t('compare.customBuild')}</span>
                            )}
                          </span>
                        </div>
                      </td>
                      {STAT_KEYS.map((key) => {
                        const diff =
                          isPc && strongestTeam ? stats[key] - strongestTeam.stats[key] : null

                        return (
                          <td
                            key={key}
                            className={diff !== null ? diffClass(diff) : undefined}
                          >
                            {stats[key]}
                            {!showBaseStats && hasCustomStat(member, key) && (
                              <CustomStatMarker label={t('compare.customStatLegend')} />
                            )}
                          </td>
                        )
                      })}
                      <td
                        className={
                          isPc && strongestTeam ? diffClass(totalDiffVsTeamStrongest) : undefined
                        }
                      >
                        {rowTotal}
                        {isPc && strongestTeam && (
                          <span className="pc-comparison-diff muted">
                            {' '}
                            ({formatSignedDiff(totalDiffVsTeamStrongest)})
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
