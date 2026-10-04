# Smart-home ecosystem audit (Matter Bridge, Google, Alexa, SmartThings) — 2026-10-04

Tool: `tools/ci/smart-home-ecosystem-audit.js` (`npm run check:ecosystems`, report-only; fails only on an invalid class).

## Sources
- Matter Bridge: athombv/com.athom.matter-bridge lib/MatterBridgeServer.mjs @045787d (2026-09-14). Switches on `virtualClass || class`; exact capability ids only (sub-capabilities like onoff.gang2 not bridged); smoke only under class sensor; class `smokealarm`, `garagedoor`, `doorbell`, `button`, `remote`, `fan`, `airpurifier` fall to the default (onoff only).
- Alexa: support.homey.app article 4409841950738 (updated 2026-04-10): sockets, switches, lights, fans, thermostats, locks, blinds/curtains, TVs, speakers, other devices with on/off.
- Google Assistant: apps.developer.homey.app Drivers & Devices: class + system capabilities; Athom publishes no per-class table, so only class!=other + a system capability is checked.
- SmartThings: no native Homey export; Matter Bridge only.
- Homey Matter controller types: support.homey.app article 29238483093916.

## Totals

| drivers | Matter Bridge exposed | Alexa | Google |
|---|---|---|---|
| 443 | 366 | 286 | 411 |

## Not exposed by the Matter Bridge (37, excluding button/remote classes which the bridge never maps)

- `air_purifier_dimmer` [sensor]: class "sensor" hides bridge-mappable caps: measure_power; not in Alexa (class not supported and no onoff)
- `air_purifier_din` [sensor]: class "sensor" hides bridge-mappable caps: measure_power; not in Alexa (class not supported and no onoff)
- `air_purifier_siren` [other]: class "other" hides bridge-mappable caps: measure_temperature, measure_humidity, alarm_motion; not in Alexa (class not supported and no onoff); weak for Google (class other or only battery/custom capabilities)
- `air_purifier_switch` [sensor]: class "sensor" hides bridge-mappable caps: measure_power; not in Alexa (class not supported and no onoff)
- `climate_sensor_smart` [socket]: class "socket" hides bridge-mappable caps: measure_temperature, measure_humidity; only sub-capabilities (not bridged): onoff.gang1, onoff.gang2, onoff.gang3, onoff.gang4
- `device_din_rail` [doorbell]: class "doorbell" hides bridge-mappable caps: alarm_motion, alarm_contact, measure_power; not in Alexa (class not supported and no onoff)
- `device_din_rail_meter` [doorbell]: class "doorbell" hides bridge-mappable caps: alarm_motion, alarm_contact, measure_power; not in Alexa (class not supported and no onoff)
- `device_generic_tuya_universal` [other]: class "other" hides bridge-mappable caps: measure_temperature, measure_humidity; not in Alexa (class not supported and no onoff); weak for Google (class other or only battery/custom capabilities)
- `din_rail_meter` [sensor]: class "sensor" hides bridge-mappable caps: measure_power; not in Alexa (class not supported and no onoff)
- `doorbell` [doorbell]: class "doorbell" hides bridge-mappable caps: alarm_motion, alarm_contact; not in Alexa (class not supported and no onoff)
- `energy_meter_3phase` [sensor]: class "sensor" hides bridge-mappable caps: measure_power; not in Alexa (class not supported and no onoff)
- `flood_sensor` [sensor]: not in Alexa (class not supported and no onoff)
- `garage_door` [garagedoor]: class "garagedoor" hides bridge-mappable caps: alarm_contact; not in Alexa (class not supported and no onoff)
- `garage_door_opener` [garagedoor]: class "garagedoor" hides bridge-mappable caps: alarm_contact; not in Alexa (class not supported and no onoff)
- `gas_detector` [sensor]: not in Alexa (class not supported and no onoff)
- `generic_diy` [other]: not in Alexa (class not supported and no onoff); weak for Google (class other or only battery/custom capabilities)
- `generic_tuya` [other]: class "other" hides bridge-mappable caps: measure_temperature, measure_humidity; not in Alexa (class not supported and no onoff); weak for Google (class other or only battery/custom capabilities)
- `pet_feeder` [other]: not in Alexa (class not supported and no onoff); weak for Google (class other or only battery/custom capabilities)
- `pet_feeder_zigbee` [other]: not in Alexa (class not supported and no onoff); weak for Google (class other or only battery/custom capabilities)
- `power_clamp_meter` [sensor]: class "sensor" hides bridge-mappable caps: measure_power; not in Alexa (class not supported and no onoff)
- `power_meter` [sensor]: class "sensor" hides bridge-mappable caps: measure_power; not in Alexa (class not supported and no onoff)
- `sensor_climate_smart` [socket]: class "socket" hides bridge-mappable caps: measure_temperature, measure_humidity; only sub-capabilities (not bridged): onoff.gang1, onoff.gang2, onoff.gang3, onoff.gang4
- `sensor_ias_zonetype_ewelink` [sensor]: not in Alexa (class not supported and no onoff); weak for Google (class other or only battery/custom capabilities)
- `smart_scene_panel` [socket]: only sub-capabilities (not bridged): onoff.gang1, onoff.gang2, onoff.gang3, onoff.gang4
- `sr_zs_switch` [socket]: 
- `switch_wireless` [sensor]: not in Alexa (class not supported and no onoff)
- `tuya_dummy_device` [sensor]: not in Alexa (class not supported and no onoff)
- `ultrasonic_water_meter` [sensor]: not in Alexa (class not supported and no onoff)
- `universal_fallback` [other]: not in Alexa (class not supported and no onoff); weak for Google (class other or only battery/custom capabilities)
- `valve_dual_irrigation` [other]: only sub-capabilities (not bridged): onoff.valve_1, onoff.valve_2; not in Alexa (class not supported and no onoff); weak for Google (class other or only battery/custom capabilities)
- `water_leak_sensor` [sensor]: not in Alexa (class not supported and no onoff)
- `water_leak_sensor_tuya` [sensor]: not in Alexa (class not supported and no onoff)
- `water_tank_monitor` [sensor]: not in Alexa (class not supported and no onoff)
- `wifi_doorbell` [doorbell]: class "doorbell" hides bridge-mappable caps: alarm_motion; not in Alexa (class not supported and no onoff)
- `wifi_garage_door` [garagedoor]: class "garagedoor" hides bridge-mappable caps: alarm_contact; not in Alexa (class not supported and no onoff)
- `wifi_water_tank_monitor` [sensor]: not in Alexa (class not supported and no onoff)
- `zigbee_repeater` [other]: not in Alexa (class not supported and no onoff); weak for Google (class other or only battery/custom capabilities)

