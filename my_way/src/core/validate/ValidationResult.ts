export type ValidationSeverity = 'error' | 'warning' | 'info'

export interface ValidationIssue {
  severity: ValidationSeverity
  code: string
  message: string
  location?: string // e.g. 'blocks[2].exits[0]'
}

export interface ValidationResult {
  valid: boolean
  issues: ValidationIssue[]
}
