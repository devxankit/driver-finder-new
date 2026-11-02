import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, FileText, RotateCw, X, ZoomIn, ZoomOut } from 'lucide-react'
import { fileUrl } from '@/lib/api'
import { DOC_LABELS } from '@/lib/format'
import { StatusBadge } from '@/components/ui'

/** Full-screen document viewer: zoom, rotate, arrow keys to move between documents. */
export default function DocViewer({ docs, index, onClose, onIndex, compareWith }) {
  const [zoom, setZoom] = useState(1)
  const [rot, setRot] = useState(0)
  const doc = docs[index]

  useEffect(() => {
    setZoom(1)
    setRot(0)
  }, [index])

  useEffect(() => {
    const h = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' && index < docs.length - 1) onIndex(index + 1)
      if (e.key === 'ArrowLeft' && index > 0) onIndex(index - 1)
      if (e.key === 'r') setRot((r) => r + 90)
      if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(4, z + 0.25))
      if (e.key === '-') setZoom((z) => Math.max(0.5, z - 0.25))
    }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [index, docs.length, onClose, onIndex])

  if (!doc) return null
  const url = fileUrl(doc.url, { withToken: true })
  const isPdf = doc.mime === 'application/pdf'

  return createPortal(
    <div className="fixed inset-0 z-[70] flex flex-col bg-ink/95 text-white">
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{DOC_LABELS[doc.key] ?? doc.key}</div>
          <div className="text-xs text-white/50">
            {index + 1} of {docs.length} · ← → to move · R to rotate
          </div>
        </div>
        <StatusBadge status={doc.status === 'uploaded' ? 'pending' : doc.status} />
        {!isPdf && (
          <>
            <ToolBtn icon={ZoomOut} label="Zoom out" onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))} />
            <span className="w-12 text-center text-xs tabular">{Math.round(zoom * 100)}%</span>
            <ToolBtn icon={ZoomIn} label="Zoom in" onClick={() => setZoom((z) => Math.min(4, z + 0.25))} />
            <ToolBtn icon={RotateCw} label="Rotate" onClick={() => setRot((r) => r + 90)} />
          </>
        )}
        <a href={url} target="_blank" rel="noreferrer" className="rounded-lg px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/10">
          Open original
        </a>
        <ToolBtn icon={X} label="Close" onClick={onClose} />
      </div>

      <div className="relative flex min-h-0 flex-1">
        {compareWith && (
          <div className="hidden w-64 shrink-0 flex-col items-center justify-center gap-3 border-r border-white/10 p-4 lg:flex">
            <span className="text-xs text-white/50">Profile photo</span>
            <img src={compareWith} alt="Profile" className="w-full rounded-xl object-cover" />
          </div>
        )}
        <div className="relative flex min-w-0 flex-1 items-center justify-center overflow-auto p-6">
          {isPdf ? (
            <iframe title="Document" src={url} className="h-full w-full max-w-4xl rounded-lg bg-white" />
          ) : doc.url ? (
            <img
              src={url}
              alt={DOC_LABELS[doc.key] ?? doc.key}
              className="max-h-full max-w-full rounded-lg object-contain transition-transform duration-200"
              style={{ transform: `scale(${zoom}) rotate(${rot}deg)` }}
              onError={(e) => {
                e.currentTarget.style.display = 'none'
                e.currentTarget.nextSibling.style.display = 'flex'
              }}
            />
          ) : null}
          <div className="hidden flex-col items-center gap-2 text-white/60">
            <FileText className="size-10" />
            This file could not be shown (sample record or missing file).
          </div>
          {index > 0 && (
            <button onClick={() => onIndex(index - 1)} className="absolute top-1/2 left-4 -translate-y-1/2 rounded-full bg-white/10 p-3 hover:bg-white/20" aria-label="Previous document">
              <ChevronLeft className="size-5" />
            </button>
          )}
          {index < docs.length - 1 && (
            <button onClick={() => onIndex(index + 1)} className="absolute top-1/2 right-4 -translate-y-1/2 rounded-full bg-white/10 p-3 hover:bg-white/20" aria-label="Next document">
              <ChevronRight className="size-5" />
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

function ToolBtn({ icon: Icon, label, onClick }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} className="rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white">
      <Icon className="size-[18px]" />
    </button>
  )
}
