# Athom driver-count ceiling and the AggregateError (P3330, 15/11/2026 Paris)

User request (15/11/2026 22:46 Paris): fix the AggregateErrors and the problem of apps above ~345 drivers.
Athom shows 345 for master because 2 of the 347 uploaded drivers are `deprecated: true`.

## Verdict

1. **348 or more uploaded drivers: refused every time.** 12 of 12 master uploads with 348-361 drivers since
   the 21/10/2026 incident ended `processing_failed` / `AggregateError`, including single never-published
   drivers that are byte-identical to drivers accepted alone at 347 (see aggregateerror-isolated-drivers.md).
   An upload above the ceiling can no longer reach Athom: the pre-upload guard blocks it (below).
2. **347 is the edge, not a safe zone.** 347-driver uploads reached Test 6 times (#3682, #3686, #3697, #3701,
   #3702, #3705), but #3706 (v9.0.1625, 347 drivers, no released driver) was refused with AggregateError 45
   minutes after #3705 was accepted. The exact package manifests (sha256 per file, publish-size-telemetry
   artifacts of runs 43743590036 and 43747298371) differ only in:
   version strings (app.json same size, package.json, package-lock), `.homeychangelog.json` (+64 bytes),
   two status JSON files, and two JS files (`lib/buttons/attachButtonPaths.js` +2.1 KB,
   `lib/mixins/PhysicalButtonMixin.js` +0.5 KB; P3318). Same 347 drivers, same 4019 files, same 4599 flow
   cards, archive 9.217 MB vs 9.218 MB gz. A content defect cannot explain an accept/refuse flip on that
   diff; the earlier same-content flips (9.0.1424 refused / 9.0.1425 accepted, 9.0.1426 / 9.0.1427) say the
   same. Reading: Athom's processing fails (AggregateError = several parallel steps failing) with a
   probability that reaches 100 % at 348 drivers and is non-zero at 347.
