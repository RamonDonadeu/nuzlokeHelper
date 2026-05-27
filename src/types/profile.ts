import { versionGroupToGeneration } from '@/lib/versionGroups'
import type { PokemonStats, PokemonType } from '@/types/pokemon'

export type ProfileKind = 'official' | 'hackrom'

export interface OfficialProfileConfig {
  kind: 'official'
  versionGroup: string
  gameLabel: string
}

export interface HackromProfileConfig {
  kind: 'hackrom'
  baseGeneration: number
  pokemonGenerationScope: number
  label?: string
}

export type ProfileConfig = OfficialProfileConfig | HackromProfileConfig

export interface ProfileSettings {
  config: ProfileConfig
  levelCap: number
  allowRevival: boolean
}

export interface PokemonSlot {
  slotId: string
  speciesId: number
  name: string
  displayName: string
  types: PokemonType[]
  baseStats: PokemonStats
  sprite: string
  nickname?: string
  level: number
  ivs?: Partial<PokemonStats>
  evs?: Partial<PokemonStats>
  nature?: string
  ability?: string
  item?: string
  /** Up to 4 move names */
  moves?: string[]
  /** Current evolution stage species id (may differ from speciesId if evolved) */
  currentSpeciesId: number
}

export type SlotListName = 'team' | 'box' | 'deathBox' | 'opponentTeam'

export function findSlotInProfile(
  profile: RunProfile,
  slotId: string,
): { slot: PokemonSlot; list: SlotListName } | null {
  for (const list of ['team', 'box', 'deathBox', 'opponentTeam'] as const) {
    const slot = profile[list].find((m) => m.slotId === slotId)
    if (slot) return { slot, list }
  }
  return null
}

export interface RunProfile {
  id: string
  name: string
  settings: ProfileSettings
  team: PokemonSlot[]
  box: PokemonSlot[]
  deathBox: PokemonSlot[]
  opponentTeam: PokemonSlot[]
  createdAt: string
  updatedAt: string
}

export interface AppPersistedState {
  version: 2
  activeProfileId: string
  locale: 'en' | 'es'
  profiles: RunProfile[]
}

export interface EvolutionChoice {
  slotId: string
  fromLevel: number
  toLevel: number
  list: SlotListName
  source: 'levelUp' | 'manual'
  options: Array<{
    speciesId: number
    name: string
    displayName: string
    sprite: string
    types: PokemonType[]
    baseStats: PokemonStats
    minLevel: number | null
  }>
}

export const MAX_TEAM_SIZE = 6
export const MIN_POKEMON_LEVEL = 1
export const MIN_LEVEL_CAP = 1
export const MAX_LEVEL_CAP = 100
export const DEFAULT_LEVEL_CAP = 50
export const DEFAULT_LOCALE = 'en' as const

/** Per-run level cap stored on profile settings; UI lives in the team panel. */
export function clampLevelCap(value: number): number {
  if (!Number.isFinite(value)) return MIN_LEVEL_CAP
  return Math.max(MIN_LEVEL_CAP, Math.min(MAX_LEVEL_CAP, Math.round(value)))
}

/** Clamp a Pokémon level to [1, min(100, profile level cap)]. */
export function clampPokemonLevel(value: number, levelCap: number = MAX_LEVEL_CAP): number {
  const max = Math.min(MAX_LEVEL_CAP, clampLevelCap(levelCap))
  if (!Number.isFinite(value)) return max
  return Math.max(MIN_POKEMON_LEVEL, Math.min(max, Math.round(value)))
}

export function createDefaultSettings(config?: Partial<ProfileConfig>): ProfileSettings {
  const profileConfig: ProfileConfig = config?.kind === 'hackrom'
    ? {
        kind: 'hackrom',
        baseGeneration: config.baseGeneration ?? 3,
        pokemonGenerationScope: config.pokemonGenerationScope ?? 9,
        label: config.label,
      }
    : config?.kind === 'official'
      ? {
          kind: 'official',
          versionGroup: config.versionGroup ?? 'emerald',
          gameLabel: config.gameLabel ?? 'Emerald',
        }
      : {
          kind: 'hackrom',
          baseGeneration: 3,
          pokemonGenerationScope: 9,
          label: 'Hackrom run',
        }

  return {
    config: profileConfig,
    levelCap: DEFAULT_LEVEL_CAP,
    allowRevival: false,
  }
}

export function createProfile(name: string, settings?: ProfileSettings): RunProfile {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    name,
    settings: settings ?? createDefaultSettings(),
    team: [],
    box: [],
    deathBox: [],
    opponentTeam: [],
    createdAt: now,
    updatedAt: now,
  }
}

export function getProfileGeneration(settings: ProfileSettings): number {
  if (settings.config.kind === 'hackrom') {
    return settings.config.baseGeneration
  }
  return versionGroupToGeneration(settings.config.versionGroup)
}
