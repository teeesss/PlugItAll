# Plug It - Find the Leaks in Your Bank Account

A privacy-first, client-side subscription detection tool that analyzes bank statements (PDF/CSV) to identify recurring charges.

**GitHub**: [https://github.com/teeesss/plug-it](https://github.com/teeesss/plug-it)

## Features

- 🔒 **100% Client-Side** - All processing happens in your browser. No data sent to servers.
- 📊 **PDF & CSV Support** - Upload bank statements in either format
- 🎯 **Smart Detection** - Identifies subscriptions using pattern matching, **median-based clustering**, and **shopping pattern rejection**.
- ✅ **Verified vs Review** - Known subscriptions are marked "Verified", others marked for "Review" (Low confidence).
- 🚫 **False Positive Filtering** - Extensive blacklist (eBay, Amazon, restaurants) prevents random retail visits from appearing.
- 💰 **Price Validation** - High-risk merchants (Amazon, Walmart, Fabletics) require exact price match or known subscription markers.

## Quick Start

```bash
npm install
npm run dev
```

Then open http://localhost:5173 and drop your bank statements.

## Supported Subscriptions

The engine recognizes 155+ subscription services including:

- Streaming: Netflix, YouTube TV, Hulu, Disney+, Spotify, etc.
- Telecom: Visible, AT&T, Verizon, T-Mobile, etc.
- Fitness: Planet Fitness, Peloton, etc.
- Software: Adobe, Microsoft 365, iCloud, etc.
- Internet: LiveOak Fiber, Xfinity, etc.

## Detection Logic

1. **Normalization**: Cleans transaction descriptions
2. **Grouping**: Groups by normalized description
3. **Blacklist Filter**: Removes known non-subscription merchants
4. **Clustering**: Groups by price point ($1 tolerance)
5. **Recurrence Check**: Requires 2+ occurrences (or known subscription)
6. **Frequency Analysis**: Classifies as Weekly/Monthly/Yearly
7. **Price Validation**: Validates high-risk merchants against known pricing

## Tech Stack

- React + TypeScript + Vite
- Tailwind CSS
- pdfjs-dist (PDF parsing)
- papaparse (CSV parsing)
- Vitest (testing)

## Code Quality

Pre-commit hooks are installed for automatic linting and formatting:

```bash
# Run manually
python -m pre_commit run --all-files
```

Hooks include: **Prettier**, **ESLint**, **Gitleaks** (secret detection), **Checkov** (security scanning)

## Tests

```bash
npm test
```

8 test files with 47 tests covering analyzer, normalizer, matcher, and real-world scenarios.

## License

MIT
