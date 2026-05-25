import type { PokemonType } from '@/types/pokemon'

const VALID_TYPES = new Set<PokemonType>([
  'normal',
  'fire',
  'water',
  'electric',
  'grass',
  'ice',
  'fighting',
  'poison',
  'ground',
  'flying',
  'psychic',
  'bug',
  'rock',
  'ghost',
  'dragon',
  'dark',
  'steel',
  'fairy',
])

function pushType(result: PokemonType[], type: string): void {
  if (!VALID_TYPES.has(type as PokemonType)) return
  const typed = type as PokemonType
  if (!result.includes(typed)) result.push(typed)
}

/** Normalize persisted or API-shaped type data into validated PokemonType slugs. */
export function normalizePokemonTypes(raw: unknown): PokemonType[] {
  if (raw == null) return []

  if (typeof raw === 'string') {
    return VALID_TYPES.has(raw as PokemonType) ? [raw as PokemonType] : []
  }

  if (!Array.isArray(raw)) return []

  const result: PokemonType[] = []
  for (const entry of raw) {
    if (typeof entry === 'string') {
      pushType(result, entry)
      continue
    }
    if (entry && typeof entry === 'object') {
      const nested = entry as { type?: { name?: string }; name?: string }
      const name = nested.type?.name ?? nested.name
      if (typeof name === 'string') pushType(result, name)
    }
  }
  return result
}

export function hasValidPokemonTypes(raw: unknown): boolean {
  return normalizePokemonTypes(raw).length > 0
}
