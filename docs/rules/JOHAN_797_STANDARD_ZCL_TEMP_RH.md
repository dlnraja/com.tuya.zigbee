# Standard-ZCL temperature/RH sensors — own rules from the JohanBendz #797 family (spec 009 deep read)

Deep read 2026-10-03 (all comments, open + closed): JohanBendz/com.tuya.zigbee
[#797](https://github.com/JohanBendz/com.tuya.zigbee/issues/797) (open, 5 comments) and the threads it links:
[#1246](https://github.com/JohanBendz/com.tuya.zigbee/issues/1246) (closed duplicate),
[#1284](https://github.com/JohanBendz/com.tuya.zigbee/issues/1284) (closed duplicate),
[#964](https://github.com/JohanBendz/com.tuya.zigbee/issues/964) / #1423,
[#1291](https://github.com/JohanBendz/com.tuya.zigbee/issues/1291) / #1214,
[#1461](https://github.com/JohanBendz/com.tuya.zigbee/issues/1461), #1235. Upstream implementation: PR #1506 (develop-0.4, not Live).
Ideas only; wording, decisions and code are ours (C1). Credits: Johan Bendz and the reporters of those issues.

## Rules
- Z1. **Model id does not decide the protocol.** A `TS0601` that advertises only standard clusters
  (Basic 0, Power 1, Temperature 0x0402, RH 0x0405; no 0xEF00 input) is a standard-ZCL sensor. Do not attach Tuya DP
  parsing because of the model id; DP fallback stays additive only.
- Z2. **Exact pairs, no cross products.** When a runtime is shared but a driver's mfr list × pid list would create new
  couples, use a dedicated exact-pair driver that reuses the existing runtime (`device.js` re-export).
- Z3. **Battery cell unknown → `OTHER`.** Retail listings are not proof of the cell type/count fitted to a given unit.
- Z4. **Air RH (0x0405) is not soil moisture.** Never add soil capabilities from a "moisture" title.
- Z5. **Case-sensitive identities are distinct evidence** (`zbeacon` vs `Zbeacon` TH01: two interviews). Our runtime
  matches case-insensitively (D5) but both literal values are kept in manifests.
- Z6. Optional clusters (Identify 3, Groups 4, Poll Control 32, manufacturer 0xFC11) are never mandatory for pairing.
- Z7. Scaling: temperature and RH centi-units (/100); `batteryPercentageRemaining` half-percent (/2).

## Status in our app (2026-10-03)
| Identity | Interview (EP1 in) | Our driver | Action |
|---|---|---|---|
| `_TZE200_qoy0ekbd` / TS0601 | 0,1,1026,1029 (no EF00) | **new** `temphumidsensor_zcl_ts0601` | mfr was on temphumidsensor3 whose pids lack TS0601 → never matched; dedicated exact driver (Z1–Z3) |
| `_TZ3000_tsgqxdb4` / TS0201 | 0,1,3,1026,1029 | climate_sensor | covered |
| `eWeLink` / `CK-TLSR8656-SS5-01(7014)` | 0,1,3,4,32,1026,1029,0xFC11 | climate_sensor | covered |
| `NTCHT02` / `Excellux` (external probe) | 1,1026,1029 (EF00 output only) | lcdtemphumidsensor_3 | covered |
| `_TZE204_s139roas` / TS0601 (E-ink, EF00-only) | EF00 | climate_sensor | covered (DP map to confirm) |
| `_TZ3000_1o6x1bl0` / TS0201 (0xE002 buzzer variant) | — | climate_sensor | covered; E002 path unverified |
| `zbeacon` + `Zbeacon` / TH01 | 0,1,3,32,1026,1029 | **doorwindowsensor_4** (contact driver) | LEAD: misroute. dw4 carries climate pids (TH01, TS0201, …) for 9 mfrs; moving needs a split of dw4 without new dual couples — deferred, act on first user report (M3) |
| `_TZE200_rxq4iti9` / TS0601 (EF00-only temp/RH) | 4,5,EF00,0 | **device_radiator_valve** | LEAD: upstream notes the TRV/thermostat classification came from unrelated forks; DP map unknown → keep until an interview/DP log gives the real map |
