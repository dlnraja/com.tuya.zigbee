# Unsupported device? Alternative control paths

Source: Homey Community, Tuya Cloud app topic 21313, post #296 (Peter_Kawa, 2021-02-14), plus #300/#302 (dimmer range)
and #291/#292 (metering not exposed). Implemented in P3380-P3383 (2026-11-22). These paths work **today**, while native
support for your exact device (manufacturer name + product id) is being added. Please still send a diagnostic report.

## 1. Read and write any Tuya data point (DP) from a flow

Works on every Zigbee (0xEF00) and Wi-Fi local device of the app, no device filter.

| Card | Kind | Use |
|---|---|---|
| `Tuya DP received (any device)` (`alt_tuya_dp_received`) | trigger | DP 0 = any DP. Tokens: `dp`, `dp_type`, `value`, `value_number`, `hex`. Use it first to discover which DP changes when you press/change something on the device. |
| `Last Tuya DP value is (any device)` (`alt_tuya_dp_is`) | condition | Compares the last received value (text, number or hex). |
| `Send Tuya DP (any device)` (`alt_tuya_dp_send`) | action | DP 1-255, type bool / value / enum / string / raw (hex) / bitmap. Max 5 sends per 2 s per device. |

The older cards `Send Tuya DP`, `Send typed Tuya DP` and `Tuya Data Point received` are unchanged.

## 2. Turn an unknown DP into a normal Homey capability (virtual device without a new version)

Run the action `Map Tuya DPs to capabilities` (`alt_dp_map_set`) once, for example:

```
101:measure_temperature:10;102:alarm_contact;19:measure_power:10
```

Format `dp:capability[:divisor[:offset]]`, up to 16 entries. Only standard capabilities (measure_*, meter_*, alarm_*,
onoff, dim, target_temperature, windowcoverings_set, volume_set, optionally with a `.suffix`). The capability is added on
the first value and then follows every report (tile, Insights, standard flow cards). The mapping is stored on the device
and survives app updates. Mapped capabilities are for display; to control, use `Send Tuya DP (any device)`.
`Clear Tuya DP mappings` (`alt_dp_map_clear`) removes the mapping (capabilities already added stay).

## 3. Raw Zigbee (ZCL), experts only

* `Send raw Zigbee (ZCL) command` (`alt_zcl_frame_send`): endpoint, cluster, frame type (cluster/global), command id,
  payload hex, optional manufacturer code. Default response disabled.
* `Write Zigbee attribute` (`alt_zcl_attribute_write`): ZCL Write Attributes with a typed value (bool, uint8/16/32,
  int8/16/32, enum8/16, bitmap8/16).

Take the cluster/attribute numbers from Zigbee2MQTT or ZHA for your exact device. Zigbee devices only, rate-limited.

## 4. Tuya cloud tap-to-run scene (opt-in, last resort)

Create a tap-to-run scene in Smart Life / Tuya Smart, then run it from a flow with
`Run a Tuya cloud scene (opt-in)` (`alt_tuya_scene_trigger`, arguments home id + scene id).

* Off by default: enable "Tuya cloud scene card" in the app settings (`alt_tuya_scenes_enabled`).
* Needs **your own** Tuya IoT cloud project keys (Access ID / Secret / region, already used for local key recovery).
  The Tuya IoT "trial" project is free but Tuya asks to renew it periodically; the app never requires a paid plan and
  normal control never depends on the cloud.
* Rate-limited (20 per hour). Keys are never written to the log.

## 5. Dimmer range squeezed or repeating (forum #300)

If 0-100 % in Smart Life fits in about a third of the Homey slider and then starts again, the dimmer uses a 0-255
brightness scale. Wi-Fi dimmers now detect this automatically (echo of a write, or a report above the assumed range);
you can also force it with the device setting `Brightness scale` (`brightness_scale`: auto / 0-100 / 0-255 / 10-1000 / 0-1000).

## 6. Plug without power/energy values (forum #291/#292)

Socket-class devices that report the standard Tuya plug DPs 18 (current mA), 19 (power 0.1 W) and 20 (voltage 0.1 V)
without a driver mapping now get `measure_current`, `measure_power` and `measure_voltage` added on the first plausible
report. Other DPs can be mapped with path 2.
