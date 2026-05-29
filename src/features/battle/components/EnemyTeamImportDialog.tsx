import { useState } from 'react'
import { useI18n } from '@/i18n'
import {
  parseShowdownPaste,
  showdownSetsToSlots,
  type ShowdownImportFailure,
} from '@/lib/showdown'
import { useToast } from '@/shared/components/Toast'
import type { PokemonSlot } from '@/types/profile'

interface EnemyTeamImportDialogProps {
  open: boolean
  levelCap: number
  hasExistingEnemyTeam: boolean
  onClose: () => void
  onImport: (team: PokemonSlot[], mode: 'replace' | 'append') => void
}

export function EnemyTeamImportDialog({
  open,
  levelCap,
  hasExistingEnemyTeam,
  onClose,
  onImport,
}: EnemyTeamImportDialogProps) {
  const { t } = useI18n()
  const { showToast, showErrorToast } = useToast()
  const [rawPaste, setRawPaste] = useState('')
  const [mode, setMode] = useState<'replace' | 'append'>('replace')
  const [error, setError] = useState<string | null>(null)
  const [failures, setFailures] = useState<ShowdownImportFailure[]>([])
  const [isImporting, setIsImporting] = useState(false)

  if (!open) return null

  const formatFailure = (failure: ShowdownImportFailure) =>
    t('battle.importFailureLine', {
      name: failure.label,
      slugs: failure.triedSlugs.join(', '),
    })

  const handleImport = async () => {
    setError(null)
    setFailures([])
    setIsImporting(true)
    try {
      const sets = parseShowdownPaste(rawPaste)
      if (sets.length === 0) {
        setError(t('battle.importInvalidPaste'))
        showErrorToast(t('battle.importInvalidPaste'))
        return
      }
      const result = await showdownSetsToSlots(sets, levelCap)
      if (result.slots.length === 0) {
        setFailures(result.failures)
        setError(t('battle.importNoResolvedPokemon'))
        showErrorToast(t('battle.importNoResolvedPokemon'))
        return
      }
      if (mode === 'replace' && hasExistingEnemyTeam) {
        const confirmed = window.confirm(t('battle.importReplaceConfirm'))
        if (!confirmed) return
      }
      onImport(result.slots, mode)

      if (result.failures.length > 0) {
        setFailures(result.failures)
        setError(t('battle.importFailureHeader'))
        showErrorToast(
          t('battle.importPartialFailures', {
            imported: result.slots.length,
            failed: result.failures.length,
          }),
        )
        return
      }

      showToast(t('battle.importSuccess', { count: result.slots.length }))
      setRawPaste('')
      setMode('replace')
      setFailures([])
      onClose()
    } catch {
      setError(t('battle.importFailed'))
      showErrorToast(t('battle.importFailed'))
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
        {failures.length > 0 ? (
          <ul className="battle-import-failures">
            {failures.map((failure) => (
              <li key={`${failure.speciesSlug}-${failure.label}`}>{formatFailure(failure)}</li>
            ))}
          </ul>
        ) : null}
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
