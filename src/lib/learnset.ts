import { canonicalMoveName } from '@/lib/localizedNames'
import { getApiVersionGroup } from '@/lib/versionGroups'
import { pokemonSlugCandidates } from '@/lib/pokeapi'

const POKEAPI_BASE = 'https://pokeapi.co/api/v2'

export type LearnMethod = 'level-up' | 'machine' | 'tutor' | 'egg' | 'other'

export interface LearnMethodDetail {
  method: LearnMethod
  level: number
  versionGroup: string
}

export interface PokemonMoveLearnEntry {
  moveName: string
  details: LearnMethodDetail[]
}

interface PokeApiMoveEntry {
  move: { name: string }
  version_group_details: Array<{
    level_learned_at: number
    move_learn_method: { name: string }
    version_group: { name: string }
  }>
}

interface PokeApiPokemonMoves {
  moves: PokeApiMoveEntry[]
}

const learnsetCache = new Map<string, PokemonMoveLearnEntry[]>()
const learnsetInflight = new Map<string, Promise<PokemonMoveLearnEntry[]>>()

function learnsetCacheKey(pokemonSlug: string): string {
  return pokemonSlug.trim().toLowerCase()
}

function parseLearnMethod(raw: string): LearnMethod {
  if (raw === 'level-up' || raw === 'machine' || raw === 'tutor' || raw === 'egg') return raw
  return 'other'
}

function parseLearnset(data: PokeApiPokemonMoves): PokemonMoveLearnEntry[] {
  return data.moves.map((entry) => ({
    moveName: entry.move.name,
    details: entry.version_group_details.map((detail) => ({
      method: parseLearnMethod(detail.move_learn_method.name),
      level: detail.level_learned_at,
      versionGroup: detail.version_group.name,
    })),
  }))
}

async function fetchPokemonMovesResource(
  slug: string,
  signal?: AbortSignal,
): Promise<PokeApiPokemonMoves> {
  const response = await fetch(`${POKEAPI_BASE}/pokemon/${slug}`, { signal })
  if (!response.ok) {
    throw new Error(`PokeAPI request failed (${response.status})`)
  }
  return response.json() as Promise<PokeApiPokemonMoves>
}

export async function fetchPokemonLearnset(
  pokemonIdentifier: string | number,
  options?: { signal?: AbortSignal },
): Promise<PokemonMoveLearnEntry[]> {
  const slug = String(pokemonIdentifier).trim().toLowerCase()
  const cacheKey = learnsetCacheKey(slug)
  const cached = learnsetCache.get(cacheKey)
  if (cached) return cached

  const pending = learnsetInflight.get(cacheKey)
  if (pending) return pending

  const promise = (async () => {
    const candidates = pokemonSlugCandidates(slug)
    let lastError: unknown

    for (const candidate of candidates) {
      try {
        const data = await fetchPokemonMovesResource(candidate, options?.signal)
        const parsed = parseLearnset(data)
        learnsetCache.set(learnsetCacheKey(candidate), parsed)
        learnsetCache.set(cacheKey, parsed)
        return parsed
      } catch (error) {
        lastError = error
      }
    }

    throw lastError instanceof Error ? lastError : new Error(`Learnset not found: ${slug}`)
  })().finally(() => {
    learnsetInflight.delete(cacheKey)
  })

  learnsetInflight.set(cacheKey, promise)
  return promise
}

function detailsForVersionGroup(
  entry: PokemonMoveLearnEntry,
  versionGroup: string,
): LearnMethodDetail[] {
  return entry.details.filter((detail) => detail.versionGroup === versionGroup)
}

export function findLearnEntry(
  learnset: PokemonMoveLearnEntry[],
  moveInput: string,
): PokemonMoveLearnEntry | undefined {
  const canonical = canonicalMoveName(moveInput)
  const slug = canonical.trim().toLowerCase().replace(/\s+/g, '-')
  if (!slug) return undefined
  return learnset.find((entry) => entry.moveName === slug)
}

export function canLearnViaTm(
  learnset: PokemonMoveLearnEntry[],
  moveInput: string,
  profileVersionGroup: string,
): boolean {
  const entry = findLearnEntry(learnset, moveInput)
  if (!entry) return false
  const apiGroup = getApiVersionGroup(profileVersionGroup)
  return detailsForVersionGroup(entry, apiGroup).some((detail) => detail.method === 'machine')
}

function isRelearnableLevelUpDetail(detail: LearnMethodDetail, level: number): boolean {
  return detail.method === 'level-up' && detail.level <= level
}

export function canRelearnAtLevel(
  learnset: PokemonMoveLearnEntry[],
  moveInput: string,
  level: number,
  profileVersionGroup: string,
): boolean {
  const entry = findLearnEntry(learnset, moveInput)
  if (!entry) return false
  const apiGroup = getApiVersionGroup(profileVersionGroup)
  return detailsForVersionGroup(entry, apiGroup).some((detail) =>
    isRelearnableLevelUpDetail(detail, level),
  )
}

export interface RelearnMoveEntry {
  /** PokeAPI move slug */
  moveName: string
  /** Earliest level-up learn level for this game version */
  learnedAtLevel: number
}

/** Level-up moves this species can relearn at or below the given level (move reminder). */
export function getRelearnMovesAtLevel(
  learnset: PokemonMoveLearnEntry[],
  level: number,
  profileVersionGroup: string,
): RelearnMoveEntry[] {
  const apiGroup = getApiVersionGroup(profileVersionGroup)
  const results: RelearnMoveEntry[] = []

  for (const entry of learnset) {
    const levelUpDetails = detailsForVersionGroup(entry, apiGroup).filter((detail) =>
      isRelearnableLevelUpDetail(detail, level),
    )
    if (levelUpDetails.length === 0) continue

    results.push({
      moveName: entry.moveName,
      learnedAtLevel: Math.min(...levelUpDetails.map((detail) => detail.level)),
    })
  }

  return results.sort(
    (a, b) =>
      a.learnedAtLevel - b.learnedAtLevel ||
      a.moveName.localeCompare(b.moveName),
  )
}
