# Driver-count ceiling on Athom uploads (P3262)

Status: **observed, unconfirmed by Athom.** Question asked on Athom ticket **157057**.

## Rule
1. Do not ship a payload with more drivers than the last build Athom accepted for that app
   (`config/driver-count-ceiling.json`: master 347, stable 342, Bastien 27 on 2026-11-03).
2. A new couple goes into an **existing driver** of the same type, or into a **continuation chain**
   (docs/rules/DRIVER_CONTINUATIONS.md). One couple, one driver still holds: if the fold would
   create a couple another driver owns (for example `AOYAN|TS0601`, which soil_sensor owns), do not fold.
   Hold the driver and ask instead.
3. A placeholder or low-value driver can be **swapped one-for-one** for a new driver. The count stays
   the same. Never swap out a driver that paired devices depend on, so that zero couples are lost.
4. Raise `lastAccepted` only after Athom accepts a build with more drivers, and cite that build.

The CI gate `scripts/ci/driver-count-ceiling-gate.js` runs on the prepared publish directory, right
after payload-preflight. It **warns** on master and **fails** on stable-v5 and bastien-home.
Test: `test/ci/p3262-driver-count-ceiling.test.js`.

## Evidence (master, `docs/knowledge/athom-publish-outcomes.jsonl` + CI logs)
| Version | Build | Payload drivers | app.json (prepared) | Combos | Result |
|---|---|---|---|---|---|
| 9.0.1596 / 1597 / 1598 | #3679-#3681 | 347 | — | — | socket hang up (transient) |
| 9.0.1599 | #3682 | 347 | — | — | **Test** |
| 9.0.1602 | #3684 | 361 | — | — | AggregateError |
| 9.0.1603 | #3685 | 353 | — | — | AggregateError |
| 9.0.1604 | #3686 | 347 | 3,328,185 B | — | **Test** |
| 9.0.1605 | #3687 | 360 (347 + 13 released) | — | — | AggregateError |
| 9.0.1606 | #3688 | ≥348 (bisect) | — | — | AggregateError |
| 9.0.1607 / 1608 | — | 354 (+7) | — | — | AggregateError |
| 9.0.1609 | — | 351 (+4) | — | — | AggregateError |
| 9.0.1610 | — | 349 (+2) | — | — | AggregateError |
| 9.0.1611 | — | 348 (+heiman_keyfob) | 3,332,792 B | 15,429 | AggregateError |
| 9.0.1612 | — | 348 (+heiman_siren) | — | — | AggregateError |
| 9.0.1613 | — | 349 (+2) | — | — | AggregateError |
| 9.0.1614 | — | 348 (+presence_radar_aoyan_ay204t) | — | — | AggregateError |
| 9.0.1615 | #3697 | 347 | 3,338,171 B | 15,443 | **Test** |
| 9.0.1616 | — | 348 (+water_leak_aoyan_ay222z) | ~3,344,879 B | 15,444 | AggregateError |

The manifest size is not the cause: 1611 was refused at 3,332,792 B, and 1615 was accepted at a
larger 3,338,171 B. Stable was accepted at 342 drivers (#417) and Bastien at 27 (#236).

## What it is probably not: a fixed number
- In October 2026 master was accepted with **446** drivers (9.0.1330-1420). Every build with 447 or
  more was refused (docs/knowledge/ATHOM_NEW_DRIVER_REJECTION_2026-10-11.md). So 347 is not a
  universal Athom cap. The common factor is "more drivers than the last accepted build", that is,
  adding a never-published pairable driver id. Two counter-signals are on record (#3495 with 447
  drivers but deprecated was accepted; #3483 with fewer drivers was refused). Some AggregateErrors
  flipped on an identical retry (1424 then 1425).
- Public sources: Athom documents no limit on the number of drivers. `homey-lib` 2.53.0 (the
  validator used by `homey app validate`) has no driver-count check and no AggregateError. No forum
  or SDK issue describes one. The limit, if there is one, is server-side and undocumented.

## Athom's own count (public API, 2026-11-03)
`https://apps-api.athom.com/api/v1/app/<id>` (public, no login) lists the drivers of the build in Test:
master 9.0.1615 #3697 = **345** (we count 347), stable #417 = 341 (we count 342), Bastien #236 = 27.
So Athom keeps or counts 2 fewer master drivers than our payload. If the cap is on Athom's count, the
real threshold may be 345/346. Next step: diff our 1615 payload ids against the API list to find the 2.
The gate runs with `--athom-api`. It allows Athom's count of the last Test build plus our offset
(master +2, stable +1, Bastien 0), and falls back to the static `lastAccepted` when the API is unreachable.
homey CLI 4.6.2 (`lib/App.js` publish) only uploads the archive and checks the HTTP status. homey-lib 2.53.0's
schema has no `maxItems` on drivers. The AggregateError is produced in Athom's server-side processing after
upload; the per-build error detail is only on the logged-in developer tools build page.

## Test running now (2026-11-03)
A parallel task swaps `device_radiator_valve_thermostat` out for `water_leak_aoyan_ay222z`
one-for-one, so master stays at 347 drivers. The result tells us which explanation holds:
- If Athom accepts it, the limit is on the count. Swaps and folds are the way forward.
- If Athom refuses it, the limit is on new driver ids. Only folds into published drivers work.
Record the verdict here and in athom-publish-outcomes.jsonl.
