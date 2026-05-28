import { TeamPanel } from '@/features/team/components/TeamPanel'
import type { PokemonSlot } from '@/types/profile'

interface TeamViewProps {
  team: PokemonSlot[]
  levelCap: number
  selectedSlotId: string | null
  onSelectSlot: (slotId: string) => void
  onUpdateLevelCap: (levelCap: number) => void
  onMoveAllToCap: () => void
  onSendAllToPC: () => void
  onLevelUp: (slotId: string) => void
  onLevelDown: (slotId: string) => void
  onMoveToBox: (slotId: string) => void
  onMarkDead: (slotId: string) => void
  onEvolve: (slotId: string) => void
}

export function TeamView(props: TeamViewProps) {
  return (
    <div className="team-page">
      <TeamPanel {...props} />
    </div>
  )
}
