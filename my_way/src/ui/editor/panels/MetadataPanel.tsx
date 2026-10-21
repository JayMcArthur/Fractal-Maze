import { MazeCoverPicker } from '../../components/MazeCoverPicker'
import type { RecursiveMazeDocument } from '../../../core/model/RecursiveMazeDocument'
import type { useEditorStore } from '../../../app/store/editorSlice'

type Store = ReturnType<typeof useEditorStore.getState>

interface MetadataPanelProps {
  doc: RecursiveMazeDocument
  store: Pick<Store, 'updateMetadata'>
}

export function MetadataPanel({ doc, store }: MetadataPanelProps) {
  const { metadata } = doc

  return (
    <div className="flex flex-col gap-3 text-sm">
      <MazeCoverPicker cover={metadata.cover} onChange={cover => store.updateMetadata({ cover })} />
      <label className="flex flex-col gap-1">
        <span className="text-muted font-semibold">Title</span>
        <input
          type="text"
          value={metadata.title}
          onChange={(e) => store.updateMetadata({ title: e.target.value })}
          className="surface-muted text-ink rounded px-2 py-1"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-muted">Author</span>
        <input
          type="text"
          value={metadata.author ?? ''}
          onChange={(e) => store.updateMetadata({ author: e.target.value || undefined })}
          className="surface-muted text-ink rounded px-2 py-1"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-muted">Source URL</span>
        <input
          type="text"
          value={metadata.source ?? ''}
          onChange={(e) => store.updateMetadata({ source: e.target.value || undefined })}
          className="surface-muted text-ink rounded px-2 py-1"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-muted">Tags (comma-separated)</span>
        <input
          type="text"
          value={metadata.tags.join(', ')}
          onChange={(e) =>
            store.updateMetadata({
              tags: e.target.value
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean),
            })
          }
          className="surface-muted text-ink rounded px-2 py-1"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-muted">License</span>
        <input
          type="text"
          value={metadata.license ?? ''}
          onChange={(e) => store.updateMetadata({ license: e.target.value || undefined })}
          className="surface-muted text-ink rounded px-2 py-1"
        />
      </label>
      <div className="text-muted text-xs border-t border-subtle pt-2 flex flex-col gap-0.5">
        <span>ID: {metadata.id}</span>
        <span>Created: {new Date(metadata.createdAt).toLocaleString()}</span>
        <span>Updated: {new Date(metadata.updatedAt).toLocaleString()}</span>
      </div>
    </div>
  )
}
