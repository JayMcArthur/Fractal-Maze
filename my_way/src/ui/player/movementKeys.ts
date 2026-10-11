import { useEffect } from 'react'
import type { DirectionBit } from '../../core/model/squareRecursive'

export function keyToDirection(key: string): DirectionBit | null {
  const directions: Record<string, DirectionBit> = {
    ArrowUp: 8,
    w: 8,
    i: 8,
    ArrowDown: 2,
    s: 2,
    k: 2,
    ArrowRight: 4,
    d: 4,
    l: 4,
    ArrowLeft: 1,
    a: 1,
    j: 1,
  }
  return directions[key.length === 1 ? key.toLowerCase() : key] ?? null
}

export function useSquareKeyboard({
  enabled,
  won,
  move,
  undo,
  reset,
  onHelp,
  onFullscreen,
}: {
  enabled: boolean
  won: boolean
  move: (direction: DirectionBit) => void
  undo: () => void
  reset: () => void
  onHelp: () => void
  onFullscreen: () => void
}) {
  useEffect(() => {
    if (!enabled) return
    const keydown = (event: KeyboardEvent) => {
      if (
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLSelectElement ||
        event.target instanceof HTMLTextAreaElement ||
        document.querySelector('[role="dialog"]')
      )
        return
      const key = event.key.toLowerCase()
      const display: Record<string, () => void> = { h: onHelp, '?': onHelp, f: onFullscreen }
      const action = display[key]
      if (action) {
        event.preventDefault()
        action()
        return
      }
      if (won) return
      const controls: Record<string, () => void> = { z: undo, backspace: undo, r: reset }
      if (controls[key]) {
        event.preventDefault()
        controls[key]()
        return
      }
      const direction = keyToDirection(event.key)
      if (direction !== null) {
        event.preventDefault()
        move(direction)
      }
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [enabled, won, move, undo, reset, onHelp, onFullscreen])
}
