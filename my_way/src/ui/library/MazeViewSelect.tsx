import { useNavigate } from 'react-router-dom'
import { viewsForMaze } from '../../app/library/mazeViews'

export function MazeViewSelect({ id, play = false }: { id: string; play?: boolean }) {
  const navigate = useNavigate(), views = viewsForMaze(id)
  if (views.length < 2) return null
  return <label className="maze-view-select">
    <span>Maze view</span>
    <select className="control" aria-label="Maze view" value={id}
      onChange={(event) => navigate(`/play/${event.target.value}`)}>
      {views.map((view) => <option key={view.id} value={view.id}>{view.label}</option>)}
    </select>
    {play && <small>Changing views starts a new run. Saved replays keep their original view.</small>}
  </label>
}
