import { useI18n } from '@/i18n'
import type { PokemonSlot } from '@/types/profile'

interface BattlePcSwitchDialogProps {
  open: boolean
  incoming: PokemonSlot | null
  teamSlots: Array<PokemonSlot | null>
  onPickSlot: (teamIndex: number) => void
  onClose: () => void
}

export function BattlePcSwitchDialog({
  open,
  incoming,
  teamSlots,
  onPickSlot,
  onClose,
}: BattlePcSwitchDialogProps) {
  const { t } = useI18n()

  if (!open || !incoming) return null

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal card battle-pc-switch-modal"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <h3>{t('battle.switchPcTitle')}</h3>
        <p className="muted">{t('battle.switchPcPrompt', { name: incoming.nickname ?? incoming.displayName })}</p>
        <p className="battle-pc-switch-incoming">
          <img src={incoming.sprite} alt="" loading="lazy" />
          <span>{incoming.nickname ?? incoming.displayName}</span>
        </p>
        <p className="control-label">{t('battle.pickTeamSlot')}</p>
        <ul className="battle-pc-switch-slots">
          {teamSlots.map((slot, index) => (
            <li key={`switch-slot-${index}`}>
              <button
                type="button"
                className={`battle-team-slot battle-pc-switch-slot${slot ? '' : ' empty'}`}
                onClick={() => onPickSlot(index)}
              >
                {slot ? (
                  <>
                    <img src={slot.sprite} alt={slot.displayName} loading="lazy" />
                    <span className="battle-team-slot-name">{slot.nickname ?? slot.displayName}</span>
                  </>
                ) : (
                  <span className="battle-team-slot-name">{t('team.emptySlot', { n: index + 1 })}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
        <div className="confirm-dialog-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}
