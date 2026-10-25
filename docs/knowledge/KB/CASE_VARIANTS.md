# Case variants of manufacturerName / productId (P3027)

Our own words; sources and credits at the end.

## 1. How Homey matches (verdict)

- **Homey pairing is byte-exact.** A driver is offered when the device's
  `manufacturerName` string and its `productId` string are both present, exactly,
  in that driver's `zigbee` arrays: case-sensitive and space-sensitive, no folding,
  no trim (Athom Apps SDK v3, Zigbee driver manifest; Homey forum topic 151483,
  smarthomesven and DirkG). That is why the repo carried lower and UPPER copies
  "just in case".
- **Athom's build counts raw strings**: per driver the manufacturerName ×
  productId cartesian, every case copy counted again. Our cap of 15500 total /
  1500 per driver is our own heuristic (`docs/knowledge/ATHOM_LIMITS.md`), not an
  Athom number.
- **Our runtime is caseless**: `DeviceFingerprintDB` and
  `TuyaNormalizer.normalize()` trim and lowercase, so a variant only matters for
  Homey's *first* match at pairing time.

## 2. What devices really send (the "wire shape")

Cross-checked against Koenkk zigbee-herdsman-converters (exact `===` fingerprints),
zigpy/zha-device-handlers quirks, deCONZ DDFs, Blakadder, Johan Bendz's app and 96
real Homey interviews/diagnostics:

- **manufacturerName**: uppercase prefix (`_TZ3000_`, `_TZE200_`, `_TYST11_` …)
  followed by the suffix exactly as the module stores it, usually lowercase
  (`_TZ3000_abcd1234`), sometimes genuinely mixed case.
- **productId**: uppercase (`TS0601`, `TS011F`, `TS004F`).
- Never seen for a Tuya id in any reliable source: all-lower `_tz3000_abcd1234`,
  all-UPPER suffix `_TZ3000_ABCD1234`, lower prefix + UPPER suffix, `ts0601`,
  `Ts0203`. These were minted by our own scripts.
- Real outliers kept verbatim, each with its source, live in
  `data/case-variant-wire-evidence.json`: `_TZ3000_nPGIPl5D`, `_TYST11_KGbxAXL2`,
  `_Tz3000_0Zfrhq4I`, `_TZ3000_TS004F`, plus `_tz3000_i8jfiezr` and
  `_tz3000_llfaquvp` (uncertain, kept).

## 3. Census (driver sources, 2026-10-25, strings counted per driver)

| kind | wire shape (real) | outlier with evidence (real) | minted, wire sibling in same driver (redundant) | minted, no sibling (uncertain, kept) | non-Tuya brand (kept) |
|---|---|---|---|---|---|
| manufacturerName | 4424 | 3 | 12738 | 0 | 1838 |
| productId | 1396 | 0 | 296 | 2 | 1854 |

## 4. Rule applied (publish manifest only)

`scripts/maintenance/case-variant-evidence.cjs`, called by
`scripts/maintenance/compact-zigbee-identifiers.cjs`:

- A string is left out of the **generated publish manifest** only when it is
  Tuya-shaped, not wire-shaped, not in the evidence file, not an exact string of a
  P3024b pinned couple (`test/fixtures/athom-last-test-package-couples.json`), a
  sacred couple or a baseline exemption, **and** the same driver keeps its
  wire-shaped sibling. `driver.compose.json` sources are untouched; runtime stays
  caseless.
- The 2-forms case cap keeps the wire form first; pass2 phase A trims non-wire
  copies first.
- **No-loss guard**: the compactor first runs the pre-P3027 logic on a copy
  (byte-identical to the old output). Every caseless (driver, mfr, pid) couple it
  ships is protected from the budget cuts; if the new result would still miss one,
  break the cap or miss a pin, the old result is shipped unchanged
  (`noLossFallback`).
- Opt-out: `HOMEY_ZIGBEE_DROP_NEVER_EMITTED=0` (then the old logic runs as before).
- Result on the current tree at cap 15500: 10660 minted copies omitted, raw total
  15495, sacredMissing 0, 0 caseless couple lost, caseless (driver, mfr, pid)
  couples 6743 → 6770 (+27), distinct caseless (mfr, pid) 6606 → 6633.
- Why the gain is small: the floor is the P3024b fixture itself, which pins about
  2900 minted mfr combos and 2000 minted pid combos exactly.

## 5. Read-time normalization

`TuyaNormalizer.normalize()` now also strips the Mongolian free variation
selectors (U+180B–U+180D) and the variation selectors U+FE00–U+FE0F, and
collapses any whitespace run to one space before trim/lowercase, on top of the
existing NBSP / ZWSP / BOM removal and NFKC folding of fullwidth characters. No
data is duplicated.

Tests: `test/critical/p3027-case-variants-never-emitted.test.js`.

## 6. Opt-in: pin a minted form through its wire spelling (P3027b, OFF by default)

The 9.0.1574 fixture (`test/fixtures/athom-last-test-package-couples.json`)
pins 13998 exact couples. Many are minted spellings (`_tz3000_x`, `ts0601`), so
section 4 cannot omit them and they eat the budget.

- **Fixture stays additive.** Every pinned string stays in `drivers`. A separate
  `wireEquivalents` block maps a minted pin to its wire spelling, per driver.
  An entry exists only if the wire spelling is already in that driver (fixture or
  `app.json`), is wire-shaped, equals the minted string ignoring case, and is the
  only such spelling. Evidence outliers are never mapped. Regenerate with
  `node scripts/maintenance/build-wire-equivalents.cjs` (`--check` reports staleness;
  the P3027b test fails when the block is stale).
- **Switch:** `HOMEY_ZIGBEE_PIN_WIRE_EQUIVALENT=1` (only the exact value `1`).
  Unset means the output is byte-identical to section 4.
- **With the switch on:** the compactor pins the wire spelling, so the minted
  copy becomes omittable. The P3024b gate (`publish-baseline-gate.cjs`, used by
  `prepare-publish.js`) also counts a pinned couple as present when the recorded
  wire spelling is in the payload with the same pid. It never accepts another
  pid or a spelling that is not recorded. The no-loss guard still runs, with the
  switch off, as the reference.
- **Measured on the real tree at 15500:** raw 15493, 0 pins missing, 0
  caseless couples lost vs switch off. Caseless couples go from 6776 to 13306,
  and 9143 fixture couples are satisfied through equivalence.
- **Activation:** set the variable in the publish workflow env, which covers
  both the compactor and the gate in the same `prepare-publish.js` run. Do it
  in a single upload as a soak, after the 25/10 10:00 master upload result.
  Roll back by removing the variable. If the gate runs without the variable
  on a payload built with it, the gate fails loudly; it never fails silently.

## Credits

- Athom B.V. — Homey Apps SDK v3 documentation (Zigbee driver manifest).
- Homey Community forum topic 151483 — smarthomesven, DirkG.
- Koen Kanters and contributors — Koenkk/zigbee-herdsman-converters.
- zigpy / zha-device-handlers contributors.
- dresden elektronik — deCONZ device descriptions.
- Blakadder — Zigbee device compatibility repository.
- Johan Bendz — Tuya Zigbee Homey app (original fingerprints).
