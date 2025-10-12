import { useEffect, useState } from 'react'
import { FiX, FiCopy } from 'react-icons/fi'

interface ImagePreviewModalProps {
  isOpen: boolean
  onClose: () => void
  imageUrl: string
  imageAlt: string
  markdownLink: string
}

export const ImagePreviewModal = ({ isOpen, onClose, imageUrl, imageAlt, markdownLink }: ImagePreviewModalProps) => {
  const [showCopied, setShowCopied] = useState(false)

  const copy = async (text: string) => {
    try {
      // Try modern Clipboard API first
      await navigator.clipboard.writeText(text)
    } catch (err) {
      console.error('Modern clipboard API failed, trying fallback', err)
      try {
        // Fallback for older browsers or when Clipboard API is blocked
        const textArea = document.createElement('textarea')
        textArea.value = text
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        const successful = document.execCommand('copy')
        document.body.removeChild(textArea)

        if (!successful) {
          throw new Error('Fallback copy method also failed')
        }
      } catch (fallbackErr) {
        console.error('Fallback copy failed', fallbackErr)
        alert('Unable to copy to clipboard — your browser may block it.')
      }
    }
  }

  const handleCopyMarkdown = async () => {
    await copy(markdownLink)
    setShowCopied(true)
    setTimeout(() => setShowCopied(false), 2000)
  }
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
      <div className="relative max-h-[95vh] max-w-[95vw] rounded-lg bg-night-900 p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 rounded-full bg-red-500 p-1 text-white shadow-lg hover:bg-red-600"
          aria-label="Close preview"
        >
          <FiX size={16} />
        </button>

        <div className="mb-4 flex max-h-[80vh] max-w-full items-center justify-center overflow-hidden rounded bg-slate-900/50">
          <img
            src={imageUrl}
            alt={imageAlt}
            className="max-h-full max-w-full object-contain"
          />
        </div>

        <div className="relative rounded bg-slate-800 p-3">
          <div className="flex items-center gap-2">
            <p className="text-sm text-slate-300">Markdown:</p>
            <div className="relative">
              <button
                onClick={handleCopyMarkdown}
                className="rounded p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
                aria-label="Copy markdown"
              >
                <FiCopy size={16} />
              </button>
              {showCopied && (
                <div className="absolute -top-8 right-0 rounded bg-slate-700 px-2 py-1 text-xs text-slate-200 shadow-lg animate-fade-out">
                  Copied!
                </div>
              )}
            </div>
          </div>
          <code className="block rounded bg-slate-700 p-2 text-xs text-slate-200 break-all mt-2">
            {markdownLink}
          </code>
        </div>
      </div>
    </div>
  )
}