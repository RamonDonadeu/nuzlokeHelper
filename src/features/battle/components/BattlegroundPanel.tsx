import { BattleDoubleBattleToggle } from '@/features/battle/components/BattleDoubleBattleToggle'
import { BattlegroundSlotDetail } from '@/features/battle/components/BattlegroundSlotDetail'
import { BattlegroundStats } from '@/features/battle/components/BattlegroundStats'
import type { PokemonSlot } from '@/types/profile'
import { useI18n } from '@/i18n'
import { Fragment, useMemo, useState } from 'react'

interface BattlegroundPanelProps {
  started: boolean
  activeLeft: Array<PokemonSlot | null>
  activeRight: Array<PokemonSlot | null>
  activeLeftIndices: Array<number | null>
  activeRightIndices: Array<number | null>
  faintedLeftIndices: Set<number>
  faintedRightIndices: Set<number>
  leftHasAlivePokemon: boolean
  rightHasAlivePokemon: boolean
  team: Array<PokemonSlot | null>
  enemyTeam: Array<PokemonSlot | null>
  doubleBattle: boolean
  onDoubleBattleChange: (value: boolean) => void
  onSelectLeftSlot: (slot: number) => void
  onSelectRightSlot: (slot: number) => void
  onSwitchLeft: (slot: number, index: number) => void
  onSwitchRight: (slot: number, index: number) => void
  onFaintLeft: (slot: number) => void
  onFaintRight: (slot: number) => void
  onStartFight: () => void
  onClear: () => void
}

