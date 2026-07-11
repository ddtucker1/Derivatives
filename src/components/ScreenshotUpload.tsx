import { useRef, useState } from 'react'
import { extractTextFromImage } from '../lib/ocr'
import { parsePutChainText } from '../lib/parseChain'
import type { PutOption } from '../lib/types'

interface Props {
  onParsed: (puts: PutOption[], rawText: string) => void
}

export function ScreenshotUpload({ onParsed }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [pasteText, setPasteText] = useState('')

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
      onParsed(puts, text)
      if (puts.length === 0) {
        setError(
          'Could not detect put rows from the image. Paste chain text below or enter rows manually.',
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OCR failed')
    } finally {
      setBusy(false)
    }
  }

  function applyPaste() {
    const puts = parsePutChainText(pasteText)
    onParsed(puts, pasteText)
    if (puts.length === 0) {
      setError('No put rows found in the pasted text. Expected lines like: 150  2.15  2.25')
    } else {
      setError(null)
    }
  }

  return (
    <div className="upload-panel">
      <div className="section-head">
        <h2>Options screenshot</h2>
        <p>
          Upload a screenshot of put prices for one expiration. OCR extracts strikes and premiums —
          review them before optimizing.
        </p>
      </div>

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
          <img src={preview} alt="Uploaded options chain screenshot" className="preview" />
        ) : (
          <div className="dropzone-copy">
            <strong>Drop screenshot here</strong>
            <span>or choose a file</span>
          </div>
        )}
        <button
          type="button"
          className="btn-primary"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? `Reading… ${progress}%` : 'Choose image'}
        </button>
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}

      <details className="paste-fallback">
        <summary>Or paste chain text</summary>
        <textarea
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          rows={6}
          placeholder={'Strike  Bid  Ask\n150.00  2.15  2.25\n145.00  1.40  1.50\n140.00  0.85  0.95'}
          spellCheck={false}
        />
        <button type="button" className="btn-secondary" onClick={applyPaste}>
          Parse pasted text
        </button>
      </details>
    </div>
  )
}
