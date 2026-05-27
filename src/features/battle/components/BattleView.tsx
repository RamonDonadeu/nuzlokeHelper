import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { PokemonSlot } from '@/types/profile'
import { useBattleState } from '@/features/battle/hooks/useBattleState'
import { useI18n } from '@/i18n'
import { BattleTeamColumn } from '@/features/battle/components/BattleTeamColumn'
import { BattlegroundPanel } from '@/features/battle/components/BattlegroundPanel'
import { EnemyPokemonEditor } from '@/features/battle/components/EnemyPokemonEditor'
import { EnemyTeamImportDialog } from '@/features/battle/components/EnemyTeamImportDialog'
import { BattlePrepPanel } from '@/features/battle/components/BattlePrepPanel'

interface BattleViewProps {
  team: PokemonSlot[]
  enemyTeam: PokemonSlot[]
  onEnemyTeamChange: (team: PokemonSlot[]) => void
}

type BattleLocationState = {
  startFight?: boolean
}

export function BattleView({ team, enemyTeam, onEnemyTeamChange }: BattleViewProps) {
  const { t } = useI18n()
  const location = useLocation()
  const navigate = useNavigate()
  const [importOpen, setImportOpen] = useState(false)
  const battle = useBattleState({
    team,
    enemyTeam,
    onEnemyTeamChange,
    confirmClear: () => window.confirm(t('battle.clearConfirm')),
  })

  useEffect(() => {
    const state = location.state as BattleLocationState | null
    if (!state?.startFight) return
    battle.startFight()
    navigate(location.pathname, { replace: true, state: null })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- run once on mount when navigated from search

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
        onFilledSlotClick={(index) => {
          if (battle.started) {
            battle.selectLeft(index)
            return
          }
          const slot = team[index]
          if (slot) navigate(`/team/${slot.slotId}`, { state: { returnTo: '/battle' } })
        }}
      />
      <div className="battle-center-column">
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
        {!battle.started ? (
          <BattlePrepPanel team={team} enemySlots={battle.enemySlots} started={battle.started} />
        ) : null}
      </div>
      <BattleTeamColumn
        title={t('battle.enemyTeamTitle')}
        side="right"
        slots={battle.enemySlots}
        activeIndices={battle.activeRightIndices}
        faintedIndices={battle.faintedRightIndices}
        selectedActiveSlot={battle.selectedRightActiveSlot}
        onFilledSlotClick={(index) => {
          if (battle.started) {
            battle.selectRight(index)
            return
          }
          battle.openEnemyEditor(index)
        }}
        onEmptySlotClick={battle.started ? undefined : battle.openEnemyEditor}
        actions={
          battle.started ? null : (
            <button type="button" className="btn btn-sm" onClick={() => setImportOpen(true)}>
              {t('battle.importAction')}
            </button>
          )
        }
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
      <EnemyTeamImportDialog
        open={importOpen}
        hasExistingEnemyTeam={battle.enemySlots.some((slot) => slot !== null)}
        onClose={() => setImportOpen(false)}
        onImport={battle.importEnemyTeam}
      />
    </div>
  )
}
