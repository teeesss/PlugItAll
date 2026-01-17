# Transaction Explorer & Enhanced Features Roadmap

## Project Summary

Adding a Transaction Explorer feature that gives users the ability to search, filter, and analyze all their uploaded transactions—not just detected subscriptions. This expands the app from "subscription finder" toward "bank statement analyzer" while maintaining the privacy-first, client-side architecture.

---

## Phase 1: Core Transaction Explorer ✅ **COMPLETED**
**Foundation - Search, Filter, Display**

### Task 1.1: Transaction State Architecture ✅
- [x] Audit current codebase to understand how parsed transactions flow through React state
- [x] Ensure all uploaded files merge into a single unified transaction array with proper date sorting
- [x] Add a transactions context or state that the explorer can consume
- [x] Transactions should persist in state until user refreshes or clears

### Task 1.2: Search Bar Component (Stealth Mode) ✅
- [x] Add subtle search icon + input in header area (collapsed by default)
- [x] Input placeholder: "Search transactions..."
- [x] Only visible/enabled after files are uploaded (hidden completely before upload)
- [x] Clicking expands to show quick results (5-10 items max)

### Task 1.3: Quick Results Dropdown ✅
- [x] Shows matching transactions as user types (debounced 300ms)
- [x] Displays: Date | Description | Amount
- [x] "See all X results →" link at bottom when results exceed 5
- [x] Keyboard navigable (arrow keys, enter to select)

### Task 1.4: Full Explorer Panel (Overlay Mode) ✅
- [x] "See all results" opens 85-90% screen overlay
- [x] Semi-transparent backdrop, subscription page visible behind
- [x] Close button (X) and click-outside-to-close
- [x] Smooth slide-up or fade-in animation

### Task 1.5: Transaction Table in Explorer ✅
- [x] Sortable columns: Date, Description, Amount, Type (Credit/Debit)
- [x] Alternating row colors for readability
- [x] Debit amounts in red/normal, credits in green
- [x] Scrollable with sticky header
- [x] Show total count: "Showing X of Y transactions"

### Task 1.6: Price Range Filter Buttons ✅
- [x] Toggle button chips for preset ranges:
  - Under $10
  - $10 - $50
  - $50 - $100
  - $100 - $500
  - $500 - $1,000
  - Over $1,000
- [x] Multiple can be selected (OR logic within price, AND with search text)
- [x] Visual feedback when active (filled vs outlined)

### Task 1.7: Credit/Debit Toggle ✅
- [x] Default: Debits only (most common use case)
- [x] Toggle button to include credits
- [x] Or three-state: Debits | Credits | Both

### Task 1.8: Date Range Filter ✅
- [x] Quick presets: Last 30 days, Last 3 months, Last 6 months, All
- [x] Custom date range picker (optional, can defer to Phase 2)

### Task 1.9: Combined Filter Logic ✅
- [x] All filters work together with AND logic
- [x] Active filters shown as removable pills/tags
- [x] "Clear all filters" button when any filter active

---

## Phase 2: Manual Subscription Management ✅ **COMPLETED**
**User Control - Add, Edit, Override**

### Task 2.1: "Add as Subscription" Action ✅
- [x] Each transaction row in explorer gets a "+" or "Add" button
- [x] Clicking opens a small modal/popover:
  - Confirm merchant name (editable, linked to original)
  - Select frequency: Weekly / Monthly / Quarterly / Yearly
  - Optional: Expected amount, notes
- [x] Save adds to subscription list with "Manual" badge

### Task 2.2: LocalStorage Persistence for Manual Subs ✅
- [x] Store user-added subscriptions in localStorage
- [x] Key structure: `plugitall_manual_subs`
- [x] Load on app init, merge with auto-detected
- [x] Include timestamp for when added

### Task 2.3: Export/Import Manual Subscriptions ✅
- [x] Export button downloads JSON file of manual subs
- [x] Import button allows restoring from JSON
- [x] Validates JSON structure before importing

### Task 2.4: Conflict Resolution ✅
- [x] When auto-detection finds something user already added manually:
  - Show notification/toast: "We detected [X] which you added manually"
  - Options: Keep manual settings | Use auto-detected | Merge
  - User's frequency/notes preserved if they choose merge

### Task 2.5: Edit/Remove Manual Subscriptions ✅
- [x] Edit icon on manual subscription cards
- [x] Opens same modal as "Add" with current values
- [x] Delete option with confirmation

---

## Phase 3: Auto-Categorization Engine
**Intelligence - Classify Transactions**

### Task 3.1: Category Definition File
- [ ] Create `src/data/categories.ts` with:
  - Category ID, name, icon, color
  - Pattern matches (regex/keywords)
- [ ] Initial broad categories:
  - Food & Dining
  - Entertainment
  - Utilities
  - Shopping
  - Transportation
  - Health & Fitness
  - Subscriptions (links to existing detection)
  - Income/Credits
  - Uncategorized

### Task 3.2: Category Matching Engine
- [ ] Similar architecture to subscription matcher
- [ ] Normalize description → match against category patterns
- [ ] Return category ID or "uncategorized"
- [ ] Run on all transactions during parse

