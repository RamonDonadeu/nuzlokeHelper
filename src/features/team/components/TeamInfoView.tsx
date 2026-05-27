import type { PokemonSlot } from '@/types/profile'
import { TeamStatsComparison } from '@/features/team/components/TeamStatsComparison'
import { TypeAnalysis } from '@/features/typing/components/TypeAnalysis'

interface TeamInfoViewProps {
  team: PokemonSlot[]
  levelCap: number
}

export function TeamInfoView({ team, levelCap }: TeamInfoViewProps) {
  return (
    <div className="team-info-page">
      <TeamStatsComparison team={team} levelCap={levelCap} />
      <TypeAnalysis team={team} />
    </div>
  )
}
