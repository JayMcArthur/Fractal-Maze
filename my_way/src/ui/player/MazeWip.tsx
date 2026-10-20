import type { RecursiveMazeDocument } from '../../core/model/RecursiveMazeDocument'
import { assetUrl } from '../../core/io/assetUrl'

export function MazeWip({ doc }: { doc: RecursiveMazeDocument }) {
  const image = doc.metadata.cover ?? doc.artwork?.asset
  return (
    <section className="maze-wip" aria-labelledby="maze-wip-title">
      {image && <img src={assetUrl(image)} alt={doc.metadata.title} />}
      <div>
        <span className="signal-badge">Work in progress</span>
        <h2 id="maze-wip-title">Playable maze is WIP</h2>
        <p>The block maze and movement rules are still being finished.</p>
      </div>
    </section>
  )
}
