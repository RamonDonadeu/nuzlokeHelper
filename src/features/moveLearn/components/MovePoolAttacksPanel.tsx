import { MoveLearnMoveGrid } from '@/features/moveLearn/components/MoveLearnMoveGrid'
import { useI18n } from '@/i18n'
import { displayMoveName } from '@/lib/localizedNames'

interface MovePoolAttacksPanelProps {
  title: string
  moves: string[]
  onRemove: (moveName: string) => void
  onClose: () => void
}

export function MovePoolAttacksPanel({
  title,
  moves,
  onRemove,
  onClose,
}: MovePoolAttacksPanelProps) {
  const { t, locale } = useI18n()

  const items = moves.map((moveName) => ({
    moveName,
    source: 'tm' as const,
    sourceLabel: t('moveLearn.badgeTm'),
  }))

  return (
    <div className="move-learn-detail card move-learn-tm-panel move-learn-main-panel">
      <div className="move-learn-detail-header">
        <div className="move-learn-detail-heading">
          <h3>{title}</h3>
          <p className="muted">
            {t('moveLearn.tmPoolAttacksCount', { count: moves.length })}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm move-learn-details-toggle"
          onClick={onClose}
        >
          {t('moveLearn.hideAttacks')}
        </button>
      </div>

      <div className="move-learn-detail-scroll">
        <MoveLearnMoveGrid
          items={items}
          detailed
          fullDetail
          emptyHint={t('moveLearn.tmPoolEmpty')}
          className="move-learn-moves-grid--tm-pool"
          renderActions={(item) => (
            <button
              type="button"
              className="move-pool-attack-remove btn btn-ghost btn-sm"
              onClick={() => onRemove(item.moveName)}
              aria-label={t('moveLearn.removeMove', {
                name: displayMoveName(item.moveName, locale),
              })}
            >
              ×
            </button>
          )}
        />
      </div>
    </div>
  )
}
