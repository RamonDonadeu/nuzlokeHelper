import { useI18n } from '@/i18n'
import { displayItemName } from '@/lib/localizedNames'
import { getItemDescription, type ItemDetails } from '@/lib/itemDetails'
import { formatPokemonName } from '@/types/pokemon'

interface ItemSearchPanelProps {
  item: ItemDetails
}

export function ItemSearchPanel({ item }: ItemSearchPanelProps) {
  const { t, locale } = useI18n()
  const name = displayItemName(item.slug, locale)
  const description = getItemDescription(item, locale)
  const category = item.category ? formatPokemonName(item.category) : t('search.itemUnknown')

  return (
    <section className="card move-search-panel">
      <div className="section-header">
        <h3>{t('search.itemInfoTitle')}</h3>
      </div>
      <div className="move-detail-grid">
        <div className="move-detail-name-row">
          <strong>{name}</strong>
          <span className="tag">{category}</span>
        </div>
        <div className="move-description-block">
          <span className="muted">{t('search.itemEffect')}</span>
          <p className="ability-description">{description || t('search.itemUnknown')}</p>
        </div>
      </div>
    </section>
  )
}
