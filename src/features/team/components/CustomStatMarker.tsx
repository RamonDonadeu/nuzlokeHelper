import {
  FloatingTooltipPortal,
  useFloatingTooltip,
} from '@/shared/hooks/useFloatingTooltip'

interface CustomStatMarkerProps {
  label: string
}

export function CustomStatMarker({ label }: CustomStatMarkerProps) {
  const { tooltipId, anchorRef, open, style, triggerHandlers } =
    useFloatingTooltip<HTMLSpanElement>('center')

  return (
    <span className="info-tooltip custom-stat-marker-tooltip">
      <span
        ref={anchorRef}
        className="custom-stat-marker"
        tabIndex={0}
        aria-label={label}
        aria-describedby={open ? tooltipId : undefined}
        {...triggerHandlers}
      >
        *
      </span>
      <FloatingTooltipPortal
        id={tooltipId}
        open={open}
        style={style}
        className="info-tooltip-content info-tooltip-content--center"
      >
        {label}
      </FloatingTooltipPortal>
    </span>
  )
}
