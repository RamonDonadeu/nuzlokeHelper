import { useEffect, useMemo, useState } from 'react'
import { InfoTooltip } from '@/components/InfoTooltip'
import { useI18n } from '@/i18n'
import { resolveTeamSpeciesTypes } from '@/lib/pokeapi'
import { normalizePokemonTypes } from '@/lib/pokemonTypes'
import {
  defenseTierClass,
  formatMultiplier,
  getDefensiveCoverage,
  getUncoveredAttackTypes,
  getPerMemberDoubleWeaknesses,
  getPerMemberImmunities,
} from '@/lib/typeChart'
import type { PokemonSlot } from '@/types/profile'
import type { PokemonType } from '@/types/pokemon'

interface TypeAnalysisProps {
  team: PokemonSlot[]
}

function multiplierCellLabel(multiplier: number | null): string {
  if (multiplier === null) return '?'
  return multiplier === 0 ? '—' : formatMultiplier(multiplier)
}

export function TypeAnalysis({ team }: TypeAnalysisProps) {
  const { t } = useI18n()
  const [memberSpeciesTypes, setMemberSpeciesTypes] = useState<Map<string, PokemonType[]>>(new Map())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (team.length === 0) {
      setMemberSpeciesTypes(new Map())
      return
    }

    let cancelled = false
    setLoading(true)

    void resolveTeamSpeciesTypes(team).then((resolved) => {
      if (!cancelled) {
        setMemberSpeciesTypes(resolved)
        setLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [team])

  const defenseMembers = useMemo(
    () =>
      team.map((member) => {
        const resolved = memberSpeciesTypes.get(member.slotId)
        const defenderTypes =
          resolved && resolved.length > 0 ? resolved : normalizePokemonTypes(member.types)
        return {
          slotId: member.slotId,
          name: member.nickname ?? member.displayName,
          defenderTypes,
          typesMissing: defenderTypes.length === 0,
        }
      }),
    [team, memberSpeciesTypes],
  )

  const defensiveCoverage = useMemo(
    () => getDefensiveCoverage(defenseMembers.map((member) => member.defenderTypes)),
    [defenseMembers],
  )

  if (team.length === 0) {
    return (
      <section className="card">
        <h3>{t('types.title')}</h3>
        <p className="muted">{t('types.empty')}</p>
      </section>
    )
  }

  return (
    <section className="card type-analysis">
      <div className="section-header type-analysis-header">
        <h3>{t('types.title')}</h3>
      </div>

      {loading && <p className="muted loading-note">{t('types.loading')}</p>}

      {!loading && defenseMembers.some((member) => member.typesMissing) && (
        <p className="muted matrix-empty-hint">{t('types.defTypesMissingHint')}</p>
      )}

      <DefenseCoverageView t={t} members={defenseMembers} coverage={defensiveCoverage} />
    </section>
  )
}

function DefenseCoverageView({
  t,
  members,
  coverage,
}: {
  t: (key: string, vars?: Record<string, string | number>) => string
  members: Array<{ slotId: string; name: string; defenderTypes: PokemonType[]; typesMissing?: boolean }>
  coverage: ReturnType<typeof getDefensiveCoverage>
}) {
  const perMemberDoubleWeak = useMemo(
    () => getPerMemberDoubleWeaknesses(coverage.perMemberWeaknesses),
    [coverage.perMemberWeaknesses],
  )

  const perMemberImmunities = useMemo(
    () => getPerMemberImmunities(coverage.memberMatrix),
    [coverage.memberMatrix],
  )
  const uncoveredAttackTypes = useMemo(
    () => getUncoveredAttackTypes(coverage.memberMatrix),
    [coverage.memberMatrix],
  )

  const hasDoubleWeakness = perMemberDoubleWeak.some((entries) => entries.length > 0)
  const hasImmunities = perMemberImmunities.some((entries) => entries.length > 0)
  const hasUncoveredAttackTypes = uncoveredAttackTypes.length > 0

  return (
    <>
      <div className="defense-details">
        <section className="defense-summary-section defense-quad-warning">
          <h4>{t('types.defQuadTitle')}</h4>
          {!hasDoubleWeakness ? (
            <p className="empty-note">{t('types.defQuadEmpty')}</p>
          ) : (
            <ul className="defense-quad-list">
              {members.map((member, index) => {
                const quads = perMemberDoubleWeak[index]
                if (quads.length === 0) return null
                return (
                  <li key={member.slotId} className="defense-quad-item">
                    <span className="defense-quad-member">{member.name}</span>
                    <ul className="coverage-type-badges">
                      {quads.map((entry) => (
                        <li key={entry.attackType}>
                          <span className={`type-badge type-${entry.attackType}`}>
                            {entry.attackType}
                          </span>
                          <span className="coverage-threat-mult coverage-defense-x4">
                            {formatMultiplier(entry.multiplier)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="defense-summary-section">
          <h4>{t('types.defImmunitiesTitle')}</h4>
          <p className="muted defense-summary-hint">{t('types.defImmunitiesHint')}</p>
          {!hasImmunities ? (
            <p className="empty-note">{t('types.defImmunitiesEmpty')}</p>
          ) : (
            <ul className="defense-immunity-list">
              {members.map((member, index) => {
                const immunities = perMemberImmunities[index]
                if (immunities.length === 0) return null
                return (
                  <li key={member.slotId} className="defense-immunity-item">
                    <span className="defense-immunity-member">{member.name}</span>
                    <ul className="coverage-type-badges">
                      {immunities.map((entry) => (
                        <li key={entry.attackType}>
                          <span className={`type-badge type-${entry.attackType}`}>
                            {entry.attackType}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="defense-summary-section">
          <h4>{t('types.defUncoveredTitle')}</h4>
          {!hasUncoveredAttackTypes ? (
            <p className="empty-note">{t('types.defUncoveredEmpty')}</p>
          ) : (
            <ul className="coverage-type-badges">
              {uncoveredAttackTypes.map((attackType) => (
                <li key={attackType}>
                  <span className={`type-badge type-${attackType}`}>{attackType}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <CoverageMatrix
        title={t('types.defMemberMatrix')}
        hintLabel={t('types.defMatrixLegendLabel')}
        hintText={t('types.defMatrixLegend')}
        rowHeader={t('types.defMatrixAttackCol')}
        members={members}
        rows={coverage.memberMatrix.map((row) => ({
          type: row.attackType,
          memberMultipliers: row.memberMultipliers,
        }))}
        getMemberCell={(_member, rowType, multiplier) => {
          if (multiplier === null) {
            return {
              className: defenseTierClass(null),
              label: multiplierCellLabel(null),
              title: t('types.defMemberUnknown', { type: rowType }),
            }
          }
          const titleKey =
            multiplier >= 4
              ? 'types.defMember4x'
              : multiplier >= 2
                ? 'types.defMemberWeak'
                : multiplier === 0
                  ? 'types.defMemberImmune'
                  : multiplier === 0.25
                    ? 'types.defMemberStrongResist'
                    : multiplier <= 0.5
                      ? 'types.defMemberResist'
                      : 'types.defMemberSafe'
          return {
            className: defenseTierClass(multiplier),
            label: multiplierCellLabel(multiplier),
            title: t(titleKey, { type: rowType, mult: formatMultiplier(multiplier) }),
          }
        }}
      />
    </>
  )
}

function CoverageMatrix<M extends { slotId: string; name: string }>({
  title,
  hintLabel,
  hintText,
  rowHeader,
  members,
  rows,
  getMemberCell,
}: {
  title: string
  hintLabel: string
  hintText: string
  rowHeader: string
  members: M[]
  rows: Array<{ type: PokemonType; memberMultipliers: Array<number | null> }>
  getMemberCell: (
    member: M,
    rowType: PokemonType,
    multiplier: number | null,
  ) => { className: string; title: string; label: string }
}) {
  return (
    <div className="member-matrix">
      <div className="matrix-header">
        <h4>{title}</h4>
        <InfoTooltip label={hintLabel} text={hintText} />
      </div>
      <div className="table-wrap">
        <table className="matrix-table coverage-matrix">
          <thead>
            <tr>
              <th className="matrix-corner" scope="col">
                {rowHeader}
              </th>
              {members.map((member) => (
                <th key={member.slotId} className="matrix-member-col" scope="col">
                  <span className="matrix-member-name" title={member.name}>
                    {member.name}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.type}>
                <th scope="row" className="matrix-type-col">
                  <span className={`type-badge type-${row.type} matrix-type-label`}>{row.type}</span>
                </th>
                {members.map((member, index) => {
                  const multiplier = row.memberMultipliers[index]
                  const cell = getMemberCell(member, row.type, multiplier)
                  return (
                    <td key={member.slotId} className={cell.className} title={cell.title}>
                      <span className="matrix-mult-label">{cell.label}</span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
