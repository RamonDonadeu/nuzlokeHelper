import type { PokemonSlot } from '@/types/profile'
import { useBattleState } from '@/features/battle/hooks/useBattleState'
import { useI18n } from '@/i18n'
import { BattleTeamColumn } from '@/features/battle/components/BattleTeamColumn'
import { BattlegroundPanel } from '@/features/battle/components/BattlegroundPanel'
import { EnemyPokemonEditor } from '@/features/battle/components/EnemyPokemonEditor'

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
        activeIndices={battle.activeLeftIndices}
        faintedIndices={battle.faintedLeftIndices}
        selectedActiveSlot={battle.selectedLeftActiveSlot}
        onSlotClick={battle.selectLeft}
      />
      <BattlegroundPanel
        started={battle.started}
        activeLeft={battle.activeLeftSlots}
        activeRight={battle.activeRightSlots}
        activeLeftIndices={battle.activeLeftIndices}
        activeRightIndices={battle.activeRightIndices}
        faintedLeftIndices={battle.faintedLeftIndices}
        faintedRightIndices={battle.faintedRightIndices}
        leftHasAlivePokemon={battle.leftHasAlivePokemon}
        rightHasAlivePokemon={battle.rightHasAlivePokemon}
        doubleBattle={battle.doubleBattle}
        onDoubleBattleChange={battle.setDoubleBattle}
        onSelectLeftSlot={battle.setSelectedLeftActiveSlot}
        onSelectRightSlot={battle.setSelectedRightActiveSlot}
        onSwitchLeft={battle.switchLeftSlot}
        onSwitchRight={battle.switchRightSlot}
        onFaintLeft={battle.faintLeftSlot}
        onFaintRight={battle.faintRightSlot}
        onStartFight={battle.startFight}
        onClear={battle.clearBattle}
        team={leftSlots}
        enemyTeam={battle.enemySlots}
      />
      <BattleTeamColumn
        title={t('battle.enemyTeamTitle')}
        side="right"
        slots={battle.enemySlots}
        activeIndices={battle.activeRightIndices}
        faintedIndices={battle.faintedRightIndices}
        selectedActiveSlot={battle.selectedRightActiveSlot}
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
