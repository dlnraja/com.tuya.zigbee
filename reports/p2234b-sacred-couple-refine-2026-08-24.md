# P2234b — Sacred-couple refine (mfr multi-variant aware)

> **Doctrine reminder:** one `manufacturerName` can map to many devices / drivers / variants via different `productId`s. Always lock **mfr+pid**. Never invent a pid. TZE200/204/284 siblings are separate couples.

Sacred couple = manufacturerName + productId only. One mfr may have many pids/drivers; never invent pid; TZE200/204/284 siblings are separate couples.

| Couple | Driver | Was wrong in mfs | Notes |
|--------|--------|------------------|-------|
| `_TZ3000_gdsvhfao`+`TS0001` | `zigbee_repeater` | `?[TS0001,TS0601]` | Z2M#11207 TS0001_repeater only — not every TS0001 |
| `_TZE200_itp8dt7f`+`TS0601` | `wall_dimmer_tuya` | `?[ZG-303Z,TS0601]` | Z2M#12213 ION dimmer — strip fake ZG-303Z soil pid from mfs |
| `_TZ3000_dershnvx`+`TS0002` | `switch_2gang` | `?[TS0001,TS0601]` | Z2M#32034 / #12246 — ONLY TS0002 (no TS0001/TS0601 invent) |
| `_TZ3000_icoxotza`+`TS0726` | `switch_2gang` | `?[TS0001,TS0601]` | Z2M#11720 TS0726_2_gang — pid is TS0726 not TS0002 |
| `_TZE204_qujphad5`+`TS0601` | `wall_thermostat` | `?[]` | TYBAC-006 FCU — sibling mpbki2zm is a SEPARATE couple |
| `_TZE204_mpbki2zm`+`TS0601` | `wall_thermostat` | `?[TS0601]` | TYBAC-006 sibling — not TRV |
| `_TZE204_apiu8k13`+`TS0601` | `plug_energy_monitor` | `?[TS0001,TS0601]` | Water-heater monitor — TZE284_q9qytwfa is sibling couple, not same mfr |
| `_TZE284_q9qytwfa`+`TS0601` | `plug_energy_monitor` | `?[]` | Z2M#32883 — TZE284 ≠ TZE204; lock separately |
| `_TZE200_7upwjcca`+`TS0601` | `curtain_motor` | `?[]` | Z2M#32905 cover — only TS0601 |
| `_TZ3000_anptztic`+`TS0001` | `plug_energy_monitor` | `?[]` | Z2M#32609 metering TS0001 — same pid as repeater family but DIFFERENT mfr |
| `_TZ3000_ly9apzky`+`TS0003` | `wall_switch_3gang_1way` | `?[TS0003]` | Z2M#32810 + doctrine: TS0003 3-gang → wall_switch_3gang_1way NOT switch_3gang |
| `_TZE204_pkpfn9hc`+`TS0601` | `air_quality_co2` | `?[]` | Z2M#12949 CO2 — TS0601 shared pid, mfr locks type |
| `_TZ3002_y7wpizuw`+`TS0726` | `switch_4gang` | `?[]` | Z2M#32628 4-gang TS0726 — icoxotza+TS0726 is 2-gang (different mfr) |
| `_TZE284_smcqit2l`+`TS0601` | `wall_thermostat` | `?[]` | Z2M#32568 — do not conflate with qujphad5/mpbki2zm |
| `_TZE284_6uyu20xu`+`TS0601` | `climate_sensor` | `?[]` | Z2M#32491 Chayo TOVTH |

## Homey compose caveat

Compose uses flat `manufacturerName[]` × `productId[]` (OR). Runtime must prefer
`DeviceFingerprintDB` compound keys + mfs `modelIds` mismatch refuse when pid present.
Same mfr on a driver that lists many pids can theoretically pair a wrong sibling pid —
compound DB + registry forbid lists are the guard.

## Sibling families (separate couples — do not merge)

- `_TZE204_qujphad5` / `_TZE204_mpbki2zm` / `_TZE284_smcqit2l` → wall thermostat variants
- `_TZE204_apiu8k13` vs `_TZE284_q9qytwfa` → water-heater energy (prefix differs)
- `_TZ3000_icoxotza`+TS0726 (2-gang) vs `_TZ3002_y7wpizuw`+TS0726 (4-gang)
- `_TZ3000_anptztic`+TS0001 (metering) vs `_TZ3000_gdsvhfao`+TS0001 (repeater)

Apply: `node tools/ci/refine-p2234-sacred-couple-aware.js --apply`
