# Manufacturer Device Quirks

Updated: 2026-07-05

This reference documents the manufacturer/model behavior rules used by
`lib/helpers/ManufacturerDeviceQuirkRegistry.js`.

## Why This Exists

Tuya manufacturers often reuse the same `modelId` for different physical
products. The detector must therefore combine:

- exact `manufacturerName + modelId` fingerprints,
- endpoint count and functional endpoint shape,
- input/output clusters,
- private Tuya clusters `0xE000`, `0xE001`, `0xEF00`,
- DP learning reports and observed DP count,
- forum/GitHub evidence.

The result is intentionally explainable: every quirk adds evidence, preferred
drivers, penalized drivers, and source references to the probabilistic detector.

## Active Rules

| Quirk | Functional meaning | Preferred driver | Guardrail |
| --- | --- | --- | --- |
| `moes_ts0014_4gang_actuator_false_battery` | `_TZ3000_mrduubod / TS0014` is a 4-gang wall switch with real loads. Some Basic reports say battery. | `wall_switch_4gang_1way` | Ignore false Basic `powerSource=battery`; penalize wireless button and knob drivers. |
| `ts00xx_4gang_actuator_signature` | Unknown TS000x/TS001x devices with multiple OnOff endpoints are actuators, not scene-only remotes. | `wall_switch_4gang_1way` when `0xE000/0xE001` are present, otherwise the matching `switch_Ngang`. | Prevent routing to battery/button/climate fallbacks. |
| `ts004f_four_endpoint_scene_remote_signature` | TS004F with four functional OnOff endpoints is a 4-button scene remote. | `button_wireless_4` | Penalize smart knob and wall switch routes. |
| `ts004f_single_endpoint_rotary_or_smart_button_signature` | TS004F with one functional endpoint and output LevelControl/ColorControl is a rotary/smart knob. | `smart_knob_rotary` | Penalize 4-button routes. |
| `ts004f_known_one_button_variant` | Certain manufacturers use TS004F for one-button variants. | `button_wireless_1` / `smart_knob` | Penalize 4-button routes. |
| `ef00_full_state_map_or_flood_signature` | EF00 devices may publish full state maps repeatedly. | none | Diagnostics mark exact-payload dedupe only; changed DP values must still be processed. |

## Source Cross-Checks

- Zigbee2MQTT `TS004F`: documents 4-button wireless switch behavior, battery,
  command/event modes, and non-standard/event-vs-standard command differences.
- Zigbee2MQTT `TS0014`: documents 4-gang wall switch state endpoints and
  `state_action` behavior.
- Koenkk/zigbee2mqtt #15339: `_TZ3000_mrduubod / TS0014` interview shows four
  OnOff endpoints plus `0xE000/0xE001`; converter forces mains because the device
  can report battery incorrectly.
- JohanBendz/com.tuya.zigbee #1413 and Homey forum #2099: same Moes TS0014
  variant and Homey interview context.
- zigpy/zha-device-handlers #3604 and #4301 plus Koenkk/zigbee2mqtt #27239:
  TS004F can be a rotary knob with one endpoint and LevelControl/ColorControl
  action outputs, not a four-button remote.
- Koenkk/zigbee2mqtt #27119: `_TZ3000_xabckq1v / TS004F` variants can lack some
  operation-mode reads/actions, so route by endpoint/transport shape as well as
  exact manufacturer.

## Implementation Notes

- Endpoint `242` and profile `0xA1E0` are GreenPower metadata and are excluded
  from gang counts.
- Manufacturer quirks vote in the probabilistic detector and also apply candidate
  penalties. This keeps exact fingerprints strong while allowing unknown sibling
  devices to inherit safe behavior.
- The quirk registry does not suppress EF00 frames. Raw/DP flood handling remains
  in `RawFrameDeduplicator`, `TuyaEF00Manager`, and `IntelligentFrameAnalyzer`.
