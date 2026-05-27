import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { MoveInput } from '@/components/MoveInput'
import { useAbilitySearch } from '@/hooks/useAbilitySearch'
import { useItemSearch } from '@/hooks/useItemSearch'
import { usePokemonSearch } from '@/hooks/usePokemonSearch'
import { fetchPokemon } from '@/lib/pokeapi'
import {
  canonicalAbilityName,
  displayItemName,
  displayMoveName,
  ensureEditorIndexes,
  resolveItemSlug,
} from '@/lib/localizedNames'
import { defaultNature } from '@/lib/stats'
import { useI18n } from '@/i18n'
import { formatPokemonName } from '@/types/pokemon'
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
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [speciesFocused, setSpeciesFocused] = useState(false)
  const [abilityFocused, setAbilityFocused] = useState(false)
  const [itemFocused, setItemFocused] = useState(false)
  const [searchIndexesReady, setSearchIndexesReady] = useState(false)
  const speciesWrapRef = useRef<HTMLDivElement>(null)
  const abilityWrapRef = useRef<HTMLDivElement>(null)
  const itemWrapRef = useRef<HTMLDivElement>(null)

  const speciesQuery = species.trim()
  const abilityQuery = ability.trim()
  const itemQuery = item.trim()

  const {
    results: speciesResults,
    isPending: speciesPending,
  } = usePokemonSearch(speciesFocused ? speciesQuery : '')
  const {
    results: abilityResults,
    isPending: abilityPending,
  } = useAbilitySearch(abilityQuery, locale, searchIndexesReady && abilityFocused)
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
    setAbilityFocused(false)
    setItemFocused(false)
    setError(null)
  }, [existingSlot, locale, open])

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

  const showSpeciesSuggestions = speciesFocused && speciesQuery.length >= 2
  const showAbilitySuggestions =
    abilityFocused && abilityQuery.length >= 2 && searchIndexesReady
  const showItemSuggestions = itemFocused && itemQuery.length >= 2 && searchIndexesReady

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal card battle-editor-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <h3>{t('battle.enemyEditorTitle')}</h3>
        <form className="inline-form" onSubmit={handleSubmit}>
          <label className="control-group">
            <span className="control-label">{t('battle.editorSpecies')}</span>
            <div className="move-input-wrap battle-editor-input-wrap" ref={speciesWrapRef}>
              <input
                className="battle-editor-input"
                type="text"
                value={species}
                onChange={(event) => setSpecies(event.target.value)}
                onFocus={() => setSpeciesFocused(true)}
                onBlur={() => handleBlurWithDelay(setSpeciesFocused, speciesWrapRef)}
                placeholder={t('battle.editorSpeciesPlaceholder')}
                required
              />
              {showSpeciesSuggestions && speciesResults.length > 0 && (
                <ul className="move-suggestions battle-editor-suggestions" role="listbox">
                  {speciesResults.map((result) => (
                    <li key={result.name} role="option">
                      <button
                        type="button"
                        tabIndex={-1}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          setSpecies(result.name)
                          setSpeciesFocused(false)
                        }}
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
            <div className="move-input-wrap battle-editor-input-wrap" ref={abilityWrapRef}>
              <input
                className="battle-editor-input"
                type="text"
                value={ability}
                onChange={(event) => setAbility(event.target.value)}
                onFocus={() => setAbilityFocused(true)}
                onBlur={() =>
                  handleBlurWithDelay(setAbilityFocused, abilityWrapRef, () =>
                    setAbility((prev) => canonicalAbilityName(prev.trim())),
                  )
                }
                placeholder={t('battle.editorAbilityPlaceholder')}
              />
              {showAbilitySuggestions && abilityResults.length > 0 && (
                <ul className="move-suggestions battle-editor-suggestions" role="listbox">
                  {abilityResults.map((result) => (
                    <li key={result.slug} role="option">
                      <button
                        type="button"
                        tabIndex={-1}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          setAbility(result.canonicalName)
                          setAbilityFocused(false)
                        }}
                      >
                        {result.displayName}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {showAbilitySuggestions && abilityPending && abilityResults.length === 0 && (
                <p className="move-suggestions-status muted" aria-live="polite">
                  {t('search.searching')}
                </p>
              )}
            </div>
          </label>
          <label className="control-group">
            <span className="control-label">{t('battle.editorItem')}</span>
            <div className="move-input-wrap battle-editor-input-wrap" ref={itemWrapRef}>
              <input
                className="battle-editor-input"
                type="text"
                value={item}
                onChange={(event) => setItem(event.target.value)}
                onFocus={() => setItemFocused(true)}
                onBlur={() =>
                  handleBlurWithDelay(setItemFocused, itemWrapRef, () =>
                    setItem((prev) => normalizeItemInput(prev)),
                  )
                }
                placeholder={t('battle.editorItemPlaceholder')}
              />
              {showItemSuggestions && itemResults.length > 0 && (
                <ul className="move-suggestions battle-editor-suggestions" role="listbox">
                  {itemResults.map((result) => (
                    <li key={result.slug} role="option">
                      <button
                        type="button"
                        tabIndex={-1}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          setItem(result.canonicalName)
                          setItemFocused(false)
                        }}
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
