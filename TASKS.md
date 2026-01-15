# TASKS

## 🟢 Completed (Session 2026-01-15)

- [x] **TASK-058**: Fix Granular Subscription Hiding
  - Hiding one SiriusXM ($4.62) no longer hides the other ($7.71).
  - Added unique `id` field (`name-amount`) to `SubscriptionCandidate`.
  - Updated filtering to use `id` instead of `name`.
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

## 🟡 Next Up (P0 Critical)

- [ ] **TASK-059**: Transaction Search / Filter
  - Add search box to filter uploaded transactions by keyword or wildcard.
  - Allow users to quickly find specific merchants or charges.
- [ ] **TASK-003**: Implement CSV Column Auto-Detection (Logic to find header row/guess by content) - *Implemented basic guessing*
- [ ] **TASK-017**: Implement "Bill View" / Linear List page for detailed sub analysis.
- [ ] **TASK-018**: Add toggle for "Card View" vs "List View" on main dashboard.

## 🔴 High Priority (P1)

- [ ] **TASK-004**: Improve Logo matching (Many major brands still missing).
- [ ] **TASK-005**: Add "Cancel All" automated helper flow for common merchants.
- [ ] **TASK-019**: Refine Transaction History UI (Ensure it scales well on mobile).
- [ ] **TASK-006**: Strip Phone Numbers/Category Prefixes from descriptions (Improve Normalizer).
- [ ] **TASK-007**: Handle Pending Transaction Markers ("PENDING", "*").
- [ ] **TASK-008**: Strip City/State Suffixes.
- [ ] **TASK-009**: Expand `subs.json` Merchant Alias Map (Add more keywords for NYT, etc).

## 📋 Roadmap (P2+)

- [ ] **TASK-011**: PDF Multi-Column Layout Support (Chase/BofA).
- [ ] **TASK-017**: Add Multi-Bank Integration Tests.
- [ ] **TASK-022**: Support Quarterly Subscriptions.
- [ ] **TASK-034**: Implement Export to CSV/Excel.
- [ ] **TASK-043**: Add React Error Boundary for crash protection.

_See `PROJECT_STATUS.md` and `issues.md` for historical log._
