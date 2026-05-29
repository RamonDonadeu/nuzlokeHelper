import type {
  EvolutionStage,
  NamedPokemonListItem,
  PokemonAbility,
  PokemonStats,
  PokemonSummary,
  PokemonType,
  TeamMember,
} from '@/types/pokemon'
import { formatPokemonName, totalStats } from '@/types/pokemon'
import {
  hydrateIndexesFromStorage,
  pokemonMatchScore as localizedPokemonMatchScore,
  pokemonMatchesQuery,
} from '@/lib/localizedNames'
import { normalizePokemonTypes } from '@/lib/pokemonTypes'

const POKEAPI_BASE = 'https://pokeapi.co/api/v2'

interface PokeApiStat {
  base_stat: number
  stat: { name: string }
}

interface PokeApiPokemon {
  id: number
  name: string
  stats: PokeApiStat[]
  types: Array<{ type: { name: string } }>
  abilities: Array<{ ability: { name: string }; is_hidden: boolean }>
  sprites: { front_default: string | null }
  species: { url: string }
}

interface PokeApiEvolutionChain {
  chain: PokeApiEvolutionLink
}

interface PokeApiEvolutionLink {
  species: { name: string; url: string }
  evolves_to: PokeApiEvolutionLink[]
}

interface PokeApiSpecies {
  evolution_chain: { url: string }
}

interface PokeApiSpeciesVarieties {
  name: string
  varieties: Array<{ is_default: boolean; pokemon: { name: string; url: string } }>
}

let pokemonListCache: NamedPokemonListItem[] | null = null

function parseStats(stats: PokeApiStat[]): PokemonStats {
  const byName = Object.fromEntries(stats.map((s) => [s.stat.name, s.base_stat]))
  return {
    hp: byName.hp ?? 0,
    attack: byName.attack ?? 0,
    defense: byName.defense ?? 0,
    specialAttack: byName['special-attack'] ?? 0,
    specialDefense: byName['special-defense'] ?? 0,
    speed: byName.speed ?? 0,
  }
}

function parseTypes(types: PokeApiPokemon['types']): PokemonType[] {
  return normalizePokemonTypes(types)
}

function parseAbilities(abilities: PokeApiPokemon['abilities']): PokemonAbility[] {
  return abilities.map((entry) => ({
    slug: entry.ability.name,
    isHidden: entry.is_hidden,
  }))
}

function toSummary(data: PokeApiPokemon): PokemonSummary {
  return {
    id: data.id,
    name: data.name,
    displayName: formatPokemonName(data.name),
    types: parseTypes(data.types),
    stats: parseStats(data.stats),
    abilities: parseAbilities(data.abilities),
    sprite: data.sprites.front_default ?? '',
    speciesUrl: data.species.url,
  }
}

export function toTeamMember(summary: PokemonSummary, nickname?: string): TeamMember {
  return {
    id: summary.id,
    name: summary.name,
    displayName: summary.displayName,
    types: summary.types,
    stats: summary.stats,
    sprite: summary.sprite,
    nickname,
  }
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal })
  if (!response.ok) {
    throw new Error(`PokeAPI request failed (${response.status})`)
  }
  return response.json() as Promise<T>
}

async function fetchPokemonResource(
  identifier: string | number,
  options?: { signal?: AbortSignal },
): Promise<{ data: PokeApiPokemon; alternateFormNames?: string[] }> {
  const response = await fetch(`${POKEAPI_BASE}/pokemon/${identifier}`, { signal: options?.signal })
  if (response.ok) {
    return { data: (await response.json()) as PokeApiPokemon }
  }

  if (response.status !== 404 || typeof identifier === 'number') {
    throw new Error(`PokeAPI request failed (${response.status})`)
  }

  const speciesSlug = String(identifier)
  const species = await fetchJson<PokeApiSpeciesVarieties>(
    `${POKEAPI_BASE}/pokemon-species/${speciesSlug}`,
    options?.signal,
  )
  const defaultVariety = species.varieties.find((variety) => variety.is_default) ?? species.varieties[0]
  if (!defaultVariety) {
    throw new Error(`No Pokémon variety found for species "${speciesSlug}"`)
  }

  const data = await fetchJson<PokeApiPokemon>(defaultVariety.pokemon.url, options?.signal)
  const alternateFormNames =
    species.varieties.length > 1
      ? species.varieties.map((variety) => variety.pokemon.name).filter((name) => name !== data.name)
      : undefined

  return { data, alternateFormNames }
}

