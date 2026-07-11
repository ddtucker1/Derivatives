import { describe, expect, it } from 'vitest'
import { findBestPutSales, incomeFor, cashAtRiskFor } from './optimizer'
import { parsePutChainText, resetOptionIds } from './parseChain'
import type { PutOption } from './types'

function put(strike: number, premium: number): PutOption {
  return { id: `${strike}`, strike, premium }
}

describe('incomeFor / cashAtRiskFor', () => {
  it('uses the 100-share multiplier', () => {
    expect(incomeFor(2.5, 2)).toBe(500)
    expect(cashAtRiskFor(150, 2)).toBe(30000)
  })
})

describe('findBestPutSales', () => {
  it('returns empty for invalid targets', () => {
    expect(findBestPutSales([put(100, 1)], { targetIncome: 0, maxRisk: 10000 })).toEqual([])
    expect(findBestPutSales([put(100, 1)], { targetIncome: 500, maxRisk: -1 })).toEqual([])
  })

  it('picks strike and size near both targets', () => {
    const puts = [
      put(100, 1.0), // $100 income / contract, $10k risk
      put(50, 0.5), // $50 income / contract, $5k risk
      put(200, 3.0), // $300 income / contract, $20k risk
    ]

    const [best] = findBestPutSales(puts, {
      targetIncome: 500,
      maxRisk: 10000,
    })

    expect(best).toBeDefined()
    // 5 contracts of $100 strike @ $1.00 → $500 income, $50k risk — too much risk
    // 1 contract of $100 @ $1 → $100 income, $10k risk
    // 2 of $50 @ 0.5 → $100 income, $10k risk
    // Best balance for $500 income / $10k risk is constrained by risk:
    // max 1× $100 strike, or 2× $50 strike
    expect(best.cashAtRisk).toBeLessThanOrEqual(10000 * 1.25)
    expect(best.option.strike).toBe(100)
    expect(best.contracts).toBe(1)
  })

  it('can recommend multiple contracts when collateral allows', () => {
    const puts = [put(50, 1.0)] // $100 income, $5k risk per contract

    const [best] = findBestPutSales(puts, {
      targetIncome: 500,
      maxRisk: 25000,
    })

    expect(best.contracts).toBe(5)
    expect(best.income).toBe(500)
    expect(best.cashAtRisk).toBe(25000)
  })

  it('ignores puts with zero premium or strike', () => {
    const puts = [put(0, 1), put(100, 0), put(90, 1.25)]
    const results = findBestPutSales(puts, { targetIncome: 250, maxRisk: 18000 })
    expect(results.every((r) => r.option.strike === 90)).toBe(true)
  })

  it('returns ranked alternatives', () => {
    const puts = [put(100, 2), put(95, 1.5), put(90, 1)]
    const results = findBestPutSales(
      puts,
      { targetIncome: 400, maxRisk: 20000 },
      3,
    )
    expect(results.length).toBeGreaterThan(1)
    expect(results.length).toBeLessThanOrEqual(3)
    expect(results[0].score).toBeLessThanOrEqual(results[1].score)
  })
})

describe('parsePutChainText', () => {
  it('parses strike bid ask rows', () => {
    resetOptionIds()
    const text = `
      Strike  Bid  Ask
      150.00  2.15  2.25
      145.00  1.40  1.50
      140.00  0.85  0.95
    `
    const puts = parsePutChainText(text)
    expect(puts).toHaveLength(3)
    expect(puts[0].strike).toBe(150)
    expect(puts[0].premium).toBe(2.15)
    expect(puts[0].bid).toBe(2.15)
    expect(puts[0].ask).toBe(2.25)
    expect(puts[2].strike).toBe(140)
  })

  it('parses call | strike | put chains using middle strike and last put price', () => {
    resetOptionIds()
    const text = `
      Calls  Strike  Puts
      12.50  150.00  2.15
      9.80   145.00  1.40
      7.10   140.00  0.85
    `
    const puts = parsePutChainText(text)
    expect(puts).toHaveLength(3)
    expect(puts.map((p) => p.strike)).toEqual([150, 145, 140])
    expect(puts[0].premium).toBe(2.15)
    expect(puts[1].premium).toBe(1.4)
    expect(puts[2].premium).toBe(0.85)
  })

  it('does not treat call prices as strikes', () => {
    resetOptionIds()
    // Without the fix, first number (12.50) would be read as the strike
    const puts = parsePutChainText(`
      Call  Strike  Put
      12.50  150.00  2.15
    `)
    expect(puts).toHaveLength(1)
    expect(puts[0].strike).toBe(150)
    expect(puts[0].premium).toBe(2.15)
  })

  it('uses the last put column when the put side has multiple prices', () => {
    resetOptionIds()
    const text = `
      Bid Ask Strike Bid Ask Last
      4.80 5.20 150.00 2.10 2.20 2.15
      3.10 3.40 145.00 1.35 1.45 1.40
    `
    const puts = parsePutChainText(text)
    expect(puts).toHaveLength(2)
    expect(puts[0].strike).toBe(150)
    expect(puts[0].premium).toBe(2.15)
    expect(puts[1].strike).toBe(145)
    expect(puts[1].premium).toBe(1.4)
  })

  it('handles dollar signs and commas', () => {
    resetOptionIds()
    const puts = parsePutChainText('$1,200.00  $12.50  $13.00')
    expect(puts).toHaveLength(1)
    expect(puts[0].strike).toBe(1200)
    expect(puts[0].premium).toBe(12.5)
  })

  it('skips header-only lines', () => {
    resetOptionIds()
    expect(parsePutChainText('Strike Bid Ask Volume')).toEqual([])
  })
})
