import { useCallback, useEffect, useRef } from 'react'
import { useBlocker } from 'react-router-dom'

/** A saved snapshot can be left safely; moving again creates a new unsaved revision. */
export function useRunGuard(unfinished: boolean, revision: object | number) {
  const saved = useRef<object | number | null>(null)
  const shouldBlock = useCallback(
    () => unfinished && saved.current !== revision,
    [unfinished, revision]
  )
  const blocker = useBlocker(shouldBlock)
  useEffect(() => {
    if (blocker.state !== 'blocked') return
    if (window.confirm('Leave this unfinished run? Save a replay first if you want to keep it.'))
      blocker.proceed()
    else blocker.reset()
  }, [blocker])
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!shouldBlock()) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [shouldBlock])
  return useCallback(() => {
    saved.current = revision
  }, [revision])
}
