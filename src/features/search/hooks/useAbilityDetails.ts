import { useEffect, useState } from 'react'
import { ensureAbilityDescriptions, type CachedAbilityDetails } from '@/lib/abilityDetails'
import { resolveAbilitySlug } from '@/lib/localizedNames'

export function useAbilityDetails(abilityName: string | null) {
  const [ability, setAbility] = useState<CachedAbilityDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!abilityName) {
      setAbility(null)
      setLoading(false)
      setError(null)
      return
    }

    const slug = resolveAbilitySlug(abilityName)
    if (!slug) {
      setAbility(null)
      setLoading(false)
      setError('Ability not found.')
      return
    }

    const controller = new AbortController()
    let cancelled = false
    setLoading(true)
    setError(null)

    void (async () => {
      try {
        const map = await ensureAbilityDescriptions([slug], { signal: controller.signal })
        if (cancelled) return
        const details = map.get(slug) ?? null
        setAbility(details)
        if (!details) setError('Ability not found.')
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        if (!cancelled) {
          setAbility(null)
          setError('Failed to load ability data.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [abilityName])

  return { ability, loading, error }
}
