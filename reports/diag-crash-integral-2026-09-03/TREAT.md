# Crash + diag logs — integral treat 2026-09-03 (P2403)

Silent only. Crash gate **ok** (unknown=0). GHA IMAP success. 53 local app-diags + 1124 gmail bodies + 159 actionable historical.

## Verdict matrix (local `homey-app-diag`)

| UUID | App | Signal | Status |
|------|-----|--------|--------|
| `0e28d470` | 9.0.781 | 93× P2308 `tuya_dp_value` + flood/battery | **P2403** DIY refuse-before-depth + P2389–P2401 |
| `2b0b4e4f` | 9.0.743 | FLOW-GUARD + TS0044 zgyzgdua | **P2398** + couple locked `scene_switch_4` |
| `73c6ef18` / `a9e4d712` / `ab5aaf04` | 9.0.77x–794 | Curtain idle / EF00 missing | **P2399** + P2403 soft cluster-miss |
| `cfbf687f` | 9.0.779 | Smartbutton `_TZ3000_mrpevh8p`+TS0041 | Tip ≥9.0.798 (P2381/P2397) — FP locked |
| `8c49c683` | 9.0.678 | wall_thermostat stack overflow | **P2308** depth + FCU sync |
| `f20dc4f0` | 9.0.491 | m1cvyneb as climate | Sacred `wall_dimmer_tuya` — **re-pair** |
| `634f7b19` / `_crash-s` | 5.12.70 | DCM auditCapabilities + IAS enroll | Tip Stable + IAS skip wireless |
| `96c19859` | 9.0.537 | IAS SOS sleepy + DP recovery | Tip IAS/EF00 skip |
| `724d4bc9` / `e5d19878` / `7a6f2ca1` | 9.0.71x | Unknown Zigbee — **couple ABSENT** | NEED_INTERVIEW (no invent) |
| Athom processing_failed ×133 | drafts | P139 | soft-expect; no republish loop |

## Code this cycle (BOTH)

1. **P2403** `TuyaZigbeeDevice.setCapabilityValue` — refuse DIY caps **before** `__capSetDepth`; DIY abort log once
2. **P2403** `TuyaUniversalBridge._updateCapability` — honor `_diyCapsEnabled === false`; prefer `safeSetCapabilityValue`
3. **P2403** `UnifiedCoverBase._sendTuyaDP` — soft-skip missing EF00+ZCL (no throw spam)

## User tip

Update Universal Tuya Test **≥9.0.803+** (after Auto-Publish of P2403). Re-pair only for wrong driver (dimmer↔climate). Unknown-device posts need zb_manufacturer_name + zb_model_id.

## Dual-app

| Change | Track |
|--------|-------|
| P2403 DIY + cover soft | **BOTH** |
| Reports / GHA harvest | MASTER_ONLY |
