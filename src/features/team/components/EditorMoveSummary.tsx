import { useI18n } from '@/i18n'
import { MoveDetailCard } from '@/features/search/components/MoveDetailCard'
import { useMovesDetails } from '@/features/search/hooks/useMovesDetails'
import { displayMoveName } from '@/lib/localizedNames'

interface EditorMoveSummaryProps {
  moveNames: string[]
}

export function EditorMoveSummary({ moveNames }: EditorMoveSummaryProps) {
  const { t, locale } = useI18n()
  const { detailsByName, loading } = useMovesDetails(moveNames)

  if (moveNames.length === 0) {
    return <p className="muted">{t('editor.noMovesConfigured')}</p>
  }

  if (loading && Object.keys(detailsByName).length === 0) {
    return <p className="muted">{t('editor.loadingMoves')}</p>
  }

  return (
    <ul className="editor-move-summary-list">
      {moveNames.map((moveName, index) => {
        const details = detailsByName[moveName]
        return (
          <li key={`${moveName}-${index}`} className="editor-move-summary-item">
            {details ? (
              <MoveDetailCard
                move={details}
                displayName={displayMoveName(moveName, locale)}
                compact
              />
            ) : loading ? (
              <p className="muted">{t('editor.loadingMoves')}</p>
            ) : (
              <div className="move-detail-grid move-detail-grid-compact">
                <strong>{displayMoveName(moveName, locale)}</strong>
                <p className="muted">{t('editor.moveDetailsUnavailable')}</p>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
