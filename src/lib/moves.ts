import type { PokemonType } from '@/types/pokemon'

/** Gen 1–3: physical/special determined by move type. Gen 4+: move category from data. */
export function usesTypeBasedSplit(generation: number): boolean {
  return generation <= 3
}

export function getMoveCategoryByType(type: PokemonType, generation: number): 'physical' | 'special' {
  if (!usesTypeBasedSplit(generation)) {
    return 'physical'
  }

  const specialTypes: PokemonType[] = ['fire', 'water', 'electric', 'grass', 'ice', 'psychic', 'dragon', 'dark']
  return specialTypes.includes(type) ? 'special' : 'physical'
}

export function splitExplanation(generation: number): { en: string; es: string } {
  if (usesTypeBasedSplit(generation)) {
    return {
      en: 'In Gen 1–3, whether a move uses Attack or Sp. Atk is based on its type (e.g. Water = special), not the move itself.',
      es: 'En Gen 1–3, si un movimiento usa Ataque o At. Esp. depende de su tipo (ej. Agua = especial), no del movimiento en sí.',
    }
  }
  return {
    en: 'From Gen 4 onward, each move has a category (Physical / Special) independent of its type.',
    es: 'Desde Gen 4, cada movimiento tiene categoría (Físico / Especial) independiente de su tipo.',
  }
}
