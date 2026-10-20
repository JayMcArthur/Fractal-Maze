import { useState } from 'react'
import { importImage } from '../../core/io/importImage'

export function MazeCoverPicker({ cover, onChange }: {
  cover?: string
  onChange: (cover: string | undefined) => void
}) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  return (
    <section className="maze-cover-picker" aria-label="Maze cover">
      <h2>Cover image</h2>
      {cover && <img src={cover} alt="Custom maze cover" />}
      <div className="button-row">
        <label className="control">
          Choose cover
          <input type="file" className="artwork-file" aria-label="Choose cover image"
            accept=".svg,.png,.jpg,.jpeg,.webp,.gif" disabled={loading}
            onChange={event => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (!file) return
              setLoading(true)
              setError('')
              void importImage(file).then(onChange)
                .catch((failure: Error) => setError(failure.message))
                .finally(() => setLoading(false))
            }} />
        </label>
        {cover && <button className="control" disabled={loading}
          onClick={() => onChange(undefined)}>Remove cover</button>}
      </div>
      <p>Optional image for your Library card. SVG, PNG, JPEG, WebP or GIF, up to 5 MB.</p>
      {error && <p role="alert">{error}</p>}
    </section>
  )
}
