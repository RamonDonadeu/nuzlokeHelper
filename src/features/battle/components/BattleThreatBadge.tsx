import { BattleHoverTooltip } from '@/features/battle/components/BattleHoverTooltip'
import { threatCountTier } from '@/features/battle/lib/battlePrepMatchup'
import { useI18n } from '@/i18n'
import type { FloatingTooltipPlacement } from '@/shared/hooks/useFloatingTooltip'

export type BattleThreatBadgeVariant = 'defensive' | 'offensive'

interface BattleThreatBadgeProps {
  count: number
  total: number
  variant: BattleThreatBadgeVariant
  tooltipPlacement?: FloatingTooltipPlacement
}

export function BattleThreatBadge({
  count,
  total,
  variant,
  tooltipPlacement = 'end',
}: BattleThreatBadgeProps) {
  const { t } = useI18n()
  const tier = threatCountTier(count, total)
  const label =
    variant === 'defensive'
      ? t('battle.threatCount', { count, total })
      : t('battle.enemyThreatCount', { count, total })
  const hint =
    variant === 'defensive'
      ? t('battle.threatCountHint', { count, total })
      : t('battle.enemyThreatCountHint', { count, total })

  return (
    <BattleHoverTooltip
      label={label}
      tooltip={hint}
      placement={tooltipPlacement}
      className="battle-threat-badge-wrap"
    >
      <span className={`battle-threat-badge battle-threat-${tier}`}>{count}</span>
    </BattleHoverTooltip>
  )
}
