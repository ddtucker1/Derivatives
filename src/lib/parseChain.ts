import type { PutOption } from './types'

let idCounter = 0

export function nextOptionId(): string {
  idCounter += 1
  return `put-${idCounter}`
}

export function resetOptionIds(): void {
  idCounter = 0
}

function parseMoney(token: string): number | null {
  const cleaned = token.replace(/[$,]/g, '').trim()
  if (!cleaned || cleaned === '-' || cleaned === '—') return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function isHeaderOnlyLine(line: string): boolean {
  return (
    /strike|bid|ask|expir|volume|open.?int|delta|theta|calls?|puts?/i.test(line) &&
    !/\d/.test(line.replace(/strike/i, ''))
  )
}

function isPlausibleStrike(strike: number): boolean {
  return Number.isFinite(strike) && strike > 0 && strike <= 100_000
}

export interface ChainLayout {
  /** True when Strike is not the first data column (Calls | Strike | Puts). */
  middleStrike: boolean
  /**
   * 0-based index of the Strike column among numeric cells, when known from a header.
   * `null` means “infer from the row”.
   */
  strikeIndex: number | null
}

/**
 * Detect options-chain layout from header text.
 * Full chains label Strike in the middle; put-only tables lead with Strike.
 */
export function detectChainLayout(text: string): ChainLayout {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  for (const line of lines) {
    if (!/strike/i.test(line)) continue

    const words = line.split(/[\s|/]+/).filter(Boolean)
    const strikeIdx = words.findIndex((w) => /^strike$/i.test(w))

    if (strikeIdx > 0 && strikeIdx < words.length - 1) {
      return { middleStrike: true, strikeIndex: strikeIdx }
    }

    if (/calls?/i.test(line) && /puts?/i.test(line) && /strike/i.test(line)) {
      return {
        middleStrike: true,
        strikeIndex: strikeIdx >= 0 ? strikeIdx : null,
      }
    }

    // "Call Strike Put" / "Calls Strike Puts"
    if (strikeIdx > 0) {
      return { middleStrike: true, strikeIndex: strikeIdx }
    }
  }

  return { middleStrike: false, strikeIndex: null }
}

interface StrikePremium {
  strike: number
  /** Put premium used for selling calculations */
  premium: number
  bid?: number
  ask?: number
}

function fromMiddleStrikeRow(
  nums: number[],
  strikeIndex: number,
): StrikePremium | null {
  if (strikeIndex < 0 || strikeIndex >= nums.length - 1) return null
  const strike = nums[strikeIndex]
  const putPrice = nums[nums.length - 1]
  if (!isPlausibleStrike(strike) || putPrice < 0 || putPrice >= strike) return null

  const putSide = nums.slice(strikeIndex + 1)
  const bid = putSide.length >= 2 ? putSide[0] : undefined
  const ask = putSide.length >= 2 ? putSide[1] : undefined

  return {
    strike,
    premium: putPrice,
    bid: bid !== undefined && bid < strike ? bid : undefined,
    ask: ask !== undefined && ask < strike ? ask : undefined,
  }
}

/**
 * Pick strike + put premium from a row of numbers.
 *
 * Two common layouts:
 * 1. Put-only: Strike, Bid, Ask, … → first number is strike; prefer bid
 * 2. Full chain: Call(s), Strike, Put(s) → strike column in the middle; last column is put price
 */
export function extractStrikeAndPremium(
  nums: number[],
  layout: ChainLayout,
): StrikePremium | null {
  if (nums.length < 2) return null

  // Header told us where Strike sits — last numeric column is the put price
  if (layout.middleStrike && layout.strikeIndex !== null) {
    const parsed = fromMiddleStrikeRow(nums, layout.strikeIndex)
    if (parsed) return parsed
  }

  // 3-number rows: call | strike | put when middle is the largest value
  if (nums.length === 3) {
    const [left, middle, right] = nums
    if (
      middle > left &&
      middle > right &&
      isPlausibleStrike(middle) &&
      right >= 0 &&
      right < middle
    ) {
      return { strike: middle, premium: right }
    }
  }

  // Full-chain heuristic without a reliable strike index:
  // pick the largest value that still leaves a smaller last-column put price
  if (layout.middleStrike && nums.length >= 3) {
    let best: StrikePremium | null = null
    // Prefer a strike that is not the first or last column
    for (let i = 1; i < nums.length - 1; i++) {
      const candidate = fromMiddleStrikeRow(nums, i)
      if (!candidate) continue
      if (!best || candidate.strike > best.strike) best = candidate
    }
    if (best) return best
  }

  // Odd-length rows that look like call | strike | put with premiums on both sides
  if (nums.length >= 5 && nums.length % 2 === 1) {
    const mid = Math.floor(nums.length / 2)
    const parsed = fromMiddleStrikeRow(nums, mid)
    if (parsed && nums[0] < parsed.strike) return parsed
  }

  // Default / put-only table: first number is the strike
  const strike = nums[0]
  if (!isPlausibleStrike(strike)) return null

  const premiums = nums.slice(1).filter((n) => n >= 0 && n < strike)
  if (premiums.length === 0) return null

  let bid: number | undefined
  let ask: number | undefined
  let premium: number

  if (premiums.length >= 2) {
    bid = premiums[0]
    ask = premiums[1]
    if (bid > ask) {
      premium = (bid + ask) / 2
    } else {
      premium = bid > 0 ? bid : (bid + ask) / 2
    }
  } else {
    premium = premiums[0]
  }

  if (premium <= 0) return null

  return { strike, premium, bid, ask }
}

/**
 * Parse OCR / pasted text from an options chain into put rows.
 *
 * Supports:
 * - Put-only tables: Strike, Bid, Ask, …
 * - Full chains: Calls | Strike | Puts (middle column = strike, last column = put price)
 */
export function parsePutChainText(text: string): PutOption[] {
  const layout = detectChainLayout(text)
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  const results: PutOption[] = []
  const seenStrikes = new Set<number>()

  for (const line of lines) {
    if (isHeaderOnlyLine(line)) continue

    const tokens = line.match(/-?\$?\d[\d,]*\.?\d*/g)
    if (!tokens || tokens.length < 2) continue

    const nums = tokens
      .map(parseMoney)
      .filter((n): n is number => n !== null)

    if (nums.length < 2) continue

    const extracted = extractStrikeAndPremium(nums, layout)
    if (!extracted) continue

    if (seenStrikes.has(extracted.strike)) continue
    seenStrikes.add(extracted.strike)

    results.push({
      id: nextOptionId(),
      strike: extracted.strike,
      premium: round2(extracted.premium),
      bid: extracted.bid !== undefined ? round2(extracted.bid) : undefined,
      ask: extracted.ask !== undefined ? round2(extracted.ask) : undefined,
    })
  }

  results.sort((a, b) => b.strike - a.strike)
  return results
}
