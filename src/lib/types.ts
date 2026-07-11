/** A single put option available to sell. */
export interface PutOption {
  id: string
  /** Strike price in dollars */
  strike: number
  /**
   * Premium used for selling (typically the bid, or mid if bid missing).
   * Quoted per share; one contract = 100 shares.
   */
  premium: number
  bid?: number
  ask?: number
}

export interface TradeTargets {
  /** Desired premium income in dollars */
  targetIncome: number
  /** Maximum cash collateral willing to put at risk in dollars */
  maxRisk: number
}

export interface PutSaleRecommendation {
  option: PutOption
  contracts: number
  /** Total premium income = premium × 100 × contracts */
  income: number
  /** Cash collateral required = strike × 100 × contracts */
  cashAtRisk: number
  /** Net capital if assigned = (strike − premium) × 100 × contracts */
  netIfAssigned: number
  /** Combined distance score (lower is better) */
  score: number
  incomeGap: number
  riskGap: number
}
