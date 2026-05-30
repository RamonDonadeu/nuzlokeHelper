import { useEffect, useMemo, useState } from 'react'
import { MoveLearnResults } from '@/features/moveLearn/components/MoveLearnResults'
import { MoveLearnMoveGrid } from '@/features/moveLearn/components/MoveLearnMoveGrid'
import { MovePoolEditor } from '@/features/moveLearn/components/MovePoolEditor'
import { LearnMoveReplaceDialog } from '@/features/moveLearn/components/LearnMoveReplaceDialog'
import { MovePoolAttacksPanel } from '@/features/moveLearn/components/MovePoolAttacksPanel'
import { applyMoveAtSlot } from '@/features/moveLearn/lib/moveSlots'
import { usePokemonLearnset } from '@/features/moveLearn/hooks/usePokemonLearnset'
import { useMoveLearnOptions, type MoveLearnOption } from '@/features/moveLearn/hooks/useMoveLearnOptions'
import { useI18n } from '@/i18n'
import { canonicalMoveName } from '@/lib/localizedNames'
import type { PokemonSlot, ProfileSettings, SlotListName } from '@/types/profile'

interface MoveLearnViewProps {
  team: PokemonSlot[]
  box: PokemonSlot[]
  versionGroup: string
  settings: ProfileSettings
  onUpdateMovePools: (partial: Pick<ProfileSettings, 'moveLearnTMs'>) => void
  onUpdateSlot: (slotId: string, patch: Partial<PokemonSlot>, list: SlotListName) => void
}

