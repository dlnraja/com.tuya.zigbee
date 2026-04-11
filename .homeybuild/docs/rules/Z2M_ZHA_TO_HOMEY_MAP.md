# Zigbee2MQTT / ZHA to Homey Capability Mapping Dictionary

When users paste Zigbee2MQTT (`exposes`, `fz.` converters) or ZHA diagnostics, you **MUST** translate their properties to valid **Homey Pro Capabilities**. Never invent Homey capabilities (like `alarm_siren`); strictly use the mapping below.

## 1. Sensors & Alarms
| Z2M Exposes / Property | ZHA Cluster / Attribute | Homey Capability |
| :--- | :--- | :--- |
| `contact` / `door` | `IASZone` (0x0500) | `alarm_contact` |
| `occupancy` / `motion` | `IASZone` / `occupancy` | `alarm_motion` |
| `temperature` | `TemperatureMeasurement` | `measure_temperature` |
| `humidity` | `RelativeHumidity` | `measure_humidity` |
| `illuminance` / `illuminance_lux` | `IlluminanceMeasurement` | `measure_luminance` |
| `pressure` | `PressureMeasurement` | `measure_pressure` |
| `battery` (%) | `PowerConfiguration` (0x0001) | `measure_battery` |
| `battery_voltage` (V) | `battery_voltage` | `measure_voltage` |
| `battery_low` | `battery_alarm_state` | `alarm_battery` |
| `water_leak` | `IASZone` (Water) | `alarm_water` |
| `smoke` | `IASZone` (Smoke) | `alarm_smoke` |
| `gas` / `co` / `co2` | `IASZone` / `CarbonMonoxide` | `alarm_gas` / `measure_co` / `measure_co2` |
| `vibration` / `tilt` | `IASZone` / `Vibration` | `alarm_vibration` (if custom) or `alarm_motion` |
| `tamper` | `IASZone` (Tamper) | `alarm_tamper` |
| `soil_moisture` | (`Tuya DP 5` or similar) | `measure_soil_moisture` (custom) |

## 2. Switches, Relays & Lights
| Z2M Exposes / Property | ZHA Cluster / Attribute | Homey Capability |
| :--- | :--- | :--- |
| `state` / `switch` | `OnOff` (0x0006) | `onoff` |
| `state_l1` / `state_l2` | `OnOff` on EP 1/2/3 | `onoff.gang1`, `onoff.gang2`, `onoff.gang3` |
| `brightness` | `LevelControl` (0x0008) | `dim` (0.0 to 1.0) |
| `color_temp` | `ColorControl` (0x0300) | `light_temperature` |
| `color` (HSB/XY) | `ColorControl` (0x0300) | `light_hue`, `light_saturation` |

## 3. Energy & Power
| Z2M Exposes / Property | ZHA Cluster / Attribute | Homey Capability |
| :--- | :--- | :--- |
| `power` (W) | `ElectricalMeasurement` | `measure_power` |
| `energy` (kWh) | `Metering` (0x0702) | `meter_power` |
| `current` (A) | `ElectricalMeasurement` | `measure_current` |
| `voltage` (V) | `ElectricalMeasurement` | `measure_voltage` |

## 4. Thermostats & Valves
| Z2M Exposes / Property | ZHA Cluster / Attribute | Homey Capability |
| :--- | :--- | :--- |
| `current_heating_setpoint` | `Thermostat` (0x0201) | `target_temperature` |
| `local_temperature` | `Thermostat` (local temp) | `measure_temperature` |
| `system_mode` | `Thermostat` / `system_mode` | `thermostat_mode` |
| `valve_position` | `valve_position` | `valve_position` (custom/standard) |

## 5. Other Sources (Hubitat, Deconz DDF, SmartThings, etc.)
When analyzing logs from Hubitat, Deconz, SmartThings, or proprietary sniffers:
- **Map identically**: Look for the Zigbee Cluster ID and Map to the exact Homey capability listed above.
- **Tuya proprietary commands**: Any payload directed to `0xEF00` (61184) translates to our `TuyaEF00Manager`.

## 6. Advanced Fallbacks: RX/TX, RAW, Streams and Flows
If the source capability **IS NOT AVAILABLE NATIVELY** in Homey, be hyper-intelligent and bypass the native constraints by using these advanced methods:

1. **Tuya Custom Datapoints (DPs)**: Map the capability to our generic fallbacks in `driver.compose.json`:
   - Number/Integer: `tuya_dp_value`
   - True/False: `onoff.custom` or native boolean mechanics.
   - Text/Status: `tuya_dp_string`
   - Hex/Registers: `tuya_dp_raw`
   - Bitmap/Errors: `tuya_dp_bitmap`
2. **Event Streams / Action Clicks**: If it's a momentary action (like a button click, a swipe, a dynamic string that isn't a state), **DO NOT USE CAPABILITIES**. Use `tuya_cluster_event` or **Flow Cards** (triggers mapping in `app.json` or `driver.compose.json`).
3. **Raw RX / TX Overrides**: For non-standard Zigbee devices that don't even use Tuya DP, instruct the code to use **Passive Raw ZCL Frame Listeners** (`endpoint.on('zcl')`), intercepting the payload directly via Rx (Receive) and responding via Tx (Transmit raw Data). 
4. **Custom `.json` Files**: As an absolute last resort, if a capability MUST exist in the UI as an interactive button/slider and there is no Tuya or Homey generic equivalent, create a custom `.json` inside `.homeycompose/capabilities/` ONLY.
