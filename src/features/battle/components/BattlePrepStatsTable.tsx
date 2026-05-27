import { useMemo, useState } from 'react'
import { useI18n } from '@/i18n'
import { calculateAllStats, comparisonNatureForMember } from '@/lib/stats'
import type { PokemonStats } from '@/types/pokemon'
import { STAT_KEYS, totalStats } from '@/types/pokemon'
import { clampPokemonLevel, type PokemonSlot } from '@/types/profile'

const STAT_DEFAULTS = { ivWhenUnset: 0, evWhenUnset: 0 } as const
const ROSTER_SIZE = 6

type SortKey = keyof PokemonStats | 'name' | 'level' | 'total'
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
): PrepStatsRow[] {
  const rows: PrepStatsRow[] = []
  for (let index = 0; index < ROSTER_SIZE; index++) {
    const slot = team[index]
    if (slot) {
      const source = 'team'
      rows.push({ slot, source, level: levelForStats(slot, source, levelCap), stats: statsForSlot(slot, source, levelCap) })
    }
  }
  for (let index = 0; index < ROSTER_SIZE; index++) {
    const slot = pc[index]
    if (slot) {
      const source = 'pc'
      rows.push({ slot, source, level: levelForStats(slot, source, levelCap), stats: statsForSlot(slot, source, levelCap) })
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

function compareRows(a: PrepStatsRow, b: PrepStatsRow, sortKey: SortKey, sortDir: SortDir): number {
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
}

export function BattlePrepStatsTable({ team, pc, enemySlots, levelCap }: BattlePrepStatsTableProps) {
  const { t } = useI18n()
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const rows = useMemo(() => {
    const built = buildPrepStatsRows(team, pc, enemySlots, levelCap)
    return [...built].sort((a, b) => compareRows(a, b, sortKey, sortDir))
  }, [enemySlots, levelCap, pc, sortDir, sortKey, team])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(key)
    setSortDir(key === 'name' ? 'asc' : 'desc')
  }

  const sortIndicator = (key: SortKey) => {
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

  return (
    <>
      {rows.length === 0 ? (
        <p className="muted">{t('battle.prepStatsEmpty')}</p>
      ) : (
        <div className="table-wrap battle-prep-stats-table">
          <table>
            <thead>
              <tr>
                <th>
                  <button type="button" className="battle-prep-sort-btn" onClick={() => handleSort('name')}>
                    {t('battle.prepStatsPokemon')}
                    {sortIndicator('name')}
                  </button>
                </th>
                <th>{t('battle.prepStatsSide')}</th>
                <th>
                  <button type="button" className="battle-prep-sort-btn" onClick={() => handleSort('level')}>
                    {t('battle.prepStatsLevel')}
                    {sortIndicator('level')}
                  </button>
                </th>
                {STAT_KEYS.map((key) => (
                  <th key={key}>
                    <button type="button" className="battle-prep-sort-btn" onClick={() => handleSort(key)}>
                      {t(statLabelKeys[key])}
                      {sortIndicator(key)}
                    </button>
                  </th>
                ))}
                <th>
                  <button type="button" className="battle-prep-sort-btn" onClick={() => handleSort('total')}>
                    {t('battle.statsTotal')}
                    {sortIndicator('total')}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.slot.slotId} className={ROW_CLASS_BY_SOURCE[row.source]}>
                  <td>
                    <div className="table-pokemon">
                      <img src={row.slot.sprite} alt="" loading="lazy" />
                      <span>{row.slot.nickname ?? row.slot.displayName}</span>
                    </div>
                  </td>
                  <td>
                    <span className="tag battle-prep-roster-tag">{t(SIDE_LABEL_KEYS[row.source])}</span>
                  </td>
                  <td>{row.level}</td>
                  {STAT_KEYS.map((key) => (
                    <td key={key}>{row.stats[key]}</td>
                  ))}
                  <td>{totalStats(row.stats)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
