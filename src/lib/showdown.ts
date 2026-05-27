import type { PokemonStats } from '@/types/pokemon'
import type { PokemonSlot } from '@/types/profile'
import { defaultNature } from '@/lib/stats'
import { normalizePokemonTypes } from '@/lib/pokemonTypes'
import { fetchPokemon } from '@/lib/pokeapi'

const STAT_ALIASES: Record<string, keyof PokemonStats> = {
  HP: 'hp',
  Atk: 'attack',
  Def: 'defense',
  SpA: 'specialAttack',
  SpD: 'specialDefense',
  Spe: 'speed',
}

export interface ParsedShowdownSet {
  name: string
  nickname?: string
  item?: string
  ability?: string
  level?: number
  evs?: Partial<PokemonStats>
  ivs?: Partial<PokemonStats>
  nature?: string
  moves: string[]
}

function parseStatLine(line: string, prefix: 'EVs' | 'IVs'): Partial<PokemonStats> | undefined {
  if (!line.startsWith(`${prefix}:`)) return undefined
  const stats: Partial<PokemonStats> = {}
  const body = line.slice(prefix.length + 1).trim()
  for (const part of body.split('/')) {
    const match = part.trim().match(/^(\d+)\s+(\w+)/)
    if (!match) continue
    const value = Number(match[1])
    const key = STAT_ALIASES[match[2]]
    if (key) stats[key] = value
  }
  return Object.keys(stats).length > 0 ? stats : undefined
}

export function parseShowdownPaste(text: string): ParsedShowdownSet[] {
  const blocks = text.split(/\n(?=[^\s-])/).map((block) => block.trim()).filter(Boolean)
  const sets: ParsedShowdownSet[] = []

  for (const block of blocks) {
    const lines = block.split('\n').map((line) => line.trim()).filter(Boolean)
    if (lines.length === 0) continue

    const header = lines[0]
    const nicknameMatch = header.match(/^(.+?)\s*\((.+?)\)/)
    const nameLine = nicknameMatch ? nicknameMatch[2].trim() : header.split('@')[0].trim()

    const nickname = nicknameMatch ? nicknameMatch[1].trim() : undefined
    const item = header.includes('@') ? header.split('@')[1]?.trim() : undefined

    const set: ParsedShowdownSet = {
      name: nameLine.toLowerCase().replace(/\s+/g, '-'),
      nickname,
      item,
      moves: [],
    }

    for (const line of lines.slice(1)) {
      if (line.startsWith('Ability:')) {
        set.ability = line.slice('Ability:'.length).trim()
      } else if (line.startsWith('Level:')) {
        set.level = Number(line.slice('Level:'.length).trim())
      } else if (line.startsWith('Nature:')) {
        set.nature = line.slice('Nature:'.length).trim()
      } else if (line.startsWith('EVs:')) {
        set.evs = parseStatLine(line, 'EVs')
      } else if (line.startsWith('IVs:')) {
        set.ivs = parseStatLine(line, 'IVs')
      } else if (line.startsWith('-')) {
        set.moves.push(line.slice(1).trim())
      } else if (line.startsWith('Shiny:') || line.startsWith('Gender:') || line.startsWith('Tera Type:')) {
        // ignore
      }
    }

    sets.push(set)
  }

  return sets
}

export async function showdownSetsToSlots(
  sets: ParsedShowdownSet[],
  defaultLevel = 5,
): Promise<PokemonSlot[]> {
  const slots: PokemonSlot[] = []

  for (const set of sets) {
    try {
      const normalized = set.name.toLowerCase().replace(/\s+/g, '-')
      const pokemon = await fetchPokemon(normalized)
      slots.push({
        slotId: crypto.randomUUID(),
        speciesId: pokemon.id,
        currentSpeciesId: pokemon.id,
        name: pokemon.name,
        displayName: pokemon.displayName,
        types: normalizePokemonTypes(pokemon.types),
        baseStats: pokemon.stats,
        sprite: pokemon.sprite,
        nickname: set.nickname,
        level: set.level ?? defaultLevel,
        ivs: set.ivs,
        evs: set.evs,
        nature: set.nature ?? defaultNature(),
        ability: set.ability,
        item: set.item,
        moves: set.moves.length > 0 ? set.moves.slice(0, 4) : undefined,
      })
    } catch {
      // skip unknown species
    }
  }

  return slots
}

export function slotToShowdown(slot: PokemonSlot): string {
  const lines: string[] = []
  const header = slot.nickname
    ? `${slot.nickname} (${slot.displayName})`
    : slot.displayName
  lines.push(header)

  if (slot.level && slot.level !== 100) {
    lines.push(`Level: ${slot.level}`)
  }

  if (slot.evs && Object.keys(slot.evs).length > 0) {
    const evParts = Object.entries(slot.evs)
      .map(([key, value]) => {
        const label = Object.entries(STAT_ALIASES).find(([, v]) => v === key)?.[0]
        return label ? `${value} ${label}` : null
      })
      .filter(Boolean)
    if (evParts.length) lines.push(`EVs: ${evParts.join(' / ')}`)
  }

  if (slot.ivs && Object.keys(slot.ivs).length > 0) {
    const ivParts = Object.entries(slot.ivs)
      .map(([key, value]) => {
        const label = Object.entries(STAT_ALIASES).find(([, v]) => v === key)?.[0]
        return label ? `${value} ${label}` : null
      })
      .filter(Boolean)
    if (ivParts.length) lines.push(`IVs: ${ivParts.join(' / ')}`)
  }

  if (slot.nature) {
    lines.push(`Nature: ${slot.nature}`)
  }

  if (slot.ability) {
    lines.push(`Ability: ${slot.ability}`)
  }

  for (const move of slot.moves ?? []) {
    if (move.trim()) lines.push(`- ${move.trim()}`)
  }

  return lines.join('\n')
}

export function slotsToShowdownPaste(slots: PokemonSlot[]): string {
  return slots.map(slotToShowdown).join('\n\n')
}

export function normalizeSpeciesName(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, '-')
}

