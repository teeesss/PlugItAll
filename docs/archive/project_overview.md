# Project Overview: Plug It All (Client-Side Subscription Manager)

## 1. Executive Summary

A privacy-focused, static Single Page Application (SPA) that helps users identify unwanted recurring subscriptions. Users drag and drop PDF or CSV bank statements. The app runs entirely in the browser to detect recurring payments and provides "Deep Links" to cancel them.

**Key differentiator:** NO AI APIs (avoiding cost), NO server uploads (ensuring privacy).

**Tagline:** "Find the leaks in your bank account"

## 2. Technical Architecture

- **Framework:** React 19 + Vite 6 (Builds to static HTML/JS/CSS)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **PDF Parsing:** pdfjs-dist (legacy build for Node.js compatibility)
- **CSV Parsing:** papaparse
- **Testing:** Vitest (18 test suites, 119 tests)
- **Deployment:** Static files via FTP

## 3. Core Detection Engine (`src/utils/analyzer.ts`)

### Pipeline:

1. **Parse** → Extract transactions from PDF/CSV
2. **Deduplicate** → Key on `date + amount + description_prefix` to resolve CSV+PDF overlaps
3. **Normalize** → Clean descriptions (remove noise, numbers, dates)
4. **Blacklist Filter** → Retail (eBay, Amazon), restaurants, gas stations (60+ keywords)
5. **Group by Description** → Aggregate same merchants
6. **Cluster by Amount** → Group by price point ($1 tolerance)
7. **Identify Shopping** → 3+ price points = shopping pattern (REJECT unless known sub)
8. **Analyze Intervals** → Calculate **Median** interval for robustness against outliers
9. **Classify Frequency** → Monthly (25-35 days), Weekly (6-8), Yearly (Span > 300 days)
10. **Enrich** → Match against `subs.json` for logos/cancel URLs

### Key Features:

- **Multi-plan Detection**: Visible $35 + $25 = 2 separate cards
- **Shopping Pattern Rejection**: 3+ variable prices = not a subscription (eBay, Etsy)
- **Median-Based Math**: Outlier dates (skipped months, statement gaps) don't break detection
- **High-Risk Validation**: Uses `subscription_pricing.json` for verified price matching
- **Consecutive Months Rule**: Unknown merchants require at least one 25-25 day gap for Monthly detection

## 4. Data Files

| File                                 | Purpose                                                         |
| ------------------------------------ | --------------------------------------------------------------- |
| `src/data/subs.json`                 | 292 subscription definitions with logos, keywords, cancel URLs |
| `src/data/subscription_pricing.json` | High-risk merchant pricing for validation                       |
| `src/data/detector_overrides.json`   | (Future) Manual user overrides                                  |

## 5. File Structure

```
src/
├── components/     # React UI components
├── data/           # subs.json, subscription_pricing.json
├── utils/
│   ├── analyzer.ts    # Core detection logic (Median, Shopping logic)
│   ├── normalizer.ts  # Description cleaning (Amazon splitting)
│   ├── matcher.ts     # Subscription matching
│   ├── parser.ts      # PDF/CSV parsing
│   └── persistence.ts # LocalStorage
└── App.tsx         # Main app component (Deduplication logic)

tests/
├── analyzer.test.ts
├── normalizer.test.ts
├── matcher.test.ts
├── user_complaints.test.ts
├── core_logic.test.ts
├── repro_false_positives.test.ts
├── real_world.test.ts
├── combined_data.test.ts  # Real user data verification
└── strict_rules.test.ts   # Edge case verification
```

## 6. Last Updated

**2026-01-16** - Transaction Explorer Phase 1-2 complete (search, filter, manual subscriptions), 119 tests passing, 292 subscriptions in database, granular hiding with unique IDs.
