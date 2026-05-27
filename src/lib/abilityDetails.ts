import type { Locale } from '@/i18n'

import {

  compareVersionGroups,

  getApiVersionGroup,

  versionGroupToGeneration,

} from '@/lib/versionGroups'



const POKEAPI_BASE = 'https://pokeapi.co/api/v2'

const CACHE_VERSION = 2

const STORAGE_KEY = 'nuzlokeHelper:abilityDetails:v2'

const BATCH_SIZE = 25



export interface AbilityFlavorEntry {

  versionGroup: string

  language: string

  text: string

}



export interface CachedAbilityDetails {

  slug: string

  shortEffectEn: string

  flavorEntries: AbilityFlavorEntry[]

}



export type AbilityDescriptionSource = 'exact' | 'generation' | 'short_effect' | 'latest'



export interface AbilityDescriptionResult {

  text: string

  source: AbilityDescriptionSource

  /** Set when source is `generation` — generation of the flavor text actually shown. */

  fallbackGeneration?: number

}



interface StoredCache {

  version: number

  entries: Record<string, CachedAbilityDetails>

}



interface PokeApiAbility {

  name: string

  effect_entries: Array<{

    short_effect: string

    language: { name: string }

  }>

  // PokeAPI stores one row per game generation; wording often changes between groups (e.g. X/Y vs Sun/Moon).

  flavor_text_entries: Array<{

    flavor_text: string

    language: { name: string }

    version_group: { name: string }

  }>

}



const memoryCache = new Map<string, CachedAbilityDetails>()

const inflight = new Map<string, Promise<CachedAbilityDetails>>()

let storageLoaded = false



function cleanFlavorText(text: string): string {

  return text.replace(/\f/g, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()

}



function parseAbilityDetails(data: PokeApiAbility): CachedAbilityDetails {

  const shortEffectEn =

    data.effect_entries.find((entry) => entry.language.name === 'en')?.short_effect.trim() ?? ''



  const flavorEntries = data.flavor_text_entries.map((entry) => ({

    versionGroup: entry.version_group.name,

    language: entry.language.name,

    text: cleanFlavorText(entry.flavor_text),

  }))



  return {

    slug: data.name,

    shortEffectEn,

    flavorEntries,

  }

}



function flavorLanguageForLocale(locale: Locale): string {

  return locale === 'es' ? 'es' : 'en'

}



function pickLatestFlavorEntry(entries: AbilityFlavorEntry[]): AbilityFlavorEntry | undefined {

  if (entries.length === 0) return undefined

  return [...entries].sort((a, b) => compareVersionGroups(a.versionGroup, b.versionGroup))[0]

}



function pickSameGenerationFlavorEntry(

  entries: AbilityFlavorEntry[],

  apiVersionGroup: string,

): AbilityFlavorEntry | undefined {

  const targetGeneration = versionGroupToGeneration(apiVersionGroup)

  const sameGeneration = entries.filter(

    (entry) => versionGroupToGeneration(entry.versionGroup) === targetGeneration,

  )

  return pickLatestFlavorEntry(sameGeneration)

}



/**

 * Pick one ability description for display.

 *

 * Priority:

 * 1. In-game flavor text for the profile's version group (exact match)

 * 2. In-game flavor text from any game in the same generation

 * 3. English short_effect (mechanical summary, language-agnostic fallback)

 * 4. Latest in-game flavor text in the requested language

 */

export function selectAbilityDescription(

  entry: CachedAbilityDetails,

  locale: Locale,

  profileVersionGroup: string,

): AbilityDescriptionResult {

  const apiVersionGroup = getApiVersionGroup(profileVersionGroup)

  const language = flavorLanguageForLocale(locale)

  const localizedFlavors = entry.flavorEntries.filter((flavor) => flavor.language === language)



  const exact = localizedFlavors.find((flavor) => flavor.versionGroup === apiVersionGroup)

  if (exact) {

    return { text: exact.text, source: 'exact' }

  }



  const sameGeneration = pickSameGenerationFlavorEntry(localizedFlavors, apiVersionGroup)

  if (sameGeneration) {

    return {

      text: sameGeneration.text,

      source: 'generation',

      fallbackGeneration: versionGroupToGeneration(sameGeneration.versionGroup),

    }

  }



  if (entry.shortEffectEn) {

    return { text: entry.shortEffectEn, source: 'short_effect' }

  }



  const latest = pickLatestFlavorEntry(localizedFlavors)

  if (latest) {

    return { text: latest.text, source: 'latest' }

  }



  if (language !== 'en') {

    const englishExact = entry.flavorEntries.find(

      (flavor) => flavor.language === 'en' && flavor.versionGroup === apiVersionGroup,

    )

    if (englishExact) {

      return { text: englishExact.text, source: 'exact' }

    }



    const englishSameGeneration = pickSameGenerationFlavorEntry(

      entry.flavorEntries.filter((flavor) => flavor.language === 'en'),

      apiVersionGroup,

    )

    if (englishSameGeneration) {

      return {

        text: englishSameGeneration.text,

        source: 'generation',

        fallbackGeneration: versionGroupToGeneration(englishSameGeneration.versionGroup),

      }

    }



    const englishLatest = pickLatestFlavorEntry(

      entry.flavorEntries.filter((flavor) => flavor.language === 'en'),

    )

    if (englishLatest) {

      return { text: englishLatest.text, source: 'latest' }

    }

  }



  return { text: '', source: 'latest' }

}



export function getAbilityDescription(

  entry: CachedAbilityDetails,

  locale: Locale,

  profileVersionGroup: string,

): AbilityDescriptionResult {

  return selectAbilityDescription(entry, locale, profileVersionGroup)

}



function loadStorageCache(): void {

  if (storageLoaded) return

  storageLoaded = true



  try {

    const raw = localStorage.getItem(STORAGE_KEY)

    if (!raw) return



    const parsed = JSON.parse(raw) as StoredCache

    if (parsed.version !== CACHE_VERSION) return



    for (const [slug, entry] of Object.entries(parsed.entries)) {

      memoryCache.set(slug, entry)

    }

  } catch {

    // ignore invalid cache

  }

}



function persistEntry(entry: CachedAbilityDetails): void {

  try {

    const raw = localStorage.getItem(STORAGE_KEY)

    const existing: StoredCache = raw

      ? (JSON.parse(raw) as StoredCache)

      : { version: CACHE_VERSION, entries: {} }



    if (existing.version !== CACHE_VERSION) {

      existing.version = CACHE_VERSION

      existing.entries = {}

    }



    existing.entries[entry.slug] = entry

    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing))

  } catch {

    // ignore quota / private mode

  }

}