3. **The swap diagnostic** (one never-published driver in, one published driver out, constant 347):
   #3704 (9.0.1623) socket hang up (transport, no verdict); run 43755979140 (21:04 Paris) never uploaded:
   it was dispatched with `transient_retry=1`, which the breaker reads as an automatic chain retry, so the
   open breaker (#3706 AggregateError) skipped it as designed. Rerun 43765938048 (22:50 Paris, manual intent,
   `transient_retry` default): **#3707 (v9.0.1626, 347 drivers, siren in / sound_sensor_tuya out) refused with
   AggregateError** about 30 s after creation. Two consecutive refusals at 347 (#3706 with no new driver,
   #3707 with the swap) mean siren_moes_mg_bjq002 is not the culprit and that 347 no longer passes
   reliably either.
   Content check of siren_moes_mg_bjq002 vs sound_sensor_tuya (the swapped pair): class other vs sensor,
   3 vs 2 capabilities, 4 vs 6 settings, list_devices>select_driver>add_devices pair views, no driver flow
   cards, no energy block. Every one of these traits is also on water_leak_blitzwolf_bw_is9 or
   sauna_thermostat_ae5503, which reached Test (9.0.1620/1621), and the 348+ refusals spread over 7
   unrelated drivers (aggregateerror-isolated-drivers.md, section 3). #3706 failed with no siren at all.
   No driver trait explains the refusals, so no per-trait gate is added (it would block nothing real).
4. **What still discriminates.** The same evening stable was accepted (#427, v5.12.551) with 342 drivers,
   a 2.85 MB app.json and 4091 flow cards; master is refused at 347 drivers, 3.36 MB and 4599 flow cards
   (archive 8.8-9.2 MB gz, smaller than stable's 10.8 MB, so archive size is not it). Driver count, flow
   card count and manifest size all move together and cannot be separated without more uploads.
   Master shipped 446 drivers on 2026-10-10, so the threshold appeared with the 21/10 Athom incident.

Not contacted: Athom (support ticket 157057 about a driver limit is still open, no answer).

## What is enforced now

- **Ceiling guard** (`.github/scripts/pre-upload-completeness-guard.js`, byte-identical on the three
  branches, run on the exact upload directory by every publish path): ceiling 347 drivers for
  `com.dlnraja.tuya.zigbee` and `com.dlnraja.tuya.zigbee.stable`; no ceiling for bastien (27 drivers).
  Above it the upload is blocked, never retried. `ATHOM_MAX_UPLOAD_DRIVERS` can only lower a ceiling.
  Raising it needs a reviewed commit that cites a new accepted build with more drivers.
  Note: this also blocks the `diagnostic_catalogue` dispatch (351+ drivers) on purpose.
- **Held-driver folds** (`lib/drivers/held-driver-folds.json`, SSOT): a never-published driver stays held
  (no new driver id), and its exact couples are appended to the PAYLOAD entry of a published driver of the
  same class whose capabilities cover it; the target's `onMapDeviceClass` runs the held driver's own device
  class (moved to `lib/devices/held/`, the held `device.js` re-exports it). prepare-publish fails closed if
  a fold would create a couple owned by another payload driver (including P3024b re-pins of the last Test
  package), if the target already lists one of the makers (a paired device would change class), or on a
  class mismatch. Source composes are unchanged, so the duplicate-couple gates still see one owner.

## Fold result (15/11/2026)

| Held driver | Into (published) | Exact couples | Status |
| --- | --- | --- | --- |
| wall_switch_rf_ews1154z | wall_switch_1gang_1way | 4 (`_TZE200_yp5tsi3y` x TS0601, 4 spellings) | folded: payload 347, validate publish OK |
| co_sensor_dcr_co | co_sensor | 8 | not folded: `_TZE200_7bztmfm1`/`_TZE204_7bztmfm1` x TS0601 already ship on smart_air_detection_box / device_air_purifier_plug (P3024b pins of Test 9.0.1574) |
| motion_sensor_excellux_zg104plv | motion_sensor_2 | 2 | not folded: `PIRIV01` x Excellux/TS0601 already ship on motion_sensor_switch (P3024b pins) |

The two "not folded" ones are paired today by another driver. Moving them would be a couple move, so it
needs a sourced verdict through scripts/maintenance/couple-removal-evidence.js. Nothing was moved.

Still held, no published driver fits without a collision or a capability loss: heiman_keyfob,
heiman_siren, presence_radar_aoyan_ay204t, water_leak_aoyan_ay222z, water_leak_blitzwolf_bw_is9 (their
padded makers collide by cartesian expansion with soil_sensor / water_leak_sensor_tuya; that is why P2958
gave them dedicated ids), switch_2gang_ts0002 (would add `_TZ3000_amal63is|TS0012`, owned by
switch_1gang), siren_moes_mg_bjq002, switch_wall_6gang_metering, valve_novato_zpv01,
energy_meter_3ch_bidirectional, gpo_double_light_mg_au03, gpo_double_mg_gpo02z, keypad_alarm_wke502z,
thermostat_vrf_bvrf_l001, ufh_controller_ch8z, ufh_controller_pro_line_x10, curtain_sonoff_mini_zbrbs,
air_conditioner_aetz01, fan_light_tuya_5_levels, smoke_sensor_ts0601_dp, vibration_sensor_excellux_zg103v,
co_sensor_dcr_co, motion_sensor_excellux_zg104plv. The three continuations (climate_sensor_2,
curtain_motor_2, contact_sensor_2) already ship inside their roots (P3229).

## Other apps

- stable (`com.dlnraja.tuya.zigbee.stable`): 445 source drivers, uploads 342 (Test #427, v5.12.551); never
  uploaded more than 342 in the recorded history, so the same 347 cap is applied as a safety bound.
- bastien (`com.dlnraja.tuya.zigbee.bastien`): 27 drivers, far below; no ceiling.

## Next levers (not applied)

- Shrink the master manifest toward stable's accepted size (flow cards are ~55 % of app.json: hints and
  token examples, P3065) and test with ONE user-approved upload; the breaker is open after #3706/#3707,
  so pushes do not publish until a manual dispatch passes.

- Get master below 347 with margin. Only possible without orphaning users by retiring published ids that
  no device uses; that needs Athom-side install data per driver, which this repo does not have.
- Re-home the 7bztmfm1 / PIRIV01 couples on their dedicated-profile classes through a sourced couple move.
- Earlier proposal on branch `arch/fit-347` (P3264, 03/11, not merged): host held profiles in dormant
  published ids. Needs the user's decision because it reuses published ids.

## Why "345" is the same limit as 347 shipped (16/11/2026)

The owner asked to fix "apps above 345" and to fit everything in 345. Measured on the master payload
(`prepare-publish` on 15f8ae52fe) and on Athom's public API (`apps-api.athom.com/api/v1/app/<id>`, no auth):

| | shipped drivers | visible on the API | flow cards (T/C/A) | app.json |
|---|---|---|---|---|
| Test #3705 v9.0.1624 (accepted) | 347 | 345 | 2790 / 555 / 1254 | 3.36 MB |
| master payload now | 347 | (same set) | 2790 / 555 / 1254 | 3.34 MB |

- The 2 drivers the API does not list are `air_purifier_siren` and `sensor_lcdtemphumidsensor_temphumidsensor`
  (`deprecated: true`, so Athom hides them). "345" is therefore the visible count of the 347 shipped drivers.
- Every one of the 347 payload ids is in accepted Test #3705 (346 are also in the 9.0.1574 fixture;
  `sauna_thermostat_ae5503` graduated later). Shipping 345 would mean dropping 2 published ids. Homey binds a
  paired device to its driver id, so a dropped id leaves those devices without a driver; no thin alias exists.
  The ceiling therefore stays at 347 and is NOT lowered: a 345 ceiling would block every master upload.
- App.json dedup: locale copies identical to English are already stripped (3 left in 16045 strings). The 28 flow
  cards whose bodies repeat another card have their own ids, which saved user flows reference, so removing them
  is not behaviour-preserving. No safe dedup is left inside app.json; reducing size means removing content.

### Held drivers vs the payload (exact caseless mfr x pid against the 347 payload)

Hosting (P3264, `origin/arch/fit-347`) keeps the count at 347 and does not remove ids. Couples free on the payload:

- Free, could be hosted (no couple already shipped elsewhere): heiman_siren, presence_radar_aoyan_ay204t,
  water_leak_blitzwolf_bw_is9, water_leak_aoyan_ay222z, siren_moes_mg_bjq002, switch_wall_6gang_metering,
  valve_novato_zpv01, switch_2gang_ts0002, energy_meter_3ch_bidirectional, gpo_double_light_mg_au03,
  gpo_double_mg_gpo02z, keypad_alarm_wke502z, thermostat_vrf_bvrf_l001, ufh_controller_ch8z,
  ufh_controller_pro_line_x10, curtain_sonoff_mini_zbrbs, air_conditioner_aetz01, smoke_sensor_ts0601_dp (3 of 8 makers).
- Already shipped on another driver (one couple, one driver; moving needs removal evidence and a user decision):
  heiman_keyfob (button_emergency_sos), wall_switch_rf_ews1154z (folded, P3330), co_sensor_dcr_co
  (smart_air_detection_box, device_air_purifier_plug), fan_light_tuya_5_levels (humidifier),
  motion_sensor_excellux_zg104plv and vibration_sensor_excellux_zg103v (motion_sensor_switch).
- Continuations climate_sensor_2, curtain_motor_2, contact_sensor_2 are already folded at publish (P3229).

P3264 limits that block "behaviour preserved": a hosted device pairs under the host's name and class
(`device_generic_tuya` is class `other`), and flow cards only the held driver has are not shipped. Hosting is a
user decision, and it does not change the count, so it does not answer a 347 refusal either.
