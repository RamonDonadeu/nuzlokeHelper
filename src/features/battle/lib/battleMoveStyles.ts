import { multiplierTier } from '@/lib/typeChart'

/** Your move vs enemy: green = strong, red = weak. */
export function offensiveMoveEffectClass(multiplier: number | null): string {
  if (multiplier === null) return 'battle-move-eff-unknown'
  return `battle-move-off-${multiplierTier(multiplier)}`
}

/** Enemy move vs you: red = threatening, green = resisted (reuses defense tier colors). */
export function incomingMoveEffectClass(multiplier: number | null): string {
  if (multiplier === null) return 'battle-move-eff-unknown'
  return `coverage-defense-${multiplierTier(multiplier)}`
}
