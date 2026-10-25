# P3038c: why there is no "unidentified TS0601 device" fallback driver

Date: 2026-10-25 (Paris). Asked by dlnraja (t516u): add a dedicated fallback driver only if it can be
shown that it never wins over an exact driver. It cannot, so it was not built.

## How Homey picks a Zigbee driver

- Pairing is handled by Homey itself. An app can't supply its own Zigbee pairing views
  (https://apps.developer.homey.app/the-basics/devices/pairing).
- A driver claims devices only through the `zigbee.manufacturerName` and `zigbee.productId` lists in its
  manifest (https://apps.developer.homey.app/wireless/zigbee).
- The manifest has no priority, weight or fallback field.
- The SDK does not document which driver wins when two drivers or apps match the same
  manufacturerName + productId. Community reports describe it as "the first matching driver found".
  That order is not a contract.

## Why a fallback can't be made safe

1. A "catch every TS0601" driver needs an empty `manufacturerName`, so that any manufacturer matches.
   - P3038 removed exactly this kind of wildcard: it let `_TZE200_yenbr4om` (#576) pair as the wrong class.
   - Nothing guarantees that the exact driver beats the wildcard.
2. The publish compaction (`scripts/maintenance/compact-zigbee-identifiers.cjs`) ships no
   empty-manufacturer driver at all. A wildcard fallback would therefore exist only in source installs,
   never in the store build.
3. Listing manufacturers explicitly makes the fallback an exact driver. Any manufacturer it lists
   either:
   - collides with the real driver (same couple on two drivers, undefined winner, and a
     fingerprint-collision gate failure); or
   - is a manufacturer we don't know. In that case the right fix is to add it to its real driver from
     a source, which is what P3038c does.
4. A neutral driver that "detects the DPs it receives" would have to bind or listen on 0xEF00 from
   pairing on. The brief forbids this.

## What was done instead

- Every sourced TS0601 couple that P3038 had left without a driver was added to the existing driver of
  its real device class. It was then pinned in `config/architecture/publish-sacred-keep-couples.json`.
  - Ledger: `config/architecture/p3038c-ts0601-compensation.json`, with one source URL per couple.
- Couples with no fitting existing driver were kept as leads in
  `data/leads/p3038c-ts0601-unmapped-2026-10-25.json`, where a new driver is needed. None of them was
  invented.
- A device that is still unknown pairs as Homey's basic Zigbee device. That is safer than a
  wrong-class driver.

Guard: `test/critical/p3038c-ts0601-compensation.test.js`.
