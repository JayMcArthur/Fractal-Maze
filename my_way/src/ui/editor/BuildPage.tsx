import { Link } from 'react-router-dom'
import { NavBar } from '../components/NavBar'

const choices = [
  { title: 'Draw a corridor maze', to: '/editor', action: 'Open grid builder',
    description: 'Connect cells, add recursive blocks, and set the player and finish. Preview your maze before saving.' },
  { title: 'Convert a drawing', to: '/workbench/new', action: 'Start a conversion',
    description: 'Upload an SVG or image, label its connected paths, and map the gates between copies. Keep the conversion WIP while reviewing it.' },
  { title: 'Edit a maze in the collection', to: '/library', action: 'Choose a maze',
    description: 'Choose a maze and view, then use Edit or Inspect. Save your changes in this browser or export a portable copy.' },
  { title: 'Construct an infinite proof', to: '/solver?type=infinite', action: 'Choose a proof maze',
    description: 'Choose the movement rules and endpoints, build witness routes, and check your claim. The notebook starts empty.' },
]

export function BuildPage() {
  return <div className="app-page build-page">
    <NavBar />
    <main className="page-frame">
      <header className="page-heading">
        <div><p className="maze-kicker">Create and explore</p><h1>Build a maze.</h1>
          <p>Start with a grid or a drawing. Your projects stay in your Library.</p></div>
        <Link className="control" to="/library">Your Library →</Link>
      </header>
      <div className="build-choices">
        {choices.map((choice, index) => <section className={`build-choice ${index < 2 ? 'build-choice--create' : ''}`} key={choice.to}>
          <span className="maze-kicker">{['Grid', 'Drawing', 'Existing maze', 'Proof'][index]}</span>
          <h2>{choice.title}</h2><p>{choice.description}</p>
          <Link className={`control ${index < 2 ? 'control--primary' : ''}`} to={choice.to}>{choice.action} →</Link>
        </section>)}
      </div>
    </main>
  </div>
}
