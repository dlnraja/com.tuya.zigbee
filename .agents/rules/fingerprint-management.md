# Fingerprint & AggregateError Prevention Rules

## 1. Dual-Layer Pairing Architecture (MANDATORY)
Homey Pro reads `app.json` statically during the pairing process. If a Zigbee driver has an empty `manufacturerName` array while containing fingerprints, Homey throws a fatal `AggregateError` during its internal Cartesian combination matching.

To prevent this:
- **Layer 1 (Static):** The `driver.compose.json` must ALWAYS contain explicitly validated `manufacturerName` arrays. NO empty arrays `[]` are permitted if `productId` exists. Arrays must be strictly deduplicated using `Set` objects, independently of each other.
- **Layer 2 (Dynamic):** The `data/mfs_db.json` acts as a heuristic database. `SmartDriverAdaptation` loads this lazily after successful pairing to resolve `deviceId` and unknown Data Points. Do NOT use `mfs_db.json` to inject unchecked wildcards into Layer 1.

## 2. Cross-Driver Collision Policy
- **No Overlapping Tuples:** The Cartesian product `(manufacturerName * productId)` must be **UNIQUE** across all drivers in the project.
- **Allowed Exceptions:** Only specific fallback drivers like `universal_fallback`, `generic_tuya`, `universal_zigbee`, and `device_generic_tuya_universal` are permitted to have wildcard or overlapping fingerprints.
- **Resolution:** If a generic manufacturer name (e.g., `hobeian`) conflicts across multiple sensor types with generic product IDs (e.g., `TS0601`), it MUST be statically removed from conflicting drivers and managed heuristically by the generic Tuya driver via `mfs_db.json`.

## 3. Automation & AI Constraints
- **NEVER** use wildcards (`_TZE200_*`, `Tuya`) in `driver.compose.json` manufacturer arrays.
- **ALWAYS** run `node scripts/validation/check-driver-collisions.js` before pushing changes.
- Ensure that the fingerprint maintenance scripts (such as `scripts/automation/fix-duplicate-fingerprints.js`) correctly process changes by treating arrays independently (no zipping).
