import { useState } from 'react'

import type { PokemonSlot } from '@/types/profile'

import { PCComparison } from '@/features/pc/components/PCComparison'
import { useEvolutionBadges } from '@/features/team/hooks/useBoxEvolutionBadges'
import { useI18n } from '@/i18n'

type PCSubView = 'box' | 'death'

interface PCViewProps {
  box: PokemonSlot[]
  deathBox: PokemonSlot[]
  team: PokemonSlot[]
  allowRevival: boolean
  levelCap: number
  selectedSlotId: string | null
  onSelectSlot: (slotId: string) => void
  onMoveToTeam: (slotId: string) => void
  onFaint: (slotId: string) => void
  onDelete: (slotId: string) => void
  onRevive: (slotId: string) => void
  onDeleteDeath: (slotId: string) => void
  onSetAllToLevelCap: () => void
  onEvolve: (slotId: string) => void
}

export function PCView({
  box,
  deathBox,
  team,
  allowRevival,
  levelCap,
  selectedSlotId,
  onSelectSlot,
  onMoveToTeam,
  onFaint,
  onDelete,
  onRevive,
  onDeleteDeath,
  onSetAllToLevelCap,
  onEvolve,
}: PCViewProps) {
  const { t } = useI18n()
  const [subView, setSubView] = useState<PCSubView>('box')
  const evolvableSlotIds = useEvolutionBadges(box)

  const handleDelete = (member: PokemonSlot) => {
    const name = member.nickname ?? member.displayName
    if (window.confirm(t('box.deleteConfirm', { name }))) {
      onDelete(member.slotId)
    }
  }

  const handleDeleteDeath = (member: PokemonSlot) => {
    const name = member.nickname ?? member.displayName
    if (window.confirm(t('box.deleteDeathConfirm', { name }))) {
      onDeleteDeath(member.slotId)
    }
  }

  const slots = subView === 'box' ? box : deathBox

  return (
    <section className="card pc-view">
      <div className="pc-header">
        <nav className="pc-subtabs" aria-label={t('box.title')}>
          <button
            type="button"
            className={`tab-btn ${subView === 'box' ? 'active' : ''}`}
            onClick={() => setSubView('box')}
          >
            {t('box.title')}
          </button>
          <button
            type="button"
            className={`tab-btn ${subView === 'death' ? 'active' : ''}`}
            onClick={() => setSubView('death')}
          >
            {t('box.deadPokemon')}
          </button>
        </nav>

        {subView === 'box' && box.length > 0 && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onSetAllToLevelCap}>
            {t('box.setAllToLevelCap')}
          </button>
        )}
      </div>

      <div className="pc-grid" role="list">
        {slots.map((member) => (
            <article
              key={member.slotId}
              role="listitem"
              className={`pc-grid-card ${selectedSlotId === member.slotId ? 'selected' : ''}`}
            >
              <button
                type="button"
                className="pc-grid-card-main"
                onClick={() => onSelectSlot(member.slotId)}
              >
                <img src={member.sprite} alt="" />
                <strong>{member.nickname ?? member.displayName}</strong>
                <span className="muted">{t('team.level', { level: member.level })}</span>
                {subView === 'box' && evolvableSlotIds.has(member.slotId) && (
                  <span className="pc-evolve-badge">{t('box.canEvolve')}</span>
                )}
                <div className="type-row">
                  {member.types.map((type) => (
                    <span key={type} className={`type-badge type-${type}`}>
                      {type}
                    </span>
                  ))}
                </div>
              </button>

              <div className="pc-grid-card-actions">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  title={t('team.edit')}
                  onClick={() => onSelectSlot(member.slotId)}
                >
                  {t('team.edit')}
                </button>

                {subView === 'box' ? (
                  <>
                    {evolvableSlotIds.has(member.slotId) && (
                      <button
                        type="button"
                        className="btn btn-sm pc-evolve-btn"
                        title={t('box.evolve')}
                        onClick={() => onEvolve(member.slotId)}
                      >
                        {t('box.evolve')}
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      title={t('box.sendToTeam')}
                      onClick={() => onMoveToTeam(member.slotId)}
                    >
                      {t('box.sendToTeam')}
                    </button>

                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      title={t('box.faint')}
                      onClick={() => onFaint(member.slotId)}
                    >
                      {t('box.faint')}
                    </button>

                    <button
                      type="button"
                      className="btn btn-ghost btn-sm pc-delete-btn"
                      title={t('box.delete')}
                      onClick={() => handleDelete(member)}
                    >
                      {t('box.delete')}
                    </button>
                  </>
                ) : (
                  <>
                    {allowRevival && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        title={t('team.revive')}
                        onClick={() => onRevive(member.slotId)}
                      >
                        {t('team.revive')}
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn btn-ghost btn-sm pc-delete-btn"
                      title={t('box.delete')}
                      onClick={() => handleDeleteDeath(member)}
                    >
                      {t('box.delete')}
                    </button>
                  </>
                )}
              </div>
            </article>
        ))}
      </div>

      {subView === 'box' && (
        <PCComparison
          box={box}
          team={team}
          levelCap={levelCap}
        />
      )}
    </section>
  )
}
