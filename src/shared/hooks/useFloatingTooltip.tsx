import {
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

export type FloatingTooltipPlacement = 'end' | 'center'

const TOOLTIP_GAP_PX = 6

function getTooltipStyle(
  anchor: HTMLElement,
  placement: FloatingTooltipPlacement,
): CSSProperties {
  const rect = anchor.getBoundingClientRect()
  const top = rect.bottom + TOOLTIP_GAP_PX

  if (placement === 'center') {
    return {
      position: 'fixed',
      top,
      left: rect.left + rect.width / 2,
      transform: 'translateX(-50%)',
      zIndex: 50,
    }
  }

  return {
    position: 'fixed',
    top,
    right: window.innerWidth - rect.right,
    zIndex: 50,
  }
}

export function useFloatingTooltip<T extends HTMLElement = HTMLElement>(
  placement: FloatingTooltipPlacement = 'end',
) {
  const tooltipId = useId()
  const anchorRef = useRef<T>(null)
  const [open, setOpen] = useState(false)
  const [style, setStyle] = useState<CSSProperties>({})

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current
    if (!anchor) return
    setStyle(getTooltipStyle(anchor, placement))
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
    open,
    style,
    triggerHandlers,
  }
}

export function FloatingTooltipPortal({
  id,
  open,
  style,
  className,
  children,
}: {
  id: string
  open: boolean
  style: CSSProperties
  className: string
  children: ReactNode
}) {
  if (!open) return null
  return createPortal(
    <span id={id} role="tooltip" className={className} style={style}>
      {children}
    </span>,
    document.body,
  )
}
