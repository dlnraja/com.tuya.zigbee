# P3041 — reducing combos, parasites and app.json size (measured, 25/10/2026 18:30 Paris)

Owner ask (t526u): « Trouvé une solution de réduction des problème et des tailles ».
Measure: `node scripts/maintenance/payload-reduction-report.cjs <payload app.json>`; every run below is a real
`homey app build` + `TMPDIR=… node scripts/prepare-publish.js` on master `037b50e8e8` (P3036d, held).

## What the uploaded app.json is made of (3 327 316 B)
| part | size | note |
|---|---|---|
| flow | 1646 KB | 4612 cards; 1457 unique once `driver_id` is ignored |
| drivers.settings | 800 KB | 1670 entries, 347 unique; hints 318 KB |
| drivers.zigbee | 253 KB | manufacturerName 117 KB, productId 18 KB, learnmode 79 KB |

Zigbee identifiers are ~4 % of the bytes. Combos do not make the file big. The published app.json is fully
expanded by the SDK (no shared settings/cards); merging driver cards changes card ids and breaks user Flows.
=> there is no lossless byte lever worth having; bytes are UI text.

## Levers measured
| lever | result |
|---|---|
| L0 `caseFormsNeedSource` (ON, decision-free): compaction + TS0601 top-up spend no room on unsourced all-lower/all-upper twins (removes nothing already pinned) | caps 45000: case-folded couples 23603 → 23935 (+332), combos 44975 → 44982, bytes −903 |
| L1 `pruneArtifactCaseForms` (OFF, owner yes): also prune twins pinned by P3024b, keep the sourced/canonical twin, refill | caps 45000: 26058 couples (+2455 vs today) at 41508 combos, 3 306 293 B; measured-safe caps 17000/1008 (+20000/1008 top-ups): 9143 → 13719 couples (+4576, +50 %), max/driver 1364 → 1008, drivers > 1008: 1 → 0 |
| TS0601-only carrier siblings (simulation, not implemented) | −8.2k to −14.3k combos depending on the evidence definition; 9–10 siblings worth it (curtain_motor, climate_sensor, presence_sensor_radar, soil_sensor, radiator_valve, wall_dimmer_tuya, motion_sensor…) ≈ +80 KB bytes |
| mono-pid drivers / full biclique split | wanted set alone (baseline + evidence) = 28 114 combos > 20 000 measured; hundreds of new driver ids, +5–10 KB each |
| bin packing instead of compaction | the compactor is not the limit: the fill stops on per-driver caps and on "no driver declares it"; same couples, no gain measured |

Artifact definition (`scripts/lib/case-form-sources.cjs`): unsourced byte-exact (z2m cache, z2m coverage, KB
couples, interviews, diag reports, couple-guard, sacred pins), all-lower or all-upper, not padded, and the same
driver keeps a sourced or mixed-case form of the same manufacturer. No external source holds an all-lowercase
Tuya form except 11 strings (kept). Groups with no sourced and no canonical form are left alone.

## Why L1 needs the owner
P3024b checks the exact string. With L1 a twin such as `_tze200_abcd1234` leaves, its canonical
`_TZE200_abcd1234` stays on the same driver with the same productIds (gate reports them as `caseEquivalent`).
If a real device ever sent the all-lowercase string it would stop matching. No source has ever seen one.
