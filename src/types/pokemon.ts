export type PokemonType =
  | 'normal'
  | 'fire'
  | 'water'
  | 'electric'
  | 'grass'
  | 'ice'
  | 'fighting'
  | 'poison'
  | 'ground'
  | 'flying'
  | 'psychic'
  | 'bug'
  | 'rock'
  | 'ghost'
  | 'dragon'
  | 'dark'
  | 'steel'
  | 'fairy'

export interface PokemonStats {
  hp: number
  attack: number
  defense: number
  specialAttack: number
  specialDefense: number
  speed: number
}

export interface PokemonAbility {
  /** PokeAPI slug (e.g. overgrow). */
  slug: string
  isHidden: boolean
}

export interface PokemonSummary {
  id: number
  name: string
  displayName: string
  types: PokemonType[]
  stats: PokemonStats
  abilities: PokemonAbility[]
  sprite: string
  speciesUrl: string
  /** Other form slugs when loaded via species fallback (e.g. basculin-blue-striped). */
  alternateFormNames?: string[]
}

export interface EvolutionStage {
  id: number
  name: string
  displayName: string
  types: PokemonType[]
  stats: PokemonStats
  sprite: string
  totalStats: number
}

export interface TeamMember {
  id: number
  name: string
  displayName: string
  types: PokemonType[]
  stats: PokemonStats
  sprite: string
  nickname?: string
}

export function totalStats(stats: PokemonStats): number {
  return STAT_KEYS.reduce((sum, key) => sum + stats[key], 0)
}

export function formatPokemonName(name: string): string {
  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export interface TeamComparisonRow {
  member: TeamMember
  totalStats: number
  diff: number
}

export interface NamedPokemonListItem {
  name: string
  url: string
}

export const STAT_KEYS: (keyof PokemonStats)[] = [
  'hp',
  'attack',
  'defense',
  'specialAttack',
  'specialDefense',
  'speed',
]

export const STAT_LABELS: Record<keyof PokemonStats, string> = {
  hp: 'HP',
  attack: 'Atk',
  defense: 'Def',
  specialAttack: 'SpA',
  specialDefense: 'SpD',
  speed: 'Spe',
}
