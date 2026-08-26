# P2285 — `_TZ3000_mrpevh8p` + `TS0041` deep investigation

**Classify:** `BOTH` · **Forum:** SHADOW only

## External truth (cross-ref)

| Source | Finding |
|--------|---------|
| Z2M `tuya.ts` TS0041 | Whitelabel **SH-SC07** = `_TZ3000_mrpevh8p`, `_TZ3000_5bpeda8u`, `_TZ3000_b4awzgct` |
| Z2M fromZigbee | `tuya.fz.on_off_action` + `fz.battery`; `configureMagicPacket`; **no** battery reporting (#8072) |
| Z2M actions | `single` / `double` / `hold` |
| herdsman PR #6225 | Added mrpevh8p as TS0041 (was unrecognized wall switch) |
| Johan Homey #1120 | Interview: EP1 `0,1,6,E000`; EP2–4 phantom; battery EP1=200 (100%), EP2–4=253 junk |
| Hubitat kkossev | Fingerprint `0001,0006,E000,0000` / out `0019,000A` — same couple |
| ZHA HA blueprint | `remote_button_short_press`; double-fire can stick toggles if mishandled |
| Domoticz | Momentary on→off race — treat as event, not latch |
| Peter T140352 #2202 | Wake/battery OK, no flows — handleFrame arity (P2282) + this deep lock |

## Homey architecture map

```
announce/wake → magic packet (genBasic read + 0xFFDE=0x13)
             → bind genOnOff EP1 (+ E000 cascade)
             → OnOffBoundCluster 0xFD + wrapHandleFrame raw 0xFD
             → mapAllEndpointsToButton1 (phantom EP2–4 → btn1)
             → triggerButtonPress → flow cards button_wireless_1_*
             → battery read EP1 only (normalize 0–200)
             ✗ never write 0x8004
             ✗ never EF00 TX
             ✗ never configure battery % reporting
```

## Bugs fixed this cycle

1. `fingerprints.json` `_TZ3000_MRPEVH8P` → **switch_1gang/TS0001** (case poison) → `button_wireless_1`
2. `b4awzgct` → `button_wireless_4_ts0041` misroute → `button_wireless_1`
3. `5bpeda8u` lowercase → wrong scene_switch_1 → `button_wireless_1`
4. Profile: collapse phantom EPs, map EP→btn1, batteryEpOnly, noEf00Tx, skip8004
5. Raw 0xFD + ButtonDevice battery EP filter
6. Registry + compose siblings + docs TS004X

## User action (silent)

Update Test after publish → **remove + re-pair** Smartbutton if still on wrong driver → press once for flows.
