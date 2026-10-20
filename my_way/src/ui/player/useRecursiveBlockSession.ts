import { useCallback, useEffect, useRef, useState } from 'react'
import { useRunGuard } from './useRunGuard'
import type { RecursiveMazeDocument } from '../../core/model/RecursiveMazeDocument'
import type { BlockRecursiveDefinition, BlockProvidedRoute } from '../../core/model/blockRecursive'
import { blockDepthLimit, type BlockSearch } from '../../core/blockMaze/grid'
import type { DirectionBit } from '../../core/model/squareRecursive'
import { appendRouteState } from '../../core/replay/routeHistory'
import { useMovementKeyboard } from './movementKeys'
import { initialBlockPosition, moveRecursiveBlock, gridBlockPosition, recursiveBlockAddress,
  recursiveBlockKey, recursiveBlockWon } from '../../core/blockMaze/recursivePosition'
import type { RecursiveBlockRoute } from '../../core/blockMaze/recursiveReplay'

/** Own exact positions, view-independent history, input and finite-search workers. */
export function useRecursiveBlockSession(doc: RecursiveMazeDocument, depth: number) {
  const def = doc.definition as BlockRecursiveDefinition
  const [history, setHistory] = useState<RecursiveBlockRoute>(() => {
    const start = initialBlockPosition(def, depth)
    return { type: 'fractalBlock', states: start ? [start] : [], details: [] }
  })
  const [step, setStep] = useState(0), [detail, setDetail] = useState(depth)
  const [searchDetail, setSearchDetail] = useState(Math.min(blockDepthLimit(def.unit), def.providedRoute?.depth ?? doc.solverConfig.maxDepth))
  const [status, setStatus] = useState('Zoom deeper to reveal smaller passages. Your position stays fixed.')
  const [source, setSource] = useState<'human' | 'solver'>('human'), [zoom, setZoom] = useState(true)
  const [solving, setSolving] = useState(false), worker = useRef<Worker | null>(null)
  useEffect(() => () => worker.current?.terminate(), [])
  useEffect(() => { const timer = window.setTimeout(() => setDetail(depth), 0); return () => clearTimeout(timer) }, [depth])
  const current = history.states[step], located = current ? recursiveBlockAddress(def, current) : null
  const visibleDetail = Math.max(detail, (located?.address.length ?? 0) + 1)
  const ready = !!current && !!def.goal && !def.pattern[def.goal[1] * def.unit + def.goal[0]]
  const won = ready && recursiveBlockWon(def, current)
  const markSaved = useRunGuard(source === 'human' && step > 0 && !won, history)
  const move = useCallback((direction: DirectionBit) => {
    if (!ready || won || solving) return
    const next = moveRecursiveBlock(def, current, direction, visibleDetail)
    if (!next) return
    const states = appendRouteState(history.states.slice(0, step + 1), next, recursiveBlockKey)
    const details = [...history.details.slice(0, step), visibleDetail].slice(0, states.length - 1)
    setHistory({ type: 'fractalBlock', states, details }); setStep(states.length - 1); setSource('human')
    setStatus(recursiveBlockWon(def, next) ? 'Finish reached.' : 'Moved one visible cell.')
  }, [ready, won, solving, def, current, visibleDetail, history, step])
  useMovementKeyboard({ enabled: ready && !won && !solving, move })
  const load = (route: BlockProvidedRoute) => {
    const states = route.states.map(cell => gridBlockPosition(def.unit, cell, route.depth))
    setHistory({ type: 'fractalBlock', states, details: states.slice(1).map(() => route.depth) })
    setStep(0); setDetail(route.depth); setSource('solver')
    setStatus('Solution loaded. Step through it or save it as a replay.')
  }
  const solve = () => {
    const next = new Worker(new URL('../../core/workers/blockWorker.ts', import.meta.url), { type: 'module' })
    worker.current = next; setSolving(true); setStatus(`Searching the detail-${searchDetail} finite expansion…`)
    next.onmessage = (event: MessageEvent<BlockSearch>) => {
      next.terminate(); worker.current = null; setSolving(false)
      if (event.data.status === 'solved') load({ depth: searchDetail, states: event.data.path })
      else setStatus(`No route in this depth-${searchDetail} expansion. Deeper passages remain unsearched.`)
    }
    next.onerror = () => { next.terminate(); worker.current = null; setSolving(false); setStatus('Search failed. Try again.') }
    next.postMessage({ definition: def, depth: searchDetail })
  }
  const reset = () => {
    if (step && !won && !window.confirm('Restart this unfinished run? Save a replay first if you want to keep it.')) return
    const start = initialBlockPosition(def, depth)
    setHistory({ type: 'fractalBlock', states: start ? [start] : [], details: [] })
    setStep(0); setSource('human'); setStatus('Run restarted.')
  }
  const cancel = () => { worker.current?.terminate(); worker.current = null; setSolving(false); setStatus('Search cancelled.') }
  return { def, history, current, located, step, setStep, visibleDetail, setDetail, searchDetail, setSearchDetail,
    ready, won, markSaved, source, zoom, setZoom, solving, status, move, load, solve, reset, cancel }
}
