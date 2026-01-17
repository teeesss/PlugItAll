# TASKS

## � In Progress (Session 2026-01-17)

- [ ] **TASK-085**: Comprehensive Insights Filtering & Interactivity (v1.2.0)
  - Add transaction type filter: All | Purchases | Credits
  - Add date range filter: 30d, 3m, 6m, YTD, All
  - Add sort options: Largest, Smallest, Most Frequent, Alphabetical
  - Add merchant search/filter box
  - Create "Top Credits" section (mirror of Top Merchants)
  - Make merchant rows clickable → opens detail modal with all transactions
  - Add filter badges showing active filters
  - Integrate all filters to work together dynamically

## �🟢 Completed (Session 2026-01-17)

- [x] **TASK-084**: Fix Insights Double-Counting Issue (v1.1.7)
- [x] **TASK-083**: Implement Insights Dashboard (Phase 4: Charts & Visualization)
  - Created `Insights.tsx` component with collapsible panel.
  - **Task 4.1**: Spending Summary Component (Total Spent, Total Income, Net Change, Date Range).
  - **Task 4.3**: Spending Over Time Line Chart (Monthly trend with recharts).
  - **Task 4.5**: Top Merchants List (Top 10 by total spend).
  - **Task 4.6**: Insights Section Layout (Clean card-based UI, placed below Stats).
  - Installed `recharts` library for charting.
  - Integrated into `App.tsx` dashboard.
  - Created `tests/insights.test.tsx` for component testing.
  - Deployed to production (v1.1.6).

## 🟢 Completed (Session 2026-01-16)

- [x] **TASK-071**: Export/Import manual subscriptions (JSON format)
  - Backup/Restore functionality for manually added subscriptions.
  - JSON format with versioning and metadata.
  - UI integration in SettingsModal.
- [x] **USAA PDF Parsing Fix** (v1.1.4):
  - Created robustness test `parser_robustness.test.ts`.
  - Added defensive checks in `parser.ts` to handle malformed `transform` properties in PDF items.
  - Verified fix on production.

- [x] **0-Subscription UI Transition Fix** (v1.1.4):
  - Updated `App.tsx` logic to transition to dashboard if allTransactions > 0.
  - Added "0 Found" badge and "Add More Data" visibility.
- [x] **E*TRADE PDF Support** (v1.1.5):
  - Analyzed and integrated Etrade PDF parsing (summary/generic format).
  - Added `tests/pdf_parser.test.ts` for robustness.
  - Updated `parser.ts` with Etrade detection and lint cleanup.
  - Verified and deployed.

## 🟢 Completed (Session 2026-01-15)

- [x] **TASK-058**: Fix Granular Subscription Hiding
  - Hiding one SiriusXM ($4.62) no longer hides the other ($7.71).
  - Added unique `id` field (`name-amount`) to `SubscriptionCandidate`.
  - Updated filtering to use `id` instead of `name`.
- [x] **TASK-060 to TASK-075**: Transaction Explorer Phase 1 & 2 Core
  - Created `TransactionSearch.tsx` (stealth search, results dropdown)
  - Created `TransactionExplorer.tsx` (Overlay table, sortable, filters)
  - **Manual Toggle**: Implemented "+" / Checkmark toggle for adding/removing subscriptions (TASK-075).
  - Added unique `id` field (`name-amount`) for granular dismissal.
  - Standardized credit/debit sign logic across all parsers.
  - Excluded credits/refunds from detection.
  - Integrated `localStorage` persistence for manual and ignored items.
  - All 115 tests pass, logic verified.
- [x] **TASK-055**: Fix PDF Download Filename Logic
  - Reverted to `jsPDF.save()` to fix persistent random hash filenames on production.
- [x] **TASK-056**: Optimize Deployment Script
  - Implemented intelligent sync to skip ~150 logo files if unchanged.
  - Added remote asset folder cleaning to prevent stale build bundles.
- [x] **TASK-057**: Environment Management
  - Enforced single-node-instance rule for builds and deployments.

## 🟢 Completed (Session 2026-01-13)

