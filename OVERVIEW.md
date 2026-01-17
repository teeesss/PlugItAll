# OVERVIEW


## Core Purpose

**Plug It All** is a client-side tool to find and cancel subscriptions without sharing your financial data with any server.

Tagline: _"Find the leaks in your bank account"_

## Design Philosophy

- **Privacy First**: No data leaves the browser.
- **Static First**: No backend required; can be hosted anywhere.
- **Reliability First**: Driven by 217 strict test cases across 36 test suites to avoid false positives.
- **Quality First**: Pre-commit hooks enforce code standards on every commit.

## Recent Architectural Shifts

- **Manual Subscription Management**: Users can add/remove subscriptions from the Transaction Explorer
- **Unique ID-Based Hiding**: Subscriptions now have unique IDs (`name-amount`) for granular dismiss functionality
- **Median vs Average**: Switched to median intervals to handle variable statement dates
- **Shopping Patterns**: Merchant visits with 3+ distinct prices are rejected to avoid one-off retail visits (eBay fix)
- **Consolidated Plan Support**: Logic handles merchants like Visible that have multiple plan price points ($25, $35)
- **Processing Feedback**: Animated overlay (v1.2.1e) with step-by-step progress during uploads (Parsing → Detecting → Complete).
- **UI Safety (v1.2.1e)**: Relocated reset/search controls to prevent interception of clicks by dropdowns.
- **Pre-Commit Hooks**: ESLint, Prettier, Gitleaks, and Checkov enforce standards automatically.

## Detection Pipeline

The core detection engine (`src/utils/analyzer.ts`) follows this pipeline:

1. **Detect Bank** → Scan for keywords (USAA, CITI) to route to specialized parsers
2. **Parse** → Extract transactions from PDF/CSV using bank-specific logic (Table-Aware or Regex)
3. **Deduplicate** → Key on `date + amount + description_prefix` to resolve CSV+PDF overlaps
4. **Blacklist Filter** → Retail (eBay, Amazon), restaurants, gas stations (60+ keywords)
5. **Group by Description** → Aggregate same merchants
6. **Cluster by Amount** → Group by price point ($1 tolerance)
7. **Identify Shopping** → 3+ price points = shopping pattern (REJECT unless known sub)
8. **Analyze Intervals** → Calculate **Median** interval for robustness against outliers
9. **Classify Frequency** → Monthly (25-35 days), Weekly (6-8), Yearly (Span > 300 days)
10. **Enrich** → Match against `subs.json` for logos/cancel URLs

### Key Detection Features:
- **Multi-plan Detection**: Visible $35 + $25 = 2 separate cards
- **Shopping Pattern Rejection**: 3+ variable prices = not a subscription (eBay, Etsy)
- **Median-Based Math**: Outlier dates (skipped months, statement gaps) don't break detection
- **High-Risk Validation**: Uses `subscription_pricing.json` for verified price matching
- **Consecutive Months Rule**: Unknown merchants require at least one 25-35 day gap for Monthly detection

---

## Data Files

| File | Purpose | Count |
|------|---------|-------|
| `src/data/subs.json` | Subscription definitions with logos, keywords, cancel URLs | 292 |
| `src/data/subscription_pricing.json` | High-risk merchant pricing for validation | 193 |
| `src/data/detector_overrides.json` | (Future) Manual user overrides | - |

---

## File Structure

```
src/
├── components/        # React UI components
│   ├── SubscriptionCard.tsx
│   ├── TransactionSearch.tsx
│   ├── TransactionExplorer.tsx
│   └── ...
├── data/              # Subscription database & pricing
│   ├── subs.json
│   └── subscription_pricing.json
├── utils/
│   ├── analyzer.ts    # Core detection logic (Median, Shopping logic)
│   ├── normalizer.ts  # Description cleaning (Amazon splitting)
│   ├── matcher.ts     # Subscription matching
│   ├── parser.ts      # PDF/CSV parsing
│   ├── persistence.ts # LocalStorage management
│   └── pdfGenerator.ts # PDF report generation
└── App.tsx            # Main app component (Deduplication logic)

tests/                 # 36 test suites, 217 tests
├── analyzer.test.ts
├── normalizer.test.ts
├── matcher.test.ts
├── amount_sign.test.ts
├── dismissal.test.ts
├── e2e_dismiss.test.ts
├── user_complaints.test.ts
├── core_logic.test.ts
├── repro_false_positives.test.ts
├── real_world.test.ts
├── combined_data.test.ts
├── strict_rules.test.ts
└── stress_banks/      # 52-bank CSV samples
```

---

## Deployment & Infrastructure

### CI/CD Pipeline
- **GitHub Actions**: Configured in `.github/workflows/ci.yml`.
- **Triggers**: Runs on every push to `master` and PRs.
- **Steps**:
  1. `npm ci` (Clean install)
  2. `npm test` (Run full Vitest suite)
  3. `npm run build` (Ensures production build works)

### FTP Deployment
- **Method**: Direct FTP upload via `scripts/deploy.js`.
- **Credentials**: Stored in `deploy_creds.json` (gitignored) or `.credentials` (legacy).
- **Target**: `plugitall.com`
- **Security Check**: Deployment script verifies SSL/TLS settings (hosted on DigitalOcean Droplet).
- **Process**:
  1. Run `npm run build` locally.
  2. Run `node scripts/deploy.js` to clear and upload `dist/`.