## Proposed per-driver follow-ups (additive; each needs research + device test before landing)

- Class `other` with sensor capabilities and no onoff (`air_purifier_siren`, `generic_tuya`, `device_generic_tuya_universal`): class affects new pairings only; `generic_*` are fallback drivers where `other` is intentional. Decide per driver; never call setClass on existing devices (Homey: it breaks flows that depend on the class).
- Sub-capability-only multi-channel drivers (`valve_dual_irrigation`, `climate_sensor_smart`, `sensor_climate_smart`, `smart_scene_panel`, `valve_irrigation`, `valve_single` dim.valve): a base `onoff`/`dim` mirror (all channels / channel 1) would make them bridgeable; needs device code + test.
- Class `sensor` with `onoff` (10 drivers) and class `thermostat` with `onoff` (19): onoff is not bridged under those classes; thermostats still bridge setpoint/mode. No change proposed (class change would alter zone/voice semantics).
- Bridge limitations (no Matter type in the bridge yet): water leak, gas/CO alarm, energy meters, garage doors, doorbells, valves, battery. Keep in Homey + flows; revisit when the bridge adds types (watch the repo).
- **Suspicious class:** `device_din_rail` and `device_din_rail_meter` are class `doorbell` (since b50c127c08, 2026-08-03) while carrying meter capabilities; `device_din_rail` also lists Philips bulb productIds (LCT001/LCT002) and `GL-C-006`. Looks like a polluted hybrid driver: needs a W4/R20 couple review before any class change (class change affects new pairings only).

## Mapping data

`data/matter-bridge-mapping.json` holds the class + capability -> Matter device type / cluster table,
written in our own words from Athom's source (credited, GPL-3.0 repo, no code copied). The audit
script reads it, so a bridge update only needs that file re-verified. Extra rule found in the source:
a thermostat-family device whose `thermostat_mode` offers none of off/heat/cool/auto is skipped
entirely (audit checks it; 0 drivers affected today).

## Fixes landed

- `smart_scene_panel` (_TZE284_ibnz7orz): additive `onoff` main switch mirroring gang 1 (DP24),
  kept in sync both ways; `onoff.gang1..4` unchanged. Now bridged as a plug and visible to Alexa /
  Google. Also R21: its EF00 `dp` listener is registered once and removed in onUninit/onDeleted.
- Not done on purpose: base `onoff` on irrigation valves (`valve_dual_irrigation`, ...) because
  "turn on everything" by voice would open water valves; `climate_sensor_smart` /
  `sensor_climate_smart` only carry placeholder manufacturer ids (no real device yet).
