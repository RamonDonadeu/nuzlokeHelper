import type { Locale } from '@/i18n'
import { resolveItemSlug } from '@/lib/localizedNames'

const POKEAPI_BASE = 'https://pokeapi.co/api/v2'
const DETAILS_CACHE_KEY = 'nuzlokeHelper:itemDetails:v1'

const detailsMemoryCache = new Map<string, ItemDetails | null>()
let detailsStorageLoaded = false

export interface ItemFlavorEntry {
  versionGroup: string
  language: string
  text: string
}

export interface ItemDetails {
  slug: string
  name: string
  category: string | null
  shortEffectEn: string
  flavorEntries: ItemFlavorEntry[]
}

function cleanFlavorText(text: string): string {
  return text.replace(/\f/g, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()
}

function flavorLanguageForLocale(locale: Locale): string {
  return locale === 'es' ? 'es' : 'en'
}

function loadDetailsStorageCache(): void {
  if (detailsStorageLoaded) return
  detailsStorageLoaded = true
  try {
    const raw = localStorage.getItem(DETAILS_CACHE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as Record<string, ItemDetails | null>
    for (const [slug, details] of Object.entries(parsed)) {
      detailsMemoryCache.set(slug, details)
    }
  } catch {
    // ignore
  }
}

function persistDetailsCache(): void {
  try {
    localStorage.setItem(DETAILS_CACHE_KEY, JSON.stringify(Object.fromEntries(detailsMemoryCache)))
  } catch {
    // ignore quota / private mode
  }
}

async function fetchItemDetailsBySlug(slug: string): Promise<ItemDetails | null> {
  const response = await fetch(`${POKEAPI_BASE}/item/${slug}`)
  if (!response.ok) return null
  const data = (await response.json()) as {
    name?: string
    category?: { name: string }
    effect_entries?: Array<{
      short_effect: string
      language: { name: string }
    }>
    flavor_text_entries?: Array<{
      text: string
      language: { name: string }
      version_group: { name: string }
    }>
  }

  const shortEffectEn =
    data.effect_entries?.find((entry) => entry.language.name === 'en')?.short_effect.trim() ?? ''
  const flavorEntries =
    data.flavor_text_entries?.map((entry) => ({
      versionGroup: entry.version_group.name,
      language: entry.language.name,
      text: cleanFlavorText(entry.text),
    })) ?? []

  return {
    slug,
    name: data.name ?? slug,
    category: data.category?.name ?? null,
    shortEffectEn,
    flavorEntries,
  }
}

function pickLatestFlavorText(entries: ItemFlavorEntry[]): ItemFlavorEntry | undefined {
  return entries[entries.length - 1]
}

export function getItemDescription(item: ItemDetails, locale: Locale): string {
  const language = flavorLanguageForLocale(locale)
  const localized = item.flavorEntries.filter((entry) => entry.language === language)
  const latestLocalized = pickLatestFlavorText(localized)
  if (latestLocalized?.text) return latestLocalized.text
  if (item.shortEffectEn) return item.shortEffectEn
  const latestEnglish = pickLatestFlavorText(item.flavorEntries.filter((entry) => entry.language === 'en'))
  return latestEnglish?.text ?? ''
}

function toItemSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/['.]/g, '')
    .replace(/\s+/g, '-')
}

function slugForItemName(name: string): string {
  return resolveItemSlug(name) ?? toItemSlug(name)
}

export async function fetchItemDetails(itemName: string): Promise<ItemDetails | null> {
  loadDetailsStorageCache()
  const slug = slugForItemName(itemName)
  if (detailsMemoryCache.has(slug)) return detailsMemoryCache.get(slug) ?? null

  const details = await fetchItemDetailsBySlug(slug)
  detailsMemoryCache.set(slug, details)
  persistDetailsCache()
  return details
}