export function MoveLearnView({
  team,
  box,
  versionGroup,
  settings,
  onUpdateMovePools,
  onUpdateSlot,
}: MoveLearnViewProps) {
  const { t } = useI18n()
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [attacksViewOpen, setAttacksViewOpen] = useState(false)
  const [pendingLearn, setPendingLearn] = useState<MoveLearnOption | null>(null)

  const roster = useMemo(
    () => [
      ...team.map((slot) => ({ slot, list: 'team' as const })),
      ...box.map((slot) => ({ slot, list: 'box' as const })),
    ],
    [team, box],
  )

  const selectedEntry = useMemo(() => {
    if (selectedSlotId) {
      return roster.find((entry) => entry.slot.slotId === selectedSlotId) ?? roster[0] ?? null
    }
    return roster[0] ?? null
  }, [roster, selectedSlotId])

  const selectedSlot = selectedEntry?.slot ?? null
  const tms = settings.moveLearnTMs ?? []

  const { learnset, loading: learnsetLoading, error: learnsetError } = usePokemonLearnset(
    selectedSlot?.name ?? null,
  )

  const analysis = useMoveLearnOptions(selectedSlot, learnset, tms, versionGroup)

  const sourceLabel = (source: 'tm' | 'relearn') =>
    source === 'tm' ? t('moveLearn.badgeTm') : t('moveLearn.badgeRelearn')

  useEffect(() => {
    setAttacksViewOpen(false)
    setPendingLearn(null)
  }, [selectedSlot?.slotId])

  const handleLearnRequest = (option: MoveLearnOption) => {
    if (!selectedEntry || option.alreadyKnown) return
    setPendingLearn(option)
  }

  const handleConfirmReplace = (slotIndex: number) => {
    if (!selectedEntry || !pendingLearn) return
    const moves = applyMoveAtSlot(selectedEntry.slot.moves, slotIndex, pendingLearn.moveName)
    onUpdateSlot(selectedEntry.slot.slotId, { moves }, selectedEntry.list)
    setPendingLearn(null)
  }

  const removeTm = (moveName: string) => {
    const key = canonicalMoveName(moveName).toLowerCase()
    onUpdateMovePools({
      moveLearnTMs: tms.filter((move) => canonicalMoveName(move).toLowerCase() !== key),
    })
  }

  const currentMoveItems = useMemo(
    () => (selectedSlot?.moves ?? []).map((moveName) => ({ moveName })),
    [selectedSlot?.moves],
  )

  return (
    <section className="card move-learn-view">
      <header className="move-learn-header">
        <h2>{t('moveLearn.title')}</h2>
        <p className="muted">{t('moveLearn.subtitle')}</p>
      </header>

      <div className="move-learn-layout">
        <aside className="move-learn-sidebar">
          <MovePoolEditor
            title={t('moveLearn.tmPoolTitle')}
            hint={t('moveLearn.tmPoolHint')}
            moves={tms}
            onChange={(moveLearnTMs) => onUpdateMovePools({ moveLearnTMs })}
            addLabel={t('moveLearn.addMove')}
            placeholder={t('moveLearn.movePlaceholder')}
            attacksViewOpen={attacksViewOpen}
            onToggleAttacksView={() => setAttacksViewOpen((open) => !open)}
          />

          <div className="move-learn-roster">
            <h3>{t('moveLearn.rosterTitle')}</h3>
            {roster.length === 0 ? (
              <p className="muted">{t('moveLearn.emptyRoster')}</p>
            ) : (
              <ul className="move-learn-roster-list" role="list">
                {roster.map(({ slot, list }) => {
                  const active =
                    (selectedSlotId ?? roster[0]?.slot.slotId) === slot.slotId
                  return (
                    <li key={slot.slotId} role="listitem">
                      <button
                        type="button"
                        className={`move-learn-roster-card${active ? ' active' : ''}`}
                        onClick={() => {
                          setAttacksViewOpen(false)
                          setSelectedSlotId(slot.slotId)
                        }}
                      >
                        <img src={slot.sprite} alt="" />
                        <div className="move-learn-roster-card-body">
                          <span className="move-learn-roster-name">
                            {slot.nickname ?? slot.displayName}
                          </span>
                          <span className="muted">
                            {list === 'team' ? t('moveLearn.onTeam') : t('moveLearn.inBox')} ·{' '}
                            {t('team.level', { level: slot.level })}
                          </span>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </aside>

        <div className="move-learn-main">
          {attacksViewOpen ? (
            <MovePoolAttacksPanel
              title={t('moveLearn.tmPoolTitle')}
              moves={tms}
              onRemove={removeTm}
              onClose={() => setAttacksViewOpen(false)}
            />
          ) : selectedSlot ? (
            <div className="move-learn-detail card move-learn-main-panel">
              <div className="move-learn-detail-header">
                <img src={selectedSlot.sprite} alt="" className="move-learn-detail-sprite" />
                <div className="move-learn-detail-heading">
                  <h3>{selectedSlot.nickname ?? selectedSlot.displayName}</h3>
                  <p className="muted">{t('team.level', { level: selectedSlot.level })}</p>
                </div>
              </div>

              <section className="move-learn-current" aria-label={t('moveLearn.currentMoves')}>
                <h4>{t('moveLearn.currentMoves')}</h4>
                <MoveLearnMoveGrid
                  items={currentMoveItems}
                  compactLayout="row"
                  emptyHint={t('editor.noMovesConfigured')}
                />
              </section>

              <div className="move-learn-detail-scroll">
              {learnsetLoading && (
                <p className="muted">{t('moveLearn.loadingLearnset')}</p>
              )}
              {learnsetError && <p className="error-note">{learnsetError}</p>}

              {!learnsetLoading && !learnsetError && (
                <>
                  <MoveLearnResults
                    title={t('moveLearn.tmResultsTitle')}
                    emptyHint={t('moveLearn.tmResultsEmpty')}
                    options={analysis.tmLearnable}
                    unavailable={analysis.tmUnavailable}
                    unavailableHint={t('moveLearn.tmUnavailableHint')}
                    sourceLabel={sourceLabel}
                    onLearn={handleLearnRequest}
                  />
                  <MoveLearnResults
                    title={t('moveLearn.relearnResultsTitle')}
                    emptyHint={t('moveLearn.relearnResultsEmpty')}
                    options={analysis.relearnLearnable}
                    unavailable={[]}
                    unavailableHint=""
                    sourceLabel={sourceLabel}
                    onLearn={handleLearnRequest}
                  />
                </>
              )}
              </div>
            </div>
          ) : (
            <p className="muted move-learn-main-empty">{t('moveLearn.emptyRoster')}</p>
          )}
        </div>
      </div>

      {pendingLearn && selectedSlot && selectedEntry ? (
        <LearnMoveReplaceDialog
          pokemonName={selectedSlot.nickname ?? selectedSlot.displayName}
          newMoveName={pendingLearn.moveName}
          source={pendingLearn.source}
          sourceLabel={sourceLabel(pendingLearn.source)}
          currentMoves={selectedSlot.moves}
          onConfirm={handleConfirmReplace}
          onCancel={() => setPendingLearn(null)}
        />
      ) : null}
    </section>
  )
}
