# P3340: what Athom's "AggregateError" is, and why master stops at 347 (16/11/2026, Paris)

Offline analysis only. No Athom upload, no Athom contact.

## 1. The error text is a Node network signature, not a validation report
- Athom stores the processing error as `stateMeta`. The values we have seen are `socket hang up` (Node http
  ECONNRESET message), `The specified key does not exist.` (S3 NoSuchKey message) and `AggregateError`.
- A bare `AggregateError` (no message) is exactly what Node 20+ produces when `net.connect` tries several
  addresses (IPv4 + IPv6, "happy eyeballs", on by default) and all fail: `err.name === 'AggregateError'`,
  `err.message === ''`, `String(err) === 'AggregateError'`, `err.code` = ETIMEDOUT / ECONNREFUSED.
  Reproduced locally with Node 22 (`net.connect` to a closed localhost port).
  `Promise.any` would say "All promises were rejected", and a validator would list its problems.
- Known Node behaviour (nodejs/node#54359, undici#2777): each non-final address gets 250 ms. If the
  process event loop is blocked for 250 ms or more while a connect is in flight (heavy synchronous work,
  GC), the attempt is abandoned and the error is AggregateError ETIMEDOUT, even though the network is fine.
- So `processing_failed | AggregateError` = an outbound connection inside Athom's processing worker failed.
  The probability grows with the work that worker does for our package, which explains a "soft ceiling"
  that is not a hard count.

## 2. Evidence matrix
| Build | Drivers | app.json B | Flow cards | Files | Content vs previous | Result |
|---|---|---|---|---|---|---|
| #3705 v9.0.1624 | 347 | 3 357 825 | 4599 | 4019 | nothing released | Test |
| #3706 v9.0.1625 | 347 | 3 357 825 (same size, version string only) | 4599 | 4019 | +P3318 JS, changelog +64 B | AggregateError |
| #3707 v9.0.1626 | 347 | 3 357 659 | 4599 | 3813 | siren_moes_mg_bjq002 swapped for sound_sensor_tuya | AggregateError |
| 9.0.1385 / 9.0.1386 (Oct) | 347 payload | ~3.8 MB | | | near-identical | Test / AggregateError |
| 9.0.1424 / 9.0.1425, 9.0.1426 / 9.0.1427 (Oct) | | | | | identical content | AggregateError / Test |
| 9.0.1620 / 9.0.1621 (14/11) | +1 never-published id each | 3.12 MB | | | new driver id | Test, Test |
| stable #427 v5.12.x | 342 | 2.85 MB | 4091 | | normal push | Test (stable: 0 AggregateError in the ledger) |
| bastien | 27 | 0.50 MB | 641 | 2179 | normal push | Test |

- Same content, opposite verdicts: three pairs. A content rule cannot produce that.
- New driver ids are accepted too (9.0.1620, 9.0.1621). 347 is the level where refusals became frequent,
  not a fixed Athom number. The first AggregateError streak starts with 9.0.1331 (2-4 Oct).

## 3. Content audit (refused 347 payload vs stable vs bastien, same checks)
Script: deep lint of every string and structure in app.json (control characters, BOM, lone surrogates,
U+FFFD, non-NFC, long strings, empty keys, duplicate flow/arg/token/setting/dropdown ids, arg and token
types, missing `en` titles, titleFormatted args, unknown capabilities, sub-capabilities without a title,
class values, zigbee mfr/pid types, empty values, whitespace, length, non-ASCII, endpoints/clusters, images,
icons, pair/repair views, device filters, custom capability types) plus `homey app validate --level publish`.
- Master refused payload: 0 character problems, 0 duplicate ids, 0 missing views/images. The leftovers
  (46 sub-capabilities without a title, 21 tokens named like an argument, 130 couples on two drivers,
  8 upper-case driver ids) also exist in the stable payload, which Athom never refused. Not the trigger.
- homey-lib validation: max event-loop block ~110-125 ms for master 347 and stable 341 on this machine
  (bastien ~65 ms), growing with manifest size. A slower worker doubles that, which is the 250 ms window.
- The 5 "refused alone" held drivers (heiman_keyfob, heiman_siren, presence_radar_aoyan_ay204t,
  water_leak_aoyan_ay222z, siren_moes_mg_bjq002) were each judged on ONE upload. With identical-content
  flips proven, a single refusal is not a verdict.

## 4. Fixes in this change
- `publish-hold-bisect.js`: a single id is isolated only after a second refusal (`ISOLATE_CONFIRMATIONS = 2`).
  The first refusal re-queues it once at the end of the queue. Test p3095 (fail before, pass after).
- `payload-preflight.cjs`: blocking check for control characters, BOM, lone surrogates, U+FFFD and empty or
  non-string zigbee ids anywhere in app.json (the current master payload passes). Test p3340.

## 5. How to go above 347 (proposals, not applied)
1. Lower Athom's work per build, the only lever we control: smaller app.json (move per-driver bulk that
   Homey does not need for pairing out of the manifest), fewer flow cards (merge per-driver duplicates
   into app-level cards with device filters, without removing published ids), fewer payload files.
   Target: master app.json below stable's 2.85 MB, then add drivers back one by one.
2. Applied as P3341 (owner go 16/11/2026 03:03 Paris): a bare AggregateError gets one bounded identical retry
   (P3311 first backoff), the breaker trips when the retry fails too. See P3036_ATHOM_PUBLISH_POLICY.md.
3. Single diagnostic upload to confirm (one dispatch, Draft only): re-send the exact #3706 content
   (347, nothing released) with a new version. Test confirms the flake reading of #3706; a refusal on
   identical content with no change at all confirms that the refusals do not depend on content.
