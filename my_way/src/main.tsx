import './core/validate/configureValidation'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { staticRoute } from './core/io/staticRoute'

const route = staticRoute(window.location.search, window.location.origin, import.meta.env.BASE_URL)
if (route) window.history.replaceState(null, '', route)

const router = createBrowserRouter([{ path: '*', element: <App /> }], {
  basename: import.meta.env.BASE_URL.replace(/\/$/, ''),
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
)
