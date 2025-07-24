# 📋 Tableau exhaustif des devices intégrés Tuya Zigbee Homey

| Catégorie      | Nom (EN)                        | Dossier/ID                | Capabilities principales                                  | ManufacturerName(s) (extrait)         | ProductId(s)      |
|----------------|---------------------------------|---------------------------|----------------------------------------------------------|----------------------------------------|-------------------|
| switches       | 1 Gang Wall Switch              | wall_switch_1_gang        | onoff                                                    | _TYZB01_xfpdrwvc, _TZ3000_9hpxg80k... | TS0001, TS0011    |
| switches       | 2 Gang Wall Switch              | wall_switch_2_gang        | onoff                                                    | _TYZB01_mtlhqn48, _TZ3000_fvh3pjaz... | TS0002, TS0012    |
| switches       | 3 Gang Wall Switch              | wall_switch_3_gang        | onoff                                                    | _TYZB01_xiuox57i, _TZ3000_wyhuocal... | TS0003, TS0013    |
| switches       | 4 Gang Wall Switch              | wall_switch_4_gang        | onoff                                                    | _TZ3000_r0pmi2p3, _TYZB01_bagt1e4o... | TS0014, TS0044    |
| switches       | 4 Gang Switch Module Metering   | switch_4_gang_metering    | onoff, measure_power, meter_power, measure_current, ...   | _TZ3000_mmkbptmx                      | TS0004            |
| plugs          | Smart Plug with metering        | smartplug                 | onoff, measure_power, meter_power, measure_current, ...   | _TZ3000_3ooaz3ng, _TYZB01_iuepbmpv... | TS0121, TS011F    |
| sensors        | Motion Sensor                   | motion_sensor             | alarm_motion, measure_battery                             | TUYATEC-bd5faf9p, TUYATEC-zw6hxafz    | RH3040            |
| sensors        | Rain sensor                     | rain_sensor               | measure_battery, alarm_battery, alarm_water, ...          | _TZ3210_tgvtvdoc                      | TS0207            |
| sensors        | Smoke Sensor                    | smoke_sensor              | alarm_smoke, alarm_battery                                | _TYZB01_dsjszp0x, _TYZB01_wqcac7lo    | TS0205            |
| remotes        | 1 Gang Wall Remote              | wall_remote_1_gang        | (custom, selon flows Homey)                               | _TYZB02_keyjqthh, _TZ3000_tk3s5tyg... | TS0041            |
| remotes        | 3 Gang Wall Remote              | wall_remote_3_gang        | (custom, selon flows Homey)                               | _TZ3000_a7ouggvs, _TYZB02_key8kk7r... | TS0043            |
| lights         | Tunable Bulb E14                | tunable_bulb_E14          | onoff, dim, light_temperature                             | _TZ3000_oborybow                      | TS0502A           |
| lights         | RGB Wall LED Light              | rgb_wall_led_light        | onoff, dim, light_hue, light_saturation, ...              | (voir driver.compose.json)             | (voir driver)     |
| curtains       | Curtain Module                  | curtain_module            | windowcoverings_set, windowcoverings_state                | _TZ3000_vd43bbfq, _TZ3000_1dd0d5yi... | TS130F            |
| thermostats    | Thermostatic Radiator Valve     | thermostatic_radiator_valve| alarm_battery, target_temperature, thermostat_preset, ... | _TZE200_sur6q7ko, _TZE200_hue3yfsn... | TS0601            |
| specials       | Zigbee Repeater                 | zigbee_repeater           | (selon device)                                            | (voir driver.compose.json)             | (voir driver)     |

*Ce tableau est un extrait, la liste complète est disponible sur demande ou à enrichir automatiquement.*

---

> Généré automatiquement par Cursor AI – dernière mise à jour : $(date) 