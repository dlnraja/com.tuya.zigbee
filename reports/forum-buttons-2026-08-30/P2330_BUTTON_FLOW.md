# P2330 — Button ↔ Flow card deep fix (2026-08-31)

Silent forum only (T157628). BOTH tracks.

## Investigation
- Forum NEED_ACTION + silent scan T140352/150690/156967: remotes `wkai4ga5`/`zgyzgdua`/`kfu8zapd` (P2328 RX already locked).
- Flow L99 orchestrator: green (dups/integrity/coherence/voice/dp-cluster).
- Remaining **flow connection** bug: drivers named `*_switch` invented `*_switch_switch_Ngang_*` IDs that Homey never registered.

## Root cause (flows not firing)
| Path | Bug |
|------|-----|
| `button_wireless_switch` device.js | Fired `button_wireless_switch_switch_2gang_*` — not in compose |
| `button_wireless_switch` driver.js | Registered same invent IDs as triggers |
| `gas_sensor_switch` device.js | Fired `gas_sensor_switch_switch_4gang_*` |
| `PhysicalButtonMixin` | Tokens had `gang` only — Homey dropdown cards need `button` |
| Scene IDs | Short `${driver}_gangN_scene` missed `${driver}_Ngang_gangN_scene` |
| `CoreCapabilityMixin` | Raw `getDeviceTriggerCard` spray |

## Fixes
1. Route BSEED ZCL physical → `_triggerPhysicalFlow` / compose-real `_safeTriggerFlow`
2. driver.js trigger list aligned to compose
3. Mixin: `button` token + Nganged scene/physical fallbacks
4. CoreCapabilityMixin declared-only
5. Test: `test/critical/p2330-button-flow-card-ids.test.js`

## User (silent)
Update Test tip + re-pair remotes still on wrong driver (P2328). Rebuild Homey Flows that used dead invent IDs if any.
