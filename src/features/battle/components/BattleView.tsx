import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { PokemonType } from '@/types/pokemon'
import type { PokemonSlot } from '@/types/profile'
import { MAX_TEAM_SIZE } from '@/types/profile'
import { useBattleState } from '@/features/battle/hooks/useBattleState'
import { useI18n } from '@/i18n'
import { BattleTeamColumn } from '@/features/battle/components/BattleTeamColumn'
import { BattlegroundPanel } from '@/features/battle/components/BattlegroundPanel'
import { BattlePokemonEditorModal } from '@/features/battle/components/BattlePokemonEditorModal'
import { BattlePcSwitchDialog } from '@/features/battle/components/BattlePcSwitchDialog'
import { EnemyTeamImportDialog } from '@/features/battle/components/EnemyTeamImportDialog'
import { BattlePrepPanel } from '@/features/battle/components/BattlePrepPanel'
import { sortPcByTotalStats } from '@/features/battle/lib/sortPcByTotalStats'
import {
  buildPlayerThreatCountMap,
  buildThreatCountMap,
  resolveDamagingMoveTypes,
  uniqueNonEmptyMoves,
} from '@/features/battle/lib/battlePrepMatchup'

interface BattleViewProps {
  team: PokemonSlot[]
  pc: PokemonSlot[]
  enemyTeam: PokemonSlot[]
  levelCap: number
  onEnemyTeamChange: (team: PokemonSlot[]) => void
  onAllySlotPatch: (slotId: string, patch: Partial<PokemonSlot>) => void
  onMovePcToTeam: (boxSlotId: string) => void
  onSwapPcWithTeamSlot: (boxSlotId: string, teamIndex: number) => void
}

type BattleLocationState = {
  startFight?: boolean
}

