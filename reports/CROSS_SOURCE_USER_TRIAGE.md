# Cross-source user report triage

Generated: 2026-08-16T16:07:28.592Z

Sources: 100 GitHub issues, 60 pull requests, forum scan present, Gmail diagnostics present.

Manufacturers mentioned anywhere: **1347** — of which **194** appear in a human-written report.
Human-reported and not claimed by any driver: **0**.
Harvested by bulk crawlers and not claimed: **14** (expected; these are candidates, not defects).

## Human-reported coverage gaps

None. Every manufacturer a user reported is claimed by at least one driver.

## Placements with no observed modelId overlap

A driver lists this manufacturer but shares none of the modelIds mfs_db has seen it
report, so on current evidence the couple cannot occur. Harmless today — it simply
never matches — but it widens the driver's claim surface for nothing.

Read the evidence column before acting: mfs_db is aggregated from crawlers and a
single low-confidence `local` source can mean the model list is merely incomplete.

| manufacturerName | observed modelIds | evidence | no overlap in | matched elsewhere |
|---|---|---|---|---|
| `_tz3000_blhvsaqf` | TS0001, TS0601 | local/z2m (conf 0.17) | switch_wall_7gang | switch_1gang (TS0001/TS0601) |
| `_tz3000_g9g2xnch` | TS0001, TS0601 | local/z2m (conf 0.17) | smart_knob | switch_1gang (TS0001/TS0601) |
| `_tz3000_r0o2dahu` | TS0001, TS0601 | local/z2m (conf 0.17) | smart_knob | switch_1gang (TS0001/TS0601) |
| `_tz3008_1a8m8wd6` | TS011F_plug_1 | z2m (conf 0.75) | generic_tuya | — |
| `_tz3210_dse8ogfy` | TS0042, TS0503A, TS0601 | local/z2m/hubitat (conf 0.25) | fingerbot | — |
| `_tz3000_vd43bbfq` | TS0601_lock | local (conf 0.08) | curtain_module | fingerprint_lock (TS0601_lock) |
| `_tze204_5cuocqty` | TS0601_dim1 | local/integration-2026-07-12 (conf 0.50) | switch_1gang | — |
| `_tz3210_ol1uhvza` | TS0301, TS130F | local/z2m/integration-2026-07-12 (conf 0.50) | climate_sensor | wall_curtain_switch (TS130F) |
| `_tz3000_yj6k7vfo` | TS0040 | local (conf 0.08) | button_wireless_4_ts0041 | — |
| `_tze204_xtrnjaoz` | TS0201 | local (conf 0.08) | curtain_motor | — |
| `_tz3000_3dfewsk1` | TS0207 | local (conf 0.08) | water_leak_sensor_tuya | — |

## Manufacturers spanning several device classes

One manufacturer legitimately covers several products, so this is not an error list.
The `matches` column shows which of its observed modelIds each driver actually claims —
when every driver matches something distinct, the spread is the sacred-couple case working as intended.

| manufacturerName | classes | placements (driver → matched modelIds) |
|---|---|---|
| `_tz3000_3zofvcaa` | sensor, socket | climate_sensor → TS0201/TS0601; switch_usb_dongle → TS0002 |
| `_tz3000_g9g2xnch` | button, socket | smart_knob → none; switch_1gang → TS0001/TS0601 |
| `_tz3000_lqb7lcq9` | sensor, socket | climate_sensor → TS0201/TS0601; switch_usb_dongle → TS0002 |
| `_tz3000_m0vaazab` | other, socket | remote_button_wireless_usb → TS0601; zigbee_repeater → TS0207 |
| `_tz3000_n2egfsli` | button, sensor | button_wireless_2 → TS0601/TS0042; contact_sensor → TS0203 |
| `_tz3000_pvlvoxvt` | sensor, socket | climate_sensor → TS0201/TS0601; switch_usb_dongle → TS0002 |
| `_tz3000_r0o2dahu` | button, socket | smart_knob → none; switch_1gang → TS0001/TS0601 |
| `_tz3210_8n4dn1ne` | sensor, socket | climate_sensor → TS0201/TS0601; switch_usb_dongle → TS0002 |
| `_tz3210_jaap6jeb` | light, sensor | bulb_rgbw → TS0601; contact_sensor → TS0203 |
| `_tz3210_urjf5u18` | sensor, socket | climate_sensor → TS0201/TS0601; switch_usb_dongle → TS0002 |
| `_tzb210_g01ie5wu` | light, socket | wall_dimmer_1gang_1way → TS004F; wall_dimmer_tuya → TS0601_dim1/TS0601 |
| `_tze200_2imwyigp` | sensor, socket | contact_sensor → TS0203; switch_3gang → TS0601 |
| `_tze200_a4bpgplm` | other, thermostat | device_radiator_valve → TS0601; generic_diy → BUTTON |
| `_tz3000_vd43bbfq` | lock, windowcoverings | curtain_module → none; fingerprint_lock → TS0601_lock |
| `_tz3000_5k5vh43t` | other, sensor | motion_sensor → TS0601; zigbee_repeater → TS0207 |
| `_tz3000_fa9mlvja` | button, socket | remote_button_wireless → TS0043/TS0601; wall_switch_4_gang → TS0044 |
| `_tz3000_gszjt2xx` | other, sensor | motion_sensor → TS0601; zigbee_repeater → TS0207 |
| `_tz3000_ixla93vd` | sensor, socket | switch_wireless → TS0601_wirelesssw/TS0601; wall_switch_4_gang → TS0044 |
| `_tz3000_misw04hq` | other, sensor | motion_sensor → TS0601; zigbee_repeater → TS0207 |
| `_tz3000_nkkl7uzv` | other, sensor | motion_sensor → TS0601; zigbee_repeater → TS0207 |
| `_tz3000_nlsszmzl` | other, sensor | motion_sensor → TS0601; zigbee_repeater → TS0207 |
| `_tz3000_ufttklsz` | other, sensor | motion_sensor → TS0601; zigbee_repeater → TS0207 |
| `_tz3000_uri7ongn` | sensor, socket | power_meter → TS0601; relay_board_4_channel → TS0004 |
| `_tz3000_wlquqiiz` | other, sensor | motion_sensor → TS0601; zigbee_repeater → TS0207 |
| `_tz3000_1dd0d5yi` | curtain, windowcoverings | curtain_motor_shutter → TS0301/TS0601; wall_curtain_switch → TS130F |
| `_tz3000_femsaaua` | curtain, windowcoverings | curtain_motor_shutter → TS0301/TS0601; wall_curtain_switch → TS130F |
| `_tz3000_e3vhyirx` | curtain, windowcoverings | curtain_motor_shutter → TS0301/TS0601; wall_curtain_switch → TS130F |
| `_tz3000_jwv3cwak` | curtain, windowcoverings | curtain_motor_shutter → TS0301/TS0601; wall_curtain_switch → TS130F |
| `_tz3210_dwytrmda` | curtain, light | dimmer_1_gang → TS110F; wall_curtain_switch → TS130F |
| `_tz3210_ol1uhvza` | curtain, sensor | climate_sensor → none; wall_curtain_switch → TS130F |
