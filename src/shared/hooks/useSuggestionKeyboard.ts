import { useCallback, useEffect, useRef, useState } from 'react'

interface UseSuggestionKeyboardOptions<T> {
  enabled: boolean
  results: T[]
  resetKey: string
  onSelect: (item: T) => void
}

export function useSuggestionKeyboard<T>({
  enabled,
  results,
  resetKey,
  onSelect,
}: UseSuggestionKeyboardOptions<T>) {
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    setHighlightedIndex(-1)
  }, [resetKey])

  useEffect(() => {
    if (highlightedIndex < 0 || !listRef.current) return
    const option = listRef.current.children[highlightedIndex] as HTMLElement | undefined
    option?.scrollIntoView({ block: 'nearest' })
  }, [highlightedIndex])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!enabled || results.length === 0) return false

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setHighlightedIndex((current) => (current < results.length - 1 ? current + 1 : 0))
        return true
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setHighlightedIndex((current) => (current > 0 ? current - 1 : results.length - 1))
        return true
      }

      if (event.key === 'Enter') {
        event.preventDefault()
        const index = highlightedIndex >= 0 ? highlightedIndex : 0
        onSelect(results[index])
        return true
      }

      return false
    },
    [enabled, highlightedIndex, onSelect, results],
  )

  return { highlightedIndex, listRef, handleKeyDown }
}
