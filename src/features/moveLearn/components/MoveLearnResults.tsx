import { MoveLearnMoveGrid } from '@/features/moveLearn/components/MoveLearnMoveGrid'
import { useI18n } from '@/i18n'
import { displayMoveName } from '@/lib/localizedNames'
import type { MoveLearnOption } from '@/features/moveLearn/hooks/useMoveLearnOptions'

interface MoveLearnResultsProps {
  title: string
  emptyHint: string
  options: MoveLearnOption[]
  unavailable: string[]
  unavailableHint: string
  sourceLabel: (source: MoveLearnOption['source']) => string
}

export function MoveLearnResults({
  title,
  emptyHint,
  options,
  unavailable,
  unavailableHint,
  sourceLabel,
}: MoveLearnResultsProps) {
  const { locale, t } = useI18n()

  const items = options.map((option) => ({
    moveName: option.moveName,
    source: option.source,
    sourceLabel: sourceLabel(option.source),
    alreadyKnown: option.alreadyKnown,
    learnedAtLevel: option.learnedAtLevel,
  }))

  return (
    <section className="move-learn-results-block">
      <h4>{title}</h4>
      <MoveLearnMoveGrid items={items} expandOnClick emptyHint={emptyHint} />
      {unavailable.length > 0 && (
        <details className="move-learn-unavailable">
          <summary>
            {t('moveLearn.cannotLearnCount', { count: unavailable.length })}
          </summary>
          <p className="muted">{unavailableHint}</p>
          <ul className="move-learn-unavailable-list">
            {unavailable.map((moveName) => (
              <li key={moveName}>{displayMoveName(moveName, locale)}</li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}
