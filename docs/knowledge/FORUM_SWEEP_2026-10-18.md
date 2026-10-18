# Forum sweep 2026-10-18 (workstream C, read-only)

Scope: Homey Community topics 140352 (Universal Tuya), 26439 (Johan Bendz Tuya Zigbee), 101901 (Unknown Zigbee device),
154077 (Tuya Local), 156 (Aqara & Xiaomi), 160624 (Switcher), 89931 (Button+), 4539, tags `app` / `zigbee`, plus a
search for our app name. Posts and screenshots were read in full (screenshots OCR'd by eye, ids re-typed from the
Developer Tools images). Nothing was posted. Couples are cited by exact manufacturerName + productId; every one
below already exists in `app.json` on its driver, one couple one driver.

Tip of each topic at scan time (Paris 18/10 23:20): 140352 highest post 2263 (15/10), 26439 post 5537 (18/10),
101901 post 8 (10/10), 154077 post 525 (12/10), 160624 post 1 (10/10).

## Reports and where they stand

| Post | Author | Couple / symptom | Source check | Result |
|------|--------|------------------|--------------|--------|
| 140352 #2259-#2260 | Peter_van_Werkhoven | app crash, then "working fine again" 11/10 | diag c05db40d, PETER_C05DB40D_OOM_2026-10-11.md | closed by the OOM work |
| 140352 #2261 | marosk | `_TZE200_fl8cuafl` + TS0601, ANTIK ATK-TRV02 TRV paired as virtual socket | exact couple from his Developer Tools card | `device_radiator_valve` (P2813, P2818) |
| 140352 #2262 | Istvan_Mag | `_TZE284_gnpflcoq` + TS0601, "4 in 1" motion/lux/temp/humidity | Z2M `TS0601_TZE284_gnpflcoq`, ZHA#5286 corrected DPs (DP1 inverted enum, DP9 sensitivity, DP12 hold time, DP102 = temp offset) | `motion_sensor_radar_mmwave` (P2818, P2824) |
| 140352 #2263 | Kizabgd | `_TZE284_9ern5sfh` + TS0601 LCD temp/humidity, "Unknown device" | interview screenshot confirms the id; Johan-thread post typed `9em5sfh` (a mistype, never added) | `lcdtemphumidsensor` (P2823, P2826); re-pair on a current build |
| 26439 #5535 | Kizabgd | same LCD sensor, mistyped id | see above | no new id invented (registry `p2828-ocr-9em5sfh-not-invent`) |
| 26439 #5534 | Dragan_Todorovic | `_TZE200_crq3r3la` radar, no settings as generic device | exact couple on `presence_sensor_radar` | settings exist once paired to our driver (P2827) |
| 26439 #5532-#5537 | Mates1134, Cam | `_TZ3000_qja6nq5z` + TS004F smart knob regressed in Johan's app (extra presses, dial dead) | our couple sits on `smart_knob_rotary` (Z2M ERS-10TZBVK-AA) | not our app; our rotary path unchanged, watch only |
| 101901 #6-#8 | Steve_Wilson | `_TZE284_vuwtqx0t` + TS0601, Zemismart 214C water valve, Unknown | interview in post 8; Z2M `TS0601_water_valve` (TZE284 + TZE200), Zemismart ZHA quirk 214c.py | routed to `water_valve_smart` (P2837) but its DP map was wrong: fixed in P2864, see below |
| 4539 #41-#48 | Kizabgd, SunBeech | knob `_TZ3000_abrsvsou` paired through Johan's app | our SSOT keeps this couple on `button_wireless_4` (4-endpoint scene) | open decision, below |
| 154077 #474-#525 | Andi, Dietrich_Kassner, others | Tuya Local app (other developer): presence mode DP 51 picker, curtain position, plug DP | n/a | ideas only: a device-mode picker for local presence sensors (DP 51 auto/manual) is a candidate for our local-Tuya feature; Dietrich notes the device also raises DP 20 when switched to manual |
| 160624 #1 | iBush | Switcher rewrite announcement | n/a | covered by the Switcher promotion already done |
| 156, 89931, 161050, 154959, 150654 | various | other apps, Duepi pellet stove, SHS/Bridge Zigbee route storms | n/a | nothing for our drivers |

## P2864 - Zemismart 214C DP map (Steve_Wilson, 101901 #8)

Problem: `_TZE284_vuwtqx0t` / `_TZE200_vuwtqx0t` landed on the generic metered map of `water_valve_smart`.
Zigbee2MQTT (`TS0601_water_valve`, written by Kigrou's work in zigbee-herdsman-converters#10636) and the Zemismart
ZHA quirk agree that on this meter DP1 is the cumulative water total, the valve is DP13, auto clean is DP14, flow is
DP21, temperature is DP22 / 100 and the cell voltage is DP26. We read DP1 as on/off (so the valve tile flipped with the
meter reading) and wrote the valve command to DP1 (read-only). Fix: a `isZemismart214c` branch with the map above,
valve TX on DP13, pure-Tuya path forced like the FrankEver valves. Other valve families keep their maps.
Battery percentage from DP26 is a linear 2.8-3.4 V heuristic (no source gives a curve); report period (DP4), fault
bitmask (DP5), month/day totals (DP2/3), meter id (DP16) and reverse flow (DP18) are kept internal.

Credits: Steve_Wilson (interview, topic 101901 post 8); Z2M maintainers and Kigrou (TS0601_water_valve definition);
Zemismart (214c.py). Written in our own words from the DP tables; no code copied.

## Open

- `_TZ3000_abrsvsou` + TS004F: Z2M lists it under ERS-10TZBVK-AA (smart knob) while our SSOT keeps it on the 4-endpoint
  scene driver. A user reports the knob works as "Smart Knob" in Johan's app. Needs a decision, not changed here.
- Local presence-sensor mode picker (DP 51) idea from topic 154077.
- Reply drafts for the forum are kept in the executor report only (never posted).
