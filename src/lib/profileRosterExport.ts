import type { PokemonSlot, ProfileSettings, RunProfile } from '@/types/profile'

export const PROFILE_ROSTER_EXPORT_KIND = 'nuzloke-roster' as const
export const PROFILE_ROSTER_EXPORT_VERSION = 1 as const

export interface ProfileRosterExport {
  kind: typeof PROFILE_ROSTER_EXPORT_KIND
  version: typeof PROFILE_ROSTER_EXPORT_VERSION
  exportedAt: string
  sourceProfileName: string
  team: PokemonSlot[]
  box: PokemonSlot[]
  deathBox: PokemonSlot[]
  moveLearnTMs: string[]
  moveLearnRelearnPool: string[]
}

export type ProfileRosterImportFailure =
  | 'invalidJson'
  | 'invalidFormat'
  | 'unsupportedVersion'
  | 'emptyRoster'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPokemonSlot(value: unknown): value is PokemonSlot {
  if (!isRecord(value)) return false
  return (
    typeof value.slotId === 'string' &&
    typeof value.speciesId === 'number' &&
    typeof value.name === 'string' &&
    typeof value.displayName === 'string' &&
    Array.isArray(value.types) &&
    isRecord(value.baseStats) &&
    typeof value.sprite === 'string' &&
    typeof value.level === 'number' &&
    typeof value.currentSpeciesId === 'number'
  )
}

function isSlotArray(value: unknown): value is PokemonSlot[] {
  return Array.isArray(value) && value.every(isPokemonSlot)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function cloneSlotWithNewId(slot: PokemonSlot): PokemonSlot {
  return { ...slot, slotId: crypto.randomUUID() }
}

function cloneSlots(slots: PokemonSlot[]): PokemonSlot[] {
  return slots.map(cloneSlotWithNewId)
}

export function buildProfileRosterExport(profile: RunProfile): ProfileRosterExport {
  return {
    kind: PROFILE_ROSTER_EXPORT_KIND,
    version: PROFILE_ROSTER_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    sourceProfileName: profile.name,
    team: profile.team,
    box: profile.box,
    deathBox: profile.deathBox,
    moveLearnTMs: profile.settings.moveLearnTMs ?? [],
    moveLearnRelearnPool: profile.settings.moveLearnRelearnPool ?? [],
  }
}

export function serializeProfileRosterExport(data: ProfileRosterExport): string {
  return JSON.stringify(data, null, 2)
}

export function parseProfileRosterExport(raw: string): {
  data: ProfileRosterExport | null
  failure: ProfileRosterImportFailure | null
} {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { data: null, failure: 'invalidJson' }
  }

  if (!isRecord(parsed)) {
    return { data: null, failure: 'invalidFormat' }
  }

  if (parsed.kind !== PROFILE_ROSTER_EXPORT_KIND) {
    return { data: null, failure: 'invalidFormat' }
  }

  if (parsed.version !== PROFILE_ROSTER_EXPORT_VERSION) {
    return { data: null, failure: 'unsupportedVersion' }
  }

  if (
    typeof parsed.exportedAt !== 'string' ||
    typeof parsed.sourceProfileName !== 'string' ||
    !isSlotArray(parsed.team) ||
    !isSlotArray(parsed.box) ||
    !isSlotArray(parsed.deathBox) ||
    !isStringArray(parsed.moveLearnTMs) ||
    !isStringArray(parsed.moveLearnRelearnPool)
  ) {
    return { data: null, failure: 'invalidFormat' }
  }

  const totalSlots = parsed.team.length + parsed.box.length + parsed.deathBox.length
  const hasMovePools = parsed.moveLearnTMs.length > 0 || parsed.moveLearnRelearnPool.length > 0
  if (totalSlots === 0 && !hasMovePools) {
    return { data: null, failure: 'emptyRoster' }
  }

  return {
    data: {
      kind: PROFILE_ROSTER_EXPORT_KIND,
      version: PROFILE_ROSTER_EXPORT_VERSION,
      exportedAt: parsed.exportedAt,
      sourceProfileName: parsed.sourceProfileName,
      team: parsed.team,
      box: parsed.box,
      deathBox: parsed.deathBox,
      moveLearnTMs: parsed.moveLearnTMs,
      moveLearnRelearnPool: parsed.moveLearnRelearnPool,
    },
    failure: null,
  }
}

function sanitizeFilenamePart(value: string): string {
  const trimmed = value.trim().slice(0, 48) || 'profile'
  return trimmed.replace(/[^\w\-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

export function downloadProfileRosterExport(profile: RunProfile): void {
  const payload = buildProfileRosterExport(profile)
  const blob = new Blob([serializeProfileRosterExport(payload)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  const date = new Date().toISOString().slice(0, 10)
  anchor.href = url
  anchor.download = `nuzloke-${sanitizeFilenamePart(profile.name)}-${date}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

export function applyProfileRosterImport(
  profile: RunProfile,
  data: ProfileRosterExport,
): RunProfile {
  const moveSettings: Pick<ProfileSettings, 'moveLearnTMs' | 'moveLearnRelearnPool'> = {
    moveLearnTMs: [...data.moveLearnTMs],
    moveLearnRelearnPool: [...data.moveLearnRelearnPool],
  }

  return {
    ...profile,
    team: cloneSlots(data.team),
    box: cloneSlots(data.box),
    deathBox: cloneSlots(data.deathBox),
    settings: {
      ...profile.settings,
      ...moveSettings,
    },
    updatedAt: new Date().toISOString(),
  }
}

export function profileHasRosterData(profile: RunProfile): boolean {
  const hasPokemon =
    profile.team.length > 0 || profile.box.length > 0 || profile.deathBox.length > 0
  const hasMovePools =
    (profile.settings.moveLearnTMs?.length ?? 0) > 0 ||
    (profile.settings.moveLearnRelearnPool?.length ?? 0) > 0
  return hasPokemon || hasMovePools
}

export function countProfileRosterExport(data: ProfileRosterExport): number {
  return data.team.length + data.box.length + data.deathBox.length
}
