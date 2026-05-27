import type { PokemonSlot } from '@/types/profile'
import { StatComparison } from '@/features/search/components/StatComparison'

interface TeamStatsComparisonProps {
  team: PokemonSlot[]
  levelCap: number
  onBack: () => void
}

export function TeamStatsComparison({ team, levelCap, onBack }: TeamStatsComparisonProps) {
  return <StatComparison team={team} levelCap={levelCap} teamOnly onBack={onBack} />
}
