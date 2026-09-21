# P2663 Mesh flood calm — Bastien 2026-09-21

## Cause
8× HOBEIAN `switch_1gang` still on tip **1.0.34** with blank `zb_model_id` and phantom `measure_power`/`meter_power`/`measure_voltage`/`measure_current`.
App configured `haElectricalMeasurement` reporting at **minInterval:10** → Zigbee mesh saturation (~thousands of msgs). Virtual devices (`ltt60asa`, `vsxvaj9i`, `fllyghyj`) add extra chatter.
Peer lesson: **gpmachado/com.gpm.homesuite** — jitter, no thundering herd, no hammering (ideas only).

## Fix (1.0.38 / BOTH)
- `lib/zigbee/MeshFloodCalm.js` — disable electrical reports on HOBEIAN; calm ≥60s + jitter for real plugs
- `HobeianZg301zHeal` calls `calmHobeianMesh` (overwrite tip 1.0.34 residue)
- `switch_1gang`: **heal BEFORE** reporting
- `TuyaZigbeeDevice._reconfigureAttributeReporting` skips when `_skipElectricalReporting`
- Gate: `npm run check:p2663`

## User action
1. Homey → Apps → Universal Bastien → **Update to 1.0.38+**
2. Restart app (or reboot Homey) so heal rewrites reporting on the 8 HOBEIAN
3. Remove + re-pair Virtual tiles under Bastien drivers (not Homey Zigbee)
