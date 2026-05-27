import { useI18n } from '@/i18n'
import { MoveDetailCard } from '@/features/search/components/MoveDetailCard'
import { useMoveEffectiveness } from '@/features/search/hooks/useMoveEffectiveness'
import { displayMoveName } from '@/lib/localizedNames'
import { formatMultiplier, multiplierTier } from '@/lib/typeChart'
import type { MoveDetails } from '@/lib/moveTypes'
import type { PokemonSlot } from '@/types/profile'

interface MoveSearchPanelProps {
  move: MoveDetails
  team: PokemonSlot[]
}

function statusKeyFromMultiplier(multiplier: number | null): string {
  if (multiplier === null) return 'Unknown'
  const tier = multiplierTier(multiplier)
  if (tier === 'x0') return 'Immune'
  if (tier === 'x4' || tier === 'x2') return 'Super'
  if (tier === 'x1') return 'Neutral'
  if (tier === 'x05' || tier === 'x025') return 'Resisted'
  return 'Unknown'
}

function classFromMultiplier(multiplier: number | null): string {
  if (multiplier === null) return 'coverage-defense-unknown'
  return `coverage-defense-${multiplierTier(multiplier)}`
}

export function MoveSearchPanel({ move, team }: MoveSearchPanelProps) {
  const { t, locale } = useI18n()
  const { rows, loading } = useMoveEffectiveness(team, move.type)
  const moveName = displayMoveName(move.name, locale)

  return (
    <section className="card move-search-panel">
      <div className="section-header">
        <h3>{t('search.moveInfoTitle')}</h3>
      </div>

      <MoveDetailCard move={move} displayName={moveName} />

      <div className="matchup-block">
        <h4>{t('search.moveTeamEffectiveness')}</h4>
        {team.length === 0 ? (
          <p className="muted">{t('matchup.emptyTeam')}</p>
        ) : loading ? (
          <p className="muted">{t('search.moveEffectivenessLoading')}</p>
        ) : (
          <ul className="matchup-list">
            {rows.map((row) => (
              <li key={row.slotId} className="move-team-row">
                <strong>{row.displayName}</strong>
                <span className={`coverage-threat-mult ${classFromMultiplier(row.multiplier)}`}>
                  {row.multiplier === null ? '?' : formatMultiplier(row.multiplier)}
                </span>
                <span className="muted">
                  {t(`search.moveEffectiveness${statusKeyFromMultiplier(row.multiplier)}`)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
