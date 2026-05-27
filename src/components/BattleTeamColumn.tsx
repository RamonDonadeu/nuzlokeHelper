import type { PokemonSlot } from '@/types/profile'
import { useI18n } from '@/i18n'

interface BattleTeamColumnProps {
  title: string
  side: 'left' | 'right'
  slots: Array<PokemonSlot | null>
  activeIndex: number | null
  onSlotClick: (index: number) => void
  onEmptySlotClick?: (index: number) => void
}

export function BattleTeamColumn({
  title,
  side,
  slots,
  activeIndex,
  onSlotClick,
  onEmptySlotClick,
}: BattleTeamColumnProps) {
  const { t } = useI18n()

  return (
    <aside className={`card battle-team-column battle-team-column-${side}`}>
      <h3>{title}</h3>
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

          return (
            <li key={slot.slotId}>
              <button
                type="button"
                className={`battle-team-slot${activeIndex === index ? ' active' : ''}`}
                onClick={() => onSlotClick(index)}
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
