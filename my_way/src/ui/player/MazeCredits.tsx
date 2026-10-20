import type { RecursiveMazeDocument } from '../../core/model/RecursiveMazeDocument'
import { mazeCredits } from '../../app/library/mazeCredits'

export function MazeCredits({ doc }: { doc: RecursiveMazeDocument }) {
  const { author, license, links } = mazeCredits(doc)
  if (!author && !links.length && !license) return null
  return (
    <section className="maze-credits" aria-label="Maze credits">
      <div>
        <h2>Credits & original maze</h2>
        {author && <p>{author}</p>}
        {license && <p>{license}</p>}
      </div>
      {links.length > 0 && (
        <ul>
          {links.map((link) => (
            <li key={link.href}>
              <a href={link.href} target="_blank" rel="noreferrer">
                {link.label} ↗
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
