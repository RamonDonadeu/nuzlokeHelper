import { BattlePrepMoveLabel } from '@/features/battle/components/BattlePrepMoveLabel'
import { BattlePrepAbilityCell, BattlePrepItemCell } from '@/features/battle/components/BattlePrepSlotMeta'
import { useI18n } from '@/i18n'
import type { AbilityDescriptionDisplay } from '@/features/team/hooks/useAbilityDescriptions'
import { getDefensiveWeaknessGroups } from '@/lib/typeChart'
import type { MoveDetails } from '@/lib/moveTypes'
import type { PokemonType } from '@/types/pokemon'
import type { PokemonSlot } from '@/types/profile'

function TypeBadge({ type }: { type: PokemonType }) {
  return <span className={`type-badge type-${type}`}>{type}</span>
}

function WeaknessTypes({ quadruple, double }: { quadruple: PokemonType[]; double: PokemonType[] }) {
  const { t } = useI18n()

  if (quadruple.length === 0 && double.length === 0) {
    return <span className="muted">—</span>
  }

  return (
    <div className="battle-prep-weakness-groups">
      {quadruple.length > 0 ? (
        <div className="battle-prep-weakness-group">
          <span className="battle-prep-weakness-label">{t('battle.prepWeak4x')}</span>
          <ul className="battle-prep-type-list">
            {quadruple.map((type) => (
              <li key={`4-${type}`}>
                <TypeBadge type={type} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {double.length > 0 ? (
        <div className="battle-prep-weakness-group">
          <span className="battle-prep-weakness-label">{t('battle.prepWeak2x')}</span>
          <ul className="battle-prep-type-list">
            {double.map((type) => (
              <li key={`2-${type}`}>
                <TypeBadge type={type} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

interface BattlePrepRosterDetailsProps {
  members: PokemonSlot[]
  abilityDescriptions: Record<string, AbilityDescriptionDisplay>
  moveDetailsByName: Record<string, MoveDetails | null>
  moveDetailsLoading: boolean
  typesTitle: string
  typesHint: string
  missingMovesNames: string[]
  unconfiguredNames: string[]
  offenseTitle: string
  offenseHint: string
  offenseSummary: Array<{ attackType: PokemonType; count: number }>
  offenseEmpty: string
}

export function BattlePrepRosterDetails({
  members,
  abilityDescriptions,
  moveDetailsByName,
  moveDetailsLoading,
  typesTitle,
  typesHint,
  missingMovesNames,
  unconfiguredNames,
  offenseTitle,
  offenseHint,
  offenseSummary,
  offenseEmpty,
}: BattlePrepRosterDetailsProps) {
  const { t } = useI18n()

  return (
    <>
      <section className="battle-prep-section">
        <h4 className="battle-prep-section-title">{typesTitle}</h4>
        <p className="muted battle-prep-section-hint">{typesHint}</p>
        {missingMovesNames.length > 0 ? (
          <p className="muted battle-prep-note battle-prep-warning">
            {t('battle.prepRosterNoMoves', { names: missingMovesNames.join(', ') })}
          </p>
        ) : null}
        {unconfiguredNames.length > 0 ? (
          <p className="muted battle-prep-note battle-prep-warning">
            {t('battle.prepRosterConfigureMoves', { names: unconfiguredNames.join(', ') })}
          </p>
        ) : null}
        <div className="battle-prep-table-wrap">
          <table className="battle-prep-enemy-table">
            <thead>
              <tr>
                <th>{t('battle.prepStatsPokemon')}</th>
                <th>{t('battle.prepTypesColumn')}</th>
                <th>{t('battle.prepWeakToColumn')}</th>
                <th>{t('battle.prepAbilityColumn')}</th>
                <th>{t('battle.prepItemColumn')}</th>
                <th>{t('battle.prepMovesColumn')}</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const weaknesses = getDefensiveWeaknessGroups(member.types)
                const configuredMoves = (member.moves ?? []).map((move) => move.trim()).filter(Boolean)

                return (
                  <tr key={member.slotId}>
                    <td className="battle-prep-enemy-name">
                      <div className="battle-prep-enemy-name-inner">
                        <img src={member.sprite} alt="" loading="lazy" />
                        <span>{member.nickname ?? member.displayName}</span>
                      </div>
                    </td>
                    <td>
                      <ul className="battle-prep-type-list">
                        {member.types.map((type) => (
                          <li key={type}>
                            <TypeBadge type={type} />
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td>
                      <WeaknessTypes quadruple={weaknesses.quadruple} double={weaknesses.double} />
                    </td>
                    <td className="battle-prep-enemy-meta-cell">
                      <div className="battle-prep-enemy-cell-inner">
                        <BattlePrepAbilityCell slot={member} abilityDescriptions={abilityDescriptions} />
                      </div>
                    </td>
                    <td className="battle-prep-enemy-meta-cell">
                      <div className="battle-prep-enemy-cell-inner">
                        <BattlePrepItemCell slot={member} />
                      </div>
                    </td>
                    <td className="battle-prep-enemy-moves">
                      {configuredMoves.length > 0 ? (
                        <ul className="battle-prep-enemy-move-list">
                          {configuredMoves.map((moveName) => (
                            <li key={moveName}>
                              <BattlePrepMoveLabel
                                moveName={moveName}
                                details={moveDetailsByName[moveName]}
                                loading={moveDetailsLoading}
                              />
                            </li>
                          ))}
                        </ul>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="battle-prep-section">
        <h4 className="battle-prep-section-title">{offenseTitle}</h4>
        <p className="muted battle-prep-section-hint">{offenseHint}</p>
        {offenseSummary.length > 0 ? (
          <ul className="battle-prep-offense-chips">
            {offenseSummary.map(({ attackType, count }) => (
              <li key={attackType}>
                <TypeBadge type={attackType} />
                <span className="battle-prep-offense-count">×{count}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">{offenseEmpty}</p>
        )}
      </section>
    </>
  )
}
