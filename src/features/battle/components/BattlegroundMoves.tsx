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
  type MoveDetails,
} from '@/lib/moveTypes'
import { formatMultiplier, getDefensiveMultiplier } from '@/lib/typeChart'
import type { PokemonType } from '@/types/pokemon'
import type { PokemonSlot } from '@/types/profile'

type MovePerspective = 'offensive' | 'incoming'

interface BattlegroundMovesProps {
  left: PokemonSlot | null
  right: PokemonSlot | null
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
}: {
  targets: PokemonSlot[]
  moveType: PokemonType
  perspective: MovePerspective
}) {
  return (
    <div className="battleground-move-targets" aria-hidden="true">
      {targets.map((target) => {
        const multiplier = getDefensiveMultiplier(target.types, moveType)
        const effectClass =
          perspective === 'offensive'
            ? offensiveMoveEffectClass(multiplier)
            : incomingMoveEffectClass(multiplier)
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
        const multiplier =
          moveType && defenderTypes.length > 0
            ? getDefensiveMultiplier(defenderTypes, moveType)
            : null
        const effectClass =
          perspective === 'offensive'
            ? offensiveMoveEffectClass(multiplier)
            : incomingMoveEffectClass(multiplier)
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
                {multiplier !== null ? (
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

export function BattlegroundMoves({ left, right }: BattlegroundMovesProps) {
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

  return (
    <div className="battleground-moves">
      <MoveGrid
        slot={left}
        defenderTypes={leftDefenderTypes}
        perspective="offensive"
        detailsByName={detailsByName}
      />
      <MoveGrid
        slot={right}
        defenderTypes={rightDefenderTypes}
        perspective="incoming"
        detailsByName={detailsByName}
      />
    </div>
  )
}
