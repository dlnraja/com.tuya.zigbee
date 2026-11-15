# AggregateError: the five "isolated" drivers have no common content defect (2026-11-15)

Question: the P3095 hold bisect "isolated" five never-published drivers that Athom refuses even when
released alone (`heiman_keyfob`, `heiman_siren`, `presence_radar_aoyan_ay204t`,
`water_leak_aoyan_ay222z`, `siren_moes_mg_bjq002`). Do they share a trait that the accepted ones
(`water_leak_blitzwolf_bw_is9`, `sauna_thermostat_ae5503`) do not?

Verdict: **no content trait found. The evidence points at the payload driver count, not at the drivers.**
Nothing in their source is changed by this note, and no couple is touched.

## 1. Content-identical twins, opposite results (decisive)

`water_leak_aoyan_ay222z` (refused alone, 9.0.1616) and `water_leak_blitzwolf_bw_is9` (accepted alone,
9.0.1620) are the same driver apart from ids and names:

- `driver.compose.json`: only `id`, `name.*`, `zigbee.manufacturerName`, `zigbee.productId` and the two
  image paths differ (`AOYAN`/`AOYAN  ` x `AY222Z` vs `_TZ3000_eit7p838 ` + case forms x `TS0207`).
  Class, capabilities, capabilitiesOptions, 11 settings, energy batteries, learnmode, endpoints and pair
  views are byte-identical.
- `assets/images/large.png`, `small.png`, `icon.svg`, `learnmode.svg`: same md5.
- `pair/select_driver.html`, `pair/select-driver.html`, `driver.flow.compose.json`: identical.
- `device.js` / `driver.js`: identical apart from the class name and a source comment.

If a field, an asset, a pair view or a flow card were the trigger, both would fail or both would pass.

## 2. Payload driver count of every recorded upload since the 21/10 incident

Sources: `publish-size-telemetry-<run>` artifacts (`current.json`, field `drivers`) for runs from
9.0.1610 on, and the `drivers` field of `athom-publish-outcomes.jsonl` for 9.0.1596-9.0.1604.

| Version | Payload drivers | Released for the run | Athom result |
| --- | --- | --- | --- |
| 9.0.1596 / 1597 | 347 | none | processing_failed, stateMeta `socket hang up` (not AggregateError) |
| 9.0.1602 | 361 | 9+ never-published | AggregateError |
| 9.0.1603 | 353 | 6 never-published | AggregateError |
| 9.0.1604 | 347 | none | **Test** |
| 9.0.1610 | 349 | heiman_keyfob, heiman_siren | AggregateError |
| 9.0.1611 | 348 | heiman_keyfob | AggregateError |
| 9.0.1612 | 348 | heiman_siren | AggregateError |
| 9.0.1613 | 349 | presence_radar_aoyan_ay204t, water_leak_aoyan_ay222z | AggregateError |
| 9.0.1614 | 348 | presence_radar_aoyan_ay204t | AggregateError |
| 9.0.1615 | 347 | none | **Test** |
| 9.0.1616 | 348 | water_leak_aoyan_ay222z | AggregateError |
| 9.0.1617 | 350 | blitzwolf, sauna, siren_moes | AggregateError |
| 9.0.1618 | 348 | blitzwolf, sauna | AggregateError |
| 9.0.1620 | 347 | blitzwolf | **Test** |
| 9.0.1621 | 347 | sauna (blitzwolf held again by 1ccc123b7b) | **Test** |
| 9.0.1622 | 348 | siren_moes_mg_bjq002 | AggregateError |

- Every AggregateError in this period has a payload of 348 drivers or more (11 of 11).
- Every accepted build has exactly 347 (4 of 4). The two 347-driver failures are a different error
  (`socket hang up`).
- Correction (P3330, 15/11 evening): #3706 (9.0.1625, 347 drivers, nothing released) was refused with
  AggregateError right after #3705 (9.0.1624, 347) was accepted, with a near-identical package. 347 is
  the edge, not a guaranteed pass; 348+ is still 0 accepted. See athom-driver-ceiling.md.
- 9.0.1618 refused blitzwolf + sauna together (348); each was accepted alone at 347 (9.0.1620, 9.0.1621).
  That is a property of the set size, not of either driver.
