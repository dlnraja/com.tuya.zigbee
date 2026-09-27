---
description: Ask WHY/HOW/WHO/WHEN before every feature or non-obvious line; enrich docs/workflows/rules from answers
alwaysApply: true
---

# WHY interrogation (P215)

Before implementing or changing anything non-trivial, answer:

1. **Pourquoi** — why this feature / this line / this shape?
2. **Comment** — runtime path (ZCL, EF00, settings, CI)?
3. **Pour qui** — Homey user, CI bot, master-only, or BOTH?
4. **Quand** — pair, RX, TX, enrich cron, publish?
5. **Contre quoi** — what regresses if removed? → **gate or unit test** (P2469 — create/extend `test/critical/pNNNN-*.test.js` on every prompt; `npm run check:pNNNN`).
6. **Quel couple ?** (mandatory on device work) — exact `manufacturerName` + `productId`.  
   Homey SDK3: compose `productId` = Zigbee tools **Model ID** = interview `modelId` = internal `pid`.  
   **productName** = catalog alias only — never invent pid from it.  
   Settings: `zb_manufacturer_name` + `zb_model_id`.  
   SSOT: `config/architecture/sacred-couple-ssot.json` · `config/architecture/identity-fields-ssot.json` · gates `check:p2494` / `check:p2496`.

Device work: lock the couple first → `DEVICE_TRUTH.md` / `device-truth.json` / `PECULIARITIES.md` / compose / misattribution registry. Search Z2M/ZHA/forum by the **pair**.

Use answers to enrich: code `// WHY:` comments, `.github/workflows`, `WORKFLOW_GUIDELINES`, `.cursorrules`, knowledge cache, interview DB, **critical unit tests**.

Full doctrine: `docs/rules/WHY_INTERROGATION.md` · anti-régression: `docs/rules/UNIT_TEST_ANTI_REGRESSION.md`.
