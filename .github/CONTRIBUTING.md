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

### Dual-app tracks
| Branch | Purpose |
|--------|---------|
| `master` | Preview / soak (~9.0.x Homey Test) |
| `stable-v5` | LTS reliability only — surgical backports, never full-tree sync |

Classify: `BOTH` | `MASTER_ONLY` | `STABLE_ONLY`.

### Forum
Default: **do not** paste AI answers (T157628). Silent code fixes. If a human posts: topic **140352** only, short human voice, verified FPs.

### Runtime hardening
- Caps: `safeSetCapabilityValue()` (L14).
- Virtual buttons: `_safeSetCapability` + `markAppCommand` (never raw `button` loops).
- Timers: `safeSetTimeout` / `safeSetInterval` from `lib/utils/safe-timers.js`.
- Battery: `BatteryMasterEngine` / non-linear profiles — ban `(V-2.5)/0.5`.
- Live FP overlay: `LiveDataUpdater` must stay heap-capped (Homey ~64MB).

## Submission
1. Fork → feature branch.
2. Pass local `node --check` / project gates.
3. PR checklist: `.github/PULL_REQUEST_TEMPLATE.md`.
4. New device: Homey diagnostic Log ID + `_TZxxxx` + `TSxxxx`.

Bug template: `.github/ISSUE_TEMPLATE/`.  
Architecture: `docs/architecture/LAYERS_CAPABILITY_PROTOCOL.md` · Troubleshooting: `docs/guides/USER_TROUBLESHOOTING.md`.  
Internal compass (not for forum): `docs/rules/PRAGMATIC_ROADMAP.md`.

## Priority (internal)

1. Sacred couples / dual-claims / deprecated hybrids (manifest pairing — not Z2M substitution).
2. Short GitHub docs (this file + issue/PR templates already ship).
3. Surgical module harden (battery, buttons, IAS, energy, LiveData) — never global rewrite.