- 9.0.1621 swapped one never-published driver for another at a constant 347 and passed, so a change
  in the driver set by itself is accepted.

This is the boundary measured in the current period, not an assumed constant: master shipped 446
drivers to Test on 2026-10-10 (ATHOM_NEW_DRIVER_REJECTION_2026-10-11.md), so the server-side limit, if
it is one, changed around the 21/10 incident or depends on something that grows with the driver count.
Athom does not document it and was not contacted.

## 3. Field-by-field comparison (source app.json, master dae8d0be77)

| driver | result alone | class | caps | capOpts | settings (energy_*) | driver flow cards | pair views | learnmode | batteries | names | mfr x pid | files |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| heiman_keyfob | refused (348) | other | 1 | 0 | 1 (0) | 0 | default | yes | CR2032 | en/fr/nl/de | 2x1 | 7 |
| heiman_siren | refused (348) | other | 2 | 1 | 1 (0) | 0 | default | yes | OTHER | en/fr/nl/de | 3x2 | 7 |
| presence_radar_aoyan_ay204t | refused (348) | sensor | 4 | 4 | 55 (0) | 0 | list>select_driver>add | yes | - | en/fr/nl/de | 1x1 | 9 |
| water_leak_aoyan_ay222z | refused (348) | sensor | 4 | 4 | 11 (0) | 0 | list>select_driver>add | yes | CR2032/CR2450/AAA | en/fr/nl/de | 2x1 | 10 |
| siren_moes_mg_bjq002 | refused (348) | other | 3 | 1 | 4 (0) | 0 | list>select_driver>add | yes | - | en/fr/nl/de | 2x1 | 10 |
| water_leak_blitzwolf_bw_is9 | accepted (347) | sensor | 4 | 4 | 11 (0) | 0 | list>select_driver>add | yes | CR2032/CR2450/AAA | en/fr/nl/de | 3x1 | 10 |
| sauna_thermostat_ae5503 | accepted (347) | thermostat | 4 | 2 | 7 (0) | 0 | default | yes | - | en/fr/nl/de | 2x1 | 8 |

No column separates the refused rows from the accepted rows. Also checked and not discriminating:

- Images: all PNG/SVG present at the declared paths; every one of the seven shares its large/small PNG
  bytes with drivers already in Test (e.g. siren_moes and heiman_siren share theirs with 66 drivers of
  the 9.0.1574 Test set).
- Couples: none of the seven has an exact or case-insensitive mfr+pid couple on another driver. Maker
  names that are not `_TZ*` (`HEIMAN`, `AOYAN`) exist on four refused drivers, but `siren_moes`
  (`_TZE20C_tjz9ad5g`|TS0601) is refused with a plain Tuya couple and `_TZE20C_*` makers already ship on
  garage_door_opener and wall_curtain_switch.
- Reserved `energy_` setting ids: none on any of the seven (renamed by dbabeadb35 before 9.0.1620).
- Ids: all lower snake case, < 41 chars.
- Staged build: the 9.0.1622 payload rebuilt locally (homey app build, sanitize, prepare-publish with
  `PUBLISH_HOLD_RELEASE=siren_moes_mg_bjq002`, prune, payload-preflight) has 348 drivers like the
  telemetry, every siren_moes file is present, and `homey app validate --level publish` on that exact
  directory passes (exit 0).

## 4. Consequence for the P3095 bisect

While the base payload sits at 347, any released never-published driver brings the upload to 348 and
gets refused, so the bisect splits every group down to single ids and records each one as "isolated".
The current group of six (353 drivers, run 43706691200) is expected to follow the same path. The five
"isolated" ids should be read as "refused at 348", not as defective drivers. Their hold entries stay as
they are (they keep the upload on the accepted set); no couple moves.

Ways forward, each needing a decision before any upload:
1. Release a held driver only together with an exact-couple fold that keeps the payload at 347
   (fold its couples into an existing published driver, as done for SPI and WHD02 in October).
2. A one-off diagnostic swap at a constant 347 (release one isolated id while another never-published
   id is held) would test the count reading directly; 9.0.1621 already did one such swap and passed.
3. Pause the bisect: further singles at 348 add no information.
