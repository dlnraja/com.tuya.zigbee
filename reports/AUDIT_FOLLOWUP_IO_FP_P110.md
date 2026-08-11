# P110 — Audit-driven I/O + FP rehome enrich

## Version
9.0.468 (master Test channel)

## Why
Follow-up from completed archaeology audits ([Audit IO fallback coverage](20a9d115-ad2b-4e1c-9a07-fb8d13a80a51), [Scan reports and bug docs](0c34528b-b66e-4532-9951-15259c4665e6), [Mine forum digests for gaps](79ab9ba6-6f98-48ff-9665-501767cd42a9), [Cross-ref historical gems](d44b0a15-e27e-4521-86c3-88104ddd185a), [Scan changelogs and eras](06a1d1e5-3496-4a60-986f-4937a9445137)). Failed relaunch agents (P102/infer/version) were superseded by P108–P109 already on master.

## Shipped
1. **tuya_time_sync** no longer misroutes to MCU negotiate — calls `sendTimeSync` / `io.syncTime`
2. **MCUVersionHelper** wired into `TuyaMCUManager.negotiateVersion`
3. **Passive EF00 RX** uses `parseTuyaFrame` / `handleDatapoint` (dead `parseIncomingFrame` removed)
4. **Battery DP forward** prefers `smartBattery.handleDP`
5. **AdaptiveDataParser.toTemperature** default divisor `10` (was `100`)
6. **Sacred couple rehome** from `climate_sensor`:
   - `*_xtrnjaoz` → `curtain_motor`
   - `*_1youk3hj` → `presence_sensor_radar`
   - `*_chbyv06x` (284) → `gas_sensor` (drop climate dual-claim)

## Deferred (next passes)
- Bare ZigBeeDevice allowlist → DeviceIO
- IAS WD elevate / bed+rain opens
- Community inbox path mismatch / digest regen
- IR learn stickiness, valve `button.1`, airbox UnifiedSensorBase
