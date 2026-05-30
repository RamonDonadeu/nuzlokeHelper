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
  activeLeftIndices: Array<number | null>
  activeRightIndices: Array<number | null>
  faintedLeftIndices: Set<number>
  faintedRightIndices: Set<number>
  selectedLeftActiveSlot: number
  selectedRightActiveSlot: number
  editorOpen: boolean
  editorIndex: number | null
  enemySlots: Array<PokemonSlot | null>
  activeLeft: PokemonSlot | null
  activeRight: PokemonSlot | null
  activeLeftSlots: Array<PokemonSlot | null>
  activeRightSlots: Array<PokemonSlot | null>
  leftHasAlivePokemon: boolean
  rightHasAlivePokemon: boolean
  setDoubleBattle: (value: boolean) => void
  setSelectedLeftActiveSlot: (slot: number) => void
  setSelectedRightActiveSlot: (slot: number) => void
  setActiveTab: (tab: ActiveBattleTab) => void
  startFight: () => void
  finishBattle: () => void
  restartBattle: () => void
  clearBattle: () => void
  selectLeft: (index: number) => void
  selectRight: (index: number) => void
  switchLeftSlot: (slot: number, index: number) => void
  switchRightSlot: (slot: number, index: number) => void
  faintLeftSlot: (slot: number) => void
  faintRightSlot: (slot: number) => void
  openEnemyEditor: (index: number) => void
  closeEnemyEditor: () => void
  upsertEnemySlot: (index: number, slot: PokemonSlot) => void
  importEnemyTeam: (slots: PokemonSlot[], mode: 'replace' | 'append') => void
}

const ENEMY_TEAM_SIZE = 6

function toEnemySlots(enemyTeam: PokemonSlot[]): Array<PokemonSlot | null> {
  return Array.from({ length: ENEMY_TEAM_SIZE }, (_, index) => enemyTeam[index] ?? null)
}

function compactEnemyTeam(slots: Array<PokemonSlot | null>): PokemonSlot[] {
  return slots.filter((slot): slot is PokemonSlot => slot !== null)
}

function createInitialActiveIndices(): Array<number | null> {
  return [null, null]
}

function pickFirstAvailable(
  slots: Array<PokemonSlot | null> | PokemonSlot[],
  fainted: Set<number> = new Set(),
): number | null {
  const index = slots.findIndex(
    (slot, candidateIndex) => slot !== null && !fainted.has(candidateIndex),
  )
  return index >= 0 ? index : null
}

function pickNextAvailable(
  slots: Array<PokemonSlot | null> | PokemonSlot[],
  taken: Array<number | null>,
  fainted: Set<number> = new Set(),
): number | null {
  const used = new Set(taken.filter((value): value is number => value !== null))
  const index = slots.findIndex(
    (slot, candidateIndex) =>
      slot !== null && !used.has(candidateIndex) && !fainted.has(candidateIndex),
  )
  return index >= 0 ? index : null
}

function findNextAliveIndex(
  slots: Array<PokemonSlot | null> | PokemonSlot[],
  fainted: Set<number>,
  fromIndex: number,
  exclude: Array<number | null> = [],
): number | null {
  const excluded = new Set([
    ...fainted,
    ...exclude.filter((value): value is number => value !== null),
  ])
  const length = slots.length
  for (let offset = 1; offset <= length; offset += 1) {
    const candidate = (fromIndex + offset) % length
    if (slots[candidate] !== null && slots[candidate] !== undefined && !excluded.has(candidate)) {
      return candidate
    }
  }
  return null
}

function sideHasAlivePokemon(
  slots: Array<PokemonSlot | null> | PokemonSlot[],
  fainted: Set<number>,
): boolean {
  return slots.some(
    (slot, index) => slot !== null && slot !== undefined && !fainted.has(index),
  )
}

function replaceSlotKeepingUnique(
  current: Array<number | null>,
  slot: number,
  nextIndex: number,
): Array<number | null> {
  const next = [...current]
  const duplicateSlot = next.findIndex((value, idx) => idx !== slot && value === nextIndex)
  if (duplicateSlot >= 0) {
    next[duplicateSlot] = next[slot]
  }
  next[slot] = nextIndex
  return next
}

