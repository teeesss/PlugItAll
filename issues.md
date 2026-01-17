# Known Issues & Debugging Log

## Session: 2026-01-16 (PDF Diagnostic & Backup Export)

### 🟢 Feature: Export/Import Manual Subscriptions (TASK-071)
- **Goal**: Allow users to back up manually added subscriptions.
- **Implementation**: 
  - Added `exportManualSubscriptions` and `importManualSubscriptions` in `storage.ts`.
  - Integrated UI into `SettingsModal.tsx` with Download/Upload buttons.
  - Implemented merging logic with duplicate skipping (by ID).
- **Tests**: `tests/export_import.test.ts` added with 12 tests for backup/restore integrity.

### 🟢 Discovery: USAA PDF Parsing (SUCCESS)
- **Problem**: `pdfs/USAA-*.pdf` crashed in production due to lack of `transform` property checks on Marked Content items.
- **Resolution**: Added defensive checks `item.transform || []` and filtered non-text items early in `parser.ts`.
- **Tests**: Created `tests/parser_robustness.test.ts`.
- **Status**: Fixed in v1.1.4.

### 🟢 Bug: UI Stalls on 0-Subscription Result (SUCCESS)
- **Problem**: If parser returned 0 subscriptions (but valid transactions), the UI remained on the upload screen ("Nothing Happens").
- **Cause**: Dashboard visibility was gated by `candidates.length > 0`.
- **Resolution**: Updated `App.tsx` to show dashboard if `allTransactions.length > 0`. Added "0 Found" badge.
- **Status**: Verified fixed in v1.1.4.

### 🟢 Feature: Export/Import Manual Subscriptions (TASK-071)
- **Problem**: `pdfs/USAA-*.pdf` were initially difficult to parse due to multi-column layouts (separate Debit/Credit) and multi-line descriptions.
- **Resolution**: Implemented a **Table-Aware Parser** in `parser.ts`:
  - **Bank Routing**: Added `detectBank()` to trigger specialized parsing based on statement footer/header.
  - **Column Detection**: Automatically finds "Date", "Description", "Debits", "Credits", "Amount" using X-coordinates.
  - **Multi-line Merging**: Description items spanning multiple lines are now grouped correctly by tracking the current transaction context across lines.
  - **Amount Routing**: Logic now correctly subtractions Debits from Credits when columns are separate.
  - **Summary Filtering**: Improved removal of "Beginning Balance", "Ending Balance", and other non-transactional items.
- **Tests**: `tests/usaa_content.test.ts` and `tests/usaa_multi_test.test.ts` verify all 3 USAA PDFs and ensure **Citi** still works perfectly.
- **Status**: USAA support is now robust and production-ready.

### 🟢 Issue: Manual Subscription Tests Failing in Node.js
- **Symtom**: `tests/export_import.test.ts` failed with `AssertionError`.
- **Cause**: The `localStorage` polyfill in `tests/setup.ts` was only conditionally installed, which caused issues in certain vitest environments.
- **Resolution**: Forced the polyfill on both `globalThis` and `global` using a persistent `Map`.
- **Lesson**: Node.js testing environments for browser-like utilities often require forced polyfills for globals like `localStorage`.

---

## Session: 2026-01-15 (Transaction Explorer Phase 1 Bugs)

### 🔴 Bug: All Transactions Showing as "Credit" 
- **Issue**: In Transaction Explorer, 99% of transactions displayed as "Credit" when they should be "Debit".
- **Cause**: Parser sign logic was inverted. `CR` marker was incorrectly setting amounts to negative, and `DR` marker to positive.
- **Resolution**: Fixed `parseAmount()` in `parser.ts`:
  - `CR` marker → POSITIVE (money TO you)
  - `DR` marker, parentheses `(50.00)`, trailing minus `50.00-` → NEGATIVE (money FROM you)
- **Tests Added**: `tests/amount_sign.test.ts` with 14 new tests for sign logic.
- **Lesson**: Bank statement conventions: Debits = charges (negative), Credits = refunds (positive).

