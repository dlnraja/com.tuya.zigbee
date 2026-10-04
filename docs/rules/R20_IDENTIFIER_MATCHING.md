# R20: identifier matching (manufacturerName, productId/modelId)

## How the platforms compare (research 2026-10-04)
| Platform | Pairing match | Notes |
|---|---|---|
| Homey (SDK3, homey-zigbeedriver) | exact string, case-sensitive, manufacturerName + one productId ([Homey Zigbee docs](https://apps.developer.homey.app/wireless/zigbee); case sensitivity confirmed by the [community compatibility checker thread](https://community.homey.app/t/homey-zigbee-compatibility-checker-check-devices-by-manufacturer-and-product-id/151483)); no wildcards ([forum](https://community.homey.app/t/wildcard-on-zigbee-productid/51187)) | compose lists must keep the reported forms (canonical + lowercase, max 2 per P1) |
| Zigbee2MQTT / zigbee-herdsman-converters | fingerprint `{modelID, manufacturerName}` exact strings; `zigbeeModel` list exact | Tuya prefixes (`_TZE200`/`_TZE204`/`_TZE284`) are distinct identities |
| ZHA / zigpy quirks | `(manufacturer, model)` exact signature | string attributes are length-prefixed ZCL char strings; padding is a firmware artefact |
| deCONZ / SmartThings Edge | exact `manufacturer` + `model` fingerprints | same |

## What this repository does
- Data keeps the reported forms; nothing is rewritten in bulk (respect each field's expected format).
- Runtime comparison is tolerant only at match time: `lib/utils/TuyaNormalizer.normalize` (NFKD, control/NUL strip, lowercase, trim) and `lib/utils/fingerprint-matcher.js` (`normalizeMfr` keeps the prefix/suffix split, `normalizePid` uppercases). The original string stays for display and diagnostics.
- Gate `npm run check:identifiers` (`tools/ci/identifier-audit.js`, in `check:publish`): fails on new malformed entries (whitespace/NUL padding, zero-width/invisible, non-ASCII) and on couples claimed by two drivers only through different case forms (hidden from exact-string collision checks). Baseline: `tools/ci/identifier-audit-baseline.json` (7 deliberate MÜLLER LICHT encoding hedges, 0 hidden collisions on 2026-10-04).
- Prefixes are never merged by the gate (`_TZE200_x` and `_TZE204_x` are different couples).
