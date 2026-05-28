import { useState } from 'react'
import type { PokemonSlot } from '@/types/profile'
import { BattleDoubleBattleToggle } from '@/features/battle/components/BattleDoubleBattleToggle'
import { BattleSlotGrid } from '@/features/battle/components/BattleSlotGrid'
import { useI18n } from '@/i18n'

interface BattleMobileRostersProps {
  teamSlots: Array<PokemonSlot | null>
  enemySlots: Array<PokemonSlot | null>
  pcMembers: PokemonSlot[]
  activeLeftIndices: Array<number | null>
  activeRightIndices: Array<number | null>
  faintedLeftIndices: Set<number>
  faintedRightIndices: Set<number>
  selectedLeftActiveSlot: number
  selectedRightActiveSlot: number
  threatCountsBySlotId: Map<string, number>
  enemyThreatCountsBySlotId: Map<string, number>
  enemyThreatTotal: number
  playerThreatTotal: number
  battleStarted: boolean
  doubleBattle: boolean
  onDoubleBattleChange: (value: boolean) => void
  onTeamSlotClick: (index: number) => void
  onEnemySlotClick: (index: number) => void
  onEnemyEmptyClick: (index: number) => void
  onPcMemberClick: (slotId: string) => void
  onImportEnemy: () => void
}

export function BattleMobileRosters({
  teamSlots,
  enemySlots,
  pcMembers,
  activeLeftIndices,
  activeRightIndices,
  faintedLeftIndices,
  faintedRightIndices,
  selectedLeftActiveSlot,
  selectedRightActiveSlot,
  threatCountsBySlotId,
  enemyThreatCountsBySlotId,
  enemyThreatTotal,
  playerThreatTotal,
  battleStarted,
  doubleBattle,
  onDoubleBattleChange,
  onTeamSlotClick,
  onEnemySlotClick,
  onEnemyEmptyClick,
  onPcMemberClick,
  onImportEnemy,
}: BattleMobileRostersProps) {
  const { t } = useI18n()
  const [pcOpen, setPcOpen] = useState(pcMembers.length > 0)

  return (
    <div className="battle-mobile-rosters">
      {!battleStarted ? (
        <div className="card battle-mobile-roster-toolbar">
          <BattleDoubleBattleToggle
            checked={doubleBattle}
            onChange={onDoubleBattleChange}
            className="battle-double-toggle--rosters"
          />
          {doubleBattle ? (
            <p className="muted battle-mobile-double-hint">{t('battle.doubleBattleRosterHint')}</p>
          ) : null}
        </div>
      ) : null}
      <section className="card battle-mobile-roster-section">
        <h3>{t('battle.yourTeam')}</h3>
        <BattleSlotGrid
          slots={teamSlots}
          activeIndices={activeLeftIndices}
          faintedIndices={faintedLeftIndices}
          selectedActiveSlot={selectedLeftActiveSlot}
          threatCountsBySlotId={threatCountsBySlotId}
          threatTotalCount={enemyThreatTotal}
          threatBadgeVariant="defensive"
          threatTooltipPlacement="end"
          onFilledSlotClick={onTeamSlotClick}
          emptySlotLabel={(n) => t('battle.emptyTeamSlot', { n })}
        />
      </section>

      {pcMembers.length > 0 ? (
        <section className="card battle-mobile-roster-section">
          <button
            type="button"
            className="battle-mobile-pc-toggle"
            aria-expanded={pcOpen}
            onClick={() => setPcOpen((open) => !open)}
          >
            <span>{t('battle.pcRoster')}</span>
            <span className="muted">({pcMembers.length})</span>
            <span className="battle-mobile-pc-chevron" aria-hidden="true">
              {pcOpen ? '▾' : '▸'}
            </span>
          </button>
          {pcOpen ? (
            <BattleSlotGrid
              slots={pcMembers}
              activeIndices={[]}
              faintedIndices={new Set()}
              selectedActiveSlot={0}
              threatCountsBySlotId={threatCountsBySlotId}
              threatTotalCount={enemyThreatTotal}
              threatBadgeVariant="defensive"
              threatTooltipPlacement="end"
              onFilledSlotClick={(index) => {
                const slot = pcMembers[index]
                if (slot) onPcMemberClick(slot.slotId)
              }}
              emptySlotLabel={() => ''}
            />
          ) : null}
        </section>
      ) : null}

      <section className="card battle-mobile-roster-section">
        <div className="battle-mobile-roster-section-head">
          <h3>{t('battle.enemyTeamTitle')}</h3>
          {!battleStarted ? (
            <button type="button" className="btn btn-sm" onClick={onImportEnemy}>
              {t('battle.importAction')}
            </button>
          ) : null}
        </div>
        <BattleSlotGrid
          slots={enemySlots}
          activeIndices={activeRightIndices}
          faintedIndices={faintedRightIndices}
          selectedActiveSlot={selectedRightActiveSlot}
          threatCountsBySlotId={enemyThreatCountsBySlotId}
          threatTotalCount={playerThreatTotal}
          threatBadgeVariant="offensive"
          threatTooltipPlacement="start"
          onFilledSlotClick={onEnemySlotClick}
          onEmptySlotClick={onEnemyEmptyClick}
          emptySlotLabel={(n) => t('battle.emptyEnemySlot', { n })}
        />
      </section>
    </div>
  )
}
