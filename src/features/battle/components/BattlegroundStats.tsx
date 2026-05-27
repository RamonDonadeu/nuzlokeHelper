import { useMemo } from 'react'
import { useI18n } from '@/i18n'
import { calculateAllStats, comparisonNatureForMember, natureStatModifiers } from '@/lib/stats'
import type { PokemonStats } from '@/types/pokemon'
import { STAT_KEYS, STAT_LABELS } from '@/types/pokemon'
import type { PokemonSlot } from '@/types/profile'

const BATTLE_STAT_DEFAULTS = { ivWhenUnset: 0, evWhenUnset: 0 } as const

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

interface BattlegroundStatsProps {
  left: PokemonSlot | null
  right: PokemonSlot | null
}

function natureRowClass(key: keyof PokemonStats, side: 'left' | 'right', nature?: string): string {
  const mod = natureStatModifiers(nature)
  if (!mod) return ''
  if (mod.boost === key) return side === 'left' ? 'battle-stat-nature-left' : 'battle-stat-nature-right'
  if (mod.reduce === key) return side === 'left' ? 'battle-stat-nature-left' : 'battle-stat-nature-right'
  return ''
}

function winnerClass(leftValue: number, rightValue: number, side: 'left' | 'right'): string {
  if (leftValue > rightValue) return side === 'left' ? 'battle-stat-win-left' : ''
  if (rightValue > leftValue) return side === 'right' ? 'battle-stat-win-right' : ''
  return ''
}

export function BattlegroundStats({ left, right }: BattlegroundStatsProps) {
  const { t } = useI18n()

  const leftStats = useMemo(() => (left ? calculatedStatsForSlot(left) : undefined), [left])
  const rightStats = useMemo(() => (right ? calculatedStatsForSlot(right) : undefined), [right])

  if (!left && !right) return null

  return (
    <div className="battleground-stats" aria-label={t('battle.statsCompare')}>
      <div className="battleground-stats-head" aria-hidden="true">
        <span className="battleground-stats-side-label">{t('battle.yourStats')}</span>
        <span />
        <span className="battleground-stats-side-label battleground-stats-side-label-right">
          {t('battle.enemyStats')}
        </span>
      </div>
      <dl className="battleground-stats-rows">
        {STAT_KEYS.map((key) => {
          const leftValue = leftStats?.[key] ?? 0
          const rightValue = rightStats?.[key] ?? 0
          return (
            <div key={key} className="battleground-stat-row">
              <dd
                className={[
                  'battleground-stat-value',
                  natureRowClass(key, 'left', left?.nature),
                  winnerClass(leftValue, rightValue, 'left'),
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {left ? leftValue : '—'}
              </dd>
              <dt className="battleground-stat-label">{STAT_LABELS[key]}</dt>
              <dd
                className={[
                  'battleground-stat-value',
                  'battleground-stat-value-right',
                  natureRowClass(key, 'right', right?.nature),
                  winnerClass(leftValue, rightValue, 'right'),
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {right ? rightValue : '—'}
              </dd>
            </div>
          )
        })}
      </dl>
    </div>
  )
}
