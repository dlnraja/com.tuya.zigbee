# Contributing to Universal Tuya Zigbee

Local Zigbee app for Homey Pro (`com.dlnraja.tuya.zigbee`). Keep changes small, verified, and dual-app aware.

## Core rules

### Capability-based flow filtering
Flow cards should filter by capability. Avoid generic cards that fire for every device. Prefer exact IDs in `driver.flow.compose.json` — no `titleFormatted` with `[[device]]`.

### Case-insensitive identity
Do not compare manufacturer strings with `===` only. Use `CaseInsensitiveMatcher` / project CI helpers.

### Sacred couple fingerprints
- Identity is always **`(manufacturerName + productId)`** — never mfr alone.
- Same `manufacturerName` in multiple drivers is OK **only** with different `productId`s.
- Same `(mfr, pid)` in two drivers = pairing conflict.
- No `*` wildcards in `manufacturerName` (SDK3).
- Known mis-routes: `data/user-misattribution-registry.json`.
- When locking a couple, update **compose + compound DeviceFingerprintDB + mfs_db + new_fingerprints + registry** together (P2138) — compose-only edits get re-polluted by enrichers.

### How Homey picks a driver (important)

Homey does **not** use the device tile the user taps during pairing as the final driver.

1. The Zigbee interview reports `manufacturerName` + `productId` (model ID).
2. Homey matches that couple against each driver’s `driver.compose.json` lists.
3. The matching driver is bound — even if the user opened pairing under “motion sensor”, “IKEA bulb”, etc.

So a wall socket that “appears as motion” usually means the **manifest lists that couple on the wrong driver** (dual-claim / hybrid / placeholder), not that the user picked badly.

**What we do:** fix sacred couples, strip dual-claims, enrich the misattribution registry, ask for re-pair after the tip.  
**What we do not do:** runtime “try several drivers and pick the best” (Homey SDK3 cannot), Z2M-style converter substitution, or promising a custom Change-driver UI.

Gates: `node tools/ci/audit-sacred-couple.js --from-registry` · `node tools/ci/dual-claim-compose-gate.js` · `node tools/ci/anti-bot-regression-gate.js` · `node tools/ci/p2138-sacred-couple-matrix-gate.js` · `node tools/ci/layer-coverage-gate.js`

**Sacred couple:** always `manufacturerName` + `productId`. One MFS → many PIDs/variants — never invent a couple (e.g. m1cvyneb+TS0201). See `.github/WORKFLOW_GUIDELINES.md` §N.  
User FAQ: `docs/guides/USER_TROUBLESHOOTING.md` · BSEED dimmer: `reports/P2138_BSEED_WALL_DIMMER_2026-08-17.md`

### Dual-app tracks
| Branch | Purpose |
|--------|---------|
| `master` | Preview / soak (~9.0.x Homey Test) — tip **9.0.583+** |
| `stable-v5` | LTS reliability only (~5.12.x) — tip **5.12.85+**; surgical backports; never full-tree sync; never Publish→Test while 9.0 soaks |

Classify: `BOTH` | `MASTER_ONLY` | `STABLE_ONLY`.

### Forum
Default: **do not** paste AI answers (T157628). Silent code fixes. If a human posts: topic **140352** only, short human voice, verified FPs.

### Runtime hardening
- Caps: `safeSetCapabilityValue()` (L14).
- Virtual buttons: `_safeSetCapability` + `markAppCommand` (never raw `button` loops).
- Timers: `safeSetTimeout` / `safeSetInterval` from `lib/utils/safe-timers.js`.
- Battery: `BatteryMasterEngine` / non-linear profiles — ban `(V-2.5)/0.5`.
- Live FP overlay: `LiveDataUpdater` must stay heap-capped (Homey ~64MB).
- Tuya MCU dimmers: clamp brightness with `lib/tuya/TuyaBrightnessScale.js` (0–1000; >1000 can reboot MCU).

## Submission
1. Fork → feature branch.
2. Pass local `node --check` / project gates.
3. PR checklist: `.github/PULL_REQUEST_TEMPLATE.md`.
4. New device: Homey diagnostic Log ID + `_TZxxxx` + `TSxxxx`.

Bug template: `.github/ISSUE_TEMPLATE/`.  
Architecture: `docs/architecture/LAYERS_CAPABILITY_PROTOCOL.md` · Troubleshooting: `docs/guides/USER_TROUBLESHOOTING.md`.  
Internal compass (not for forum): `docs/rules/PRAGMATIC_ROADMAP.md`.

## Thanks

Study-only (no code copied): [gpmachado/com.gpm.homesuite](https://github.com/gpmachado/com.gpm.homesuite) (GPL-3.0) — availability last-seen, rejoin, `onUninit` teardown, Poll Control skip, settings-over-dump, inching. Full list: `CREDITS.md` / `NOTICE`.

## Priority (internal)

1. Sacred couples / dual-claims / deprecated hybrids (manifest pairing — not Z2M substitution).
2. Short GitHub docs (this file + issue/PR templates already ship).
3. Surgical module harden (battery, buttons, IAS, energy, LiveData) — never global rewrite.

## Next steps (corrected)

**Do**
- Keep shipping pairing locks (compose + catalogs + misattribution registry).
- Soak Peter’s heap crash on Homey Test **9.0.541+** (new diagnostic if it still crashes).
- Let Auto-Publish land Test builds; do not spam Athom on transient `processing_failed`.

**Do not**
- Publish emoji / “Unified Engine” / community roadmap posts on Homey Community (T157628).
- Overwrite repo docs with fake Homey SDK2 `driver.js` guides or Z2M “try many drivers after pair” tutorials.
- Promise runtime driver substitution — Homey binds from the manifest couple only.

If a **human** forum reply is needed later: short English, Dylan’s voice, topic **140352** only — not this CONTRIBUTING text pasted as a wall.
