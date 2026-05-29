import { useEffect, useMemo, useState } from 'react'
import { BattleHoverTooltip } from '@/features/battle/components/BattleHoverTooltip'
import {
  incomingMoveEffectClass,
  offensiveMoveEffectClass,
} from '@/features/battle/lib/battleMoveStyles'
import { useI18n } from '@/i18n'
import { displayMoveName } from '@/lib/localizedNames'
import {
  fetchMoveDetails,
  getCachedMoveDetails,
  getMoveDescription,
  isDamagingMove,
  type MoveDetails,
} from '@/lib/moveTypes'
import { formatMultiplier, getDefensiveMultiplier } from '@/lib/typeChart'
import type { PokemonType } from '@/types/pokemon'
import type { PokemonSlot } from '@/types/profile'

type MovePerspective = 'offensive' | 'incoming'

interface BattlegroundMovesProps {
  left: PokemonSlot | null
  right: PokemonSlot | null
  doubleBattle?: boolean
  allyActives?: PokemonSlot[]
  enemyActives?: PokemonSlot[]
}

function padMoves(moves: string[] | undefined): string[] {
  const names = (moves ?? []).map((move) => move.trim()).filter(Boolean).slice(0, 4)
  while (names.length < 4) names.push('')
  return names
}

function uniqueMoveNames(left: PokemonSlot | null, right: PokemonSlot | null): string[] {
  const names = [...padMoves(left?.moves), ...padMoves(right?.moves)].filter(Boolean)
  return [...new Set(names)]
}

function MoveTargetIcons({
  targets,
  moveType,
  perspective,
  showEffectiveness,
}: {
  targets: PokemonSlot[]
  moveType: PokemonType
  perspective: MovePerspective
  showEffectiveness: boolean
}) {
  return (
    <div className="battleground-move-targets" aria-hidden="true">
      {targets.map((target) => {
        const multiplier = showEffectiveness
          ? getDefensiveMultiplier(target.types, moveType)
          : null
        const effectClass = showEffectiveness
          ? perspective === 'offensive'
            ? offensiveMoveEffectClass(multiplier)
            : incomingMoveEffectClass(multiplier)
          : 'battleground-move-target-neutral'
        const label = target.nickname ?? target.displayName
        return (
          <span
            key={target.slotId}
            className={['battleground-move-target', effectClass].join(' ')}
            title={
              multiplier !== null
                ? `${label} · ${formatMultiplier(multiplier)}`
                : label
            }
          >
            <img src={target.sprite} alt="" loading="lazy" />
          </span>
        )
      })}
    </div>
  )
}

function MoveGrid({
  slot,
  defenderTypes,
  defenderTargets,
  perspective,
  detailsByName,
}: {
  slot: PokemonSlot | null
  defenderTypes: PokemonType[]
  defenderTargets?: PokemonSlot[]
  perspective: MovePerspective
  detailsByName: Map<string, MoveDetails | null>
}) {
  const { t, locale } = useI18n()
  const moveNames = padMoves(slot?.moves)
  const showTargetIcons = (defenderTargets?.length ?? 0) >= 2

  return (
    <ul className="battleground-moves-grid" aria-label={t('battle.movesLabel')}>
      {moveNames.map((moveName, index) => {
        if (!moveName) {
          return (
            <li key={`empty-${index}`} className="battleground-move-cell battleground-move-empty">
              <span className="muted">—</span>
            </li>
          )
        }

        const details = detailsByName.get(moveName) ?? null
        const moveType = details?.type ?? null
        const isStatus = details !== null && !isDamagingMove(details)
        const isDamaging = details !== null && isDamagingMove(details)
        const multiplier =
          isDamaging && moveType && defenderTypes.length > 0
            ? getDefensiveMultiplier(defenderTypes, moveType)
            : null
        const effectClass = isStatus
          ? 'battleground-move-status'
          : isDamaging
            ? perspective === 'offensive'
              ? offensiveMoveEffectClass(multiplier)
              : incomingMoveEffectClass(multiplier)
            : 'battle-move-eff-unknown'
        const description = details ? getMoveDescription(details, locale) : ''
        const displayName = displayMoveName(moveName, locale)
        const powerLabel =
          details?.power === null || details?.power === undefined
            ? t('search.moveUnknown')
            : String(details.power)
        const accuracyLabel =
          details?.accuracy === null || details?.accuracy === undefined
            ? t('search.moveUnknown')
            : `${details.accuracy}%`

        return (
          <li key={`${moveName}-${index}`}>
            <BattleHoverTooltip
              label={displayName}
              tooltip={description || undefined}
              disabled={!description}
              className={['battleground-move-cell', effectClass].join(' ')}
            >
              <div className="battleground-move-top">
                <span className={`type-badge type-${moveType ?? 'unknown'}`}>
                  {moveType ?? '?'}
                </span>
                {showTargetIcons && moveType && isDamaging ? (
                  <MoveTargetIcons
                    targets={defenderTargets!}
                    moveType={moveType}
                    perspective={perspective}
                    showEffectiveness
                  />
                ) : multiplier !== null ? (
                  <span className="battleground-move-mult">{formatMultiplier(multiplier)}</span>
                ) : null}
              </div>
              <strong className="battleground-move-name">{displayName}</strong>
              <div className="battleground-move-stats">
                <span>
                  <span className="muted">{t('search.movePower')}</span> {powerLabel}
                </span>
                <span>
                  <span className="muted">{t('search.moveAccuracy')}</span> {accuracyLabel}
                </span>
              </div>
            </BattleHoverTooltip>
          </li>
        )
      })}
    </ul>
  )
}

export function BattlegroundMoves({
  left,
  right,
  doubleBattle = false,
  allyActives = [],
  enemyActives = [],
}: BattlegroundMovesProps) {
  const [detailsByName, setDetailsByName] = useState<Map<string, MoveDetails | null>>(new Map())

  const moveNames = useMemo(() => uniqueMoveNames(left, right), [left, right])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      const missing = moveNames.filter((name) => getCachedMoveDetails(name) === null)
      await Promise.all(missing.map((name) => fetchMoveDetails(name).catch(() => null)))

      if (cancelled) return

      const next = new Map<string, MoveDetails | null>()
      for (const name of moveNames) {
        next.set(name, getCachedMoveDetails(name))
      }
      setDetailsByName(next)
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [moveNames])

  const leftDefenderTypes = right?.types ?? []
  const rightDefenderTypes = left?.types ?? []
  const showEnemyTargets = doubleBattle && enemyActives.length >= 2
  const showAllyTargets = doubleBattle && allyActives.length >= 2

  return (
    <div className="battleground-moves">
      <MoveGrid
        slot={left}
        defenderTypes={leftDefenderTypes}
        defenderTargets={showEnemyTargets ? enemyActives : undefined}
        perspective="offensive"
        detailsByName={detailsByName}
      />
      <MoveGrid
        slot={right}
        defenderTypes={rightDefenderTypes}
        defenderTargets={showAllyTargets ? allyActives : undefined}
        perspective="incoming"
        detailsByName={detailsByName}
      />
    </div>
  )
}
