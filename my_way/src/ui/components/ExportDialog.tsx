import { Dialog } from './Dialog'
/**
 * Export dialog: choose format and download maze file.
 */
import { useState } from 'react'
import type { RecursiveMazeDocument } from '../../core/model/RecursiveMazeDocument'
import { fmazeExportAdapter } from '../../core/io/adapters/fmazeAdapter'
import { orelMazeExportAdapter } from '../../core/io/adapters/orelMazeAdapter'
import { amurielagiExportAdapter } from '../../core/io/adapters/amurielagiAdapter'
import { repeatedExportAdapter } from '../../core/io/adapters/repeatedAdapter'
import { downloadFile } from '../../core/io/downloadFile'
import { encodeShareUrl } from '../../core/io/shareUrl'

interface ExportDialogProps {
  doc: RecursiveMazeDocument
  onClose: () => void
}

type ExportFormat = 'fmaze' | 'maze' | 'source'

export function ExportDialog({ doc, onClose }: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('fmaze')
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [shareError, setShareError] = useState(false)

  const canExportOrel = doc.representationType === 'squareRecursive'

  const handleDownload = () => {
    const safeName = doc.metadata.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()
    if (format === 'fmaze') {
      const content = fmazeExportAdapter.export(doc)
      downloadFile(content, `${safeName}.fmaze`, 'application/json')
    } else if (format === 'source') {
      const adapter = doc.representationType === 'geometricRecursive' ? amurielagiExportAdapter : repeatedExportAdapter
      downloadFile(adapter.export(doc), safeName + adapter.fileExtension)
    } else {
      if (!canExportOrel) return
      const content = orelMazeExportAdapter.export(doc)
      downloadFile(content, `${safeName}.maze`, 'text/plain')
    }
    onClose()
  }

  const handleShare = () => {
    setShareError(false)
    setShareUrl(null)
    const url = encodeShareUrl(doc, window.location.href)
    if (url) {
      setShareUrl(url)
      navigator.clipboard?.writeText(url).catch(() => {})
    } else {
      setShareError(true)
    }
  }

  return (
    <Dialog title="Export Maze" onClose={onClose} footer={<>
      <button className="control" onClick={onClose}>Cancel</button>
      <button className="control control--primary" onClick={handleDownload}>Download</button>
    </>}>
        {/* Maze info */}
        <div className="surface-muted rounded p-3">
          <p className="font-semibold text-ink">{doc.metadata.title}</p>
          {doc.metadata.author && (
            <p className="text-muted text-sm">by {doc.metadata.author}</p>
          )}
        </div>

        {/* Format selector */}
        <div className="flex flex-col gap-2">
          <label className="text-muted text-sm font-semibold">Format</label>
          <div className="flex flex-col gap-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="format"
                value="fmaze"
                checked={format === 'fmaze'}
                onChange={() => setFormat('fmaze')}
                className="mt-1"
              />
              <div>
                <p className="text-ink font-medium">.fmaze (canonical)</p>
                <p className="text-muted text-xs">
                  Full JSON round-trip. Preserves all data. Recommended.
                </p>
              </div>
            </label>
            <label
              className={`flex items-start gap-3 ${canExportOrel ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}
            >
              <input
                type="radio"
                name="format"
                value="maze"
                checked={format === 'maze'}
                onChange={() => setFormat('maze')}
                disabled={!canExportOrel}
                className="mt-1"
              />
              <div>
                <p className="text-ink font-medium">.maze (Orel compatible)</p>
                <p className="text-muted text-xs">
                  Text format compatible with Orelcosseron Python player.
                  {!canExportOrel && ' (squareRecursive only)'}
                </p>
              </div>
            </label>
          </div>
        </div>

        {(doc.representationType === 'geometricRecursive' || doc.representationType === 'repeatedDirected') && <label className="flex gap-3"><input type="radio" name="format" checked={format === 'source'} onChange={() => setFormat('source')} />{doc.representationType === 'geometricRecursive' ? 'FRACTAL-MAZE.v2 (original path and gate data)' : 'Directed-port text (Koteitan compatible)'}</label>}
        {/* Share URL */}
        <div className="border-t border-subtle pt-3">
          <p className="text-muted text-sm font-semibold mb-2">Share Link</p>
          <button
            onClick={handleShare}
            className="px-3 py-1.5 surface-muted text-ink rounded text-sm"
          >
            Generate share URL
          </button>
          {shareError && (
            <p className="text-warning text-xs mt-1">
              Maze too large to encode in a URL. Use file export instead.
            </p>
          )}
          {shareUrl && (
            <div className="mt-2">
              <p className="text-success text-xs mb-1">Share link ready</p>
              <input
                readOnly
                value={shareUrl}
                className="w-full surface-page text-muted text-xs px-2 py-1 rounded border border-subtle font-mono"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
            </div>
          )}
        </div>

    </Dialog>
  )
}
