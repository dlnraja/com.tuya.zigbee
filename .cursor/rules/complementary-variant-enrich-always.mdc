---
description: Enrich = variants/additions only — never overwrite or degrade (P2520 always)
alwaysApply: true
---

# Complementary variant enrich — ALWAYS ON (P2520)

**Mandate (user):** Resume and run all enrichments in **complementary mode**. Treat enrichments as **variants and additions**, never as modifications that wipe or shrink working drivers. Apply this rule **everywhere, every prompt, every cron**.

## Golden rules

1. **Variants not replacements** — new mfr case forms, OEM siblings, extra pids, extra settings, extra flow cards = UNION.
2. **Never** `manufacturerName = [onlyNew]`, `capabilities = [shrunk]`, `settings = []` then rewrite.
3. **One mfr → many pids is NORMAL** — do not prune across drivers.
4. **Removals** only via misattribution forbid / wrong sacred couple / prepare-publish synthetic prune / explicit human surgical fix.
5. **Helper:** `lib/enrichment/ComplementaryMerge.js` (`unionStrings`, `appendSettingsById`, `mergeZigbeeIdentity`, `wouldDegradeCompose`).
6. **Gates:** `npm run check:p2520` + `npm run check:p2519` before claiming enrich done.
7. **Docs:** `docs/rules/COMPLEMENTARY_VARIANT_ENRICH.md` · SSOT `config/architecture/complementary-variant-enrich-ssot.json`.
8. **Silent** — no forum POST (T157628). Publish Homey when asked.
9. **BOTH** reliability locks → surgical stable backport same session.

## Forbidden agent replies

- “Replaced fingerprints with newer set”
- “Cleaned duplicate mfr from driver”
- “Reset settings to power_scale only”
- Shipping enrich without Contre quoi unit test (P2469)

## Checklist

```
[ ] Union/append only
[ ] Sacred couples intact (p2519)
[ ] check:p2520 green
[ ] Dual-app classify BOTH | MASTER_ONLY
```
