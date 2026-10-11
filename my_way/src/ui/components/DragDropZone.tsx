/**
 * Global drag-and-drop overlay. Wrap app root to intercept file drops anywhere.
 * When a file is dropped, opens the ImportDialog.
 */
import { useState, useCallback, useEffect } from 'react'
import { ImportDialog } from './ImportDialog'
import type { RecursiveMazeDocument } from '../../core/model/RecursiveMazeDocument'

interface DragDropZoneProps {
  children: React.ReactNode
  onImport: (doc: RecursiveMazeDocument) => void
}

export function DragDropZone({ children, onImport }: DragDropZoneProps) {
  const [showImport, setShowImport] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  const handleDragOver = useCallback((e: DragEvent) => {
    if (e.dataTransfer?.types.includes('Files')) {
      e.preventDefault()
      setDragOver(true)
    }
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOver(false)
  }, [])

  const handleDrop = useCallback((e: DragEvent) => {
    if (e.defaultPrevented) return
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer?.files[0]
    if (!file) return
    setPendingFile(file)
    setShowImport(true)
  }, [])

  useEffect(() => {
    document.addEventListener('dragover', handleDragOver)
    document.addEventListener('dragleave', handleDragLeave)
    document.addEventListener('drop', handleDrop)
    return () => {
      document.removeEventListener('dragover', handleDragOver)
      document.removeEventListener('dragleave', handleDragLeave)
      document.removeEventListener('drop', handleDrop)
    }
  }, [handleDragOver, handleDragLeave, handleDrop])

  return (
    <>
      {dragOver && !showImport && (
        <div className="fixed inset-0 bg-blue-900/40 border-4 border-blue-400 border-dashed z-50 pointer-events-none flex items-center justify-center">
          <div className="bg-gray-800 rounded-xl px-8 py-6 text-center shadow-2xl pointer-events-none">
            <p className="text-2xl font-bold text-white">Drop maze file to import</p>
            <p className="text-blue-300 text-sm mt-1">.maze · .fmaze · block/gate .json · repeated .txt</p>
          </div>
        </div>
      )}
      {showImport && (
        <ImportDialog
          onImport={(doc) => {
            onImport(doc)
            setPendingFile(null)
          }}
          onClose={() => {
            setShowImport(false)
            setPendingFile(null)
          }}
          initialFile={pendingFile ?? undefined}
        />
      )}
      {children}
    </>
  )
}
