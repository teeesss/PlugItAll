# Project Status: Plug It All

## Recent Major Updates (Feb 25, 2026)

### 🟢 Feature: Budgeting Dashboard & Goal Tracking (v1.6.0)
- **Goal**: Expand from subscription tracking to full monthly budgeting.
- **Resolution**:
  - Created `BudgetDashboard.tsx` with high-premium animations and 20+ categories.
  - Implemented `BudgetGoals.tsx` for target vs. actual spending visualization.
  - Added "Cash Flow Audit" for total data transparency.
  - **Manual Overrides**: Users can now re-categorize and export their rules.
- **Status**: Deployed.

### 🟢 Bug Fix: Sign-Agnostic Processing & Robustness (v1.6.3)
- **Goal**: Handle statements where spending is positive and income is negative (Inverted Convention).
- **Problem**: 
  - Credit card spending was being treated as "Income" or "Transfers" due to positive signs.
  - Large salary deposits were being filtered as "Transfers" or categorized as "Other" because they were negative.
  - "Bill Pay" for utilities was being misclassified as an account transfer.
- **Resolution**:
  - **Sign-Agnostic Categorizer**: Now allows `Income` keywords to match regardless of amount sign.
  - **Transfer Filter Refinement**: Removed ambiguous `BILL PAY` from auto-filter, letting the categorizer handle it.
  - **Expanded Utility Keywords**: Added specific county-level (Okaloosa) and generic utility markers.
  - **Whitelisted Real Transactions**: Added `PAYROLL` to explicit real whitelist.
  - **Async Test Fix**: Updated `insights.test.tsx` and added inverted sign tests to `categorizer.test.ts`.
- **Status**: Production-ready and verified.

## Recent Major Updates (Jan 17, 2026)

### 🟢 Feature: Processing Overlay (v1.2.1e)
- **Goal**: Provide visual feedback during long statement parsing/analysis operations.
- **Resolution**:
  - Implemented `ProcessingOverlay.tsx` with step-by-step progress tracking.
  - **Animated Success**: Celebrates discovery with a count of found subscriptions.
  - **User Feedback**: Increased minimum display duration to **4 seconds** for readability.
  - **Critical Fix**: Resolved logic race condition where `isProcessing` blocked the auto-dismiss timer.
- **Status**: Production-ready and deployed.

### 🟢 UI Refactor: Header Button Order (v1.2.1e)
- **Goal**: Resolve "Double Click" reset button issue.
- **Problem**: Transaction search dropdown overlapped the Reset button, intercepting clicks.
- **Resolution**: Swapped Header order: [Search Bar] [Reset Button] [Settings].
- **Result**: Reset button is now on far right, making it reliably accessible in one click.

### 🟢 Feature: Comprehensive Insights Filtering (v1.2.0)
- **Goal**: Allow users to slice spending data by date, type, and merchant.
- **Resolution**: Implemented `InsightsEnhanced.tsx` with dynamic date ranges (30d - 3yr), sort options, and clickable merchant details.
- **Status**: Deployed.

## Recent Major Updates (Jan 16, 2026)

### 🟢 Feature: Bill View / Linear List (TASK-017)
- **Goal**: Provide a compact, table-based alternative to the card view.
- **Resolution**: 
  - Implemented `BillView.tsx` with a sortable table layout (Service, Amount, Frequency, Confidence).
  - Added a "Cards/List" toggle next to the Download report button.
  - Included a summary footer with total subscription counts and monthly costs.
- **Status**: Production-ready and deployed.

### 🟢 Feature: New Discovery Highlight (TASK-078)
- **Goal**: Visually emphasize new subscriptions immediately after a file upload.
- **Resolution**:
  - Implemented a pulsing green glow highlight for new subscription cards.
  - **Fixed Timing Bug**: Moved timer logic to a `useEffect` hook in `App.tsx` to ensure reliable 7-second auto-fade.
  - Added debug logs to track highlight lifecycle.
- **Status**: Verified and working in production.

### 🟢 Normalizer: City/State Stripping (TASK-008)
- **Problem**: Transactions like "NETFLIX SAN FRANCISCO CA" often failed to match due to location suffixes.
- **Resolution**: Enhanced `normalizeDescription` to detect and strip common US state codes and 2-3 word city patterns.
- **Tests**: `tests/city_state.test.ts` (14 tests).