async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {

  const response = await fetch(url, { signal })

  if (!response.ok) {

    throw new Error(`PokeAPI request failed (${response.status})`)

  }

  return response.json() as Promise<T>

}



async function fetchAbilityDetails(slug: string, signal?: AbortSignal): Promise<CachedAbilityDetails> {

  loadStorageCache()



  const cached = memoryCache.get(slug)

  if (cached) return cached



  const pending = inflight.get(slug)

  if (pending) return pending



  const promise = (async () => {

    try {

      const data = await fetchJson<PokeApiAbility>(`${POKEAPI_BASE}/ability/${slug}`, signal)

      const entry = parseAbilityDetails(data)

      memoryCache.set(slug, entry)

      persistEntry(entry)

      return entry

    } finally {

      inflight.delete(slug)

    }

  })()



  inflight.set(slug, promise)

  return promise

}



export function getCachedAbilityDescription(

  slug: string,

  locale: Locale,

  profileVersionGroup: string,

): AbilityDescriptionResult | null {

  loadStorageCache()

  const entry = memoryCache.get(slug)

  if (!entry) return null



  const description = getAbilityDescription(entry, locale, profileVersionGroup)

  return description.text ? description : null

}



export async function ensureAbilityDescriptions(

  slugs: string[],
  options?: { signal?: AbortSignal },

): Promise<Map<string, CachedAbilityDetails>> {

  loadStorageCache()



  const unique = [...new Set(slugs.filter(Boolean))]

  const result = new Map<string, CachedAbilityDetails>()



  for (const slug of unique) {

    const cached = memoryCache.get(slug)

    if (cached) result.set(slug, cached)

  }



  const missing = unique.filter((slug) => !result.has(slug))



  for (let offset = 0; offset < missing.length; offset += BATCH_SIZE) {

    const batch = missing.slice(offset, offset + BATCH_SIZE)

    const entries = await Promise.all(batch.map((slug) => fetchAbilityDetails(slug, options?.signal)))

    for (const entry of entries) {

      result.set(entry.slug, entry)

    }

  }



  return result

}


