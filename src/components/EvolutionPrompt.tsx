import type { EvolutionChoice } from '@/types/profile'

import { useI18n } from '@/i18n'



interface EvolutionPromptProps {

  choice: EvolutionChoice

  onEvolve: (optionIndex: number) => void

  onDismiss: () => void

}



export function EvolutionPrompt({ choice, onEvolve, onDismiss }: EvolutionPromptProps) {

  const { t } = useI18n()

  const name = choice.options[0]?.displayName ?? ''

  const isManual = choice.source === 'manual'

  const showLevelChange = choice.fromLevel !== choice.toLevel



  return (

    <div className="modal-backdrop" role="dialog" aria-modal="true">

      <div className="modal card">

        <h3>

          {isManual && choice.options.length > 1

            ? t('evolution.chooseTitle')

            : t('evolution.prompt', { name })}

        </h3>

        {showLevelChange && (

          <p className="muted">

            Lv {choice.fromLevel} → {choice.toLevel}

          </p>

        )}



        {!isManual && choice.options.length > 1 && <p>{t('evolution.pickStage')}</p>}



        <div className="evolution-options">

          {choice.options.map((opt, index) => (

            <button

              key={opt.speciesId}

              type="button"

              className="evolution-option btn"

              onClick={() => onEvolve(index)}

            >

              <img src={opt.sprite} alt="" />

              <span>{opt.displayName}</span>

            </button>

          ))}

        </div>



        <button type="button" className="btn btn-ghost btn-block" onClick={onDismiss}>

          {isManual ? t('evolution.cancel') : t('evolution.no')}

        </button>

      </div>

    </div>

  )

}


