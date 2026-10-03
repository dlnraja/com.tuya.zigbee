# Tasks 007
Sources: upstream maintainer triage issues JohanBendz/com.tuya.zigbee #113 (TS0502A), #178 (TS0502B), #209 (TS0505B), #271 (TS0501A) and linked duplicates (interview-backed identities, see data/leads/johan-canonical-index.json).
- [x] T1 Couple coverage computed: 27/35 identities already on a light driver
- [x] T2 Conflict check per candidate driver (mfr × driver pids vs other drivers)
- [x] T3 Added without conflict to light_bulb_tunable_white: _TZ3000_0ausfos0/_TZ3000_9evm3otq/_TZ3000_ajkq2isy (TS0502A), _TZ3210_uos3hl9x/_TZ3210_y5ztga9r (TS0502B)
- [x] T4 Dedicated drivers (2026-10-03: light_cct_ts0502b, light_rgbcct_ts0505b, light_dimmable_ts0501a; runtime reused from light_bulb_tunable_white / bulb_rgb / bulb_dimmable; 0 new dual couples) (every existing candidate conflicts): _TZ3210_jtifm80b TS0502B (vs tunable_bulb_E14), _TZ3210_p9ao60da TS0505B (vs led_controller_cct TS0601), _TZ3000_7dcddnye TS0501A (vs dimmer_wall_1gang)
- [~] T5 CCT-only (light_cct_ts0502b exposes onoff/dim/light_temperature only; existing light_bulb_tunable_white capability list left unchanged to avoid degrading paired devices — revisit with per-device capability strip only on report) devices on light_bulb_tunable_white still expose hue/saturation (driver-wide); evaluate CCT-only capability set per Johan #1502 audit
