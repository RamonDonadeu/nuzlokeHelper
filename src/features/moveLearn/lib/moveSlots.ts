import { canonicalMoveName } from '@/lib/localizedNames'

export const MOVE_SLOT_COUNT = 4

export function movesToSlots(moves?: string[]): string[] {
  const normalized = (moves ?? []).map((move) => canonicalMoveName(move)).filter(Boolean)
  return Array.from({ length: MOVE_SLOT_COUNT }, (_, index) => normalized[index] ?? '')
}

export function applyMoveAtSlot(moves: string[] | undefined, slotIndex: number, newMove: string): string[] {
  const slots = movesToSlots(moves)
  const canonical = canonicalMoveName(newMove)
  if (!canonical.trim() || slotIndex < 0 || slotIndex >= MOVE_SLOT_COUNT) {
    return (moves ?? []).map((move) => canonicalMoveName(move)).filter(Boolean)
  }
  slots[slotIndex] = canonical
  return slots.filter(Boolean)
}
