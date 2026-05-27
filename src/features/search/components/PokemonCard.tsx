import { useMemo } from 'react'
import type { EvolutionStage, PokemonSummary } from '@/types/pokemon'
import { useI18n } from '@/i18n'
import { EvolutionLine } from '@/features/team/components/EvolutionLine'
import { PokemonStatGrid } from '@/features/team/components/PokemonStatGrid'
import { useAbilityDescriptions } from '@/features/team/hooks/useAbilityDescriptions'
import {
  getLocalizedAbilityName,
  getLocalizedPokemonName,
  getLocalizedPokemonNameBySlug,
  getSpeciesSlugFromUrl,
} from '@/lib/localizedNames'

interface PokemonCardProps {
  pokemon: PokemonSummary
  profileVersionGroup: string
  evolutions?: EvolutionStage[]
  evolutionLineLabel?: string
  onAdd?: () => void
  addDisabled?: boolean
  addLabel?: string
  onSendToPC?: () => void
  sendToPCLabel?: string
  onEvolutionSelect?: (name: string) => void
}

export function PokemonCard({
  pokemon,
  profileVersionGroup,
  evolutions,
  evolutionLineLabel = 'Evolution line',
  onAdd,
  addDisabled,
  addLabel = 'Add to team',
  onSendToPC,
  sendToPCLabel = 'Send to PC',
  onEvolutionSelect,
}: PokemonCardProps) {
  const { t, locale } = useI18n()
  const abilitySlugs = useMemo(() => pokemon.abilities.map((ability) => ability.slug), [pokemon.abilities])
  const { descriptions: abilityDescriptions, loading: loadingAbilityDescriptions } =
    useAbilityDescriptions(abilitySlugs, locale, profileVersionGroup)
  const speciesSlug = getSpeciesSlugFromUrl(pokemon.speciesUrl)
  const displayName = getLocalizedPokemonName(
    pokemon.name,
    speciesSlug,
    locale,
    pokemon.displayName,
  )

  return (
    <section className="card pokemon-card">
      <div className="pokemon-header">
        <img src={pokemon.sprite} alt={displayName} />
        <div>
          <h3>{displayName}</h3>
          <p className="muted">#{pokemon.id.toString().padStart(4, '0')}</p>
          <div className="type-row">
            {pokemon.types.map((type) => (
              <span key={type} className={`type-badge type-${type}`}>
                {type}
              </span>
            ))}
          </div>
          {pokemon.alternateFormNames && pokemon.alternateFormNames.length > 0 && (
            <p className="muted form-note">
              {t('pokemon.multipleFormsNote', {
                forms: pokemon.alternateFormNames
                  .map((name) => getLocalizedPokemonNameBySlug(name, locale))
                  .join(', '),
              })}
            </p>
          )}
        </div>
        {(onAdd || onSendToPC) && (
          <div className="pokemon-card-actions">
            {onAdd && (
              <button type="button" className="btn btn-primary" disabled={addDisabled} onClick={onAdd}>
                {addLabel}
              </button>
            )}
            {onSendToPC && (
              <button type="button" className="btn btn-ghost" onClick={onSendToPC}>
                {sendToPCLabel}
              </button>
            )}
          </div>
        )}
      </div>

      <PokemonStatGrid stats={pokemon.stats} />

      <div className="ability-list">
        <h4>{t('pokemon.abilities')}</h4>
        <ul>
          {pokemon.abilities.map((ability) => {
            const description = abilityDescriptions[ability.slug]
            return (
              <li key={ability.slug}>
                <div className="ability-name-row">
                  <span>{getLocalizedAbilityName(ability.slug, locale)}</span>
                  {ability.isHidden && <span className="tag">{t('pokemon.hidden')}</span>}
                </div>
                {description?.text ? (
                  <p className="ability-description">
                    {description.text}
                    {description.source === 'generation' && description.fallbackGeneration != null && (
                      <span className="ability-description-fallback">
                        {' '}
                        {t('pokemon.abilityDescriptionFallbackGen', {
                          gen: description.fallbackGeneration,
                        })}
                      </span>
                    )}
                  </p>
                ) : loadingAbilityDescriptions ? (
                  <p className="ability-description muted">{t('pokemon.loadingAbilityDescription')}</p>
                ) : null}
              </li>
            )
          })}
        </ul>
      </div>

      {evolutions && evolutions.length > 0 && (
        <EvolutionLine
          evolutions={evolutions}
          currentName={pokemon.name}
          title={evolutionLineLabel}
          onStageSelect={onEvolutionSelect}
        />
      )}
    </section>
  )
}