### 🟢 Database: Merchant Alias Expansion (TASK-009)
- **Goal**: Improve matching coverage for popular services with varied transaction names.
- **Resolution**: Added 35+ new `regex_keywords` across 9 categories (Netflix, Spotify, GitHub, etc.) in `subs.json`.
- **Status**: Matching accuracy significantly improved for top-tier merchants.

## Recent Major Updates (Jan 15-16, 2026)

### 🟢 Discovery: USAA PDF Parsing (SUCCESS)
- **Problem**: `pdfs/USAA-*.pdf` were initially difficult to parse due to multi-column layouts (separate Debit/Credit) and multi-line descriptions.
- **Resolution**: Implemented a **Table-Aware Parser** in `parser.ts`:
  - **Bank Routing**: Added `detectBank()` to trigger specialized parsing based on statement footer/header.
  - **Column Detection**: Automatically finds "Date", "Description", "Debits", "Credits", "Amount" using X-coordinates.
  - **Multi-line Merging**: Description items spanning multiple lines are now grouped correctly by tracking the current transaction context across lines.
  - **Amount Routing**: Logic now correctly subtractions Debits from Credits when columns are separate.
  - **Summary Filtering**: Improved removal of "Beginning Balance", "Ending Balance", and other non-transactional items.
- **Tests**: `tests/usaa_content.test.ts` and `tests/usaa_multi_test.test.ts` verify all 3 USAA PDFs and ensure **Citi** still works perfectly.
- **Status**: USAA support is now robust and production-ready.


### 🟢 Bug: Manual Subscription Tests Failing in Node.js
- **Issue**: `tests/export_import.test.ts` failed because `localStorage` was not correctly polyfilled or shared across modules in the `node` environment.
- **Cause**: The `setup.ts` polyfill only installed if `globalThis.localStorage` was undefined, which failed to stick correctly in some vitest execution modes.
- **Resolution**: Forced the `localStorage` polyfill to install on both `globalThis` and `global` in `setup.ts` using a `Map`-backed implementation.
- **Tests**: All 12 export/import tests now pass.

### 🟢 Feature: E*TRADE PDF Parsing (SUCCESS)
- **Problem**: Need to support E*TRADE bank statements in PDF format.
- **Resolution**: 
  - Added "E*TRADE" and "MORGAN STANLEY" detection in `detectBank()`.
  - Implemented `parseEtradeSpecific()` leveraging robust line-parsing logic.
  - Verified with `Etrade-102025.pdf`.
- **Tests**: Added `tests/pdf_parser.test.ts`.
- **Status**: E*TRADE support deployed and verified.

## Recent Major Updates (Jan 15, 2026)

### 🎯 Granular Subscription Hiding
**Goal**: Prevent hiding one subscription from hiding all with the same name.
- **Issue**: Hiding SiriusXM $4.62 also hid SiriusXM $7.71.
- **Fix**: Added unique `id` field (`name-amount`) to each subscription candidate.
- **Result**: Users can now hide specific price-point subscriptions independently.
- **Tests**: Added `dismissal.test.ts`, `dismissal_sirius.test.ts`, `e2e_dismiss.test.ts`.

### 🔘 Manual Subscription Toggle (Jan 15, 2026)
**Goal**: Allow users to add and remove manual subscriptions from the Transaction Explorer.
- **Toggle Action**: The "+" button in the Explorer now toggles between "Add" (Plus icon) and "Remove" (Checkmark icon).
- **ID Consistency**: Uses `normalizeDescription` to ensure manual IDs match detected ones, preventing duplicates.
- **Persistence**: Removals and additions persistent via `localStorage`.

### 📄 Robust PDF Generation (Jan 15, 2026)
**Goal**: Fix persistent download issues (GUID naming/hash) on production.
- **Fix**: Reverted to standard `jsPDF.save()` protocol.
- **Result**: Consistent downloads as `plug-it-all-report.pdf` across all browsers.
- **Version**: Bumped to `v1.1.2-FINAL`.