### 🟡 Bug: Alternating Row Colors Not Visible
- **Issue**: Table rows all looked the same color.
- **Cause**: `bg-slate-900` vs `bg-slate-900/50` too subtle.
- **Resolution**: Changed to `bg-slate-800/30` vs `bg-slate-900/50` for more contrast.

---

## Session: 2026-01-15 (Granular Subscription Hiding)

### 🔴 Critical Bug: Hiding One Subscription Hides All With Same Name
- **Issue**: Clicking "Hide" on one SiriusXM subscription ($4.62) also hid the other SiriusXM ($7.71).
- **Cause**: The dismiss logic used `subscription.name` (e.g., "SIRIUSXM") as the ignore key. Both subscriptions shared the same name, so hiding one filtered out both.
- **Resolution**:
    1. Added unique `id` field to `SubscriptionCandidate` interface: `${name}-${amount.toFixed(2)}` (e.g., `SIRIUSXM-4.62`).
    2. Updated `SubscriptionCard.tsx` to pass `subscription.id` to dismiss handler.
    3. Updated `App.tsx` to filter by `id` instead of `name`.
- **Lesson**: For any user-facing filter/hide functionality, always use a unique identifier that distinguishes otherwise-identical items.

---

## Session: 2026-01-15 (PDF Fix & Deployment Optimization)

### 🔴 Critical Bug: PDF Download Filename / GUID Renaming
- **Issue**: Report downloads as a random hash (e.g., `f70b2da5-...`) or fails to download entirely on production.
- **Cause**: Browser security restrictions on `URL.createObjectURL` blob URLs. When triggered via `link.click()`, some browsers ignore the `download` attribute or block the action.
- **Resolution**: Reverted to standard `jsPDF.save('plug-it-all-report.pdf')`.
- **Lesson**: Avoid complex blob-based download triggers for production files if `save()` is available.

### 🔴 Deployment Bug: Stale Assets on Server
- **Issue**: Latest code changes (like the PDF fix) were not reflecting on the live site despite successful FTP upload.
- **Cause**: The deployment script was using a size-based comparison to skip uploads. Vite's hashed bundles (e.g., `index-abc123.js`) occasionally matched the size of previous bundles, causing the script to skip the new bundle and leave the old `index.html` referencing it.
- **Resolution**: 
    1. Added `cleanRemoteAssets()` to delete the remote `assets/` folder before deployment.
    2. Forced upload of all files starting with `assets/` and `index.html`.
- **Lesson**: Always clean remote asset directories when using content-hashed bundles to prevent zombie files.

---


## Session: 2026-01-13 (Subscription Database Integration)

### 🟢 Feature: Comprehensive Subscription Data Migration

**Goal**: Integrate 500+ subscription services from `subscriptions_master.json` into existing data files.

**Implementation**:
- Created `scripts/migrate_master_data.cjs` to automate the migration
- Merged **89 new subscriptions** into `subs.json` (total: 292)
- Added **176 pricing entries** to `subscription_pricing.json` (total: 193)
- Applied **20 fallback URLs** from `subscriptions_master_sup_url.json`

**Field Mappings**:
| Source Field | Target Field |
|--------------|--------------|
| `aliases` | `regex_keywords` |
| `cancellation.url` | `cancel_url` |
| `cancellation.fallback_url` | `fallback_url` (new) |
| `cancellation.notes` | `instructions` |
| `website` | Logo URL via Clearbit |

**Verification**:
- ✅ Baseline test regenerated and passing
- ✅ 77/80 tests passing (2 pre-existing issues)
- ✅ Committed and pushed to remote

**New Files**:
- `subscriptions_master.json` - Full subscription database
- `subscriptions_master_sup_url.json` - Fallback URL updates
- `scripts/migrate_master_data.cjs` - Migration script

---

### 🔧 CI Fixes (2026-01-13)

#### [Issue #19] False Positive: "STAN" Matching "STANDARD"
**Symptom**: "Interest Charged" descriptions were not being filtered by blacklist.

**Root Cause**: The "Stan" streaming service had regex keywords `["Stan", "STAN"]` which matched "STANDARD" in "INTEREST CHARGED TO STANDARD PURCH" via simple substring matching.

