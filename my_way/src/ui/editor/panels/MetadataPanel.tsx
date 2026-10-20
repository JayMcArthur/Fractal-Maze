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
        <span className="text-gray-300 font-semibold">Title</span>
        <input
          type="text"
          value={metadata.title}
          onChange={(e) => store.updateMetadata({ title: e.target.value })}
          className="bg-gray-700 text-white rounded px-2 py-1"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-gray-400">Author</span>
        <input
          type="text"
          value={metadata.author ?? ''}
          onChange={(e) => store.updateMetadata({ author: e.target.value || undefined })}
          className="bg-gray-700 text-white rounded px-2 py-1"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-gray-400">Source URL</span>
        <input
          type="text"
          value={metadata.source ?? ''}
          onChange={(e) => store.updateMetadata({ source: e.target.value || undefined })}
          className="bg-gray-700 text-white rounded px-2 py-1"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-gray-400">Tags (comma-separated)</span>
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
          className="bg-gray-700 text-white rounded px-2 py-1"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-gray-400">License</span>
        <input
          type="text"
          value={metadata.license ?? ''}
          onChange={(e) => store.updateMetadata({ license: e.target.value || undefined })}
          className="bg-gray-700 text-white rounded px-2 py-1"
        />
      </label>
      <div className="text-gray-600 text-xs border-t border-gray-700 pt-2 flex flex-col gap-0.5">
        <span>ID: {metadata.id}</span>
        <span>Created: {new Date(metadata.createdAt).toLocaleString()}</span>
        <span>Updated: {new Date(metadata.updatedAt).toLocaleString()}</span>
      </div>
    </div>
  )
}
