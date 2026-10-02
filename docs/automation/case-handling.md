# Case handling of manufacturerName / productId (P2793)

## 1. How Homey matches Zigbee fingerprints

- Homey firmware picks a driver from `app.json` → `drivers[].zigbee.manufacturerName[]` and
  `productId[]`. A device matches a driver when its manufacturerName is in the first list **and** its
  productId is in the second list of the same driver (cartesian within one driver).
- The comparison is an **exact, case-sensitive string match**; there are no wildcards or prefixes
  (Athom SDK Zigbee docs; the community compatibility checkers also require the exact case).
- `homey-zigbeedriver` (2.x) and `zigbee-clusters` do not normalize `manufacturerName` at all: they
  receive the node already matched by the firmware and expose `zclNode` / `getSettings()` values
  as reported by the device.
- Consequence: a variant spelling that the device reports (e.g. `_TZ3000_ABCDEFGH` vs
  `_TZ3000_abcdefgh`) only pairs to the intended driver if that exact spelling is listed.

## 2. What other Homey apps do

Survey of the compose files of public Homey Zigbee apps (Oct 2026):

| Repository | Drivers | manufacturerName entries | Case variants listed | Runtime normalization |
|---|---|---|---|---|
| JohanBendz/com.tuya.zigbee (develop-0.4) | 140 | 717 | none | none (exact compares) |
| JohanBendz/com.lidl | 21 | 33 | none | none |
| gpmachado/com.gpm.homesuite | 36 | 71 | none | none |
| gpmachado/com.gpm.tuya | 10 | 13 | none | none |
| kodalissri/com.MyZigbee.Devices | 18 | 56 | none | none |
| ChrisBloem/Homey-Zigbee-Community | 1 | 1 | none | none |
| smarthomesven/homey-ewelink-zigbee | 1 | 1 | none | none |
| Drenso/com.tuya2 | n/a (no zigbee manufacturerName) | – | – | – |

Athom's own Tuya/Zigbee apps are not published as source with compose fingerprints we could
compare. No peer app lists case variants or lowercases at runtime: they rely on the exact
spelling the device reports. Device quirk tables in those apps are keyed by the exact string.

Real-world evidence of mixed case: in our zigbee-herdsman-converters cache (1309 ids) only
`_TZ3000_nPGIPl5D` carries a mixed-case suffix, and no id appears there in two spellings.
Variant spellings mostly come from user reports and from different firmware batches.

## 3. Policy in this app

1. **Manifest (pairing)** — fingerprints stay exact strings because Homey matches exactly. The
   repository convention is 4 spellings per Tuya id (`_tz3000_x`, `_TZ3000_X`, `_TZ3000_x`,
   `_tz3000_X`) inside the *same* driver (4320 groups already follow it). New variants are added only
   (a) where a source shows the variant, or (b) to complete a group that already follows the
   convention in that driver, and only when no other driver lists the new spelling (no couple on two
   drivers). Brand-style names (`HOBEIAN`, `Lonsonho`, …) are left as reported.
2. **Runtime (after pairing)** — every lookup keyed by manufacturerName/productId is
   case-insensitive through one shared helper in `lib/utils/TuyaNormalizer.js`:
   - `ciGet(map, key)` / `ciHas` / `ciKey`: exact key first (unchanged behaviour and cost), then a
     lazily built index `normalize(key) → original key`, cached per map in a `WeakMap` and rebuilt
     only on a miss after the map gained keys. No data is duplicated or rewritten.
   - `includesCI(array, value)`, `normalize(str)` (LRU-cached), `findCI` for arrays.
   Already case-insensitive before P2793: FirmwareQuirks, UserMisattributionRegistry,
   DeviceFingerprintDB (lowercase index), fingerprint-matcher, InPlaceIdentityLayer couple keys.
   P2793 moved the remaining exact reads (battery profiles, DP maps, MCU formats, OTA table,
   device hints, Green Power table, emergency fixes, energy/config maps in several drivers,
   `dp_registry.json` lookups, IntelligentDeviceConfig) to `ciGet` / `includesCI`.
3. **Large data** — `data/mfs_db.json` (~5 MB) is excluded from the published payload
   (`.homeyignore`); the runtime uses `lib/tuya/fp-shards` (lazy, per-prefix) and
   `lib/tuya/fingerprints.json` (~0.9 MB, loaded on first need). `scripts/ci/publish-size-gate.cjs`
   (pre-commit hook) now also checks `lib/tuya/fingerprints.json` (≤ 2 MB) and fails if
   `data/mfs_db.json` is shipped while above 4 MB, next to the existing `app.json` ≤ 4 MB check.
4. **CI scanners** — `scripts/validation/check-driver-collisions.js`, `scripts/leads/strict-apply.js`
   and `scripts/leads/coverage-audit.js` compare lowercased manufacturerNames and uppercased
   productIds.

## 4. Coverage audit (`scripts/leads/coverage-audit.js`)

Known manufacturerName + externally sourced productId (z2m definitions with one modelId, leads
with an exact snippet, issue posts naming exactly one couple) → written only when exactly one
other driver of the same Homey class lists that productId and adding it creates no couple that
another driver already matches. Manual holds live in `data/leads/coverage-audit-hold.json`.
Runs capped (`vars.COVERAGE_AUDIT_MAX`, default 3) in `oss-lan-source-enrich.yml`.

## 5. `check-driver-collisions.js` findings (not a CI gate)

The script expands each driver to its manufacturerName × productId couples (how Homey matches)
and reports ~700 couples present on two drivers on master, all pre-existing. The
`switch_1gang` / `switch_2gang` group is `_TZE204_amp6tsvy` and `_TZE284_amp6tsvy` (both listed
in both drivers, which share TS0003/TS000F/TS0012/TS011F/TS0601/TS0726). Resolving it would
require removing the id from one of the two drivers, which the additive-only rule forbids, so it
is documented here for an owner decision; nothing was moved. P2793 additions were checked to not
increase the count (707 before and after).

## 6. P2793 changes (master)

- Case-variant completion: 15 groups in 9 drivers that already used 2–3 of the 4 conventional
  spellings got the missing ones (28 strings; no new spelling exists in another driver).
- Coverage audit, first run: 6 couples written (existing manufacturerName strings appended to one
  same-class driver each): `_TZ3040_o4mkahkc`/TS0202 → slim_motion_sensor,
  `_TZ3000_cet6ch1r`/TS130F → curtain_motor_wall, `_TZ3210_odlghna1`/TS0503B → led_strip_rgbw,
  `_TZ3000_c8zfad4a`/TS0203 → contact_sensor, `_TZ3210_f8dqbuze` and `_TZ3210_zkhmztqn`/TS0501B →
  led_controller_dimmable (24 strings). 2 couples held for review, 44 remain leads (ambiguous,
  class mismatch, TS0601, or would duplicate a couple); 463 uncovered couples exist only in internal
  data and are not applied.
- `app.json`: 2,314,870 → 2,315,856 bytes (+986 B, 2.21 MB of 4 MB).
