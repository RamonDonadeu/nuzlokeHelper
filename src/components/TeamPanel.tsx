import { useEffect, useState } from 'react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import type { PokemonSlot } from '@/types/profile'
import { MAX_LEVEL_CAP, MAX_TEAM_SIZE, MIN_LEVEL_CAP, MIN_POKEMON_LEVEL } from '@/types/profile'
import { calculateAllStats } from '@/lib/stats'
import { totalStats } from '@/types/pokemon'
import { useEvolutionBadges } from '@/hooks/useBoxEvolutionBadges'
import { useI18n } from '@/i18n'

interface TeamPanelProps {
  team: PokemonSlot[]
  levelCap: number
  selectedSlotId: string | null
  onSelectSlot: (slotId: string) => void
  onUpdateLevelCap: (levelCap: number) => void
  onMoveAllToCap: () => void
  onSendAllToPC: () => void
  onShowTeamStats: () => void
  onLevelUp: (slotId: string) => void
  onLevelDown: (slotId: string) => void
  onMoveToBox: (slotId: string) => void
  onMarkDead: (slotId: string) => void
  onEvolve: (slotId: string) => void
}

function commitLevelCapInput(raw: string, fallback: number, onUpdateLevelCap: (levelCap: number) => void): void {
  const parsed = Number(raw)
  if (raw.trim() === '' || !Number.isFinite(parsed)) {
    onUpdateLevelCap(fallback)
    return
  }
  onUpdateLevelCap(parsed)
}

