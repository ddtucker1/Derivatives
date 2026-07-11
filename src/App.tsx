import { useMemo, useState } from 'react'
import { SpreadsheetUpload } from './components/SpreadsheetUpload'
import { TargetsForm } from './components/TargetsForm'
import { RecommendationPanel } from './components/RecommendationPanel'
import { findBestPutSales } from './lib/optimizer'
import type { PutOption } from './lib/types'
import './App.css'

function App() {
  const [puts, setPuts] = useState<PutOption[]>([])
  const [hasSpreadsheet, setHasSpreadsheet] = useState(false)
  const [targetIncome, setTargetIncome] = useState('')
  const [maxRisk, setMaxRisk] = useState('')

  const incomeNum = Number(targetIncome)
  const riskNum = Number(maxRisk)

  const inputsReady =
    Number.isFinite(incomeNum) &&
    incomeNum > 0 &&
    Number.isFinite(riskNum) &&
    riskNum > 0 &&
    hasSpreadsheet

  const recommendations = useMemo(
    () =>
      inputsReady
        ? findBestPutSales(puts, {
            targetIncome: incomeNum,
            maxRisk: riskNum,
          })
        : [],
    [puts, incomeNum, riskNum, inputsReady],
  )

  return (
    <div className="app-shell">
      <header className="brand-header">
        <p className="brand">Put Ledger</p>
        <h1>Closest put sale</h1>
        <p className="lede">
          Enter money at risk and desired income, upload a spreadsheet of current options prices,
          and get the closest fit.
        </p>
      </header>

      <main className="layout">
        <section className="inputs-panel" aria-label="Trade inputs">
          <TargetsForm
            maxRisk={maxRisk}
            targetIncome={targetIncome}
            onMaxRisk={setMaxRisk}
            onTargetIncome={setTargetIncome}
          />

          <SpreadsheetUpload
            onParsed={(parsed) => {
              setPuts(parsed)
              setHasSpreadsheet(true)
            }}
            onCleared={() => {
              setPuts([])
              setHasSpreadsheet(false)
            }}
          />
        </section>

        <RecommendationPanel
          recommendations={recommendations}
          targetIncome={incomeNum}
          maxRisk={riskNum}
          ready={inputsReady}
          hasPuts={puts.length > 0}
        />
      </main>
    </div>
  )
}

export default App
