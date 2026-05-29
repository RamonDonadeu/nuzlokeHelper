import { useEffect, useState } from 'react'
import { BattleHoverTooltip } from '@/features/battle/components/BattleHoverTooltip'
import { useI18n } from '@/i18n'
import { fetchItemDetails, getItemDescription } from '@/lib/itemDetails'
import { displayAbilityName, displayItemName, resolveAbilitySlug } from '@/lib/localizedNames'
import type { AbilityDescriptionDisplay } from '@/features/team/hooks/useAbilityDescriptions'
import type { PokemonSlot } from '@/types/profile'

function useItemDescription(itemName: string | undefined) {
  const { locale } = useI18n()
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!itemName?.trim()) {
      setDescription('')
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    void fetchItemDetails(itemName)
      .then((details) => {
        if (cancelled) return
        setDescription(details ? getItemDescription(details, locale) : '')
      })
      .catch(() => {
        if (!cancelled) setDescription('')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [itemName, locale])

  return { description, loading }
}

interface BattlePrepAbilityCellProps {
  slot: PokemonSlot
  abilityDescriptions: Record<string, AbilityDescriptionDisplay>
}

export function BattlePrepAbilityCell({ slot, abilityDescriptions }: BattlePrepAbilityCellProps) {
  const { t, locale } = useI18n()

  const abilitySlug = slot.ability ? resolveAbilitySlug(slot.ability) : null
  const abilityDescription = abilitySlug ? (abilityDescriptions[abilitySlug]?.text ?? '') : ''
  const abilityLabel = slot.ability
    ? displayAbilityName(slot.ability, locale)
    : t('battle.noAbility')

  return (
    <BattleHoverTooltip
      label={t('pokemon.ability')}
      tooltip={abilityDescription || undefined}
      disabled={!abilityDescription}
      className="battle-prep-slot-meta-line"
    >
      <strong>{abilityLabel}</strong>
    </BattleHoverTooltip>
  )
}

export function BattlePrepItemCell({ slot }: { slot: PokemonSlot }) {
  const { t, locale } = useI18n()
  const { description: itemDescription, loading: itemLoading } = useItemDescription(slot.item)

  const itemLabel = slot.item ? displayItemName(slot.item, locale) : t('battle.noItem')

  return (
    <BattleHoverTooltip
      label={t('battle.heldItem')}
      tooltip={itemLoading ? t('pokemon.loadingAbilityDescription') : itemDescription || undefined}
      disabled={!slot.item || (!itemDescription && !itemLoading)}
      className="battle-prep-slot-meta-line"
    >
      <strong>{itemLabel}</strong>
    </BattleHoverTooltip>
  )
}
