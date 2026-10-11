import { useId } from 'react'
import type { RecursiveMazeDocument } from '../../model/RecursiveMazeDocument'
import type { GraphLabeledDefinition } from '../../model/graphLabeled'
import { graphPortals, graphChoices } from '../../solver/common/graphTraversal'

interface Props { doc: RecursiveMazeDocument; width?: number; height?: number; current?: string; onPortal?: (id: string) => void }
export function GraphLabeledRenderer({ doc, width = 600, height = 600, current, onPortal }: Props) {
  const marker = useId().replaceAll(':', '')
  const def = doc.definition as GraphLabeledDefinition
  const portals = graphPortals(def.root)
  const places = new Map(portals.map((portal, index) => {
    const angle = 2 * Math.PI * index / portals.length - Math.PI / 2
    return [portal.id, { x: width / 2 + width * .34 * Math.cos(angle), y: height / 2 + height * .34 * Math.sin(angle) }]
  }))
  const choices = current ? graphChoices(def, current) : []
  return <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Portal graph: ${doc.metadata.title}`} style={{ background: '#f5f6f0' }}>
    <defs><marker id={marker} viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#63766a" /></marker></defs>
    {portals.flatMap((portal) => portal.connectsTo.map((target) => {
      const from = places.get(portal.id)!, to = places.get(target)
      if (!to) return null
      const dx = to.x - from.x, dy = to.y - from.y, distance = Math.hypot(dx, dy)
      if (!distance) return <circle key={`${portal.id}-${target}`} cx={from.x} cy={from.y - 20} r="20" fill="none" stroke="#63766a" />
      return <line key={`${portal.id}-${target}`} x1={from.x + dx / distance * 15} y1={from.y + dy / distance * 15} x2={to.x - dx / distance * 15} y2={to.y - dy / distance * 15} stroke="#63766a" strokeWidth="2" markerEnd={portal.isOneWay ? `url(#${marker})` : undefined} />
    }))}
    {portals.map((portal) => {
      const point = places.get(portal.id)!
      const enabled = choices.includes(portal.id) && onPortal
      return <g key={portal.id} role={enabled ? 'button' : undefined} tabIndex={enabled ? 0 : undefined} aria-label={enabled ? `Move to ${portal.label}` : undefined}
        onClick={() => { if (enabled) onPortal(portal.id) }} onKeyDown={(event) => { if (enabled && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onPortal(portal.id) } }} style={{ cursor: enabled ? 'pointer' : undefined }}>
        <circle cx={point.x} cy={point.y} r="14" fill={portal.id === current ? '#d74e2c' : portal.id === def.entryPortal ? '#7fc99b' : portal.id === def.exitPortal ? '#e7c867' : '#c6d4cb'} stroke="#33453a" />
        <text x={point.x} y={point.y + 30} textAnchor="middle" fill="#26382e" fontSize="14">{portal.label}</text>
      </g>
    })}
  </svg>
}
