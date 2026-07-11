# Put Ledger

A small web app for **cash-secured short puts**. Upload (or paste) a put options chain for one stock and expiration, enter how much premium income you want and how much cash you are willing to put at risk, and the app recommends the strike and number of contracts that come closest to both targets.

## How it works

1. Enter **ticker**, **expiration**, **income goal**, and **max cash at risk**.
2. Upload a screenshot of put prices, or paste chain text / enter rows manually.
3. Review the editable put table (OCR is a starting point — fix bids/premiums as needed).
4. Read the **best match**: sell *N* puts at strike *K*.

### Math

| Metric | Formula |
| --- | --- |
| Income | `premium × 100 × contracts` |
| Cash at risk (collateral) | `strike × 100 × contracts` |
| Net if assigned | `(strike − premium) × 100 × contracts` |

Sell premium defaults to the **bid** (what you can likely receive when selling).

The optimizer scores every valid (strike, contract count) pair by how close income and cash-at-risk are to your targets, with a penalty for exceeding max risk.

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

```bash
npm test        # unit tests
npm run build   # production build
npm run lint    # oxlint
```

## Notes

- OCR (Tesseract.js) works best on clear, high-contrast chain screenshots. Always verify extracted numbers.
- This tool does not place trades and is not investment advice.
