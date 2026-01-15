# OVERVIEW

For a detailed technical breakdown, see [project_overview.md](./project_overview.md).

## Core Purpose

**Plug It All** is a client-side tool to find and cancel subscriptions without sharing your financial data with any server.

Tagline: _"Find the leaks in your bank account"_

## Design Philosophy

- **Privacy First**: No data leaves the browser.
- **Static First**: No backend required; can be hosted anywhere.
- **Reliability First**: Driven by 80+ strict test cases to avoid false positives.
- **Quality First**: Pre-commit hooks enforce code standards on every commit.

## Recent Architectural Shifts

- **Unique ID-Based Hiding**: Subscriptions now have unique IDs (`name-amount`) for granular dismiss functionality.
- **Median vs Average**: Switched to median intervals to handle variable statement dates.
- **Shopping Patterns**: Merchant visits with 3+ distinct prices are rejected to avoid one-off retail visits (eBay fix).
- **Consolidated Plan Support**: Logic handles merchants like Visible that have multiple plan price points ($25, $35).
- **Pre-Commit Hooks**: ESLint, Prettier, Gitleaks, and Checkov enforce standards automatically.

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