function ActivePokemonCard({
  title,
  slot,
  canAct,
  noPokemonLeft,
  onSwitch,
  onFaint,
  onSelect,
}: {
  title: string
  slot: PokemonSlot | null
  canAct: boolean
  noPokemonLeft: boolean
  onSwitch: () => void
  onFaint: () => void
  onSelect: () => void
}) {
  const { t } = useI18n()

  return (
    <section className="battle-active-card" onClick={onSelect}>
      <p className="muted">{title}</p>
      {slot ? (
        <>
          <div className="battle-active-card-header">
            <img src={slot.sprite} alt={slot.displayName} loading="lazy" />
            <div>
              <h4>{slot.nickname ?? slot.displayName}</h4>
              <p className="muted">{t('team.level', { level: slot.level })}</p>
            </div>
          </div>
          <div className="type-row">
            {slot.types.map((type) => (
              <span key={`${slot.slotId}-${type}`} className={`type-badge type-${type}`}>
                {type}
              </span>
            ))}
          </div>
          {canAct ? (
            <div className="battle-active-actions">
              <button
                type="button"
                className="btn btn-sm battle-switch-btn"
                onClick={(event) => {
                  event.stopPropagation()
                  onSwitch()
                }}
              >
                {t('battle.switch')}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-danger battle-faint-btn"
                onClick={(event) => {
                  event.stopPropagation()
                  onFaint()
                }}
              >
                {t('battle.faint')}
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <p className="muted">{noPokemonLeft ? t('battle.noPokemonLeft') : t('battle.noActive')}</p>
      )}
    </section>
  )
}

interface SwitchPopupState {
  side: 'left' | 'right'
  slot: number
}

export function BattlegroundPanel({
  started,
  activeLeft,
  activeRight,
  activeLeftIndices,
  activeRightIndices,
  faintedLeftIndices,
  faintedRightIndices,
  leftHasAlivePokemon,
  rightHasAlivePokemon,
  team,
  enemyTeam,
  doubleBattle,
  onDoubleBattleChange,
  onSelectLeftSlot,
  onSelectRightSlot,
  onSwitchLeft,
  onSwitchRight,
  onFaintLeft,
  onFaintRight,
  onStartFight,
  onClear,
}: BattlegroundPanelProps) {
  const { t } = useI18n()
  const [switchPopup, setSwitchPopup] = useState<SwitchPopupState | null>(null)
  const activeSlots = doubleBattle ? 2 : 1
  const shownLeft = activeLeft.slice(0, activeSlots)
  const shownRight = activeRight.slice(0, activeSlots)
  const allyActives = shownLeft.filter((slot): slot is PokemonSlot => slot !== null)
  const enemyActives = shownRight.filter((slot): slot is PokemonSlot => slot !== null)
  const showCombinedStats = doubleBattle && activeSlots === 2
  const statParticipants = useMemo(
    () => [
      ...shownLeft.map((slot) => ({ slot, side: 'team' as const })),
      ...shownRight.map((slot) => ({ slot, side: 'enemy' as const })),
    ],
    [shownLeft, shownRight],
  )

  const replacements = useMemo(() => {
    if (!switchPopup) return []
    const sideIndices = switchPopup.side === 'left' ? activeLeftIndices : activeRightIndices
    const sideTeam = switchPopup.side === 'left' ? team : enemyTeam
    const fainted = switchPopup.side === 'left' ? faintedLeftIndices : faintedRightIndices
    const excluded = new Set(sideIndices.filter((index): index is number => index !== null))
    return sideTeam
      .map((slot, index) => ({ slot, index }))
      .filter(({ slot, index }) => slot !== null && !excluded.has(index) && !fainted.has(index))
  }, [
    switchPopup,
    activeLeftIndices,
    activeRightIndices,
    team,
    enemyTeam,
    faintedLeftIndices,
    faintedRightIndices,
  ])

  const handleSelectReplacement = (index: number) => {
    if (!switchPopup) return
    if (switchPopup.side === 'left') {
      onSwitchLeft(switchPopup.slot, index)
    } else {
      onSwitchRight(switchPopup.slot, index)
    }
    setSwitchPopup(null)
  }

  return (
    <section className="card battle-panel">
      <div className="battle-top-controls">
        <button type="button" className="btn btn-primary" onClick={onStartFight} disabled={started}>
          {t('battle.startFight')}
        </button>
        <button type="button" className="btn" onClick={onClear}>
          {t('battle.clear')}
        </button>
        <BattleDoubleBattleToggle
          checked={doubleBattle}
          disabled={started}
          onChange={onDoubleBattleChange}
        />
      </div>

      {started ? (
        <>
          <div
            className={`battle-battleground battle-battleground--${activeSlots === 2 ? 'doubles' : 'singles'}`}
          >
            {Array.from({ length: activeSlots }, (_, index) => (
              <Fragment key={`active-row-${index}`}>
                <ActivePokemonCard
                  title={
                    activeSlots === 2
                      ? t('battle.activeSlot', { n: index + 1 })
                      : t('battle.yourActive')
                  }
                  slot={shownLeft[index] ?? null}
                  canAct={Boolean(shownLeft[index])}
                  noPokemonLeft={!leftHasAlivePokemon}
                  onSwitch={() => {
                    onSelectLeftSlot(index)
                    setSwitchPopup({ side: 'left', slot: index })
                  }}
                  onFaint={() => onFaintLeft(index)}
                  onSelect={() => onSelectLeftSlot(index)}
                />
                <ActivePokemonCard
                  title={
                    activeSlots === 2
                      ? t('battle.activeSlot', { n: index + 1 })
                      : t('battle.enemyActive')
                  }
                  slot={shownRight[index] ?? null}
                  canAct={Boolean(shownRight[index])}
                  noPokemonLeft={!rightHasAlivePokemon}
                  onSwitch={() => {
                    onSelectRightSlot(index)
                    setSwitchPopup({ side: 'right', slot: index })
                  }}
                  onFaint={() => onFaintRight(index)}
                  onSelect={() => onSelectRightSlot(index)}
                />
              </Fragment>
            ))}
          </div>

          <div className="battleground-slot-details">
            {showCombinedStats ? (
              <section className="battleground-slot-detail battleground-slot-detail--stats-only">
                <BattlegroundStats participants={statParticipants} />
              </section>
            ) : null}
            {Array.from({ length: activeSlots }, (_, index) => (
              <BattlegroundSlotDetail
                key={`slot-detail-${index}`}
                slotLabel={
                  activeSlots === 2 ? t('battle.activeSlot', { n: index + 1 }) : undefined
                }
                left={shownLeft[index] ?? null}
                right={shownRight[index] ?? null}
                doubleBattle={doubleBattle}
                allyActives={allyActives}
                enemyActives={enemyActives}
                showStats={!showCombinedStats}
              />
            ))}
          </div>
        </>
      ) : null}

      {switchPopup ? (
        <div className="modal-backdrop" onClick={() => setSwitchPopup(null)}>
          <div
            className="modal card battle-switch-modal"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>{t('battle.switchTitle')}</h3>
            <p className="muted">{t('battle.switchSubtitle')}</p>
            <ul className="battle-switch-list">
              {replacements.map(({ slot, index }) =>
                slot ? (
                  <li key={`${slot.slotId}-${index}`}>
                    <button
                      type="button"
                      className="battle-team-slot"
                      onClick={() => handleSelectReplacement(index)}
                    >
                      <img src={slot.sprite} alt={slot.displayName} loading="lazy" />
                      <span>{slot.nickname ?? slot.displayName}</span>
                    </button>
                  </li>
                ) : null,
              )}
            </ul>
            {replacements.length === 0 ? <p className="muted">{t('battle.noSwitchOptions')}</p> : null}
            <div className="confirm-dialog-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setSwitchPopup(null)}>
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
