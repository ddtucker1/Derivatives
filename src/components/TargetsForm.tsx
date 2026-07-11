interface Props {
  maxRisk: string
  targetIncome: string
  onMaxRisk: (v: string) => void
  onTargetIncome: (v: string) => void
}

export function TargetsForm({
  maxRisk,
  targetIncome,
  onMaxRisk,
  onTargetIncome,
}: Props) {
  return (
    <div className="field-grid">
      <label>
        <span>Money at risk ($)</span>
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
      <label>
        <span>Desired income ($)</span>
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
    </div>
  )
}
