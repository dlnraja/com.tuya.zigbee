# Zigbee & Tuya Protocol Rules

> **Version**: 7.5.23 | **Last Updated**: May 2026
> This file is referenced by `.clinerules` as a canonical reference for Zigbee/Tuya protocol rules.

---

## 1. Fingerprint Matching

- **Fingerprint = manufacturerName + productId** (combined). Both must match.
- Same `manufacturerName` in multiple drivers is NORMAL (different productIds).
- **TRUE collision** = same mfr + same productId in incompatible drivers.
- **No wildcards** in SDK3 (e.g., `_TZE284_*` is INVALID).
- Case-insensitive comparisons ONLY via `lib/CaseInsensitiveMatcher.js`.
- Settings keys: `zb_model_id` (NOT `zb_modelId`), `zb_manufacturer_name` (NOT `zb_manufacturerName`).

## 2. Tuya DP Protocol (Cluster 0xEF00)

- Cluster: `0xEF00` (61184 decimal)
- DP Types: 0=Raw, 1=Bool, 2=Value, 3=String, 4=Enum, 5=Bitmap
- DP1-8: gang states | DP14: power-on | DP15: backlight | DP101: child_lock
- DP values may need division: temp/10, hum/10, battery/2
- Multi-DP frames: single report contains multiple DPs, parse ALL of them

## 3. Standard ZCL Protocol

- productId = TS0001-TS0504, TS011F, TS0121, etc.
- Uses standard clusters: onOff(6), levelControl(8), colorControl(768)
- `configureAttributeReporting()` for periodic updates (not just listeners)

## 4. Hybrid Protocol (ZCL + Tuya extensions)

- productId = TS0001-TS0044, TS011F
- Standard ZCL clusters PLUS Tuya-specific attributes
- May have cluster 0xE000 (57344) for button press types
- May have cluster 0xE001 (57345) for Tuya-specific settings

## 5. Battery & Energy Classification

- Battery: `measure_battery` OR `alarm_battery` — **NEVER both**
- Mains: `get mainsPowered() { return true; }` + remove battery caps
- Kinetic: TS004x without batteries — no battery caps
- Hybrid: runtime detection via `UnifiedBatteryHandler`

## 6. Physical Button Detection

- 2000ms timeout for `_appCommandPending` window (PR #120 pattern)
- `isPhysical = reportingEvent && !this._appCommandPending`
- Deduplication: skip if same capability+value within 500ms

## 7. Flow Card Rules

- ID pattern: `{driver}_physical_gang{N}_{on|off}`
- NO `titleFormatted` with `[[device]]` — causes manual selection bug
- Virtual buttons MUST use `this._safeSetCapability()`

## 8. Backlight Values

- Strings only: `"off"`, `"normal"`, `"inverted"` — NOT numbers
- Enforced by Layer 11 of the Quality Gateway

---

*See also: [CRITICAL_MISTAKES.md](./CRITICAL_MISTAKES.md) | [BYPASS_ELITE_LAYERS.md](./BYPASS_ELITE_LAYERS.md)*
