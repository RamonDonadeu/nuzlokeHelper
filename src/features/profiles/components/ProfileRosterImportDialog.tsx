import { useRef, useState, type ChangeEvent } from 'react'
import { useI18n } from '@/i18n'
import {
  countProfileRosterExport,
  parseProfileRosterExport,
  type ProfileRosterExport,
  type ProfileRosterImportFailure,
} from '@/lib/profileRosterExport'
import { useToast } from '@/shared/components/Toast'

interface ProfileRosterImportDialogProps {
  open: boolean
  hasExistingRoster: boolean
  onClose: () => void
  onImport: (data: ProfileRosterExport) => void
}

export function ProfileRosterImportDialog({
  open,
  hasExistingRoster,
  onClose,
  onImport,
}: ProfileRosterImportDialogProps) {
  const { t } = useI18n()
  const { showToast, showErrorToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [rawJson, setRawJson] = useState('')
  const [error, setError] = useState<ProfileRosterImportFailure | null>(null)
  const [preview, setPreview] = useState<ProfileRosterExport | null>(null)

  if (!open) return null

  const failureMessage = (failure: ProfileRosterImportFailure) => {
    switch (failure) {
      case 'invalidJson':
        return t('profile.rosterImportInvalidJson')
      case 'invalidFormat':
        return t('profile.rosterImportInvalidFormat')
      case 'unsupportedVersion':
        return t('profile.rosterImportUnsupportedVersion')
      case 'emptyRoster':
        return t('profile.rosterImportEmpty')
    }
  }

  const validateRaw = (raw: string) => {
    const { data, failure } = parseProfileRosterExport(raw)
    setError(failure)
    setPreview(data)
    return data
  }

  const handleRawChange = (raw: string) => {
    setRawJson(raw)
    if (!raw.trim()) {
      setError(null)
      setPreview(null)
      return
    }
    validateRaw(raw)
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      const text = await file.text()
      setRawJson(text)
      validateRaw(text)
    } catch {
      setError('invalidJson')
      setPreview(null)
      showErrorToast(t('profile.rosterImportInvalidJson'))
    }
  }

  const handleImport = () => {
    const data = preview ?? validateRaw(rawJson)
    if (!data) {
      showErrorToast(failureMessage(error ?? 'invalidFormat'))
      return
    }

    if (hasExistingRoster) {
      const confirmed = window.confirm(t('profile.rosterImportReplaceConfirm'))
      if (!confirmed) return
    }

    onImport(data)
    showToast(
      t('profile.rosterImportSuccess', {
        count: countProfileRosterExport(data),
        name: data.sourceProfileName,
      }),
    )
    setRawJson('')
    setError(null)
    setPreview(null)
    onClose()
  }

  const previewCount = preview ? countProfileRosterExport(preview) : 0

  return (
    <div
      className="modal-backdrop profile-roster-import-backdrop"
      role="presentation"
      onClick={(event) => {
        event.stopPropagation()
        onClose()
      }}
    >
      <div
        className="modal card profile-roster-import-modal"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <h3>{t('profile.rosterImportTitle')}</h3>
        <p className="muted">{t('profile.rosterImportHint')}</p>

        <div className="profile-roster-import-file">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="profile-roster-import-file-input"
            onChange={(event) => void handleFileChange(event)}
          />
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => fileInputRef.current?.click()}
          >
            {t('profile.rosterImportChooseFile')}
          </button>
        </div>

        <textarea
          className="profile-roster-import-textarea"
          value={rawJson}
          onChange={(event) => handleRawChange(event.target.value)}
          placeholder={t('profile.rosterImportPlaceholder')}
        />

        {preview ? (
          <p className="profile-roster-import-preview muted">
            {t('profile.rosterImportPreview', {
              name: preview.sourceProfileName,
              team: preview.team.length,
              box: preview.box.length,
              deathBox: preview.deathBox.length,
              tms: preview.moveLearnTMs.length,
              relearn: preview.moveLearnRelearnPool.length,
              count: previewCount,
            })}
          </p>
        ) : null}

        {error ? <p className="error-note">{failureMessage(error)}</p> : null}

        <div className="confirm-dialog-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleImport}
            disabled={!preview}
          >
            {t('profile.rosterImportAction')}
          </button>
        </div>
      </div>
    </div>
  )
}
