import { useRef, useState } from 'react'
import { parseSpreadsheetFile, SPREADSHEET_ACCEPT } from '../lib/parseSpreadsheet'
import type { PutOption } from '../lib/types'

interface Props {
  onParsed: (puts: PutOption[]) => void
  onCleared?: () => void
}

export function SpreadsheetUpload({ onParsed, onCleared }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [rowCount, setRowCount] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File | undefined) {
    if (!file) return

    setError(null)
    setBusy(true)
    setFileName(file.name)

    try {
      const puts = await parseSpreadsheetFile(file)
      onParsed(puts)
      setRowCount(puts.length)
      if (puts.length === 0) {
        setError(
          'Could not find put prices in that spreadsheet. Include a Strike column and Bid, Ask, Last, or Put price columns.',
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read spreadsheet')
      setRowCount(0)
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
        accept={SPREADSHEET_ACCEPT}
        className="sr-only"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
      {fileName ? (
        <div className="dropzone-copy">
          <strong>{fileName}</strong>
          <span>
            {busy
              ? 'Reading spreadsheet…'
              : rowCount > 0
                ? `${rowCount} put strike${rowCount === 1 ? '' : 's'} loaded`
                : 'No put rows found'}
          </span>
        </div>
      ) : (
        <div className="dropzone-copy">
          <strong>Current options prices</strong>
          <span>Drop a spreadsheet (.csv or .xlsx) or choose a file</span>
        </div>
      )}
      <button
        type="button"
        className="btn-primary"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? 'Reading…' : fileName ? 'Replace spreadsheet' : 'Upload spreadsheet'}
      </button>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