### 🚀 Optimized Deployment Engine
**Goal**: Prevent stale production builds and reduce deployment time.
- **Intelligent Sync**: Deployment now skips unchanged logo files (~150+ assets) but **forces** upload of `index.html` and hashed JS/CSS bundles.
- **Remote Cleanup**: Added `cleanRemoteAssets()` to the deploy script to wipe old hashed bundles before syncing.
- **Node Instance Safety**: Enforced single-node-instance lock during build/deploy to prevent resource starvation.

---

## Recent Major Updates (Jan 13, 2026)

### 🗃️ Subscription Database Integration
**Goal**: Integrate comprehensive subscription database (~500+ services) from master data files.

**Results**:
- Added **89 new subscriptions** to `subs.json` (total: 292)
- Added **176 pricing entries** to `subscription_pricing.json` (total: 193)
- Applied **20 fallback URLs** for better cancellation support
- Created reusable migration script: `scripts/migrate_master_data.cjs`

**New Fields**:
- `fallback_url` - Alternative cancellation URL if primary fails
- Clearbit logo URLs for all new subscriptions

---

## Recent Major Updates (Jan 12, 2026)

### 🎯 Critical Bug Fix: Single File Upload Now Works
**Issue:** Single CSV uploads were not detecting ANY subscriptions due to incorrect refund detection logic.

**Root Cause:** The `isRefund()` function was treating all negative amounts (`-15.99`) as refunds, filtering out every single charge transaction.

**Solution:** Replaced sign-based refund detection with keyword-based detection:
- Only filters transactions with "REFUND", "RETURN", "REVERSAL", "CREDIT MEMO" in description
- Supports BOTH positive and negative amount conventions
- Uses `Math.abs()` to normalize all amounts

**Impact:** Subscription detection now works for ALL CSV formats, both single and multiple file uploads.

### 📊 Comprehensive 52-Bank Stress Test Coverage
Expanded from 2 to **52 banks** across global markets:
- **37 US banks** (traditional, credit unions, digital, brokerages)
- **15 International banks** (Europe, Asia, LATAM, Australia, Africa)
- **11 currencies** (USD, GBP, EUR, JPY, SGD, CNY, INR, MXN, AUD, BRL, ZAR)
- **6 date formats** validated
- **8 languages** supported

### 🚀 Deployment Optimizations
- Fixed deploy script to skip 100+ static logo files
- Reduced deployment time significantly
- Live at: https://plugitall.com/
- **Tests**: 140/140 passing across 24 test suites
- **Subscriptions**: 292 in database
- **Pricing Entries**: 193
- **Version**: v1.1.2-FINAL
- **Live URL**: https://plugitall.com/

## Test Coverage
- **140/140 tests passing** (100%)
- **Zero crashes** across all bank formats
- **Zero false positives** validated
- **Robustness**: Verified USAA multi-line descriptions and Citibank baseline stability.

## Key Files Modified
- [`src/utils/analyzer.ts`](file:///c:/projects/CancelSubscriptions/just-fucking-cancel/src/utils/analyzer.ts) - Smart refund detection
- [`scripts/deploy.js`](file:///c:/projects/CancelSubscriptions/just-fucking-cancel/scripts/deploy.js) - Optimized static file handling
- `tests/fixtures/stress_banks/` - 52 bank CSV samples

## Documentation
- [Walkthrough](file:///C:/Users/rayjo/.gemini/antigravity/brain/a177e4ad-5230-4619-b616-e7986b25e2d1/walkthrough.md) - Complete implementation details
- [Stress Test Data](file:///C:/Users/rayjo/.gemini/antigravity/brain/a177e4ad-5230-4619-b616-e7986b25e2d1/synthetic_credit_card_data.md) - 52-bank coverage
- `SAMPLE_DATA_README.md` - Manual testing guide

## 🟢 Completed (Session 2026-01-16)

- [x] **USAA PDF Parsing Completion**:
  - Implemented bank-specific PDF routing in `parser.ts`.
  - Advanced table-aware parsing for USAA (multi-column, multi-line descriptions).
  - Preserved stable regex parsing for Citi bank statements.
  - Verified with 100% pass rate across USAA and Citi test suites.
- [x] **TASK-071**: Export/Import manual subscriptions (JSON format)

## Next Steps
- Add user feedback mechanism
- Improve Logo matching for niche secondary brands
