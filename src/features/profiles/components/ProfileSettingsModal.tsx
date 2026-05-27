import { useEffect, useId, useRef, useState } from 'react'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import type { ProfileConfig, ProfileSettings, RunProfile } from '@/types/profile'
import { createDefaultSettings } from '@/types/profile'
import { useI18n } from '@/i18n'
import { GENERATION_OPTIONS, OFFICIAL_VERSION_GROUPS } from '@/lib/versionGroups'

interface ProfileSettingsModalProps {
  open: boolean
  profiles: RunProfile[]
  activeProfile: RunProfile
  onClose: () => void
  onSwitch: (id: string) => void
  onCreate: (name: string, settings?: ProfileSettings) => void
  onDelete: (id: string) => void
  onUpdateSettings: (partial: Partial<ProfileSettings>) => void
  onUpdateConfig: (config: ProfileConfig) => void
}

export function ProfileSettingsModal({
  open,
  profiles,
  activeProfile,
  onClose,
  onSwitch,
  onCreate,
  onDelete,
  onUpdateSettings,
  onUpdateConfig,
}: ProfileSettingsModalProps) {
  const { t } = useI18n()
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newKind, setNewKind] = useState<'official' | 'hackrom'>('hackrom')
  const [pendingDeleteProfileId, setPendingDeleteProfileId] = useState<string | null>(null)

  const config = activeProfile.settings.config
  const pendingDeleteProfile = pendingDeleteProfileId
    ? profiles.find((profile) => profile.id === pendingDeleteProfileId) ?? null
    : null

  useEffect(() => {
    if (!open) {
      setShowNew(false)
      setNewName('')
      setPendingDeleteProfileId(null)
      return
    }
    closeRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  const handleCreate = () => {
    const name = newName.trim() || t('profile.name')
    const settings =
      newKind === 'official'
        ? createDefaultSettings({
            kind: 'official',
            versionGroup: 'emerald',
            gameLabel: 'Emerald',
          })
        : createDefaultSettings({
            kind: 'hackrom',
            baseGeneration: 3,
            pokemonGenerationScope: 9,
          })
    onCreate(name, settings)
    setNewName('')
    setShowNew(false)
  }

  if (!open) return null

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div className="modal card profile-settings-modal" onClick={(event) => event.stopPropagation()}>
        <div className="profile-settings-header">
          <h2 id={titleId}>{t('profile.openSettings')}</h2>
          <button ref={closeRef} type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label={t('profile.close')}>
            ✕
          </button>
        </div>

        <div className="profile-settings-body">
          <section className="profile-settings-section">
            <h3>{t('profile.switch')}</h3>
            <div className="profile-list">
              {profiles.map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  className={`profile-list-item ${profile.id === activeProfile.id ? 'active' : ''}`}
                  onClick={() => onSwitch(profile.id)}
                >
                  <span className="profile-list-name">{profile.name}</span>
                  {profile.id === activeProfile.id && (
                    <span className="profile-list-badge">{t('profile.active')}</span>
                  )}
                </button>
              ))}
            </div>
            <div className="profile-settings-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowNew((value) => !value)}>
                {t('profile.new')}
              </button>
              {profiles.length > 1 && (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => setPendingDeleteProfileId(activeProfile.id)}
                >
                  {t('profile.delete')}
                </button>
              )}
            </div>
          </section>

          {showNew && (
            <section className="profile-settings-section profile-form">
              <h3>{t('profile.new')}</h3>
              <label className="control-group">
                <span className="control-label">{t('profile.name')}</span>
                <input
                  type="text"
                  placeholder={t('profile.name')}
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                />
              </label>
              <label className="control-group">
                <span className="control-label">{t('profile.runType')}</span>
                <select value={newKind} onChange={(event) => setNewKind(event.target.value as 'official' | 'hackrom')}>
                  <option value="hackrom">{t('profile.hackrom')}</option>
                  <option value="official">{t('profile.official')}</option>
                </select>
              </label>
              <div className="form-actions">
                <button type="button" className="btn btn-primary" onClick={handleCreate}>
                  {t('profile.create')}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowNew(false)}>
                  {t('profile.cancel')}
                </button>
              </div>
            </section>
          )}

          <section className="profile-settings-section profile-form">
            <h3>{t('profile.settings')}</h3>
            {config.kind === 'official' ? (
              <label className="control-group">
                <span className="control-label">{t('profile.game')}</span>
                <select
                  value={config.versionGroup}
                  onChange={(event) => {
                    const game = OFFICIAL_VERSION_GROUPS.find((item) => item.id === event.target.value)
                    if (game) {
                      onUpdateConfig({
                        kind: 'official',
                        versionGroup: game.id,
                        gameLabel: game.label,
                      })
                    }
                  }}
                >
                  {OFFICIAL_VERSION_GROUPS.map((game) => (
                    <option key={game.id} value={game.id}>
                      {game.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <>
                <label className="control-group">
                  <span className="control-label">{t('profile.baseGen')}</span>
                  <select
                    value={config.baseGeneration}
                    onChange={(event) =>
                      onUpdateConfig({
                        ...config,
                        baseGeneration: Number(event.target.value),
                      })
                    }
                  >
                    {GENERATION_OPTIONS.map((gen) => (
                      <option key={gen} value={gen}>
                        Gen {gen}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="control-group">
                  <span className="control-label">{t('profile.monScope')}</span>
                  <select
                    value={config.pokemonGenerationScope}
                    onChange={(event) =>
                      onUpdateConfig({
                        ...config,
                        pokemonGenerationScope: Number(event.target.value),
                      })
                    }
                  >
                    {GENERATION_OPTIONS.map((gen) => (
                      <option key={gen} value={gen}>
                        Gen {gen}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={activeProfile.settings.allowRevival}
                onChange={(event) => onUpdateSettings({ allowRevival: event.target.checked })}
              />
              {t('profile.allowRevival')}
            </label>
          </section>
        </div>
      </div>
      {pendingDeleteProfile && (
        <ConfirmDialog
          title={t('profile.deleteConfirmTitle')}
          message={t('profile.deleteConfirmMessage', { name: pendingDeleteProfile.name })}
          confirmLabel={t('profile.delete')}
          confirmClassName="btn btn-danger"
          onConfirm={() => {
            onDelete(pendingDeleteProfile.id)
            setPendingDeleteProfileId(null)
          }}
          onCancel={() => setPendingDeleteProfileId(null)}
        />
      )}
    </div>
  )
}
