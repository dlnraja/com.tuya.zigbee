# Stable-v5 Node 22 test audit — 2026-10-11 (Paris)

Ledger for the 29 red files of the Node 22 run on `stable-v5`. Rule followed: a lost
feature is restored from git history (master or older stable), additively; a test is
aligned only when the stable code is a verified later evolution of the same fix. No test
was skipped or disabled. Exact `mfr+pid` couples only — no id was invented.

## Features restored on stable

| Area | What came back | Lost in | Source of the restore |
|---|---|---|---|
| Radar lux inference (GH#550) | absolute-step lux movement + P2597 soft present + P2600 lux-cadence vitality | never ported to stable | master `IntelligentPresenceInference` |
| Radar zero-distance clear (P2640) | only clear on 0 m once tracking ranged >0.3 m | `ec5de218b6` dropped the gate | master `presence_sensor_radar/device.js` |
| IR blaster heobian forms (P2671) | `heobian`, `Heobian` on `ir_blaster` | bot `auto-fix-all` `bcf4759be6` | P2671 commit `a1d180a2bf` |
| mfs_db HOBEIAN keys | `HOBEIAN`, `hobeian`, `heobian` entries | P52 master→stable sync `6ef62b8650` | stable `87f70d895c` |
| Remote mfs prune (P2613) | 133 remote-fleet mfs entries re-pruned to their P2613 pid lists (+ any `TS*` pid seen since) | `auto-sync` refill | stable `6f638adedb` |
| Gas sensor vrcfo4i0 (P2759) | `_TZE200_vrcfo4i0` off `contact_sensor` (TS0601 gas only; no contact pid fits) | bot `auto-fix-all` `0da3820a36` | stable `ba771ee90c` |
| TRV p3dbf6qs pin (P2686) | `_tze200_P3DBF6QS` case form front-pinned on `radiator_valve` | — | master compose |
| Button 3 learnmode | instruction names this app (Tuya Unified (Stable)) | `29027508ee` | stable `6b42b2f2a1` |
| Cluster lexicon | `IAS_WD` 0x0502, `EWELINK_FC11` 0xFC11 (climate_sensor compose uses 64529) | never ported | master `ZclClusterLexicon` |
| Boot hardening (P2676) | `ZigBeeDriverFlowCardPatch` require wrapped in try/catch | never ported | master `app.js` |
| Tuya hub bridge (P2656/P2660) | control-path doctrine, cid normalising, gwID options | never ported | master `TuyaZigbeeBridge` |
| Forfait gate (P2542) | `GMAIL_DIAG_AI_MAX: '0'` on `draft-to-test-fleet.yml` | — | gate rule |
| Flow id cache | declared flow ids cached per Homey instance, never an empty set | latent bug (order-dependent) | new, small |

## Tests aligned to evolved stable code

P2333 (cap-aware arms), P2379 (P2603 onoff via profile), P2537/P2458 (SSOT patch id
re-stamped), P2548 (P2555 message), P2600/P2617 (ceiling block grew, P2715 dual-scale DP9),
P2640 (P2749 gated distance), P2689 (tip 9.0.1196), P2707/P2708 (P2734 soft pulse),
P2681/P2693 (P2714/P2742 debounce 25 ms ≤ old 80 ms cap), P2381 (P2461 removed the
driverScoped probe on purpose), P2550 (P2555 recycle tag), P2432 (P2541 moved mja3fuja to
`air_quality_co2`), P2545i (P2611 track-adaptive runner), P2696 (per-app publish groups
since 2026-10-03), P2606 (promote workflow lives on master only), P2686/P2759 (one owner per
exact couple — no duplicate in a second driver), P2533 (P2605 `_TZE200_nkjintbl` on
`switch_2gang`, taken from master).

## Watch items

- The `auto-fix-all` bot and the P52 master→stable sync both stripped curated entries
  (heobian, vrcfo4i0, HOBEIAN keys, P2613 prune). They can do it again.
- `publish-sacred-keep-couples.json` pins `_TZE204_p3dbf6qs` to `radiator_valve`, but stable
  compose has it on `device_radiator_valve` only. Not changed here; needs a decision.

Credits: original fixes by the project history named above; Z2M/ZHA device data for the
couples involved (Koenkk/zigbee-herdsman-converters, zigpy/zha-device-handlers).

## Port to bastien-home (same day)

Already present on bastien: lux inference, P2640 gate, heobian forms, HOBEIAN mfs keys,
vrcfo4i0 placement, p3dbf6qs pin, P2676 boot guard, IAS_WD. Ported: `EWELINK_FC11` lexicon,
P2656 bridge doctrine, per-Homey flow-id cache, P2613 re-prune (3 entries), button 3
learnmode naming this app (Zigbee Bastien), track-adaptive critical runner, P2381 test align.
