import { formatPokemonName } from '@/types/pokemon'
import type { Locale } from '@/i18n'

const POKEAPI_BASE = 'https://pokeapi.co/api/v2'
const CACHE_VERSION = 2
const STORAGE_KEY = 'nuzlokeHelper:localizedNames:v2'
const BATCH_SIZE = 25
const LIST_LIMIT = 5000

export interface LocalizedEntry {
  slug: string
  en: string
  es: string
}

interface NameIndex {
  bySlug: Map<string, LocalizedEntry>
  aliasToSlug: Map<string, string>
}

interface CachedPayload {
  version: number
  species: LocalizedEntry[]
  moves: LocalizedEntry[]
  abilities: LocalizedEntry[]
  items: LocalizedEntry[]
  pokemonSpeciesMap: Record<string, string>
}

interface PokeApiNamedResource {
  name: string
  names: Array<{ name: string; language: { name: string } }>
}

let speciesIndex: NameIndex | null = null
let moveIndex: NameIndex | null = null
let abilityIndex: NameIndex | null = null
let itemIndex: NameIndex | null = null
let pokemonSpeciesMap: Map<string, string> | null = null

let speciesLoadPromise: Promise<void> | null = null
let moveLoadPromise: Promise<void> | null = null
let abilityLoadPromise: Promise<void> | null = null
let itemLoadPromise: Promise<void> | null = null
let pokemonMapLoadPromise: Promise<void> | null = null
let storageHydrated = false

function speciesSlugForPokemon(pokemonSlug: string): string {
  return pokemonSpeciesMap?.get(pokemonSlug) ?? pokemonSlug
}

/** Load cached name indexes from localStorage only (no network). */
export function hydrateIndexesFromStorage(): void {
  if (storageHydrated) return
  storageHydrated = true

  const cache = readCache()
  if (!cache) return

  if (cache.species.length) speciesIndex = buildIndex(cache.species)
  if (cache.moves.length) moveIndex = buildIndex(cache.moves)
  if (cache.abilities.length) abilityIndex = buildIndex(cache.abilities)
  if (cache.items.length) itemIndex = buildIndex(cache.items)
  if (cache.pokemonSpeciesMap && Object.keys(cache.pokemonSpeciesMap).length > 0) {
    pokemonSpeciesMap = new Map(Object.entries(cache.pokemonSpeciesMap))
  }
}

export function normalizeForMatch(value: string): string {
  const text = typeof value === 'string' ? value : value == null ? '' : String(value)
  return text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9\s-]/g, '')
}

function buildIndex(entries: LocalizedEntry[]): NameIndex {
  const bySlug = new Map<string, LocalizedEntry>()
  const aliasToSlug = new Map<string, string>()

  for (const entry of entries) {
    bySlug.set(entry.slug, entry)
    const aliases = new Set([
      entry.slug,
      entry.en,
      entry.es,
      formatPokemonName(entry.slug),
      entry.en.replace(/\s+/g, '-'),
    ])
    for (const alias of aliases) {
      const key = normalizeForMatch(alias)
      if (key && !aliasToSlug.has(key)) {
        aliasToSlug.set(key, entry.slug)
      }
    }
  }

  return { bySlug, aliasToSlug }
}

function readCache(): CachedPayload | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<CachedPayload>
    if (parsed.version !== CACHE_VERSION) return null
    return {
      version: CACHE_VERSION,
      species: parsed.species ?? [],
      moves: parsed.moves ?? [],
      abilities: parsed.abilities ?? [],
      items: parsed.items ?? [],
      pokemonSpeciesMap: parsed.pokemonSpeciesMap ?? {},
    }
  } catch {
    return null
  }
}

function writeCache(payload: CachedPayload): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // ignore quota / private mode
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`PokeAPI request failed (${response.status})`)
  }
  return response.json() as Promise<T>
}

interface PokeApiListPage {
  results: Array<{ url: string; name: string }>
  next: string | null
}

interface PokeApiResourceList {
  results: Array<{ name: string }>
}

async function fetchAllResourceUrls(path: string): Promise<string[]> {
  const urls: string[] = []
  let nextUrl: string | null = `${POKEAPI_BASE}/${path}?limit=100`

  while (nextUrl) {
    const page: PokeApiListPage = await fetchJson<PokeApiListPage>(nextUrl)
    urls.push(...page.results.map((entry: { url: string }) => entry.url))
    nextUrl = page.next
  }

  return urls
}