export async function fetchPokemon(
  identifier: string | number,
  options?: { signal?: AbortSignal },
): Promise<PokemonSummary> {
  const { data, alternateFormNames } = await fetchPokemonResource(identifier, options)
  return { ...toSummary(data), alternateFormNames }
}

/** Showdown-style regional suffixes → PokeAPI form slugs (e.g. weezing-galarian → weezing-galar). */
const REGIONAL_SUFFIX_ALIASES: Record<string, string> = {
  galarian: 'galar',
  alolan: 'alola',
  hisuian: 'hisui',
  paldean: 'paldea',
}

export function pokemonSlugCandidates(slug: string): string[] {
  const normalized = slug.trim().toLowerCase().replace(/\s+/g, '-')
  const candidates = [normalized]

  for (const [long, short] of Object.entries(REGIONAL_SUFFIX_ALIASES)) {
    const longSuffix = `-${long}`
    if (normalized.endsWith(longSuffix)) {
      candidates.push(`${normalized.slice(0, -longSuffix.length)}-${short}`)
    }
  }

  return [...new Set(candidates)]
}

function regionalTagFromSlug(slug: string): string | null {
  for (const [long, short] of Object.entries(REGIONAL_SUFFIX_ALIASES)) {
    if (slug.endsWith(`-${long}`) || slug.endsWith(`-${short}`)) return short
  }
  return null
}

function baseSpeciesFromSlug(slug: string): string {
  for (const [long, short] of Object.entries(REGIONAL_SUFFIX_ALIASES)) {
    const longSuffix = `-${long}`
    const shortSuffix = `-${short}`
    if (slug.endsWith(longSuffix)) return slug.slice(0, -longSuffix.length)
    if (slug.endsWith(shortSuffix)) return slug.slice(0, -shortSuffix.length)
  }
  return slug
}

/** Resolve a regional form via pokemon-species varieties (e.g. weezing + galar → weezing-galar). */
async function fetchRegionalVarietyFromSpecies(
  slug: string,
  options?: { signal?: AbortSignal },
): Promise<PokemonSummary | null> {
  const region = regionalTagFromSlug(slug)
  if (!region) return null

  const base = baseSpeciesFromSlug(slug)
  if (!base || base === slug) return null

  try {
    const species = await fetchJson<PokeApiSpeciesVarieties>(
      `${POKEAPI_BASE}/pokemon-species/${base}`,
      options?.signal,
    )
    const match =
      species.varieties.find((v) => v.pokemon.name === `${base}-${region}`) ??
      species.varieties.find((v) => v.pokemon.name.endsWith(`-${region}`) && !v.is_default) ??
      species.varieties.find((v) => v.pokemon.name.includes(`-${region}`))
    if (!match) return null

    const data = await fetchJson<PokeApiPokemon>(match.pokemon.url, options?.signal)
    return toSummary(data)
  } catch {
    return null
  }
}

