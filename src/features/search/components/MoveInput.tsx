import { forwardRef, useCallback, useEffect, useId, useImperativeHandle, useRef, useState } from 'react'
import type { Locale } from '@/i18n'
import { useMoveSearch } from '@/features/search/hooks/useMoveSearch'
import { useSuggestionKeyboard } from '@/shared/hooks/useSuggestionKeyboard'
import { canonicalMoveName, displayMoveName } from '@/lib/localizedNames'
import { fetchMoveDetails, getCachedMoveDetails } from '@/lib/moveTypes'
import type { PokemonType } from '@/types/pokemon'

interface MoveInputProps {
  value: string
  onChange: (value: string) => void
  label: string
  placeholder: string
  locale: Locale
  indexReady: boolean
  /** Compact battle-editor row with optional type badge; inline = label via aria-label only. */
  variant?: 'default' | 'battle' | 'inline'
  showTypeBadge?: boolean
  /** Called when the user picks a move from suggestions (click or Enter). */
  onCommit?: (canonicalName: string) => void
  /** When false, blur does not push canonical text to the parent (pool form). */
  commitOnBlur?: boolean
  /** Keep the input focused after selecting a suggestion (pool form). */
  keepFocusOnCommit?: boolean
}

function toMoveText(value: string): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value)
}

export const MoveInput = forwardRef<HTMLInputElement, MoveInputProps>(function MoveInput(
  {
    value,
    onChange,
    label,
    placeholder,
    locale,
    indexReady,
    variant = 'default',
    showTypeBadge = false,
    onCommit,
    commitOnBlur = true,
    keepFocusOnCommit = false,
  },
  ref,
) {
  const safeValue = toMoveText(value)
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useImperativeHandle(ref, () => inputRef.current as HTMLInputElement)
  const [text, setText] = useState(() => displayMoveName(safeValue, locale))
  const [focused, setFocused] = useState(false)
  const [moveType, setMoveType] = useState<PokemonType | null>(null)
  const { results, isPending } = useMoveSearch(text, locale, indexReady && focused)
  const isBattle = variant === 'battle'
  const isInline = variant === 'inline'
  const inputClassName = isBattle ? 'battle-editor-input' : isInline ? 'move-pool-input' : undefined

  useEffect(() => {
    if (!showTypeBadge) {
      setMoveType(null)
      return
    }
    const canonical = canonicalMoveName(safeValue)
    if (!canonical.trim()) {
      setMoveType(null)
      return
    }
    const cached = getCachedMoveDetails(canonical)
    if (cached?.type) {
      setMoveType(cached.type)
      return
    }
    let cancelled = false
    void fetchMoveDetails(canonical).then((details) => {
      if (!cancelled) setMoveType(details?.type ?? null)
    })
    return () => {
      cancelled = true
    }
  }, [safeValue, showTypeBadge])

  useEffect(() => {
    const external = toMoveText(value)
    if (!focused || (isInline && !external.trim())) {
      setText(displayMoveName(external, locale))
    }
  }, [value, locale, focused, isInline])

  const showSuggestions = focused && text.trim().length >= 2 && indexReady
  const query = text.trim()

  const commitValue = (nextText: string) => {
    const canonical = canonicalMoveName(nextText)
    onChange(canonical)
    setText(displayMoveName(canonical, locale))
  }

  const handleSelect = useCallback(
    (canonicalName: string) => {
      onChange(canonicalName)
      setText(displayMoveName(canonicalName, locale))
      if (!keepFocusOnCommit) {
        setFocused(false)
      }
      onCommit?.(canonicalName)
      if (showTypeBadge) {
        const cached = getCachedMoveDetails(canonicalName)
        setMoveType(cached?.type ?? null)
      }
    },
    [locale, onChange, onCommit, keepFocusOnCommit, showTypeBadge],
  )

  const resetKey = `${query}\0${results.map((result) => result.slug).join('\0')}`
  const {
    highlightedIndex,
    listRef,
    handleKeyDown: handleSuggestionKeyDown,
  } = useSuggestionKeyboard({
    enabled: showSuggestions && results.length > 0,
    results,
    resetKey,
    onSelect: (result) => handleSelect(result.canonicalName),
  })

  const handleBlur = () => {
    window.setTimeout(() => {
      if (wrapRef.current?.contains(document.activeElement)) return
      setFocused(false)
      if (commitOnBlur) {
        commitValue(text)
      }
    }, 150)
  }

  return (
    <label
      className={[
        'move-input-row',
        isBattle ? 'battle-move-input-row' : '',
        isInline ? 'move-input-row--inline' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {isInline ? null : isBattle ? (
        <span className="control-label">{label}</span>
      ) : (
        <span>{label}</span>
      )}
      <div className={isBattle ? 'battle-move-inline' : undefined}>
        <div className={`move-input-wrap${isBattle ? ' battle-editor-input-wrap' : ''}`} ref={wrapRef}>
          <input
            type="text"
            className={inputClassName}
            value={text}
            placeholder={placeholder}
            aria-label={isInline ? label : undefined}
            aria-autocomplete="list"
            aria-controls={showSuggestions && results.length > 0 ? listId : undefined}
            aria-expanded={showSuggestions && results.length > 0}
            aria-activedescendant={
              highlightedIndex >= 0 ? `${listId}-option-${highlightedIndex}` : undefined
            }
            onChange={(event) => {
              const next = event.target.value
              setText(next)
              if (isInline) {
                onChange(next)
              }
            }}
            onFocus={() => setFocused(true)}
            onBlur={handleBlur}
            ref={inputRef}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setFocused(false)
                setText(displayMoveName(safeValue, locale))
                return
              }
              if (
                (event.key === 'Enter' ||
                  event.key === 'ArrowDown' ||
                  event.key === 'ArrowUp') &&
                handleSuggestionKeyDown(event)
              ) {
                return
              }
            }}
          />
          {showSuggestions && results.length > 0 && (
            <ul
              ref={listRef}
              className={[
                'move-suggestions',
                isBattle ? 'battle-editor-suggestions' : '',
                isInline ? 'move-pool-suggestions' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              id={listId}
              role="listbox"
            >
              {results.map((result, index) => (
                <li
                  key={result.slug}
                  id={`${listId}-option-${index}`}
                  role="option"
                  aria-selected={index === highlightedIndex}
                >
                  <button
                    type="button"
                    tabIndex={-1}
                    className={index === highlightedIndex ? 'is-highlighted' : undefined}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleSelect(result.canonicalName)}
                  >
                    {result.displayName}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {showSuggestions && isPending && results.length === 0 && (
            <p
              className={`move-suggestions-status muted${isInline ? ' move-pool-suggestions-status' : ''}`}
              aria-live="polite"
            >
              …
            </p>
          )}
        </div>
        {isBattle && showTypeBadge && moveType ? (
          <span className={`type-badge type-${moveType}`}>{moveType}</span>
        ) : null}
      </div>
    </label>
  )
})
