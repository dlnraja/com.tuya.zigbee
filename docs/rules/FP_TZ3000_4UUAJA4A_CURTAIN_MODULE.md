# _TZ3000_4uuaja4a: TS130F curtain module (collision TS0726/TS130F, 2026-10-04)

Trigger: the stable publish gate (run 37164858704) flagged `_tz3000_4uuaja4a|TS0726` and `|TS130F` on BOTH `curtain_module` and `curtain_motor` (stable only; master had it on `curtain_module` alone).

## What the device is (sources, links only)
| source | identity | type |
|---|---|---|
| JohanBendz/com.tuya.zigbee `drivers/curtain_module/driver.compose.json` (Johan Bendz) | `_TZ3000_4uuaja4a` + `TS130F` only | curtain module |
| Mariano-Github/Edge-Drivers-Beta `zigbee-window-treatment/fingerprints.yml` (Mariano Colmenarejo, SmartThings Edge) | TS130F/_TZ3000_4uuaja4a, label Lonsonho QS-Zigbee-CP03 | window-treatment with calibration |
| KiwiHC16/Abeille `core/config/devices/TS130F__TZ3000_4uuaja4a` (Jeedom Abeille) | TS130F | curtain module |
| kkossev/amosyuen Zemismart blind fork and RamSet/hubitat zemismart-zigbee-blind (Hubitat) | `_TZ3000_4uuaja4a` | blind/curtain |
| Koenkk/zigbee-herdsman-converters `tuya.ts` | TS130F matched by modelId (generic Lonsonho curtain module); TS0726 entries are 1–3 gang wall switches with other mfrs (`_TZ3002_*`, `_TZ3000_ovbvmhiq`, `_TZ3000_icoxotza`, `_TZ3000_m4ah6bcz`, `_TZ3000_m3pafcnk`) | — |

No source pairs `_TZ3000_4uuaja4a` with `TS0726`.

## Our decision (per pid)
- `_TZ3000_4uuaja4a|TS130F` → **curtain_module** (where it historically lived, same as Johan and master). Native windowCovering first (unchanged runtime).
- `_TZ3000_4uuaja4a|TS0726` → no real device known: it exists only as a cross-product of the mfr list with the TS0726 pid on `curtain_module`. It stays harmlessly on `curtain_module` only (never on two drivers). No new driver: TS0726 switches with this mfr are not documented, so a dedicated driver would invent a couple.
- Removed the mfr (2 spellings) from stable `curtain_motor` (commit 1142e94d59); master already matched.

## Leads (not acted on, need a report/second source)
- `TS0726` is on `curtain_module` and `curtain_motor` as pids; Z2M treats TS0726 as wall switches. Any real TS0726 switch whose mfr sits on those drivers would be misrouted — review when a user reports one.