export function BattleView({
  team,
  pc,
  enemyTeam,
  levelCap,
  onEnemyTeamChange,
  onAllySlotPatch,
  onMovePcToTeam,
  onSwapPcWithTeamSlot,
}: BattleViewProps) {
  const { t } = useI18n()
  const location = useLocation()
  const navigate = useNavigate()
  const [importOpen, setImportOpen] = useState(false)
  const [allyEditorIndex, setAllyEditorIndex] = useState<number | null>(null)
  const [pcSwitchSlotId, setPcSwitchSlotId] = useState<string | null>(null)
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

  const leftSlots = Array.from({ length: MAX_TEAM_SIZE }, (_, index) => team[index] ?? null)
  const sortedPc = useMemo(() => sortPcByTotalStats(pc), [pc])
  const pcSwitchIncoming = pcSwitchSlotId ? (pc.find((m) => m.slotId === pcSwitchSlotId) ?? null) : null
  const enemies = useMemo(
    () => battle.enemySlots.filter((slot): slot is PokemonSlot => slot !== null),
    [battle.enemySlots],
  )
  const playerRoster = useMemo(() => [...team, ...pc], [pc, team])
  const [enemyDamagingMoveTypes, setEnemyDamagingMoveTypes] = useState<Map<string, PokemonType>>(new Map())
  const [teamDamagingMoveTypes, setTeamDamagingMoveTypes] = useState<Map<string, PokemonType>>(new Map())

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const moveTypes = await resolveDamagingMoveTypes(uniqueNonEmptyMoves(enemies))
      if (!cancelled) setEnemyDamagingMoveTypes(moveTypes)
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [enemies])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const moveTypes = await resolveDamagingMoveTypes(uniqueNonEmptyMoves(playerRoster))
      if (!cancelled) setTeamDamagingMoveTypes(moveTypes)
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [playerRoster])

  const threatCountsBySlotId = useMemo(() => {
    if (enemies.length === 0) return new Map<string, number>()
    return buildThreatCountMap(playerRoster, enemies, enemyDamagingMoveTypes)
  }, [enemies, enemyDamagingMoveTypes, playerRoster])

  const enemyThreatCountsBySlotId = useMemo(() => {
    if (enemies.length === 0 || playerRoster.length === 0) return new Map<string, number>()
    return buildPlayerThreatCountMap(enemies, playerRoster, teamDamagingMoveTypes)
  }, [enemies, playerRoster, teamDamagingMoveTypes])

  const editingSlot = battle.editorIndex === null ? null : battle.enemySlots[battle.editorIndex]
  const editingAllySlot = allyEditorIndex === null ? null : team[allyEditorIndex] ?? null

  return (
    <div className="battle-view">
      <BattleTeamColumn
        title={t('battle.yourTeam')}
        side="left"
        slots={leftSlots}
        activeIndices={battle.activeLeftIndices}
        faintedIndices={battle.faintedLeftIndices}
        selectedActiveSlot={battle.selectedLeftActiveSlot}
        threatCountsBySlotId={threatCountsBySlotId}
        threatTotalCount={enemies.length}
        threatBadgeVariant="defensive"
        pcMembers={sortedPc}
        pcClickDisabled={battle.started}
        pcClickDisabledTitle={t('battle.pcDisabledDuringFight')}
        onPcMemberClick={(slotId) => {
          if (battle.started) return
          if (team.length >= MAX_TEAM_SIZE) {
            setPcSwitchSlotId(slotId)
            return
          }
          onMovePcToTeam(slotId)
        }}
        onFilledSlotClick={(index) => {
          if (battle.started) {
            battle.selectLeft(index)
            return
          }
          const slot = team[index]
          if (slot) setAllyEditorIndex(index)
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
          <BattlePrepPanel
            team={team}
            pc={pc}
            enemySlots={battle.enemySlots}
            levelCap={levelCap}
            started={battle.started}
          />
        ) : null}
      </div>
      <BattleTeamColumn
        title={t('battle.enemyTeamTitle')}
        side="right"
        slots={battle.enemySlots}
        activeIndices={battle.activeRightIndices}
        faintedIndices={battle.faintedRightIndices}
        selectedActiveSlot={battle.selectedRightActiveSlot}
        threatCountsBySlotId={enemyThreatCountsBySlotId}
        threatTotalCount={playerRoster.length}
        threatBadgeVariant="offensive"
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
      <BattlePokemonEditorModal
        key={
          battle.editorOpen
            ? `enemy-${battle.editorIndex}-${editingSlot?.slotId ?? 'new'}`
            : 'enemy-closed'
        }
        open={battle.editorOpen}
        title={t('battle.enemyEditorTitle')}
        existingSlot={editingSlot}
        levelCap={levelCap}
        onClose={battle.closeEnemyEditor}
        onSubmit={(slot) => {
          if (battle.editorIndex === null) return
          battle.upsertEnemySlot(battle.editorIndex, slot)
        }}
      />
      <BattlePokemonEditorModal
        key={
          allyEditorIndex !== null
            ? `ally-${allyEditorIndex}-${editingAllySlot?.slotId ?? 'new'}`
            : 'ally-closed'
        }
        open={allyEditorIndex !== null}
        title={t('battle.allyEditorTitle')}
        existingSlot={editingAllySlot}
        levelCap={levelCap}
        allowSpeciesEdit={false}
        onClose={() => setAllyEditorIndex(null)}
        onSubmit={(slot) => {
          if (!editingAllySlot) return
          onAllySlotPatch(editingAllySlot.slotId, {
            level: slot.level,
            nature: slot.nature,
            ability: slot.ability,
            item: slot.item,
            moves: slot.moves,
            ivs: slot.ivs,
            evs: slot.evs,
          })
          setAllyEditorIndex(null)
        }}
      />
      <EnemyTeamImportDialog
        open={importOpen}
        levelCap={levelCap}
        hasExistingEnemyTeam={battle.enemySlots.some((slot) => slot !== null)}
        onClose={() => setImportOpen(false)}
        onImport={battle.importEnemyTeam}
      />
      <BattlePcSwitchDialog
        open={pcSwitchSlotId !== null}
        incoming={pcSwitchIncoming}
        teamSlots={leftSlots}
        onClose={() => setPcSwitchSlotId(null)}
        onPickSlot={(teamIndex) => {
          if (!pcSwitchSlotId) return
          onSwapPcWithTeamSlot(pcSwitchSlotId, teamIndex)
          setPcSwitchSlotId(null)
        }}
      />
    </div>
  )
}
