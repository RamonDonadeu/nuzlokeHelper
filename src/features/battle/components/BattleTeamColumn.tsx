import type { PokemonSlot } from '@/types/profile'
import { useI18n } from '@/i18n'
import type { ReactNode } from 'react'
import {
  BattleThreatBadge,
  type BattleThreatBadgeVariant,
} from '@/features/battle/components/BattleThreatBadge'
import type { FloatingTooltipPlacement } from '@/shared/hooks/useFloatingTooltip'

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
  threatCountsBySlotId?: Map<string, number>
  threatTotalCount?: number
  threatBadgeVariant?: BattleThreatBadgeVariant
  pcMembers?: PokemonSlot[]
  onPcMemberClick?: (slotId: string) => void
  pcClickDisabled?: boolean
  pcClickDisabledTitle?: string
}

function TeamSlotRow({
  slot,
  index,
  activeIndices,
  faintedIndices,
  selectedActiveSlot,
  threatCount,
  threatTotalCount,
  threatBadgeVariant,
  threatTooltipPlacement,
  onFilledSlotClick,
}: {
  slot: PokemonSlot
  index: number
  activeIndices: Array<number | null>
  faintedIndices: Set<number>
  selectedActiveSlot: number
  threatCount?: number
  threatTotalCount: number
  threatBadgeVariant?: BattleThreatBadgeVariant
  threatTooltipPlacement: FloatingTooltipPlacement
  onFilledSlotClick?: (index: number) => void
}) {
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
        <span className="battle-team-slot-name" title={slot.nickname ?? slot.displayName}>
          {slot.nickname ?? slot.displayName}
        </span>
        {threatCount !== undefined && threatTotalCount > 0 && threatBadgeVariant ? (
          <BattleThreatBadge
            count={threatCount}
            total={threatTotalCount}
            variant={threatBadgeVariant}
            tooltipPlacement={threatTooltipPlacement}
          />
        ) : null}
      </button>
    </li>
  )
}

function PcMemberRow({
  slot,
  threatCount,
  threatTotalCount,
  threatBadgeVariant,
  threatTooltipPlacement,
  onClick,
  disabled,
  disabledTitle,
}: {
  slot: PokemonSlot
  threatCount: number
  threatTotalCount: number
  threatBadgeVariant: BattleThreatBadgeVariant
  threatTooltipPlacement: FloatingTooltipPlacement
  onClick?: () => void
  disabled?: boolean
  disabledTitle?: string
}) {
  return (
    <li key={slot.slotId}>
      <button
        type="button"
        className={`battle-team-slot battle-pc-slot${disabled ? ' disabled' : ''}`}
        disabled={disabled}
        title={disabled ? disabledTitle : undefined}
        onClick={() => {
          if (disabled) return
          onClick?.()
        }}
      >
        <img src={slot.sprite} alt={slot.displayName} loading="lazy" />
        <span className="battle-team-slot-name" title={slot.nickname ?? slot.displayName}>
          {slot.nickname ?? slot.displayName}
        </span>
        {threatTotalCount > 0 ? (
          <BattleThreatBadge
            count={threatCount}
            total={threatTotalCount}
            variant={threatBadgeVariant}
            tooltipPlacement={threatTooltipPlacement}
          />
        ) : null}
      </button>
    </li>
  )
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
  threatCountsBySlotId,
  threatTotalCount = 0,
  threatBadgeVariant,
  pcMembers,
  onPcMemberClick,
  pcClickDisabled,
  pcClickDisabledTitle,
}: BattleTeamColumnProps) {
  const { t } = useI18n()
  const showPcSection = side === 'left' && pcMembers !== undefined
  const showThreatBadges =
    threatCountsBySlotId !== undefined && threatTotalCount > 0 && threatBadgeVariant !== undefined
  const threatTooltipPlacement: FloatingTooltipPlacement = side === 'right' ? 'start' : 'end'

  const renderSlots = () =>
    slots.map((slot, index) => {
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
        <TeamSlotRow
          key={slot.slotId}
          slot={slot}
          index={index}
          activeIndices={activeIndices}
          faintedIndices={faintedIndices}
          selectedActiveSlot={selectedActiveSlot}
          threatCount={showThreatBadges ? threatCountsBySlotId.get(slot.slotId) : undefined}
          threatTotalCount={threatTotalCount}
          threatBadgeVariant={threatBadgeVariant}
          threatTooltipPlacement={threatTooltipPlacement}
          onFilledSlotClick={onFilledSlotClick}
        />
      )
    })

  return (
    <aside className={`card battle-team-column battle-team-column-${side}`}>
      {showPcSection ? (
        <>
          <div className="battle-team-column-header">
            <h4 className="battle-team-section-title">{t('battle.yourTeam')}</h4>
          </div>
          <ul className="battle-team-list">{renderSlots()}</ul>
          {pcMembers.length > 0 ? (
            <div className="battle-pc-section">
              <h4 className="battle-team-section-title battle-team-section-title-pc">{t('battle.pcRoster')}</h4>
              <ul className="battle-team-list battle-pc-list">
                {pcMembers.map((slot) => (
                  <PcMemberRow
                    key={slot.slotId}
                    slot={slot}
                    threatCount={threatCountsBySlotId?.get(slot.slotId) ?? 0}
                    threatTotalCount={threatTotalCount}
                    threatBadgeVariant={threatBadgeVariant ?? 'defensive'}
                    threatTooltipPlacement={threatTooltipPlacement}
                    disabled={pcClickDisabled}
                    disabledTitle={pcClickDisabledTitle}
                    onClick={() => onPcMemberClick?.(slot.slotId)}
                  />
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <div className="battle-team-column-header">
            <h3>{title}</h3>
            {actions}
          </div>
          <ul className="battle-team-list">{renderSlots()}</ul>
        </>
      )}
    </aside>
  )
}
