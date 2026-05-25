import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { en, type TranslationKey } from './locales/en'
import { es } from './locales/es'

export type Locale = 'en' | 'es'

const locales: Record<Locale, TranslationKey> = { en, es }

interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (path: string, params?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

function getNested(obj: TranslationKey, path: string): string | undefined {
  const parts = path.split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part]
    } else {
      return undefined
    }
  }
  return typeof current === 'string' ? current : undefined
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    params[key] !== undefined ? String(params[key]) : `{{${key}}}`,
  )
}

export function I18nProvider({
  locale,
  setLocale,
  children,
}: {
  locale: Locale
  setLocale: (locale: Locale) => void
  children: ReactNode
}) {
  const t = useCallback(
    (path: string, params?: Record<string, string | number>) => {
      const value = getNested(locales[locale], path) ?? getNested(en, path) ?? path
      return interpolate(value, params)
    },
    [locale],
  )

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
