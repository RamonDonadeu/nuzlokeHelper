import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from 'react'
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
import {
  defaultNature,
  getNatureDisplayLabel,
  MAX_EV_PER_STAT,
  MAX_IV,
  sortedNaturesForDisplay,
} from '@/lib/stats'
import { useI18n } from '@/i18n'
import { STAT_KEYS, STAT_LABELS, type PokemonAbility, type PokemonStats } from '@/types/pokemon'
import { formatPokemonName } from '@/types/pokemon'
import { clampPokemonLevel, MAX_LEVEL_CAP, MIN_POKEMON_LEVEL } from '@/types/profile'
import type { PokemonSlot } from '@/types/profile'

interface BattlePokemonEditorModalProps {
  open: boolean
  title: string
  existingSlot: PokemonSlot | null
  levelCap: number
  allowSpeciesEdit?: boolean
  onClose: () => void
  onSubmit: (slot: PokemonSlot) => void
}

type StatDraft = Record<keyof PokemonStats, string>
type EditorPanel = 'main' | 'stats'

const EMPTY_MOVES = ['', '', '', '']
const DEFAULT_IV_VALUE = '31'
const DEFAULT_EV_VALUE = '0'

function statsToDraft(values?: Partial<PokemonStats>): StatDraft {
  const draft = {} as StatDraft
  for (const key of STAT_KEYS) {
    draft[key] = values?.[key] !== undefined ? String(values[key]) : ''
  }
  return draft
}

function parseStatDraft(draft: StatDraft): Partial<PokemonStats> | undefined {
  const result: Partial<PokemonStats> = {}
  for (const key of STAT_KEYS) {
    const raw = draft[key].trim()
    if (!raw) continue
    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) continue
    result[key] = parsed
  }
  return Object.keys(result).length > 0 ? result : undefined
}

function clampStatValue(value: number, max: number): number {
  return Math.max(0, Math.min(max, Math.round(value)))
}

function createDefaultIvDraft(): StatDraft {
  const draft = {} as StatDraft
  for (const key of STAT_KEYS) draft[key] = DEFAULT_IV_VALUE
  return draft
}

function createDefaultEvDraft(): StatDraft {
  const draft = {} as StatDraft
  for (const key of STAT_KEYS) draft[key] = DEFAULT_EV_VALUE
  return draft
}

function fillEmptyStatDraft(draft: StatDraft, defaultValue: string): StatDraft {
  const next = { ...draft }
  for (const key of STAT_KEYS) {
    if (!next[key]?.trim()) next[key] = defaultValue
  }
  return next
}

function editorDefaultLevel(existingSlot: PokemonSlot | null, levelCap: number): number {
  if (existingSlot == null) return levelCap
  return existingSlot.level ?? levelCap
}

