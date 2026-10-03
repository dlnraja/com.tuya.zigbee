# Universal Tuya Zigbee — Constitution

Structure follows GitHub Spec Kit (github/spec-kit): `constitution → spec → plan → tasks`.
Specs live in `specs/NNN-*/{spec,plan,tasks}.md`. This file overrides any spec/plan.

## Identity (non-negotiable)
- I1. App IDs are frozen: `com.dlnraja.tuya.zigbee` (master, "Universal Tuya Test"),
  `com.dlnraja.tuya.zigbee.stable` (branch `stable-v5`), `com.dlnraja.tuya.zigbee.bastien`.
- I2. A master push without `[skip ci]` auto-publishes — batch pushes, few publishes.

## Device behaviour
- D1. **Native first.** Homey-native clusters/capabilities (homey-zigbeedriver + zigbee-clusters)
  are the primary path. Tuya DP (0xEF00), 0xE000/0xE001 and manufacturer-specific clusters are
  fallbacks, never mandatory for pairing.
- D2. **Fallbacks are additive.** Never degrade existing behaviour; a fallback that fails disables
  itself and never blocks pairing or init.
- D3. **No invented fingerprints.** Every manufacturerName/productId comes from a real interview,
  diag, issue or a cited upstream source. A mfr+pid couple lives on exactly one driver.
- D4. **Firmware quirks are opt-in** per mfr+pid and require ≥2 independent sources.
- D5. **Case-insensitive** matching at runtime for mfr/pid.
- D6. **No perceptible latency.** Dedupe/anti-flood passes the leading edge immediately; windows
  are short and configurable.

## Maintainer clarifications (2026-10-03)
- M1. Dedupe/anti-flood windows are chosen by comparing Z2M, ZHA, Johan's apps, deCONZ and localtuya and taking the
  most accurate value; they are dynamic per device type and per driver / mfr+pid profile, adaptive per case.
- M2. Double/triple-click detection is enabled automatically only where needed (remotes that do not send a native
  press type); otherwise it is off (no added latency).
- M3. Existing phantom/dual couples are kept as-is (frozen baseline); act only when a user reports a conflict
  (forum, threads, issues).
- M4. Lights without a driver (TS0502A/B, TS0505B, TS0501A): add to existing light drivers, unless that would conflict
  with another driver (e.g. TS0501A vs dimmer_wall_1gang) — then create a dedicated driver.
- M5. External PRs are merged intelligently in an enrichment mindset: keep the best of both, never degrade.
- M6. Stable publishes are grouped (batched), never one per fingerprint.

## Code & data
- C1. No copy-paste from other projects/people. Read, understand, rewrite as our own rules/quirks;
  keep only source link + author/project. Raw dumps do not stay in the repo. GPL code is never copied.
  Credit ideas in CREDITS.md.
- C2. `app.json` < 4 MB; large data is lazy-loaded from `data/`/`lib/` at runtime.
- C3. All gates pass before push, incl. `homey app validate --level publish` on Node 22.
- C4. Neutral commit wording.

- C5. **Deep reading for every source.** Forum threads (all posts + images), our issues/PRs, Johan's repo, other apps'
  threads, Z2M/ZHA/deCONZ/localtuya, Homey docs, diags/crash mails, forks, changelogs: read and understand finely
  (symptoms, context, firmware, interviews, DP logs, workarounds, regressions, conflicts, screenshots), reason,
  then write our own rules/code/SSOT. Regex/AI pre-extraction is only a helper, never the decision.

## Communication
- X1. Agents never post on GitHub/forum or reply to emails on behalf of the maintainer.

## Workflow
- W1. Rebase before each push (concurrent workers). Use a dedicated git worktree per agent;
  never run `git checkout -- .`/`git clean` in a shared checkout.
- W2. Long queues keep a resumable checkpoint in `data/leads/resume-checkpoint.json`;
  items are deferred, never skipped.
