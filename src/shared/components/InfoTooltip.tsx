import {
  FloatingTooltipPortal,
  useFloatingTooltip,
} from '@/shared/hooks/useFloatingTooltip'

interface InfoTooltipProps {
  label: string
  text: string
}

export function InfoTooltip({ label, text }: InfoTooltipProps) {
  const { tooltipId, anchorRef, open, style, triggerHandlers } =
    useFloatingTooltip<HTMLButtonElement>('end')

  return (
    <span className="info-tooltip">
      <button
        ref={anchorRef}
        type="button"
        className="info-tooltip-trigger"
        aria-label={label}
        aria-describedby={open ? tooltipId : undefined}
        {...triggerHandlers}
      >
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path
            fill="currentColor"
            d="M7.25 7h1.5v4.5h-1.5V7zm0-2.25h1.5V6h-1.5V4.75z"
          />
        </svg>
      </button>
      <FloatingTooltipPortal
        id={tooltipId}
        open={open}
        style={style}
        className="info-tooltip-content"
      >
        {text}
      </FloatingTooltipPortal>
    </span>
  )
}
