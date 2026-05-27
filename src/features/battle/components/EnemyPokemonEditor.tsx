import { useCallback, useEffect, useId, useMemo, useRef, useState, type RefObject } from 'react'
import { MoveInput } from '@/features/search/components/MoveInput'
import { useItemSearch } from '@/features/search/hooks/useItemSearch'
import { usePokemonSearch } from '@/features/search/hooks/usePokemonSearch'
import { useSuggestionKeyboard } from '@/shared/hooks/useSuggestionKeyboard'
import { fetchPokemon } from '@/lib/pokeapi'
import {
  canonicalAbilityName,
  displayItemName,
  displayMoveName,
  ensureEditorIndexes,
  getLocalizedAbilityName,
  resolveItemSlug,
} from '@/lib/localizedNames'
import { defaultNature } from '@/lib/stats'
import { useI18n } from '@/i18n'
import { formatPokemonName, type PokemonAbility } from '@/types/pokemon'
import type { PokemonSlot } from '@/types/profile'

interface EnemyPokemonEditorProps {
  open: boolean
  existingSlot: PokemonSlot | null
  onClose: () => void
  onSubmit: (slot: PokemonSlot) => void
}

const EMPTY_MOVES = ['', '', '', '']

export function EnemyPokemonEditor({
  open,
  existingSlot,
  onClose,
  onSubmit,
}: EnemyPokemonEditorProps) {
  const { t, locale } = useI18n()
  const [species, setSpecies] = useState(existingSlot?.name ?? '')
  const [ability, setAbility] = useState(existingSlot?.ability ?? '')
  const [item, setItem] = useState(existingSlot?.item ?? '')
  const [moves, setMoves] = useState<string[]>(
    existingSlot?.moves ? [...existingSlot.moves, ...EMPTY_MOVES].slice(0, 4) : EMPTY_MOVES,
  )
  const [speciesAbilities, setSpeciesAbilities] = useState<PokemonAbility[]>([])
  const [loadingAbilities, setLoadingAbilities] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [speciesFocused, setSpeciesFocused] = useState(false)
  const [itemFocused, setItemFocused] = useState(false)
  const [searchIndexesReady, setSearchIndexesReady] = useState(false)
  const speciesInputRef = useRef<HTMLInputElement>(null)
  const speciesWrapRef = useRef<HTMLDivElement>(null)
  const itemWrapRef = useRef<HTMLDivElement>(null)
  const speciesListId = useId()
  const itemListId = useId()

  const speciesSlug = useMemo(
    () => species.trim().toLowerCase().replace(/\s+/g, '-'),
    [species],
  )
  const speciesQuery = species.trim()
  const itemQuery = item.trim()

  const {
    results: speciesResults,
    isPending: speciesPending,
  } = usePokemonSearch(speciesFocused ? speciesQuery : '')
  const {
    results: itemResults,
    isPending: itemPending,
  } = useItemSearch(itemQuery, locale, searchIndexesReady && itemFocused)
  const canSubmit = useMemo(() => species.trim().length >= 2 && !isSaving, [isSaving, species])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    void ensureEditorIndexes().then(() => {
      if (!cancelled) setSearchIndexesReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    setSpecies(existingSlot?.name ?? '')
    setAbility(existingSlot?.ability ? canonicalAbilityName(existingSlot.ability) : '')
    setItem(existingSlot?.item ? displayItemName(existingSlot.item, locale) : '')
    setMoves(
      existingSlot?.moves
        ? [...existingSlot.moves.map((move) => displayMoveName(move, locale)), ...EMPTY_MOVES].slice(0, 4)
        : EMPTY_MOVES,
    )
    setSpeciesFocused(false)
    setItemFocused(false)
    setError(null)
  }, [existingSlot, locale, open])

  useEffect(() => {
    if (!open) return
    if (speciesSlug.length < 2) {
      setSpeciesAbilities([])
      setLoadingAbilities(false)
      setAbility('')
      return
    }

    let cancelled = false
    setLoadingAbilities(true)
    void fetchPokemon(speciesSlug)
      .then((pokemon) => {
        if (cancelled) return
        const slugs = pokemon.abilities.map((entry) => entry.slug)
        setSpeciesAbilities(pokemon.abilities)
        setAbility((prev) => {
          const currentCanonical = canonicalAbilityName(prev)
          const matched = slugs.find((slug) => canonicalAbilityName(slug) === currentCanonical)
          if (matched) return canonicalAbilityName(matched)
          if (slugs.length > 0) return canonicalAbilityName(slugs[0])
          return ''
        })
      })
      .catch(() => {
        if (!cancelled) {
          setSpeciesAbilities([])
          setAbility('')
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingAbilities(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, speciesSlug])

  const abilitySlugs = useMemo(
    () => speciesAbilities.map((entry) => entry.slug),
    [speciesAbilities],
  )
  const abilitySelectDisabled =
    speciesSlug.length < 2 || loadingAbilities || abilitySlugs.length === 0

  const showSpeciesSuggestions = speciesFocused && speciesQuery.length >= 2
  const showItemSuggestions = itemFocused && itemQuery.length >= 2 && searchIndexesReady

  const selectSpecies = useCallback((name: string) => {
    setSpecies(name)
    setSpeciesFocused(false)
  }, [])

  const selectItem = useCallback((canonicalName: string) => {
    setItem(canonicalName)
    setItemFocused(false)
  }, [])

  const speciesResetKey = `${speciesQuery}\0${speciesResults.map((result) => result.name).join('\0')}`
  const itemResetKey = `${itemQuery}\0${itemResults.map((result) => result.slug).join('\0')}`

  const {
    highlightedIndex: speciesHighlightedIndex,
    listRef: speciesListRef,
    handleKeyDown: handleSpeciesKeyDown,
  } = useSuggestionKeyboard({
    enabled: showSpeciesSuggestions && speciesResults.length > 0,
    results: speciesResults,
    resetKey: speciesResetKey,
    onSelect: (result) => selectSpecies(result.name),
  })

  const {
    highlightedIndex: itemHighlightedIndex,
    listRef: itemListRef,
    handleKeyDown: handleItemKeyDown,
  } = useSuggestionKeyboard({
    enabled: showItemSuggestions && itemResults.length > 0,
    results: itemResults,
    resetKey: itemResetKey,
    onSelect: (result) => selectItem(result.canonicalName),
  })

  useEffect(() => {
    if (!open || existingSlot) return
    const timer = window.setTimeout(() => {
      speciesInputRef.current?.focus()
      setSpeciesFocused(true)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [open, existingSlot])

  if (!open) return null

  const setMove = (index: number, value: string) => {
    setMoves((prev) => prev.map((move, i) => (i === index ? value : move)))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedSpecies = species.trim().toLowerCase().replace(/\s+/g, '-')
    if (!trimmedSpecies) return
    setIsSaving(true)
    setError(null)

    try {
      const pokemon = await fetchPokemon(trimmedSpecies)
      const nextSlot: PokemonSlot = {
        slotId: existingSlot?.slotId ?? crypto.randomUUID(),
        speciesId: pokemon.id,
        currentSpeciesId: pokemon.id,
        name: pokemon.name,
        displayName: pokemon.displayName,
        types: pokemon.types,
        baseStats: pokemon.stats,
        sprite: pokemon.sprite,
        level: existingSlot?.level ?? 50,
        nature: existingSlot?.nature ?? defaultNature(),
        ability: canonicalAbilityName(ability.trim()) || undefined,
        item: item.trim() || undefined,
        moves: moves.map((move) => move.trim()).filter(Boolean),
      }
      onSubmit(nextSlot)
      setSpecies('')
      setAbility('')
      setItem('')
      setMoves(EMPTY_MOVES)
    } catch {
      setError(t('battle.editorSpeciesError'))
    } finally {
      setIsSaving(false)
    }
  }

  const normalizeItemInput = (value: string) => {
    const slug = resolveItemSlug(value)
    return slug ? slug : value.trim()
  }

  const handleBlurWithDelay = (
    setFocused: (value: boolean) => void,
    wrapRef: RefObject<HTMLDivElement | null>,
    commit?: () => void,
  ) => {
    window.setTimeout(() => {
      if (wrapRef.current?.contains(document.activeElement)) return
      setFocused(false)
      commit?.()
    }, 150)
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal card battle-editor-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <h3>{t('battle.enemyEditorTitle')}</h3>
        <form className="inline-form" onSubmit={handleSubmit}>
          <label className="control-group">
            <span className="control-label">{t('battle.editorSpecies')}</span>
            <div className="move-input-wrap battle-editor-input-wrap" ref={speciesWrapRef}>
              <input
                ref={speciesInputRef}
                className="battle-editor-input"
                type="text"
                value={species}
                aria-autocomplete="list"
                aria-controls={showSpeciesSuggestions && speciesResults.length > 0 ? speciesListId : undefined}
                aria-expanded={showSpeciesSuggestions && speciesResults.length > 0}
                aria-activedescendant={
                  speciesHighlightedIndex >= 0
                    ? `${speciesListId}-option-${speciesHighlightedIndex}`
                    : undefined
                }
                onChange={(event) => setSpecies(event.target.value)}
                onFocus={() => setSpeciesFocused(true)}
                onBlur={() => handleBlurWithDelay(setSpeciesFocused, speciesWrapRef)}
                onKeyDown={(event) => {
                  handleSpeciesKeyDown(event)
                }}
                placeholder={t('battle.editorSpeciesPlaceholder')}
                required
              />
              {showSpeciesSuggestions && speciesResults.length > 0 && (
                <ul
                  ref={speciesListRef}
                  id={speciesListId}
                  className="move-suggestions battle-editor-suggestions"
                  role="listbox"
                >
                  {speciesResults.map((result, index) => (
                    <li
                      key={result.name}
                      id={`${speciesListId}-option-${index}`}
                      role="option"
                      aria-selected={index === speciesHighlightedIndex}
                    >
                      <button
                        type="button"
                        tabIndex={-1}
                        className={index === speciesHighlightedIndex ? 'is-highlighted' : undefined}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => selectSpecies(result.name)}
                      >
                        {formatPokemonName(result.name)}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {showSpeciesSuggestions && speciesPending && speciesResults.length === 0 && (
                <p className="move-suggestions-status muted" aria-live="polite">
                  {t('search.searching')}
                </p>
              )}
            </div>
          </label>
          <label className="control-group">
            <span className="control-label">{t('battle.editorAbility')}</span>
            <select
              className="battle-editor-input"
              value={ability}
              onChange={(event) => setAbility(event.target.value)}
              disabled={abilitySelectDisabled}
              aria-label={t('battle.editorAbility')}
            >
              {abilitySelectDisabled ? (
                <option value="">
                  {speciesSlug.length < 2
                    ? t('battle.editorAbilitySelectSpecies')
                    : loadingAbilities
                      ? t('battle.editorAbilityLoading')
                      : t('battle.editorAbilitySelectSpecies')}
                </option>
              ) : (
                abilitySlugs.map((slug) => {
                  const speciesAbility = speciesAbilities.find((entry) => entry.slug === slug)
                  const label = getLocalizedAbilityName(slug, locale)
                  const hiddenSuffix = speciesAbility?.isHidden ? ` (${t('pokemon.hidden')})` : ''
                  return (
                    <option key={slug} value={canonicalAbilityName(slug)}>
                      {label}
                      {hiddenSuffix}
                    </option>
                  )
                })
              )}
            </select>
          </label>
          <label className="control-group">
            <span className="control-label">{t('battle.editorItem')}</span>
            <div className="move-input-wrap battle-editor-input-wrap" ref={itemWrapRef}>
              <input
                className="battle-editor-input"
                type="text"
                value={item}
                aria-autocomplete="list"
                aria-controls={showItemSuggestions && itemResults.length > 0 ? itemListId : undefined}
                aria-expanded={showItemSuggestions && itemResults.length > 0}
                aria-activedescendant={
                  itemHighlightedIndex >= 0 ? `${itemListId}-option-${itemHighlightedIndex}` : undefined
                }
                onChange={(event) => setItem(event.target.value)}
                onFocus={() => setItemFocused(true)}
                onBlur={() =>
                  handleBlurWithDelay(setItemFocused, itemWrapRef, () =>
                    setItem((prev) => normalizeItemInput(prev)),
                  )
                }
                onKeyDown={(event) => {
                  handleItemKeyDown(event)
                }}
                placeholder={t('battle.editorItemPlaceholder')}
              />
              {showItemSuggestions && itemResults.length > 0 && (
                <ul
                  ref={itemListRef}
                  id={itemListId}
                  className="move-suggestions battle-editor-suggestions"
                  role="listbox"
                >
                  {itemResults.map((result, index) => (
                    <li
                      key={result.slug}
                      id={`${itemListId}-option-${index}`}
                      role="option"
                      aria-selected={index === itemHighlightedIndex}
                    >
                      <button
                        type="button"
                        tabIndex={-1}
                        className={index === itemHighlightedIndex ? 'is-highlighted' : undefined}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => selectItem(result.canonicalName)}
                      >
                        {result.displayName}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {showItemSuggestions && itemPending && itemResults.length === 0 && (
                <p className="move-suggestions-status muted" aria-live="polite">
                  {t('search.searching')}
                </p>
              )}
            </div>
          </label>
          <div className="move-input-grid">
            {moves.map((move, index) => (
              <MoveInput
                key={`enemy-move-${index}`}
                label={t('battle.editorMove', { n: index + 1 })}
                placeholder={t('battle.editorMovePlaceholder')}
                value={move}
                locale={locale}
                indexReady={searchIndexesReady}
                onChange={(next) => setMove(index, next)}
              />
            ))}
          </div>
          {error && <p className="error-note">{error}</p>}
          <div className="confirm-dialog-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
              {isSaving ? t('search.searching') : t('common.confirm')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
