import { PokemonStatGrid } from '@/components/PokemonStatGrid'
import type { PokemonSlot } from '@/types/profile'
import { useI18n } from '@/i18n'
import { useMemo, useState } from 'react'

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
        <button type="button" className="btn btn-primary" onClick={onStartFight}>
          {t('battle.startFight')}
        </button>
        <button type="button" className="btn" onClick={onClear}>
          {t('battle.clear')}
        </button>
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={doubleBattle}
            onChange={(event) => onDoubleBattleChange(event.target.checked)}
          />
          <span className="toggle-switch-track" aria-hidden="true" />
          <span className="toggle-switch-label">{t('battle.doubleBattle')}</span>
        </label>
      </div>

      <div className="battle-battleground">
        <div className="battle-active-side">
          {shownLeft.map((slot, index) => (
            <ActivePokemonCard
              key={`left-${index}`}
              title={activeSlots === 2 ? t('battle.activeSlot', { n: index + 1 }) : t('battle.yourActive')}
              slot={started ? slot : null}
              canAct={started && Boolean(slot)}
              noPokemonLeft={started && !leftHasAlivePokemon}
              onSwitch={() => {
                onSelectLeftSlot(index)
                setSwitchPopup({ side: 'left', slot: index })
              }}
              onFaint={() => onFaintLeft(index)}
              onSelect={() => onSelectLeftSlot(index)}
            />
          ))}
        </div>
        <div className="battle-vs">VS</div>
        <div className="battle-active-side">
          {shownRight.map((slot, index) => (
            <ActivePokemonCard
              key={`right-${index}`}
              title={activeSlots === 2 ? t('battle.activeSlot', { n: index + 1 }) : t('battle.enemyActive')}
              slot={started ? slot : null}
              canAct={started && Boolean(slot)}
              noPokemonLeft={started && !rightHasAlivePokemon}
              onSwitch={() => {
                onSelectRightSlot(index)
                setSwitchPopup({ side: 'right', slot: index })
              }}
              onFaint={() => onFaintRight(index)}
              onSelect={() => onSelectRightSlot(index)}
            />
          ))}
        </div>
      </div>

      <div className="battle-tab-bar">
        <button type="button" className="tab-btn active" aria-current="page">
          {t('battle.statsTab')}
        </button>
      </div>

      <div className="battle-stats-grid">
        <div className="card">
          <PokemonStatGrid
            title={t('battle.yourStats')}
            stats={started && shownLeft[0] ? shownLeft[0].baseStats : { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 }}
            nature={shownLeft[0]?.nature}
          />
        </div>
        <div className="card">
          <PokemonStatGrid
            title={t('battle.enemyStats')}
            stats={started && shownRight[0] ? shownRight[0].baseStats : { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 }}
            nature={shownRight[0]?.nature}
          />
        </div>
      </div>

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
