import type { ValidationResult } from '../../core/validate/ValidationResult'

interface ValidationOverlayProps {
  result: ValidationResult
}

const SEVERITY_CLASS = {
  error: 'text-red-400',
  warning: 'text-yellow-400',
  info: 'text-blue-400',
}

const SEVERITY_BADGE = {
  error: 'bg-red-900 text-red-300',
  warning: 'bg-yellow-900 text-yellow-300',
  info: 'bg-blue-900 text-blue-300',
}

export function ValidationOverlay({ result }: ValidationOverlayProps) {
  if (result.issues.length === 0) {
    return (
      <div className="flex items-center gap-2 text-green-400 text-sm">
        <span>✓</span>
        <span>Maze is valid</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-sm">
        <span className={result.valid ? 'text-yellow-400' : 'text-red-400'}>
          {result.valid ? '⚠' : '✗'}
        </span>
        <span className={result.valid ? 'text-yellow-300' : 'text-red-300'}>
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
              <span className="text-gray-600 font-mono ml-auto flex-shrink-0">{issue.location}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
