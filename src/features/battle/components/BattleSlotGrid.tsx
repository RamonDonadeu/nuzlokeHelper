import type { PokemonSlot } from '@/types/profile'
import {
  BattleThreatBadge,
  type BattleThreatBadgeVariant,
} from '@/features/battle/components/BattleThreatBadge'
import type { FloatingTooltipPlacement } from '@/shared/hooks/useFloatingTooltip'

interface BattleSlotGridProps {
  slots: Array<PokemonSlot | null>
  activeIndices: Array<number | null>
  faintedIndices: Set<number>
  selectedActiveSlot: number
  threatCountsBySlotId?: Map<string, number>
  threatTotalCount: number
  threatBadgeVariant?: BattleThreatBadgeVariant
  threatTooltipPlacement?: FloatingTooltipPlacement
  onFilledSlotClick?: (index: number) => void
  onEmptySlotClick?: (index: number) => void
  emptySlotLabel: (slotNumber: number) => string
}

export function BattleSlotGrid({
  slots,
  activeIndices,
  faintedIndices,
  selectedActiveSlot,
  threatCountsBySlotId,
  threatTotalCount,
  threatBadgeVariant,
  threatTooltipPlacement = 'end',
  onFilledSlotClick,
  onEmptySlotClick,
  emptySlotLabel,
}: BattleSlotGridProps) {
  const showThreatBadges =
    threatCountsBySlotId !== undefined && threatTotalCount > 0 && threatBadgeVariant !== undefined

  return (
    <ul className="battle-slot-grid">
      {slots.map((slot, index) => {
        if (!slot) {
          return (
            <li key={`empty-${index}`}>
              <button
                type="button"
                className="battle-slot-grid-cell empty"
                onClick={() => onEmptySlotClick?.(index)}
              >
                <span className="battle-slot-grid-empty-label">{emptySlotLabel(index + 1)}</span>
              </button>
            </li>
          )
        }

        const isFainted = faintedIndices.has(index)
        const isActive = activeIndices.includes(index)
        const activeChipSlots = activeIndices
          .map((activeIndex, activeSlot) => ({ activeIndex, activeSlot }))
          .filter(({ activeIndex }) => activeIndex === index)

        return (
          <li key={slot.slotId} className="battle-slot-grid-item">
            {activeChipSlots.map(({ activeSlot }) => (
              <span
                key={`${slot.slotId}-chip-${activeSlot}`}
                className={`battle-slot-chip${selectedActiveSlot === activeSlot ? ' selected' : ''}`}
              >
                {activeSlot + 1}
              </span>
            ))}
            <button
              type="button"
              className={`battle-slot-grid-cell${isActive ? ' active' : ''}${isFainted ? ' fainted' : ''}`}
              disabled={isFainted}
              onClick={() => {
                if (isFainted) return
                onFilledSlotClick?.(index)
              }}
            >
              <span className="battle-slot-grid-media">
                <img src={slot.sprite} alt="" loading="lazy" />
                {showThreatBadges ? (
                  <BattleThreatBadge
                    count={threatCountsBySlotId.get(slot.slotId) ?? 0}
                    total={threatTotalCount}
                    variant={threatBadgeVariant}
                    tooltipPlacement={threatTooltipPlacement}
                  />
                ) : null}
              </span>
              <span className="battle-slot-grid-name">{slot.nickname ?? slot.displayName}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
