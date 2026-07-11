import type { PutOption, PutSaleRecommendation, TradeTargets } from './types'

const CONTRACT_MULTIPLIER = 100

function incomeFor(premium: number, contracts: number): number {
  return premium * CONTRACT_MULTIPLIER * contracts
}

function cashAtRiskFor(strike: number, contracts: number): number {
  return strike * CONTRACT_MULTIPLIER * contracts
}

function scoreCandidate(
  income: number,
  cashAtRisk: number,
  targets: TradeTargets,
): number {
  const { targetIncome, maxRisk } = targets
  const incomeDenom = Math.max(targetIncome, 1)
  const riskDenom = Math.max(maxRisk, 1)

  const incomeErr = Math.abs(income - targetIncome) / incomeDenom
  const riskErr = Math.abs(cashAtRisk - maxRisk) / riskDenom

  // Soft preference: stay at or under max risk when possible
  const overRiskPenalty =
    cashAtRisk > maxRisk ? ((cashAtRisk - maxRisk) / riskDenom) * 1.5 : 0

  // Soft preference: don't undershoot income too aggressively if risk is fine
  const underIncomePenalty =
    income < targetIncome * 0.5 ? ((targetIncome - income) / incomeDenom) * 0.25 : 0

  return incomeErr + riskErr + overRiskPenalty + underIncomePenalty
}

function buildRecommendation(
  option: PutOption,
  contracts: number,
  targets: TradeTargets,
): PutSaleRecommendation {
  const income = incomeFor(option.premium, contracts)
  const cashAtRisk = cashAtRiskFor(option.strike, contracts)
  const netIfAssigned =
    (option.strike - option.premium) * CONTRACT_MULTIPLIER * contracts

  return {
    option,
    contracts,
    income,
    cashAtRisk,
    netIfAssigned,
    score: scoreCandidate(income, cashAtRisk, targets),
    incomeGap: income - targets.targetIncome,
    riskGap: cashAtRisk - targets.maxRisk,
  }
}

/**
 * Find the put strike and contract count that best match target income
 * and max cash-at-risk for cash-secured short puts.
 *
 * Cash at risk = strike × 100 × contracts (collateral to secure the puts).
 * Income = premium × 100 × contracts.
 */
export function findBestPutSales(
  puts: PutOption[],
  targets: TradeTargets,
  limit = 5,
): PutSaleRecommendation[] {
  if (
    !Number.isFinite(targets.targetIncome) ||
    !Number.isFinite(targets.maxRisk) ||
    targets.targetIncome <= 0 ||
    targets.maxRisk <= 0
  ) {
    return []
  }

  const validPuts = puts.filter(
    (p) =>
      Number.isFinite(p.strike) &&
      p.strike > 0 &&
      Number.isFinite(p.premium) &&
      p.premium > 0,
  )

  const candidates: PutSaleRecommendation[] = []

  for (const option of validPuts) {
    const collateralPer = option.strike * CONTRACT_MULTIPLIER
    // Allow a small overshoot window so we can still find near-matches
    const maxContracts = Math.max(
      1,
      Math.floor((targets.maxRisk * 1.25) / collateralPer),
    )

    for (let n = 1; n <= maxContracts; n++) {
      candidates.push(buildRecommendation(option, n, targets))
    }
  }

  candidates.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score
    // Tie-break: prefer closer income, then fewer contracts
    const incomeDiff =
      Math.abs(a.incomeGap) - Math.abs(b.incomeGap)
    if (incomeDiff !== 0) return incomeDiff
    return a.contracts - b.contracts
  })

  // Deduplicate by strike+contracts keeping best score only (already sorted)
  const seen = new Set<string>()
  const unique: PutSaleRecommendation[] = []
  for (const c of candidates) {
    const key = `${c.option.strike}:${c.contracts}`
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(c)
    if (unique.length >= limit) break
  }

  return unique
}

export function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)
}

export { CONTRACT_MULTIPLIER, incomeFor, cashAtRiskFor }
