import { useMemo, useState } from 'react'
import type { PokemonSlot } from '@/types/profile'

type ActiveBattleTab = 'stats'

interface UseBattleStateArgs {
  team: PokemonSlot[]
  enemyTeam: PokemonSlot[]
  onEnemyTeamChange: (team: PokemonSlot[]) => void
  confirmClear: () => boolean
}

interface UseBattleStateResult {
  started: boolean
  doubleBattle: boolean
  activeTab: ActiveBattleTab
  activeLeftIndex: number | null
  activeRightIndex: number | null
  editorOpen: boolean
  editorIndex: number | null
  enemySlots: Array<PokemonSlot | null>
  activeLeft: PokemonSlot | null
  activeRight: PokemonSlot | null
  setDoubleBattle: (value: boolean) => void
  setActiveTab: (tab: ActiveBattleTab) => void
  startFight: () => void
  clearBattle: () => void
  selectLeft: (index: number) => void
  selectRight: (index: number) => void
  openEnemyEditor: (index: number) => void
  closeEnemyEditor: () => void
  upsertEnemySlot: (index: number, slot: PokemonSlot) => void
}

const ENEMY_TEAM_SIZE = 6

function toEnemySlots(enemyTeam: PokemonSlot[]): Array<PokemonSlot | null> {
  return Array.from({ length: ENEMY_TEAM_SIZE }, (_, index) => enemyTeam[index] ?? null)
}

function compactEnemyTeam(slots: Array<PokemonSlot | null>): PokemonSlot[] {
  return slots.filter((slot): slot is PokemonSlot => slot !== null)
}

export function useBattleState({
  team,
  enemyTeam,
  onEnemyTeamChange,
  confirmClear,
}: UseBattleStateArgs): UseBattleStateResult {
  const [started, setStarted] = useState(false)
  const [doubleBattle, setDoubleBattle] = useState(false)
  const [activeTab, setActiveTab] = useState<ActiveBattleTab>('stats')
  const [activeLeftIndex, setActiveLeftIndex] = useState<number | null>(null)
  const [activeRightIndex, setActiveRightIndex] = useState<number | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorIndex, setEditorIndex] = useState<number | null>(null)

  const enemySlots = useMemo(() => toEnemySlots(enemyTeam), [enemyTeam])
  const activeLeft = activeLeftIndex === null ? null : team[activeLeftIndex] ?? null
  const activeRight = activeRightIndex === null ? null : enemySlots[activeRightIndex] ?? null

  const startFight = () => {
    const firstLeft = team.length > 0 ? 0 : null
    const firstRight = enemySlots.findIndex((slot) => slot !== null)
    setActiveLeftIndex(firstLeft)
    setActiveRightIndex(firstRight >= 0 ? firstRight : null)
    setStarted(true)
  }

  const selectLeft = (index: number) => {
    if (!team[index]) return
    setActiveLeftIndex(index)
  }

  const selectRight = (index: number) => {
    if (!enemySlots[index]) return
    setActiveRightIndex(index)
  }

  const openEnemyEditor = (index: number) => {
    setEditorIndex(index)
    setEditorOpen(true)
  }

  const closeEnemyEditor = () => {
    setEditorOpen(false)
    setEditorIndex(null)
  }

  const upsertEnemySlot = (index: number, slot: PokemonSlot) => {
    if (index < 0 || index >= ENEMY_TEAM_SIZE) return
    const nextSlots = [...enemySlots]
    nextSlots[index] = slot
    onEnemyTeamChange(compactEnemyTeam(nextSlots))
    closeEnemyEditor()
  }

  const clearBattle = () => {
    if (!confirmClear()) return
    setStarted(false)
    setActiveLeftIndex(null)
    setActiveRightIndex(null)
    onEnemyTeamChange([])
  }

  return {
    started,
    doubleBattle,
    activeTab,
    activeLeftIndex,
    activeRightIndex,
    editorOpen,
    editorIndex,
    enemySlots,
    activeLeft,
    activeRight,
    setDoubleBattle,
    setActiveTab,
    startFight,
    clearBattle,
    selectLeft,
    selectRight,
    openEnemyEditor,
    closeEnemyEditor,
    upsertEnemySlot,
  }
}
