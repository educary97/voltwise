# Voltwise — Portuguese Electricity Bill Comparator

Compare any electricity invoice against all market offers in Portugal,
powered by ERSE official data and Claude AI (OCR + recommendation engine).

---

## How it works

1. User uploads their BPI electricity invoice (PDF or image)
2. Claude (claude-sonnet-4-6 vision) extracts supplier, power, consumption, and bill total
3. App fetches live offer data from the ERSE official CSV feed
4. Comparison engine calculates monthly estimates for all ~15 suppliers
5. Claude generates a personalised switching recommendation
6. Results dashboard shows ranked offers with savings, filters, and contact links

---

## Architecture

```
voltwise/
├── apps/
│   └── web/                          # Next.js 15 (App Router)
│       ├── app/
│       │   ├── page.tsx              # Main app page (upload → form → results)
│       │   └── api/
│       │       ├── extract/route.ts  # POST: invoice OCR via Claude vision
│       │       ├── compare/route.ts  # POST: full comparison + recommendation
│       │       └── offers/route.ts   # GET:  cached ERSE offers (edge)
│       └── components/
│           ├── invoice/InvoiceUpload.tsx
│           └── dashboard/OffersDashboard.tsx
└── packages/
    ├── erse-client/src/
    │   ├── tariff-calculator.ts      # ERSE grid tariffs + comparison engine
    │   └── erse-fetcher.ts           # CSV download + fallback dataset
    └── invoice-parser/src/
        └── claude-parser.ts          # Claude vision extraction + recommendation
```

---

## Quick start

```bash
# 1. Clone and install
git clone https://github.com/your-org/voltwise
cd voltwise
npm install

# 2. Configure environment
cp .env.example apps/web/.env.local
# Edit .env.local and add your ANTHROPIC_API_KEY

# 3. Run development server
npm run dev
# → http://localhost:3000
```

---

## Environment variables

| Variable             | Required | Description                              |
|----------------------|----------|------------------------------------------|
| ANTHROPIC_API_KEY    | Yes      | Your Anthropic API key                   |
| DATABASE_URL         | No       | PostgreSQL for comparison history        |
| UPSTASH_REDIS_REST_* | No       | Rate limiting (recommended for prod)     |

---

## Claude API integration

### Invoice extraction — `POST /api/extract`

```typescript
// Sends invoice to claude-sonnet-4-6 with vision
// Accepts: multipart/form-data with 'file' field (PDF/PNG/JPG)
// Returns: InvoiceData JSON

const res = await fetch("/api/extract", {
  method: "POST",
  body: formData, // FormData with file appended
});
const { data } = await res.json();
// data.supplier, data.kwhMonth, data.billTotal, data.powerKva ...
```

### Comparison + recommendation — `POST /api/compare`

```typescript
const res = await fetch("/api/compare", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    supplier:    "EDP",
    powerKva:    6.9,
    kwhMonth:    320,
    currentBill: 78.50,
    tariffType:  "simple",
  }),
});
const { offers, summary, recommendation } = await res.json();
// offers: ranked array with monthlyEstimate, annualSaving, savingPercent
// recommendation: Claude's 2-sentence switching advice
```

---

## ERSE data integration

The app uses two strategies:

**Primary — Official CSV feed:**
```
GET https://simuladorprecos.erse.pt/content/files/OfertasEletricidade.csv
```
Fetched server-side, cached for 6 hours. Parsed into typed `ERSEOffer[]`.

**Fallback — Curated dataset:**
If the CSV is unavailable (network error, ERSE maintenance), the app falls back
to a hardcoded dataset kept in sync with the ERSE Q1 2026 boletim.
Update `packages/erse-client/src/erse-fetcher.ts → getFallbackOffers()` quarterly.

**Tariff calculation:**
Grid access fees (tarifa de acesso às redes) are set annually by ERSE.
Update `GRID_ACCESS_TARIFFS` in `tariff-calculator.ts` every January.
Current values: ERSE Diretiva n.º 1/2026, de 7 de janeiro.

---

## Deployment

### Vercel (frontend + API routes)

```bash
cd apps/web
vercel deploy --prod
# Set ANTHROPIC_API_KEY in Vercel dashboard → Settings → Environment Variables
```

### Railway (optional background worker)

If you want a daily cron to refresh the ERSE CSV cache to Redis:

```bash
# apps/workers/erse-sync.ts — runs daily at 06:00 UTC
railway up
```

---

## GDPR compliance

- Invoice files are processed in memory only — never written to disk or stored
- No user data is persisted unless DATABASE_URL is configured and the user opts in
- Set `INVOICE_STORAGE=none` (default) to guarantee no persistence
- Add a "Delete my data" endpoint if you add auth and history

---

## Tech stack

| Layer          | Technology                    |
|----------------|-------------------------------|
| Frontend       | Next.js 15, React, Tailwind   |
| API routes     | Next.js App Router, TypeScript |
| Invoice OCR    | Claude claude-sonnet-4-6 (vision)        |
| Recommendation | Claude claude-sonnet-4-6                 |
| Market data    | ERSE official CSV + fallback  |
| Comparison     | Custom tariff calculator      |
| Deploy         | Vercel                        |

---

## Roadmap

- [x] Invoice upload + Claude OCR extraction
- [x] ERSE CSV feed integration
- [x] Comparison engine with all suppliers
- [x] Claude switching recommendation
- [x] Offer filtering (green / fixed / indexed)
- [ ] Email PDF report
- [ ] Comparison history (PostgreSQL)
- [ ] Monthly price alert (if cheaper plan appears)
- [ ] Gas comparison (simuladorprecos.erse.pt/gas)
- [ ] Dual energy (electricity + gas bundle)
- [ ] Carbon footprint per offer

---

## License

MIT — feel free to build on this.
