import { useMemo } from 'react'
import { useI18n } from '@/i18n'
import { calculateAllStats, comparisonNatureForMember, natureStatModifiers } from '@/lib/stats'
import type { PokemonStats } from '@/types/pokemon'
import { STAT_KEYS, STAT_LABELS } from '@/types/pokemon'
import type { PokemonSlot } from '@/types/profile'

const BATTLE_STAT_DEFAULTS = { ivWhenUnset: 0, evWhenUnset: 0 } as const

export interface BattlegroundStatParticipant {
  slot: PokemonSlot | null
  side: 'team' | 'enemy'
}

interface BattlegroundStatsProps {
  participants: BattlegroundStatParticipant[]
}

function calculatedStatsForSlot(slot: PokemonSlot): PokemonStats {
  return calculateAllStats(
    slot.baseStats,
    slot.level,
    slot.ivs,
    slot.evs,
    comparisonNatureForMember(slot),
    BATTLE_STAT_DEFAULTS,
  )
}

function natureRowClass(key: keyof PokemonStats, side: 'team' | 'enemy', nature?: string): string {
  const mod = natureStatModifiers(nature)
  if (!mod) return ''
  if (mod.boost === key) {
    return side === 'team' ? 'battle-stat-nature-left' : 'battle-stat-nature-right'
  }
  if (mod.reduce === key) {
    return side === 'team' ? 'battle-stat-nature-left' : 'battle-stat-nature-right'
  }
  return ''
}

function cellWinClass(
  value: number,
  cells: Array<{ value: number; side: 'team' | 'enemy' }>,
  side: 'team' | 'enemy',
): string {
  const max = Math.max(...cells.map((cell) => cell.value))
  if (max <= 0 || value < max) return ''
  const winners = cells.filter((cell) => cell.value === max)
  if (winners.length !== 1 || winners[0].side !== side) return ''
  return side === 'team' ? 'battle-stat-win-left' : 'battle-stat-win-right'
}

function statValueClasses(
  key: keyof PokemonStats,
  participant: BattlegroundStatParticipant,
  value: number,
  rowCells: Array<{ value: number; side: 'team' | 'enemy' }>,
): string {
  return [
    'battleground-stat-value',
    participant.side === 'enemy' ? 'battleground-stat-value-right' : '',
    natureRowClass(key, participant.side, participant.slot?.nature),
    cellWinClass(value, rowCells, participant.side),
  ]
    .filter(Boolean)
    .join(' ')
}

export function BattlegroundStats({ participants }: BattlegroundStatsProps) {
  const { t } = useI18n()

  const rows = useMemo(
    () =>
      participants.map((participant) => ({
        participant,
        stats: participant.slot ? calculatedStatsForSlot(participant.slot) : undefined,
        label: participant.slot
          ? (participant.slot.nickname ?? participant.slot.displayName)
          : participant.side === 'team'
            ? t('battle.yourStats')
            : t('battle.enemyStats'),
      })),
    [participants, t],
  )

  if (rows.every((row) => !row.participant.slot)) return null

  const usePairLayout = rows.length === 2
  const left = rows[0]
  const right = rows[1]

  return (
    <div className="battleground-stats" aria-label={t('battle.statsCompare')}>
      {usePairLayout ? (
        <div className="battleground-stats--desktop">
          <div className="battleground-stats-head" aria-hidden="true">
            <span className="battleground-stats-side-label">{t('battle.yourStats')}</span>
            <span />
            <span className="battleground-stats-side-label battleground-stats-side-label-right">
              {t('battle.enemyStats')}
            </span>
          </div>
          <dl className="battleground-stats-rows">
            {STAT_KEYS.map((key) => {
              const leftValue = left.stats?.[key] ?? 0
              const rightValue = right.stats?.[key] ?? 0
              const rowCells = [
                { value: leftValue, side: 'team' as const },
                { value: rightValue, side: 'enemy' as const },
              ]
              return (
                <div key={key} className="battleground-stat-row">
                  <dd
                    className={statValueClasses(key, left.participant, leftValue, rowCells)}
                  >
                    {left.participant.slot ? leftValue : '—'}
                  </dd>
                  <dt className="battleground-stat-label">{STAT_LABELS[key]}</dt>
                  <dd
                    className={statValueClasses(key, right.participant, rightValue, rowCells)}
                  >
                    {right.participant.slot ? rightValue : '—'}
                  </dd>
                </div>
              )
            })}
          </dl>
        </div>
      ) : null}

      <div
        className={`battleground-stats--mobile${usePairLayout ? '' : ' battleground-stats--mobile-only'}`}
      >
        <div className="table-wrap battleground-stats-scroll">
          <table
            className={`stats-compare-mobile battleground-stats-mobile${rows.length > 2 ? ' battleground-stats-mobile--wide' : ''}`}
          >
            <thead>
              <tr>
                <th className="stats-compare-mobile-corner" scope="col">
                  <span aria-hidden="true" />
                </th>
                {rows.map((row, index) => (
                  <th
                    key={`${row.participant.side}-${row.participant.slot?.slotId ?? index}`}
                    scope="col"
                    className={`stats-compare-mobile-pokemon battle-stats-row-${row.participant.side === 'team' ? 'team' : 'enemy'}`}
                    title={row.label}
                  >
                    {row.participant.slot ? (
                      <img src={row.participant.slot.sprite} alt={row.label} loading="lazy" />
                    ) : (
                      <span className="battleground-stats-mobile-empty" aria-hidden="true">
                        —
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {STAT_KEYS.map((key) => {
                const rowCells = rows.map((row) => ({
                  value: row.stats?.[key] ?? 0,
                  side: row.participant.side,
                }))
                return (
                  <tr key={key}>
                    <th scope="row" className="stats-compare-mobile-stat-label">
                      {STAT_LABELS[key]}
                    </th>
                    {rows.map((row, index) => {
                      const value = row.stats?.[key] ?? 0
                      return (
                        <td
                          key={`${row.participant.side}-${row.participant.slot?.slotId ?? index}-${key}`}
                          className={[
                            row.participant.side === 'team'
                              ? 'battle-stats-row-team'
                              : 'battle-stats-row-enemy',
                            statValueClasses(key, row.participant, value, rowCells),
                          ].join(' ')}
                        >
                          {row.participant.slot ? value : '—'}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
