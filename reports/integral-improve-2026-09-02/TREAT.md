# Integral improve — 2026-09-02 (P2395 + P2396)

Silent only. Tip soak target: **Universal Tuya Test ≥ 9.0.795**.

## Cross-ref sources

| Source | Used |
|--------|------|
| Plan L1–Lx buttons | Implemented P2395 |
| GitHub #533 Salvagr | Tip soak ≥9.0.794 (P2393) — no new patch |
| GitHub #536 Marcelo fan | P2396 DP2/DP11 + mfs scrub |
| Diag recursive treat | 390 cases / known fixes mapped |
| Z2M `TS0601_fan_switch` | DP1/2/3/11 locked |

## Shipped this cycle

### P2395 — Buttons / actuators / flows L1–Lx (BOTH + CI MASTER)
- Cascade `preferredLevels` applies L5/L7 gates
- `_hasPhysicalButtonMixin` + HomeyGap soft-ensure
- De-double-wrap switch_*gang / wall
- Legacy `physical_gang` flow cards (16 drivers)
- SOS skip8004 + TS0215A cascade
- Gate `button-physical-gang-parity-gate.js`

### P2396 — Lerlink fan #536 (BOTH)
- `fan_controller` settings: countdown DP2, power_on_behavior DP11
- RX/TX in `device.js` + `onSettings`
- mfs: r32ctezx → `fan_controller`+`TS0601` only; scrub water_valve
- BatteryMasterEngine: remove false AA map
- device-truth sample scrub

## Dual-app

| Patch | Tag |
|-------|-----|
| P2395 runtime/compose | BOTH |
| P2395 CI parity gate | MASTER_ONLY (lives on master) |
| P2396 fan DP2/DP11 + catalog | BOTH |

## User tips (no forum post)

1. Update Test **≥ 9.0.795**
2. Fan Lerlink: **re-pair** as Fan Controller if still on water valve
3. Moes curtain Salvagr: ≥9.0.794, no re-pair if Curtain Motor
4. Wall legacy switches: new per-gang physical flow cards after tip

## Verify

```
node tools/ci/button-physical-gang-parity-gate.js
node --test test/critical/p2395-*.test.js test/critical/p2396-*.test.js
```
