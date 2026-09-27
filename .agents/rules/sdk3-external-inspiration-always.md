# External apps + Homey SDK3 inspiration — ALWAYS ON (P2547)

**Mandate:** On enrichment / architecture / driver work, mine sibling Homey Zigbee/Tuya GitHub apps and **official** Homey Apps SDK3 docs — complementary only.

## Sources (read, do not paste into forum)

1. Athom docs: `https://apps.developer.homey.app/wireless/zigbee` (+ `.md`)
2. `JohanBendz/com.tuya.zigbee` (+ Lidl / Hue Zigbee) — issue couples via `tools/ci/johan-dump.js`
3. `Drenso/com.tuya2` — DP flow UX parallels (`tuya_dp_received` / `tuya_dp_send*`)
4. `athombv/com.ikea.tradfri` + `athombv/node-homey-zigbeedriver`
5. Peer apps (e.g. StyraHem Sonoff Zigbee) for SED/compose hygiene

## Non-negotiables

- Sacred couple = `manufacturerName` + `productId` — **never invent pid**
- Silent enrich — **no Homey Community / PM posts** (T157628)
- Changelogs: generic wording only (no “inspired by X app”)
- SDK3: defer ZCL in `onNodeInit`, always catch promises, `getDeviceTriggerCard(id)` one arg
- Battery ZCL: `normalizeZclBatteryPercent` — **never blind `/2`** (P216)
- Helper: `lib/utils/Sdk3ZclSafe.js`
- SSOT: `config/architecture/external-app-sdk3-inspiration-ssot.json`
- Gate: `npm run check:p2547`

## Dual-app

Reliability patterns = **BOTH** (backport surgically). Feature-only UX inspiration may stay **MASTER_ONLY**.
