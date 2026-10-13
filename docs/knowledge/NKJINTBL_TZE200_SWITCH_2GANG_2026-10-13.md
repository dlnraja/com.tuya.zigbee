# `_TZE200_nkjintbl` + `TS0601` → `switch_2gang`

Date: 2026-10-13 (Europe/Paris). Registry case: `p2605-nkjintbl-tze200-not-switch2gang-not-btn-plug` (legacy id; canonical owner is `switch_2gang`).

## What the device is

Exact couple `_TZE200_nkjintbl`|`TS0601` is a mains Tuya EF00 **2-gang wall switch** (DP1 / DP2 boolean on/off). It is not an energy plug and not a wireless button.

Sibling OEM `_TZE204_nkjintbl`|`TS0601` is a different device and stays on `button_wireless_plug` only. `_TZE284_nkjintbl` has no verified interview — forbidden until evidence exists (registry `p2605b`).

## Sources (credit only; no verbatim copy)

- Koenkk / zigbee-herdsman-converters `tuya.ts`: fingerprint `_TZE200_nkjintbl` under model `TS0601_switch_2_gang`, description “2 gang switch”. https://github.com/Koenkk/zigbee-herdsman-converters
- zigpy / zha-device-handlers `ts0601_switch.py`: `MODELS_INFO` entry `("_TZE200_nkjintbl", "TS0601")` on the double-switch quirk (same ep1 Basic/Groups/Scenes/EF00 signature). https://github.com/zigpy/zha-device-handlers
- ZHA device-support request #3497 (reporter asked to extend the Tuya 2-gang TS0601 quirk for this mfr). https://github.com/zigpy/zha-device-handlers/issues/3497
- Early Z2M support thread (Koenkk/zigbee2mqtt#3213 and herdsman-converters#1542): physical 2-gang pairing log for `_TZE200_nkjintbl` / `TS0601`.
- deCONZ Tuya devices list: `_TZE200_nkjintbl` / `TS0601` marked as Tuya-cluster switch (Tuya/Moe). https://github.com/dresden-elektronik/deconz-rest-plugin/wiki/Tuya-devices-List
- Homey interview noted in JohanBendz/com.tuya.zigbee#46: TS0601 + `_TZE200_nkjintbl`, ep1 deviceId 81, in-clusters `[0,4,5,0xEF00]`.

## App placement

| App branch | Owner driver | Notes |
|---|---|---|
| master (`com.dlnraja.tuya.zigbee`) | `switch_2gang` only | Anti-bot forbids this mfr on `button_wireless_plug` and `generic_tuya` |
| stable-v5 | `switch_2gang` only | Aligned earlier via stable PR #561 |
| bastien-home | `switch_2gang` only | Same couple |

## Cleanup on 2026-10-13

Compose ownership was already correct. Several `*_plug` `device.js` protocol maps still listed `_TZE200_nkjintbl` (and sometimes `_TZE204_nkjintbl`) under a BlitzWolf energy-plug sensor table — wrong class bleed, not a second compose owner. Those entries were removed so runtime maps cannot treat the 2-gang switch as a metering plug. `button_wireless_plug/device.js` keeps `_TZE204_nkjintbl` only.

A queue note that anti-bot was red “because nkjintbl is still on switch_2gang” was stale: research and the gate both require it **on** `switch_2gang`.
