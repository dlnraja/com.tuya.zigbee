# Daily resume — enrichment mode (standing rules)

Pointer from constitution W2 / R10. Human detail lives here; Spec Kit constitution stays the override.

## How a daily run works

1. Read `data/leads/resume-checkpoint.json` (`master_queue`) first; never skip — defer with a next-day note.
2. Prefer extending existing docs/rules/SSOT over dumping new paste files.
3. Research real hardware online before moving a couple (constitution W4).
4. Commit + push only when gates pass; no force-push, no forum/GitHub/email posts by agents.

## Coverage and couples

- **Max coverage per exact mfr+pid.** Every verified couple gets the richest working mapping (clusters, DPs, capabilities, flows) on its single home driver. Never invent mfr/pid.
- **One couple → one driver.** Homey matches manufacturerName × productId. A Tuya-style couple on two drivers fails `scripts/gates/native-matrix-gate.js` (shrink-only baseline). Already-paired leftovers stay quiet via `lib/data/dual-couple-legacy.json` / `tools/ci/enforce-dual-couple-legacy.js`.
- **Frozen duals.** Act on user-reported conflicts; phantom cross-products stay until they collide (constitution M3/W4).

## Matching and identity

- **Case-insensitive runtime** through the shared helper (`lib/utils/CaseInsensitiveMatcher.js` / R20 normalizer): compare at read/match time without duplicating data and without breaking existing matches.
- Fingerprints stay exact in compose; normalization is for comparison only.

## Pairing and protocols (additive)

- **Interviews = minimum for pairing.** A thinner interview never removes a capability (W5/W6).
- **Non-native clusters never mandatory for pairing:** `0xEF00`, `0xE000`, `0xE001`, and other manufacturer-specific ranges must not appear in endpoint `clusters` for new drivers. Gate: `validate:native-matrix` / Spec 002.
- **Native Homey first, then failover:** ZCL capabilities → Tuya DP; within DP maps, variant A then B as opt-in layers with circuit breakers (D1/D2/W9).
- **Heuristic inference** (gang count, scale, presence, soil, etc.) is opt-in / fallback only — never the only path and never blocking pair.
- **Firmware quirks in software** need ≥2 independent sources before enable (D4); credit the sources.

## Master vs stable

| Track | Role |
|-------|------|
| **stable-v5** | Simple device compatibility, grouped publishes, hardened behaviour |
| **master** | Smart / heuristic layers, faster enrichment, soak before promotion |

Port reliability fixes to both; keep smart-only layers on master until promoted (R3/R14, DUAL_APP_VISION).

## Sources and credits

- Other apps’ threads, issues, PRs **and every comment (including closed)** count as sources — read fully, reason, then rewrite in our words (C1/C5). No third-party paste in journal, ledger, or rules.
- Keep `CREDITS.md` up to date when an idea or mapping lands.
- Workflows must stay free / in-quota optional AI; they must still run with AI off (R2/R13).

## Size, lazy load, memory

- Keep published `app.json` under **4 MB** (C2); large data lazy-loads from `data/` / `lib/` in small chunks (R22).
- Bounded caches, no unbounded recursion, clean timers/listeners on delete (R21).

## Gates to keep green

| Check | What it blocks |
|-------|----------------|
| `node scripts/gates/native-matrix-gate.js` | New mandatory non-native clusters; new dual Tuya-style couples |
| `npm run check:p2791` (incl. dual-couple-legacy) | Dual-couple / case-insensitive / gang regressions |
| `homey app validate --level publish` (Node 22) | SDK3 / energy / compose |

Wired in `pr-gate.yml`, `auto-fix-and-publish.yml`, and `validate.yml`.

## Related

- Constitution: `.specify/memory/constitution.md`
- Device SSOT: `docs/knowledge/DEVICE_TRUTH.md` + `device-truth.json`
- Complementary enrichment: `docs/architecture/COMPLEMENTARY_ENRICHMENT.md`
- Forum leads: `docs/rules/FORUM_LEADS_RULES.md`
