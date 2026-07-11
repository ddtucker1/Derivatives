import { useMemo, useState } from 'react'
import { ScreenshotUpload } from './components/ScreenshotUpload'
import { PutChainTable } from './components/PutChainTable'
import { TargetsForm } from './components/TargetsForm'
import { RecommendationPanel } from './components/RecommendationPanel'
import { findBestPutSales } from './lib/optimizer'
import type { PutOption } from './lib/types'
import './App.css'

function App() {
  const [puts, setPuts] = useState<PutOption[]>([])
  const [symbol, setSymbol] = useState('')
  const [expiration, setExpiration] = useState('')
  const [targetIncome, setTargetIncome] = useState('500')
  const [maxRisk, setMaxRisk] = useState('10000')
  const [rawOcr, setRawOcr] = useState('')

  const incomeNum = Number(targetIncome)
  const riskNum = Number(maxRisk)

  const recommendations = useMemo(
    () =>
      findBestPutSales(puts, {
        targetIncome: incomeNum,
        maxRisk: riskNum,
      }),
    [puts, incomeNum, riskNum],
  )

  return (
    <div className="app-shell">
      <header className="brand-header">
        <p className="brand">Put Ledger</p>
        <h1>Sell puts to a dollar target</h1>
        <p className="lede">
          Load a put chain screenshot, set the income you want and the cash you will risk, and get
          the strike and contract count that come closest.
        </p>
      </header>

      <main className="layout">
        <TargetsForm
          symbol={symbol}
          expiration={expiration}
          targetIncome={targetIncome}
          maxRisk={maxRisk}
          onSymbol={setSymbol}
          onExpiration={setExpiration}
          onTargetIncome={setTargetIncome}
          onMaxRisk={setMaxRisk}
        />

        <ScreenshotUpload
          onParsed={(parsed, text) => {
            setPuts(parsed)
            setRawOcr(text)
          }}
        />

        <PutChainTable puts={puts} onChange={setPuts} />

        <RecommendationPanel
          recommendations={recommendations}
          targetIncome={incomeNum}
          maxRisk={riskNum}
          symbol={symbol}
          expiration={expiration}
        />

        {rawOcr && (
          <details className="ocr-debug">
            <summary>Raw OCR text</summary>
            <pre>{rawOcr}</pre>
          </details>
        )}
      </main>
    </div>
  )
}

export default App
