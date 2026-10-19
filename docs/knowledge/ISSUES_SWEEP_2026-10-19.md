# Issues sweep 2026-10-19 (workstream C2)

Scope: every open issue of dlnraja/com.tuya.zigbee (#571, #570, #560, #559, #557, #550), the recent closed ones (cross-checked for regressions), the Homey diagnostic mails since 17/10, and the forum items collected on 18/10. Nothing was posted, closed or mailed.

| Issue | Who | Couple / symptom | State |
|---|---|---|---|
| #571 | denis-papin | QT-07S `_TZE284_myd45weu` + TS0601 pairs as unknown, Configure spinner | couple is on `soil_sensor` on all three trees; the junk productIds that were pruned in P2814 and the settings ready-fallback are published; waiting for a retest on a build >= 9.0.1450 |
| #570 | edwinvdp | AOYAN AY-303Z (plain and two-space padded name) unknown + spinner | same as #571; both name forms and `AY-303Z` are on `soil_sensor` everywhere |
| #560 | artisare | TRV06 `_TZE200_rxq4iti9` + TS0601: no battery, phantom humidity, values only on device report | DP35 bit0 -> `alarm_battery` and humidity strip were on master only; ported to stable-v5 and bastien-home. Two shared root causes found and fixed (below) |
| #559 | Lalla80111 | `_TZ3210_w0qqde0g` + TS011F plug, no energy | already claimed by `plug_energy_monitor` on all trees (interview: clusters 0x0702/0x0B04, reporting configured, app version 83) - nothing to change |
| #557 | bot | daily digest | informational |
| #550 | HiepSVG | `_TZE204_gkfbdvyx` radar: lag, ghost alarms, "card unavailable" flicker | P2749/P2765/P2796 and the availability flicker guard are on all three trees; open only for the reporter's retest |
| #554 (closed) | draqlek | TS0046 `_TZ3000_iszegwpd` six-button remote refuses pairing | master and stable had the 4-endpoint fix; **bastien-home did not** -> ported |

## Root causes found while reading the #560 diagnostic

1. **`tuya.dataQuery` never worked with an argument.** The command has no payload, but `TuyaEF00Manager.requestDP`, `BaseUnifiedDevice` (initial read), `TuyaUnifiedDevice` (wake) and `UnifiedSensorBase` (wake) call it with `{seq}` / `{dp}`. zigbee-clusters answers `unexpected property`, so the log line `[DATA-QUERY] Completed: 0/12 queries sent` is every Tuya DP device at init. Fix P2867: the cluster now always sends the empty query-all frame (cmd 0x03), fire-and-forget, and `requestDP` sends one query-all per init burst instead of twelve failing calls. Source for the frame: Tuya Zigbee DP protocol (0x03 = gateway asks the device to report all DPs), same command exposed by Zigbee2MQTT / deCONZ.
2. **`tuya.datapoint({dp, datatype, data})` without status/transid/length.** About 50 call sites (DP36 time sync on TRVs, LCD sensors, purifiers, heaters, the IR blaster) built that bare shape. It does not throw; it writes length 0 next to the payload, a frame the MCU ignores. Fix P2866: the cluster fills only the missing fields; fully specified calls stay byte-identical.
3. **Radiator valve declared `onEndDeviceAnnounce()` twice.** The later one silently won, so the P2598 "re-query DPs when the sleepy valve wakes" path was dead code. Fix P2865: one method, both duties, plus a regression test.

## Kept as is (needs a decision)

- `_TZE284_9ern5sfh` (Kizabgd, 140352 #2263): master homes it on `lcdtemphumidsensor` (P2823); stable-v5 and bastien-home still list it on `climate_sensor`. The couple is claimed on every tree, so pairing works; moving it is a curated relocation, not applied here.
- `_TZ3000_abrsvsou` + TS004F stays on `button_wireless_4` (SSOT); Z2M lists it as an ERS-10TZBVK-AA knob.

## Checks

- Every manufacturer name cited in the last 80 closed issues exists on a driver in master, stable-v5 and bastien-home.
- The 15 reporter couples above each have exactly one owner per tree (one gap: #554 on bastien-home, fixed).
- Credits: artisare (#560), denis-papin (#571), edwinvdp (#570), Lalla80111 (#559), HiepSVG (#550), draqlek (#554), Wilhelm Dall (bjawzodf diag), Koen Kanters / Z2M contributors, ZHA quirk authors (ZHA#2034).
