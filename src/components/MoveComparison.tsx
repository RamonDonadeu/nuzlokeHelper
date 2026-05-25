import { splitExplanation, usesTypeBasedSplit } from '@/lib/moves'
import { useI18n } from '@/i18n'

interface MoveComparisonProps {
  generation: number
}

export function MoveComparison({ generation }: MoveComparisonProps) {
  const { t, locale } = useI18n()
  const explanation = splitExplanation(generation)
  const text = locale === 'es' ? explanation.es : explanation.en

  return (
    <section className="card move-comparison">
      <div className="section-header">
        <h3>{t('compare.moveRules')}</h3>
        <span
          className="help-tip"
          title={text}
          aria-label={text}
        >
          ?
        </span>
      </div>
      <p className="muted">{text}</p>
      <p className="muted insight-box">
        {usesTypeBasedSplit(generation)
          ? 'Move matchup comparison (full move lists) is planned for Phase 2.'
          : 'Move category data will use PokeAPI move categories for this generation.'}
      </p>
    </section>
  )
}
