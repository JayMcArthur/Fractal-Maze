/**
 * Import dialog: file picker + drag-and-drop, format auto-detection,
 * validation preview, confirm to load.
 */
import { useState, useCallback, useRef, useEffect } from 'react'
import type { RecursiveMazeDocument } from '../../core/model/RecursiveMazeDocument'
import { detectAdapter } from '../../core/io/detectFormat'
import { saveProject } from '../../app/projects/db'
import { validateMaze } from '../../core/validate/validateMaze'
import type { ValidationResult } from '../../core/validate/ValidationResult'

interface ImportDialogProps {
  onImport: (doc: RecursiveMazeDocument) => void
  onClose: () => void
  /** Pre-loaded file (e.g. from global drag-and-drop) */
  initialFile?: File
}

interface ParsedPreview {
  doc: RecursiveMazeDocument
  docs: RecursiveMazeDocument[]
  formatName: string
  validation: ValidationResult
}

export function ImportDialog({ onImport, onClose, initialFile }: ImportDialogProps) {
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<ParsedPreview | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback((file: File) => {
    setError(null)
    setPreview(null)
    if (file.size > 20 * 1024 * 1024) {
      setError('Choose a maze file smaller than 20 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const raw = e.target?.result as string
      const adapter = detectAdapter(raw)
      if (!adapter) {
        setError('Unrecognised format. Supported: .maze · .fmaze · .pda.json · FRACTAL-MAZE.v2 · Koteitan block JSON · repeated maze text')
        return
      }
      try {
        const docs = adapter.importCollection ? adapter.importCollection(raw) : [adapter.import(raw)]
        const doc = docs[0]
        const results = docs.map(validateMaze)
        const validation = { valid: results.every((result) => result.valid), issues: results.flatMap((result) => result.issues) }
        setPreview({ doc, docs, formatName: adapter.formatName, validation })
      } catch (err) {
        setError(`Parse error: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
    reader.readAsText(file)
  }, [])

  // Auto-process file passed from global drag-and-drop
  useEffect(() => {
    if (!initialFile) return
    const timer = window.setTimeout(() => processFile(initialFile), 0)
    return () => window.clearTimeout(timer)
  }, [initialFile, processFile])

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return
      processFile(files[0])
    },
    [processFile]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      handleFiles(e.dataTransfer.files)
    },
    [handleFiles]
  )

  const handleConfirm = async () => {
    if (!preview) return
    try {
      await Promise.all(preview.docs.map(saveProject))
      onImport(preview.doc)
      onClose()
    } catch (error) { setError(`Could not save the import: ${error instanceof Error ? error.message : String(error)}`) }
  }

  const errors = preview?.validation.issues.filter((i) => i.severity === 'error') ?? []
  const warnings = preview?.validation.issues.filter((i) => i.severity === 'warning') ?? []

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl w-full max-w-lg shadow-2xl flex flex-col gap-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Import Maze</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Drop zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            dragging ? 'border-blue-400 bg-blue-900/20' : 'border-gray-600 hover:border-gray-400'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <p className="text-gray-300 mb-1">
            {initialFile ? `Loaded: ${initialFile.name}` : 'Drop a file here or click to browse'}
          </p>
          <p className="text-gray-500 text-sm">.maze · .fmaze · .pda.json · block/gate .json · repeated .txt</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".maze,.fmaze,.json,.txt"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-900/40 border border-red-700 rounded p-3 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Preview */}
        {preview && (
          <div className="flex flex-col gap-3">
            <div className="bg-gray-700 rounded-lg p-4 flex flex-col gap-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-white text-lg leading-tight">
                    {preview.doc.metadata.title}
                  </p>
                  {preview.doc.metadata.author && (
                    <p className="text-gray-400 text-sm">by {preview.doc.metadata.author}</p>
                  )}
                </div>
                <span className="px-2 py-0.5 bg-blue-900 text-blue-200 rounded text-xs whitespace-nowrap ml-2">
                  {preview.formatName}
                </span>
              </div>
              <p className="text-gray-400 text-sm">Type: {preview.doc.representationType}</p>
              {preview.docs.length > 1 && <p>All {preview.docs.length} mazes will be saved to your library.</p>}
            </div>

            {/* Errors */}
            {errors.length > 0 && (
              <div className="bg-red-900/30 border border-red-700 rounded p-3 flex flex-col gap-1">
                <p className="text-red-300 font-semibold text-sm">
                  {errors.length} error{errors.length !== 1 ? 's' : ''} — maze cannot be loaded
                </p>
                {errors.slice(0, 3).map((e, i) => (
                  <p key={i} className="text-red-400 text-xs">{e.message}</p>
                ))}
                {errors.length > 3 && (
                  <p className="text-red-500 text-xs">…and {errors.length - 3} more</p>
                )}
              </div>
            )}
            {warnings.length > 0 && errors.length === 0 && (
              <div className="bg-yellow-900/30 border border-yellow-700 rounded p-3">
                <p className="text-yellow-300 text-sm">
                  {warnings.length} warning{warnings.length !== 1 ? 's' : ''} — maze may have
                  issues but can still be loaded
                </p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!preview || errors.length > 0}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded font-semibold"
          >
            Load Maze
          </button>
        </div>
      </div>
    </div>
  )
}
