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
| 1 | Publish tip + soak Peter OOM (`96c19859` → 9.0.541+) | Tip **9.0.543+**; RC fact-check `reports/P156_RC_LIVEDATA_SLEEPY_FACTCHECK_2026-08-16.md` |
| 2 | Sacred couples / anti dual-claim | **P168 done** — 0 `_TZ*` dual-claims; class audit + CI gates |
| 3 | Enrich `user-misattribution-registry` from forum | Ongoing (P149–P152) |
| 4 | Short GitHub docs (sacred couple, dual-app, troubleshooting) | Done / maintain |
| 5 | Critical modules progressive harden | Continuous |
| — | Post forum roadmap IA | **No** |

## Commands

```bash
node tools/ci/align-mfs-db-intelligent.js --check
node tools/ci/align-mfs-db-intelligent.js --apply
node tools/ci/audit-sacred-couple.js --from-registry
node tools/ci/audit-sacred-couple-by-class.js
node tools/ci/dual-claim-compose-gate.js
node tools/ci/energy-compose-gate.js
node tools/ci/layer-pass-audit.js
node tools/ci/homey-heap-json-gate.js
node tools/ci/gmail-crash-pattern-gate.js --json
```

Layer contracts: `docs/architecture/LAYERS_ENERGY_BUTTONS_FLOWS.md` (energy → buttons → flows, one pass at a time).  
Heap / sleepy: `reports/P156_RC_LIVEDATA_SLEEPY_FACTCHECK_2026-08-16.md` · `reports/P157_HEAP_SLEEPY_PREVENTION_2026-08-16.md`  
Class scale: `reports/P168_CLASS_SCALE_SACRED_COUPLE_2026-08-16.md` · `tools/ci/audit-sacred-couple-by-class.js`  
mfs_db align: `reports/P169_MFS_DB_INTELLIGENT_ALIGN_2026-08-16.md` · `tools/ci/align-mfs-db-intelligent.js`

## Dual-app

| Track | Rule |
|-------|------|
| `master` | Static compose + dynamic registry / overlays (capped) |
| `stable-v5` | Static reliability only after soak |

## Homey pairing (Mike_Nono ↔ smarthomesven, T140352 #2162–#2163)

**smarthomesven is correct:** the tile the user taps at pair time does **not** choose the driver. Homey binds via **`manufacturerName` + `productId`** from the Zigbee interview against each driver’s compose lists.

**Mike’s frustration is still valid** when the *manifest* is wrong: same couple listed on a nonsense driver (socket FP on a motion driver, etc.) → Homey will land on that driver no matter what tile was clicked.

### What we do (and do not)

| Do | Do not |
|----|--------|
| Fix sacred couples / strip dual-claims | Runtime “try 5 drivers then pick best” (Homey cannot) |
| Misattribution registry + re-pair | Custom Change-driver UI as product promise |
| Z2M/ZHA/forum research → compose | Copy Z2M converter substitution into SDK3 |

Silent code only — this exchange is a compass, not a forum reply draft.

