# App quality vision + forum synthesis (P142→P145) — 2026-08-16

Silent enrichment only (T157628). No forum posts.

## Status checklist (tip)

| Change | Effect | Tip status |
|--------|--------|------------|
| Name → **Universal Tuya** (Zigbee in description/tags) | Clear, honest store identity | OK — Athom discourages protocol words *in the name* |
| Description / tags recentered Tuya Zigbee | End multi-brand soup | OK |
| 12 `air_purifier_*` → `deprecated` + sentinel mfrs | Out of useful pairing | OK (sentinels re-asserted when auto-fix emptied them) |
| README de-hyped | Less marketing | OK |
| Radar/contact logs without emoji | Readable diags | OK (radar leftovers stripped) |
| Hybrid MF restore scripts skip these drivers | Prevent regression | OK (`restore-master-only-hybrid-mfs` + `restore-hybrid-drivers`) |

## What users mean by “AI slop / messy”

| Signal | Evidence | Response |
|--------|----------|----------|
| Fake product name | Store showed **Unified Smart Home Engine** (#2131) | Renamed → **Universal Tuya** (Zigbee kept in description; App Store discourages protocol words in the *name*) |
| Marketing soup tags | eWeLink / SmartThings / Sonoff | Tags → tuya, zigbee, local, switch, sensor… |
| Nonsense pairing list | `Air Purifier Soil/Contact/Dimmer…` + `_NEEDS_DEVICE_ASSIGNMENT` | **12 hybrids `deprecated: true`**, class→`sensor` where needed, phantom caps stripped |
| Hype README | “Bulletproof”, “Hue-style” | README generator de-hyped |
| Chatty bot logs | Emoji spam | Stripped from radar/contact `this.log` |
| Hybrid MF revive | `restore-master-only-hybrid-mfs.js` | Skips deprecated `air_purifier_*` |
| Publish blocked | Guidelines ERROR: fan/light without primary UI cap | Fixed: class=`sensor` + audit skips `deprecated` |

## Forum themes

Silent scan: **0 new FPs**. Pain = reliability + wrong driver.

### Closed / shipped

| Item | Status |
|------|--------|
| **ZT08 #513** | **CLOSED** — Finnamu OK on 9.0.533 |
| TYZB01 TS001x ZCL-only | P141 shipped |
| Kanbros `w5xztuy7` ZCL-only | P139 |
| Soil `nt4pquef` DP2=light | P141 |
| Peter SOS harden | **P143** `_fireAlarm` + safe-timers |
| Water leak HOBEIAN IAS | **P143** clusters 0/1/1280 + mfr `k4ej3ww2` |
| Contact lux DP101 | **P143** no battery-steal + calibration |

### Still user / soak

1. **Peter #2137** — update Test tip after successful Auto-Publish; Repair SOS; polarity Inverted if mute
2. **PresentSky dimmer** — **re-pair only** (FP already on `wall_dimmer_tuya`)
3. **Water / contact** — retest after tip with P143
4. **Smart Life cloud** (T146735) — out of Zigbee scope

## Product vision (keep)

```
Universal Tuya
├── master  → soak features + new FPs (Test)
└── stable-v5 → crash-only backports (Live / LTS)
Sacred Couple = (manufacturerName + productId)
Forum = scan → fix code → almost never reply
Pairing = real devices only (deprecated hybrids hidden)
Store copy = plain English, no Engine / Unified soup
```

## Publish unblock (this follow-up)

P142 Auto-Publish failed at **Sanitize / guidelines audit**:
`DRIVER_PRIMARY_UI_CAPABILITY_REQUIRED` on deprecated `air_purifier_*` (fan/light without onoff/dim).

Fixes now:
- hybrid `class` → `sensor` where needed
- guidelines audit **skips `deprecated` drivers**
- store name **Universal Tuya** (short descriptions)

## Soak checklist

- [x] Code tip name = **Universal Tuya** (compose + app.json)
- [x] 12/12 `air_purifier_*` deprecated in app.json
- [x] Guidelines audit: **0 errors**
- [ ] Homey Test channel shows new name (needs successful Auto-Publish)
- [ ] Pairing UI: no Air Purifier Soil/Contact for new adds
- [ ] Peter SOS/contact retest
- [x] Finnamu ZT08 (#513 closed)
- [ ] PresentSky re-pair dimmer
