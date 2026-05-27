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

    let cancelled = false
    setLoading(true)
    setError(null)

    void (async () => {
      try {
        const map = await ensureAbilityDescriptions([slug])
        if (cancelled) return
        const details = map.get(slug) ?? null
        setAbility(details)
        if (!details) setError('Ability not found.')
      } catch {
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
    }
  }, [abilityName])

  return { ability, loading, error }
}
