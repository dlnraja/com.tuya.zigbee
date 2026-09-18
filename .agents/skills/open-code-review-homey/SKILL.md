---
name: open-code-review-homey
description: >
  Run Alibaba Open Code Review in delegation mode for this Homey Tuya Zigbee
  repo. Prefer ocr.cmd / npm run review:ocr:intelligent with .opencodereview/rule.json.
  No OCR LLM under forfait. Fix high-confidence findings; add Contre quoi tests.
---

# Open Code Review — Homey Universal Tuya

1. Prefer free intelligent path: `npm run review:ocr:intelligent` (skips if no drivers/lib/workflows changes).
2. Or: `ocr.cmd delegate preview --from HEAD~30 --to HEAD --format json`.
3. Filter to `drivers/**`, `lib/**`, `.github/workflows/**`, `tools/ci/**` — skip `app.json` / `mfs_db` / reports.
4. `ocr.cmd delegate rule --rule .opencodereview/rule.json <paths>`.
5. Review diffs with Homey rules: sacred couple, safeSetCapabilityValue, safe-timers cleanup, no invent pid, dual-app classify.
6. Fix high-confidence defects; extend `test/critical/pNNNN-*.test.js`; never forum POST.
7. Docs/SSOT: `docs/architecture/OPEN_CODE_REVIEW.md`, `config/architecture/open-code-review-ssot.json`.
8. CI: cron Mon/Thu 05:50 UTC + soft hooks in resilience/enrich/quality/forum-poll (P2592).
