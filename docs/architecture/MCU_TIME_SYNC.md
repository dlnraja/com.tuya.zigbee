# MCU Time Sync SSOT (P2472b)

Homey runtime time sync for Tuya EF00 / MCU devices. Cross-ref Z2M `mcuSyncTime`, Z2M #29627 (ZT08 DP17), #30054 (epoch 2000), Domoticz Tuya-0xEF00, TinyTuya.

## Pipeline

1. **Initialize EF00** before any TX (`TuyaEF00Manager.initialize` / `_ensureEf00ReadyForTx`) — P2467 / P2475.
2. **Guess format** — `MCUFormatDatabase.lookup(couple)` → `TuyaTimeSyncFormats.guessFormat` → fallback chain (1970 dual, 2000 dual, SEQ_10).
3. **Send** — prefer `mcuSyncTime` with matching epoch; then setData / raw 0x24.
4. **DP17 commit** — for `_TZE284_hodyryli` (ZT08): write DP17=`false` ~500ms after success (`_scheduleDp17CommitAfterTimeSync`).
5. **Re-sync** — soft 0s / 5s / 60s via `TuyaMCUManager.scheduleResync` + announce/rejoin (P2475).

## Key files

| File | Role |
|------|------|
| `lib/tuya/TuyaEF00Manager.js` | initialize, sendTimeSync, DP17 commit |
| `lib/tuya/TuyaMCUManager.js` | attach / negotiate / heartbeat / resync |
| `lib/tuya/TuyaTimeSyncFormats.js` | 23+ format builders + guessFormat |
| `lib/tuya/MCUFormatDatabase.js` | couple → format + firmware bugs |
| `lib/tuya/GlobalTimeSyncEngine.js` | alternate sync path (also DP17) |

## Sacred couples (examples)

| Couple | Format notes |
|--------|----------------|
| `_TZE284_hodyryli`+TS0601 | Z2M dual 1970 + **DP17 commit** |
| `_TZE204_5slehgeo`+TS0601 | Moes ZTS — forceTimeUpdates / mcuSyncTime |
| `_TZE284_fhvpaltk`+TS0601 | Insoma irrigation — soft 1970 |
| `_TZE204_6a4vxfnv`+TS0601 | Floor thermostat — dual 2000 |

Never invent productId. Dual-app: reliability = **BOTH**.

## Gate

```bash
npm run check:p2472
```
