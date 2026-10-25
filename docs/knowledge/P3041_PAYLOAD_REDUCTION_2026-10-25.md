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
| L1 `pruneArtifactCaseForms` (ON since owner yes t526s3030 18:32): also prune twins pinned by P3024b, keep the sourced/canonical twin, refill | caps 45000: 26058 couples (+2455 vs today) at 41508 combos, 3 306 293 B; measured-safe caps 17000/1008 (+20000/1008 top-ups): 9143 → 13719 couples (+4576, +50 %), max/driver 1364 → 1008, drivers > 1008: 1 → 0 |
| TS0601-only carrier siblings (simulation, not implemented) | −8.2k to −14.3k combos depending on the evidence definition; 9–10 siblings worth it (curtain_motor, climate_sensor, presence_sensor_radar, soil_sensor, radiator_valve, wall_dimmer_tuya, motion_sensor…) ≈ +80 KB bytes |
| mono-pid drivers / full biclique split | wanted set alone (baseline + evidence) = 28 114 combos > 20 000 measured; hundreds of new driver ids, +5–10 KB each |
| bin packing instead of compaction | the compactor is not the limit: the fill stops on per-driver caps and on "no driver declares it"; same couples, no gain measured |

Artifact definition (`scripts/lib/case-form-sources.cjs`): unsourced byte-exact (z2m cache, z2m coverage, KB
couples, interviews, diag reports, couple-guard, sacred pins), all-lower or all-upper, not padded, and the same
driver keeps a sourced or mixed-case form of the same manufacturer. No external source holds an all-lowercase
Tuya form except 11 strings (kept). Groups with no sourced and no canonical form are left alone.

## L1 decision (owner yes t526s3030, 25/10/2026 18:32 Paris) — what the gate now checks
P3024b checks the exact string. With L1 a twin such as `_tze200_abcd1234` leaves, its canonical
`_TZE200_abcd1234` stays on the same driver with the same productIds (gate reports them as `caseEquivalent`).
If a real device ever sent the all-lowercase string it would stop matching. No source has ever seen one.

Since t526s3030, `config/publish-caps.json` has `pruneArtifactCaseForms: 1` and the measured-safe caps
(17000 base / 1008 per driver, top-ups 20000/1008, `allowAboveMeasuredCombos: 0`; the P3036d raised caps
stay recorded in `decision.previous`). P3024b case-equivalent mode, exactly:
- default (`checkBaseline` without options, CLI without a prune report): byte-exact, unchanged;
- with the prune ON, prepare-publish passes the sourced forms and the prune report; a baseline couple whose
  exact string is gone counts as kept only if that string is unsourced and all-lower/all-upper, the prune
  removed it, and the driver it was removed from still ships a sourced or mixed-case form of the same
  manufacturer with the same productId; anything else is still FATAL. The CLI picks up
  `p3041-case-prune.json` next to the payload automatically when the prune is ON (`--case-equivalent <file>`).
- `test/case-variants.test.js`: a form an external source reported exactly no longer needs an unsourced
  all-lower twin in the source build (the prune would remove it); the 80 pre-existing misses were all such
  sourced forms (_TZE284/_TZE2841000000/_TZE28C1000000/_TZE200/_TZE204), none invented, none added.

### Final measurement (master payload, `homey app build` + prepare-publish, 18:37 Paris)
| | before (rollback caps, prune off) | after (P3041) |
|---|---|---|
| combos | 19 975 | 19 982 |
| max per driver | 1364 | 1008 (curtain_motor, switch_2gang) |
| drivers above 1008 | 1 | 0 |
| uploaded app.json | 3 284 438 B | 3 269 669 B (92.4 % of the 3 537 000 cap) |
| couples (case-folded) | 9 143 | 13 719 |
| P3024b 9.0.1574 | 14 227 exact | 14 227 kept: 8 579 byte-exact + 5 648 case-equivalent on the same driver, 0 lost |
| parasites (audit) | 499 | 537 |

Compared with the P3036d raised caps (44 975 combos, max 1998, 11 drivers above 1008, 23 603 couples): fewer
couples (13 719) but everything inside what Athom has accepted. Rollback: `pruneArtifactCaseForms: 0`
(exact gate back) and/or `decision.previous.caps`.
