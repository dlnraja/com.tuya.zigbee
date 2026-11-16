# Upstream daily 2026-11-16 (P3343)

Incremental pull since 2026-11-15. Facts only, rewritten in our own words, each with its source.

## Placed on master (exact couples, one owner each, pinned in publish-sacred-keep-couples.json)

| couple | driver | source |
|---|---|---|
| `_TZE28C1000000_gxbdnfrh` / TS0601 | switch_wall_6gang | Koenkk/zigbee-herdsman-converters f368dcd `src/devices/tuya.ts` Nova Digital SA-6 whitelabel (#13815), sibling `_TZE204_gxbdnfrh` |
| `_TZE28C1000000_uqfph8ah` / TS0601 | curtain_motor | same repo `src/devices/bseed.ts` BSEED_TS0601_cover (#13822), siblings `_TZE200_yenbr4om`, `_TZE204_bdblidq3` |
| `_TZE28C1000000_ntqql63p` / TS0601 | presence_sensor_radar | same repo `src/devices/girier.ts` TS0601_GIRIER ceiling presence (#13824): DP1 presence enum 0 absence / 1 presence / 2 sensor_close, presence_delay 0–1800 s, detection_distance 0–7 m step 0.7 |
| `_TZ3002_wowrpxxu` / TS0726 | switch_1gang | same repo `src/devices/tuya.ts` TS0726_1_gang, sibling `_TZ3000_ovbvmhiq` (lead from 2026-11-15) |
| `_TZB210_azjhlyvy` / TS0505B | light_bulb_rgb_rgbw | same repo `src/devices/tuya.ts` TS0505B_2 / MiBoxer FUTC04ZR, sibling `_TZ3210_it1u8ahz` (lead from 2026-11-15) |

Lesson: Tuya now ships 13-character prefixes such as `_TZE28C1000000_`; they are plain manufacturer names and must be matched exactly like `_TZE284_` (master already had 32 such couples).

## Leads (not placed, need verification)

- `_TYST12_snr3p274` / TY0A01: Intelbras IFR 7001 mortise lock (zhc `intelbras.ts`, #13801), DP1 fingerprint / DP2 pin / DP41 remote unlock actions; no lock driver fits yet.
- Still open from 2026-11-15: `_TZE204_bb5xlia1` (SA-WK 4X4 6-way), `_TZE284_lqhqj73n` (outdoor blind), `_TZE284_pfbtmgo1` (Nous E13 water leak), wrong-class suspects `_TZE284_1di7ujzp` and `_TZ3002_l8bfzlcd` (TS0726 1-gang currently in switch_4gang).
- Hubitat kkossev Tuya Zigbee Valve 1.8.2 (44edbe5): SONOFF SWV-ZFU duration/volume byte order fix (non-Tuya, note only).
- ioBroker zigbee 3f59826: TY0201 battery no longer forced to voltage-derived percentage (their converter); our TY0201 drivers keep both paths optional.
- tuya-local 4a42384 / e09596b: EKAZA EKAV-T229Z lock and MG2-6HW mmWave radar (Wi-Fi matrix only).

## Pointers

zhc afdaa02→f368dcd (26.132.0), tuya-local b0c36ae→8d6f4ca, zigbee-OTA cd50484→45cd873, Hubitat 77f95e8→44edbe5, ioBroker b845c9c→56028ba, tinytuya c0eb2ee→b0482da (v1.21.1), Tasmota 0cdf7e1→3ed67aa, z2m site d62e24d03→c5763c305. Unchanged: herdsman 199c2f2, ZHA b07fa76, deCONZ c24e81c, SmartThings 30decd1, zigbee-clusters 2add8be, Domoticz 423e155, Johan 328d24e, localtuya 59c95cd, Blakadder d96e8aa.