### Task 3.3: Category Display in Explorer
- [ ] Add Category column to transaction table
- [ ] Color-coded pills/badges for each category
- [ ] Filter by category (checkbox list or chips)

### Task 3.4: User Category Override
- [ ] Click category pill to change it
- [ ] Dropdown of available categories
- [ ] Store overrides in localStorage
- [ ] Future: Let user add custom categories (backlog)

### Task 3.5: Category Toggle (Enable/Disable)
- [ ] Settings option to turn auto-categorization on/off
- [ ] When off, category column hidden
- [ ] Preference saved in localStorage

---

## Phase 4: Insights & Visualization ✅ **COMPLETED (Partial)**
**Analytics - Charts and Summaries**

### Task 4.1: Spending Summary Component ✅
- [x] Total spent (debits) for uploaded period
- [x] Total income (credits) for uploaded period
- [x] Net change
- [x] Date range covered

### Task 4.2: Spending by Category Bar Chart
- [ ] Horizontal bar chart
- [ ] Categories sorted by amount (highest first)
- [ ] Click bar to filter explorer to that category
- [ ] Use recharts library
**Note**: Requires Phase 3 (Categorization) to be completed first.

### Task 4.3: Spending Over Time Line Chart ✅
- [x] Monthly spending trend
- [x] X-axis: months, Y-axis: total spent
- [x] Optional: overlay income line
- [x] Handles partial months gracefully

### Task 4.4: Category Breakdown Donut Chart
- [ ] Visual percentage breakdown
- [ ] Legend with amounts
- [ ] "Other/Uncategorized" grouped if small
**Note**: Requires Phase 3 (Categorization) to be completed first.

### Task 4.5: Top Merchants List ✅
- [x] "You spent the most at:" section
- [x] Top 5-10 merchants by total amount
- [x] Shows count of transactions + total

### Task 4.6: Insights Section Layout ✅
- [x] Collapsible section below subscriptions (or tab)
- [x] Only shows after file upload
- [x] Clean card-based layout for each chart/summary

---

## Phase 5: Export Enhancements
**Output - CSV and Enhanced PDF**

### Task 5.1: CSV Export for Transactions
- [ ] Export filtered or all transactions to CSV
- [ ] Columns: Date, Description, Amount, Type, Category
- [ ] Respects current filters (exports what you see)
- [ ] Filename includes date range

### Task 5.2: CSV Export for Subscriptions
- [ ] Separate from transaction export
- [ ] Includes: Name, Amount, Frequency, Status (Verified/Review/Manual), Category

### Task 5.3: Enhanced PDF Report
- [ ] Add new sections to existing PDF:
  - Spending summary
  - Category breakdown (simple table, not chart)
  - Top merchants
- [ ] Keep existing subscription section intact
- [ ] Do not modify current PDF parser—create wrapper/enhancer

---

## Phase 6: Polish & Edge Cases
**Refinement - UX Details**

### Task 6.1: Empty States
- [ ] Explorer hidden before file upload
- [ ] After upload with no results for search: "No transactions match your filters"
- [ ] Clear messaging throughout

### Task 6.2: Duplicate Transaction Detection
- [ ] Flag potential duplicates (same merchant, amount, date)
- [ ] Visual indicator in explorer
- [ ] Tooltip explains why flagged

### Task 6.3: Refund Handling
- [ ] Detect refund keywords in description
- [ ] Tag as "Refund" in explorer
- [ ] Exclude from spending totals (or show separately)
- [ ] Note: Does not affect subscription detection

### Task 6.4: Performance Optimization
- [ ] Virtualized list for 500+ transactions (only render visible rows)
- [ ] Debounced search (300ms)
- [ ] Memoized filter calculations

### Task 6.5: Keyboard Navigation
- [ ] Tab through filters
- [ ] Arrow keys in results
- [ ] Escape closes overlay
- [ ] Enter selects/confirms

### Task 6.6: Mobile Responsiveness
- [ ] Explorer overlay goes full-screen on mobile
- [ ] Filters collapse into dropdown/accordion
- [ ] Touch-friendly button sizes

---

## Backlog (Future Consideration)

- [ ] User feedback mechanism for unknown categories (submit to improve matching)
- [ ] Custom user categories (beyond preset list)
- [ ] Recurring payment predictions ("Your next Netflix charge is ~Dec 15")
- [ ] Bill calendar view (calendar showing expected charges)
- [ ] Multi-currency support
- [ ] Bank connection (Plaid integration—breaks privacy-first model, would be opt-in)
- [ ] Browser extension for auto-importing statements
- [ ] Comparison view (this month vs last month)
- [ ] Subscription cancellation links/guides

---

## Technical Notes

- **Do not modify existing PDF parser**—create new components alongside
- **All data stays client-side**—localStorage for persistence, no server calls
- **Match existing styling**—keep current CSS/Tailwind theme
- **New route consideration**: `/explorer` could be a dedicated page, but overlay approach keeps single-page feel
- **Testing**: Add Vitest tests for new utilities (category matcher, filter logic)

---

## Suggested Starting Point

Begin with **Phase 1 (Tasks 1.1–1.5)** to get the basic explorer working. This gives you a functional feature to test UI approaches without the complexity of categorization or manual subscriptions.
