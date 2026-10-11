import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Routes, Route, useNavigate } from 'react-router-dom'
const ReferencePage = lazy(() =>
  import('./ui/library/ReferencePage').then((m) => ({ default: m.ReferencePage }))
)
import { DragDropZone } from './ui/components/DragDropZone'
import { saveProject } from './app/projects/db'
import { decodeShareUrl } from './core/io/shareUrl'
const LibraryPage = lazy(() =>
  import('./ui/library/LibraryPage').then((m) => ({ default: m.LibraryPage }))
)
const PlayerPage = lazy(() =>
  import('./ui/player/PlayerPage').then((m) => ({ default: m.PlayerPage }))
)
const EditorPage = lazy(() =>
  import('./ui/editor/EditorPage').then((m) => ({ default: m.EditorPage }))
)
const ReplayPage = lazy(() =>
  import('./ui/replay/ReplayPage').then((m) => ({ default: m.ReplayPage }))
)
const SolverPage = lazy(() =>
  import('./ui/solver/SolverPage').then((m) => ({ default: m.SolverPage }))
)
const HomePage = lazy(() => import('./ui/HomePage').then((m) => ({ default: m.HomePage })))
const WorkbenchPage = lazy(() =>
  import('./ui/workbench/WorkbenchPage').then((m) => ({ default: m.WorkbenchPage }))
)
const BuildPage = lazy(() =>
  import('./ui/editor/BuildPage').then((m) => ({ default: m.BuildPage }))
)

function ShareUrlHandler() {
  const navigate = useNavigate()

  useEffect(() => {
    const doc = decodeShareUrl(window.location.search)
    if (doc) {
      void saveProject(doc).then(() => navigate(`/play/${doc.metadata.id}`))
    }
  }, [navigate])

  return null
}

function AppRoutes() {
  const navigate = useNavigate()

  return (
    <DragDropZone
      onImport={(doc) => {
        navigate(`/play/${doc.metadata.id}`)
      }}
    >
      <ShareUrlHandler />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/reference/:id" element={<ReferencePage />} />
        <Route path="/play/:id" element={<PlayerPage />} />
        <Route path="/editor" element={<EditorPage />} />
        <Route path="/build" element={<BuildPage />} />
        <Route path="/editor/:id" element={<EditorPage />} />
        <Route path="/solver" element={<SolverPage />} />
        <Route path="/analysis" element={<Navigate to="/solver" replace />} />
        <Route path="/workbench/:id" element={<WorkbenchPage />} />
        <Route path="/replays" element={<Navigate to="/library" replace />} />
        <Route path="/replay/:id" element={<ReplayPage />} />
        <Route path="/docs" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/library" replace />} />
      </Routes>
    </DragDropZone>
  )
}

export default function App() {
  return (
    <Suspense
      fallback={
        <main className="empty-state empty-state--page">
          <p>Loading maze workspace…</p>
        </main>
      }
    >
      <AppRoutes />
    </Suspense>
  )
}
