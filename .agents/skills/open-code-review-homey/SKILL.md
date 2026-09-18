---
name: open-code-review-homey
description: >
  Run Alibaba Open Code Review in delegation mode for this Homey Tuya Zigbee
  repo. Prefer ocr.cmd delegate preview/rule with .opencodereview/rule.json.
  No OCR LLM under forfait. Fix high-confidence findings; add Contre quoi tests.
---

# Open Code Review — Homey Universal Tuya

1. `ocr.cmd delegate preview --from HEAD~30 --to HEAD --format json` (or workspace).
2. Filter to `drivers/**`, `lib/**`, `.github/workflows/**`, `tools/ci/**` — skip `app.json` / `mfs_db` / reports.
3. `ocr.cmd delegate rule --rule .opencodereview/rule.json <paths>`.
4. Review diffs with Homey rules: sacred couple, safeSetCapabilityValue, safe-timers cleanup, no invent pid, dual-app classify.
5. Fix high-confidence defects; extend `test/critical/pNNNN-*.test.js`; never forum POST.
6. Docs/SSOT: `docs/architecture/OPEN_CODE_REVIEW.md`, `config/architecture/open-code-review-ssot.json`.
