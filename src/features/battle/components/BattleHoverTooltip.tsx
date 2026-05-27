import {
  FloatingTooltipPortal,
  useFloatingTooltip,
  type FloatingTooltipPlacement,
} from '@/shared/hooks/useFloatingTooltip'
import type { ReactNode } from 'react'

interface BattleHoverTooltipProps {
  label: string
  tooltip: ReactNode
  children: ReactNode
  className?: string
  disabled?: boolean
  placement?: FloatingTooltipPlacement
}

export function BattleHoverTooltip({
  label,
  tooltip,
  children,
  className,
  disabled = false,
  placement = 'center',
}: BattleHoverTooltipProps) {
  const { tooltipId, anchorRef, tooltipRef, open, style, triggerHandlers } =
    useFloatingTooltip<HTMLSpanElement>(placement)

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
        ref={tooltipRef}
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
