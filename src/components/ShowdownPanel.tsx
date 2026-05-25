import { useState } from 'react'
import type { PokemonSlot } from '@/types/profile'
import { slotsToShowdownPaste } from '@/lib/showdown'
import { useI18n } from '@/i18n'

interface ShowdownPanelProps {
  team: PokemonSlot[]
  opponentTeam: PokemonSlot[]
  onImport: (text: string, target: 'team' | 'opponentTeam') => Promise<void>
}

export function ShowdownPanel({ team, opponentTeam, onImport }: ShowdownPanelProps) {
  const { t } = useI18n()
  const [paste, setPaste] = useState('')
  const [exportText, setExportText] = useState('')

  const handleImport = async (target: 'team' | 'opponentTeam') => {
    await onImport(paste, target)
    setPaste('')
  }

  return (
    <section className="card showdown-section">
      <h2>{t('showdown.title')}</h2>

      <textarea
        className="showdown-textarea"
        placeholder={t('showdown.pastePlaceholder')}
        value={paste}
        onChange={(e) => setPaste(e.target.value)}
        rows={8}
      />

      <div className="showdown-actions">
        <button type="button" className="btn btn-primary" onClick={() => void handleImport('team')}>
          {t('showdown.importTeam')}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => void handleImport('opponentTeam')}>
          {t('showdown.importOpponent')}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => setExportText(slotsToShowdownPaste(team))}
        >
          {t('showdown.exportTeam')}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => setExportText(slotsToShowdownPaste(opponentTeam))}
        >
          {t('showdown.exportOpponent')}
        </button>
      </div>

      {exportText && (
        <textarea className="showdown-textarea" readOnly value={exportText} rows={8} />
      )}

      <div className="opponent-preview">
        <h3>{t('showdown.opponentTitle')}</h3>
        {opponentTeam.length === 0 ? (
          <p className="muted">{t('showdown.opponentEmpty')}</p>
        ) : (
          <ul className="opponent-list">
            {opponentTeam.map((slot) => (
              <li key={slot.slotId}>
                <img src={slot.sprite} alt="" />
                <span>
                  {slot.nickname ?? slot.displayName} · Lv {slot.level}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
