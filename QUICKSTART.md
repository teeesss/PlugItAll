# QUICKSTART GUIDE

## Product

**Plug It All** — Find the leaks in your bank account

GitHub: [https://github.com/teeesss/PlugItAll](https://github.com/teeesss/PlugItAll)

## Prerequisites

- Node.js (v18+)
- npm
- Python 3 (for pre-commit hooks)

## Setup

```bash
git clone https://github.com/teeesss/PlugItAll.git
cd PlugItAll
npm install
python -m pip install pre-commit
python -m pre_commit install
```

## Running the App

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## How to Test Detection

1. Open the app.
2. Drag and drop your bank CSV or PDF statements.
3. Observe the "Active Subscriptions" dashboard.
4. Verify "Verified" vs "Review" status.

## Running Automated Tests

```bash
npm run test:run
```

This runs all 119 unit and integration tests across 18 test suites.

## Running Pre-Commit Checks

```bash
python -m pre_commit run --all-files
```

This runs Prettier, ESLint, Gitleaks, Checkov, and other quality checks.
