import type { Locale } from '@/i18n'
import type { PokemonType } from '@/types/pokemon'
import { resolveMoveSlug } from '@/lib/localizedNames'
import { compareVersionGroups } from '@/lib/versionGroups'

const POKEAPI_BASE = 'https://pokeapi.co/api/v2'
const CACHE_KEY = 'nuzlokeHelper:moveTypes:v1'
const DETAILS_CACHE_KEY = 'nuzlokeHelper:moveDetails:v2'

const memoryCache = new Map<string, PokemonType | null>()
const detailsMemoryCache = new Map<string, MoveDetails | null>()
let storageLoaded = false
let detailsStorageLoaded = false

export interface MoveFlavorEntry {
  versionGroup: string
  language: string
  text: string
}

export interface MoveDetails {
  slug: string
  name: string
  type: PokemonType | null
  power: number | null
  accuracy: number | null
  pp: number | null
  damageClass: 'physical' | 'special' | 'status' | null
  shortEffectEn: string
  flavorEntries: MoveFlavorEntry[]
}

function cleanFlavorText(text: string): string {
  return text.replace(/\f/g, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()
}

function flavorLanguageForLocale(locale: Locale): string {
  return locale === 'es' ? 'es' : 'en'
}

function pickLatestFlavorEntry(entries: MoveFlavorEntry[]): MoveFlavorEntry | undefined {
  if (entries.length === 0) return undefined
  return [...entries].sort((a, b) => compareVersionGroups(a.versionGroup, b.versionGroup))[0]
}

/** In-game flavor for the locale, then English short_effect, then latest English flavor. */
export function getMoveDescription(move: MoveDetails, locale: Locale): string {
  const language = flavorLanguageForLocale(locale)
  const localized = move.flavorEntries.filter((entry) => entry.language === language)
  const latestLocalized = pickLatestFlavorEntry(localized)
  if (latestLocalized?.text) return latestLocalized.text
  if (move.shortEffectEn) return move.shortEffectEn
  const latestEnglish = pickLatestFlavorEntry(
    move.flavorEntries.filter((entry) => entry.language === 'en'),
  )
  return latestEnglish?.text ?? ''
}

function toMoveSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/['.]/g, '')
    .replace(/\s+/g, '-')
}

function loadStorageCache(): void {
  if (storageLoaded) return
  storageLoaded = true
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as Record<string, PokemonType | null>
    for (const [slug, type] of Object.entries(parsed)) {
      memoryCache.set(slug, type)
    }
  } catch {
    // ignore
  }
}

function loadDetailsStorageCache(): void {
  if (detailsStorageLoaded) return
  detailsStorageLoaded = true
  try {
    const raw = localStorage.getItem(DETAILS_CACHE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as Record<string, MoveDetails | null>
    for (const [slug, details] of Object.entries(parsed)) {
      detailsMemoryCache.set(slug, details)
      if (details?.type) {
        memoryCache.set(slug, details.type)
      }
    }
  } catch {
    // ignore
  }
}

function persistCache(): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(memoryCache)))
  } catch {
    // ignore quota / private mode
  }
}

function persistDetailsCache(): void {
  try {
    localStorage.setItem(DETAILS_CACHE_KEY, JSON.stringify(Object.fromEntries(detailsMemoryCache)))
  } catch {
    // ignore quota / private mode
  }
}

async function fetchMoveDetailsBySlug(slug: string): Promise<MoveDetails | null> {
  const response = await fetch(`${POKEAPI_BASE}/move/${slug}`)
  if (!response.ok) return null
  const data = (await response.json()) as {
    name?: string
    type?: { name: string }
    power?: number | null
    accuracy?: number | null
    pp?: number | null
    damage_class?: { name: string }
    effect_entries?: Array<{
      short_effect: string
      language: { name: string }
    }>
    flavor_text_entries?: Array<{
      flavor_text: string
      language: { name: string }
      version_group: { name: string }
    }>
  }
  const damageClass = data.damage_class?.name
  const typeName = data.type?.name
  const shortEffectEn =
    data.effect_entries?.find((entry) => entry.language.name === 'en')?.short_effect.trim() ?? ''
  const flavorEntries =
    data.flavor_text_entries?.map((entry) => ({
      versionGroup: entry.version_group.name,
      language: entry.language.name,
      text: cleanFlavorText(entry.flavor_text),
    })) ?? []
  return {
    slug,
    name: data.name ?? slug,
    type: (typeName as PokemonType | undefined) ?? null,
    power: typeof data.power === 'number' ? data.power : null,
    accuracy: typeof data.accuracy === 'number' ? data.accuracy : null,
    pp: typeof data.pp === 'number' ? data.pp : null,
    damageClass:
      damageClass === 'physical' || damageClass === 'special' || damageClass === 'status'
        ? damageClass
        : null,
    shortEffectEn,
    flavorEntries,
  }
}

function slugForMoveName(name: string): string {
  return resolveMoveSlug(name) ?? toMoveSlug(name)
}

/** Resolve move display names to types (cached in memory + localStorage). */
export async function resolveMoveTypes(moveNames: string[]): Promise<Map<string, PokemonType | null>> {
  loadStorageCache()
  loadDetailsStorageCache()

  const unique = [...new Set(moveNames.map((name) => name.trim()).filter(Boolean))]
  const result = new Map<string, PokemonType | null>()
  const toFetch: string[] = []

  for (const name of unique) {
    const slug = slugForMoveName(name)
    if (memoryCache.has(slug)) {
      result.set(name, memoryCache.get(slug) ?? null)
      continue
    }
    toFetch.push(name)
  }

  await Promise.all(
    toFetch.map(async (name) => {
      const slug = slugForMoveName(name)
      const details =
        detailsMemoryCache.has(slug) ? detailsMemoryCache.get(slug) ?? null : await fetchMoveDetailsBySlug(slug)
      const type = details?.type ?? null
      detailsMemoryCache.set(slug, details)
      memoryCache.set(slug, type)
      result.set(name, type)
    }),
  )

  if (toFetch.length > 0) persistCache()
  if (toFetch.length > 0) persistDetailsCache()
  return result
}

/** Resolve a move name to full details (cached in memory + localStorage). */
export async function fetchMoveDetails(moveName: string): Promise<MoveDetails | null> {
  loadStorageCache()
  loadDetailsStorageCache()
  const slug = slugForMoveName(moveName)
  if (detailsMemoryCache.has(slug)) return detailsMemoryCache.get(slug) ?? null

  const details = await fetchMoveDetailsBySlug(slug)
  detailsMemoryCache.set(slug, details)
  memoryCache.set(slug, details?.type ?? null)
  persistDetailsCache()
  persistCache()
  return details
}
