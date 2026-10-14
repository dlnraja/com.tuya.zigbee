# P2820 Z2M / ZHA / Quirks couple audit — 2026-10-14

## Coverage
- Unique sacred couples audited: **1636**
- Exact couple in app: **1549**
- Mfr-only (pid gap): **70**
- Missing entirely: **17**
- Severe wrong-class: **11**
- Soft class mismatch: **256**

## Sources
- Z2M herdsman cache devices: 1225
- Z2M tuya.ts bytes: 1460992
- ZHA quirk .py files: 52
- protocol_quirk_table mfrs: 120

## Severe (actionable)
- `_TZE204_unsxl4ir`+`TS0601` → rgb_bulb_on_wall_dimmer (drivers: dimmer_wall_1gang; src: z2m_cache|z2m_tuya_ts)
- `_TZE284_nvodulvi`+`TS0601` → sensor_on_actuator (drivers: dimmer_wall_1gang; src: z2m_cache|z2m_tuya_ts)
- `_TZE284_nj7sfid2`+`TS0601` → cover_wrong_driver (drivers: sensor_gas_presence; src: z2m_cache|z2m_tuya_ts)
- `_TZE284_7zazvlyn`+`TS0601` → cover_wrong_driver (drivers: water_valve_smart; src: z2m_cache|z2m_tuya_ts)
- `_TZE284_idn2htgu`+`TS0601` → cover_wrong_driver (drivers: climate_sensor; src: z2m_cache|z2m_tuya_ts)
- `_TZE284_3xnyj4ga`+`TS0601` → plug_on_switch_only (drivers: switch_1gang; src: z2m_tuya_ts)
- `_TZE284_exfilann`+`TS0601` → plug_on_switch_only (drivers: switch_3gang; src: z2m_tuya_ts)
- `_TZE204_gbagoilo`+`TS0601` → plug_on_switch_only (drivers: switch_1gang; src: z2m_tuya_ts|zha:ts0601_switch.py)
- `_TZE200_7tdtqgwv`+`TS0601` → plug_on_switch_only (drivers: switch_1gang; src: zha:ts0601_switch.py)
- `_TZE200_amp6tsvy`+`TS0601` → plug_on_switch_only (drivers: switch_1gang; src: zha:ts0601_switch.py)
- `_TZE200_g1ib5ldv`+`TS0601` → plug_on_switch_only (drivers: switch_2gang; src: zha:ts0601_switch.py)

## Missing sample (first 40)
- `_TZE2841000000_nt4pquef`+`TS0601` [z2m_tuya_ts] Soil sensor
- `_TZE28C1000000_f5efvtbv`+`TS0601` [z2m_tuya_ts] 4 channel relay module
- `_TZE204_eaasry7v`+`TS0601` [z2m_tuya_ts] Sauna thermostat
- `_TZ3000_hopb2kjm`+`TS0002` [z2m_tuya_ts] 
- `_TZE28C1000000_vosmoqsg`+`TS0601` [z2m_tuya_ts] 
- `_TZE28C1000000_ewn672ef`+`TS0601` [z2m_tuya_ts] 
- `_TZE2841000000_2gi1hy8s`+`TS0601` [z2m_tuya_ts] Smart blinds motor
- `_TZE284_rfpyqax9`+`TS0601` [z2m_tuya_ts] 
- `_TZE204_rfpyqax9`+`TS0601` [z2m_tuya_ts] 
- `_TZE204_pxbjch8m`+`TS0601` [z2m_tuya_ts] 
- `_TZE20C1000000_p3g8xiug`+`TS0601` [z2m_tuya_ts] plug
- `_TZE20C_tjz9ad5g`+`TS0601` [z2m_tuya_ts] Plug-in smart siren alarm with RGB night light
- `_TZD200_sjjp9bti`+`TS0202` [z2m_tuya_ts] 
- `_TZE20C_ycab9txf`+`TS0601` [z2m_tuya_ts] External switch type (shared between channels)
- `_TZE204_zajeikkt`+`TS0601` [z2m_tuya_ts] LED music controller
- `_TZE284_hbxadcl0`+`TS0601` [z2m_tuya_ts_obj] 
- `DTS1XM9`+`EXCELLUX` [z2m_tuya_ts_obj] 
