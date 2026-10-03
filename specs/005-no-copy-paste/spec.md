# Spec 005: No copy-paste
## Outcome
No raw copied comments/text from Johan, forum or other projects in the repo. Knowledge is rewritten as our own
rules/quirks/DEVICE_TRUTH entries with only `{url, author}` provenance.
## Requirements
- Convert data/leads/johan-comments-raw.json (and similar raw dumps) → extracted rules; then delete raw dumps.
- scripts/scanners/johan-canonical-index.js persists links + extracted rule ids only (no body text).
- Scanner runs in .github/workflows/oss-lan-source-enrich.yml (read-only, no posting).
- Process Johan PR/issue interactions since 2026-10-02 the same way.
## Constitution: C1, D4.
