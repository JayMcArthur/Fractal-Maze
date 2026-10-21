import type { ValidationResult } from '../../core/validate/ValidationResult'

interface ValidationOverlayProps {
  result: ValidationResult
}

const SEVERITY_CLASS = {
  error: 'text-danger',
  warning: 'text-warning',
  info: 'text-info',
}

const SEVERITY_BADGE = {
  error: 'notice-danger text-danger',
  warning: 'notice-warning text-warning',
  info: 'notice-info text-info',
}

export function ValidationOverlay({ result }: ValidationOverlayProps) {
  if (result.issues.length === 0) {
    return (
      <div className="flex items-center gap-2 text-success text-sm">
        <span>✓</span>
        <span>Maze is valid</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-sm">
        <span className={result.valid ? 'text-warning' : 'text-danger'}>
          {result.valid ? '⚠' : '✗'}
        </span>
        <span className={result.valid ? 'text-warning' : 'text-danger'}>
          {result.valid ? 'Valid with warnings' : 'Invalid maze'}
        </span>
      </div>
      <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
        {result.issues.map((issue, i) => (
          <div key={i} className="flex items-start gap-2 text-xs">
            <span className={`px-1 rounded flex-shrink-0 ${SEVERITY_BADGE[issue.severity]}`}>
              {issue.severity[0].toUpperCase()}
            </span>
            <span className={SEVERITY_CLASS[issue.severity]}>{issue.message}</span>
            {issue.location && (
              <span className="text-muted font-mono ml-auto flex-shrink-0">{issue.location}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
