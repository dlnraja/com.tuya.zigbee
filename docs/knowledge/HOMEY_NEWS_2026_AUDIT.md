# Homey news 2025-2026: what it means for this app (queue #101-#106)

Audit date: 2026-10-04 (Europe/Paris). Our own summary of the public Homey news pages and the
(Counts were taken on master; this branch carries the same energy fix.)
Apps SDK energy and capability pages. Nothing was copied.

| # | News | What we checked | Result | Follow-up |
|---|------|-----------------|--------|-----------|
| 101 | Device Updates (Zigbee OTA from apps, Homey ≥ 13.2) | `tools/ci/build-firmware-updates.js` dry run against the Koenkk zigbee-OTA index plus the complementary indexes | 12 OEM images match our fingerprints. All are already shipped in 7 drivers (wall_dimmer_tuya, switch_1gang, radiator_valve, smartplug, plug_energy_monitor, wall_curtain_switch, usb_dongle_triple). There is no new safe image. Three index URLs now return HTTP 404, but the local copies are SHA-pinned. Namron is refused because it has no safe driver route. | Re-run the dry run monthly. Firmware compat stays app-wide `>=12.2.0`, and OTA only shows on 13.2+. |
| 102 | Quick actions (tile button, toggle or press is auto-assigned) | Main `onoff` on multi-gang drivers; `button.*` without `maintenanceAction` | Every multi-gang switch has a main `onoff`. Exceptions: climate_sensor_smart and sensor_climate_smart (sensors with gang sub-switches) and valve_dual_irrigation (two valves, no main). 27 `button` capabilities are tile-pressable, all on purpose: remotes and scene switches (virtual press), cover stop and feed. All other `button.1` capabilities are maintenance-only. | valve_dual_irrigation might get a main "both valves" switch. That is user-visible, so it needs a decision first. |
| 103 | Homey Pro 2026 has 4 GB, but Pro 2023 (2 GB) and mini stay supported until 2031 | R21/R22 budgets | We keep sizing for 2 GB and mini: lazy flow index, bounded maps (`r21-bounded:`), TTL sweeps. | spec 010 should measure on a mini. |
| 104 | Self-Hosted Server | Docs | SHS is mentioned in `docs/user/SMART_HOME_ECOSYSTEMS.md` and in the Device Updates notes. Zigbee works through a supported radio. | Mention SHS in the FAQ when a user reports it. |
| 105 | Energy export pricing / solar forecast | Drivers exposing `meter_power.exported` | 4 drivers declared it without telling Energy (device_din_rail, device_din_rail_meter, din_rail_meter, energy_meter_3phase). They now set `meterPowerImportedCapability` / `meterPowerExportedCapability` (non-cumulative, so the user decides whether a meter is the home's main meter). device_air_purifier_din already used the cumulative form. `test/energy-export-object.test.js` pins this. | power_clamp_meter and plug_energy_monitor add the export capability at runtime. They need `setEnergy()` per device, which is a one-way override, so this is deferred. |
| 106 | Homey Portal (zone ring for light, volume and temperature) | Classes of drivers with `dim` / `target_temperature` | 65 `light` + 10 `fan` dimmers are fine. Dimmers with class `socket` (dimmer_2_gang_tuya, dimmer_wall_switch, dimmer_wall_plug, wall_dimmer_1gang_1way) and `other` (bulb_rgbw_universal) may stay outside the light ring. `target_temperature` is on thermostat/heater, except hvac_dehumidifier (fan) and wifi_kettle. | A class change only applies to new pairings and changes the user's UI, so it needs a user decision. Feeds #95. |

Sources: homey.app/en-us/news (introducing-device-updates, quick-actions-in-homey,
introducing-homey-pro-2026, introducing-homey-self-hosted-server,
homey-energy-solar-forecast-export-pricing, introducing-homey-portal);
apps.developer.homey.app/the-basics/devices/energy (Athom B.V.).
