import type { PokemonStats, PokemonSummary } from '@/types/pokemon'
import type { PokemonSlot } from '@/types/profile'
import { defaultNature } from '@/lib/stats'
import { normalizePokemonTypes } from '@/lib/pokemonTypes'
import { fetchPokemonForImport, pokemonSlugCandidates } from '@/lib/pokeapi'
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
  if (!line || isMoveLine(line)) return false
  if (SET_DETAIL_PREFIX.test(line)) return false
  if (parseNatureLine(line)) return false

  const trimmed = line.trim()
  // Nickname (Species) [@ Item] — common in tracker exports
  if (/^.+\([^)]+\)(?:\s@(?:\s.*)?)?$/.test(trimmed)) return true
  // Species @ Item, Species @, or other @ headers
  if (/@/.test(trimmed)) return true
  return false
}

function isMoveLine(line: string): boolean {
  return line.startsWith('-') || line.startsWith('–') || line.startsWith('—')
}

function parseMoveName(line: string): string {
  return line.replace(/^[-–—]\s*/, '').trim()
}

/** Split a Showdown paste into one block per Pokémon. */
export function splitShowdownBlocks(text: string): string[] {
  const normalized = text.replace(/\r\n/g, '\n').trim()
  if (!normalized) return []

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

    let pastDetails = false

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
          pastDetails = true
        } else if (isMoveLine(line)) {
          set.moves.push(parseMoveName(line))
          pastDetails = true
        } else if (pastDetails) {
          set.moves.push(line.trim())
        }
      }
    }

    sets.push(set)
  }

  return sets
}

export interface ShowdownImportFailure {
  label: string
  speciesSlug: string
  triedSlugs: string[]
  reason?: string
}

function newSlotId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `slot-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export interface ShowdownImportResult {
  slots: PokemonSlot[]
  failures: ShowdownImportFailure[]
}

export interface ShowdownImportOptions {
  /** Existing roster slots to resolve species without PokeAPI requests. */
  knownSlots?: PokemonSlot[]
}

function importFailureLabel(set: ParsedShowdownSet): string {
  if (set.nickname) return set.nickname
  return set.name.replace(/-/g, ' ')
}

function summaryFromKnownSlot(slot: PokemonSlot): PokemonSummary {
  return {
    id: slot.currentSpeciesId ?? slot.speciesId,
    name: slot.name,
    displayName: slot.displayName,
    types: normalizePokemonTypes(slot.types),
    stats: slot.baseStats,
    abilities: [],
    sprite: slot.sprite,
    speciesUrl: '',
  }
}

function findKnownSlotForImport(name: string, knownSlots?: PokemonSlot[]): PokemonSlot | null {
  if (!knownSlots?.length) return null
  const candidates = new Set(pokemonSlugCandidates(name))
  for (const slot of knownSlots) {
    if (candidates.has(slot.name)) return slot
  }
  return null
}

async function resolveImportPokemon(
  name: string,
  knownSlots?: PokemonSlot[],
): Promise<{ pokemon: PokemonSummary; slug: string }> {
  const known = findKnownSlotForImport(name, knownSlots)
  if (known && normalizePokemonTypes(known.types).length > 0) {
    return { pokemon: summaryFromKnownSlot(known), slug: known.name }
  }
  return fetchPokemonForImport(name)
}

export async function showdownSetsToSlots(
  sets: ParsedShowdownSet[],
  defaultLevel = 5,
  options?: ShowdownImportOptions,
): Promise<ShowdownImportResult> {
  const slots: PokemonSlot[] = []
  const failures: ShowdownImportFailure[] = []

  for (const set of sets) {
    const triedSlugs = pokemonSlugCandidates(set.name)
    try {
      const { pokemon } = await resolveImportPokemon(set.name, options?.knownSlots)
      slots.push({
        slotId: newSlotId(),
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
    } catch (error) {
      failures.push({
        label: importFailureLabel(set),
        speciesSlug: set.name,
        triedSlugs,
        reason: error instanceof Error ? error.message : undefined,
      })
    }
  }

  return { slots, failures }
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
