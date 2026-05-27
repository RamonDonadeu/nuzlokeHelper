import { useEffect, useMemo, useState } from 'react'
import { fetchPokemon } from '@/lib/pokeapi'
import { defaultNature } from '@/lib/stats'
import { useI18n } from '@/i18n'
import type { PokemonSlot } from '@/types/profile'

interface EnemyPokemonEditorProps {
  open: boolean
  existingSlot: PokemonSlot | null
  onClose: () => void
  onSubmit: (slot: PokemonSlot) => void
}

const EMPTY_MOVES = ['', '', '', '']

export function EnemyPokemonEditor({
  open,
  existingSlot,
  onClose,
  onSubmit,
}: EnemyPokemonEditorProps) {
  const { t } = useI18n()
  const [species, setSpecies] = useState(existingSlot?.name ?? '')
  const [ability, setAbility] = useState(existingSlot?.ability ?? '')
  const [item, setItem] = useState(existingSlot?.item ?? '')
  const [moves, setMoves] = useState<string[]>(
    existingSlot?.moves ? [...existingSlot.moves, ...EMPTY_MOVES].slice(0, 4) : EMPTY_MOVES,
  )
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = useMemo(() => species.trim().length >= 2 && !isSaving, [isSaving, species])

  useEffect(() => {
    if (!open) return
    setSpecies(existingSlot?.name ?? '')
    setAbility(existingSlot?.ability ?? '')
    setItem(existingSlot?.item ?? '')
    setMoves(existingSlot?.moves ? [...existingSlot.moves, ...EMPTY_MOVES].slice(0, 4) : EMPTY_MOVES)
    setError(null)
  }, [existingSlot, open])

  if (!open) return null

  const setMove = (index: number, value: string) => {
    setMoves((prev) => prev.map((move, i) => (i === index ? value : move)))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedSpecies = species.trim().toLowerCase().replace(/\s+/g, '-')
    if (!trimmedSpecies) return
    setIsSaving(true)
    setError(null)

    try {
      const pokemon = await fetchPokemon(trimmedSpecies)
      const nextSlot: PokemonSlot = {
        slotId: existingSlot?.slotId ?? crypto.randomUUID(),
        speciesId: pokemon.id,
        currentSpeciesId: pokemon.id,
        name: pokemon.name,
        displayName: pokemon.displayName,
        types: pokemon.types,
        baseStats: pokemon.stats,
        sprite: pokemon.sprite,
        level: existingSlot?.level ?? 50,
        nature: existingSlot?.nature ?? defaultNature(),
        ability: ability.trim() || undefined,
        item: item.trim() || undefined,
        moves: moves.map((move) => move.trim()).filter(Boolean),
      }
      onSubmit(nextSlot)
      setSpecies('')
      setAbility('')
      setItem('')
      setMoves(EMPTY_MOVES)
    } catch {
      setError(t('battle.editorSpeciesError'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal card battle-editor-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <h3>{t('battle.enemyEditorTitle')}</h3>
        <form className="inline-form" onSubmit={handleSubmit}>
          <label className="control-group">
            <span className="control-label">{t('battle.editorSpecies')}</span>
            <input
              type="text"
              value={species}
              onChange={(event) => setSpecies(event.target.value)}
              placeholder={t('battle.editorSpeciesPlaceholder')}
              required
            />
          </label>
          <label className="control-group">
            <span className="control-label">{t('battle.editorAbility')}</span>
            <input
              type="text"
              value={ability}
              onChange={(event) => setAbility(event.target.value)}
              placeholder={t('battle.editorAbilityPlaceholder')}
            />
          </label>
          <label className="control-group">
            <span className="control-label">{t('battle.editorItem')}</span>
            <input
              type="text"
              value={item}
              onChange={(event) => setItem(event.target.value)}
              placeholder={t('battle.editorItemPlaceholder')}
            />
          </label>
          <div className="move-input-grid">
            {moves.map((move, index) => (
              <label key={`enemy-move-${index}`} className="move-input-row">
                <span className="control-label">{t('battle.editorMove', { n: index + 1 })}</span>
                <input
                  type="text"
                  value={move}
                  onChange={(event) => setMove(index, event.target.value)}
                  placeholder={t('battle.editorMovePlaceholder')}
                />
              </label>
            ))}
          </div>
          {error && <p className="error-note">{error}</p>}
          <div className="confirm-dialog-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
              {isSaving ? t('search.searching') : t('common.confirm')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
