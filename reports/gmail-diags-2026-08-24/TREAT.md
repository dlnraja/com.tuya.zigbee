# Gmail diags/crashes — 2026-08-24

Silent treat. No forum/PM replies.

## New today — `f647d35b` (v9.0.636)
User: door/water OK; **Smartbutton still no response** on `button_wireless_1`.

### Root causes (code)
1. **D101/D102 false/blank**: `ensureManufacturerSettings` ran **before** `this.zclNode` was set → empty mfr/pid.
2. **IAS storm**: proactive Zone Enroll on sleepy wireless button → "device offline" spam.
3. **DCM-FB +onoff**: fallback scan added switch capability on a button (wrong).
4. **DP-ADAPT**: store race after device delete (soft-logged).

### Fixes shipped (BOTH)
- Assign `zclNode` before mfr ensure; DIAG uses ManufacturerNameHelper
- Skip proactive IAS enroll for wireless button/remote drivers
- DCM-FB refuses `onoff` on button drivers + late strip
- DP-ADAPT soft-fail on deleted device

### Sacred couple hunt (all sources — never invent)
| Source | Result for this smartbutton |
|--------|------------------------------|
| `f647d35b` stdout/stderr | **ABSENT** — D101/D102 blank; no mfr/pid in log |
| Peter lineage `1cf775a2` / `0cea6870` / #2190 | **ABSENT** — same door/water/smartbutton pattern |
| Forum `Peter_van_Werkhoven.md` | tile `28c1e9fd…` couple unknown; do **not** glue |
| Known elsewhere (Z2M/GitHub, **other users**) | `_TZ3000_mrpevh8p`+`TS0041`, `_TZ3000_yj6k7vfo`+`TS0041`, `_TZ3000_5bpeda8u`+`TS0041` — **not** attributed to this diag |
| Interview / crash archives | no couple tied to device `95486295…` |

**Verdict:** cannot lock a couple for this tile. Fixes above remove IAS/DCM noise so next re-pair can expose real mfr+pid.

### User action (still needed)
- Update Test tip after publish (≥9.0.637 once auto-bump, or rebuild with these fixes)
- Remove + re-pair the smart button **while pressing** it
- If still dead: Homey interview → send **manufacturerName + modelId** (sacred couple)

## Tongou / Nobø (older diags)
- Tongou `_TZE284_6ocnqlhn+TS0601` → `din_rail_meter` (not `smart_rcbo`) — update + re-pair
- Nobø `_TZ3000_xffhmvhv+TS004F` — tip already skips 0x8004 for this mfr

## Athom
- `processing_failed` / socket hang up = P139, not app crash
