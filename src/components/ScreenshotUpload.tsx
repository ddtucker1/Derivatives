import { useRef, useState } from 'react'
import { extractTextFromImage } from '../lib/ocr'
import { parsePutChainText } from '../lib/parseChain'
import type { PutOption } from '../lib/types'

interface Props {
  onParsed: (puts: PutOption[]) => void
  onCleared?: () => void
}

export function ScreenshotUpload({ onParsed, onCleared }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (PNG, JPG, etc.).')
      return
    }

    setError(null)
    setBusy(true)
    setProgress(0)
    setPreview(URL.createObjectURL(file))

    try {
      const text = await extractTextFromImage(file, setProgress)
      const puts = parsePutChainText(text)
      onParsed(puts)
      if (puts.length === 0) {
        setError(
          'Could not read put prices from that image. Use a clear screenshot with Strike in the middle column and put prices in the last column.',
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OCR failed')
      onCleared?.()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className={`dropzone ${busy ? 'is-busy' : ''}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        void handleFile(e.dataTransfer.files[0])
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
      {preview ? (
        <img src={preview} alt="Uploaded options prices screenshot" className="preview" />
      ) : (
        <div className="dropzone-copy">
          <strong>Current options prices</strong>
          <span>Drop a screenshot or choose a file</span>
        </div>
      )}
      <button
        type="button"
        className="btn-primary"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? `Reading… ${progress}%` : preview ? 'Replace image' : 'Upload picture'}
      </button>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