async function fetchAllResourceNames(path: string): Promise<string[]> {
  const page = await fetchJson<PokeApiResourceList>(`${POKEAPI_BASE}/${path}?limit=${LIST_LIMIT}`)
  return page.results.map((entry) => entry.name)
}

function localizedFromResource(data: PokeApiNamedResource): LocalizedEntry {
  const en = data.names.find((entry) => entry.language.name === 'en')?.name ?? formatPokemonName(data.name)
  const es = data.names.find((entry) => entry.language.name === 'es')?.name ?? en
  return { slug: data.name, en, es }
}

function localizedFromSlug(slug: string): LocalizedEntry {
  const display = formatPokemonName(slug)
  return { slug, en: display, es: display }
}

async function fetchLocalizedEntries(urls: string[]): Promise<LocalizedEntry[]> {
  const entries: LocalizedEntry[] = []

  for (let offset = 0; offset < urls.length; offset += BATCH_SIZE) {
    const batch = urls.slice(offset, offset + BATCH_SIZE)
    const batchEntries = await Promise.all(
      batch.map(async (url) => {
        const data = await fetchJson<PokeApiNamedResource>(url)
        return localizedFromResource(data)
      }),
    )
    entries.push(...batchEntries)
  }

  return entries
}

function getDisplayName(entry: LocalizedEntry | undefined, locale: Locale, fallback: string): string {
  if (!entry) return fallback
  return locale === 'es' ? entry.es : entry.en
}

function resolveSlug(index: NameIndex | null, input: string): string | null {
  const text = typeof input === 'string' ? input : input == null ? '' : String(input)
  if (!text.trim()) return null
  const key = normalizeForMatch(text)
  return index?.aliasToSlug.get(key) ?? null
}

export function getSpeciesSlugFromUrl(speciesUrl: string): string {
  return speciesUrl.replace(/\/$/, '').split('/').pop() ?? ''
}

export async function ensureSpeciesIndex(): Promise<void> {
  if (speciesIndex) return
  if (speciesLoadPromise) return speciesLoadPromise

  speciesLoadPromise = (async () => {
    const cache = readCache()
    if (cache?.species.length) {
      speciesIndex = buildIndex(cache.species)
      if (!pokemonSpeciesMap && cache.pokemonSpeciesMap) {
        pokemonSpeciesMap = new Map(Object.entries(cache.pokemonSpeciesMap))
      }
      return
    }

    const urls = await fetchAllResourceUrls('pokemon-species')
    const entries = await fetchLocalizedEntries(urls)
    speciesIndex = buildIndex(entries)

    const existing = readCache()
    writeCache({
      version: CACHE_VERSION,
      species: entries,
      moves: existing?.moves ?? [],
      abilities: existing?.abilities ?? [],
      items: existing?.items ?? [],
      pokemonSpeciesMap: existing?.pokemonSpeciesMap ?? {},
    })
  })()

  return speciesLoadPromise
}

export async function ensureMoveIndex(): Promise<void> {
  if (moveIndex) return
  if (moveLoadPromise) return moveLoadPromise

  moveLoadPromise = (async () => {
    const cache = readCache()
    if (cache?.moves.length) {
      moveIndex = buildIndex(cache.moves)
      return
    }

    const names = await fetchAllResourceNames('move')
    const entries = names.map(localizedFromSlug)
    moveIndex = buildIndex(entries)

    const existing = readCache()
    writeCache({
      version: CACHE_VERSION,
      species: existing?.species ?? [],
      moves: entries,
      abilities: existing?.abilities ?? [],
      items: existing?.items ?? [],
      pokemonSpeciesMap: existing?.pokemonSpeciesMap ?? {},
    })
  })()

  return moveLoadPromise
}

export async function ensureAbilityIndex(): Promise<void> {
  if (abilityIndex) return
  if (abilityLoadPromise) return abilityLoadPromise

  abilityLoadPromise = (async () => {
    const cache = readCache()
    if (cache?.abilities.length) {
      abilityIndex = buildIndex(cache.abilities)
      return
    }

    const names = await fetchAllResourceNames('ability')
    const entries = names.map(localizedFromSlug)
    abilityIndex = buildIndex(entries)

    const existing = readCache()
    writeCache({
      version: CACHE_VERSION,
      species: existing?.species ?? [],
      moves: existing?.moves ?? [],
      abilities: entries,
      items: existing?.items ?? [],
      pokemonSpeciesMap: existing?.pokemonSpeciesMap ?? {},
    })
  })()

  return abilityLoadPromise
}

