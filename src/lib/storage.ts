import type { TeamMember } from '@/types/pokemon'
import type { AppPersistedState, PokemonSlot, RunProfile } from '@/types/profile'
import { clampLevelCap, createDefaultSettings, createProfile, DEFAULT_LEVEL_CAP, DEFAULT_LOCALE } from '@/types/profile'
import { normalizePokemonTypes } from '@/lib/pokemonTypes'

const LEGACY_TEAM_KEY = 'nuzloke-helper-team-v1'
const STORAGE_KEY = 'nuzloke-helper-profiles-v2'

function loadLegacyTeam(): TeamMember[] {
  try {
    const raw = localStorage.getItem(LEGACY_TEAM_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as TeamMember[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function legacyToSlot(member: TeamMember): PokemonSlot {
  return {
    slotId: crypto.randomUUID(),
    speciesId: member.id,
    name: member.name,
    displayName: member.displayName,
    types: normalizePokemonTypes(member.types),
    baseStats: member.stats,
    sprite: member.sprite,
    nickname: member.nickname,
    level: 5,
    currentSpeciesId: member.id,
  }
}

function migrateLegacyTeam(): RunProfile {
  const legacy = loadLegacyTeam()
  const profile = createProfile('My run', createDefaultSettings())
  profile.team = legacy.map(legacyToSlot)
  return profile
}

function normalizeSlot(slot: PokemonSlot): PokemonSlot {
  return {
    ...slot,
    types: normalizePokemonTypes(slot.types),
  }
}

function normalizeProfile(profile: RunProfile): RunProfile {
  const defaults = createDefaultSettings(profile.settings?.config)
  return {
    ...profile,
    settings: {
      ...defaults,
      ...profile.settings,
      levelCap: clampLevelCap(profile.settings?.levelCap ?? defaults.levelCap ?? DEFAULT_LEVEL_CAP),
    },
    team: profile.team.map(normalizeSlot),
    box: profile.box.map(normalizeSlot),
    deathBox: profile.deathBox.map(normalizeSlot),
    opponentTeam: profile.opponentTeam.map(normalizeSlot),
  }
}

function normalizeState(state: AppPersistedState): AppPersistedState {
  return {
    ...state,
    profiles: state.profiles.map(normalizeProfile),
  }
}
function defaultState(): AppPersistedState {
  const profile = createProfile('My run', createDefaultSettings())
  return {
    version: 2,
    activeProfileId: profile.id,
    locale: DEFAULT_LOCALE,
    profiles: [profile],
  }
}

export function loadAppState(): AppPersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AppPersistedState
      if (parsed.version === 2 && Array.isArray(parsed.profiles) && parsed.profiles.length > 0) {
        return normalizeState(parsed)
      }
    }
  } catch {
    // fall through to migration
  }

  const legacy = loadLegacyTeam()
  if (legacy.length > 0) {
    const profile = migrateLegacyTeam()
    const state = normalizeState({
      version: 2,
      activeProfileId: profile.id,
      locale: DEFAULT_LOCALE,
      profiles: [profile],
    })
    saveAppState(state)
    return state
  }

  const state = defaultState()
  saveAppState(state)
  return state
}

export function saveAppState(state: AppPersistedState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export { STORAGE_KEY, LEGACY_TEAM_KEY }
