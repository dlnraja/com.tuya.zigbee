# External app + Homey SDK3 inspiration (P2547)

**Classify:** BOTH (reliability docs/rules + P216 collector fix)  
**Machine SSOT:** [`config/architecture/external-app-sdk3-inspiration-ssot.json`](../../config/architecture/external-app-sdk3-inspiration-ssot.json)  
**Gate:** `npm run check:p2547`

## Why

Sibling Homey Zigbee/Tuya apps and Athom SDK3 docs are a continuous source of **patterns**, not copy-paste drivers. We mine them silently, lock sacred couples, and keep dual-app goals intact.

## Official SDK3 (must keep)

| Rule | Our hook |
|------|----------|
| No ZCL storm in `onNodeInit` | `Sdk3ZclSafe.scheduleDeferredInit` + `BootBudget` + sensor deferred init |
| Always `.catch` ZCL promises | `Sdk3ZclSafe.catchZcl` |
| `setCapabilityValue(...).catch` | Prefer `safeSetCapabilityValue` / `setCapabilityCaught` |
| Identity = `manufacturerName` + `productId` | Sacred couple SSOT / P2494 / P2496 |
| Sleepy wake = `onEndDeviceAnnounce` | Sensor / battery bases |
| Flow device trigger = `getDeviceTriggerCard(id)` only | P2449 |
| Groups on Homey Pro 2023+ | Group **0** (+ Touchlink) only — do not assume all-group RX |
| No `homey-meshdriver` | Dep: `homey-zigbeedriver@2.2.17` |

Doc URLs accept `.md` suffix for machine sync (see `.github/scripts/sync-sdk3-docs.js`).

## External GitHub apps we mine

| Repo | What we take |
|------|----------------|
| `JohanBendz/com.tuya.zigbee` (+ Lidl / Hue Zigbee) | Issue couples, learnmode, light patterns — **silent enrich only** |
| `Drenso/com.tuya2` | Generic DP flow UX → our `tuya_dp_received` / `tuya_dp_send*` |
| `athombv/com.ikea.tradfri` | Official SDK3 migration example |
| `athombv/node-homey-zigbeedriver` | API / deprecations |
| `StyraHem/Homey.Sonoff.Zigbee` | Peer SED / compose hygiene |
| `dlnraja/com.tuya.zigbee` | Canonical dual-track |

**Never:** invent pid from issue titles alone · forum POST with external attribution · copy App IDs.

## Johan open-issue sweep (2026-09-17)

All cross-checked couples already locked in compose (gkfbdvyx radar, b4awzgct button, wt9agwf3 valve, zo0cfekv 3-gang, vdfwjopk siren, ddigca5n plug, ogkdpgy2 CO2, hodyryli ZT08, cvub6xbb / mpbki2zm thermostats, 6ocnqlhn DIN, 9ern5sfh climate). See SSOT `johanOpenIssuesCoverage2026_09_17`.

## Applied this pass

1. **P216** in `lib/utils/data-collector.js` — stop blind `/2` on ZCL battery reports.
2. **`lib/utils/Sdk3ZclSafe.js`** — shared SDK3 catch/defer helpers.
3. Cursor rule + gate + Contre quoi test.

## Dual-app

Reliability → **BOTH**. Backport `Sdk3ZclSafe.js` + data-collector P216 fix to `stable-v5` same session. Docs/rules are master-primary but SSOT/gate may live on both.
