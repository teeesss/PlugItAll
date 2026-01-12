# TASKS

## 🟢 Completed (Session 2026-01-12)

- [x] Fix Visible $25 missing when combined with PDF.
- [x] Implement CSV+PDF transaction deduplication.
- [x] Implement median-based interval analysis.
- [x] Add eBay/Amazon aggressive shopping rejection.
- [x] Add Google Play web cancellation info.
- [x] Update test suite to 47 passing tests.
- [x] Update all project documentation (.cursorrules, README, etc.).
- [x] **Set up pre-commit hooks** (Prettier, ESLint, Gitleaks, Checkov).
- [x] **Rename product to "Plug It"** and update UI.
- [x] **Push codebase to GitHub** ([teeesss/plug-it](https://github.com/teeesss/plug-it)).
- [x] **Fix all lint errors** (@ts-ignore, unused imports, regex escapes).

## 🟡 Next Up

- [x] Add more "Known High Risk" merchants to `subscription_pricing.json`.
- [x] Implement export functionality (PDF summary of detected subs).
- [x] Refine logo matching for very small local merchants.
- [x] Add CI/CD pipeline with GitHub Actions.

## 📋 Ongoing Maintenance

- [ ] Monitor issues.md for new common false positives.
- [ ] Periodically update `subs.json` cancel URLs.
- [ ] Run `python -m pre_commit run --all-files` before releases.
