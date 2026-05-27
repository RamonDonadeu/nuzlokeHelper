import { calculateAllStats } from '@/lib/stats'
import type { PokemonSlot } from '@/types/profile'
import { totalStats } from '@/types/pokemon'

function memberTotalStats(member: PokemonSlot): number {
  return totalStats(
    calculateAllStats(member.baseStats, member.level, member.ivs, member.evs, member.nature),
  )
}

/** PC roster sorted by sum of six stats at current level (highest first). */
export function sortPcByTotalStats(pc: PokemonSlot[]): PokemonSlot[] {
  return [...pc].sort((a, b) => memberTotalStats(b) - memberTotalStats(a))
}
