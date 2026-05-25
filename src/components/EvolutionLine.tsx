import type { EvolutionStage } from '@/types/pokemon'
import { useI18n } from '@/i18n'
import { getLocalizedPokemonNameBySlug } from '@/lib/localizedNames'

interface EvolutionLineProps {
  evolutions: EvolutionStage[]
  currentName: string
  title?: string
  highlightedName?: string
  onStageSelect?: (name: string) => void
}

export function EvolutionLine({
  evolutions,
  currentName,
  title,
  highlightedName,
  onStageSelect,
}: EvolutionLineProps) {
  const { t, locale } = useI18n()
  const highlight = highlightedName ?? currentName

  if (evolutions.length === 0) return null

  return (
    <div className="evolution-section">
      <h4>{title ?? t('compare.evolutionLine')}</h4>
      <div className="evolution-grid">
        {evolutions.map((stage) => {
          const stageDisplayName = getLocalizedPokemonNameBySlug(stage.name, locale)
          const isCurrent = stage.name === highlight
          const cardClassName = `evolution-card${onStageSelect ? ' evolution-card-interactive' : ''}${isCurrent ? ' evolution-card-current' : ''}`
          const cardContent = (
            <>
              <img src={stage.sprite} alt={stageDisplayName} />
              <strong>{stageDisplayName}</strong>
              <div className="type-row">
                {stage.types.map((type) => (
                  <span key={type} className={`type-badge type-${type}`}>
                    {type}
                  </span>
                ))}
              </div>
              <p>BST {stage.totalStats}</p>
            </>
          )

          return onStageSelect ? (
            <button
              key={stage.id}
              type="button"
              className={cardClassName}
              onClick={() => onStageSelect(stage.name)}
            >
              {cardContent}
            </button>
          ) : (
            <article key={stage.id} className={cardClassName}>
              {cardContent}
            </article>
          )
        })}
      </div>
    </div>
  )
}
