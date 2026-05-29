import { BattleHoverTooltip } from '@/features/battle/components/BattleHoverTooltip'
import { MoveDetailCard } from '@/features/search/components/MoveDetailCard'
import { useI18n } from '@/i18n'
import { displayMoveName } from '@/lib/localizedNames'
import type { MoveDetails } from '@/lib/moveTypes'

interface BattlePrepMoveLabelProps {
  moveName: string
  details: MoveDetails | null | undefined
  loading?: boolean
  className?: string
}

export function BattlePrepMoveLabel({
  moveName,
  details,
  loading = false,
  className,
}: BattlePrepMoveLabelProps) {
  const { locale, t } = useI18n()
  const display = displayMoveName(moveName, locale)

  const tooltip = details ? (
    <MoveDetailCard move={details} displayName={display} compact />
  ) : loading ? (
    <p className="muted">{t('editor.loadingMoves')}</p>
  ) : (
    <p className="muted">{t('editor.moveDetailsUnavailable')}</p>
  )

  return (
    <BattleHoverTooltip
      label={display}
      tooltip={tooltip}
      className={['battle-prep-move-tooltip', className].filter(Boolean).join(' ')}
    >
      <span className="battle-prep-threat-move">{display}</span>
    </BattleHoverTooltip>
  )
}