export function TeamPanel({
  team,
  levelCap,
  selectedSlotId,
  onSelectSlot,
  onUpdateLevelCap,
  onMoveAllToCap,
  onSendAllToPC,
  onShowTeamStats,
  onLevelUp,
  onLevelDown,
  onMoveToBox,
  onMarkDead,
  onEvolve,
}: TeamPanelProps) {
  const { t } = useI18n()
  const [capDraft, setCapDraft] = useState<string | null>(null)
  const [pendingEvolveSlotId, setPendingEvolveSlotId] = useState<string | null>(null)
  const evolvableSlotIds = useEvolutionBadges(team)

  const pendingEvolveMember = pendingEvolveSlotId
    ? team.find((member) => member.slotId === pendingEvolveSlotId)
    : null

  useEffect(() => {
    setCapDraft(null)
  }, [levelCap])

  const slots = Array.from({ length: MAX_TEAM_SIZE }, (_, index) => team[index] ?? null)
  const teamTotals = team.map((member) =>
    totalStats(calculateAllStats(member.baseStats, member.level, member.ivs, member.evs, member.nature)),
  )
  const teamAverage = team.length ? Math.round(teamTotals.reduce((a, b) => a + b, 0) / team.length) : 0
  const capInputValue = capDraft ?? String(levelCap)

  return (
    <aside className="team-panel">
      <div className="panel-header">
        <div>
          <h2>{t('team.title')}</h2>
          <p className="muted">
            {t('team.slots', { count: team.length, max: MAX_TEAM_SIZE })} ·{' '}
            {t('team.avgBst', { value: teamAverage })}
          </p>
        </div>
      </div>

      <div className="team-options">
        <span className="control-label">{t('team.levelCap')}</span>
        <div className="number-stepper" role="group" aria-label={t('team.levelCap')}>
          <button
            type="button"
            className="number-stepper-btn"
            disabled={levelCap <= MIN_LEVEL_CAP}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onUpdateLevelCap(levelCap - 1)}
            aria-label={t('team.decreaseCap')}
          >
            −
          </button>
          <input
            type="number"
            className="number-stepper-input"
            min={MIN_LEVEL_CAP}
            max={MAX_LEVEL_CAP}
            value={capInputValue}
            onChange={(e) => setCapDraft(e.target.value)}
            onBlur={() => {
              commitLevelCapInput(capDraft ?? String(levelCap), levelCap, onUpdateLevelCap)
              setCapDraft(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur()
              }
            }}
            aria-label={t('team.levelCap')}
          />
          <button
            type="button"
            className="number-stepper-btn"
            disabled={levelCap >= MAX_LEVEL_CAP}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onUpdateLevelCap(levelCap + 1)}
            aria-label={t('team.increaseCap')}
          >
            +
          </button>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onMoveAllToCap}>
          {t('team.moveAllToCap')}
        </button>
      </div>

      <ul className="team-slots team-slots-grid">
        {slots.map((member, index) => (
          <li key={index}>
            {member ? (
              <div
                className={`team-slot team-slot-compact ${selectedSlotId === member.slotId ? 'selected' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => onSelectSlot(member.slotId)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelectSlot(member.slotId)
                  }
                }}
              >
                <div className="team-slot-top">
                  <img src={member.sprite} alt="" />
                  <div className="team-slot-info">
                    <strong>{member.nickname ?? member.displayName}</strong>
                    <span className="muted team-slot-meta">
                      {t('team.level', { level: member.level })} · BST{' '}
                      {totalStats(
                        calculateAllStats(
                          member.baseStats,
                          member.level,
                          member.ivs,
                          member.evs,
                          member.nature,
                        ),
                      )}
                    </span>
                    <span className="type-row">
                      {member.types.map((type) => (
                        <span key={type} className={`type-badge type-${type}`}>
                          {type}
                        </span>
                      ))}
                    </span>
                  </div>
                </div>
                <div className="slot-actions" onClick={(e) => e.stopPropagation()}>
                  <div className="level-controls">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={member.level <= MIN_POKEMON_LEVEL}
                      onClick={() => onLevelDown(member.slotId)}
                      title={t('team.levelDown')}
                      aria-label={t('team.levelDown')}
                    >
                      −
                    </button>
                    {evolvableSlotIds.has(member.slotId) && (
                      <button
                        type="button"
                        className="btn btn-sm team-evolve-btn team-evolve-level-btn"
                        onClick={() => setPendingEvolveSlotId(member.slotId)}
                      >
                        {t('team.evolve')}
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={member.level >= levelCap}
                      onClick={() => onLevelUp(member.slotId)}
                      title={t('team.levelUp')}
                      aria-label={t('team.levelUp')}
                    >
                      +
                    </button>
                  </div>
                  <div className="team-slot-actions">
                    <div className="team-slot-actions-row">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm team-send-pc-btn"
                        onClick={() => onMoveToBox(member.slotId)}
                      >
                        {t('team.sendToPC')}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm team-mark-dead-btn"
                        onClick={() => onMarkDead(member.slotId)}
                      >
                        {t('team.markDead')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="team-slot team-slot-compact empty">
                <span className="muted">{t('team.emptySlot', { n: index + 1 })}</span>
              </div>
            )}
          </li>
        ))}
      </ul>

      <div className="team-panel-footer">
        <button
          type="button"
          className="btn btn-ghost btn-block"
          disabled={team.length === 0}
          title={team.length === 0 ? t('team.seeAllStatsEmpty') : undefined}
          onClick={onShowTeamStats}
        >
          {t('team.seeAllStats')}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-block"
          disabled={team.length === 0}
          title={team.length === 0 ? t('team.sendAllToPCEmpty') : undefined}
          onClick={onSendAllToPC}
        >
          {t('team.sendAllToPC')}
        </button>
      </div>

      {pendingEvolveMember && (
        <ConfirmDialog
          title={t('team.evolveConfirmTitle')}
          message={t('team.evolveConfirmMessage', {
            name: pendingEvolveMember.nickname ?? pendingEvolveMember.displayName,
          })}
          confirmLabel={t('team.evolve')}
          confirmClassName="btn btn-sm team-evolve-btn"
          onConfirm={() => {
            onEvolve(pendingEvolveMember.slotId)
            setPendingEvolveSlotId(null)
          }}
          onCancel={() => setPendingEvolveSlotId(null)}
        />
      )}
    </aside>
  )
}
