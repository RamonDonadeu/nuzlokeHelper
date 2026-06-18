import type { PokemonStats } from '@/types/pokemon'
import { STAT_KEYS } from '@/types/pokemon'
import type { Locale } from '@/i18n'

const NEUTRAL_NATURE = 'Hardy'

const NATURE_MODIFIERS: Record<string, { boost: keyof PokemonStats; reduce: keyof PokemonStats }> = {
  Lonely: { boost: 'attack', reduce: 'defense' },
  Brave: { boost: 'attack', reduce: 'speed' },
  Adamant: { boost: 'attack', reduce: 'specialAttack' },
  Naughty: { boost: 'attack', reduce: 'specialDefense' },
  Bold: { boost: 'defense', reduce: 'attack' },
  Relaxed: { boost: 'defense', reduce: 'speed' },
  Impish: { boost: 'defense', reduce: 'specialAttack' },
  Lax: { boost: 'defense', reduce: 'specialDefense' },
  Timid: { boost: 'speed', reduce: 'attack' },
  Hasty: { boost: 'speed', reduce: 'defense' },
  Jolly: { boost: 'speed', reduce: 'specialAttack' },
  Naive: { boost: 'speed', reduce: 'specialDefense' },
  Modest: { boost: 'specialAttack', reduce: 'attack' },
  Mild: { boost: 'specialAttack', reduce: 'defense' },
  Quiet: { boost: 'specialAttack', reduce: 'speed' },
  Rash: { boost: 'specialAttack', reduce: 'specialDefense' },
  Calm: { boost: 'specialDefense', reduce: 'attack' },
  Gentle: { boost: 'specialDefense', reduce: 'defense' },
  Sassy: { boost: 'specialDefense', reduce: 'speed' },
  Careful: { boost: 'specialDefense', reduce: 'specialAttack' },
}

export const NEUTRAL_NATURES = [
  'Hardy', 'Docile', 'Serious', 'Bashful', 'Quirky',
] as const

export const ALL_NATURES = [
  ...Object.keys(NATURE_MODIFIERS),
  ...NEUTRAL_NATURES.filter((n) => !(n in NATURE_MODIFIERS)),
] as string[]

/** Official Spanish nature names (Showdown / cartridge). */
const NATURE_LABELS_ES: Record<string, string> = {
  Adamant: 'Firme',
  Bashful: 'Tímida',
  Bold: 'Osada',
  Brave: 'Audaz',
  Calm: 'Serena',
  Careful: 'Cauta',
  Docile: 'Dócil',
  Gentle: 'Amable',
  Hardy: 'Fuerte',
  Hasty: 'Activa',
  Impish: 'Agitada',
  Jolly: 'Alegre',
  Lax: 'Floja',
  Lonely: 'Huraña',
  Mild: 'Afable',
  Modest: 'Modesta',
  Naive: 'Ingenua',
  Naughty: 'Pícara',
  Quiet: 'Mansa',
  Quirky: 'Rara',
  Rash: 'Alocada',
  Relaxed: 'Plácida',
  Sassy: 'Grosera',
  Serious: 'Seria',
  Timid: 'Miedosa',
}

export function getNatureDisplayLabel(nature: string, locale: Locale): string {
  return locale === 'es' ? (NATURE_LABELS_ES[nature] ?? nature) : nature
}

/** Nature list sorted by the label shown in the current locale. */
export function sortedNaturesForDisplay(locale: Locale): string[] {
  return [...ALL_NATURES].sort((a, b) =>
    getNatureDisplayLabel(a, locale).localeCompare(getNatureDisplayLabel(b, locale), locale),
  )
}

export const MAX_IV = 31
export const MAX_EV_PER_STAT = 252
export const MAX_EV_TOTAL = 510

export function defaultNature(): string {
  return NEUTRAL_NATURE
}

/** +10% / -10% stat keys for a nature; null for neutral or unknown natures. */
export function natureStatModifiers(
  nature?: string,
): { boost: keyof PokemonStats; reduce: keyof PokemonStats } | null {
  if (!nature || !(nature in NATURE_MODIFIERS)) return null
  return NATURE_MODIFIERS[nature]
}

export function totalEvCount(evs?: Partial<PokemonStats>): number {
  if (!evs) return 0
  return STAT_KEYS.reduce((sum, key) => sum + (evs[key] ?? 0), 0)
}

export function hasCustomIv(
  slot: { ivs?: Partial<PokemonStats> },
  key: keyof PokemonStats,
): boolean {
  return slot.ivs?.[key] !== undefined
}

export function hasCustomEv(
  slot: { evs?: Partial<PokemonStats> },
  key: keyof PokemonStats,
): boolean {
  return slot.evs?.[key] !== undefined
}

export function hasCustomIvs(slot: { ivs?: Partial<PokemonStats> }): boolean {
  return slot.ivs !== undefined && Object.keys(slot.ivs).length > 0
}

export function hasCustomEvs(slot: { evs?: Partial<PokemonStats> }): boolean {
  return slot.evs !== undefined && Object.keys(slot.evs).length > 0
}

