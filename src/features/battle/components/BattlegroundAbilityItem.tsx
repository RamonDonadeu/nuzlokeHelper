import { useEffect, useMemo, useState } from 'react'
import { BattleHoverTooltip } from '@/features/battle/components/BattleHoverTooltip'
import { useAbilityDescriptions } from '@/features/team/hooks/useAbilityDescriptions'
import { useProfiles } from '@/features/profiles/hooks/useProfiles'
import { useI18n } from '@/i18n'
import { fetchItemDetails, getItemDescription } from '@/lib/itemDetails'
import { displayAbilityName, displayItemName, resolveAbilitySlug } from '@/lib/localizedNames'
import type { PokemonSlot } from '@/types/profile'

interface BattlegroundAbilityItemProps {
  left: PokemonSlot | null
  right: PokemonSlot | null
}

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

function AbilityItemCell({
  slot,
  side,
  abilityDescription,
  itemDescription,
  itemLoading,
}: {
  slot: PokemonSlot | null
  side: 'left' | 'right'
  abilityDescription: string
  itemDescription: string
  itemLoading: boolean
}) {
  const { t, locale } = useI18n()

  if (!slot) {
    return (
      <div className={`battleground-meta-cell battleground-meta-cell-${side}`}>
        <p className="muted">—</p>
      </div>
    )
  }

  const abilityLabel = slot.ability
    ? displayAbilityName(slot.ability, locale)
    : t('battle.noAbility')
  const itemLabel = slot.item ? displayItemName(slot.item, locale) : t('battle.noItem')

  return (
    <div className={`battleground-meta-cell battleground-meta-cell-${side}`}>
      <BattleHoverTooltip
        label={t('pokemon.ability')}
        tooltip={abilityDescription || undefined}
        disabled={!abilityDescription}
        className="battleground-meta-line"
      >
        <span className="muted">{t('pokemon.ability')}:</span>{' '}
        <strong>{abilityLabel}</strong>
      </BattleHoverTooltip>
      <BattleHoverTooltip
        label={t('battle.heldItem')}
        tooltip={
          itemLoading ? t('pokemon.loadingAbilityDescription') : itemDescription || undefined
        }
        disabled={!slot.item || (!itemDescription && !itemLoading)}
        className="battleground-meta-line"
      >
        <span className="muted">{t('battle.heldItem')}:</span>{' '}
        <strong>{itemLabel}</strong>
      </BattleHoverTooltip>
    </div>
  )
}

export function BattlegroundAbilityItem({ left, right }: BattlegroundAbilityItemProps) {
  const { versionGroup } = useProfiles()
  const { locale } = useI18n()

  const abilitySlugs = useMemo(() => {
    const slugs: string[] = []
    for (const slot of [left, right]) {
      if (!slot?.ability) continue
      const slug = resolveAbilitySlug(slot.ability)
      if (slug) slugs.push(slug)
    }
    return [...new Set(slugs)]
  }, [left, right])

  const { descriptions: abilityDescriptions } = useAbilityDescriptions(
    abilitySlugs,
    locale,
    versionGroup,
  )

  const leftAbilityDesc = useMemo(() => {
    if (!left?.ability) return ''
    const slug = resolveAbilitySlug(left.ability)
    return slug ? (abilityDescriptions[slug]?.text ?? '') : ''
  }, [abilityDescriptions, left?.ability])

  const rightAbilityDesc = useMemo(() => {
    if (!right?.ability) return ''
    const slug = resolveAbilitySlug(right.ability)
    return slug ? (abilityDescriptions[slug]?.text ?? '') : ''
  }, [abilityDescriptions, right?.ability])

  const leftItem = useItemDescription(left?.item)
  const rightItem = useItemDescription(right?.item)

  return (
    <div className="battleground-meta">
      <AbilityItemCell
        slot={left}
        side="left"
        abilityDescription={leftAbilityDesc}
        itemDescription={leftItem.description}
        itemLoading={leftItem.loading}
      />
      <AbilityItemCell
        slot={right}
        side="right"
        abilityDescription={rightAbilityDesc}
        itemDescription={rightItem.description}
        itemLoading={rightItem.loading}
      />
    </div>
  )
}
