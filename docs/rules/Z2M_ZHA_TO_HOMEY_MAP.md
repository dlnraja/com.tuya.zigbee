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

## 5. Generic / Tuya Custom DPs
If the device has proprietary Tuya DPs that do not strictly fit standard Homey mechanics:
- Raw/String values: `tuya_dp_raw`, `tuya_dp_string`
- Numbers: `tuya_dp_value`
- Enums/Bitmaps: `tuya_dp_bitmap`
- ONLY create custom capabilities (in `.homeycompose/capabilities/`) if the feature is pivotal and requires UI interaction (e.g., `alarm_siren`, `finger_bot_mode`). Otherwise map to standard Homey capabilities to preserve Flow support natively.