export function memberHasCustomBuild(slot: {
  ivs?: Partial<PokemonStats>
  evs?: Partial<PokemonStats>
  nature?: string
}): boolean {
  const hasNonNeutralNature =
    slot.nature !== undefined && !NEUTRAL_NATURES.includes(slot.nature as (typeof NEUTRAL_NATURES)[number])
  return hasCustomIvs(slot) || hasCustomEvs(slot) || hasNonNeutralNature
}

export type StatCalcDefaults = {
  /** IV used when the slot has no value for that stat (default 31 for editors / candidates). */
  ivWhenUnset?: number
  /** EV used when the slot has no value for that stat. */
  evWhenUnset?: number
}

const DEFAULT_STAT_CALC: Required<StatCalcDefaults> = { ivWhenUnset: 31, evWhenUnset: 0 }

/** Unset IV/EV when comparing or fighting trainer Pokémon (balanced vs player teams). */
export const BATTLE_ENEMY_STAT_DEFAULTS: StatCalcDefaults = { ivWhenUnset: 15, evWhenUnset: 0 }

/** Unset IV/EV on your side in the battleground (only explicit spreads count). */
export const BATTLE_ALLY_STAT_DEFAULTS: StatCalcDefaults = { ivWhenUnset: 15, evWhenUnset: 0 }

function statIv(
  slotIv: Partial<PokemonStats> | undefined,
  key: keyof PokemonStats,
  defaults: StatCalcDefaults = DEFAULT_STAT_CALC,
): number {
  if (slotIv?.[key] !== undefined) return slotIv[key]!
  return defaults.ivWhenUnset ?? DEFAULT_STAT_CALC.ivWhenUnset
}

function statEv(
  slotEv: Partial<PokemonStats> | undefined,
  key: keyof PokemonStats,
  defaults: StatCalcDefaults = DEFAULT_STAT_CALC,
): number {
  if (slotEv?.[key] !== undefined) return slotEv[key]!
  return defaults.evWhenUnset ?? DEFAULT_STAT_CALC.evWhenUnset
}

function natureMultiplier(nature: string | undefined, key: keyof PokemonStats): number {
  const effective = nature && NATURE_MODIFIERS[nature] ? nature : NEUTRAL_NATURE
  const mod = NATURE_MODIFIERS[effective]
  if (!mod) return 1
  if (mod.boost === key) return 1.1
  if (mod.reduce === key) return 0.9
  return 1
}

export function calculateStat(
  base: number,
  level: number,
  key: keyof PokemonStats,
  ivs?: Partial<PokemonStats>,
  evs?: Partial<PokemonStats>,
  nature?: string,
  defaults?: StatCalcDefaults,
): number {
  const iv = statIv(ivs, key, defaults)
  const ev = statEv(evs, key, defaults)
  const inner = Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100)

  if (key === 'hp') {
    return inner + level + 10
  }

  return Math.floor((inner + 5) * natureMultiplier(nature, key))
}

export function calculateAllStats(
  baseStats: PokemonStats,
  level: number,
  ivs?: Partial<PokemonStats>,
  evs?: Partial<PokemonStats>,
  nature?: string,
  defaults?: StatCalcDefaults,
): PokemonStats {
  const result = {} as PokemonStats
  for (const key of STAT_KEYS) {
    result[key] = calculateStat(baseStats[key], level, key, ivs, evs, nature, defaults)
  }
  return result
}

/** Nature modifier only when the user set a non-neutral nature. */
export function comparisonNatureForMember(member: { nature?: string }): string | undefined {
  if (
    member.nature !== undefined &&
    !NEUTRAL_NATURES.includes(member.nature as (typeof NEUTRAL_NATURES)[number])
  ) {
    return member.nature
  }
  return undefined
}

const COMPARISON_MEMBER_DEFAULTS: StatCalcDefaults = { ivWhenUnset: 0, evWhenUnset: 0 }

/** Searched candidates and evolutions at level cap when not imported (balanced vs wild/trainer mons). */
const COMPARISON_CANDIDATE_DEFAULTS: StatCalcDefaults = { ivWhenUnset: 15, evWhenUnset: 0 }

export function parseIvsFromShowdown(values: Partial<Record<keyof PokemonStats, number>>): Partial<PokemonStats> {
  return values
}

export function parseEvsFromShowdown(values: Partial<Record<keyof PokemonStats, number>>): Partial<PokemonStats> {
  return values
}

/** Team/PC members scaled to level cap; unset IV/EV = 0; nature only when user set a non-neutral one. */
export function comparisonStatsForMember(
  baseStats: PokemonStats,
  levelCap: number,
  member: { ivs?: Partial<PokemonStats>; evs?: Partial<PokemonStats>; nature?: string },
): PokemonStats {
  return calculateAllStats(
    baseStats,
    levelCap,
    member.ivs,
    member.evs,
    comparisonNatureForMember(member),
    COMPARISON_MEMBER_DEFAULTS,
  )
}

/** Searched candidates and evolutions at the level cap with 15 IV / 0 EV / neutral nature when not imported. */
export function comparisonStatsForCandidate(
  baseStats: PokemonStats,
  levelCap: number,
): PokemonStats {
  return calculateAllStats(baseStats, levelCap, undefined, undefined, undefined, COMPARISON_CANDIDATE_DEFAULTS)
}
