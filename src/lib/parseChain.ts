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

/**
 * Parse OCR / pasted text from an options chain into put rows.
 * Looks for lines with a strike and at least one premium-like number.
 *
 * Heuristic: first number on a line is the strike; subsequent numbers are
 * bid/ask/last/mid. Prefer bid when present, else mid/last, else ask.
 */
export function parsePutChainText(text: string): PutOption[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  const results: PutOption[] = []
  const seenStrikes = new Set<number>()

  for (const line of lines) {
    // Skip obvious header lines
    if (/strike|bid|ask|expir|volume|open.?int|delta|theta/i.test(line) && !/\d/.test(line.replace(/strike/i, ''))) {
      continue
    }

    const tokens = line.match(/-?\$?\d[\d,]*\.?\d*/g)
    if (!tokens || tokens.length < 2) continue

    const nums = tokens
      .map(parseMoney)
      .filter((n): n is number => n !== null)

    if (nums.length < 2) continue

    const strike = nums[0]
    // Ignore nonsense strikes
    if (strike <= 0 || strike > 100_000) continue

    const premiums = nums.slice(1).filter((n) => n >= 0 && n < strike)
    if (premiums.length === 0) continue

    let bid: number | undefined
    let ask: number | undefined
    let premium: number

    if (premiums.length >= 2) {
      bid = premiums[0]
      ask = premiums[1]
      // If bid > ask, might be last/mark ordering — use mid of first two
      if (bid > ask) {
        premium = (bid + ask) / 2
      } else {
        premium = bid > 0 ? bid : (bid + ask) / 2
      }
    } else {
      premium = premiums[0]
    }

    if (premium <= 0) continue

    // Deduplicate identical strikes (keep first / higher premium later editable)
    if (seenStrikes.has(strike)) continue
    seenStrikes.add(strike)

    results.push({
      id: nextOptionId(),
      strike,
      premium: round2(premium),
      bid: bid !== undefined ? round2(bid) : undefined,
      ask: ask !== undefined ? round2(ask) : undefined,
    })
  }

  results.sort((a, b) => b.strike - a.strike)
  return results
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