export async function ensurePokemonSpeciesMap(pokemonSlugs: string[]): Promise<void> {
  if (pokemonSpeciesMap && pokemonSpeciesMap.size >= pokemonSlugs.length) return
  if (pokemonMapLoadPromise) return pokemonMapLoadPromise

  pokemonMapLoadPromise = (async () => {
    const cache = readCache()
    if (cache?.pokemonSpeciesMap && Object.keys(cache.pokemonSpeciesMap).length >= pokemonSlugs.length) {
      pokemonSpeciesMap = new Map(Object.entries(cache.pokemonSpeciesMap))
      return
    }

    const map = new Map<string, string>(pokemonSpeciesMap ? [...pokemonSpeciesMap.entries()] : [])

    const missing = pokemonSlugs.filter((slug) => !map.has(slug))
    for (let offset = 0; offset < missing.length; offset += BATCH_SIZE) {
      const batch = missing.slice(offset, offset + BATCH_SIZE)
      await Promise.all(
        batch.map(async (slug) => {
          const data = await fetchJson<{ species: { url: string } }>(`${POKEAPI_BASE}/pokemon/${slug}`)
          map.set(slug, getSpeciesSlugFromUrl(data.species.url))
        }),
      )
    }

    pokemonSpeciesMap = map

    const existing = readCache()
    writeCache({
      version: CACHE_VERSION,
      species: existing?.species ?? [],
      moves: existing?.moves ?? [],
      abilities: existing?.abilities ?? [],
      items: existing?.items ?? [],
      pokemonSpeciesMap: Object.fromEntries(map.entries()),
    })
  })()

  return pokemonMapLoadPromise
}

/** Prepare Pokémon search indexes from cache only. Does not download from PokeAPI. */
export async function ensureSearchIndexes(): Promise<void> {
  hydrateIndexesFromStorage()
}

export async function ensureItemIndex(): Promise<void> {
  if (itemIndex) return
  if (itemLoadPromise) return itemLoadPromise

  itemLoadPromise = (async () => {
    const cache = readCache()
    if (cache?.items.length) {
      itemIndex = buildIndex(cache.items)
      return
    }

    const names = await fetchAllResourceNames('item')
    const entries = names.map(localizedFromSlug)
    itemIndex = buildIndex(entries)

    const existing = readCache()
    writeCache({
      version: CACHE_VERSION,
      species: existing?.species ?? [],
      moves: existing?.moves ?? [],
      abilities: existing?.abilities ?? [],
      items: entries,
      pokemonSpeciesMap: existing?.pokemonSpeciesMap ?? {},
    })
  })()

  return itemLoadPromise
}

export function getLocalizedPokemonName(
  pokemonSlug: string,
  speciesSlug: string | undefined,
  locale: Locale,
  fallback: string,
): string {
  const slug = speciesSlug ?? pokemonSlug
  const entry = speciesIndex?.bySlug.get(slug)
  return getDisplayName(entry, locale, fallback)
}

export function getLocalizedAbilityName(slug: string, locale: Locale, fallback?: string): string {
  const entry = abilityIndex?.bySlug.get(slug)
  return getDisplayName(entry, locale, fallback ?? formatPokemonName(slug))
}

export function getLocalizedMoveName(slug: string, locale: Locale, fallback?: string): string {
  const entry = moveIndex?.bySlug.get(slug)
  return getDisplayName(entry, locale, fallback ?? formatPokemonName(slug))
}

export function getLocalizedItemName(slug: string, locale: Locale, fallback?: string): string {
  const entry = itemIndex?.bySlug.get(slug)
  return getDisplayName(entry, locale, fallback ?? formatPokemonName(slug))
}

export function resolveAbilitySlug(input: string): string | null {
  return resolveSlug(abilityIndex, input)
}

export function resolveMoveSlug(input: string): string | null {
  return resolveSlug(moveIndex, input)
}

export function resolveItemSlug(input: string): string | null {
  return resolveSlug(itemIndex, input)
}

export function resolveSpeciesSlug(input: string): string | null {
  return resolveSlug(speciesIndex, input)
}

/** Canonical English display name for storage / Showdown export. */
export function canonicalAbilityName(input: string): string {
  const text = typeof input === 'string' ? input : input == null ? '' : String(input)
  const slug = resolveAbilitySlug(text)
  if (slug && abilityIndex) {
    return abilityIndex.bySlug.get(slug)?.en ?? formatPokemonName(slug)
  }
  return text.trim()
}