- [x] **TASK-050**: Integrate 500+ subscription database from master data files
  - Added 89 new subscriptions to `subs.json` (total: 292)
  - Added 176 pricing entries to `subscription_pricing.json` (total: 193)
  - Applied 20 fallback URLs from `subscriptions_master_sup_url.json`
  - Created migration script: `scripts/migrate_master_data.cjs`

## 🟢 Completed (Session 2026-01-12)

- [x] Fix Visible $25 missing when combined with PDF.
- [x] Implement CSV+PDF transaction deduplication.
- [x] Implement median-based interval analysis.
- [x] Add eBay/Amazon aggressive shopping rejection.
- [x] Update test suite to 47 passing tests.
- [x] Set up pre-commit hooks (Prettier, ESLint, Gitleaks, Checkov).
- [x] Rename product to "Plug It All" and update UI.
- [x] Push codebase to GitHub ([teeesss/PlugItAll](https://github.com/teeesss/PlugItAll)).
- [x] Fix all lint errors (@ts-ignore, unused imports, regex escapes).
- [x] **TASK-001**: Implement robust `parseDate` (ISO, European, abbreviated formats)
- [x] **TASK-002**: Implement robust `parseAmount` (parentheticals, trailing signs)
- [x] **TASK-016**: Add `parser.test.ts` for unit testing extraction logic
- [x] **Fix Future Date Bug**: Intelligently handle Dec/Jan rollover.
- [x] **Verification Promotion**: Automate "Verified" status for 3+ consistent charges.
- [x] **UI Enhancement**: Added Transaction Count badge to cards.

## 🟡 Next Up (P0 Critical) - Transaction Explorer Phase 2

_Full roadmap: [ROADMAP_TRANSACTION_EXPLORER.md](./ROADMAP_TRANSACTION_EXPLORER.md)_

**Phase 1 Complete!** ✅ Search bar, explorer overlay, filters all working.

- [x] **TASK-069**: "Add as Subscription" Action
  - Added "Add as Sub" column to Explorer with toggle functionality.
- [x] **TASK-070**: LocalStorage Persistence for Manual Subs
  - Removals and additions persistent via `storage.ts`.
- [x] **TASK-072**: Conflict Resolution
  - Manual subscriptions take precedence via ID matching.
- [x] **TASK-073**: Remove Manual Subscriptions
  - Provided toggle in Explorer and trash can on cards.
- [x] **TASK-075**: Remove Manual Subscriptions from Explorer
  - Implemented logic to "uncheck" manual subscriptions directly in the table.


- [x] **TASK-071**: Export/Import Manual Subscriptions (COMPLETED 2026-01-16)
- [x] **TASK-076**: Auto-clear file list after successful processing (UI Polish).
  - Implemented `uploadKey` state in `App.tsx` to force-reset `FileUpload` components after processing.

## 🟡 Other P0 Tasks


- [ ] **TASK-003**: Implement CSV Column Auto-Detection (Logic to find header row/guess by content) - *Implemented basic guessing*

- [x] **TASK-077**: New Data Feedback (Toast Message).
  - Created `Toast.tsx` component with success/info stats.
  - Integrated into `App.tsx` to show "Processed X transactions" and "Found Y new subscriptions" after upload.
- [x] **TASK-017**: Implement "Bill View" / Linear List page for detailed sub analysis.
  - Created `BillView.tsx` component with table layout.
  - Added view mode toggle (Cards vs List) next to Download Report button.
  - Conditional rendering based on view mode state.
  - Table shows: Service, Amount, Frequency, Confidence, Actions.
  - Summary footer with total count and monthly amount.

- [ ] **TASK-018**: Add toggle for "Card View" vs "List View" on main dashboard.


- [x] **TASK-080**: Fix "Clear Data" Double-Click Bug.
  - Updated `handleClearData` to explicitly close Explorer and cycle `uploadKey`. Added `type="button"` to prevent form submission issues.
- [x] **TASK-081**: Cleanup Header & Hero Text.
  - Tagline and Privacy Banner now hidden in Header on initial load (Hero state).
  - They reappear in Header when Dashboard is active.
- [x] **TASK-082**: Brand Refresh.
  - Implemented new "Plug Shield" logo (V3).
  - Updated Title Gradient to match.
  - Fixed 28 broken logo paths in `subs.json`.
- [x] **TASK-079**: Standardize Privacy Banner Styling.
  - Created reusable `PrivacyBanner` component.
  - Unified styling between Hero and Dashboard views.
- [x] **TASK-004**: Improve logo matching.
  - Consolidated matching logic into `matcher.ts`.
  - Implemented smart regex with word boundary safety.
  - Deduplicated `subs.json` via script.
- [x] **TASK-003**: CSV column auto-detection improvements
  - Implemented scoring system (0-100) for column detection.
  - Exact matches prioritized, removed risky patterns like "Balance".
  - Tests: `tests/parser_automagic.test.ts`.
- [x] **TASK-071**: Export/Import manual subscriptions (JSON format)
  - Added JSON Export/Import in Settings Modal.
  - Validates schema and prevents duplicates on import.
  - Tests: `tests/export_import.test.ts`.

## 🔴 High Priority (P1)

- [ ] **TASK-005**: Add "Cancel All" automated helper flow for common merchants.
- [ ] **TASK-019**: Refine Transaction History UI (Ensure it scales well on mobile).


- [x] **TASK-006**: Strip Phone Numbers/Category Prefixes from descriptions (Improve Normalizer).
  - Implemented aggressive phone number stripping.
  - Added support for payment processor prefixes (SQ, TST, PAYPAL).
  - Fixed regression where years (2025) triggered zip code truncation.
  - Implemented 'Early Exit' overrides to protect known brands (Netflix, YouTube TV) from aggressive cleaning.
- [x] **TASK-007**: Handle Pending Transaction Markers ("PENDING", "*").
  - Added support for leading "PENDING", "* PENDING", and suffix " - PENDING".
  - Created `tests/pending_markers.test.ts` to verify 10+ variations.
- [x] **TASK-008**: Strip City/State Suffixes.
  - Implemented multi-pass regex for 1-3 word cities + state codes.
  - Handles: "SALT LAKE CITY UT", "SAN FRANCISCO CA", "SEATTLE WA", "CA".
  - Tests: `tests/city_state.test.ts` (5 tests).
- [x] **TASK-009**: Expand Merchant Alias Map.
  - Added 35+ keywords across 9 popular services (Netflix, Spotify, GitHub, Medium, etc.).
  - Created `scripts/enhance_keywords.cjs` for reproducible enhancement.
  - Tests: `tests/merchant_aliases.test.ts` (18 tests).
- [x] **TASK-078**: Highlight Newly Discovered Subscriptions.
  - New subscriptions pulse with green glow (changed from red) for 7 seconds after upload.
  - Adds visual feedback for newly found subscriptions.
  - Auto-fades after 7s with smooth animation.
  - **Fix Applied**: Removed local state, uses `isNew` prop directly controlled by parent.
  - **Timer Management**: useEffect hook watches newSubIds.size and manages 7s timer with proper cleanup.

## 📋 Roadmap (P2+)

- [ ] **Transaction Explorer Phase 2-6**: See [ROADMAP_TRANSACTION_EXPLORER.md](./ROADMAP_TRANSACTION_EXPLORER.md)
- [ ] **TASK-011**: PDF Multi-Column Layout Support (Chase/BofA).
- [ ] **TASK-017**: Add Multi-Bank Integration Tests.
- [ ] **TASK-022**: Support Quarterly Subscriptions.

- [ ] **TASK-034**: Implement Export to CSV/Excel.
- [ ] **TASK-043**: Add React Error Boundary for crash protection.
- [ ] **TASK-078**: Highlight Newly Discovered Subscriptions.
  - Temporarily highlight (red glow/border) new cards when they first appear from a fresh upload for 5s.

_See `PROJECT_STATUS.md` and `issues.md` for historical log._