export function BattlePokemonEditorModal({
  open,
  title,
  existingSlot,
  levelCap,
  allowSpeciesEdit = true,
  onClose,
  onSubmit,
}: BattlePokemonEditorModalProps) {
  const { t, locale } = useI18n()
  const maxLevel = Math.min(MAX_LEVEL_CAP, levelCap)
  const defaultLevel = editorDefaultLevel(existingSlot, levelCap)
  const [species, setSpecies] = useState(existingSlot?.name ?? '')
  const [ability, setAbility] = useState(existingSlot?.ability ?? '')
  const [item, setItem] = useState(existingSlot?.item ?? '')
  const [level, setLevel] = useState(() => String(editorDefaultLevel(existingSlot, levelCap)))
  const [levelDraft, setLevelDraft] = useState<string | null>(null)
  const [nature, setNature] = useState(existingSlot?.nature ?? defaultNature())
  const [moves, setMoves] = useState<string[]>(
    existingSlot?.moves ? [...existingSlot.moves, ...EMPTY_MOVES].slice(0, 4) : EMPTY_MOVES,
  )
  const [ivDraft, setIvDraft] = useState<StatDraft>(() => statsToDraft(existingSlot?.ivs))
  const [evDraft, setEvDraft] = useState<StatDraft>(() => statsToDraft(existingSlot?.evs))
  const [panel, setPanel] = useState<EditorPanel>('main')
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

  const speciesSlug = useMemo(() => {
    if (!allowSpeciesEdit) return existingSlot?.name ?? ''
    return species.trim().toLowerCase().replace(/\s+/g, '-')
  }, [allowSpeciesEdit, existingSlot?.name, species])
  const speciesQuery = species.trim()
  const itemQuery = item.trim()

  const {
    results: speciesResults,
    isPending: speciesPending,
  } = usePokemonSearch(allowSpeciesEdit && speciesFocused ? speciesQuery : '')
  const {
    results: itemResults,
    isPending: itemPending,
  } = useItemSearch(itemQuery, locale, searchIndexesReady && itemFocused)
  const canSubmit = useMemo(() => {
    const hasSpecies = allowSpeciesEdit ? species.trim().length >= 2 : Boolean(existingSlot)
    return hasSpecies && !isSaving
  }, [allowSpeciesEdit, existingSlot, isSaving, species])

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

  useLayoutEffect(() => {
    if (!open) return
    setSpecies(existingSlot?.name ?? '')
    setAbility(existingSlot?.ability ? canonicalAbilityName(existingSlot.ability) : '')
    setItem(existingSlot?.item ? displayItemName(existingSlot.item, locale) : '')
    setLevel(String(editorDefaultLevel(existingSlot, levelCap)))
    setLevelDraft(null)
    setNature(existingSlot?.nature ?? defaultNature())
    setIvDraft(statsToDraft(existingSlot?.ivs))
    setEvDraft(statsToDraft(existingSlot?.evs))
    setMoves(
      existingSlot?.moves
        ? [...existingSlot.moves.map((move) => displayMoveName(move, locale)), ...EMPTY_MOVES].slice(0, 4)
        : EMPTY_MOVES,
    )
    setPanel('main')
    setSpeciesFocused(false)
    setItemFocused(false)
    setError(null)
  }, [existingSlot, levelCap, locale, open])

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

  const showSpeciesSuggestions = allowSpeciesEdit && speciesFocused && speciesQuery.length >= 2
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
    if (!open || existingSlot || !allowSpeciesEdit) return
    const timer = window.setTimeout(() => {
      speciesInputRef.current?.focus()
      setSpeciesFocused(true)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [allowSpeciesEdit, open, existingSlot])

  if (!open) return null

  const setMove = (index: number, value: string) => {
    setMoves((prev) => prev.map((move, i) => (i === index ? value : move)))
  }

  const natureOptions = sortedNaturesForDisplay(locale)

  const openStatsPanel = () => {
    setIvDraft((prev) => fillEmptyStatDraft(prev, DEFAULT_IV_VALUE))
    setEvDraft((prev) => fillEmptyStatDraft(prev, DEFAULT_EV_VALUE))
    setPanel('stats')
  }

  const resetStatsToDefaults = () => {
    setIvDraft(createDefaultIvDraft())
    setEvDraft(createDefaultEvDraft())
  }

  const renderStatInputs = (
    draft: StatDraft,
    setDraft: Dispatch<SetStateAction<StatDraft>>,
    max: number,
    placeholder: string,
  ) => (
    <div className="stat-input-grid">
      {STAT_KEYS.map((key) => (
        <label key={key} className="stat-input-row">
          <span>{STAT_LABELS[key]}</span>
          <input
            className="battle-editor-input"
            type="number"
            min={0}
            max={max}
            step={1}
            value={draft[key]}
            placeholder={placeholder}
            onChange={(event) => setDraft((prev) => ({ ...prev, [key]: event.target.value }))}
            onBlur={() => {
              const raw = (draft[key] ?? '').trim()
              if (!raw) return
              const clamped = clampStatValue(Number(raw), max)
              setDraft((prev) => ({ ...prev, [key]: String(clamped) }))
            }}
          />
        </label>
      ))}
    </div>
  )

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedSpecies = allowSpeciesEdit
      ? species.trim().toLowerCase().replace(/\s+/g, '-')
      : existingSlot?.name ?? ''
    if (!trimmedSpecies) return
    setIsSaving(true)
    setError(null)

    try {
      const pokemon = await fetchPokemon(trimmedSpecies)
      const levelRaw = (levelDraft ?? level).trim()
      const parsedLevel = Number(levelRaw)
      const safeLevel = clampPokemonLevel(
        levelRaw ? parsedLevel : editorDefaultLevel(existingSlot, levelCap),
        levelCap,
      )
      const nextSlot: PokemonSlot = {
        slotId: existingSlot?.slotId ?? crypto.randomUUID(),
        speciesId: pokemon.id,
        currentSpeciesId: pokemon.id,
        name: pokemon.name,
        displayName: pokemon.displayName,
        types: pokemon.types,
        baseStats: pokemon.stats,
        sprite: pokemon.sprite,
        level: safeLevel,
        nature: nature || defaultNature(),
        ivs: parseStatDraft(ivDraft),
        evs: parseStatDraft(evDraft),
        ability: canonicalAbilityName(ability.trim()) || undefined,
        item: item.trim() || undefined,
        moves: moves.map((move) => move.trim()).filter(Boolean),
      }
      onSubmit(nextSlot)
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
        <div className="battle-editor-header">
          <h3 className="battle-editor-title">{panel === 'main' ? title : t('battle.editorIvEvTitle')}</h3>
          <div className="battle-editor-header-actions">
            {panel === 'stats' ? (
              <button
                type="button"
                className="btn btn-sm battle-editor-action-btn"
                onClick={() => setPanel('main')}
              >
                {t('battle.editorBack')}
              </button>
            ) : (
              <button type="button" className="btn btn-sm battle-editor-action-btn" onClick={openStatsPanel}>
                {t('battle.editorSetIvEv')}
              </button>
            )}
          </div>
        </div>
        <form className="inline-form battle-editor-form" onSubmit={handleSubmit}>
          <div className="battle-editor-scroll">
          {panel === 'stats' ? (
            <div className="battle-editor-stats-panel">
              <div className="editor-section">
                <div className="editor-section-header">
                  <h3>{t('editor.ivs')}</h3>
                  <span className="muted">{t('editor.ivRange', { max: MAX_IV })}</span>
                </div>
                {renderStatInputs(ivDraft, setIvDraft, MAX_IV, DEFAULT_IV_VALUE)}
              </div>
              <div className="editor-section">
                <div className="editor-section-header">
                  <h3>{t('editor.evs')}</h3>
                  <span className="muted">0–{MAX_EV_PER_STAT}</span>
                </div>
                {renderStatInputs(evDraft, setEvDraft, MAX_EV_PER_STAT, DEFAULT_EV_VALUE)}
              </div>
              <button type="button" className="btn btn-sm btn-ghost" onClick={resetStatsToDefaults}>
                {t('battle.editorResetStats')}
              </button>
            </div>
          ) : (
            <>
          {allowSpeciesEdit ? (
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
          ) : null}
          <div className="battle-editor-meta-grid">
            <label className="control-group">
              <span className="control-label">{t('battle.editorLevel')}</span>
              <div className="number-stepper" role="group" aria-label={t('battle.editorLevel')}>
                <button
                  type="button"
                  className="number-stepper-btn"
                  disabled={clampPokemonLevel(Number(levelDraft ?? level) || defaultLevel, levelCap) <= MIN_POKEMON_LEVEL}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    const current = clampPokemonLevel(Number(levelDraft ?? level) || defaultLevel, levelCap)
                    setLevel(String(clampPokemonLevel(current - 1, levelCap)))
                    setLevelDraft(null)
                  }}
                  aria-label={t('battle.editorLevelDecrease')}
                >
                  −
                </button>
                <input
                  type="number"
                  className="number-stepper-input"
                  min={MIN_POKEMON_LEVEL}
                  max={maxLevel}
                  step={1}
                  value={levelDraft ?? level}
                  onChange={(event) => setLevelDraft(event.target.value)}
                  onBlur={() => {
                    const raw = (levelDraft ?? level).trim()
                    if (!raw) {
                      setLevel(String(defaultLevel))
                      setLevelDraft(null)
                      return
                    }
                    setLevel(String(clampPokemonLevel(Number(raw), levelCap)))
                    setLevelDraft(null)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.currentTarget.blur()
                    }
                  }}
                  aria-label={t('battle.editorLevel')}
                />
                <button
                  type="button"
                  className="number-stepper-btn"
                  disabled={clampPokemonLevel(Number(levelDraft ?? level) || defaultLevel, levelCap) >= maxLevel}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    const current = clampPokemonLevel(Number(levelDraft ?? level) || defaultLevel, levelCap)
                    setLevel(String(clampPokemonLevel(current + 1, levelCap)))
                    setLevelDraft(null)
                  }}
                  aria-label={t('battle.editorLevelIncrease')}
                >
                  +
                </button>
              </div>
            </label>
            <label className="control-group">
              <span className="control-label">{t('editor.nature')}</span>
              <select className="battle-editor-input" value={nature} onChange={(event) => setNature(event.target.value)}>
                {natureOptions.map((value) => (
                  <option key={value} value={value}>
                    {getNatureDisplayLabel(value, locale)}
                  </option>
                ))}
              </select>
            </label>
          </div>
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
          <div className="battle-move-input-grid">
            {moves.map((move, index) => (
              <MoveInput
                key={`battle-move-${index}`}
                variant="battle"
                showTypeBadge
                label={t('battle.editorMove', { n: index + 1 })}
                placeholder={t('battle.editorMovePlaceholder')}
                value={move}
                locale={locale}
                indexReady={searchIndexesReady}
                onChange={(next) => setMove(index, next)}
              />
            ))}
          </div>
            </>
          )}
          {error && <p className="error-note">{error}</p>}
          </div>
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