/** Canonical English display name for storage / Showdown export. */
export function canonicalMoveName(input: string): string {
  const text = typeof input === 'string' ? input : input == null ? '' : String(input)
  const slug = resolveMoveSlug(text)
  if (slug && moveIndex) {
    return moveIndex.bySlug.get(slug)?.en ?? formatPokemonName(slug)
  }
  return text.trim()
}

export function pokemonMatchesQuery(pokemonSlug: string, query: string): boolean {
  const normalizedQuery = normalizeForMatch(query)
  if (!normalizedQuery) return false

  const slugKey = normalizeForMatch(pokemonSlug)
  if (slugKey.includes(normalizedQuery) || normalizeForMatch(formatPokemonName(pokemonSlug)).includes(normalizedQuery)) {
    return true
  }

  if (!speciesIndex) return false

  const entry = speciesIndex.bySlug.get(speciesSlugForPokemon(pokemonSlug))
  if (!entry) return false

  return (
    normalizeForMatch(entry.en).includes(normalizedQuery) ||
    normalizeForMatch(entry.es).includes(normalizedQuery) ||
    normalizeForMatch(entry.slug).includes(normalizedQuery)
  )
}

export function moveMatchesQuery(input: string, query: string): boolean {
  const normalizedQuery = normalizeForMatch(query)
  if (!normalizedQuery) return false

  const slug = resolveMoveSlug(input)
  if (slug && moveIndex) {
    const entry = moveIndex.bySlug.get(slug)
    if (entry) {
      return (
        normalizeForMatch(entry.en).includes(normalizedQuery) ||
        normalizeForMatch(entry.es).includes(normalizedQuery) ||
        normalizeForMatch(entry.slug).includes(normalizedQuery)
      )
    }
  }

  return normalizeForMatch(input).includes(normalizedQuery)
}

export interface MoveSearchResult {
  slug: string
  displayName: string
  canonicalName: string
}

export interface AbilitySearchResult {
  slug: string
  displayName: string
  canonicalName: string
}

export interface ItemSearchResult {
  slug: string
  displayName: string
  canonicalName: string
}

function moveMatchScore(entry: LocalizedEntry, query: string): number {
  const normalizedQuery = normalizeForMatch(query)
  const candidates = [
    normalizeForMatch(entry.en),
    normalizeForMatch(entry.es),
    normalizeForMatch(entry.slug),
  ]

  let best = 99
  for (const candidate of candidates) {
    if (candidate === normalizedQuery) best = Math.min(best, 0)
    else if (candidate.startsWith(normalizedQuery)) best = Math.min(best, 1)
    else if (candidate.includes(normalizedQuery)) best = Math.min(best, 2)
  }
  return best
}

export async function searchMoves(
  query: string,
  locale: Locale,
  limit = 10,
): Promise<MoveSearchResult[]> {
  await ensureMoveIndex()
  if (!moveIndex) return []

  const normalized = query.trim()
  if (normalized.length < 2) return []

  const matches: MoveSearchResult[] = []
  for (const entry of moveIndex.bySlug.values()) {
    if (!moveMatchesQuery(entry.slug, normalized)) continue
    matches.push({
      slug: entry.slug,
      displayName: locale === 'es' ? entry.es : entry.en,
      canonicalName: entry.en,
    })
  }

  return matches
    .sort((a, b) => {
      const entryA = moveIndex!.bySlug.get(a.slug)!
      const entryB = moveIndex!.bySlug.get(b.slug)!
      const scoreDiff = moveMatchScore(entryA, normalized) - moveMatchScore(entryB, normalized)
      return scoreDiff !== 0 ? scoreDiff : a.displayName.localeCompare(b.displayName)
    })
    .slice(0, limit)
}

function localizedEntryScore(entry: LocalizedEntry, query: string): number {
  const normalizedQuery = normalizeForMatch(query)
  const candidates = [
    normalizeForMatch(entry.en),
    normalizeForMatch(entry.es),
    normalizeForMatch(entry.slug),
  ]

  let best = 99
  for (const candidate of candidates) {
    if (candidate === normalizedQuery) best = Math.min(best, 0)
    else if (candidate.startsWith(normalizedQuery)) best = Math.min(best, 1)
    else if (candidate.includes(normalizedQuery)) best = Math.min(best, 2)
  }
  return best
}

