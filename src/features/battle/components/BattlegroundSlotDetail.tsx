import { BattlegroundAbilityItem } from '@/features/battle/components/BattlegroundAbilityItem'
import { BattlegroundMoves } from '@/features/battle/components/BattlegroundMoves'
import { BattlegroundStats } from '@/features/battle/components/BattlegroundStats'
import type { PokemonSlot } from '@/types/profile'

interface BattlegroundSlotDetailProps {
  slotLabel?: string
  left: PokemonSlot | null
  right: PokemonSlot | null
}

export function BattlegroundSlotDetail({ slotLabel, left, right }: BattlegroundSlotDetailProps) {
  if (!left && !right) return null

  return (
    <section className="battleground-slot-detail">
      {slotLabel ? <h4 className="battleground-slot-detail-title">{slotLabel}</h4> : null}
      <BattlegroundStats left={left} right={right} />
      <BattlegroundAbilityItem left={left} right={right} />
      <BattlegroundMoves left={left} right={right} />
    </section>
  )
}
