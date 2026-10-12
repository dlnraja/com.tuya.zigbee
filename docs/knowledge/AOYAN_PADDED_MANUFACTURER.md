# AOYAN padded manufacturerName (2026-10-12)

## What we found

- Some AOYAN white-label units return their Basic `manufacturerName` (cluster 0x0000, attribute 0x0004) with two trailing spaces: `"AOYAN  "`. Others return plain `"AOYAN"`, and one motion model is listed with one trailing space as well.
- Source: Zigbee2MQTT converters, which keep the string byte-for-byte as the device sends it.
  - Soil sensors AY-303Z and AY-302Z: `"AOYAN  "` (`src/devices/hobeian.ts`, ZG-303Z definition). Link: https://github.com/Koenkk/zigbee-herdsman-converters/blob/master/src/devices/hobeian.ts
  - Water leak AY222Z: both `"AOYAN"` and `"AOYAN  "` (`src/devices/tuya.ts`, TS0207 water leak definition), added by zyjsmile857 in PR #12488, whose description says the names were kept exactly as the devices report them, padding included. Link: https://github.com/Koenkk/zigbee-herdsman-converters/pull/12488
  - Follow-up PR #12661 (same author) added the AOYAN model IDs to the base definitions. Link: https://github.com/Koenkk/zigbee-herdsman-converters/pull/12661
- Homey forum topic 140352 post #2258 (EdP, 2026-09-27) gives the AY-303Z as "AOYAN", read from Homey Developer Tools. A web table hides trailing spaces, so this post cannot tell us whether Homey keeps or strips the padding.

## How matching works on our side

- Pairing: Homey core compares the interview `manufacturerName` with the driver manifest. The SDK docs do not say this comparison ignores case or whitespace, and the repo has always treated it as exact (which is why case variants are listed). So we cannot count on Homey trimming the padding.
- Runtime: once a device is paired, our identity helpers already ignore case and whitespace (`lib/utils/TuyaNormalizer.js` `normalize`, `lib/utils/fingerprint-matcher.js` `normalizeMfr`, `ManufacturerNameHelper` trims). Lookups such as the soil ZG-303Z DP map work the same for `"AOYAN"` and `"AOYAN  "`.

## What we changed

- Added the exact device string `"AOYAN  "` (two spaces) to `soil_sensor` and `water_leak_sensor` on master, next to the existing `"AOYAN"`. This is additive and changes nothing for units that send the plain name. We did not add the one-space form, because no source ties it to a soil or water-leak model.
- `scripts/validation/check-driver-collisions.js` now trims as well as lowercases its key, so a padded name is treated as the same identity as the plain one.
- Checked with `homey app validate --level publish` (Node 22): it passes, and the built `app.json` keeps the padded string.
- Test: `test/critical/aoyan-padded-manufacturer.test.js`.

## Contre quoi

- Never trim the manifest entry itself, because the padded string is what the device sends.
- Never invent other padding or casing forms that no source has seen.
