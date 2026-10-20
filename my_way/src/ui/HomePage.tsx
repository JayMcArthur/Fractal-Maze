import { Link } from 'react-router-dom'
import { NavBar } from './components/NavBar'
import { SquareMazeCanvas } from './components/SquareMazeCanvas'
import aliceSource from '../data/mazes/1_-_alice_in_wonderland.maze?raw'
import { orelMazeImportAdapter } from '../core/io/adapters/orelMazeAdapter'
import { assetUrl } from '../core/io/assetUrl'

const alicePreview = orelMazeImportAdapter.import(aliceSource)
alicePreview.metadata.title = 'Alice and the Fractal Hedge Maze'

export function HomePage() {
  return (
    <div className="app-page home-page">
      <NavBar />
      <main className="page-frame">
        <section className="home-hero">
          <div>
            <p className="maze-kicker">A maze inside a maze</p>
            <h1>
              Find your way
              <br />
              through infinity.
            </h1>
            <p>
              Explore recursive mazes on their original drawings or block remakes. Every colored
              copy takes you deeper into the same puzzle.
            </p>
            <div className="button-row">
              <Link className="control control--primary" to="/play/alice-in-wonderland">
                Play Alice
              </Link>
              <Link className="control" to="/library">
                Browse by author
              </Link>
            </div>
          </div>
          <Link
            className="home-maze-preview"
            to="/play/alice-in-wonderland"
            aria-label="Play Alice’s block remake"
          >
            <SquareMazeCanvas
              doc={alicePreview}
              maxDepth={3}
              maxDisplayWidth={460}
              showBlockLabels
              showBreadcrumbs={false}
            />
          </Link>
        </section>
        <section className="home-actions" aria-label="Get started">
          <Link to="/library">
            <span>01 / Play</span>
            <h2>Choose a maze</h2>
            <p>
              Browse the authors. Pick a source drawing or a block view, then explore its nested
              copies.
            </p>
          </Link>
          <Link to="/solver">
            <span>02 / Solve & analyze</span>
            <h2>Understand the paths</h2>
            <p>
              Simplify corridors to a PDA, search for finite routes, or build an infinite proof from
              your own witnesses.
            </p>
          </Link>
          <Link to="/build">
            <span>03 / Build</span>
            <h2>Make your own</h2>
            <p>
              Draw block corridors, trace an image, and connect the paths through recursive copies.
            </p>
          </Link>
        </section>
        <section className="home-learn">
          <h2>How to play</h2>
          <div className="home-instructions">
            <p>
              <strong>Move.</strong> Use arrows, WASD, IJKL or direction buttons. On a source
              drawing, one press follows the route to its next junction or gate. Press again to
              choose where to go.
            </p>
            <p>
              <strong>Enter a copy.</strong> Cross a colored block or an image gate. Your copy stack
              shows where you are; Undo returns to the previous move.
            </p>
            <p>
              <strong>Watch a solution.</strong> Choose a replay in the bar beneath the maze. Play,
              pause, step or scrub its route. Return to play starts your own run.
            </p>
          </div>
        </section>
        <div className="home-details">
          <details>
            <summary>Controls and saved files</summary>
            <p>
              Z or Backspace undoes a move; R restarts. In block play, F opens fullscreen and H
              shows the keyboard map. Builder shortcuts: Ctrl/Cmd+Z to undo, Ctrl/Cmd+Shift+Z to
              redo, Ctrl/Cmd+S to save.
            </p>
            <p>
              Mazes and recordings stay in this browser. Export a maze or replay to keep a portable
              copy. Import replays using the bar beneath any maze; their recorded maze snapshot
              opens with them.
            </p>
          </details>
          <details>
            <summary>Images, PDAs and infinite proofs</summary>
            <p>
              A connected corridor is one PDA state. Entering a copy pushes its name onto the stack,
              and leaving it pops that name. Verified source drawings and block mappings share those
              transitions; their geometry determines where you walk.
            </p>
            <p>
              WIP conversions retain their source images and editable connections. Review crossings
              and gates before relying on their topology. Balanced PDA search decides finite surface
              routes in the declared model. Infinite and Cantor movement use separate checked
              witnesses in the proof notebook.
            </p>
            <Link className="control" to="/solver?type=infinite">
              Choose an infinite maze
            </Link>
            <Link className="control" to="/library?tab=references">
              Source artwork
            </Link>
          </details>
          <details>
            <summary>Other maze rules</summary>
            <p>
              Backlot is a recursive grid tour: satisfy each studio’s dots and row/column counts
              without crossing or retracing. Omeometo expands a block pattern into a finite grid,
              with movement and search at the chosen expansion depth. Repeated directed mazes and
              recursive ports retain their native connection rules.
            </p>
            <div className="button-row">
              <Link className="control" to="/play/backlot">
                Play Backlot
              </Link>
              <Link className="control" to="/play/koteitan-block">
                Play Omeometo
              </Link>
            </div>
          </details>
          <details>
            <summary>Original programs and research</summary>
            <p>
              <a
                href={assetUrl('programs/repeated-maze/index.html')}
                target="_blank"
                rel="noreferrer"
              >
                The original repeated-maze tool
              </a>{' '}
              supports center terminals, origin rules and connection editing.{' '}
              <a href="https://github.com/koteitan/repeated-maze" target="_blank" rel="noreferrer">
                Koteitan’s project
              </a>{' '}
              also has Minsky constructions, Lee-algorithm tools and Lean sources.
            </p>
            <p>
              <a
                href="https://www.astrolog.org/labyrnth/daedalus.htm"
                target="_blank"
                rel="noreferrer"
              >
                Daedalus
              </a>{' '}
              includes recursive wire-maze generation and pin checks.{' '}
              <a
                href="https://drops.dagstuhl.de/entities/document/10.4230/LIPIcs.FUN.2026.9"
                target="_blank"
                rel="noreferrer"
              >
                The 2026 MIDTERM paper
              </a>{' '}
              studies finite routes in recursive wire mazes. Infinite movement assumptions are
              explicit in this app’s proof notebook.
            </p>
          </details>
        </div>
      </main>
    </div>
  )
}
