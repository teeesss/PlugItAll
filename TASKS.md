# TASKS

## 🟢 Completed (Session 2026-01-16)

- [x] **TASK-071**: Export/Import manual subscriptions (JSON format)
  - Backup/Restore functionality for manually added subscriptions.
  - JSON format with versioning and metadata.
  - UI integration in SettingsModal.
- [x] **USAA PDF Parsing Test**:
  - Diagnostic test created to analyze `pdfs/USAA1.pdf`.
  - Identified that the PDF is image-based (scan) and not parseable via current text-layer extraction.
  - Updated documentation to reflect this limitation.

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

## 🟡 Other P0 Tasks

- [ ] **TASK-003**: Implement CSV Column Auto-Detection (Logic to find header row/guess by content) - *Implemented basic guessing*
- [ ] **TASK-017**: Implement "Bill View" / Linear List page for detailed sub analysis.
- [ ] **TASK-018**: Add toggle for "Card View" vs "List View" on main dashboard.

## 🔴 High Priority (P1)

- [x] **TASK-074**: Exclude Credits/Refunds from Subscription Detection
  - Standardized parser to use negative for debits and positive for credits
  - Updated `detectSubscriptions()` to filter out positive amounts in signed datasets
  - Verified with real user data (Google One refund no longer detected)
- [ ] **TASK-004**: Improve Logo matching (Many major brands still missing).
- [ ] **TASK-005**: Add "Cancel All" automated helper flow for common merchants.
- [ ] **TASK-019**: Refine Transaction History UI (Ensure it scales well on mobile).
- [ ] **TASK-006**: Strip Phone Numbers/Category Prefixes from descriptions (Improve Normalizer).
- [ ] **TASK-007**: Handle Pending Transaction Markers ("PENDING", "*").
- [ ] **TASK-008**: Strip City/State Suffixes.
- [ ] **TASK-009**: Expand `subs.json` Merchant Alias Map (Add more keywords for NYT, etc).

## 📋 Roadmap (P2+)

- [ ] **Transaction Explorer Phase 2-6**: See [ROADMAP_TRANSACTION_EXPLORER.md](./ROADMAP_TRANSACTION_EXPLORER.md)
- [ ] **TASK-011**: PDF Multi-Column Layout Support (Chase/BofA).
- [ ] **TASK-017**: Add Multi-Bank Integration Tests.
- [ ] **TASK-022**: Support Quarterly Subscriptions.
- [ ] **TASK-034**: Implement Export to CSV/Excel.
- [ ] **TASK-043**: Add React Error Boundary for crash protection.

_See `PROJECT_STATUS.md` and `issues.md` for historical log._
