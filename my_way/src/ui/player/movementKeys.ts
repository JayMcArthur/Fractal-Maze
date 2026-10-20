import { useEffect, useLayoutEffect, useRef } from 'react'
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

function keyboardBlocked(target: EventTarget | null) {
  return (
    (target instanceof Element &&
      target.closest('input,select,textarea,[contenteditable]:not([contenteditable="false"])')) ||
    document.querySelector('[role="dialog"]')
  )
}

/** Retry held directions through animation; releasing or leaving the game cancels the hold. */
export function useMovementKeyboard({
  enabled,
  move,
}: {
  enabled: boolean
  move: (direction: DirectionBit) => void
}) {
  const latestMove = useRef(move)
  useLayoutEffect(() => {
    latestMove.current = move
  }, [move])
  useEffect(() => {
    if (!enabled) return
    let held: { key: string; direction: DirectionBit } | null = null
    let timer = 0
    const cancel = () => {
      held = null
      window.clearTimeout(timer)
    }
    const repeat = () => {
      if (!held || keyboardBlocked(document.activeElement) || document.hidden) {
        cancel()
        return
      }
      latestMove.current(held.direction)
      timer = window.setTimeout(repeat, 120)
    }
    const keydown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || keyboardBlocked(event.target)) {
        cancel()
        return
      }
      const direction = keyToDirection(event.key)
      if (direction === null || event.defaultPrevented) return
      event.preventDefault()
      if (event.repeat) return
      cancel()
      held = { key: event.key.toLowerCase(), direction }
      latestMove.current(direction)
      timer = window.setTimeout(repeat, 250)
    }
    const keyup = (event: KeyboardEvent) => {
      if (held?.key === event.key.toLowerCase()) cancel()
    }
    const focus = (event: FocusEvent) => {
      if (keyboardBlocked(event.target)) cancel()
    }
    const visibility = () => {
      if (document.hidden) cancel()
    }
    window.addEventListener('keydown', keydown)
    window.addEventListener('keyup', keyup)
    window.addEventListener('blur', cancel)
    document.addEventListener('focusin', focus)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      cancel()
      window.removeEventListener('keydown', keydown)
      window.removeEventListener('keyup', keyup)
      window.removeEventListener('blur', cancel)
      document.removeEventListener('focusin', focus)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [enabled])
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
  useMovementKeyboard({ enabled: enabled && !won, move })
  useEffect(() => {
    if (!enabled) return
    const keydown = (event: KeyboardEvent) => {
      if (
        event.repeat ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        keyboardBlocked(event.target)
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
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [enabled, won, undo, reset, onHelp, onFullscreen])
}
