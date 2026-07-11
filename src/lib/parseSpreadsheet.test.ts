import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { parseSpreadsheetFile, parseSpreadsheetRows } from './parseSpreadsheet'

describe('parseSpreadsheetRows', () => {
  it('parses put-only Strike / Bid / Ask columns', () => {
    const puts = parseSpreadsheetRows([
      ['Strike', 'Bid', 'Ask'],
      [150, 2.15, 2.25],
      [145, 1.4, 1.5],
      [140, 0.85, 0.95],
    ])

    expect(puts).toHaveLength(3)
    expect(puts[0]).toMatchObject({ strike: 150, premium: 2.15, bid: 2.15, ask: 2.25 })
    expect(puts[2]).toMatchObject({ strike: 140, premium: 0.85 })
  })

  it('uses put-side columns on a full calls | strike | puts chain', () => {
    const puts = parseSpreadsheetRows([
      ['Call Bid', 'Call Ask', 'Strike', 'Put Bid', 'Put Ask', 'Put Last'],
      [4.8, 5.2, 150, 2.1, 2.2, 2.15],
      [3.1, 3.4, 145, 1.35, 1.45, 1.4],
    ])

    expect(puts).toHaveLength(2)
    expect(puts[0]).toMatchObject({ strike: 150, premium: 2.1, bid: 2.1, ask: 2.2 })
    expect(puts[1]).toMatchObject({ strike: 145, premium: 1.35 })
  })

  it('reads a simple Call / Strike / Put layout', () => {
    const puts = parseSpreadsheetRows([
      ['Call', 'Strike', 'Put'],
      [12.5, 150, 2.15],
      [9.8, 145, 1.4],
    ])

    expect(puts.map((p) => p.strike)).toEqual([150, 145])
    expect(puts[0].premium).toBe(2.15)
    expect(puts[1].premium).toBe(1.4)
  })

  it('handles currency-formatted strings', () => {
    const puts = parseSpreadsheetRows([
      ['Strike', 'Bid', 'Ask'],
      ['$1,200.00', '$12.50', '$13.00'],
    ])

    expect(puts).toHaveLength(1)
    expect(puts[0].strike).toBe(1200)
    expect(puts[0].premium).toBe(12.5)
  })

  it('infers columns when headers are missing', () => {
    const puts = parseSpreadsheetRows([
      [150, 2.15, 2.25],
      [145, 1.4, 1.5],
    ])

    expect(puts).toHaveLength(2)
    expect(puts[0].strike).toBe(150)
    expect(puts[0].premium).toBe(2.15)
  })

  it('skips empty rows and duplicate strikes', () => {
    const puts = parseSpreadsheetRows([
      ['Strike', 'Bid'],
      [150, 2.15],
      ['', ''],
      [150, 2.0],
      [140, 0.85],
    ])

    expect(puts.map((p) => p.strike)).toEqual([150, 140])
    expect(puts[0].premium).toBe(2.15)
  })
})

describe('parseSpreadsheetFile', () => {
  it('reads CSV files', async () => {
    const csv = 'Strike,Bid,Ask\n150,2.15,2.25\n145,1.40,1.50\n'
    const file = new File([csv], 'puts.csv', { type: 'text/csv' })
    const puts = await parseSpreadsheetFile(file)

    expect(puts).toHaveLength(2)
    expect(puts[0]).toMatchObject({ strike: 150, premium: 2.15 })
    expect(puts[1]).toMatchObject({ strike: 145, premium: 1.4 })
  })

  it('reads XLSX files', async () => {
    const sheet = XLSX.utils.aoa_to_sheet([
      ['Strike', 'Bid', 'Ask'],
      [100, 1.25, 1.35],
      [95, 0.9, 1.0],
    ])
    const book = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(book, sheet, 'Chain')
    const buffer = XLSX.write(book, { type: 'array', bookType: 'xlsx' })
    const file = new File([buffer], 'puts.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })

    const puts = await parseSpreadsheetFile(file)
    expect(puts).toHaveLength(2)
    expect(puts[0]).toMatchObject({ strike: 100, premium: 1.25 })
    expect(puts[1]).toMatchObject({ strike: 95, premium: 0.9 })
  })

  it('rejects non-spreadsheet files', async () => {
    const file = new File(['not a sheet'], 'shot.png', { type: 'image/png' })
    await expect(parseSpreadsheetFile(file)).rejects.toThrow(/spreadsheet/i)
  })
})
