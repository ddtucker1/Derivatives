import type { PutSaleRecommendation } from '../lib/types'
import { formatUsd } from '../lib/optimizer'

interface Props {
  recommendations: PutSaleRecommendation[]
  targetIncome: number
  maxRisk: number
  ready: boolean
  hasPuts: boolean
}

export function RecommendationPanel({
  recommendations,
  targetIncome,
  maxRisk,
  ready,
  hasPuts,
}: Props) {
  if (!ready) {
    return null
  }

  if (!hasPuts || recommendations.length === 0) {
    return (
      <div className="results-panel results-empty">
        <h2>Closest fit</h2>
        <p>
          No matching put sale found from that screenshot. Check that the image shows strike and
          premium columns clearly.
        </p>
      </div>
    )
  }

  const best = recommendations[0]

  return (
    <div className="results-panel">
      <div className="section-head">
        <h2>Closest fit</h2>
        <p>
          Best cash-secured short put for {formatUsd(targetIncome)} income with about{' '}
          {formatUsd(maxRisk)} at risk.
        </p>
      </div>

      <article className="best-trade">
        <p className="best-trade-action">
          Sell <em>{best.contracts}</em> put{best.contracts === 1 ? '' : 's'} at the{' '}
          <em>{formatUsd(best.option.strike)}</em> strike
        </p>
        <dl className="metric-grid">
          <div>
            <dt>Premium / share</dt>
            <dd>{formatUsd(best.option.premium)}</dd>
          </div>
          <div>
            <dt>Income</dt>
            <dd>
              {formatUsd(best.income)}
              <Gap value={best.incomeGap} />
            </dd>
          </div>
          <div>
            <dt>Cash at risk</dt>
            <dd>
              {formatUsd(best.cashAtRisk)}
              <Gap value={best.riskGap} />
            </dd>
          </div>
          <div>
            <dt>Net if assigned</dt>
            <dd>{formatUsd(best.netIfAssigned)}</dd>
          </div>
        </dl>
        <p className="fine-print">
          Cash at risk is collateral (strike × 100 × contracts). Income is premium × 100 ×
          contracts. This is not trading advice.
        </p>
      </article>

      {recommendations.length > 1 && (
        <div className="alt-list">
          <h3>Other close matches</h3>
          <ol>
            {recommendations.slice(1).map((r) => (
              <li key={`${r.option.strike}-${r.contracts}`}>
                <span>
                  Sell {r.contracts}× {formatUsd(r.option.strike)} put
                </span>
                <span>
                  {formatUsd(r.income)} income · {formatUsd(r.cashAtRisk)} risk
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}

function Gap({ value }: { value: number }) {
  if (Math.abs(value) < 0.005) {
    return <small className="gap exact">on target</small>
  }
  const sign = value > 0 ? '+' : '−'
  return (
    <small className={`gap ${value > 0 ? 'over' : 'under'}`}>
      {sign}
      {formatUsd(Math.abs(value))}
    </small>
  )
}
