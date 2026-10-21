import { useEffect, useId, useRef, type ReactNode } from 'react'

/** Native focus containment and one scrollable body for modal surfaces. */
export function Dialog({ title, eyebrow, description, children, footer, onClose,
  className = '', closeLabel = 'Close' }: {
  title: string
  eyebrow?: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  onClose?: () => void
  className?: string
  closeLabel?: string
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current!
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const overflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      dialog.close()
      document.body.style.overflow = overflow
      previousFocus?.focus({ preventScroll: true })
    }
  }, [])
  return (
    <dialog ref={ref} className={`app-dialog ${className}`} role="dialog" aria-modal="true" aria-labelledby={titleId}
      onCancel={event => { event.preventDefault(); onClose?.() }}>
      <header className="app-dialog__header">
        <div>
          {eyebrow && <p className="maze-kicker">{eyebrow}</p>}
          <h2 id={titleId}>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {onClose && <button className="icon-control" aria-label={closeLabel} onClick={onClose}>×</button>}
      </header>
      <div className="app-dialog__body">{children}</div>
      {footer && <footer className="app-dialog__footer">{footer}</footer>}
    </dialog>
  )
}
