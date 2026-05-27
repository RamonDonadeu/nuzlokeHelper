import type { PokemonSlot } from '@/types/profile'
import { useI18n } from '@/i18n'
import type { ReactNode } from 'react'
import { BattleThreatBadge } from '@/features/battle/components/BattleThreatBadge'

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
  enemyCount?: number
  pcMembers?: PokemonSlot[]
  onPcMemberClick?: (slotId: string) => void
  pcClickDisabled?: boolean
  pcClickDisabledTitle?: string
}

function TeamSlotRow({
  slot,
  index,
  side,
  activeIndices,
  faintedIndices,
  selectedActiveSlot,
  threatCount,
  enemyCount,
  onFilledSlotClick,
}: {
  slot: PokemonSlot
  index: number
  side: 'left' | 'right'
  activeIndices: Array<number | null>
  faintedIndices: Set<number>
  selectedActiveSlot: number
  threatCount?: number
  enemyCount: number
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
        <span className="battle-team-slot-name">{slot.nickname ?? slot.displayName}</span>
        {side === 'left' && threatCount !== undefined && enemyCount > 0 ? (
          <BattleThreatBadge count={threatCount} enemyCount={enemyCount} />
        ) : null}
      </button>
    </li>
  )
}

function PcMemberRow({
  slot,
  threatCount,
  enemyCount,
  onClick,
  disabled,
  disabledTitle,
}: {
  slot: PokemonSlot
  threatCount: number
  enemyCount: number
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
        <span className="battle-team-slot-name">{slot.nickname ?? slot.displayName}</span>
        {enemyCount > 0 ? <BattleThreatBadge count={threatCount} enemyCount={enemyCount} /> : null}
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
  enemyCount = 0,
  pcMembers,
  onPcMemberClick,
  pcClickDisabled,
  pcClickDisabledTitle,
}: BattleTeamColumnProps) {
  const { t } = useI18n()
  const showPcSection = side === 'left' && pcMembers !== undefined
  const showThreatBadges = side === 'left' && threatCountsBySlotId !== undefined && enemyCount > 0

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
          side={side}
          activeIndices={activeIndices}
          faintedIndices={faintedIndices}
          selectedActiveSlot={selectedActiveSlot}
          threatCount={showThreatBadges ? threatCountsBySlotId.get(slot.slotId) : undefined}
          enemyCount={enemyCount}
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
            <>
              <h4 className="battle-team-section-title battle-team-section-title-pc">{t('battle.pcRoster')}</h4>
              <ul className="battle-team-list battle-pc-list">
                {pcMembers.map((slot) => (
                  <PcMemberRow
                    key={slot.slotId}
                    slot={slot}
                    threatCount={threatCountsBySlotId?.get(slot.slotId) ?? 0}
                    enemyCount={enemyCount}
                    disabled={pcClickDisabled}
                    disabledTitle={pcClickDisabledTitle}
                    onClick={() => onPcMemberClick?.(slot.slotId)}
                  />
                ))}
              </ul>
            </>
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
