/**
 * Shared navigation bar.
 * Links Home, Play, Library, Solve & analyze and Build.
 */
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/play/alice-in-wonderland', label: 'Play' },
  { to: '/library', label: 'Library' },
  { to: '/solver', label: 'Solve & analyze' },
  { to: '/build', label: 'Build' },
]

export function NavBar() {
  const location = useLocation()
  const [open, setOpen] = useState(false)

  const isActive = (to: string) => {
    if (to === '/') return location.pathname === '/'
    if (to.startsWith('/play')) return location.pathname.startsWith('/play')
    if (to === '/build') return ['/build', '/editor', '/workbench'].some((path) => location.pathname.startsWith(path))
    return location.pathname.startsWith(to)
  }

  return (
    <nav className="instrument-nav" aria-label="Main navigation">
      <div className="instrument-nav__inner">
        <Link to="/" className="instrument-brand" aria-label="Fractal Maze — home">
          <span className="instrument-brand__mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>
            <strong>Fractal</strong>
            <em>Maze</em>
          </span>
        </Link>

        {/* Desktop links */}
        <div className="instrument-nav__links">
          {NAV_LINKS.map((link) => (
            <Link key={link.to} to={link.to} className={isActive(link.to) ? 'is-active' : ''}>
              {link.label}
            </Link>
          ))}
        </div>

        {/* Mobile hamburger */}
        <button
          className="instrument-nav__toggle"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
          aria-expanded={open}
          aria-controls="mobile-navigation"
        >
          {open ? 'Close' : 'Menu'}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="instrument-nav__mobile" id="mobile-navigation">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setOpen(false)}
              className={isActive(link.to) ? 'is-active' : ''}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  )
}
