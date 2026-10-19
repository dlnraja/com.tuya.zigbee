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

## P2870 — standard ZCL commands reached no handler (OnOff / LevelControl BoundCluster)
- zigbee-clusters sends every command a remote transmits (client → server) to `endpoint.bindings[cluster].handleFrame`.
  Our `lib/clusters/OnOffBoundCluster.js` and `LevelControlBoundCluster.js` override `handleFrame` for the Tuya extras
  (0xFD scene, 0xFC rotate, 0xF0 level) and returned early on every standard command id, so `setOn/setOff/toggle`,
  `step/move/stop` (+ `WithOnOff`) and `moveToLevel` never ran. Also, the library decodes step/move mode as the strings
  `'up'`/`'down'`, and the old `=== 0` test read every decoded frame as "down".
- Fix (additive, opt-in): constructor option `dispatchStandard`. When true, standard commands go through the library's
  own dispatcher to the named handler; errors are swallowed so the remote always gets a SUCCESS default response.
  Direction accepts both 0/1 and 'up'/'down'.
- Who opts in: `remote_dimmer` (its on/off/toggle/brightness cards had no other path) and `SmartKnobRotationMixin`
  (Spec 006 bound path, already guarded by `_knobRotationDuplicate`; master only, the stable/bastien mixin has no bound path).
- Who stays opted out, on purpose: the TuyaZigbeeDevice button families (`scene_switch_4`, `button_wireless_scene/valve/wall`,
  `remote_button_wireless_scene/smart/valve/wall`). They already get standard commands through the raw L1 path
  (`PhysicalButtonMixin.onZigBeeMessage`), so dispatching in the binding as well would fire a press twice.
- Tests: `test/critical/p2870-bound-standard-dispatch.test.js` (real zigbee-clusters frames; per family; fails on the old code).
- Not changed, for a later decision: the raw L1 path maps on/off/toggle all to "single" (some remotes mean double/long),
  and `SmartKnobRotationMixin` only attaches its bound path when levelControl is also a server cluster (most knobs expose
  it as output only), so command-mode rotation there still depends on the other paths.

## P2871 — `_TZ3000_4fjiwweb` + `TS004F` joins `smart_knob_zg101zd`
- Z2M `tuya.ts` lists it first under model ERS-10TZBVK-AA "Smart knob" (same converters as ZG-101ZD: toggle, step,
  colour-temperature step, hue/saturation move, stop, Tuya multi_action, operation_mode). ZHA lists it in
  `TuyaSmartRemote004FROK` MODELS_INFO; deCONZ in `_TZ3000_TS004F_smart_knob.json`. It is a knob, not a 4-button remote.
- Moved off `button_wireless_4` (compose + app.json), curated removal, pin, FP DB, quirk registry, fingerprint maps,
  mfs_db, rotary SSOT (`dedicatedKnobDrivers`; `forbiddenOnKnobMfr` now empty), UI charter, Bastien house SSOT and the bot
  lists that re-added it. Test: `test/critical/p2871-4fjiwweb-knob.test.js`; golden snapshot refreshed.
- Paired devices stay on `button_wireless_4` until re-paired. Bastien's house SSOT lists this couple: his knob needs a re-pair.

## P2872–P2876 (19/10, follow-up fixes)

- **P2872 raw OnOff press types.** The raw frame path (`PhysicalButtonMixin.onZigBeeMessage`, OnOff cmd 0/1/2) made every off/on/toggle a single press. A driver can now declare `RAW_ONOFF_PRESS_MAP`. `remote_button_wireless_smart` and `remote_button_wireless_wall` use their documented command-mode layout: toggle = single, on = double, off = long. `button_mode = dimmer` and every other driver keep `single`; the per-command debounce is unchanged. Note: Z2M itself reports these commands as `on`/`off`/`toggle` actions; multi-press via 0xFD is unaffected.
- **P2873 knob rotation on real hardware.** Real TS004F / ZG-101ZD knobs list levelControl as an output cluster only, so zigbee-clusters creates no server cluster and remote rotations reach only `endpoint.bindings`. The knob setup now attaches its bound cluster when cluster 8 is an output (or a server), never replaces an existing binding, and drops same-direction repeats within 25 ms. Master and Bastien: `SmartKnobRotationMixin`; stable: `smart_knob_rotary`.
- **P2874 one device argument per flow card.** `homey app build` always adds the driver device argument to driver flow cards; cards that also declared it by hand were built with two (wifi_ir_remote x6, presence_sensor_radar_clear_presence; latent on button_wireless_4 FUT089Z and valve_controller_5zone).
- **P2875 voice-safety gate.** Bastien's copy predated the P2614/P2615 device-view rule (class button|remote may keep `maintenanceAction:false`); ported.
- **P2876 workflow script references.** Stable now has repo-housekeeping, generate-script-registry and the p2231/p2283 tests. Remaining gaps are pinned in the test and only sit in workflows that a stable push never starts.