**Fix**: Added word boundary regex matching in `matcher.ts` for short keywords (≤5 chars):
```typescript
if (keyword.length <= 5) {
  const wordBoundaryRegex = new RegExp(`\\b${keyword}\\b`, 'i');
  return wordBoundaryRegex.test(normalized);
}
```

**Lesson Learned**: Short keywords should use word boundaries to prevent false substring matches.


**Lesson Learned**: Short keywords should use word boundaries to prevent false substring matches.

---


### 🟢 Feature: Auto-Clear Upload List (TASK-076)
- **Problem**: Uploaded file pills persisted in the UI even after processing was complete, cluttering the view.
- **Resolution**: Implemented a "Key Reset" pattern in `App.tsx`:
  - Added `uploadKey` state that increments after `handleFiles` completes.
  - Passed `key={uploadKey}` to `FileUpload` components.
  - This forces React to unmount and remount the component, cleanly resetting its internal state.
- **Status**: Deployed and verified.


### 🟢 Bug Fix: Clear Data State Sync (TASK-080)
- **Problem**: "Clear Data" button sometimes required two clicks or left "ghost" UI states (like the search box). File inputs didn't reset.
- **Resolution**: refactored `handleClearData` to explicitly close the Explorer panel and force-reset the FileUpload component via the `uploadKey` pattern. Added `type="button"` to prevent accidental form submission behavior.
- **Status**: Fixed in v1.1.6.

### 🟢 Feature: Brand Overhaul (TASK-082)
- **Problem**: Generic branding and disjointed visual hierarchy. Many broken logo links.
- **Resolution**:
  - Implemented custom "Plug Shield" logo.
  - Unified color gradients across Title, Logo, and UI accents.
  - Scripted audit fixed 28 broken logo paths in `subs.json`.
- **Status**: Live in v1.1.6-BRANDING.

### 🟢 Feature: Smarter Matcher (TASK-004)
- **Problem**: Matcher was missing obvious subscriptions or falsely validating short keywords ("Standard" matching "Stan").
- **Resolution**:
  - Implemented centralized `findDatabaseMatch` logic.
  - Enforced `\b` word boundaries for keywords ≤ 5 characters.
  - Deduplicated 17 entries in `subs.json` and fixed missing logo paths.
- **Tests**: `tests/matcher_robustness.test.ts` (8 new tests).

### 🟢 Feature: CSV Scoring Engine (TASK-003)
- **Problem**: Parser blindly picked the first column matching regex, leading to "Balance" being used as "Amount" or "Posted Date" overriding "Transaction Date".
- **Resolution**: Implemented a scoring system (0-100) for column detection.
  - Exact matches (e.g., "Amount") get 100.
  - Preferred terms ("Transaction Date") outscore others ("Posted Date").
  - Removed risky patterns like "Balance".
- **Tests**: `tests/parser_automagic.test.ts`.

### 🟢 Feature: Manual Subscription Export (TASK-071)
- **Problem**: Manual subscriptions were locked to the browser's LocalStorage.
- **Resolution**: Added JSON Export/Import functionality in Settings. Validates schema and avoids duplicates on import.
- **Tests**: `tests/export_import.test.ts`.

### 🟢 Feature: Enhanced City/State Stripping (TASK-008)
- **Problem**: Merchant names often include city/state suffixes like "AMAZON SEATTLE WA" or "STARBUCKS SAN FRANCISCO CA".
- **Resolution**: Implemented comprehensive US state code detection with multi-pass regex:
  - Handles 3-word cities (Salt Lake City UT)
  - Handles 2-word cities (San Francisco CA)
  - Handles single-word cities (Seattle WA)  
  - Handles state-only suffixes (CA, TX, NY)
- **Tests**: `tests/city_state.test.ts` (5 tests) + `tests/normalizer_improvements.test.ts` (updated).

