import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { MoveInput } from '@/features/search/components/MoveInput'
import { useI18n } from '@/i18n'
import {
  canonicalMoveName,
  ensureEditorIndexes,
  resolveMoveSlug,
} from '@/lib/localizedNames'

interface MovePoolEditorProps {
  title: string
  hint: string
  moves: string[]
  onChange: (moves: string[]) => void
  addLabel: string
  placeholder: string
  attacksViewOpen: boolean
  onToggleAttacksView: () => void
}

export function MovePoolEditor({
  title,
  hint,
  moves,
  onChange,
  addLabel,
  placeholder,
  attacksViewOpen,
  onToggleAttacksView,
}: MovePoolEditorProps) {
  const { t, locale } = useI18n()
  const [draft, setDraft] = useState('')
  const [indexReady, setIndexReady] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    void ensureEditorIndexes().then(() => {
      if (!cancelled) setIndexReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const focusInput = useCallback(() => {
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [])

  const addMove = useCallback(
    (raw: string): boolean => {
      const slug = resolveMoveSlug(raw)
      if (!slug) return false

      const canonical = canonicalMoveName(slug)
      const key = canonical.toLowerCase()

      setDraft('')

      if (moves.some((move) => canonicalMoveName(move).toLowerCase() === key)) {
        focusInput()
        return false
      }

      onChange([...moves, canonical])
      focusInput()
      return true
    },
    [focusInput, moves, onChange],
  )

  const canAddMove = useMemo(
    () => indexReady && draft.trim().length > 0 && resolveMoveSlug(draft) !== null,
    [draft, indexReady],
  )

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canAddMove) return
    const raw = inputRef.current?.value ?? draft
    addMove(raw)
  }

  return (
    <div className="move-pool-editor">
      <header className="move-pool-editor-header">
        <h4>{title}</h4>
        <p className="muted">{hint}</p>
      </header>

      <div className="move-pool-attacks-toggle">
        <button
          type="button"
          className={`move-pool-see-attacks btn btn-ghost btn-sm${attacksViewOpen ? ' active' : ''}`}
          aria-expanded={attacksViewOpen}
          onClick={onToggleAttacksView}
        >
          {attacksViewOpen
            ? t('moveLearn.hideAttacks')
            : t('moveLearn.seeAttacks', { count: moves.length })}
        </button>
      </div>

      <form className="move-pool-add-form" onSubmit={handleSubmit}>
        <span className="move-pool-add-form-label" id="move-pool-add-label">
          {addLabel}
        </span>
        <div className="move-pool-add-field" role="group" aria-labelledby="move-pool-add-label">
          <MoveInput
            ref={inputRef}
            value={draft}
            onChange={setDraft}
            onCommit={addMove}
            label={addLabel}
            placeholder={placeholder}
            locale={locale}
            indexReady={indexReady}
            variant="inline"
            commitOnBlur={false}
            keepFocusOnCommit
          />
          <button
            type="submit"
            className="move-pool-add-submit btn btn-primary btn-sm"
            disabled={!canAddMove}
          >
            {addLabel}
          </button>
        </div>
      </form>
    </div>
  )
}
