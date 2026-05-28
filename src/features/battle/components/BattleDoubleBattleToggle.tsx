import { useI18n } from '@/i18n'

interface BattleDoubleBattleToggleProps {
  checked: boolean
  disabled?: boolean
  onChange: (value: boolean) => void
  className?: string
}

export function BattleDoubleBattleToggle({
  checked,
  disabled = false,
  onChange,
  className = '',
}: BattleDoubleBattleToggleProps) {
  const { t } = useI18n()

  return (
    <label className={`toggle-switch battle-double-toggle${className ? ` ${className}` : ''}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="toggle-switch-track" aria-hidden="true" />
      <span className="toggle-switch-label">{t('battle.doubleBattle')}</span>
    </label>
  )
}
