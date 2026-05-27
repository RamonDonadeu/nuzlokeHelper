import type { PokemonStats } from '@/types/pokemon'
import { STAT_KEYS, STAT_LABELS, totalStats } from '@/types/pokemon'
import { natureStatModifiers } from '@/lib/stats'
import { useI18n } from '@/i18n'

interface PokemonStatGridProps {
  stats: PokemonStats
  title?: string
  showTotal?: boolean
  /** When set, boosted (+10%) and lowered (-10%) stats are highlighted. */
  nature?: string
}

function natureRowClass(key: keyof PokemonStats, nature?: string): string | undefined {
  const mod = natureStatModifiers(nature)
  if (!mod) return undefined
  if (mod.boost === key) return 'stat-boosted-nature'
  if (mod.reduce === key) return 'stat-lowered-nature'
  return undefined
}

export function PokemonStatGrid({ stats, title, showTotal = true, nature }: PokemonStatGridProps) {
  const { t } = useI18n()

  return (
    <div className="stat-grid-block">
      {title && <h4>{title}</h4>}
      <div className="stat-grid">
        {STAT_KEYS.map((key) => {
          const natureClass = natureRowClass(key, nature)
          return (
          <div key={key} className={['stat-row', natureClass].filter(Boolean).join(' ')}>
            <span>{STAT_LABELS[key]}</span>
            <div className="stat-bar-wrap">
              <div
                className="stat-bar"
                style={{ width: `${Math.min(stats[key] / 255, 1) * 100}%` }}
              />
            </div>
            <strong>{stats[key]}</strong>
          </div>
          )
        })}
        {showTotal && (
          <div className="stat-total">
            <span>{t('pokemon.statTotal')}</span>
            <strong>{totalStats(stats)}</strong>
          </div>
        )}
      </div>
    </div>
  )
}
