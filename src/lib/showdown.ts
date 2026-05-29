import type { PokemonStats } from '@/types/pokemon'
import type { PokemonSlot } from '@/types/profile'
import { defaultNature } from '@/lib/stats'
import { normalizePokemonTypes } from '@/lib/pokemonTypes'
import { fetchPokemon } from '@/lib/pokeapi'
import { canonicalAbilityName } from '@/lib/localizedNames'

const STAT_ALIASES: Record<string, keyof PokemonStats> = {
  HP: 'hp',
  Hp: 'hp',
  hp: 'hp',
  Atk: 'attack',
  atk: 'attack',
  Def: 'defense',
  def: 'defense',
  SpA: 'specialAttack',
  Spa: 'specialAttack',
  spa: 'specialAttack',
  SpD: 'specialDefense',
  Spd: 'specialDefense',
  spd: 'specialDefense',
  Spe: 'speed',
  spe: 'speed',
}

const SET_DETAIL_PREFIX =
  /^(Level|Ability|EVs|IVs|Shiny|Gender|Tera Type|Happiness|Ball|Language):/i

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
  if (!line.toLowerCase().startsWith(`${prefix.toLowerCase()}:`)) return undefined
  const stats: Partial<PokemonStats> = {}
  const colon = line.indexOf(':')
  const body = line.slice(colon + 1).trim()
  for (const part of body.split('/')) {
    const match = part.trim().match(/^(\d+)\s+([A-Za-z]+)/)
    if (!match) continue
    const value = Number(match[1])
    const key = STAT_ALIASES[match[2]] ?? STAT_ALIASES[match[2].charAt(0).toUpperCase() + match[2].slice(1)]
    if (key) stats[key] = value
  }
  return Object.keys(stats).length > 0 ? stats : undefined
}

function parseNatureLine(line: string): string | undefined {
  if (line.startsWith('Nature:')) {
    return line.slice('Nature:'.length).trim()
  }
  const suffixMatch = line.match(/^(.+?)\s+Nature$/i)
  if (suffixMatch) {
    return suffixMatch[1].trim()
  }
  return undefined
}

function parseItem(raw?: string): string | undefined {
  if (!raw) return undefined
  const trimmed = raw.trim()
  if (!trimmed || /^none$/i.test(trimmed)) return undefined
  return trimmed
}

function isSetHeaderLine(line: string): boolean {
  if (!line || line.startsWith('-')) return false
  if (SET_DETAIL_PREFIX.test(line)) return false
  if (parseNatureLine(line)) return false
  return true
}

/** Split a Showdown paste into one block per Pokémon. */
export function splitShowdownBlocks(text: string): string[] {
  const normalized = text.replace(/\r\n/g, '\n').trim()
  if (!normalized) return []

  const blankSeparated = normalized
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)

  if (blankSeparated.length > 1) {
    return blankSeparated
  }

  const lines = normalized.split('\n')
  const blocks: string[] = []
  let current: string[] = []

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) {
      if (current.length > 0) {
        blocks.push(current.join('\n'))
        current = []
      }
      continue
    }

    if (current.length > 0 && isSetHeaderLine(line)) {
      blocks.push(current.join('\n'))
      current = [line]
      continue
    }

    current.push(line)
  }

  if (current.length > 0) {
    blocks.push(current.join('\n'))
  }

  return blocks
}

function parseHeaderLine(header: string): Pick<ParsedShowdownSet, 'name' | 'nickname' | 'item'> {
  const trimmed = header.trim()

  // Nickname (Species) @ Item — item is optional (including bare trailing @)
  const nicknameMatch = trimmed.match(/^(.+?)\s*\(([^)]+)\)(?:\s*@(?:\s*(.*))?)?$/)
  if (nicknameMatch) {
    return {
      nickname: nicknameMatch[1].trim(),
      name: nicknameMatch[2].trim().toLowerCase().replace(/\s+/g, '-'),
      item: parseItem(nicknameMatch[3]),
    }
  }

  const atIndex = trimmed.indexOf('@')
  if (atIndex >= 0) {
    const namePart = trimmed.slice(0, atIndex).trim()
    const itemPart = trimmed.slice(atIndex + 1).trim()
    const parenFallback = namePart.match(/^(.+?)\s*\(([^)]+)\)$/)
    if (parenFallback) {
      return {
        nickname: parenFallback[1].trim(),
        name: parenFallback[2].trim().toLowerCase().replace(/\s+/g, '-'),
        item: parseItem(itemPart),
      }
    }
    return {
      name: namePart.toLowerCase().replace(/\s+/g, '-'),
      item: parseItem(itemPart),
    }
  }

  return {
    name: trimmed.toLowerCase().replace(/\s+/g, '-'),
  }
}

export function parseShowdownPaste(text: string): ParsedShowdownSet[] {
  const sets: ParsedShowdownSet[] = []

  for (const block of splitShowdownBlocks(text)) {
    const lines = block.split('\n').map((line) => line.trim()).filter(Boolean)
    if (lines.length === 0) continue

    const header = parseHeaderLine(lines[0])
    const set: ParsedShowdownSet = {
      ...header,
      moves: [],
    }

    for (const line of lines.slice(1)) {
      if (line.startsWith('Ability:')) {
        set.ability = line.slice('Ability:'.length).trim()
      } else if (line.startsWith('Level:')) {
        const level = Number(line.slice('Level:'.length).trim())
        if (Number.isFinite(level)) set.level = level
      } else if (line.toLowerCase().startsWith('evs:')) {
        set.evs = parseStatLine(line, 'EVs')
      } else if (line.toLowerCase().startsWith('ivs:')) {
        set.ivs = parseStatLine(line, 'IVs')
      } else {
        const nature = parseNatureLine(line)
        if (nature) {
          set.nature = nature
        } else if (line.startsWith('-')) {
          set.moves.push(line.slice(1).trim())
        }
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
        ability: set.ability ? canonicalAbilityName(set.ability) : undefined,
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
  const headerName = slot.displayName
  const header = slot.nickname
    ? `${slot.nickname} (${headerName})${slot.item ? ` @ ${slot.item}` : ''}`
    : `${headerName}${slot.item ? ` @ ${slot.item}` : ''}`
  lines.push(header)

  if (slot.ability) {
    lines.push(`Ability: ${slot.ability}`)
  }

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
    lines.push(`${slot.nature} Nature`)
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
