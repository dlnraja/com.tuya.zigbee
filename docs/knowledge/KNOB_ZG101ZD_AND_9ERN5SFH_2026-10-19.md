# ZG-101ZD rotary knob driver + 9ern5sfh owner alignment — 2026-10-19 (Paris)

User decisions of 2026-10-19 08:08 (Paris). Our own summary; identifiers and behaviour facts only, no code copied.

## P2868 — `_TZ3000_abrsvsou` + `TS004F` → new driver `smart_knob_zg101zd`

### What the hardware is
- **Zigbee2MQTT** (`zigbee-herdsman-converters`, `src/devices/hobeian.ts`, Koen Kanters and contributors): the couple is the
  HOBEIAN **ZG-101ZD** "Smart knob" (same exposes as Tuya ERS-10TZBVK-AA: toggle, brightness step, colour-temperature step,
  hue/saturation move, single/double/hold, rotate left/right, battery, `operation_mode` command/event). A second
  fingerprint pins firmware `applicationVersion` 145 as ZG-101Z/D (rotate only); the comment there says version 66 is the
  ERS-10TZBVK-AA. Both are the same knob family.
- **ZHA** (`zigpy/zha-device-handlers`, `zhaquirks/tuya/ts004f.py`): listed in `TuyaSmartRemote004FROK` ("Smart (rotating)
  knob"), one endpoint. Command mode: press = onOff toggle, rotate = levelControl step (step size 13 slow / 37 fast),
  long press = colorControl move saturation, release = stop move step. Event mode: single/double/long press, rotate left/right.
- **deCONZ** (`dresden-elektronik/deconz-rest-plugin`, `devices/tuya/_TZ3000_TS004F_smart_knob.json`): "Smart Knob (TS004F)".
- **Johan Bendz** (`JohanBendz/com.tuya.zigbee`, `drivers/smart_knob_switch`): already pairs this couple as a knob and the
  user reports it works there.
- Tuya event-mode frames (Z2M `lib/tuya.ts` `multi_action`): genOnOff cmd 0xFD value 0/1/2 = single/double/hold, cmd 0xFC
  value 0/1 = rotate right/left. Mode attribute: genOnOff 0x8004 (0 = command, 1 = event).

The repo had parked it on `button_wireless_4` as a "4-endpoint scene remote" (DeviceFingerprintDB note "ZHA TS004F 4-button
remote variant"), which none of the sources above support.

### What changed
- New driver `drivers/smart_knob_zg101zd` (class `remote`, `measure_battery`):
  - Pairing needs native clusters only (0, 1, 3, 4, 6, 4096 in; Johan's binding list 3, 4, 5, 6, 8, 10, 25, 4096). No 0xEF00.
  - Bound onOff / levelControl / colorControl clusters decode **both** firmware modes at all times (`knob-commands.js`),
    acknowledge every frame (zigbee-clusters 2.6 does not know 0xFC/0xFD or colorControl moveHue/stepColorTemp and would
    otherwise answer with an error), and drop Tuya resends (same ZCL sequence within 1.5 s).
  - Setting `operating_mode`: keep (default, nothing written), command, event. Only an explicit choice writes 0x8004
    (through `DeviceOperatingMode.writeOperationMode`); the knob is sleepy, so the hint says to press it before saving.
  - Triggers: rotate left/right (tokens step size + speed slow/normal/fast), press, double press (event mode), hold,
    press+rotate left/right (command mode). en/fr/nl/de. New icon and product images.
- One couple, one driver: removed the 4 case forms from `button_wireless_4` (compose + app.json), curated removal in
  `config/architecture/curated-couple-removals.json`, pin in `couple-driver-pins.json`, and every bot list that would
  re-add it (re-inject-manual-fixes, apply-forum-test-fixes, recent-variant-capability-completer, p2610 Bastien enrich,
  anti-bot gate REQUIRED/FP_REQUIRED) now points to the new driver. FP DB, quirk registry, fingerprint maps, rotary SSOT
  (`dedicatedKnobDrivers`), button UI charter, Bastien house SSOT updated.
- Tests: `test/critical/p2868-zg101zd-knob-driver.test.js` (exact couple, single owner in compose and app.json, pin +
  removal, decoder table for both modes, end-to-end frames through real zigbee-clusters with success default responses,
  no Tuya write by default). Existing P2448 / forum-routing / P2530 tests follow the move.

### Notes
- Devices already paired on `button_wireless_4` keep working there; re-pairing gives them the new driver.
- `_TZ3000_4fjiwweb` is in the same Z2M/ZHA knob lists (ERS-10TZBVK-AA) but stays on `button_wireless_4`: not part of
  this decision.
- New pairable driver ids had a history of Athom `AggregateError` (ATHOM_NEW_DRIVER_REJECTION_2026-10-11.md); whd02
  graduated on 2026-10-19. Watch the first publish of each branch.

## P2869 — `_TZE284_9ern5sfh` + `TS0601` → `lcdtemphumidsensor` on every branch
- Hardware: RSH-HS03 LCD temperature/humidity sensor. Z2M `tuya.ts` "TS0601_temperature_humidity_sensor_4" (DP1
  temperature /10, DP2 humidity /10, DP4 battery, DP9 unit); zigbee-herdsman-converters issue #10167 (r-e-t-e-p)
  describes it as a sensor "with display"; JohanBendz/com.tuya.zigbee #1328 (RSH-HS03 request; AGabriel saw 100 %
  humidity on the climate driver); forum 140352 #2263 (Kizabgd, interview).
- Master moved it to `lcdtemphumidsensor` in P2823. Stable-v5 and bastien-home still had it on `climate_sensor`; now
  aligned: compose + app.json move (TZE284/TZE204/TZE200 forms, same set as master), curated removal from
  `climate_sensor`, pin on all trees, sacred-keep entries, FP maps. The LCD driver keeps the /10 humidity divisor for it.
- Test: `test/critical/p2869-9ern5sfh-lcd-owner.test.js`.

Links: https://github.com/Koenkk/zigbee-herdsman-converters/blob/master/src/devices/hobeian.ts ·
https://github.com/zigpy/zha-device-handlers/blob/dev/zhaquirks/tuya/ts004f.py ·
https://github.com/dresden-elektronik/deconz-rest-plugin/blob/master/devices/tuya/_TZ3000_TS004F_smart_knob.json ·
https://github.com/JohanBendz/com.tuya.zigbee/tree/SDK3/drivers/smart_knob_switch ·
https://github.com/Koenkk/zigbee-herdsman-converters/issues/10167 · https://github.com/JohanBendz/com.tuya.zigbee/issues/1328 ·
https://community.homey.app/t/140352
