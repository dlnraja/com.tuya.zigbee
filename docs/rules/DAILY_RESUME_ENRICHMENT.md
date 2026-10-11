# Daily resume — enrichment mode (standing rules)

Pointer from constitution W2 / R10. Human detail lives here; Spec Kit constitution stays the override.

## How a daily run works

1. Read `data/leads/resume-checkpoint.json` (`master_queue`) first; never skip — an item that cannot finish today is deferred to the next day with a note saying what is left, never dropped.
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
- **Firmware bugs are compensated in software**, opt-in per exact mfr+pid, and the workaround carries a comment with the source (ID, link, author) so the next reader knows why it exists.
- **Non-native layers switch themselves off.** An optional EF00 / E000 / E001 / manufacturer-attribute layer that fails (timeout, unsupported attribute, missing cluster) disables itself for that device and logs once; base capabilities keep working. `onNodeInit` never throws or returns early because such a cluster is missing (gate: `scripts/gates/init-non-native-guard.js`).

## Master vs stable

| Track | Role |
|-------|------|
| **stable-v5** | Simple device compatibility, grouped publishes, hardened behaviour |
| **master** | Smart / heuristic layers, faster enrichment, soak before promotion |

Port reliability fixes to both; keep smart-only layers on master until promoted (R3/R14, DUAL_APP_VISION).

## Sources and credits

- Other apps’ threads, issues, PRs **and every comment (including closed)** count as sources — read fully, reason, then rewrite in our words (C1/C5). No third-party paste in journal, ledger, or rules.
- Keep `CREDITS.md` up to date when an idea or mapping lands, in the same commit; an entry is ID + link + author + one line in our words.
- Workflows must stay free / in-quota optional AI; they must still run with AI off (R2/R13).

## Size, lazy load, memory

- Keep published `app.json` under **4 MB** (C2); large data lazy-loads from `data/` / `lib/` in small chunks (R22).
- Bounded caches, no unbounded recursion, clean timers/listeners on delete (R21).

## Gates to keep green

| Check | What it blocks |
|-------|----------------|
| `node scripts/gates/native-matrix-gate.js` | New mandatory non-native clusters in endpoint `clusters`; new dual Tuya-style couples (outside `data/native-matrix-reviewed-duals.json`); also runs the two checks below |
| `node scripts/gates/init-non-native-guard.js` (`npm run check:init-non-native`) | `onNodeInit`/`onInit` in a driver or `lib/` base class that throws or returns early when a Tuya/non-native cluster is missing (nested helpers and try blocks are ignored) |
| `node tools/ci/enforce-dual-couple-legacy.js --check` | A couple removed by the dual-couple resolution coming back on its old driver |
| `npm run check:p2791` (incl. dual-couple-legacy) | Dual-couple / case-insensitive / gang regressions |
| `homey app validate --level publish` (Node 22) | SDK3 / energy / compose |

Wired in `pr-gate.yml`, `auto-fix-and-publish.yml`, `validate.yml`, the shared rules-gate list `scripts/ci/rules-gates.js` (composite action `.github/actions/rules-gates`, read by `scripts/ci/safe-auto-commit.js`, differential: blocks only failures the change introduces).

Baseline note: `data/native-matrix-baseline.json` freezes the manifest findings that predate Spec 002 (endpoint lists that name `0xEF00`; Homey does not refuse pairing over them, but new ones are not allowed). It only shrinks. The init guard needs no baseline; the tree passed it when it was added (2026-10-11).

## Related

- Constitution: `.specify/memory/constitution.md`
- Device SSOT: `docs/knowledge/DEVICE_TRUTH.md` + `device-truth.json`
- Complementary enrichment: `docs/architecture/COMPLEMENTARY_ENRICHMENT.md`
- Forum leads: `docs/rules/FORUM_LEADS_RULES.md`

- **Couple sources (2026-10-11):** One reliable source is enough for an exact productId and an exact mfr+pid couple (user rule 2026-10-11): Z2M, ZHA, deCONZ, Johan, blakadder, SmartThings/Hubitat lists, Z2S, a user diagnostic. Record the source per couple (registry/pins/mfs_db). Never invent; skip only when the pid is ambiguous (the source lists several pids for the mfr). Place in the driver matching the device type, W4 move with curated removals and pins. Quirks/behaviour workarounds keep their own ≥2-source rule. See docs/rules/COUPLE_SOURCE_POLICY.md.
