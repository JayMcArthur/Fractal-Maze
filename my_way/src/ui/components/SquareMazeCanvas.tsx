import { useEffect, useRef, useMemo, useCallback } from 'react'
import type { RecursiveMazeDocument } from '../../core/model/RecursiveMazeDocument'
import type { PlayerPosition } from '../../core/model/playerState'
import type { SquareRecursiveDefinition } from '../../core/model/squareRecursive'
import { CanvasRenderer } from '../../core/render/canvas/CanvasRenderer'
import { cameraTransition, fullView, interpolateView, sameStack } from '../../core/render/canvas/squareCamera'
import type { ViewRect } from '../../core/render/canvas/squareCamera'

export interface SquareMazeCanvasProps {
  doc: RecursiveMazeDocument
  playerPos?: PlayerPosition
  trail?: PlayerPosition[]
  maxDepth?: number
  showBlockLabels?: boolean
  showBreadcrumbs?: boolean
  colorScheme?: 'default' | 'highContrast'
  /** Max CSS display width in px. Canvas scales down to fit; never upscales. */
  maxDisplayWidth?: number
  className?: string
}

export function SquareMazeCanvas({
  doc,
  playerPos,
  trail,
  maxDepth = 4,
  showBlockLabels = true,
  showBreadcrumbs = true,
  colorScheme = 'default',
  maxDisplayWidth,
  className,
}: SquareMazeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const previousRef = useRef({ doc, position: playerPos })

  // Cache the renderer — only recreate when the doc changes
  const renderer = useMemo(() => new CanvasRenderer(doc), [doc])

  const draw = useCallback(
    (
      framePosition: PlayerPosition | undefined,
      viewStack?: string[],
      viewRect?: ViewRect,
      extraDepth = 0
    ) => {
      const canvas = canvasRef.current
      if (!canvas || !renderer) return

      renderer.render(canvas, {
        maxDepth: maxDepth + extraDepth,
        showBlockLabels,
        showBreadcrumbs,
        trail,
        playerPos: framePosition,
        colorScheme,
        viewStack,
        viewRect,
        pixelRatio: window.devicePixelRatio,
      })

      // Scale the CSS display size to fit within maxDisplayWidth (never upscale)
      const full = fullView(doc.definition as SquareRecursiveDefinition)
      const width = Math.min(maxDisplayWidth ?? full.width, full.width)
      canvas.style.width = `${width}px`
      canvas.style.height = 'auto'
    },
    [renderer, doc, trail, maxDepth, showBlockLabels, showBreadcrumbs, colorScheme, maxDisplayWidth]
  )

  useEffect(() => {
    const previous = previousRef.current.doc === doc ? previousRef.current.position : undefined
    previousRef.current = { doc, position: playerPos }

    const sameContext =
      previous && playerPos && sameStack(previous.blockStack, playerPos.blockStack)
    const hasMoved =
      previous && playerPos && (previous.row !== playerPos.row || previous.col !== playerPos.col)
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const transition =
      previous && playerPos
        ? cameraTransition(
            doc.definition as SquareRecursiveDefinition,
            previous.blockStack,
            playerPos.blockStack
          )
        : null
    if (reduceMotion || !previous || !playerPos || (!transition && (!sameContext || !hasMoved))) {
      draw(playerPos)
      return
    }

    let animationFrame = 0
    const startedAt = performance.now()
    const duration = transition ? 450 : 100
    const animate = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      if (transition && progress < 1) {
        draw(
          playerPos,
          transition.stack,
          interpolateView(transition.from, transition.to, eased),
          transition.levels
        )
      } else if (transition) {
        draw(playerPos)
      } else {
        draw({
          blockStack: playerPos.blockStack,
          row: previous.row + (playerPos.row - previous.row) * eased,
          col: previous.col + (playerPos.col - previous.col) * eased,
        })
      }
      if (progress < 1) animationFrame = requestAnimationFrame(animate)
    }
    animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [draw, doc, playerPos])

  return <canvas ref={canvasRef} className={className} aria-label={doc.metadata.title} />
}