export function useBattleState({
  team,
  enemyTeam,
  onEnemyTeamChange,
  confirmClear,
}: UseBattleStateArgs): UseBattleStateResult {
  const [started, setStarted] = useState(false)
  const [doubleBattle, setDoubleBattleState] = useState(false)
  const [activeTab, setActiveTab] = useState<ActiveBattleTab>('stats')
  const [activeLeftIndices, setActiveLeftIndices] = useState<Array<number | null>>(
    createInitialActiveIndices,
  )
  const [activeRightIndices, setActiveRightIndices] = useState<Array<number | null>>(
    createInitialActiveIndices,
  )
  const [selectedLeftActiveSlot, setSelectedLeftActiveSlot] = useState(0)
  const [selectedRightActiveSlot, setSelectedRightActiveSlot] = useState(0)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorIndex, setEditorIndex] = useState<number | null>(null)
  const [faintedLeftIndices, setFaintedLeftIndices] = useState<Set<number>>(() => new Set())
  const [faintedRightIndices, setFaintedRightIndices] = useState<Set<number>>(() => new Set())

  const enemySlots = useMemo(() => toEnemySlots(enemyTeam), [enemyTeam])
  const activeLeftSlots = useMemo(
    () =>
      activeLeftIndices.map((index) => (index === null ? null : team[index] ?? null)).slice(
        0,
        doubleBattle ? 2 : 1,
      ),
    [activeLeftIndices, doubleBattle, team],
  )
  const activeRightSlots = useMemo(
    () =>
      activeRightIndices
        .map((index) => (index === null ? null : enemySlots[index] ?? null))
        .slice(0, doubleBattle ? 2 : 1),
    [activeRightIndices, doubleBattle, enemySlots],
  )
  const activeLeft = activeLeftSlots[0] ?? null
  const activeRight = activeRightSlots[0] ?? null
  const leftHasAlivePokemon = useMemo(
    () => sideHasAlivePokemon(team, faintedLeftIndices),
    [team, faintedLeftIndices],
  )
  const rightHasAlivePokemon = useMemo(
    () => sideHasAlivePokemon(enemySlots, faintedRightIndices),
    [enemySlots, faintedRightIndices],
  )

  const resetBattlefield = () => {
    setActiveLeftIndices(createInitialActiveIndices())
    setActiveRightIndices(createInitialActiveIndices())
    setFaintedLeftIndices(new Set())
    setFaintedRightIndices(new Set())
    setSelectedLeftActiveSlot(0)
    setSelectedRightActiveSlot(0)
  }

  const startFight = () => {
    const emptyFainted = new Set<number>()
    setFaintedLeftIndices(emptyFainted)
    setFaintedRightIndices(new Set())
    const leftFirst = pickFirstAvailable(team, emptyFainted)
    const rightFirst = pickFirstAvailable(enemySlots, emptyFainted)
    const leftSecond = doubleBattle ? pickNextAvailable(team, [leftFirst], emptyFainted) : null
    const rightSecond = doubleBattle ? pickNextAvailable(enemySlots, [rightFirst], emptyFainted) : null
    setActiveLeftIndices([leftFirst, leftSecond])
    setActiveRightIndices([rightFirst, rightSecond])
    setSelectedLeftActiveSlot(0)
    setSelectedRightActiveSlot(0)
    setStarted(true)
  }

  const finishBattle = () => {
    setStarted(false)
    resetBattlefield()
  }

  const restartBattle = () => {
    startFight()
  }

  const setDoubleBattle = (value: boolean) => {
    setDoubleBattleState(value)
    setSelectedLeftActiveSlot(0)
    setSelectedRightActiveSlot(0)

    setActiveLeftIndices((previous) => {
      if (!value) return [previous[0] ?? null, null]
      const first = previous[0] ?? pickFirstAvailable(team, faintedLeftIndices)
      const second = previous[1] ?? pickNextAvailable(team, [first], faintedLeftIndices)
      return [first, second]
    })

    setActiveRightIndices((previous) => {
      if (!value) return [previous[0] ?? null, null]
      const first = previous[0] ?? pickFirstAvailable(enemySlots, faintedRightIndices)
      const second = previous[1] ?? pickNextAvailable(enemySlots, [first], faintedRightIndices)
      return [first, second]
    })
  }

  const selectLeft = (index: number) => {
    if (!team[index] || faintedLeftIndices.has(index)) return
    setActiveLeftIndices((previous) =>
      replaceSlotKeepingUnique(previous, selectedLeftActiveSlot, index),
    )
  }

  const selectRight = (index: number) => {
    if (!enemySlots[index] || faintedRightIndices.has(index)) return
    setActiveRightIndices((previous) =>
      replaceSlotKeepingUnique(previous, selectedRightActiveSlot, index),
    )
  }

  const switchLeftSlot = (slot: number, index: number) => {
    if (!team[index] || faintedLeftIndices.has(index) || slot < 0 || slot > 1) return
    setActiveLeftIndices((previous) => replaceSlotKeepingUnique(previous, slot, index))
    setSelectedLeftActiveSlot(slot)
  }

  const switchRightSlot = (slot: number, index: number) => {
    if (!enemySlots[index] || faintedRightIndices.has(index) || slot < 0 || slot > 1) return
    setActiveRightIndices((previous) => replaceSlotKeepingUnique(previous, slot, index))
    setSelectedRightActiveSlot(slot)
  }

  const faintLeftSlot = (slot: number) => {
    if (slot < 0 || slot > 1) return
    const currentIndex = activeLeftIndices[slot]
    if (currentIndex === null) return

    const nextFainted = new Set(faintedLeftIndices)
    nextFainted.add(currentIndex)
    setFaintedLeftIndices(nextFainted)

    const otherActive = activeLeftIndices.filter((value, idx) => idx !== slot && value !== null)
    const nextAlive = findNextAliveIndex(team, nextFainted, currentIndex, otherActive)
    setActiveLeftIndices((previous) => {
      const next = [...previous]
      next[slot] = nextAlive
      return next
    })
  }

  const faintRightSlot = (slot: number) => {
    if (slot < 0 || slot > 1) return
    const currentIndex = activeRightIndices[slot]
    if (currentIndex === null) return

    const nextFainted = new Set(faintedRightIndices)
    nextFainted.add(currentIndex)
    setFaintedRightIndices(nextFainted)

    const otherActive = activeRightIndices.filter((value, idx) => idx !== slot && value !== null)
    const nextAlive = findNextAliveIndex(enemySlots, nextFainted, currentIndex, otherActive)
    setActiveRightIndices((previous) => {
      const next = [...previous]
      next[slot] = nextAlive
      return next
    })
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

  const importEnemyTeam = (slots: PokemonSlot[], mode: 'replace' | 'append') => {
    const imported = slots.slice(0, ENEMY_TEAM_SIZE)
    if (mode === 'replace') {
      onEnemyTeamChange(imported)
      return
    }

    const nextSlots = [...enemySlots]
    let insertAt = 0
    for (const slot of imported) {
      while (insertAt < ENEMY_TEAM_SIZE && nextSlots[insertAt] !== null) insertAt += 1
      if (insertAt >= ENEMY_TEAM_SIZE) break
      nextSlots[insertAt] = slot
      insertAt += 1
    }
    onEnemyTeamChange(compactEnemyTeam(nextSlots))
  }

  const clearBattle = () => {
    if (!confirmClear()) return
    setStarted(false)
    resetBattlefield()
    onEnemyTeamChange([])
  }

  return {
    started,
    doubleBattle,
    activeTab,
    activeLeftIndices,
    activeRightIndices,
    faintedLeftIndices,
    faintedRightIndices,
    selectedLeftActiveSlot,
    selectedRightActiveSlot,
    editorOpen,
    editorIndex,
    enemySlots,
    activeLeft,
    activeRight,
    activeLeftSlots,
    activeRightSlots,
    leftHasAlivePokemon,
    rightHasAlivePokemon,
    setDoubleBattle,
    setSelectedLeftActiveSlot,
    setSelectedRightActiveSlot,
    setActiveTab,
    startFight,
    finishBattle,
    restartBattle,
    clearBattle,
    selectLeft,
    selectRight,
    switchLeftSlot,
    switchRightSlot,
    faintLeftSlot,
    faintRightSlot,
    openEnemyEditor,
    closeEnemyEditor,
    upsertEnemySlot,
    importEnemyTeam,
  }
}