### 🟢 Feature: Expanded Merchant Aliases (TASK-009)
- **Problem**: Popular services like Netflix, Spotify, WSJ had minimal keyword coverage, leading to missed matches.
- **Resolution**: Enhanced keyword coverage for 9 major services:
  - **Netflix**: +5 keywords (NETFLIX.COM, NETFLIX INC, PAYPAL *NETFLIX, etc.)
  - **Spotify**: +5 keywords (SPOTIFY USA, SPOTIFY.COM, SPOTIFY PREMIUM, etc.)
  - **Hulu**: +4 keywords (HULU.COM, HULU LLC, etc.)
  - **WSJ**: +4 keywords (WALL STREET JOURNAL, WSJ.COM, DOW JONES, etc.)
  - **GitHub, Medium, Patreon, Apple, Washington Post**: Combined +18 keywords
- **Scripts**: `scripts/enhance_keywords.cjs` for repeatable enhancement
- **Tests**: `tests/merchant_aliases.test.ts` (18 new tests).

### 🟢 Feature: New Subscription Highlight Animation (TASK-078)
- **Problem**: No visual feedback to indicate which subscriptions were newly discovered from a fresh upload.
- **Resolution**: Implemented pulsing red glow highlight:
  - New subscriptions get `ring-2 ring-red-500/50` border + shadow
  - Slow pulse animation (2s cycle) for 5 seconds
  - Auto-fades after 5s via `setTimeout` cleanup
  - Tracked via `newSubIds` state in `App.tsx`
- **Files**: `src/components/SubscriptionCard.tsx`, `src/App.tsx`, `src/index.css`

---

#### [Issue #20] DOMMatrix Not Defined in Node.js CI
**Symptom**: CI failing on Node 18.x with "ReferenceError: DOMMatrix is not defined".

**Root Cause**: `pdfjs-dist` requires DOM APIs (`DOMMatrix`, `Path2D`) not available in Node.js.

**Fix**: Created `tests/setup.ts` with polyfills and added to `vitest.config.ts`:
```typescript
setupFiles: ['./tests/setup.ts']
```

**Lesson Learned**: PDF parsing libraries often need DOM polyfills for Node.js testing.

---

## Session: 2026-01-11/12 (Major Debugging)

### 🔴 Critical Issues Resolved

---

#### [Issue #12] Second Visible Subscription Not Appearing

**Symptom**: User has 2 Visible phone lines ($35 + $25), only $35 displayed.

**Investigation Process**:

1. Created `debug_visible.ts` to trace normalization → Worked correctly
2. Checked `matchSubscription()` → Returned `true` for both
3. Added console.logs in `analyzer.ts` → Found clusters created correctly
4. Traced through frequency classification → **FOUND IT**

**Root Causes**:

1. `PAYPAL *VISIBLESERV` didn't have override in normalizer
2. 46-day avg interval (user skipped October) failed 25-35 day "Monthly" range

**Fixes**:

```typescript
// normalizer.ts
if (clean.includes("VISIBLESERV")) return "VISIBLE";

// analyzer.ts - added fallback
} else if (isKnown && averageInterval >= 20 && averageInterval <= 70) {
    frequency = 'Monthly';
    confidence = 'Medium';
}
```

**Lesson Learned**: When a known subscription isn't appearing, trace through EVERY stage of the pipeline with debug logging.

---

#### [Issue #13] YouTube TV Showing 3 Cards

**Symptom**: YouTube TV at $80.22, $8.90, $95.92 - should be ONE card

**Root Causes**:

1. Variable pricing from add-ons/discounts
2. $8.90 is NOT YouTube TV (below minimum)

**Fixes**:

```json
// subscription_pricing.json
"min_amount": 50,
"consolidate": true
```

**Lesson Learned**: Use `consolidate: true` for subs with variable pricing to merge into one card.

---

#### [Issue #14] 25 False Positives When Combining CSV + PDF

**Symptom**: Chick-fil-A, Wendy's, Circle K, Dollar General appearing as subscriptions

**Root Cause**: PDF extracted many transactions that, when combined with CSV data, created enough recurrences to pass detection.

**Fix**: Expanded blacklist from 15 to 50+ keywords:

