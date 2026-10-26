# Sweep safety net and Johan leads — 2026-10-19 (workstream B, P2870)

All text below is our own wording. Each item names the source (link + author), what it means
technically, and what we did with it. No third-party text or code was copied.

## 1. Why the sweep looked healthy but still missed things

The scheduled workflow `johan-thread-intel.yml` ran every day from 06/10 to 18/10 and moved each
forum topic by about 80 posts a day, so it was not stalled. Reading the scripts showed four gaps:

| Gap | Mechanism | Fix (scripts only; the workflow file is untouched) |
|---|---|---|
| Our own repo was never swept | `advance-sweep.js` only walked Johan's issue numbers | New `dlnraja` loop: issues + PRs + comments + PR review comments, `dlnraja-issue:N` items, own cursor `github.dlnraja.next`, 404 gaps (deleted numbers) are skipped instead of stopping the walk, stops only past the newest number |
| Bot threads counted as requests | bot-authored bodies (auto-replies, bot-opened issues) were classified like a human report | `isBotUser`: bot bodies and bot comments are ignored; a bot thread with no human comment becomes `no-action` |
| PR review comments ignored | only issue comments were read, Johan's "Batch NN" notes sometimes sit in review comments | Johan loop and `johan-canonical-index.js` now also read `pulls/<n>/comments` and `pulls/comments?since=` |
| A dropped socket ended a run silently | `res` "aborted"/"close" never settled the promise, the event loop drained, the process exited 0 with an empty summary (rounds 1 and 3 locally) | settle guards on `res`/`req`, 3 tries with backoff, a mid-chunk error still saves `sweptTo`, and a `beforeExit` guard that exits 3 if a chunk did not finish |

A second, context-aware pass now exists: `scripts/progress/resolve-needs-info.js`. For a forum item
left as needs-info it reads the 30 posts that follow and looks for the same author coming back with an
interview, a direct reply carrying an identity, a white-label model code that is already a productId,
and a maintainer answer. Nothing new means the item stays needs-info with `resolver.checkedAt`, so it is
not re-read every day. It stores no post text, only numbers, handles, ids and symptom labels.

## 2. Couples placed (single reliable source rule, exact mfr+pid, one driver each)

| Couple | Driver | Sources | Technical meaning |
|---|---|---|---|
| `_TYZB01_o7m83470`, `_TYZB01_0aps0h1r`, `_TYZB01_wpmo3ja3` + TS0212 | new `co_sensor_ias` | Johan #513 (zipkidje, Nedis ZBDCO11WT interview) and #977 (Maxjong30201, Alecto SMARTCOA10 interview), Batch 94 by Johan Bendz; SmartThings Edge fingerprints by Mariano Colmenarejo (zigbee-smoke-co-detector); Z2M #9291 (jimmyeao, Heiman HS1CA-M) | These CO alarms are plain ZCL IAS Zone devices (cluster 0x0500, zone type 0x002B). Our `co_sensor` is a Tuya EF00 driver keyed on TS0601, and adding TS0212 there would have created TS0601 duals with `smoke_sensor2`. A small dedicated driver reads the zone status bits natively (alarm1/alarm2 → `alarm_co`, tamper and low-battery optional) — purely additive |
| `_TZ3000_ee8nrt2l` + TS0044 | `scene_switch_4` | ZHA PR #1378 (aecay, 0xE000 on EP2-4); deCONZ TS0044 DDF and issue #5836; SmartThings erickvneri (LoraTap 4 buttons); Johan #1159 (MagicSergio91) and #941 | The id sat only on `button_wireless_2`, which has no TS0044, so the real remote matched nothing |
| `_TZ3000_5ftkaulg` + TS0011 | `switch_1gang` | ZHA #2090 (amiraizat124); homed-service-zigbee #146/#150 (yaadyaad); Z2M #21241 (lysiong, Smatrul); Johan #1178 (jautin981, Chevolink) | A no-neutral 1-gang switch. The id was on `climate_sensor` without any source; it moved with a curated removal and a `dual-couple-legacy` entry so paired devices keep their driver |
| `_TZ3000_dfgbtub0` + TS0042 | `wall_remote_2_gang` | Z2M #33266 (nesty1990); forum 26439#5021 (SunBeech, MOES 2-button, same id as Marmitek) | Removed from `button_wireless_2` by the anti-cartesian pass d09e9531cf; putting it back there would re-create `dfgbtub0|TS0215A` with `button_wireless_4`, so it lives on the 2-gang remote (TS0042 only, zero overlap). TS0044 stays on `button_wireless_4` |
| `_TZ3210_ejctepku` + TS0505B | `light_rgbcct_ts0505b` | Johan #665 (Basb1234, Homey interview: GU10 RGB+CCT) | The id was only on `wall_dimmer_tuya` through the synthetic `TS0601_dim1` pid, so a real TS0505B bulb paired as generic. The dedicated TS0505B driver has a single pid, so no new dual |
| `_TZ3210_invesber` + TS0502B | `light_cct_ts0502b` | Johan #824 (Eastmasters, Homey interview: CCT strip driver, EP1 with 0x0300 + 0xEF00, Green Power EP242) | Same pattern; the `dimmable_led_strip` copy had been removed by the anti-cartesian pass. Native colour-temperature control first, EF00 stays optional |

