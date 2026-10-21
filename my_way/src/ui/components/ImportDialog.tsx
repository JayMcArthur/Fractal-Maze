import { Dialog } from './Dialog'
/**
 * Import dialog: file picker + drag-and-drop, format auto-detection,
 * validation preview, confirm to load.
 */
import { useState, useCallback, useEffect } from 'react'
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
    <Dialog title="Import Maze" onClose={onClose} footer={<>
      <button className="control" onClick={onClose}>Cancel</button>
      <button className="control control--primary" onClick={handleConfirm} disabled={!preview || errors.length > 0}>Load Maze</button>
    </>}>
        {/* Drop zone */}
        <label
          className={`import-drop border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            dragging ? 'border-info notice-info' : 'border-subtle '
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <span className="text-muted mb-1 block">
            {initialFile ? `Loaded: ${initialFile.name}` : 'Drop a file here or click to browse'}
          </span>
          <span className="text-muted text-sm block">.maze · .fmaze · .pda.json · block/gate .json · repeated .txt</span>
          <input
            type="file"
            accept=".maze,.fmaze,.json,.txt"
            className="artwork-file"
            aria-label="Choose maze file"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>

        {/* Error */}
        {error && (
          <div role="alert" className="notice-danger border border-danger rounded p-3 text-danger text-sm">
            {error}
          </div>
        )}

        {/* Preview */}
        {preview && (
          <div className="flex flex-col gap-3">
            <div className="surface-muted rounded-lg p-4 flex flex-col gap-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-ink text-lg leading-tight">
                    {preview.doc.metadata.title}
                  </p>
                  {preview.doc.metadata.author && (
                    <p className="text-muted text-sm">by {preview.doc.metadata.author}</p>
                  )}
                </div>
                <span className="px-2 py-0.5 notice-info text-info rounded text-xs whitespace-nowrap ml-2">
                  {preview.formatName}
                </span>
              </div>
              <p className="text-muted text-sm">Type: {preview.doc.representationType}</p>
              {preview.docs.length > 1 && <p>All {preview.docs.length} mazes will be saved to your library.</p>}
            </div>

            {/* Errors */}
            {errors.length > 0 && (
              <div role="alert" className="notice-danger border border-danger rounded p-3 flex flex-col gap-1">
                <p className="text-danger font-semibold text-sm">
                  {errors.length} error{errors.length !== 1 ? 's' : ''} — maze cannot be loaded
                </p>
                {errors.slice(0, 3).map((e, i) => (
                  <p key={i} className="text-danger text-xs">{e.message}</p>
                ))}
                {errors.length > 3 && (
                  <p className="text-danger text-xs">…and {errors.length - 3} more</p>
                )}
              </div>
            )}
            {warnings.length > 0 && errors.length === 0 && (
              <div className="notice-warning border border-warning rounded p-3">
                <p className="text-warning text-sm">
                  {warnings.length} warning{warnings.length !== 1 ? 's' : ''} — maze may have
                  issues but can still be loaded
                </p>
              </div>
            )}
          </div>
        )}

    </Dialog>
  )
}
