import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { Locale } from '@/i18n'
import { useMoveSearch } from '@/features/search/hooks/useMoveSearch'
import { useSuggestionKeyboard } from '@/shared/hooks/useSuggestionKeyboard'
import { canonicalMoveName, displayMoveName } from '@/lib/localizedNames'

interface MoveInputProps {
  value: string
  onChange: (value: string) => void
  label: string
  placeholder: string
  locale: Locale
  indexReady: boolean
}

function toMoveText(value: string): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value)
}

export function MoveInput({
  value,
  onChange,
  label,
  placeholder,
  locale,
  indexReady,
}: MoveInputProps) {
  const safeValue = toMoveText(value)
  const listId = useId()
  const wrapRef = useRef<HTMLDivElement>(null)
  const [text, setText] = useState(() => displayMoveName(safeValue, locale))
  const [focused, setFocused] = useState(false)
  const { results, isPending } = useMoveSearch(text, locale, indexReady && focused)

  useEffect(() => {
    if (!focused) {
      setText(displayMoveName(toMoveText(value), locale))
    }
  }, [value, locale, focused])

  const showSuggestions = focused && text.trim().length >= 2 && indexReady
  const query = text.trim()

  const commitValue = (nextText: string) => {
    const canonical = canonicalMoveName(nextText)
    onChange(canonical)
    setText(displayMoveName(canonical, locale))
  }

  const handleSelect = useCallback((canonicalName: string) => {
    onChange(canonicalName)
    setText(displayMoveName(canonicalName, locale))
    setFocused(false)
  }, [locale, onChange])

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
      commitValue(text)
    }, 150)
  }

  return (
    <label className="move-input-row">
      <span>{label}</span>
      <div className="move-input-wrap" ref={wrapRef}>
        <input
          type="text"
          value={text}
          placeholder={placeholder}
          aria-autocomplete="list"
          aria-controls={showSuggestions && results.length > 0 ? listId : undefined}
          aria-expanded={showSuggestions && results.length > 0}
          aria-activedescendant={
            highlightedIndex >= 0 ? `${listId}-option-${highlightedIndex}` : undefined
          }
          onChange={(event) => setText(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={handleBlur}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setFocused(false)
              setText(displayMoveName(safeValue, locale))
              return
            }
            handleSuggestionKeyDown(event)
          }}
        />
        {showSuggestions && results.length > 0 && (
          <ul ref={listRef} className="move-suggestions" id={listId} role="listbox">
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
          <p className="move-suggestions-status muted" aria-live="polite">
            …
          </p>
        )}
      </div>
    </label>
  )
}
