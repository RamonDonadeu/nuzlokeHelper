import { useMemo, useState } from 'react'
import { useI18n } from '@/i18n'
import { calculateAllStats, comparisonNatureForMember } from '@/lib/stats'
import type { PokemonStats } from '@/types/pokemon'
import { STAT_KEYS, totalStats } from '@/types/pokemon'
import { clampPokemonLevel, type PokemonSlot } from '@/types/profile'
import {
  StatsComparisonTable,
  type StatsCompareRow,
  type StatsCompareSortKey,
} from '@/shared/components/StatsComparisonTable'

const STAT_DEFAULTS = { ivWhenUnset: 0, evWhenUnset: 0 } as const
const ROSTER_SIZE = 6

type SortDir = 'asc' | 'desc'
type PrepStatsSource = 'team' | 'pc' | 'enemy'

interface PrepStatsRow {
  slot: PokemonSlot
  source: PrepStatsSource
  level: number
  stats: PokemonStats
}

function levelForStats(slot: PokemonSlot, source: PrepStatsSource, levelCap: number): number {
  if (source === 'enemy') {
    return clampPokemonLevel(slot.level, levelCap)
  }
  return clampPokemonLevel(slot.level ?? levelCap, levelCap)
}

function statsForSlot(slot: PokemonSlot, source: PrepStatsSource, levelCap: number): PokemonStats {
  const level = levelForStats(slot, source, levelCap)
  return calculateAllStats(
    slot.baseStats,
    level,
    slot.ivs,
    slot.evs,
    comparisonNatureForMember(slot),
    STAT_DEFAULTS,
  )
}

function buildPrepStatsRows(
  team: PokemonSlot[],
  pc: PokemonSlot[],
  enemySlots: Array<PokemonSlot | null>,
  levelCap: number,
  includePc: boolean,
): PrepStatsRow[] {
  const rows: PrepStatsRow[] = []
  for (let index = 0; index < ROSTER_SIZE; index++) {
    const slot = team[index]
    if (slot) {
      const source = 'team'
      rows.push({ slot, source, level: levelForStats(slot, source, levelCap), stats: statsForSlot(slot, source, levelCap) })
    }
  }
  if (includePc) {
    for (let index = 0; index < ROSTER_SIZE; index++) {
      const slot = pc[index]
      if (slot) {
        const source = 'pc'
        rows.push({ slot, source, level: levelForStats(slot, source, levelCap), stats: statsForSlot(slot, source, levelCap) })
      }
    }
  }
  for (let index = 0; index < ROSTER_SIZE; index++) {
    const slot = enemySlots[index]
    if (slot) {
      const source = 'enemy'
      rows.push({ slot, source, level: levelForStats(slot, source, levelCap), stats: statsForSlot(slot, source, levelCap) })
    }
  }
  return rows
}

function compareRows(a: PrepStatsRow, b: PrepStatsRow, sortKey: StatsCompareSortKey, sortDir: SortDir): number {
  const mult = sortDir === 'asc' ? 1 : -1
  if (sortKey === 'name') {
    const aName = (a.slot.nickname ?? a.slot.displayName).toLowerCase()
    const bName = (b.slot.nickname ?? b.slot.displayName).toLowerCase()
    return aName.localeCompare(bName) * mult
  }
  if (sortKey === 'level') {
    return (a.level - b.level) * mult
  }
  if (sortKey === 'total') {
    return (totalStats(a.stats) - totalStats(b.stats)) * mult
  }
  return (a.stats[sortKey] - b.stats[sortKey]) * mult
}

const ROW_CLASS_BY_SOURCE: Record<PrepStatsSource, string> = {
  team: 'battle-stats-row-team',
  pc: 'battle-stats-row-pc',
  enemy: 'battle-stats-row-enemy',
}

const SIDE_LABEL_KEYS: Record<PrepStatsSource, 'battle.prepStatsTeam' | 'battle.prepStatsPC' | 'battle.prepStatsEnemy'> = {
  team: 'battle.prepStatsTeam',
  pc: 'battle.prepStatsPC',
  enemy: 'battle.prepStatsEnemy',
}

interface BattlePrepStatsTableProps {
  team: PokemonSlot[]
  pc: PokemonSlot[]
  enemySlots: Array<PokemonSlot | null>
  levelCap: number
  includePc?: boolean
}

export function BattlePrepStatsTable({
  team,
  pc,
  enemySlots,
  levelCap,
  includePc = false,
}: BattlePrepStatsTableProps) {
  const { t } = useI18n()
  const [sortKey, setSortKey] = useState<StatsCompareSortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const prepRows = useMemo(() => {
    const built = buildPrepStatsRows(team, pc, enemySlots, levelCap, includePc)
    return [...built].sort((a, b) => compareRows(a, b, sortKey, sortDir))
  }, [enemySlots, includePc, levelCap, pc, sortDir, sortKey, team])

  const rows: StatsCompareRow[] = useMemo(
    () =>
      prepRows.map((row) => ({
        id: row.slot.slotId,
        sprite: row.slot.sprite,
        ariaLabel: row.slot.nickname ?? row.slot.displayName,
        rowClass: ROW_CLASS_BY_SOURCE[row.source],
        stats: row.stats,
        total: totalStats(row.stats),
        level: row.level,
        sideLabel: t(SIDE_LABEL_KEYS[row.source]),
      })),
    [prepRows, t],
  )

  const handleSort = (key: StatsCompareSortKey) => {
    if (sortKey === key) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(key)
    setSortDir(key === 'name' ? 'asc' : 'desc')
  }

  const sortIndicator = (key: StatsCompareSortKey) => {
    if (sortKey !== key) return ''
    return sortDir === 'asc' ? ' ↑' : ' ↓'
  }

  const statLabelKeys: Record<keyof PokemonStats, `battle.prepStat_${keyof PokemonStats}`> = {
    hp: 'battle.prepStat_hp',
    attack: 'battle.prepStat_attack',
    defense: 'battle.prepStat_defense',
    specialAttack: 'battle.prepStat_specialAttack',
    specialDefense: 'battle.prepStat_specialDefense',
    speed: 'battle.prepStat_speed',
  }

  const statLabels = Object.fromEntries(
    STAT_KEYS.map((key) => [key, t(statLabelKeys[key])]),
  ) as Record<keyof PokemonStats, string>

  return (
    <StatsComparisonTable
      rows={rows}
      emptyMessage={t('battle.prepStatsEmpty')}
      tableClassName="battle-prep-stats-table"
      labels={{
        pokemon: t('battle.prepStatsPokemon'),
        total: t('battle.statsTotal'),
        level: t('battle.prepStatsLevel'),
        side: t('battle.prepStatsSide'),
      }}
      statLabels={statLabels}
      showLevelColumn
      showSideColumn
      sort={{ sortKey, onSort: handleSort, sortIndicator }}
      mobileCorner={
        <button
          type="button"
          className="battle-prep-sort-btn stats-compare-sort-btn--corner"
          onClick={() => handleSort('name')}
          aria-label={t('battle.prepStatsPokemon')}
        >
          <span aria-hidden="true">{sortIndicator('name') || '↕'}</span>
        </button>
      }
      renderPokemonCell={(row) => <span>{row.ariaLabel}</span>}
      renderStatCell={(row, key) => row.stats[key]}
      renderTotalCell={(row) => row.total}
    />
  )
}
