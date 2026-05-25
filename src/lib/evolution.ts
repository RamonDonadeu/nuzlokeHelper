import type { PokemonStats, PokemonType } from '@/types/pokemon'
import { formatPokemonName } from '@/types/pokemon'
import { fetchPokemon } from '@/lib/pokeapi'

export interface EvolutionOption {
  fromName: string
  toSpeciesId: number
  toName: string
  displayName: string
  minLevel: number | null
  trigger: string
}

interface PokeApiEvolutionDetail {
  min_level: number | null
  trigger: { name: string }
}

interface PokeApiEvolutionLink {
  species: { name: string; url: string }
  evolution_details: PokeApiEvolutionDetail[]
  evolves_to: PokeApiEvolutionLink[]
}

interface PokeApiEvolutionChain {
  chain: PokeApiEvolutionLink
}

interface PokeApiSpecies {
  id: number
  evolution_chain: { url: string }
}

const evolutionCache = new Map<string, EvolutionOption[]>()

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`PokeAPI request failed (${response.status})`)
  return response.json() as Promise<T>
}

function walkChain(link: PokeApiEvolutionLink, results: EvolutionOption[]): void {
  for (const child of link.evolves_to) {
    const detail = child.evolution_details[0]
    results.push({
      fromName: link.species.name,
      toSpeciesId: 0,
      toName: child.species.name,
      displayName: formatPokemonName(child.species.name),
      minLevel: detail?.min_level ?? null,
      trigger: detail?.trigger?.name ?? 'unknown',
    })
    walkChain(child, results)
  }
}

export async function fetchEvolutionOptions(speciesUrl: string): Promise<EvolutionOption[]> {
  if (evolutionCache.has(speciesUrl)) return evolutionCache.get(speciesUrl)!

  const species = await fetchJson<PokeApiSpecies>(speciesUrl)
  const chain = await fetchJson<PokeApiEvolutionChain>(species.evolution_chain.url)
  const options: EvolutionOption[] = []
  walkChain(chain.chain, options)

  const enriched = await Promise.all(
    options.map(async (opt) => {
      const pokemon = await fetchPokemon(opt.toName)
      return { ...opt, toSpeciesId: pokemon.id }
    }),
  )

  evolutionCache.set(speciesUrl, enriched)
  return enriched
}

export function findEvolutionsAtLevel(
  options: EvolutionOption[],
  currentName: string,
  level: number,
): EvolutionOption[] {
  return options.filter(
    (opt) =>
      opt.fromName === currentName &&
      opt.minLevel !== null &&
      opt.minLevel === level &&
      opt.trigger === 'level-up',
  )
}

export function canEvolveAtLevel(
  options: EvolutionOption[],
  currentName: string,
  level: number,
): boolean {
  return findEvolutionsAvailableAtLevel(options, currentName, level).length > 0
}

export function findEvolutionsAvailableAtLevel(
  options: EvolutionOption[],
  currentName: string,
  level: number,
): EvolutionOption[] {
  return options.filter(
    (opt) =>
      opt.fromName === currentName &&
      opt.minLevel !== null &&
      opt.minLevel <= level &&
      opt.trigger === 'level-up',
  )
}

export async function fetchPokemonFormData(name: string): Promise<{
  id: number
  name: string
  displayName: string
  types: PokemonType[]
  baseStats: PokemonStats
  sprite: string
}> {
  const pokemon = await fetchPokemon(name)
  return {
    id: pokemon.id,
    name: pokemon.name,
    displayName: pokemon.displayName,
    types: pokemon.types,
    baseStats: pokemon.stats,
    sprite: pokemon.sprite,
  }
}