function localizedEntryMatches(entry: LocalizedEntry, query: string): boolean {
  const normalizedQuery = normalizeForMatch(query)
  if (!normalizedQuery) return false
  return (
    normalizeForMatch(entry.en).includes(normalizedQuery) ||
    normalizeForMatch(entry.es).includes(normalizedQuery) ||
    normalizeForMatch(entry.slug).includes(normalizedQuery)
  )
}

export async function searchAbilities(
  query: string,
  locale: Locale,
  limit = 10,
): Promise<AbilitySearchResult[]> {
  await ensureAbilityIndex()
  if (!abilityIndex) return []

  const normalized = query.trim()
  if (normalized.length < 2) return []

  const matches: AbilitySearchResult[] = []
  for (const entry of abilityIndex.bySlug.values()) {
    if (!localizedEntryMatches(entry, normalized)) continue
    matches.push({
      slug: entry.slug,
      displayName: locale === 'es' ? entry.es : entry.en,
      canonicalName: entry.en,
    })
  }

  return matches
    .sort((a, b) => {
      const entryA = abilityIndex!.bySlug.get(a.slug)!
      const entryB = abilityIndex!.bySlug.get(b.slug)!
      const scoreDiff = localizedEntryScore(entryA, normalized) - localizedEntryScore(entryB, normalized)
      return scoreDiff !== 0 ? scoreDiff : a.displayName.localeCompare(b.displayName)
    })
    .slice(0, limit)
}

export async function searchItems(query: string, locale: Locale, limit = 10): Promise<ItemSearchResult[]> {
  await ensureItemIndex()
  if (!itemIndex) return []

  const normalized = query.trim()
  if (normalized.length < 2) return []

  const matches: ItemSearchResult[] = []
  for (const entry of itemIndex.bySlug.values()) {
    if (!localizedEntryMatches(entry, normalized)) continue
    matches.push({
      slug: entry.slug,
      displayName: locale === 'es' ? entry.es : entry.en,
      canonicalName: entry.en,
    })
  }

  return matches
    .sort((a, b) => {
      const entryA = itemIndex!.bySlug.get(a.slug)!
      const entryB = itemIndex!.bySlug.get(b.slug)!
      const scoreDiff = localizedEntryScore(entryA, normalized) - localizedEntryScore(entryB, normalized)
      return scoreDiff !== 0 ? scoreDiff : a.displayName.localeCompare(b.displayName)
    })
    .slice(0, limit)
}

/** Preload move/ability indexes for editor localization. */
export async function ensureEditorIndexes(): Promise<void> {
  await Promise.all([ensureMoveIndex(), ensureAbilityIndex(), ensureItemIndex()])
}

/** Display a stored move name (English or localized input) in the current locale. */
export function displayMoveName(storedName: string, locale: Locale): string {
  const slug = resolveMoveSlug(storedName)
  if (slug) return getLocalizedMoveName(slug, locale, storedName)
  return storedName
}

/** Display a stored ability name in the current locale. */
export function displayAbilityName(storedName: string, locale: Locale): string {
  const slug = resolveAbilitySlug(storedName)
  if (slug) return getLocalizedAbilityName(slug, locale, storedName)
  return storedName
}

export function displayItemName(storedName: string, locale: Locale): string {
  const slug = resolveItemSlug(storedName)
  if (slug) return getLocalizedItemName(slug, locale, storedName)
  return storedName
}

export function pokemonMatchScore(pokemonSlug: string, query: string): number {
  const normalizedQuery = normalizeForMatch(query)
  if (!normalizedQuery) return 3

  const scoreAlias = (value: string): number => {
    const normalized = normalizeForMatch(value)
    if (normalized === normalizedQuery) return 0
    if (normalized.startsWith(normalizedQuery)) return 1
    if (normalized.includes(normalizedQuery)) return 2
    return 3
  }

  let best = Math.min(scoreAlias(pokemonSlug), scoreAlias(formatPokemonName(pokemonSlug)))

  const entry = speciesIndex?.bySlug.get(speciesSlugForPokemon(pokemonSlug))
  if (entry) {
    best = Math.min(best, scoreAlias(entry.en), scoreAlias(entry.es), scoreAlias(entry.slug))
  }

  return best
}

export function getLocalizedPokemonNameBySlug(pokemonSlug: string, locale: Locale): string {
  const entry = speciesIndex?.bySlug.get(speciesSlugForPokemon(pokemonSlug))
  return getDisplayName(entry, locale, formatPokemonName(pokemonSlug))
}
