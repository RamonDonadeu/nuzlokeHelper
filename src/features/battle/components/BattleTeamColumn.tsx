import type { PokemonSlot } from '@/types/profile'
import { useI18n } from '@/i18n'
import type { ReactNode } from 'react'

interface BattleTeamColumnProps {
  title: string
  side: 'left' | 'right'
  slots: Array<PokemonSlot | null>
  activeIndices: Array<number | null>
  faintedIndices: Set<number>
  selectedActiveSlot: number
  onFilledSlotClick?: (index: number) => void
  onEmptySlotClick?: (index: number) => void
  actions?: ReactNode
}

export function BattleTeamColumn({
  title,
  side,
  slots,
  activeIndices,
  faintedIndices,
  selectedActiveSlot,
  onFilledSlotClick,
  onEmptySlotClick,
  actions,
}: BattleTeamColumnProps) {
  const { t } = useI18n()

  return (
    <aside className={`card battle-team-column battle-team-column-${side}`}>
      <div className="battle-team-column-header">
        <h3>{title}</h3>
        {actions}
      </div>
      <ul className="battle-team-list">
        {slots.map((slot, index) => {
          if (!slot) {
            return (
              <li key={`${side}-empty-${index}`}>
                <button
                  type="button"
                  className="battle-team-slot empty"
                  onClick={() => onEmptySlotClick?.(index)}
                >
                  {t('battle.emptyEnemySlot', { n: index + 1 })}
                </button>
              </li>
            )
          }

          const isFainted = faintedIndices.has(index)

          return (
            <li key={slot.slotId}>
              {activeIndices
                .map((activeIndex, activeSlot) => ({ activeIndex, activeSlot }))
                .filter(({ activeIndex }) => activeIndex === index)
                .map(({ activeSlot }) => (
                  <span
                    key={`${slot.slotId}-active-${activeSlot}`}
                    className={`battle-slot-chip${selectedActiveSlot === activeSlot ? ' selected' : ''}`}
                  >
                    {activeSlot + 1}
                  </span>
                ))}
              <button
                type="button"
                className={`battle-team-slot${activeIndices.includes(index) ? ' active' : ''}${isFainted ? ' fainted' : ''}`}
                disabled={isFainted}
                onClick={() => {
                  if (isFainted) return
                  onFilledSlotClick?.(index)
                }}
              >
                <img src={slot.sprite} alt={slot.displayName} loading="lazy" />
                <span>{slot.nickname ?? slot.displayName}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