/** Tries regional aliases and other slug variants used in Showdown exports. */
export async function fetchPokemonForImport(
  identifier: string,
  options?: { signal?: AbortSignal },
): Promise<{ pokemon: PokemonSummary; slug: string }> {
  const candidates = pokemonSlugCandidates(identifier)
  let lastError: unknown

  for (const slug of candidates) {
    try {
      const pokemon = await fetchPokemon(slug, options)
      return { pokemon, slug }
    } catch (error) {
      lastError = error
    }
  }

  for (const slug of candidates) {
    const pokemon = await fetchRegionalVarietyFromSpecies(slug, options)
    if (pokemon) {
      return { pokemon, slug: pokemon.name }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`Pokémon not found: ${identifier}`)
}

/** Resolve species types for team slots, fetching from PokeAPI when stored types are missing. */
export async function resolveTeamSpeciesTypes(
  members: Array<{ slotId: string; name: string; types: unknown }>,
): Promise<Map<string, PokemonType[]>> {
  const result = new Map<string, PokemonType[]>()

  await Promise.all(
    members.map(async (member) => {
      const normalized = normalizePokemonTypes(member.types)
      if (normalized.length > 0) {
        result.set(member.slotId, normalized)
        return
      }

      try {
        const pokemon = await fetchPokemon(member.name)
        result.set(member.slotId, pokemon.types)
      } catch {
        result.set(member.slotId, [])
      }
    }),
  )

  return result
}

export async function fetchPokemonList(): Promise<NamedPokemonListItem[]> {
  if (pokemonListCache) return pokemonListCache

  const firstPage = await fetchJson<{ results: NamedPokemonListItem[]; next: string | null }>(
    `${POKEAPI_BASE}/pokemon?limit=2000`,
  )

  pokemonListCache = firstPage.results
  return pokemonListCache
}

export function pokemonMatchScore(name: string, query: string): number {
  const englishScore = scoreEnglishName(name, query)
  const localizedScore = localizedPokemonMatchScore(name, query)
  return Math.min(englishScore, localizedScore)
}

function scoreEnglishName(name: string, query: string): number {
  const normalizedName = name.toLowerCase()
  const normalizedQuery = query.trim().toLowerCase()
  if (normalizedName === normalizedQuery) return 0
  if (normalizedName.startsWith(normalizedQuery)) return 1
  if (normalizedName.includes(normalizedQuery)) return 2
  return 3
}

export function sortPokemonByMatch(
  entries: NamedPokemonListItem[],
  query: string,
): NamedPokemonListItem[] {
  return [...entries].sort((a, b) => {
    const scoreDiff = pokemonMatchScore(a.name, query) - pokemonMatchScore(b.name, query)
    return scoreDiff !== 0 ? scoreDiff : a.name.localeCompare(b.name)
  })
}

export async function searchPokemon(query: string, limit = 12): Promise<NamedPokemonListItem[]> {
  const normalized = query.trim()
  if (!normalized) return []

  hydrateIndexesFromStorage()
  const list = await fetchPokemonList()
  return sortPokemonByMatch(
    list.filter((entry) => pokemonMatchesQuery(entry.name, normalized)),
    normalized,
  ).slice(0, limit)
}

function flattenEvolutionChain(link: PokeApiEvolutionLink): string[] {
  const names = [link.species.name]
  for (const child of link.evolves_to) {
    names.push(...flattenEvolutionChain(child))
  }
  return names
}

export async function fetchEvolutionChain(
  speciesUrl: string,
  options?: { signal?: AbortSignal },
): Promise<EvolutionStage[]> {
  const species = await fetchJson<PokeApiSpecies>(speciesUrl, options?.signal)
  const chain = await fetchJson<PokeApiEvolutionChain>(species.evolution_chain.url, options?.signal)
  const names = flattenEvolutionChain(chain.chain)

  const uniqueNames = [...new Set(names)]
  const stages = await Promise.all(uniqueNames.map((name) => fetchPokemon(name, options)))

  return stages.map((stage) => ({
    id: stage.id,
    name: stage.name,
    displayName: stage.displayName,
    types: stage.types,
    stats: stage.stats,
    sprite: stage.sprite,
    totalStats: totalStats(stage.stats),
  }))
}

export function getSpriteUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`
}
