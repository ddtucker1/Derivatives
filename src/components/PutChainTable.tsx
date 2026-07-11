import { useId } from 'react'
import type { PutOption } from '../lib/types'
import { createEmptyPut } from '../lib/parseChain'

interface Props {
  puts: PutOption[]
  onChange: (puts: PutOption[]) => void
}

export function PutChainTable({ puts, onChange }: Props) {
  const labelId = useId()

  function updateRow(id: string, field: 'strike' | 'premium' | 'bid' | 'ask', raw: string) {
    const value = raw === '' ? 0 : Number(raw)
    onChange(
      puts.map((p) => {
        if (p.id !== id) return p
        const next = { ...p, [field]: Number.isFinite(value) ? value : 0 }
        // Keep sell premium in sync with bid when editing bid
        if (field === 'bid' && Number.isFinite(value) && value > 0) {
          next.premium = value
        }
        return next
      }),
    )
  }

  function removeRow(id: string) {
    onChange(puts.filter((p) => p.id !== id))
  }

  function addRow() {
    onChange([...puts, createEmptyPut()])
  }

  return (
    <div className="chain-table-wrap">
      <div className="section-head">
        <h2 id={labelId}>Put chain</h2>
        <p>Edit strikes and premiums after OCR, or enter them by hand. Premium used for selling defaults to the bid.</p>
      </div>

      <div className="table-scroll" role="region" aria-labelledby={labelId}>
        <table className="chain-table">
          <thead>
            <tr>
              <th scope="col">Strike</th>
              <th scope="col">Bid</th>
              <th scope="col">Ask</th>
              <th scope="col">Sell premium</th>
              <th scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {puts.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty-row">
                  No puts yet — upload a screenshot or add a row.
                </td>
              </tr>
            ) : (
              puts.map((p) => (
                <tr key={p.id}>
                  <td>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.5"
                      min="0"
                      value={p.strike || ''}
                      onChange={(e) => updateRow(p.id, 'strike', e.target.value)}
                      aria-label="Strike"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      value={p.bid ?? ''}
                      onChange={(e) => updateRow(p.id, 'bid', e.target.value)}
                      aria-label="Bid"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      value={p.ask ?? ''}
                      onChange={(e) => updateRow(p.id, 'ask', e.target.value)}
                      aria-label="Ask"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      value={p.premium || ''}
                      onChange={(e) => updateRow(p.id, 'premium', e.target.value)}
                      aria-label="Sell premium"
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => removeRow(p.id)}
                      aria-label={`Remove strike ${p.strike}`}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <button type="button" className="btn-secondary" onClick={addRow}>
        Add put row
      </button>
    </div>
  )
}
