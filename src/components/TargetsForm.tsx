interface Props {
  symbol: string
  expiration: string
  targetIncome: string
  maxRisk: string
  onSymbol: (v: string) => void
  onExpiration: (v: string) => void
  onTargetIncome: (v: string) => void
  onMaxRisk: (v: string) => void
}

export function TargetsForm({
  symbol,
  expiration,
  targetIncome,
  maxRisk,
  onSymbol,
  onExpiration,
  onTargetIncome,
  onMaxRisk,
}: Props) {
  return (
    <div className="targets-panel">
      <div className="section-head">
        <h2>Your targets</h2>
        <p>How much premium income you want, and how much cash you are willing to secure.</p>
      </div>

      <div className="field-grid">
        <label>
          <span>Ticker</span>
          <input
            type="text"
            value={symbol}
            onChange={(e) => onSymbol(e.target.value)}
            placeholder="AAPL"
            autoCapitalize="characters"
          />
        </label>
        <label>
          <span>Expiration</span>
          <input
            type="text"
            value={expiration}
            onChange={(e) => onExpiration(e.target.value)}
            placeholder="2026-08-15"
          />
        </label>
        <label>
          <span>Income goal ($)</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="50"
            value={targetIncome}
            onChange={(e) => onTargetIncome(e.target.value)}
            placeholder="500"
            required
          />
        </label>
        <label>
          <span>Max cash at risk ($)</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="100"
            value={maxRisk}
            onChange={(e) => onMaxRisk(e.target.value)}
            placeholder="10000"
            required
          />
        </label>
      </div>
    </div>
  )
}
