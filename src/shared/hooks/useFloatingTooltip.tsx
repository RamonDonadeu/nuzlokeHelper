import {
  forwardRef,
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'

export type FloatingTooltipPlacement = 'start' | 'end' | 'center'

const TOOLTIP_GAP_PX = 6
const VIEWPORT_PADDING_PX = 8

type TooltipCoords = {
  top: number
  left: number
  transform?: string
}

function getTooltipCoords(anchor: HTMLElement, placement: FloatingTooltipPlacement): TooltipCoords {
  const rect = anchor.getBoundingClientRect()
  const top = rect.bottom + TOOLTIP_GAP_PX

  switch (placement) {
    case 'start':
      return { top, left: rect.left }
    case 'end':
      return { top, left: rect.right, transform: 'translateX(-100%)' }
    case 'center':
      return { top, left: rect.left + rect.width / 2, transform: 'translateX(-50%)' }
  }
}

function coordsToStyle(coords: TooltipCoords): CSSProperties {
  return {
    position: 'fixed',
    top: coords.top,
    left: coords.left,
    transform: coords.transform,
    zIndex: 50,
  }
}

function getTooltipBox(
  coords: TooltipCoords,
  width: number,
  height: number,
): { left: number; top: number; right: number; bottom: number } {
  let left: number
  let right: number

  if (coords.transform === 'translateX(-100%)') {
    right = coords.left
    left = coords.left - width
  } else if (coords.transform === 'translateX(-50%)') {
    left = coords.left - width / 2
    right = coords.left + width / 2
  } else {
    left = coords.left
    right = coords.left + width
  }

  return {
    left,
    top: coords.top,
    right,
    bottom: coords.top + height,
  }
}

function clampTooltipCoords(
  coords: TooltipCoords,
  width: number,
  height: number,
  padding = VIEWPORT_PADDING_PX,
): TooltipCoords {
  const box = getTooltipBox(coords, width, height)
  const vw = window.innerWidth
  const vh = window.innerHeight

  let dx = 0
  if (box.left < padding) dx = padding - box.left
  else if (box.right > vw - padding) dx = vw - padding - box.right

  let dy = 0
  if (box.top < padding) dy = padding - box.top
  else if (box.bottom > vh - padding) dy = vh - padding - box.bottom

  if (dx === 0 && dy === 0) return coords
  return { ...coords, left: coords.left + dx, top: coords.top + dy }
}

function measureTooltip(
  tooltip: HTMLElement,
  coords: TooltipCoords,
): { width: number; height: number } {
  const previousCssText = tooltip.style.cssText
  const style = coordsToStyle(coords)
  tooltip.style.cssText = [
    'position:fixed',
    'visibility:hidden',
    'pointer-events:none',
    `top:${style.top}px`,
    `left:${style.left}px`,
    style.transform ? `transform:${style.transform}` : '',
  ]
    .filter(Boolean)
    .join(';')

  const { width, height } = tooltip.getBoundingClientRect()
  tooltip.style.cssText = previousCssText
  return { width, height }
}

export function getTooltipStyle(
  anchor: HTMLElement,
  placement: FloatingTooltipPlacement,
  tooltip?: HTMLElement | null,
): CSSProperties {
  const coords = getTooltipCoords(anchor, placement)
  if (!tooltip) return coordsToStyle(coords)

  const { width, height } = measureTooltip(tooltip, coords)
  if (width === 0 || height === 0) return coordsToStyle(coords)

  return coordsToStyle(clampTooltipCoords(coords, width, height))
}

export function useFloatingTooltip<T extends HTMLElement = HTMLElement>(
  placement: FloatingTooltipPlacement = 'end',
) {
  const tooltipId = useId()
  const anchorRef = useRef<T>(null)
  const tooltipRef = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState(false)
  const [style, setStyle] = useState<CSSProperties>({})

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current
    if (!anchor) return
    setStyle(getTooltipStyle(anchor, placement, tooltipRef.current))
  }, [placement])

  const openTooltip = useCallback(() => {
    updatePosition()
    setOpen(true)
  }, [updatePosition])

  const closeTooltip = useCallback(() => {
    setOpen(false)
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    updatePosition()
    const handleChange = () => updatePosition()
    window.addEventListener('scroll', handleChange, true)
    window.addEventListener('resize', handleChange)
    return () => {
      window.removeEventListener('scroll', handleChange, true)
      window.removeEventListener('resize', handleChange)
    }
  }, [open, updatePosition])

  const onBlur = useCallback(
    (event: FocusEvent<HTMLElement>) => {
      const related = event.relatedTarget
      if (related && event.currentTarget.contains(related)) return
      closeTooltip()
    },
    [closeTooltip],
  )

  const triggerHandlers = {
    onMouseEnter: openTooltip,
    onMouseLeave: closeTooltip,
    onFocus: openTooltip,
    onBlur,
  }

  return {
    tooltipId,
    anchorRef: anchorRef as RefObject<T>,
    tooltipRef,
    open,
    style,
    triggerHandlers,
  }
}

export const FloatingTooltipPortal = forwardRef<
  HTMLSpanElement,
  {
    id: string
    open: boolean
    style: CSSProperties
    className: string
    children: ReactNode
  }
>(function FloatingTooltipPortal({ id, open, style, className, children }, ref) {
  if (!open) return null
  return createPortal(
    <span id={id} ref={ref} role="tooltip" className={className} style={style}>
      {children}
    </span>,
    document.body,
  )
})
