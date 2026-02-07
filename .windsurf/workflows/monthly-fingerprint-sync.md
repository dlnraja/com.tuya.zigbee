---
description: Monthly comprehensive sync - fingerprints, flows, features, images from ALL sources (Z2M, ZHA, GitHub, forum, Reddit, Blakadder, manufacturer sites, deCONZ, Hubitat)
---

# Monthly Comprehensive Sync Workflow

## Overview
Full monthly audit and enrichment pass covering fingerprints, flow cards, driver features, images, languages, and documentation from all available sources.

## Steps

### 1. Run Local Scan
// turbo
```bash
node scripts/automation/fetch-z2m-fingerprints.js && node scripts/automation/monthly-scan.js
```

### 2. Research ALL Online Sources for New Fingerprints
Search each source for Tuya `_TZ*` / `_TZE*` manufacturerName + `TS0*` productId patterns:

**Primary Sources (fingerprints + DP mappings):**
- Z2M tuya.ts: https://github.com/Koenkk/zigbee-herdsman-converters/blob/master/src/devices/tuya.ts
- Z2M latest-dev changelog: https://gist.github.com/Koenkk/bfd4c3d1725a2cccacc11d6ba51008ba
- Z2M new device issues: https://github.com/Koenkk/zigbee2mqtt/issues?q=label%3A%22new+device+support%22
- ZHA quirks: https://github.com/zigpy/zha-device-handlers/tree/dev/zhaquirks/tuya
- Blakadder device DB: https://zigbee.blakadder.com/all.html

**GitHub Forks & PRs (bidirectional, recursive):**
- JohanBendz issues: https://github.com/JohanBendz/com.tuya.zigbee/issues
- JohanBendz PRs: https://github.com/JohanBendz/com.tuya.zigbee/pulls
- JohanBendz forks network: https://github.com/JohanBendz/com.tuya.zigbee/network/members
- dlnraja issues: https://github.com/dlnraja/com.tuya.zigbee/issues
- dlnraja forks: https://github.com/dlnraja/com.tuya.zigbee/network/members

**Community Sources:**
- Homey Forum: https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352
- Reddit r/homeassistant: search "Tuya Zigbee new device"
- Reddit r/Homey: search "Tuya Zigbee"
- deCONZ supported: https://github.com/dresden-elektronik/deconz-rest-plugin/wiki/Supported-Devices

**Manufacturer Sites (product catalogs):**
- Tuya: https://solution.tuya.com/projects/CMa0d0b72ebb72a8
- Moes: https://www.moeshouse.com/collections/zigbee
- Zemismart: https://www.zemismart.com/collections/zigbee
- Lonsonho: AliExpress store
- BSEED: https://www.bfrankelectricals.co.uk/bseed-zigbee
- Sonoff: https://sonoff.tech/product-category/gateway-and-sensor/
- AVATTO: AliExpress store

### 3. Enrich Fingerprints
For each new fingerprint found in step 2:
1. Identify driver via `inferDeviceType(mfr, pid)` in monthly-scan.js
2. Cross-reference Z2M DP mappings + ZHA quirks + Blakadder
3. Check for collisions (same mfr+pid must NOT be in multiple drivers)
4. Add to `drivers/{driver}/driver.compose.json` manufacturerName + productId arrays
5. Add DP config in device.js if TS0601 needs custom mapping
6. Create new driver folder if needed (nobrand nomenclature)

### 4. Audit Flow Cards
For every driver: check `driver.flow.compose.json` has cards for all capabilities.
- Namespaced IDs: `{driver_id}_{action}`
- NO `titleFormatted` with `[[device]]` in triggers
- 4 languages: en, fr, nl, de
- Missing cards for: onoff, alarm_*, measure_*, dim, windowcoverings_*

### 5. Audit Driver Features
Cross-reference each driver's capabilities with Z2M/ZHA features:
- Add missing capabilities to driver.compose.json
- Verify onSettings, configureAttributeReporting, initial state read
- Check power metering for plugs, battery reporting for sensors

### 6. Audit Images
Per Homey SDK guidelines:
- Driver images: 75x75 (small), 500x500 (large), 1000x1000 (xlarge), white bg, .png/.jpg
- App images: 250x175 (small), 500x350 (large), 1000x700 (xlarge)
- Icons: .svg, 960x960 canvas, transparent bg, right-side angle
- Each driver MUST have its own unique image (not reuse app icon)

### 7. Audit Languages
Check `locales/` for en, fr, nl, de. Update missing translations.
Check all driver.flow.compose.json have all 4 language titles.

### 8. IR Blaster Check
- Search Z2M for Tuya IR blaster models (TS1201, ZS06, S16)
- Check if `ir_blaster` driver exists; if not, create with flow cards for learn/send
- IR blasters use Tuya DP cluster with raw IR codes

### 9. Validate & Push
// turbo
```bash
npx homey app validate --level publish
```
- Bump version in `.homeycompose/app.json`
- Update `.homeychangelog.json` (add entry at TOP)
- `git add -A && git commit && git push`

## Key Rules
- Fingerprint = manufacturerName + productId COMBINED
- Same mfr in multiple drivers is OK if productId differs
- Settings keys: `zb_model_id` and `zb_manufacturer_name`
- Flow card IDs: `{driver_id}_{action}` pattern
- NO `titleFormatted` with `[[device]]` in triggers
