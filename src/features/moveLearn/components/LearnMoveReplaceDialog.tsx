import { useEffect, useId, useRef } from 'react'
import { useMovesDetails } from '@/features/search/hooks/useMovesDetails'
import { useI18n } from '@/i18n'
import { displayMoveName } from '@/lib/localizedNames'
import { MOVE_SLOT_COUNT, movesToSlots } from '@/features/moveLearn/lib/moveSlots'

interface LearnMoveReplaceDialogProps {
  pokemonName: string
  newMoveName: string
  source: 'tm' | 'relearn'
  sourceLabel: string
  currentMoves?: string[]
  onConfirm: (slotIndex: number) => void
  onCancel: () => void
}

export function LearnMoveReplaceDialog({
  pokemonName,
  newMoveName,
  source,
  sourceLabel,
  currentMoves,
  onConfirm,
  onCancel,
}: LearnMoveReplaceDialogProps) {
  const { t, locale } = useI18n()
  const titleId = useId()
  const cancelRef = useRef<HTMLButtonElement>(null)
  const slots = movesToSlots(currentMoves)
  const newMoveDisplay = displayMoveName(newMoveName, locale)
  const { detailsByName } = useMovesDetails([newMoveName, ...slots.filter(Boolean)])

  useEffect(() => {
    cancelRef.current?.focus()
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onCancel}
    >
      <div
        className="modal card learn-move-replace-dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id={titleId}>{t('moveLearn.learnDialogTitle')}</h3>
        <p className="muted learn-move-replace-intro">
          {t('moveLearn.learnDialogHint', { pokemon: pokemonName, move: newMoveDisplay })}
        </p>
        <p className="learn-move-replace-new">
          <span className={`move-learn-source-badge move-learn-source-${source}`}>
            {sourceLabel}
          </span>
          <strong>{newMoveDisplay}</strong>
          {detailsByName[newMoveName]?.type ? (
            <span className={`type-badge type-${detailsByName[newMoveName].type}`}>
              {detailsByName[newMoveName].type}
            </span>
          ) : null}
        </p>

        <ul className="learn-move-slot-picker" role="list">
          {Array.from({ length: MOVE_SLOT_COUNT }, (_, index) => {
            const moveName = slots[index]
            const display = moveName ? displayMoveName(moveName, locale) : null
            const type = moveName ? detailsByName[moveName]?.type : null

            return (
              <li key={index} role="listitem">
                <button
                  type="button"
                  className="learn-move-slot-option"
                  onClick={() => onConfirm(index)}
                >
                  <span className="learn-move-slot-label">
                    {t('moveLearn.slotLabel', { n: index + 1 })}
                  </span>
                  {display ? (
                    <>
                      <strong>{display}</strong>
                      {type ? (
                        <span className={`type-badge type-${type}`}>{type}</span>
                      ) : null}
                    </>
                  ) : (
                    <span className="muted">{t('moveLearn.emptySlot')}</span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>

        <div className="confirm-dialog-actions">
          <button ref={cancelRef} type="button" className="btn btn-ghost" onClick={onCancel}>
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}
