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
        <ul className="battle-prep-roster-list">
          {members.map((member) => {
            const weaknesses = getDefensiveWeaknessGroups(member.types)
            const configuredMoves = (member.moves ?? []).map((move) => move.trim()).filter(Boolean)
            const hasWeaknesses = weaknesses.quadruple.length > 0 || weaknesses.double.length > 0
            const hasAbility = Boolean(member.ability?.trim())
            const hasItem = Boolean(member.item?.trim())
            const hasLoadout = hasAbility || hasItem

            return (
              <li key={member.slotId} className="battle-prep-roster-row">
                <section
                  className={[
                    'battle-prep-roster-info',
                    !hasLoadout ? 'battle-prep-roster-info--solo' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <div className="battle-prep-roster-pokemon">
                    <div className="battle-prep-roster-pokemon-head">
                      <img src={member.sprite} alt="" loading="lazy" className="battle-prep-row-sprite" />
                      <strong>{member.nickname ?? member.displayName}</strong>
                    </div>
                    <div className="battle-prep-roster-field">
                      <span className="battle-prep-roster-field-label">{t('battle.prepTypesColumn')}</span>
                      <ul className="battle-prep-type-list">
                        {member.types.map((type) => (
                          <li key={type}>
                            <TypeBadge type={type} />
                          </li>
                        ))}
                      </ul>
                    </div>
                    {hasWeaknesses ? (
                      <div className="battle-prep-roster-field">
                        <span className="battle-prep-roster-field-label">{t('battle.prepWeakToColumn')}</span>
                        <WeaknessTypes quadruple={weaknesses.quadruple} double={weaknesses.double} />
                      </div>
                    ) : null}
                  </div>
                  {hasLoadout ? (
                    <div className="battle-prep-roster-loadout">
                      {hasAbility ? (
                        <div className="battle-prep-roster-field">
                          <span className="battle-prep-roster-field-label">{t('battle.prepAbilityColumn')}</span>
                          <BattlePrepAbilityCell slot={member} abilityDescriptions={abilityDescriptions} />
                        </div>
                      ) : null}
                      {hasItem ? (
                        <div className="battle-prep-roster-field">
                          <span className="battle-prep-roster-field-label">{t('battle.prepItemColumn')}</span>
                          <BattlePrepItemCell slot={member} />
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </section>
                <section className="battle-prep-roster-attacks">
                  {configuredMoves.length > 0 ? (
                    <ul className="battle-prep-roster-attack-list">
                      {configuredMoves.map((moveName) => {
                        const moveType = moveDetailsByName[moveName]?.type ?? null

                        return (
                          <li key={moveName} className="battle-prep-roster-attack">
                            {moveType ? (
                              <TypeBadge type={moveType} />
                            ) : (
                              <span className="type-badge type-unknown">?</span>
                            )}
                            <BattlePrepMoveLabel
                              moveName={moveName}
                              details={moveDetailsByName[moveName]}
                              loading={moveDetailsLoading}
                            />
                          </li>
                        )
                      })}
                    </ul>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </section>
              </li>
            )
          })}
        </ul>
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
