# Pragmatic internal roadmap (compass)

> **Internal only.** Never paste this as a Homey Community “roadmap / Unified Engine” post (T157628).

Store name: **Universal Tuya** (Zigbee in description/tags). Not “Unified Engine”.

## Decision grid (corrected)

| Priority | Action | Homey reality |
|----------|--------|----------------|
| 1 | Doublons / sacred couples / dual-claims / deprecated hybrids | Manifest chooses the driver. **No** Z2M-style “try 5 drivers after pair”. |
| 2 | Contributor docs (GitHub only) | `.github/CONTRIBUTING.md` + templates **already exist** — keep short & honest. |
| 3 | Progressive module refactor | Battery, buttons, IAS, energy, LiveData heap — **surgical**, not big-bang. |

## What not to do

- Forum community-management / AI roadmap packs.
- Promise custom Homey “Change driver” UI as a product feature.
- Copy Z2M converter trees 1:1 into SDK3.
- Full-tree `master` → `stable-v5` sync.

## Execution table

| # | Action | Status |
|---|--------|--------|
| 1 | Publish tip + soak Peter OOM (`96c19859` → 9.0.541+) | Tip **9.0.541** Test #2862; soak open |
| 2 | Sacred couples / anti dual-claim | Ongoing — registry + `audit-sacred-couple.js` + `dual-claim-compose-gate.js` |
| 3 | Enrich `user-misattribution-registry` from forum | Ongoing (P149–P152) |
| 4 | Short GitHub docs (sacred couple, dual-app, troubleshooting) | Done / maintain |
| 5 | Critical modules progressive harden | Continuous |
| — | Post forum roadmap IA | **No** |

## Commands

```bash
node tools/ci/audit-sacred-couple.js --from-registry
node tools/ci/dual-claim-compose-gate.js
node tools/ci/energy-compose-gate.js
node tools/ci/gmail-crash-pattern-gate.js --json
```

## Dual-app

| Track | Rule |
|-------|------|
| `master` | Static compose + dynamic registry / overlays (capped) |
| `stable-v5` | Static reliability only after soak |

One-liner: **doublons > doc > refactor** — silent code; this file is a compass, not a community message.
