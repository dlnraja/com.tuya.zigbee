# Diag cross-ref L99 — 2026-09-01

Silent only. Sources: Homey portal `getCrashes` + Gmail L3 + forum needAction + Z2M.
Never invent productId. **Do not post** forum.

## Harvest snapshot

| Channel | Result |
|---------|--------|
| Portal tip | Master Test **9.0.757** (9.0.758/760 `processing_failed` P139) · Stable **5.12.110** |
| Gmail | L3 local (IMAP/OAuth missing) · 70 emails · crash gate **ok** / `unknownFatals=[]` |
| Recursive treat | 820 sources · 376 cases · 123 actionable · 635 bodies |
| Forum | 50 needAction · top: Gabriel dimmer T158757, #533 Moes curtain |

Reports: `PORTAL_DIAG_HARVEST.md` · `GMAIL_DIAG_HARVEST.md` · `diag-recursive-treat-2026-09-01/TREAT.md`

## Verdict matrix (tip vs stale)

| Symptom | Couple | Tip status |
|---------|--------|------------|
| Tongou wrong RCBO | `_TZE284_6ocnqlhn`+TS0601 | **Shipped** `din_rail_meter` — update+re-pair |
| Scene 4 unknown / physical | `_TZ3000_zgyzgdua`+TS0044 | **Shipped** `scene_switch_4` 0xFD |
| Presence unknown | `_TZE204_clrdrnya`+(known TS0601) | **In compose** presence_radar — update+re-pair |
| Wall dimmer dead / DynCap humidity | `_TZE284_m1cvyneb`+TS0601 | **Shipped** ≥9.0.744 — update+re-pair |
| Moes curtain #533 | `_TZE204_5slehgeo`+TS0601 | **P2356** shipped — soak |
| Foreign driver crash | `ZG9101SAC_HP` | **P2351** fixed on tip |
| IAS / SOS / water | various sleepy | **IAS coerce + EF00 skip** — need tip diag if still broken |
| Curtain timeout `05867379` | **ABSENT** | **OPEN** — hybrid RX none / EF00Manager missing @ 9.0.750 |
| Plug stolen by button | `_TZ3210_w0qqde0g`+TS011F | **P2361 fix** — lock `plug_energy_monitor` |
| Smart knob | `_TZ3000_gwkzibhs`+TS004F | Confirmed Z2M knob → `smart_knob_rotary` OK |

## Code from this pass (P2361 BOTH)

- Remove `_TZ3210_w0qqde0g` from `button_wireless_2`
- Add `_TZ3210_w0qqde0g` (+ `_TZ3000_w0qqde0g`) to `plug_energy_monitor` / `smartplug`
- Registry: `p2361-w0qqde0g-ts011f-plug-not-button`

## Ops

1. Users on ≤9.0.743 → update Homey Test **≥9.0.757** (or Stable 5.12.110) + re-pair when driver class wrong.
2. Do **not** spam republish while tip 9.0.757 is healthy (P139).
3. Restore CI IMAP/OAuth for fresh Gmail (MASTER_ONLY ops).
4. Curtain `05867379`: await next diag with mfr+pid before inventing couple.
