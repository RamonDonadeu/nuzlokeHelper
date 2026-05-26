import { useEffect, useMemo, useState } from 'react'
import type { EvolutionStage, PokemonAbility, PokemonStats, PokemonType } from '@/types/pokemon'
import { STAT_KEYS, STAT_LABELS } from '@/types/pokemon'
import type { PokemonSlot, SlotListName } from '@/types/profile'
import { EvolutionLine } from '@/components/EvolutionLine'
import { PokemonStatGrid } from '@/components/PokemonStatGrid'
import { usePokemonDetails } from '@/hooks/usePokemonDetails'
import { fetchPokemon } from '@/lib/pokeapi'
import { normalizePokemonTypes } from '@/lib/pokemonTypes'
import {
  calculateAllStats,
  defaultNature,
  getNatureDisplayLabel,
  MAX_EV_PER_STAT,
  MAX_EV_TOTAL,
  MAX_IV,
  sortedNaturesForDisplay,
  totalEvCount,
} from '@/lib/stats'
import { useI18n } from '@/i18n'
import { MoveInput } from '@/components/MoveInput'
import { useAbilityDescriptions } from '@/hooks/useAbilityDescriptions'
import { useEvolutionBadges } from '@/hooks/useBoxEvolutionBadges'
import { resolveMoveTypes } from '@/lib/moveTypes'
import {
  canonicalAbilityName,
  canonicalMoveName,
  displayMoveName,
  ensureEditorIndexes,
  getLocalizedAbilityName,
  getLocalizedPokemonNameBySlug,
  resolveAbilitySlug,
} from '@/lib/localizedNames'

interface PokemonEditorProps {
  slot: PokemonSlot
  list: SlotListName
  levelCap: number
  profileVersionGroup: string
  onBack: () => void
  onSave: (patch: Partial<PokemonSlot>) => void
  onEvolve?: (slotId: string) => void
  backLabel?: string
}

type StatDraft = Record<keyof PokemonStats, string>
type EditorMode = 'stats' | 'edit'

let sessionEditorMode: EditorMode = 'stats'
let sessionShowBaseStats = false

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
    if (raw === '') continue
    const value = Number(raw)
    if (!Number.isFinite(value)) continue
    result[key] = value
  }
  return Object.keys(result).length > 0 ? result : undefined
}

function clampStatValue(value: number, max: number): number {
  return Math.max(0, Math.min(max, Math.round(value)))
}

function movesToDraft(existing?: unknown[]): string[] {
  const source = Array.isArray(existing) ? existing : []
  return Array.from({ length: 4 }, (_, i) => {
    const raw = source[i]
    if (typeof raw === 'string') return raw
    if (raw == null) return ''
    return String(raw)
  })
}

const AUTO_SAVE_MS = 400

function buildEditorPatch(
  ivDraft: StatDraft,
  evDraft: StatDraft,
  nature: string,
  ability: string,
  moves: string[],
): Partial<PokemonSlot> {
  const ivs = parseStatDraft(ivDraft)
  const evs = parseStatDraft(evDraft)
  const trimmedMoves = moves.map((m) => canonicalMoveName(m.trim())).filter(Boolean)
  return {
    ivs,
    evs,
    nature: nature || defaultNature(),
    ability: ability.trim() ? canonicalAbilityName(ability.trim()) : undefined,
    moves: trimmedMoves.length > 0 ? trimmedMoves.slice(0, 4) : undefined,
  }
}

function statsPartialEqual(a?: Partial<PokemonStats>, b?: Partial<PokemonStats>): boolean {
  for (const key of STAT_KEYS) {
    if (a?.[key] !== b?.[key]) return false
  }
  return true
}