Hint maps (`lib/tuya/fingerprints.json`, shards, `data/mfs_db.json`) and `couple-driver-pins.json`
were updated with the source of each couple. Test: `test/critical/p2870-wsb-couples-and-sweep.test.js`.

## 3. Items closed without a code change

- Johan #423 / #424 (`_TZ3000_rco1yzb1`/TS004F; RogerGorissen, fransjvos): already handled by P2798
  (single presses from on/off commands, opt-in `click_window_ms`). Only a physical acceptance test is
  left. Lead: the interview shows one endpoint, yet the couple sits on the 4-button driver; moving it
  would break paired devices, so it stays a lead.
- Johan #521 (mchieppa): `_TZ2300_gjnozsaz` is a typo of `_TZ3000_gjnozsaz`, already on `smartplug`.
- dlnraja #114 / #124 (Lalla80111): the TS0041 pairing was a parser artefact; `_TZ3000_fllyghyj` is the
  temperature sensor (on `climate_sensor`, both case variants), `_TZ3000_b4awzgct`/TS0041 is on
  `button_wireless_1`. The case issue was fixed long ago (normalisation at read time).
- dlnraja #132 / #138 / #139 / #140: placeholder ids (`xxxxxxxx`) in bot-opened threads → no-action.
- Forum 26439#5430 (Pieter_Pessers): "TS002/TS003" is shorthand for TS0002/TS0003; both couples are
  already on `wall_switch_2gang_1way` / `switch_3gang`.
- Forum 140352#694, #1521, #2050 (our own lists) and #1567 (Peter_van_Werkhoven): the sweep paired
  every id with every pid in the post. Each id is on its driver with its real pid.

## 4. Leads kept (not applied)

- `_TZ3000_amal63is` TS0002 (Johan #128 / #991): retail label only, no interview.
- `_TZB210_rkgngb5o`: the reported "EP1" is an endpoint, not a productId.
- Johan #451 (MarcoBannink): the OCR guess `_TZ3000_pmz6miyu` has no hit anywhere → needs an interview.

## 5. Pruning proposal (prepared, not applied)

Rule reminder: phantom duals stay until a user reports a conflict.

- Current count (case-insensitive compose, `universal_zigbee` excluded): 698 dual keys. Biggest driver
  pairs: bulb_dimmable+dimmer_wall_1gang 72, water_leak_sensor+water_leak_sensor_tuya 48,
  dimmer_1_gang_tuya+dimmer_wall_1gang 44, contact_sensor+sensor_contact_zigbee 42,
  curtain_motor+switch_1gang+switch_3gang 42, climate_sensor+presence_sensor_radar 38,
  button_wireless_2+plug 36.
- TS011F on `button_wireless_2` vs plug drivers: 7 keys (cymsnfvf, ew31dmgx, hyfvrar3, kdi2o9m6,
  plyvnuf5, upjrsxh1 vs `plug`; wzauvbcs vs `socket_power_strip`), all from the bulk import 7b64ef71f1.
  These ids are plug ids in Z2M; `button_wireless_2` carries 90+ unrelated pids (plugs, bulbs, Sonoff).
  Proposal: when a user reports one, curated removal from `button_wireless_2` + legacy entry resolving
  to the plug driver.
- `_TZ3000_skueekg3`: only on `switch_1gang`, plus one dual `|TS000F` with `switch_module_whd02`.
  No interview upstream (Johan #963 is request-only) → keep.
- `_TZ3210_jtifm80b`: TS0502B is on `light_cct_ts0502b` only; the other pids sit on `tunable_bulb_E14`
  with no overlap → nothing to prune.
- `_TZE600_ogyg1y6b` + TS0105: pinned on `curtain_motor`, no dual → nothing to prune.