- Fast food chains (Wendy's, Panda Express, Chipotle, etc.)
- Gas stations (Circle K, Marathon, BP, Speedway, etc.)
- Retail (Dollar General, Kroger, CVS, Home Depot, etc.)
- Travel (Pink Jeep Tours, Parking, Hotels, etc.)

**Lesson Learned**: When new false positives appear, immediately add them to the BLACKLIST array.

---

#### [Issue #15] Fabletics Random Amounts

**Symptom**: Fabletics at $67.38, $95.21 appearing as subscription

**Root Cause**: Random purchase amounts, not VIP membership

**Fix**: Added Fabletics to HIGH risk pricing with only valid plans:

```json
"risk_level": "HIGH",
"plans": [
    { "amount": 49.95 },
    { "amount": 59.95 },
    { "amount": 69.95 }
]
```

**Lesson Learned**: For merchants where users buy products AND have subscriptions (Fabletics, Amazon), use pricing validation.

---

#### [Issue #16] App State Not Refreshing

**Symptom**: Old subscriptions persisting after code changes

**Root Cause**: App.tsx was MERGING new data with old state instead of REPLACING

**Fix**:

```typescript
// Before
setCandidates((prev) => [...prev, ...uniqueNew]);

// After
setCandidates(dedupedEnriched); // REPLACE
```

**Lesson Learned**: Use REPLACE instead of MERGE to avoid stale state issues.

---

### 🆕 Features Added

1. **LiveOak Fiber** - Added to subs.json with portal URL
2. **Flexible Interval Detection** - Known subs with 20-70 day intervals accepted
3. **Price Consolidation** - Variable-price subs merge into one card
4. **Min Amount Validation** - YouTube TV requires $50+ to qualify

---

### 📊 Debugging Toolkit

| Script                   | Purpose                                       |
| ------------------------ | --------------------------------------------- |
| `tests/debug_csv.ts`     | Parse CSVs and run analyzer with debug output |
| `tests/debug_visible.ts` | Trace specific subscription through pipeline  |
| `tests/debug_pdf.ts`     | Debug PDF parsing                             |

### 🧪 Test Coverage

All 7 test files, 38 tests passing:

- `analyzer.test.ts` - Core detection logic
- `normalizer.test.ts` - Description cleaning
- `matcher.test.ts` - Subscription matching
- `user_complaints.test.ts` - False positive prevention
- `core_logic.test.ts` - Visible dual-plan, YouTube TV
- `repro_false_positives.test.ts` - Edge cases
- `real_world.test.ts` - Real user data patterns

---

### Detector Logic Refinements (2026-01-12)

- **Problem**: False positives with variable prices (retail/restaurants).
- [x] Switched to median-based intervals for robustness against PDF outliers.
- [x] Set unknown merchants to "Low" confidence (Review).
- [x] **New (2026-01-12)**: Implemented aggressive shopping pattern detection (3+ price points).
- [x] **New (2026-01-12)**: Blacklisted eBay and Amazon for general purchases (bypassed if in DB).
- [x] **New (2026-01-12)**: Refined Normalizer to keep "AMAZON PRIME" separate from marketplace purchases.

- **Lessons Learned**:
  - **Never trust unknown merchants with a single interval** unless it's exactly [25-35] days.
  - **Median is better than Average** for financial clustering where outliers (yearly renewals or statement gaps) are common.
  - **Yearly detection** for unknown merchants is extremely risky and needs a long data span (>300 days).
  - **Shopping patterns (3+ clusters)** are the best way to distinguish between retail visits and subscriptions with multiple plans.

## Debugging Checklist

- [x] Check for duplicate transactions in CSV+PDF.
- [x] Verify normalization prefixes (first 20 chars).
- [x] Check `amountVariance` thresholds (0.1 for 3+ items).
- [x] Verify `medianInterval` vs `averageInterval`.
- [x] Ensure `isKnown` is correctly set via `matchSubscription`.
- [ ] Check normalization: Does description normalize correctly?
- [ ] Check matcher: Does `matchSubscription(normalized)` return true?
- [ ] Check blacklist: Is the name accidentally matching a blacklist entry?
- [ ] Check clustering: How many clusters exist for this merchant?
- [ ] Check isShoppingPattern: Are there 3+ single-item clusters?
- [ ] Check price validation: Is it a HIGH risk merchant with wrong price?
- [ ] Check interval: Is the average interval within classification range?

When a false positive appears:

1. [ ] Add to BLACKLIST in `analyzer.ts`
2. [ ] If it's a shopping merchant (Amazon, Walmart, Fabletics), add to `subscription_pricing.json` with HIGH risk
3. [ ] Run tests to ensure fix doesn't break legitimate detections

---

## Session: 2026-01-12 (Pre-Commit & GitHub Setup)

### 🔧 Infrastructure Setup

#### [Issue #17] Pre-Commit Hook Configuration

**Goal**: Set up pre-commit hooks with Prettier, ESLint, Gitleaks, and Checkov.

**Files Created**:

- `.pre-commit-config.yaml` — Main configuration
- `.prettierrc` — Prettier settings
- `.prettierignore` — Files to ignore for Prettier
- `.eslintrc.cjs` — Legacy ESLint config

**Issues Encountered**:

1. **@ts-ignore not allowed** — ESLint requires `@ts-expect-error` instead of `@ts-ignore`
2. **Unused @ts-expect-error directives** — TypeScript was resolving types correctly, making them unnecessary
3. **`any` types in test files** — pdfjs-dist returns untyped items; added eslint-disable comments
4. **JSON comments in tsconfigs** — `check-json` hook failed; removed `/* Bundler mode */` comments
5. **Unused imports** — `normalizeDescription`, `cn`, `CheckCircle`, `SubscriptionCandidate` removed
6. **React hooks exhaustive-deps** — Fixed `useCallback` dependencies in `FileUpload.tsx`
7. **Useless regex escapes** — Fixed `\/` → `/` and `\.` → `.` in character classes

**Resolution**: All hooks now pass. Command: `python -m pre_commit run --all-files`

---

#### [Issue #18] GitHub Push Blocked by Secret Scanning

**Symptom**: `git push` failed with "GH013: Repository rule violations" — personal access token detected.

**Root Cause**: `.gitcreds` was tracked by Git and contained the GitHub PAT.

**Fix**:

1. Added `.gitcreds` to `.gitignore`
2. Ran `git rm --cached .gitcreds` to untrack the file
3. Created fresh commit without the secret

**Lesson Learned**: Always add credential files to `.gitignore` BEFORE creating them.

---

### 🆕 Product Rename: **Plug It All**

- **Tagline**: "Find the leaks in your bank account"
- **GitHub Repo**: [https://github.com/teeesss/PlugItAll](https://github.com/teeesss/PlugItAll)
- **Header Updated**: `App.tsx` now shows "Plug It All" with processing indicator
- **Page Title Updated**: `index.html` → "Plug It All - Find the leaks in your bank account"

---

### 📊 Test Status

- **47 Tests Passing** across 8 test files
- **47+ Tests Passing** including expanded parser unit tests.

### 🆕 Fixed in v1.1.0-i (2026-01-12)
- **Extreme Robustness Refactor**: `parseDate` and `parseAmount` rewritten to handle European formats (`DD/MM`, `1.234,56`), CR/DR markers, and varied thousand separators.
- **Future Date Bug**: Fixed "Dec 2026" appearing in Jan 2026. `parseDate` now intelligently rolls back the year for MM/DD formats if the result is in the far future.
- **Verification Promotion**: Subscriptions with 3+ consistent charges are now automatically promoted to "Verified" (High confidence).
- **Amazon & Walmart Regression**: Fixed sticky blacklist that was blocking Walmart+ and Amazon Prime. These are now handled by the high-risk pricing validation engine.
- **UI Enhancement**: Added "Transaction Count" badge to subscription cards so users can see charge history depth at a glance.
- **CSV Robustness**: Implemented automatic header detection and fallback guessing (finds headers even with leading junk rows).
- **Expanded Restaurant Blacklist**: Added comprehensive list of fast-food and restaurant keywords (including 'Little Caesars', 'Burger King', 'Pizza Hut', etc.) with fuzzy matching support for spaced/non-spaced variations (e.g., 'TACO BELL' vs 'TACOBELL').
- **Delivery Subs Supported**: Explicitly excluded DoorDash, Uber Eats, and Grubhub from the blacklist (and added to `subs.json`) to support detection of their membership plans (DashPass, etc.).
