# Five couples listed in two drivers (PC harvest round 2, item 3)

Rule W4: one couple (manufacturerName + productId) = one driver. Devices already paired keep their driver (W6); only new pairings change.
Order of choice: the driver that matches the device type, then the placement that existed before the 2026-08-20 fork harvest (1bd93aa131), which added the duplicates.

| Couple | Device (source) | Kept in | Removed from | Why |
|---|---|---|---|---|
| `_TZE204_n9ctkb6j` / TS0601 | 1-gang dimmer, DP1 on/off + DP2 brightness ([Z2M TS0601_dimmer_1, zhc #6861](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6861)) | dimmer_1_gang_tuya | switch_1gang | a switch driver has no `dim` |
| `_TZE204_dcnsggvz` / TS0601 | dimmer module ([Z2M TS0601_dimmer_5, discussion #22027](https://github.com/Koenkk/zigbee2mqtt/discussions/22027), [issue #30534](https://github.com/Koenkk/zigbee2mqtt/issues/30534)) | dimmer_wall_1gang | dimmer_1_gang_tuya | both dimmers; kept the earlier placement (DP1/2/3/4 map, power-on behaviour) |
| `_TZ3000_gjnozsaz` / TS011F | metering plug | button_wireless_plug | smartplug | both plug drivers; kept the earlier placement |
| `_TZ3000_j1v25l17` / TS011F | metering plug | smartplug | plug_energy_monitor | both plug drivers; kept the stable-v5 placement (users already there) |
| `_TZE200_ntcy3xu1`, `_TZE284_ntcy3xu1` / TS0601 | smoke detector, DP1 smoke (0 = alarm), DP4 tamper, DP14 battery low, DP15 battery ([Z2M #12622](https://github.com/Koenkk/zigbee2mqtt/issues/12622)) | smoke_detector_advanced | smoke_sensor2 | earlier placement; its DP map also covers DP15 |

Stable (`stable-v5`) gets the same placement in the next grouped device-compat port.
Credits: Zigbee2MQTT / zigbee-herdsman-converters contributors (see CREDITS.md).
