import type { ReactNode } from 'react'
import type { PokemonStats } from '@/types/pokemon'
import { STAT_KEYS, STAT_LABELS } from '@/types/pokemon'
import type { PokemonSlot } from '@/types/profile'

export interface StatsCompareRow {
  id: string
  sprite: string
  ariaLabel: string
  rowClass: string
  stats: PokemonStats
  total: number
  level?: number
  sideLabel?: string
  /** Search compare: candidate vs team member */
  kind?: 'candidate' | 'member'
  member?: PokemonSlot
  /** PC compare: box vs team */
  source?: 'pc' | 'team'
}

export type StatsCompareSortKey = keyof PokemonStats | 'name' | 'level' | 'total'

export interface StatsCompareSortState {
  sortKey: StatsCompareSortKey
  onSort: (key: StatsCompareSortKey) => void
  sortIndicator: (key: StatsCompareSortKey) => string
}

export interface StatsComparisonTableLabels {
  pokemon: string
  total: string
  level?: string
  side?: string
}

export interface StatsComparisonTableProps {
  rows: StatsCompareRow[]
  labels: StatsComparisonTableLabels
  emptyMessage?: string
  tableClassName?: string
  statLabels?: Record<keyof PokemonStats, string>
  showLevelColumn?: boolean
  showSideColumn?: boolean
  sort?: StatsCompareSortState
  mobileCorner?: ReactNode
  renderPokemonCell: (row: StatsCompareRow) => ReactNode
  renderStatCell: (row: StatsCompareRow, statKey: keyof PokemonStats) => ReactNode
  renderTotalCell: (row: StatsCompareRow) => ReactNode
  statCellClassName?: (row: StatsCompareRow, statKey: keyof PokemonStats) => string | undefined
  totalCellClassName?: (row: StatsCompareRow) => string | undefined
}

export function joinCellClasses(...classes: Array<string | undefined>): string | undefined {
  const merged = classes.filter(Boolean).join(' ')
  return merged || undefined
}

function statLabel(
  key: keyof PokemonStats,
  statLabels: Record<keyof PokemonStats, string> | undefined,
): string {
  return statLabels?.[key] ?? STAT_LABELS[key]
}

export function StatsComparisonTable({
  rows,
  labels,
  emptyMessage,
  tableClassName = '',
  statLabels,
  showLevelColumn = false,
  showSideColumn = false,
  sort,
  mobileCorner,
  renderPokemonCell,
  renderStatCell,
  renderTotalCell,
  statCellClassName,
  totalCellClassName,
}: StatsComparisonTableProps) {
  if (rows.length === 0) {
    return emptyMessage ? <p className="muted">{emptyMessage}</p> : null
  }

  const wrapClass = ['table-wrap', 'stats-compare-table', tableClassName].filter(Boolean).join(' ')
  const mobileStatRows: Array<{ key: StatsCompareSortKey | keyof PokemonStats; label: string }> = []

  if (showLevelColumn && labels.level) {
    mobileStatRows.push({ key: 'level', label: labels.level })
  }
  for (const key of STAT_KEYS) {
    mobileStatRows.push({ key, label: statLabel(key, statLabels) })
  }
  mobileStatRows.push({ key: 'total', label: labels.total })

  const renderSortableHeader = (label: string, sortKey: StatsCompareSortKey) => {
    if (!sort) return label
    return (
      <button type="button" className="battle-prep-sort-btn" onClick={() => sort.onSort(sortKey)}>
        {label}
        {sort.sortIndicator(sortKey)}
      </button>
    )
  }

  return (
    <>
      <div className={`${wrapClass} stat-comparison-table--desktop`}>
        <table>
          <thead>
            <tr>
              <th>{renderSortableHeader(labels.pokemon, 'name')}</th>
              {showSideColumn && labels.side && <th>{labels.side}</th>}
              {showLevelColumn && labels.level && (
                <th>{renderSortableHeader(labels.level, 'level')}</th>
              )}
              {STAT_KEYS.map((key) => (
                <th key={key}>{renderSortableHeader(statLabel(key, statLabels), key)}</th>
              ))}
              <th>{renderSortableHeader(labels.total, 'total')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className={row.rowClass || undefined}>
                <td>
                  <div className="table-pokemon">
                    <img src={row.sprite} alt="" loading="lazy" />
                    {renderPokemonCell(row)}
                  </div>
                </td>
                {showSideColumn && (
                  <td>
                    {row.sideLabel && (
                      <span className="tag battle-prep-roster-tag">{row.sideLabel}</span>
                    )}
                  </td>
                )}
                {showLevelColumn && <td>{row.level}</td>}
                {STAT_KEYS.map((key) => (
                  <td key={key} className={statCellClassName?.(row, key)}>
                    {renderStatCell(row, key)}
                  </td>
                ))}
                <td className={totalCellClassName?.(row)}>{renderTotalCell(row)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={`${wrapClass} stat-comparison-table--mobile`}>
        <table className="stats-compare-mobile">
          <thead>
            <tr>
              <th className="stats-compare-mobile-corner" scope="col">
                {mobileCorner ?? <span aria-hidden="true" />}
              </th>
              {rows.map((row) => (
                <th
                  key={row.id}
                  scope="col"
                  className={joinCellClasses('stats-compare-mobile-pokemon', row.rowClass)}
                >
                  <img src={row.sprite} alt={row.ariaLabel} loading="lazy" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mobileStatRows.map(({ key, label }) => (
              <tr key={key}>
                <th scope="row" className="stats-compare-mobile-stat-label">
                  {sort && (key === 'level' || key === 'total' || STAT_KEYS.includes(key as keyof PokemonStats)) ? (
                    <button
                      type="button"
                      className="battle-prep-sort-btn"
                      onClick={() => sort.onSort(key as StatsCompareSortKey)}
                    >
                      {label}
                      {sort.sortIndicator(key as StatsCompareSortKey)}
                    </button>
                  ) : (
                    label
                  )}
                </th>
                {rows.map((row) => {
                  if (key === 'level') {
                    return (
                      <td key={row.id} className={row.rowClass || undefined}>
                        {row.level}
                      </td>
                    )
                  }
                  if (key === 'total') {
                    return (
                      <td key={row.id} className={joinCellClasses(row.rowClass, totalCellClassName?.(row))}>
                        {renderTotalCell(row)}
                      </td>
                    )
                  }
                  const statKey = key as keyof PokemonStats
                  return (
                    <td
                      key={row.id}
                      className={joinCellClasses(row.rowClass, statCellClassName?.(row, statKey))}
                    >
                      {renderStatCell(row, statKey)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
