import type { PokemonSlot } from '@/types/profile'
import { useBattleState } from '@/hooks/useBattleState'
import { useI18n } from '@/i18n'
import { BattleTeamColumn } from '@/components/BattleTeamColumn'
import { BattlegroundPanel } from '@/components/BattlegroundPanel'
import { EnemyPokemonEditor } from '@/components/EnemyPokemonEditor'

interface BattleViewProps {
  team: PokemonSlot[]
  enemyTeam: PokemonSlot[]
  onEnemyTeamChange: (team: PokemonSlot[]) => void
}

export function BattleView({ team, enemyTeam, onEnemyTeamChange }: BattleViewProps) {
  const { t } = useI18n()
  const battle = useBattleState({
    team,
    enemyTeam,
    onEnemyTeamChange,
    confirmClear: () => window.confirm(t('battle.clearConfirm')),
  })

  const leftSlots = Array.from({ length: 6 }, (_, index) => team[index] ?? null)
  const editingSlot = battle.editorIndex === null ? null : battle.enemySlots[battle.editorIndex]

  return (
    <div className="battle-view">
      <BattleTeamColumn
        title={t('battle.yourTeam')}
        side="left"
        slots={leftSlots}
        activeIndex={battle.activeLeftIndex}
        onSlotClick={battle.selectLeft}
      />
      <BattlegroundPanel
        started={battle.started}
        activeLeft={battle.activeLeft}
        activeRight={battle.activeRight}
        doubleBattle={battle.doubleBattle}
        onDoubleBattleChange={battle.setDoubleBattle}
        onStartFight={battle.startFight}
        onClear={battle.clearBattle}
      />
      <BattleTeamColumn
        title={t('battle.enemyTeamTitle')}
        side="right"
        slots={battle.enemySlots}
        activeIndex={battle.activeRightIndex}
        onSlotClick={battle.selectRight}
        onEmptySlotClick={battle.openEnemyEditor}
      />
      <EnemyPokemonEditor
        open={battle.editorOpen}
        existingSlot={editingSlot}
        onClose={battle.closeEnemyEditor}
        onSubmit={(slot) => {
          if (battle.editorIndex === null) return
          battle.upsertEnemySlot(battle.editorIndex, slot)
        }}
      />
    </div>
  )
}
