import { useEffect, useState } from 'react'

import type { Locale } from '@/i18n'

import {

  ensureAbilityDescriptions,

  getAbilityDescription,

  type AbilityDescriptionResult,

} from '@/lib/abilityDetails'



export interface AbilityDescriptionDisplay extends AbilityDescriptionResult {}



export function useAbilityDescriptions(

  slugs: string[],

  locale: Locale,

  profileVersionGroup: string,

) {

  const [descriptions, setDescriptions] = useState<Record<string, AbilityDescriptionDisplay>>({})

  const [loading, setLoading] = useState(false)



  const slugKey = slugs.join(',')



  useEffect(() => {

    if (slugs.length === 0) {

      setDescriptions({})

      setLoading(false)

      return

    }



    let cancelled = false

    setLoading(true)



    void ensureAbilityDescriptions(slugs)

      .then((map) => {

        if (cancelled) return



        const next: Record<string, AbilityDescriptionDisplay> = {}

        for (const slug of slugs) {

          const entry = map.get(slug)

          if (entry) {

            next[slug] = getAbilityDescription(entry, locale, profileVersionGroup)

          }

        }

        setDescriptions(next)

      })

      .catch(() => {

        if (!cancelled) setDescriptions({})

      })

      .finally(() => {

        if (!cancelled) setLoading(false)

      })



    return () => {

      cancelled = true

    }

  }, [slugKey, locale, profileVersionGroup])



  return { descriptions, loading }

}


