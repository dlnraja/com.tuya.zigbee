# Lost couples restore — 2026-10-11 (master)

## Method
- Fresh full clone (`git clone --no-single-branch`, 5438 commits on master). Every distinct blob of `drivers/*/driver.compose.json` **and** `app.json` (pre-compose era) on each branch was parsed; the exact (manufacturerName × productId) cross-product per driver was unioned, case-insensitive.
- Lost = ever-present exact couple absent from every driver at the tip.
- Raw lost exact couples: master 25284, stable-v5 25366, bastien-home 25212. Nearly all are **cross-product artefacts** (a mfr paired with a foreign pid by Homey's cross product, never real hardware); they must not be restored.
- Filter: kept only couples attested **exactly** (same mfr + same pid) by Z2M `tuya.fingerprint(pid,[mfr])`/`modelID+manufacturerName` (zigbee-herdsman-converters, local snapshot of 398 device files) or by Johan's app manifest. Placeholders/probes/dummies (`_ph_`, `dummy`, `xxxx`, `r4clone`, `TS00R4`) excluded.
- Placement: our driver for the Z2M device class, only if the pid is already in the target driver and the mfr is not in any other driver that shares a pid with the target (no new cross-product collision). Additive only. Gates: couple-pin OK, fingerprint integrity OK, golden snapshot rewritten.
- Sources checked here: Z2M (exact), Johan app. ZHA / deCONZ / Blakadder / tuya-local / Hubitat / SmartThings / forum were **not** consulted per couple in this pass — every lead below still needs them.

## Restored on master
| Couple | Driver | Sources |
|---|---|---|
| `_TZE200_01fvxamo` + `TS0201` | `temphumidsensor` | [Z2M tuya.ts](https://github.com/Koenkk/zigbee-herdsman-converters/blob/master/src/devices/tuya.ts) (Koenkk et al.) — Z2M tuya.ts THS317-ET-TY |
| `_TZE200_iq4ygaai` + `TS0201` | `temphumidsensor` | [Z2M tuya.ts](https://github.com/Koenkk/zigbee-herdsman-converters/blob/master/src/devices/tuya.ts) (Koenkk et al.) — Z2M tuya.ts THS317-ET-TY |
| `_TZ3000_egvb1p2g` + `TS004F` | `smart_knob` | [Z2M moes.ts](https://github.com/Koenkk/zigbee-herdsman-converters/blob/master/src/devices/moes.ts) (Koenkk et al.) — Z2M moes.ts ERS-10TZBVB-AA |
| `_TZ3000_lrfvzq1e` + `TS004F` | `smart_knob` | [Z2M moes.ts](https://github.com/Koenkk/zigbee-herdsman-converters/blob/master/src/devices/moes.ts) (Koenkk et al.) — Z2M moes.ts ERS-10TZBVB-AA |

## Not restored (needs a move, not an add)
The mfr sits in a wrong driver that shares pids with the right one, so adding it would create a collision. Fixing it means removing it from the wrong driver, which is not additive, so these wait for approval:
| Couple | Intended | Blocked by |
|---|---|---|
| `_TYZB01_4mdqxxnn` + `TS0222` | `illuminance_sensor` | collision switch_1gang |
| `_TYZB01_m6ec2pgj` + `TS0222` | `illuminance_sensor` | collision switch_1gang |
| `_TZ3000_j6adk9id` + `TS0222` | `illuminance_sensor` | collision dimmer_wall_1gang |
| `_TZ3290_s6ezpa3j` + `TS1201` | `ir_blaster` | collision climate_sensor |
| `_TZ3210_m3mxv66l` + `TS0202` | `motion_sensor` | collision climate_sensor |
| `_TZ3210_a2erlvb8` + `TS0002` | `switch_2gang` | collision switch_1gang |
| `_TZ3000_kjfzuycl` + `TS004F` | `smart_knob` | collision smart_remote_1_button |
| `_TZ3000_fa9mlvja` + `TS0041` | `button_wireless_1` | collision remote_button_wireless,wall_remote_1_gang |
| `_TYZB01_qezuin6k` + `TS110F` | `dimmer_wall_1gang` | collision dimmer_1_gang |

## Counts (this branch)
- Z2M-attested lost: 16; Johan-only lost: 52
- Restored: 4; blocked (needs move): 9; rest → `data/leads/lost-couples-2026-10-11.json` (unverified)
