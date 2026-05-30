import { useEffect, useState, type ReactNode } from 'react'
import { MoveDetailCard } from '@/features/search/components/MoveDetailCard'
import { useMovesDetails } from '@/features/search/hooks/useMovesDetails'
import { useI18n } from '@/i18n'
import { displayMoveName } from '@/lib/localizedNames'

export interface MoveLearnMoveItem {
  moveName: string
  source?: 'tm' | 'relearn'
  sourceLabel?: string
  alreadyKnown?: boolean
  learnedAtLevel?: number
}

interface MoveLearnMoveGridProps {
  items: MoveLearnMoveItem[]
  /** Global detail mode (current moves only). Ignored when expandOnClick is true. */
  detailed?: boolean
  emptyHint?: string
  className?: string
  /** Full MoveDetailCard (not compact) when detailed. */
  fullDetail?: boolean
  renderActions?: (item: MoveLearnMoveItem) => ReactNode
  /** Compact layout: row = up to 4 in one row (current moves). */
  compactLayout?: 'column' | 'row'
  /** Click a move to toggle its detail card (TM / relearn lists). */
  expandOnClick?: boolean
  /** Learn this move (opens replace dialog in parent). */
  onLearn?: (item: MoveLearnMoveItem) => void
}

function itemKey(item: MoveLearnMoveItem, index: number): string {
  return `${item.moveName}-${item.source ?? 'move'}-${index}`
}

export function MoveLearnMoveGrid({
  items,
  detailed = false,
  emptyHint,
  className,
  fullDetail = false,
  renderActions,
  compactLayout = 'column',
  expandOnClick = false,
  onLearn,
}: MoveLearnMoveGridProps) {
  const { t, locale } = useI18n()
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const moveNames = items.map((item) => item.moveName)
  const { detailsByName, loading } = useMovesDetails(moveNames)

  useEffect(() => {
    setExpandedKey(null)
  }, [items])

  if (items.length === 0) {
    return emptyHint ? <p className="muted">{emptyHint}</p> : null
  }

  if (loading && Object.keys(detailsByName).length === 0) {
    return <p className="muted">{t('editor.loadingMoves')}</p>
  }

  const showDetailed = expandOnClick ? false : detailed

  return (
    <ul
      className={[
        'move-learn-moves-grid',
        showDetailed
          ? 'move-learn-moves-grid--detailed'
          : expandOnClick
            ? 'move-learn-moves-grid--expandable'
            : compactLayout === 'row'
              ? 'move-learn-moves-grid--compact-row'
              : 'move-learn-moves-grid--compact',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="list"
    >
      {items.map((item, index) => {
        const key = itemKey(item, index)
        const details = detailsByName[item.moveName]
        const display = displayMoveName(item.moveName, locale)
        const type = details?.type ?? null
        const isExpanded = expandOnClick && expandedKey === key

        const metaBlock =
          item.sourceLabel || item.alreadyKnown || item.learnedAtLevel !== undefined ? (
            <div className="move-learn-move-cell-meta">
              {item.sourceLabel ? (
                <span className={`move-learn-source-badge move-learn-source-${item.source}`}>
                  {item.sourceLabel}
                </span>
              ) : null}
              {item.learnedAtLevel !== undefined ? (
                <span className="move-learn-level-tag muted">
                  {t('moveLearn.learnedAtLevel', { level: item.learnedAtLevel })}
                </span>
              ) : null}
              {item.alreadyKnown ? (
                <span className="move-learn-known-tag muted">{t('moveLearn.alreadyKnown')}</span>
              ) : null}
            </div>
          ) : null

        const detailCard = details ? (
          <MoveDetailCard move={details} displayName={display} compact={!fullDetail} />
        ) : loading ? (
          <p className="muted">{t('editor.loadingMoves')}</p>
        ) : (
          <div className="move-detail-grid move-detail-grid-compact">
            <strong>{display}</strong>
            <p className="muted">{t('editor.moveDetailsUnavailable')}</p>
          </div>
        )

        const compactBody = (
          <div className="move-learn-move-compact-body">
            <div className="move-learn-move-compact-top">
              {item.sourceLabel ? (
                <span className={`move-learn-source-badge move-learn-source-${item.source}`}>
                  {item.sourceLabel}
                </span>
              ) : null}
              <strong className="move-learn-move-compact-name">{display}</strong>
              {type ? (
                <span className={`type-badge type-${type}`}>{type}</span>
              ) : (
                <span className="type-badge type-unknown muted">{t('search.moveUnknown')}</span>
              )}
            </div>
            {(item.learnedAtLevel !== undefined || item.alreadyKnown) && (
              <div className="move-learn-move-compact-tags">
                {item.learnedAtLevel !== undefined ? (
                  <span className="muted">{t('moveLearn.learnedAtLevel', { level: item.learnedAtLevel })}</span>
                ) : null}
                {item.alreadyKnown ? (
                  <span className="muted">{t('moveLearn.alreadyKnown')}</span>
                ) : null}
              </div>
            )}
          </div>
        )

        return (
          <li
            key={key}
            className={[
              'move-learn-move-cell',
              showDetailed
                ? 'move-learn-move-cell--detailed'
                : 'move-learn-move-cell--compact',
              item.alreadyKnown ? 'move-learn-move-cell--known' : '',
              isExpanded ? 'move-learn-move-cell--expanded' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            role="listitem"
          >
            {showDetailed ? (
              <div className="move-learn-move-cell-detailed-inner">
                <div className="move-learn-move-cell-meta-row">
                  {metaBlock}
                  {renderActions ? (
                    <div className="move-learn-move-cell-actions">{renderActions(item)}</div>
                  ) : null}
                </div>
                {detailCard}
              </div>
            ) : expandOnClick ? (
              <div className="move-learn-move-expandable-wrap">
                <button
                  type="button"
                  className="move-learn-move-expand-trigger"
                  aria-expanded={isExpanded}
                  onClick={() => setExpandedKey(isExpanded ? null : key)}
                >
                  {compactBody}
                  <span className="move-learn-move-expand-hint muted">
                    {isExpanded ? t('moveLearn.collapseMove') : t('moveLearn.expandMove')}
                  </span>
                </button>
                {onLearn && !item.alreadyKnown ? (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm move-learn-learn-btn"
                    onClick={() => onLearn(item)}
                  >
                    {t('moveLearn.learnMove')}
                  </button>
                ) : null}
                {isExpanded ? (
                  <div className="move-learn-move-expanded-detail">{detailCard}</div>
                ) : null}
              </div>
            ) : (
              compactBody
            )}
          </li>
        )
      })}
    </ul>
  )
}
