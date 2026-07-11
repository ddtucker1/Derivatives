import * as XLSX from 'xlsx'
import { nextOptionId, resetOptionIds } from './parseChain'
import type { PutOption } from './types'

function parseMoney(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }
  if (typeof value !== 'string') return null
  const cleaned = value.replace(/[$,]/g, '').trim()
  if (!cleaned || cleaned === '-' || cleaned === '—' || cleaned === '–') return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function isPlausibleStrike(strike: number): boolean {
  return Number.isFinite(strike) && strike > 0 && strike <= 100_000
}

function normalizeHeader(cell: unknown): string {
  return String(cell ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

interface ColumnMap {
  strike: number
  bid: number | null
  ask: number | null
  last: number | null
  put: number | null
  premium: number | null
}

function findHeaderRow(rows: unknown[][]): { headerIndex: number; columns: ColumnMap } | null {
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const row = rows[i] ?? []
    const headers = row.map(normalizeHeader)
    const strike = headers.findIndex((h) => h === 'strike' || h === 'strike price')
    if (strike < 0) continue

    const bidCandidates: number[] = []
    const askCandidates: number[] = []
    const lastCandidates: number[] = []
    const putCandidates: number[] = []
    const premiumCandidates: number[] = []

    headers.forEach((h, idx) => {
      if (!h || idx === strike) return
      const isCall = /\bcalls?\b/.test(h)
      const isPut = /\bputs?\b/.test(h) || (!isCall && idx > strike)

      if (/\bbid\b/.test(h)) {
        if (isCall) return
        if (isPut || idx > strike || h === 'bid') bidCandidates.push(idx)
      } else if (/\bask\b/.test(h)) {
        if (isCall) return
        if (isPut || idx > strike || h === 'ask') askCandidates.push(idx)
      } else if (/\blast\b/.test(h) || h === 'mark' || h === 'mid') {
        if (isCall) return
        if (isPut || idx > strike) lastCandidates.push(idx)
      } else if (h === 'put' || h === 'puts' || h === 'put price') {
        putCandidates.push(idx)
      } else if (h === 'premium' || h === 'price') {
        premiumCandidates.push(idx)
      }
    })

    // Prefer put-side columns to the right of Strike on full chains
    const pickRightmost = (idxs: number[]) =>
      idxs.length === 0 ? null : Math.max(...idxs)

    const columns: ColumnMap = {
      strike,
      bid: pickRightmost(bidCandidates.filter((i) => i > strike)) ?? pickRightmost(bidCandidates),
      ask: pickRightmost(askCandidates.filter((i) => i > strike)) ?? pickRightmost(askCandidates),
      last: pickRightmost(lastCandidates.filter((i) => i > strike)) ?? pickRightmost(lastCandidates),
      put: pickRightmost(putCandidates),
      premium: pickRightmost(premiumCandidates),
    }

    return { headerIndex: i, columns }
  }

  return null
}

function premiumFromRow(row: unknown[], columns: ColumnMap, strike: number): {
  premium: number
  bid?: number
  ask?: number
} | null {
  const bid = columns.bid !== null ? parseMoney(row[columns.bid]) : null
  const ask = columns.ask !== null ? parseMoney(row[columns.ask]) : null
  const last = columns.last !== null ? parseMoney(row[columns.last]) : null
  const put = columns.put !== null ? parseMoney(row[columns.put]) : null
  const namedPremium = columns.premium !== null ? parseMoney(row[columns.premium]) : null

  const candidates = [bid, ask, last, put, namedPremium].filter(
    (n): n is number => n !== null && n >= 0 && n < strike,
  )

  let premium: number | null = null
  if (bid !== null && bid > 0 && bid < strike) {
    premium = bid
  } else if (namedPremium !== null && namedPremium > 0 && namedPremium < strike) {
    premium = namedPremium
  } else if (put !== null && put > 0 && put < strike) {
    premium = put
  } else if (last !== null && last > 0 && last < strike) {
    premium = last
  } else if (bid !== null && ask !== null && bid < strike && ask < strike) {
    premium = (bid + ask) / 2
  } else if (candidates.length > 0) {
    premium = candidates[0]
  }

  if (premium === null || premium <= 0) return null

  return {
    premium: round2(premium),
    bid: bid !== null && bid < strike ? round2(bid) : undefined,
    ask: ask !== null && ask < strike ? round2(ask) : undefined,
  }
}

/**
 * Infer strike + put premium from a numeric row when headers are missing.
 * Put-only: first number is strike, second is premium/bid.
 * Full chain: middle-ish largest value is strike, last is put price.
 */
function inferFromNumericRow(nums: number[]): {
  strike: number
  premium: number
  bid?: number
  ask?: number
} | null {
  if (nums.length < 2) return null

  if (nums.length === 3) {
    const [left, middle, right] = nums
    if (middle > left && middle > right && isPlausibleStrike(middle) && right > 0 && right < middle) {
      return { strike: middle, premium: round2(right) }
    }
  }

  if (nums.length >= 5 && nums.length % 2 === 1) {
    const mid = Math.floor(nums.length / 2)
    const strike = nums[mid]
    const putPrice = nums[nums.length - 1]
    if (isPlausibleStrike(strike) && putPrice > 0 && putPrice < strike && nums[0] < strike) {
      const putSide = nums.slice(mid + 1)
      return {
        strike,
        premium: round2(putPrice),
        bid: putSide.length >= 2 && putSide[0] < strike ? round2(putSide[0]) : undefined,
        ask: putSide.length >= 2 && putSide[1] < strike ? round2(putSide[1]) : undefined,
      }
    }
  }

  const strike = nums[0]
  if (!isPlausibleStrike(strike)) return null
  const premiums = nums.slice(1).filter((n) => n >= 0 && n < strike)
  if (premiums.length === 0 || premiums[0] <= 0) return null

  const bid = premiums.length >= 2 ? premiums[0] : undefined
  const ask = premiums.length >= 2 ? premiums[1] : undefined
  const premium = bid !== undefined ? (bid > 0 ? bid : (bid + (ask ?? bid)) / 2) : premiums[0]

  return {
    strike,
    premium: round2(premium),
    bid: bid !== undefined ? round2(bid) : undefined,
    ask: ask !== undefined ? round2(ask) : undefined,
  }
}

export function parseSpreadsheetRows(rows: unknown[][]): PutOption[] {
  resetOptionIds()
  const results: PutOption[] = []
  const seenStrikes = new Set<number>()

  const header = findHeaderRow(rows)
  const start = header ? header.headerIndex + 1 : 0

  for (let i = start; i < rows.length; i++) {
    const row = rows[i] ?? []
    if (row.every((cell) => cell === null || cell === undefined || String(cell).trim() === '')) {
      continue
    }

    let strike: number | null = null
    let premiumInfo: { premium: number; bid?: number; ask?: number } | null = null

    if (header) {
      strike = parseMoney(row[header.columns.strike])
      if (strike !== null && isPlausibleStrike(strike)) {
        premiumInfo = premiumFromRow(row, header.columns, strike)
      }
    }

    if (!premiumInfo) {
      const nums = row
        .map(parseMoney)
        .filter((n): n is number => n !== null)
      const inferred = inferFromNumericRow(nums)
      if (inferred) {
        strike = inferred.strike
        premiumInfo = inferred
      }
    }

    if (strike === null || !premiumInfo || seenStrikes.has(strike)) continue
    seenStrikes.add(strike)

    results.push({
      id: nextOptionId(),
      strike,
      premium: premiumInfo.premium,
      bid: premiumInfo.bid,
      ask: premiumInfo.ask,
    })
  }

  results.sort((a, b) => b.strike - a.strike)
  return results
}

function sheetToRows(workbook: XLSX.WorkBook): unknown[][] {
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) return []
  const sheet = workbook.Sheets[sheetName]
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: true,
    defval: '',
  })
}

export async function parseSpreadsheetFile(file: File): Promise<PutOption[]> {
  const name = file.name.toLowerCase()
  const isCsv = name.endsWith('.csv') || file.type === 'text/csv' || file.type === 'text/plain'
  const isExcel =
    name.endsWith('.xlsx') ||
    name.endsWith('.xls') ||
    name.endsWith('.xlsm') ||
    file.type.includes('spreadsheet') ||
    file.type.includes('excel')

  if (!isCsv && !isExcel) {
    throw new Error('Please upload a spreadsheet (.csv, .xlsx, or .xls).')
  }

  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, {
    type: 'array',
    raw: true,
    cellDates: false,
  })

  const rows = sheetToRows(workbook)
  return parseSpreadsheetRows(rows)
}

export const SPREADSHEET_ACCEPT =
  '.csv,.xlsx,.xls,.xlsm,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
