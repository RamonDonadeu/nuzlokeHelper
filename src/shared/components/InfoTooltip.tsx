import { useId } from 'react'

interface InfoTooltipProps {
  label: string
  text: string
}

export function InfoTooltip({ label, text }: InfoTooltipProps) {
  const tooltipId = useId()

  return (
    <span className="info-tooltip">
      <button
        type="button"
        className="info-tooltip-trigger"
        aria-label={label}
        aria-describedby={tooltipId}
      >
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path
            fill="currentColor"
            d="M7.25 7h1.5v4.5h-1.5V7zm0-2.25h1.5V6h-1.5V4.75z"
          />
        </svg>
      </button>
      <span id={tooltipId} role="tooltip" className="info-tooltip-content">
        {text}
      </span>
    </span>
  )
}
