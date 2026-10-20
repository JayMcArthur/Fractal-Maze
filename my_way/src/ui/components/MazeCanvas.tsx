import { compilePlayDocument } from '../../app/library/compilePlayDocument'
import { SquareMazeCanvas, type SquareMazeCanvasProps as MazeCanvasProps } from './SquareMazeCanvas'
import { TourRenderer } from '../../core/render/svg/TourRenderer'
import { useEffect, useRef, useMemo } from 'react'
import { rulePlayDocument } from '../../app/library/rulePlayDocument'
import { BlockRecursiveRenderer } from '../../core/render/canvas/BlockRecursiveRenderer'
import { GeometricRenderer } from '../../core/render/svg/GeometricRenderer'
import type { GeometricRecursiveDefinition } from '../../core/model/geometricRecursive'
import { RepeatedRenderer } from '../../core/render/svg/RepeatedRenderer'
import type { RepeatedDirectedDefinition } from '../../core/model/repeatedDirected'
import { GraphLabeledRenderer } from '../../core/render/svg/GraphLabeledRenderer'
import { PathMazeDrawing } from '../workbench/PathMazeDrawing'
export function MazeCanvas({ doc: original, ...props }: MazeCanvasProps) {
  const doc = useMemo(() => {
    if (original.definition.type === 'recursivePorts') return compilePlayDocument(original)
    return (!original.artwork?.asset ? rulePlayDocument(original) : null) ?? original
  }, [original])
  if (doc.definition.type === 'recursiveTour')
    return <TourRenderer def={doc.definition} artwork={doc.artwork} />
  if (doc.definition.type === 'pathPushdown' || doc.definition.type === 'infiniteRule')
    return <PathMazeDrawing model={doc.definition} artwork={doc.artwork} />
  if (doc.representationType === 'legacyWire')
    return (
      <img
        className="wire-preview"
        src={`${import.meta.env.BASE_URL}references/Maze_Images/Mark_J_P_Wolf/Wolfram_2.jpg`}
        alt={doc.metadata.title}
      />
    )
  if (doc.representationType === 'geometricRecursive')
    return <GeometricRenderer maze={(doc.definition as GeometricRecursiveDefinition).maze} />
  if (doc.representationType === 'repeatedDirected') {
    const def = doc.definition as RepeatedDirectedDefinition
    return <RepeatedRenderer def={def} current={def.start} preview />
  }
  if (doc.representationType === 'blockRecursive') {
    return <BlockMazeCanvas doc={doc} {...props} />
  }
  if (doc.representationType === 'graphLabeled') {
    const size = Math.min(props.maxDisplayWidth ?? 600, 600)
    return (
      <div className={`maze-viewport maze-viewport--graph ${props.className ?? ''}`}>
        <GraphLabeledRenderer doc={doc} width={size} height={size} />
      </div>
    )
  }
  if (doc.representationType !== 'squareRecursive') {
    return (
      <div className="maze-viewport maze-viewport--unsupported" role="status">
        <strong>Rule-defined maze</strong>
        <span>No renderer has been defined for this representation.</span>
      </div>
    )
  }
  return <SquareMazeCanvas doc={doc} {...props} />
}

function BlockMazeCanvas({ doc, maxDepth = 3, maxDisplayWidth, className }: MazeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const renderer = useMemo(() => new BlockRecursiveRenderer(), [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    renderer.render(doc, canvas, maxDepth)
    if (maxDisplayWidth && canvas.width > maxDisplayWidth) {
      const ratio = maxDisplayWidth / canvas.width
      canvas.style.width = `${maxDisplayWidth}px`
      canvas.style.height = `${Math.round(canvas.height * ratio)}px`
    }
  }, [doc, maxDepth, maxDisplayWidth, renderer])

  return <canvas ref={canvasRef} className={className} style={{ imageRendering: 'pixelated' }} />
}
