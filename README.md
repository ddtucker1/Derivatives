# Put Ledger

A small web app for **cash-secured short puts**. Enter money at risk and desired income, upload a picture of current options prices, and the app finds the closest put sale.

## How it works

1. Enter **money at risk** and **desired income**.
2. Upload a screenshot of current put options prices.
3. Once all three are filled, read the **closest fit**: sell *N* puts at strike *K*.

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

- OCR (Tesseract.js) works best on clear, high-contrast chain screenshots.
- This tool does not place trades and is not investment advice.
