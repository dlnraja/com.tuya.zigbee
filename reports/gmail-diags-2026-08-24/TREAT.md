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

### User action (still needed)
- Update Test tip after publish
- Remove + re-pair the smart button **while pressing** it
- If still dead: Homey interview → send **manufacturerName + modelId** (sacred couple)

## Tongou / Nobø (older diags)
- Tongou `_TZE284_6ocnqlhn+TS0601` → `din_rail_meter` (not `smart_rcbo`) — update + re-pair
- Nobø `_TZ3000_xffhmvhv+TS004F` — tip already skips 0x8004 for this mfr

## Athom
- `processing_failed` / socket hang up = P139, not app crash
