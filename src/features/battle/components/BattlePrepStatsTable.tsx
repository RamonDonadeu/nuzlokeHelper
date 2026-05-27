import { useMemo, useState } from 'react'
import { useI18n } from '@/i18n'
import { calculateAllStats, comparisonNatureForMember } from '@/lib/stats'
import type { PokemonStats } from '@/types/pokemon'
import { STAT_KEYS } from '@/types/pokemon'
import type { PokemonSlot } from '@/types/profile'

const STAT_DEFAULTS = { ivWhenUnset: 0, evWhenUnset: 0 } as const
const ROSTER_SIZE = 6

type SortKey = keyof PokemonStats | 'name'
type SortDir = 'asc' | 'desc'

interface PrepStatsRow {
  slot: PokemonSlot
  source: 'team' | 'pc'
  stats: PokemonStats
}

function statsForSlot(slot: PokemonSlot): PokemonStats {
  return calculateAllStats(
    slot.baseStats,
    slot.level,
    slot.ivs,
    slot.evs,
    comparisonNatureForMember(slot),
    STAT_DEFAULTS,
  )
}

function buildPrepStatsRows(team: PokemonSlot[], pc: PokemonSlot[]): PrepStatsRow[] {
  const rows: PrepStatsRow[] = []
  for (let index = 0; index < ROSTER_SIZE; index++) {
    const slot = team[index]
    if (slot) rows.push({ slot, source: 'team', stats: statsForSlot(slot) })
  }
  for (let index = 0; index < ROSTER_SIZE; index++) {
    const slot = pc[index]
    if (slot) rows.push({ slot, source: 'pc', stats: statsForSlot(slot) })
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
  return (a.stats[sortKey] - b.stats[sortKey]) * mult
}

interface BattlePrepStatsTableProps {
  team: PokemonSlot[]
  pc: PokemonSlot[]
  onBack: () => void
}

export function BattlePrepStatsTable({ team, pc, onBack }: BattlePrepStatsTableProps) {
  const { t } = useI18n()
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const rows = useMemo(() => {
    const built = buildPrepStatsRows(team, pc)
    return [...built].sort((a, b) => compareRows(a, b, sortKey, sortDir))
  }, [pc, sortDir, sortKey, team])

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
      <div className="battle-prep-toolbar">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>
          ← {t('battle.prepBackToAttacks')}
        </button>
      </div>
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
                {STAT_KEYS.map((key) => (
                  <th key={key}>
                    <button type="button" className="battle-prep-sort-btn" onClick={() => handleSort(key)}>
                      {t(statLabelKeys[key])}
                      {sortIndicator(key)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.slot.slotId}>
                  <td>
                    <div className="table-pokemon">
                      <img src={row.slot.sprite} alt="" loading="lazy" />
                      <span>
                        {row.slot.nickname ?? row.slot.displayName}
                        <span className="tag battle-prep-roster-tag">
                          {row.source === 'team' ? t('battle.prepStatsTeam') : t('battle.prepStatsPC')}
                        </span>
                      </span>
                    </div>
                  </td>
                  {STAT_KEYS.map((key) => (
                    <td key={key}>{row.stats[key]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