function draftMatchesSlot(
  slot: PokemonSlot,
  ivDraft: StatDraft,
  evDraft: StatDraft,
  nature: string,
  ability: string,
  moves: string[],
): boolean {
  const patch = buildEditorPatch(ivDraft, evDraft, nature, ability, moves)
  const slotNature = slot.nature ?? defaultNature()
  if ((patch.nature ?? defaultNature()) !== slotNature) return false

  const slotAbility = slot.ability?.trim()
    ? canonicalAbilityName(slot.ability.trim())
    : undefined
  if (patch.ability !== slotAbility) return false

  if (!statsPartialEqual(patch.ivs, slot.ivs)) return false
  if (!statsPartialEqual(patch.evs, slot.evs)) return false

  const patchMoves = patch.moves ?? []
  const slotMoves = movesToDraft(slot.moves)
    .map((m) => canonicalMoveName(m.trim()))
    .filter(Boolean)
  if (patchMoves.length !== slotMoves.length) return false
  return patchMoves.every((move, i) => move === slotMoves[i])
}

const EMPTY_BASE_STATS: PokemonStats = {
  hp: 0,
  attack: 0,
  defense: 0,
  specialAttack: 0,
  specialDefense: 0,
  speed: 0,
}

export function PokemonEditor({
  slot,
  list,
  levelCap,
  profileVersionGroup,
  onBack,
  onSave,
  onEvolve,
  backLabel,
}: PokemonEditorProps) {
  const { t, locale } = useI18n()
  const [mode, setMode] = useState<EditorMode>(() => sessionEditorMode)
  const [showBaseStats, setShowBaseStats] = useState(() => sessionShowBaseStats)
  const [speciesAbilities, setSpeciesAbilities] = useState<PokemonAbility[]>([])
  const [ivDraft, setIvDraft] = useState<StatDraft>(() => statsToDraft(slot.ivs))
  const [evDraft, setEvDraft] = useState<StatDraft>(() => statsToDraft(slot.evs))
  const [nature, setNature] = useState(slot.nature ?? defaultNature())
  const [ability, setAbility] = useState(slot.ability ?? '')
  const [moves, setMoves] = useState<string[]>(() => movesToDraft(slot.moves))
  const [abilitySlugs, setAbilitySlugs] = useState<string[]>([])
  const [loadingAbilities, setLoadingAbilities] = useState(true)
  const [moveIndexReady, setMoveIndexReady] = useState(false)
  const [moveTypesByName, setMoveTypesByName] = useState<Record<string, PokemonType | null>>({})
  const [previewEvolutionName, setPreviewEvolutionName] = useState<string | null>(null)

  const {
    evolutions,
    loading: detailsLoading,
    error: detailsError,
  } = usePokemonDetails(slot.name)

  useEffect(() => {
    let cancelled = false
    void ensureEditorIndexes().then(() => {
      if (!cancelled) setMoveIndexReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    setIvDraft(statsToDraft(slot.ivs))
    setEvDraft(statsToDraft(slot.evs))
    setNature(slot.nature ?? defaultNature())
    setAbility(slot.ability ?? '')
    setMoves(movesToDraft(slot.moves))
  }, [slot.slotId, slot.currentSpeciesId])

  useEffect(() => {
    setPreviewEvolutionName(null)
  }, [slot.slotId, slot.name])

  useEffect(() => {
    let cancelled = false
    setLoadingAbilities(true)
    fetchPokemon(slot.name)
      .then((pokemon) => {
        if (cancelled) return
        const slugs = pokemon.abilities.map((a) => a.slug)
        setSpeciesAbilities(pokemon.abilities)
        setAbilitySlugs(slugs)
        if (!slot.ability && slugs.length > 0) {
          setAbility(canonicalAbilityName(slugs[0]))
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAbilitySlugs([])
          setSpeciesAbilities([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingAbilities(false)
      })
    return () => {
      cancelled = true
    }
  }, [slot.name, slot.ability])

  const parsedIvs = useMemo(() => parseStatDraft(ivDraft), [ivDraft])
  const parsedEvs = useMemo(() => parseStatDraft(evDraft), [evDraft])
  const evTotal = totalEvCount(parsedEvs)
  const evOverCap = evTotal > MAX_EV_TOTAL

  useEffect(() => {
    if (evOverCap) return
    if (draftMatchesSlot(slot, ivDraft, evDraft, nature, ability, moves)) return

    const timer = window.setTimeout(() => {
      if (evOverCap) return
      const patch = buildEditorPatch(ivDraft, evDraft, nature, ability, moves)
      if (!draftMatchesSlot(slot, ivDraft, evDraft, nature, ability, moves)) {
        onSave(patch)
      }
    }, AUTO_SAVE_MS)

    return () => window.clearTimeout(timer)
  }, [slot, ivDraft, evDraft, nature, ability, moves, evOverCap, onSave])

  const baseStats = slot.baseStats ?? EMPTY_BASE_STATS
  const slotTypes = normalizePokemonTypes(slot.types)

  const effectiveLevel = Math.min(slot.level, levelCap)

  const previewStats = useMemo(
    () => calculateAllStats(baseStats, effectiveLevel, parsedIvs, parsedEvs, nature),
    [baseStats, effectiveLevel, parsedIvs, parsedEvs, nature],
  )

  const displayName = getLocalizedPokemonNameBySlug(slot.name, locale)

  const previewStage = useMemo((): EvolutionStage | null => {
    if (!previewEvolutionName || previewEvolutionName === slot.name) return null
    return evolutions.find((stage) => stage.name === previewEvolutionName) ?? null
  }, [previewEvolutionName, slot.name, evolutions])

  const natureOptions = useMemo(() => sortedNaturesForDisplay(locale), [locale])
  const configuredMoves = useMemo(
    () => moves.map((move) => canonicalMoveName(move.trim())).filter(Boolean).slice(0, 4),
    [moves],
  )

  const listLabel =
    list === 'team'
      ? t('editor.fromTeam')
      : list === 'box'
        ? t('editor.fromBox')
        : list === 'deathBox'
          ? t('editor.fromDeathBox')
          : t('editor.fromOpponent')

  const canShowEvolution = list === 'team' || list === 'box'
  const evolutionBadgeSlots = useMemo(
    () => (canShowEvolution ? [slot] : []),
    [canShowEvolution, slot.slotId, slot.name, slot.level],
  )
  const evolvableSlotIds = useEvolutionBadges(evolutionBadgeSlots)
  const canEvolve = canShowEvolution && evolvableSlotIds.has(slot.slotId)

  const handleIvChange = (key: keyof PokemonStats, value: string) => {
    setIvDraft((prev) => ({ ...prev, [key]: value }))
  }

  const handleEvChange = (key: keyof PokemonStats, value: string) => {
    setEvDraft((prev) => ({ ...prev, [key]: value }))
  }

  const handleResetStats = () => {
    setIvDraft(statsToDraft(undefined))
    setEvDraft(statsToDraft(undefined))
    setNature(defaultNature())
  }

  const abilityOptions = useMemo(() => {
    const options = [...abilitySlugs]
    const currentSlug = canonicalAbilityName(ability)
    const resolved = abilitySlugs.find((slug) => canonicalAbilityName(slug) === currentSlug)
    if (ability && !resolved) {
      options.unshift(ability)
    }
    return options
  }, [abilitySlugs, ability])

  const { descriptions: abilityDescriptions, loading: loadingAbilityDescriptions } =
    useAbilityDescriptions(abilitySlugs, locale, profileVersionGroup)

  const selectedAbilitySlug = useMemo(() => {
    const currentCanonical = canonicalAbilityName(ability)
    const matchedSlug = abilitySlugs.find((slug) => canonicalAbilityName(slug) === currentCanonical)
    if (matchedSlug) return matchedSlug
    return resolveAbilitySlug(ability)
  }, [ability, abilitySlugs])

  const selectedAbilityDescription = selectedAbilitySlug
    ? abilityDescriptions[selectedAbilitySlug]
    : undefined

  const handleModeChange = (next: EditorMode) => {
    sessionEditorMode = next
    setMode(next)
  }

  const handleBaseStatsToggle = (checked: boolean) => {
    sessionShowBaseStats = checked
    setShowBaseStats(checked)
  }

  const selectedAbilityCanonical = canonicalAbilityName(ability)

  useEffect(() => {
    let cancelled = false
    if (configuredMoves.length === 0) {
      setMoveTypesByName({})
      return () => {
        cancelled = true
      }
    }

    void resolveMoveTypes(configuredMoves)
      .then((resolvedTypes) => {
        if (cancelled) return
        const next: Record<string, PokemonType | null> = {}
        for (const moveName of configuredMoves) {
          next[moveName] = resolvedTypes.get(moveName) ?? null
        }
        setMoveTypesByName(next)
      })
      .catch(() => {
        if (cancelled) return
        const next: Record<string, PokemonType | null> = {}
        for (const moveName of configuredMoves) {
          next[moveName] = null
        }
        setMoveTypesByName(next)
      })

    return () => {
      cancelled = true
    }
  }, [configuredMoves])

  return (
    <section className="card pokemon-editor">
      <div className="editor-header">
        <div className="editor-toolbar">
          <button type="button" className="btn btn-ghost" onClick={onBack}>
            {backLabel ?? t('editor.back')}
          </button>
          <div className="editor-mode-toggle" role="tablist" aria-label={t('editor.stats')}>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'stats'}
              className={`tab-btn ${mode === 'stats' ? 'active' : ''}`}
              onClick={() => handleModeChange('stats')}
            >
              {t('editor.stats')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'edit'}
              className={`tab-btn ${mode === 'edit' ? 'active' : ''}`}
              onClick={() => handleModeChange('edit')}
            >
              {t('editor.modeEdit')}
            </button>
          </div>
        </div>
        <div className="editor-title">
          <img src={slot.sprite} alt="" />
          <div>
            <h2>{slot.nickname ?? displayName}</h2>
            {slot.nickname && <p className="muted">{displayName}</p>}
            <p className="muted">
              {listLabel} · {t('team.level', { level: slot.level })}
            </p>
            <div className="type-row">
              {slotTypes.map((type) => (
                <span key={type} className={`type-badge type-${type}`}>
                  {type}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {mode === 'stats' && (
      <div className="editor-detail-panel">
        {detailsLoading && <p className="muted">{t('compare.loading')}</p>}
        {detailsError && <p className="error-note">{detailsError}</p>}

        <div className="editor-stats-toolbar">
          <label className="toggle-switch">
            <span className="toggle-switch-label">{t('editor.useBaseStats')}</span>
            <input
              type="checkbox"
              role="switch"
              checked={showBaseStats}
              onChange={(e) => handleBaseStatsToggle(e.target.checked)}
              aria-label={t('editor.useBaseStats')}
            />
            <span className="toggle-switch-track" aria-hidden="true" />
          </label>
        </div>

        {showBaseStats ? (
          <PokemonStatGrid stats={baseStats} title={t('editor.baseStats')} />
        ) : (
          <PokemonStatGrid
            stats={previewStats}
            title={t('editor.statsAtLevel', { level: effectiveLevel })}
            nature={nature}
          />
        )}

        <div className="editor-move-summary">
          <h4>{t('editor.moves')}</h4>
          {configuredMoves.length > 0 ? (
            <ul className="editor-move-summary-list">
              {configuredMoves.map((moveName, index) => {
                const moveType = moveTypesByName[moveName]
                return (
                  <li key={`${moveName}-${index}`} className="editor-move-summary-item">
                    <span className="editor-move-summary-name">{displayMoveName(moveName, locale)}</span>
                    <span className={`type-badge ${moveType ? `type-${moveType}` : 'type-unknown'}`}>
                      {moveType ?? t('editor.moveTypeUnknown')}
                    </span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="muted">{t('editor.noMovesConfigured')}</p>
          )}
        </div>

        {!detailsLoading && evolutions.length > 0 && (
          <EvolutionLine
            evolutions={evolutions}
            currentName={slot.name}
            title={t('compare.evolutionLine')}
            highlightedName={previewEvolutionName ?? slot.name}
            onStageSelect={(name) =>
              setPreviewEvolutionName(name === slot.name ? null : name)
            }
          />
        )}

        {previewStage && (
          <div className="editor-evolution-preview">
            <p className="muted">
              {t('editor.previewingEvolution', {
                name: getLocalizedPokemonNameBySlug(previewStage.name, locale),
              })}
            </p>
            <PokemonStatGrid stats={previewStage.stats} title={t('editor.baseStats')} />
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setPreviewEvolutionName(null)}
            >
              {t('editor.clearEvolutionPreview')}
            </button>
          </div>
        )}

        {loadingAbilities ? (
          <p className="muted">{t('editor.loadingAbilities')}</p>
        ) : speciesAbilities.length > 0 ? (
          <div className="ability-list">
            <h4>{t('pokemon.abilities')}</h4>
            <ul>
              {speciesAbilities.map((speciesAbility) => {
                const description = abilityDescriptions[speciesAbility.slug]
                const isSelected =
                  selectedAbilityCanonical === canonicalAbilityName(speciesAbility.slug)
                return (
                  <li key={speciesAbility.slug} className={isSelected ? 'ability-selected' : undefined}>
                    <div className="ability-name-row">
                      <span>{getLocalizedAbilityName(speciesAbility.slug, locale)}</span>
                      {speciesAbility.isHidden && <span className="tag">{t('pokemon.hidden')}</span>}
                      {isSelected && <span className="tag">{t('editor.ability')}</span>}
                    </div>
                    {description?.text ? (
                      <p className="ability-description">
                        {description.text}
                        {description.source === 'generation' &&
                          description.fallbackGeneration != null && (
                            <span className="ability-description-fallback">
                              {' '}
                              {t('pokemon.abilityDescriptionFallbackGen', {
                                gen: description.fallbackGeneration,
                              })}
                            </span>
                          )}
                      </p>
                    ) : loadingAbilityDescriptions ? (
                      <p className="ability-description muted">
                        {t('pokemon.loadingAbilityDescription')}
                      </p>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </div>
        ) : null}
      </div>
      )}

      {mode === 'edit' && (
      <>
      {canEvolve && onEvolve && (
        <div className="editor-evolution-row">
          <span className="editor-evolve-badge">{t('editor.canEvolve')}</span>
          <button
            type="button"
            className="btn btn-sm editor-evolve-btn"
            onClick={() => onEvolve(slot.slotId)}
          >
            {t('editor.evolve')}
          </button>
        </div>
      )}

      <div className="editor-section">
        <h3>{t('editor.nature')}</h3>
        <select
          value={nature}
          onChange={(e) => setNature(e.target.value)}
          aria-label={t('editor.nature')}
        >
          {natureOptions.map((n) => (
            <option key={n} value={n}>
              {getNatureDisplayLabel(n, locale)}
            </option>
          ))}
        </select>
      </div>

      <div className="editor-section">
        <h3>{t('editor.ability')}</h3>
        {loadingAbilities ? (
          <p className="muted">{t('editor.loadingAbilities')}</p>
        ) : abilityOptions.length > 0 ? (
          <select
            value={ability}
            onChange={(e) => setAbility(e.target.value)}
            aria-label={t('editor.ability')}
          >
            {abilityOptions.map((slugOrName) => {
              const value = abilitySlugs.includes(slugOrName)
                ? canonicalAbilityName(slugOrName)
                : slugOrName
              const label = abilitySlugs.includes(slugOrName)
                ? getLocalizedAbilityName(slugOrName, locale)
                : slugOrName
              return (
                <option key={slugOrName} value={value}>
                  {label}
                </option>
              )
            })}
          </select>
        ) : (
          <input
            type="text"
            value={ability}
            onChange={(e) => setAbility(e.target.value)}
            placeholder={t('editor.abilityPlaceholder')}
          />
        )}
        {selectedAbilityDescription?.text ? (
          <p className="ability-description">
            {selectedAbilityDescription.text}
            {selectedAbilityDescription.source === 'generation' &&
              selectedAbilityDescription.fallbackGeneration != null && (
                <span className="ability-description-fallback">
                  {' '}
                  {t('pokemon.abilityDescriptionFallbackGen', {
                    gen: selectedAbilityDescription.fallbackGeneration,
                  })}
                </span>
              )}
          </p>
        ) : loadingAbilityDescriptions && selectedAbilitySlug ? (
          <p className="ability-description muted">{t('editor.loadingAbilityDescription')}</p>
        ) : null}
      </div>

      <div className="editor-section">
        <div className="editor-section-header">
          <h3>{t('editor.ivs')}</h3>
          <span className="muted">{t('editor.ivRange', { max: MAX_IV })}</span>
        </div>
        <div className="stat-input-grid">
          {STAT_KEYS.map((key) => (
            <label key={key} className="stat-input-row">
              <span>{STAT_LABELS[key]}</span>
              <input
                type="number"
                min={0}
                max={MAX_IV}
                placeholder="31"
                value={ivDraft[key]}
                onChange={(e) => handleIvChange(key, e.target.value)}
                onBlur={() => {
                  const raw = (ivDraft[key] ?? '').trim()
                  if (raw === '') return
                  const clamped = clampStatValue(Number(raw), MAX_IV)
                  setIvDraft((prev) => ({ ...prev, [key]: String(clamped) }))
                }}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="editor-section">
        <div className="editor-section-header">
          <h3>{t('editor.evs')}</h3>
          <span className={`ev-total ${evOverCap ? 'ev-over-cap' : ''}`}>
            {t('editor.evTotal', { current: evTotal, max: MAX_EV_TOTAL })}
          </span>
        </div>
        <div className="stat-input-grid">
          {STAT_KEYS.map((key) => (
            <label key={key} className="stat-input-row">
              <span>{STAT_LABELS[key]}</span>
              <input
                type="number"
                min={0}
                max={MAX_EV_PER_STAT}
                placeholder="0"
                value={evDraft[key]}
                onChange={(e) => handleEvChange(key, e.target.value)}
                onBlur={() => {
                  const raw = (evDraft[key] ?? '').trim()
                  if (raw === '') return
                  const clamped = clampStatValue(Number(raw), MAX_EV_PER_STAT)
                  setEvDraft((prev) => ({ ...prev, [key]: String(clamped) }))
                }}
              />
            </label>
          ))}
        </div>
        {evOverCap && <p className="error-note">{t('editor.evOverCap')}</p>}
      </div>

      <div className="editor-section">
        <h3>{t('editor.moves')}</h3>
        <div className="move-input-grid">
          {moves.map((move, index) => (
            <MoveInput
              key={index}
              label={t('editor.moveSlot', { n: index + 1 })}
              placeholder={t('editor.movePlaceholder')}
              value={move}
              locale={locale}
              indexReady={moveIndexReady}
              onChange={(next) => {
                setMoves((prev) => {
                  const updated = [...prev]
                  updated[index] = next
                  return updated
                })
              }}
            />
          ))}
        </div>
      </div>

      <div className="editor-actions">
        <button type="button" className="btn btn-ghost" onClick={handleResetStats}>
          {t('editor.resetStats')}
        </button>
      </div>
      </>
      )}
    </section>
  )
}
