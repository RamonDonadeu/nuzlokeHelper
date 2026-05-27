import { useId } from 'react'

interface CustomStatMarkerProps {
  label: string
}

export function CustomStatMarker({ label }: CustomStatMarkerProps) {
  const tooltipId = useId()

  return (
    <span className="info-tooltip custom-stat-marker-tooltip">
      <span
        className="custom-stat-marker"
        tabIndex={0}
        aria-label={label}
        aria-describedby={tooltipId}
      >
        *
      </span>
      <span id={tooltipId} role="tooltip" className="info-tooltip-content">
        {label}
      </span>
    </span>
  )
}
