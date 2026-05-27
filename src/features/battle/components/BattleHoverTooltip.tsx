import {
  FloatingTooltipPortal,
  useFloatingTooltip,
} from '@/shared/hooks/useFloatingTooltip'
import type { ReactNode } from 'react'

interface BattleHoverTooltipProps {
  label: string
  tooltip: ReactNode
  children: ReactNode
  className?: string
  disabled?: boolean
}

export function BattleHoverTooltip({
  label,
  tooltip,
  children,
  className,
  disabled = false,
}: BattleHoverTooltipProps) {
  const { tooltipId, anchorRef, open, style, triggerHandlers } =
    useFloatingTooltip<HTMLSpanElement>('center')

  if (disabled || !tooltip) {
    return <span className={className}>{children}</span>
  }

  return (
    <span className={['battle-hover-tooltip', className].filter(Boolean).join(' ')}>
      <span
        ref={anchorRef}
        tabIndex={0}
        aria-label={label}
        aria-describedby={open ? tooltipId : undefined}
        {...triggerHandlers}
      >
        {children}
      </span>
      <FloatingTooltipPortal
        id={tooltipId}
        open={open}
        style={style}
        className="info-tooltip-content battle-hover-tooltip-content"
      >
        {tooltip}
      </FloatingTooltipPortal>
    </span>
  )
}
