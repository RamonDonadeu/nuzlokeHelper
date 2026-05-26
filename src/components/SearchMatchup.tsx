import { useI18n } from '@/i18n'
import {
  candidateDisplayName,
  formatMultiplier,
  formatThreatTypes,
  teamHasAnyMoves,
  type MemberOffensiveCoverage,
  type MemberThreat,
} from '@/lib/searchMatchup'
import { displayMoveName } from '@/lib/localizedNames'
import type { PokemonSummary } from '@/types/pokemon'
import type { PokemonSlot } from '@/types/profile'

interface SearchMatchupProps {
  team: PokemonSlot[]
  candidate: PokemonSummary
  loading: boolean
  offenses: MemberOffensiveCoverage[]
  threats: MemberThreat[]
}

export function SearchMatchup({
  team,
  candidate,
  loading,
  offenses,
  threats,
}: SearchMatchupProps) {
  const { t, locale } = useI18n()
  const targetName = candidateDisplayName(candidate)
  const hasMoves = teamHasAnyMoves(team)

  return (
    <section className="card search-matchup" aria-busy={loading}>
      <div className="section-header">
        <h3>{t('matchup.title')}</h3>
      </div>

      {loading && <p className="muted">{t('matchup.loading')}</p>}

      {!loading && team.length === 0 && <p className="muted">{t('matchup.emptyTeam')}</p>}

      {!loading && team.length > 0 && (
        <>
          <div className="matchup-block">
            <h4>{t('matchup.effectiveMoves', { name: targetName })}</h4>
            {offenses.length > 0 ? (
              <ul className="matchup-list">
                {offenses.map((member) => (
                  <li key={member.slotId} className="matchup-member">
                    <strong>{member.displayName}</strong>
                    <ul className="matchup-move-list">
                      {member.effectiveMoves.map((move) => (
                        <li key={move.moveName} className="matchup-move-item">
                          <span className={`type-badge type-${move.moveType}`}>{move.moveType}</span>
                          <span>
                            {displayMoveName(move.moveName, locale)}{' '}
                            <span
                              className={`coverage-threat-mult coverage-defense-${move.multiplier >= 4 ? 'x4' : 'x2'}`}
                            >
                              {formatMultiplier(move.multiplier)}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            ) : hasMoves ? (
              <p className="muted">{t('matchup.noEffectiveMoves')}</p>
            ) : (
              <p className="muted">{t('matchup.noMovesOnTeam')}</p>
            )}
          </div>

          <div className="matchup-block">
            <h4>{t('matchup.threatened', { name: targetName })}</h4>
            {threats.length > 0 ? (
              <ul className="matchup-list matchup-threat-list">
                {threats.map((threat) => (
                  <li key={threat.slotId} className="matchup-threat-item">
                    <div className="matchup-threat-header">
                      <strong>{threat.displayName}</strong>
                      <span className="tag tag-warning">{t('matchup.threatWarning')}</span>
                    </div>
                    <p className="muted matchup-threat-detail">
                      {t('matchup.threatenedDetail', {
                        types: formatThreatTypes(threat.attackTypes),
                        mult: formatMultiplier(threat.multiplier),
                      })}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">{t('matchup.noThreats')}</p>
            )}
          </div>
        </>
      )}
    </section>
  )
}
