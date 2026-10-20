/** Measure authored TypeScript using the configured parser; unmeasured gates stay explicit. */
import { ESLint } from 'eslint'
import ts from 'typescript'
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { relative } from 'node:path'

const paths = execFileSync('rg', ['--files', 'src', '-g', '*.ts', '-g', '*.tsx'], { encoding: 'utf8' })
  .trim().split('\n').filter(path => !path.startsWith('src/test/')).sort()
const eslint = new ESLint({ overrideConfig: [{ rules: { complexity: ['warn', 0] } }] })
const results = await eslint.lintFiles(paths)
const measurements = results.map(result => {
  const file = relative(process.cwd(), result.filePath)
  const source = readFileSync(result.filePath, 'utf8')
  let explicitAnyUnknown = 0
  const countTypes = node => {
    if (node.kind === ts.SyntaxKind.AnyKeyword || node.kind === ts.SyntaxKind.UnknownKeyword) explicitAnyUnknown++
    ts.forEachChild(node, countTypes)
  }
  countTypes(ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true))
  const complexities = result.messages.filter(message => message.ruleId === 'complexity')
    .map(message => ({ line: message.line, value: Number(message.message.match(/complexity of (\d+)/)[1]) }))
  return { file, sourceLines: source.trimEnd().split('\n').length,
    maxCyclomatic: Math.max(0, ...complexities.map(measurement => measurement.value)),
    overLimit: complexities.filter(measurement => measurement.value > 21), explicitAnyUnknown }
})
const violations = measurements.filter(measurement => measurement.overLimit.length || measurement.explicitAnyUnknown || measurement.sourceLines >= 1000)
const lintErrors = results.flatMap(result => result.messages.filter(message => message.severity === 2)
  .map(message => ({ file: relative(process.cwd(), result.filePath), ...message })))
const report = { executedAt: new Date().toISOString(),
  scope: 'All authored production TypeScript in src, excluding src/test',
  files: measurements.length, maxCyclomatic: Math.max(...measurements.map(measurement => measurement.maxCyclomatic)),
  maxSourceLines: Math.max(...measurements.map(measurement => measurement.sourceLines)),
  explicitAnyUnknown: measurements.reduce((count, measurement) => count + measurement.explicitAnyUnknown, 0),
  violations, lintErrors, measurements,
  unmeasured: ['Cognitive complexity', 'Halstead Difficulty', 'Instrumented statement/branch/function/line coverage',
    'CRAP', 'Mutation survival', 'Dead code analysis', 'Duplication analysis', 'Python script complexity'] }
writeFileSync(process.argv[2] ?? 'docs/CODE_QUALITY_CHECKS.json', JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify({ files: report.files, maxCyclomatic: report.maxCyclomatic,
  maxSourceLines: report.maxSourceLines, explicitAnyUnknown: report.explicitAnyUnknown, violations: violations.length, lintErrors: lintErrors.length }))
if (violations.length || lintErrors.length) process.exitCode = 1
