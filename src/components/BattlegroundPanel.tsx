import { PokemonStatGrid } from '@/components/PokemonStatGrid'
import type { PokemonSlot } from '@/types/profile'
import { useI18n } from '@/i18n'

interface BattlegroundPanelProps {
  started: boolean
  activeLeft: PokemonSlot | null
  activeRight: PokemonSlot | null
  doubleBattle: boolean
  onDoubleBattleChange: (value: boolean) => void
  onStartFight: () => void
  onClear: () => void
  onOpenEnemyEditor: () => void
}

function ActivePokemonCard({
  title,
  slot,
}: {
  title: string
  slot: PokemonSlot | null
}) {
  const { t } = useI18n()

  return (
    <section className="battle-active-card">
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
        </>
      ) : (
        <p className="muted">{t('battle.noActive')}</p>
      )}
    </section>
  )
}

export function BattlegroundPanel({
  started,
  activeLeft,
  activeRight,
  doubleBattle,
  onDoubleBattleChange,
  onStartFight,
  onClear,
  onOpenEnemyEditor,
}: BattlegroundPanelProps) {
  const { t } = useI18n()

  return (
    <section className="card battle-panel">
      <div className="battle-top-controls">
        <button type="button" className="btn btn-primary" onClick={onStartFight}>
          {t('battle.startFight')}
        </button>
        <button type="button" className="btn" onClick={onClear}>
          {t('battle.clear')}
        </button>
        <button type="button" className="btn" onClick={onOpenEnemyEditor}>
          {t('battle.enemyTeam')}
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
        <ActivePokemonCard title={t('battle.yourActive')} slot={started ? activeLeft : null} />
        <div className="battle-vs">VS</div>
        <ActivePokemonCard title={t('battle.enemyActive')} slot={started ? activeRight : null} />
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
            stats={started && activeLeft ? activeLeft.baseStats : { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 }}
            nature={activeLeft?.nature}
          />
        </div>
        <div className="card">
          <PokemonStatGrid
            title={t('battle.enemyStats')}
            stats={started && activeRight ? activeRight.baseStats : { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 }}
            nature={activeRight?.nature}
          />
        </div>
      </div>
    </section>
  )
}
