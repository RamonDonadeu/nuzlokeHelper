import { useEffect, useRef, useState } from 'react'
import { useI18n } from '@/i18n'

const LOCALES = [
  { id: 'en' as const, label: 'EN' },
  { id: 'es' as const, label: 'ES' },
]

interface LanguageSelectorProps {
  locale: 'en' | 'es'
  onChange: (locale: 'en' | 'es') => void
}

export function LanguageSelector({ locale, onChange }: LanguageSelectorProps) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  return (
    <div className="lang-selector" ref={rootRef}>
      <button
        type="button"
        className="lang-selector-trigger"
        aria-label={t('locale')}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="lang-selector-globe" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
        </span>
        <span>{locale.toUpperCase()}</span>
        <span className="lang-selector-chevron" aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <ul className="lang-selector-menu" role="listbox" aria-label={t('locale')}>
          {LOCALES.map((item) => (
            <li key={item.id} role="none">
              <button
                type="button"
                role="option"
                aria-selected={locale === item.id}
                className={`lang-selector-option ${locale === item.id ? 'active' : ''}`}
                onClick={() => {
                  onChange(item.id)
                  setOpen(false)
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
