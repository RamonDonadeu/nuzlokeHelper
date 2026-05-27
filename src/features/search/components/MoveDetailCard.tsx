import { useI18n } from '@/i18n'
import { displayMoveName } from '@/lib/localizedNames'
import { getMoveDescription, type MoveDetails } from '@/lib/moveTypes'

interface MoveDetailCardProps {
  move: MoveDetails
  /** Override displayed name (e.g. localized from canonical slug). */
  displayName?: string
  compact?: boolean
}

function damageClassLabel(value: MoveDetails['damageClass'], t: (key: string) => string): string {
  if (value === 'physical') return t('search.moveDamageClassPhysical')
  if (value === 'special') return t('search.moveDamageClassSpecial')
  if (value === 'status') return t('search.moveDamageClassStatus')
  return t('search.moveUnknown')
}

function statLabel(value: number | null, t: (key: string) => string): string {
  return value === null ? t('search.moveUnknown') : String(value)
}

export function MoveDetailCard({ move, displayName, compact }: MoveDetailCardProps) {
  const { t, locale } = useI18n()
  const moveName = displayName ?? displayMoveName(move.name, locale)
  const description = getMoveDescription(move, locale)

  return (
    <div className={`move-detail-grid${compact ? ' move-detail-grid-compact' : ''}`}>
      <div className="move-detail-name-row">
        <strong>{moveName}</strong>
        <span className={`type-badge type-${move.type ?? 'unknown'}`}>
          {move.type ?? t('search.moveUnknown')}
        </span>
      </div>
      <p className="muted move-detail-line">
        {t('search.moveDamageClass')}: {damageClassLabel(move.damageClass, t)}
      </p>
      <div className="move-stat-grid">
        <div>
          <span className="muted">{t('search.movePower')}</span>
          <strong>{statLabel(move.power, t)}</strong>
        </div>
        <div>
          <span className="muted">{t('search.moveAccuracy')}</span>
          <strong>{statLabel(move.accuracy, t)}</strong>
        </div>
        <div>
          <span className="muted">{t('search.movePp')}</span>
          <strong>{statLabel(move.pp, t)}</strong>
        </div>
      </div>
      {description ? (
        <div className="move-description-block">
          <span className="muted">{t('search.moveDescription')}</span>
          <p className="ability-description">{description}</p>
        </div>
      ) : null}
    </div>
  )
}
