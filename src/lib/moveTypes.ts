import type { PokemonType } from '@/types/pokemon'
import { resolveMoveSlug } from '@/lib/localizedNames'

const POKEAPI_BASE = 'https://pokeapi.co/api/v2'
const CACHE_KEY = 'nuzlokeHelper:moveTypes:v1'

const memoryCache = new Map<string, PokemonType | null>()
let storageLoaded = false

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

function persistCache(): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(memoryCache)))
  } catch {
    // ignore quota / private mode
  }
}

async function fetchMoveTypeBySlug(slug: string): Promise<PokemonType | null> {
  const response = await fetch(`${POKEAPI_BASE}/move/${slug}`)
  if (!response.ok) return null
  const data = (await response.json()) as { type?: { name: string } }
  const typeName = data.type?.name
  if (!typeName) return null
  return typeName as PokemonType
}

function slugForMoveName(name: string): string {
  return resolveMoveSlug(name) ?? toMoveSlug(name)
}

/** Resolve move display names to types (cached in memory + localStorage). */
export async function resolveMoveTypes(moveNames: string[]): Promise<Map<string, PokemonType | null>> {
  loadStorageCache()

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
      const type = await fetchMoveTypeBySlug(slug)
      memoryCache.set(slug, type)
      result.set(name, type)
    }),
  )

  if (toFetch.length > 0) persistCache()
  return result
}
