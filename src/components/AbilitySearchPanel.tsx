import { useI18n } from '@/i18n'
import { getAbilityDescription, type CachedAbilityDetails } from '@/lib/abilityDetails'
import { displayAbilityName } from '@/lib/localizedNames'

interface AbilitySearchPanelProps {
  ability: CachedAbilityDetails
  profileVersionGroup: string
}

export function AbilitySearchPanel({ ability, profileVersionGroup }: AbilitySearchPanelProps) {
  const { t, locale } = useI18n()
  const description = getAbilityDescription(ability, locale, profileVersionGroup)
  const name = displayAbilityName(ability.slug, locale)

  return (
    <section className="card move-search-panel">
      <div className="section-header">
        <h3>{t('search.abilityInfoTitle')}</h3>
      </div>
      <div className="move-detail-grid">
        <div className="move-detail-name-row">
          <strong>{name}</strong>
        </div>
        {description.text ? (
          <div className="move-description-block">
            <span className="muted">{t('search.abilityDescription')}</span>
            <p className="ability-description">{description.text}</p>
          </div>
        ) : (
          <p className="muted">{t('search.abilityUnknown')}</p>
        )}
      </div>
    </section>
  )
}
