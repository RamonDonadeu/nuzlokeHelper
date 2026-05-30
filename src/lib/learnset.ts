import { canonicalMoveName, resolveMoveSlug } from '@/lib/localizedNames'
import {
  compareVersionGroups,
  getApiVersionGroup,
  versionGroupToGeneration,
  VERSION_GROUP_ORDER,
} from '@/lib/versionGroups'
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

function hasLearnDataForVersionGroup(
  learnset: PokemonMoveLearnEntry[],
  versionGroup: string,
): boolean {
  return learnset.some((entry) =>
    entry.details.some(
      (detail) =>
        detail.versionGroup === versionGroup &&
        (detail.method === 'level-up' || detail.method === 'machine' || detail.method === 'tutor'),
    ),
  )
}

export interface ResolvedLearnVersionGroup {
  apiGroup: string
  /** True when the profile game has no learn data and an older compatible group is used. */
  usedFallback: boolean
}

/** Pick a PokeAPI version group that has learn data for this species. */
export function resolveEffectiveLearnVersionGroup(
  learnset: PokemonMoveLearnEntry[],
  profileVersionGroup: string,
): ResolvedLearnVersionGroup {
  const target = getApiVersionGroup(profileVersionGroup)
  if (hasLearnDataForVersionGroup(learnset, target)) {
    return { apiGroup: target, usedFallback: false }
  }

  const profileGen = versionGroupToGeneration(
    profileVersionGroup.startsWith('gen-') ? target : profileVersionGroup,
  )

  const targetIdx = VERSION_GROUP_ORDER.indexOf(target)
  const startIdx = targetIdx === -1 ? VERSION_GROUP_ORDER.length - 1 : targetIdx

  for (let i = startIdx; i >= 0; i--) {
    const candidate = VERSION_GROUP_ORDER[i]
    if (!candidate) continue
    if (versionGroupToGeneration(candidate) > profileGen) continue
    if (hasLearnDataForVersionGroup(learnset, candidate)) {
      return { apiGroup: candidate, usedFallback: true }
    }
  }

  let best: string | null = null
  for (const entry of learnset) {
    for (const detail of entry.details) {
      if (detail.method !== 'level-up' && detail.method !== 'machine' && detail.method !== 'tutor') {
        continue
      }
      if (versionGroupToGeneration(detail.versionGroup) > profileGen) continue
      if (!best || compareVersionGroups(detail.versionGroup, best) > 0) {
        best = detail.versionGroup
      }
    }
  }

  if (best) return { apiGroup: best, usedFallback: true }
  return { apiGroup: target, usedFallback: false }
}

function moveNameToLearnsetSlug(moveInput: string): string | null {
  const slug = resolveMoveSlug(moveInput)
  if (slug) return slug
  const canonical = canonicalMoveName(moveInput).trim().toLowerCase()
  if (!canonical) return null
  return canonical.replace(/\s+/g, '-')
}

export function findLearnEntry(
  learnset: PokemonMoveLearnEntry[],
  moveInput: string,
): PokemonMoveLearnEntry | undefined {
  const slug = moveNameToLearnsetSlug(moveInput)
  if (!slug) return undefined
  return learnset.find((entry) => entry.moveName === slug)
}

export function canLearnViaTm(
  learnset: PokemonMoveLearnEntry[],
  moveInput: string,
  profileVersionGroup: string,
  resolvedApiGroup?: string,
): boolean {
  const entry = findLearnEntry(learnset, moveInput)
  if (!entry) return false
  const apiGroup =
    resolvedApiGroup ?? resolveEffectiveLearnVersionGroup(learnset, profileVersionGroup).apiGroup
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
  const { apiGroup } = resolveEffectiveLearnVersionGroup(learnset, profileVersionGroup)
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
  resolvedApiGroup?: string,
): RelearnMoveEntry[] {
  const apiGroup =
    resolvedApiGroup ?? resolveEffectiveLearnVersionGroup(learnset, profileVersionGroup).apiGroup
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
