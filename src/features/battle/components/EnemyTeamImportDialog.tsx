import { useState } from 'react'
import { useI18n } from '@/i18n'
import { parseShowdownPaste, showdownSetsToSlots } from '@/lib/showdown'
import type { PokemonSlot } from '@/types/profile'

interface EnemyTeamImportDialogProps {
  open: boolean
  hasExistingEnemyTeam: boolean
  onClose: () => void
  onImport: (team: PokemonSlot[], mode: 'replace' | 'append') => void
}

export function EnemyTeamImportDialog({
  open,
  hasExistingEnemyTeam,
  onClose,
  onImport,
}: EnemyTeamImportDialogProps) {
  const { t } = useI18n()
  const [rawPaste, setRawPaste] = useState('')
  const [mode, setMode] = useState<'replace' | 'append'>('replace')
  const [error, setError] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  if (!open) return null

  const handleImport = async () => {
    setError(null)
    setIsImporting(true)
    try {
      const sets = parseShowdownPaste(rawPaste)
      if (sets.length === 0) {
        setError(t('battle.importInvalidPaste'))
        return
      }
      const slots = await showdownSetsToSlots(sets)
      if (slots.length === 0) {
        setError(t('battle.importNoResolvedPokemon'))
        return
      }
      if (mode === 'replace' && hasExistingEnemyTeam) {
        const confirmed = window.confirm(t('battle.importReplaceConfirm'))
        if (!confirmed) return
      }
      onImport(slots, mode)
      setRawPaste('')
      setMode('replace')
      onClose()
    } catch {
      setError(t('battle.importFailed'))
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal card battle-import-modal"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <h3>{t('battle.importTitle')}</h3>
        <p className="muted">{t('battle.importHint')}</p>
        <textarea
          className="battle-import-textarea"
          value={rawPaste}
          onChange={(event) => setRawPaste(event.target.value)}
          placeholder={t('battle.importPlaceholder')}
        />
        <div className="battle-import-mode">
          <label>
            <input
              type="radio"
              name="battle-import-mode"
              checked={mode === 'replace'}
              onChange={() => setMode('replace')}
            />
            {t('battle.importModeReplace')}
          </label>
          <label>
            <input
              type="radio"
              name="battle-import-mode"
              checked={mode === 'append'}
              onChange={() => setMode('append')}
            />
            {t('battle.importModeAppend')}
          </label>
        </div>
        {error ? <p className="error-note">{error}</p> : null}
        <div className="confirm-dialog-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={isImporting}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void handleImport()}
            disabled={isImporting || rawPaste.trim().length === 0}
          >
            {isImporting ? t('search.searching') : t('battle.importAction')}
          </button>
        </div>
      </div>
    </div>
  )
}
