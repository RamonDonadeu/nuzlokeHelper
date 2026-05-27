import { threatCountTier } from '@/features/battle/lib/battlePrepMatchup'
import { useI18n } from '@/i18n'

interface BattleThreatBadgeProps {
  count: number
  enemyCount: number
}

export function BattleThreatBadge({ count, enemyCount }: BattleThreatBadgeProps) {
  const { t } = useI18n()
  const tier = threatCountTier(count, enemyCount)
  const label = t('battle.threatCount', { count, total: enemyCount })

  return (
    <span className={`battle-threat-badge battle-threat-${tier}`} title={label} aria-label={label}>
      {count}
    </span>
  )
}
